---
group:
  title: 功能
  order: 2
order: 5
---

# 不同引擎

前文讲过，`Nest`目前支持两种引擎——`Hono`与`oak`，它们在 Deno 的世界里属于较为流行的 Web 框架。

默认情况，我们推荐使用`Hono`引擎，它的性能要优于`oak`。

这是`Hono`的使用样例：

```typescript
import { NestFactory } from '@nest/core';
import { Router } from '@nest/hono';
import { AppModule } from './app.module.ts';

const app = await NestFactory.create(AppModule, Router);
await app.listen({
  port: 8000,
});
```

以下是`oak`的样例：

```diff
import { NestFactory } from "@nest/core";
- import { Router } from "@nest/hono";
+ import { Router } from "@nest/oak";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
await app.listen({
  port: 8000,
});
```

区别仅在使用的`Router`不一样。

`Nest`尽可能抹平二者的使用差异，无论是`Guard`、`Interceptor`、`ExceptionFilter`、内置的装饰器上，二者都不会有明显区别。

唯一的例外在于`app.get`。

## app.get 的限制

### app.get 与中间件

下面以 Nest 中一个单元测试用例来描述下状况。

```typescript
await t.step('middleware with app.get', async (it) => {
  const app = await NestFactory.create(AppModule, Router);
  const callStack: number[] = [];

  app.get('/', () => {
    callStack.push(3);
    return 'hello world';
  });

  app.use(async (req, res, next) => {
    callStack.push(1);
    await next();
    callStack.push(2);
  });

  const port = await getPort();
  await app.listen({ port });

  await it.step('fetch /', async () => {
    const res = await fetch(`http://localhost:${port}`);
    assertEquals(res.status, 200);
    assertEquals(await res.text(), 'hello world');
    if (type === 'hono') {
      assertEquals(callStack, [3]);
    } else if (type === 'oak') {
      assertEquals(callStack, [1, 3, 2]);
    }

    callStack.length = 0;
  });

  await app.close();
});
```

在这个样例中，如果中间件在`app.get`之后定义，当`app.get`响应后，`Hono`引擎并不会执行中间件的代码，而 oak 却会，但执行顺序却在`app.get`之前。

当中间件调整到`app.get`之前时，二者的响应都一样了。

### app.get 的生命周期

`app.get`与中间件一样，贯穿了整个请求周期，独立于`Guard`、`Interceptor`与`ExceptionFilter`。所以，如果在它里面发生错误，是不会被`ExceptionFilter`捕获的。

### 小结

综上，`app.get`只适用于简单的接口响应。在没有使用全局 API 前缀（`setGlobalPrefix`）的情况下，应该将接口定义在`AppController`中。

## 使用原生中间件

`Hono`与`oak`都有非常完善的中间件体系。详见《[Middleware](./05_middleware.md)》。

## 使用原生 Context

虽然`Nest`的功能已经尽可能覆盖了所有情况，但当你可能需要用到原生`Context`时，可以在`response`对应中找到并使用。这是`Hono`的样例：

```typescript
import { Controller, Get, Res, type Response } from '@nest/core';
import { HonoContext } from '@nest/hono';

@Controller('')
export class AppController {
  @Get('/originContext')
  originContext(@Res() res: Response) {
    const context = res.getOriginalContext<HonoContext>();
    return context.json({
      data: 'from origin context',
    });
  }
}
```

`oak`也类似：

```typescript
import { Controller, Get, Res, type Response } from '@nest/core';
import { OakContext } from '@nest/oak';

@Controller('')
export class AppController {
  @Get('/originContext')
  originContext(@Res() res: Response) {
    const context = res.getOriginalContext<OakContext>();
    context.response.body = {
      data: 'from origin context',
    };
  }
}
```

:::warning
虽然`Nest`预留了这样的能力，但希望你没有用到的那天。真遇到了这样的情况，请反馈给我们，看是否可以添加到`Nest`中。
:::

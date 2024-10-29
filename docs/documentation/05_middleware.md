---
group:
  title: 概述
order: 5
---

# 中间件

Middleware（中间件）是在路由处理程序之前调用的函数。中间件函数可以访问请求和响应对象，以及应用程序请求-响应周期中的 `next()`中间件函数。下一个中间件函数通常由名为`next`的变量表示。

![image.png](./images/middleware.png)

中间件函数可以执行以下任务：

- 执行任何代码。
- 对请求和响应对象进行更改。
- 结束请求-响应周期。
- 调用堆栈中的下一个中间件函数。

如果当前中间件函数没有结束**请求-响应**周期，它必须调用 next()将控制传递给下一个中间件函数。否则，请求将被挂起。

## 简单示例

您可以使用函数实现 NestMiddleware 接口，以下是个简单的样例：

```typescript
import { type NestMiddleware } from '@nest/core';

export const middleware: NestMiddleware = async (req, res, next) => {
  const start = Date.now();
  await next();
  const time = Date.now() - start;
  const msg = `${req.method} ${req.url} [${res.status}] - ${time}ms`;
  console.info(msg);
  res.headers.set('X-Response-Time', `${time}ms`);
};
```

需要在 main.ts 中全局使用这个中间件：

```typescript
const app = await NestFactory.create(AppModule, HonoRouter);

app.use(middleware);
```

需要注意的是，中间件中无法访问 DI 容器，仅可用于简单的功能。

## 修改响应

如果在中间件中试图修改响应内容，需要显式调用`res.render`。

```typescript
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  res.headers.set('X-Response-Time', `${ms}ms`);
  return res.render();
});
```

不过并不推荐这样做，因为这样会导致`render`函数被调用两次，虽然不会出现问题，但是性能上的浪费。建议使用后面的`Interceptor`替代，二者的区别也将在那里展开。

## 使用原始中间件

`Nest`目前可基于两套引擎工作，分别是`hono`与`oak`，它们都积累了相当多的中间件可以扩展能力。

为此，`Nest`提供了一个特殊的方法`useOriginMiddleware`来复用这些中间件。

以`hono`为例：

```typescript
import { NestFactory } from '@nest/core';
import { HonoRouter as Router } from '@nest/hono';
import { etag } from 'https://deno.land/x/hono@v3.8.1/middleware.ts';
import { AppModule } from './app.module.ts';

const app = await NestFactory.create(AppModule, Router);
app.useOriginMiddleware(
  etag({
    weak: true,
  }),
);
```

为避免出现 Bug，`hono`的版本尽可能与`Nest`推荐的`Hono`版本保持一致。oak 也同理。

以下是个使用 CORS 中间件的样例：

```ts
import { NestFactory } from '@nest/core';
import { Router } from '@nest/oak';
import { CORS } from 'https://deno.land/x/oak_cors@v0.1.1/mod.ts';
import { AppModule } from './app.module.ts';

const app = await NestFactory.create(AppModule, Router);
app.useOriginMiddleware(CORS());
```

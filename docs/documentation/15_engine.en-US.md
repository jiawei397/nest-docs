---
group:
  title: Fundamentals
  order: 2
order: 5
---

# Different Engines

As mentioned earlier, `Nest` currently supports two engines - `Hono` and `oak`, both of which are popular web frameworks in the Deno world.

By default, we recommend using the `Hono` engine, as its performance is superior to that of `oak`.

Here is an example of using the `Hono` engine:

```typescript
import { NestFactory } from "@nest";
import { Router } from "@nest/hono";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
await app.listen({
  port: 8000,
});
```

And here is an example using the `oak` engine:

```diff
import { NestFactory } from "@nest";
- import { Router } from "@nest/hono";
+ import { Router } from "@nest/oak";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
await app.listen({
  port: 8000,
});
```

The only difference is in the `Router` used.

`Nest` strives to minimize the differences in usage between the two engines. Whether it's `Guard`, `Interceptor`, `ExceptionFilter`, or built-in decorators, there should be no significant differences.

The only exception is with `app.get`.

## Limitations of app.get

### app.get and Middleware

Let's describe a situation using a unit test case from Nest.

```typescript
await t.step("middleware with app.get", async (it) => {
  const app = await NestFactory.create(AppModule, Router);
  const callStack: number[] = [];

  app.get("/", () => {
    callStack.push(3);
    return "hello world";
  });

  app.use(async (req, res, next) => {
    callStack.push(1);
    await next();
    callStack.push(2);
  });

  const port = await getPort();
  await app.listen({ port });

  await it.step("fetch /", async () => {
    const res = await fetch(`http://localhost:${port}`);
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "hello world");
    if (type === "hono") {
      assertEquals(callStack, [3]);
    } else if (type === "oak") {
      assertEquals(callStack, [1, 3, 2]);
    }

    callStack.length = 0;
  });

  await app.close();
});
```

In this example, if middleware is defined after `app.get`, when `app.get` responds, the `Hono` engine will not execute the middleware code, while `oak` will. However, the execution order is before `app.get`.

When the middleware is moved before `app.get`, the responses of both engines will be the same.

### Lifecycle of app.get

Similar to middleware, `app.get` spans the entire request cycle, independent of `Guard`, `Interceptor`, and `ExceptionFilter`. Therefore, if an error occurs inside it, it will not be caught by `ExceptionFilter`.

### Summary

In summary, `app.get` is only suitable for simple interface responses. In the absence of a global API prefix (`setGlobalPrefix`), interfaces should be defined in the `AppController`.

## Using Native Middleware

Both `Hono` and `oak` have very comprehensive middleware systems. See [Middleware](./05_middleware) for more details.

## Using Native Context

While `Nest` functionality covers most cases, if you ever need to use the native `Context`, you can find and use it in the `response` corresponding to it. Here is an example using `Hono`:

```typescript
import { Controller, Get, Res, type Response } from "@nest";
import { HonoContext } from "@nest/hono";

@Controller("")
export class AppController {
  @Get("/originContext")
  originContext(@Res() res: Response) {
    const context = res.getOriginalContext<HonoContext>();
    return context.json({
      data: "from origin context",
    });
  }
}
```

And here is a similar example using `oak`:

```typescript
import { Controller, Get, Res, type Response } from "@nest";
import { OakContext } from "@nest/oak";

@Controller("")
export class AppController {
  @Get("/originContext")
  originContext(@Res() res: Response) {
    const context = res.getOriginalContext<OakContext>();
    context.response.body = {
      data: "from origin context",
    };
  }
}
```

:::warning
While `Nest` provides this capability, it is hoped that you never have to use it. If you do encounter such a situation, please provide feedback to us to see if it can be added to `Nest`.
:::

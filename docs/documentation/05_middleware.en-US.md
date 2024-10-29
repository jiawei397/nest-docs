---
group:
  title: Overview
order: 5
---

# Middleware

Middleware is a function that is called before the route handler. Middleware functions have access to the request and response objects, as well as the `next()` middleware function in the application request-response cycle. The next middleware function in the stack is typically represented by a variable named `next`.

![image.png](./images/middleware.png)

Middleware functions can perform the following tasks:

- Execute any code.
- Make changes to the request and response objects.
- End the request-response cycle.
- Call the next middleware function in the stack.

If the current middleware function does not end the request-response cycle, it must call `next()` to pass control to the next middleware function in the stack. Otherwise, the request will be left hanging.

## Simple Example

You can implement the `NestMiddleware` interface using a function. Here is a simple example:

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

To use this middleware globally in `main.ts`, you can do the following:

```typescript
const app = await NestFactory.create(AppModule, HonoRouter);

app.use(middleware);
```

Please note that middleware cannot access the DI container and is only suitable for simple functionalities.

## Modifying the Response

If you attempt to modify the response content within a middleware, you need to explicitly call `res.render`.

```typescript
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  res.headers.set('X-Response-Time', `${ms}ms`);
  return res.render();
});
```

However, this approach is not recommended because it would result in the `render` function being called twice. Although it won't cause any issues, it would be a waste of performance. It is suggested to use `Interceptor` instead, which will be discussed later and highlight the differences between the two.

## Using Original Middleware

`Nest` currently supports two engines, namely `hono` and `oak`, both of which have accumulated a considerable number of middleware for extending capabilities.

To address this, `Nest` provides a special method called `useOriginMiddleware` to reuse these middleware.

Taking `hono` as an example:

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

To avoid bugs, it is recommended to keep the `hono` version as consistent as possible with the `Hono` version recommended by `Nest`. The same applies to `oak`.

Here is an example of using the CORS middleware:

```ts
import { NestFactory } from '@nest/core';
import { Router } from '@nest/oak';
import { CORS } from 'https://deno.land/x/oak_cors@v0.1.1/mod.ts';
import { AppModule } from './app.module.ts';

const app = await NestFactory.create(AppModule, Router);
app.useOriginMiddleware(CORS());
```

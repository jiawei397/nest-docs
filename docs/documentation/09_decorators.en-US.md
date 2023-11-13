---
group:
  title: Overview
order: 9
---

# Decorators

Nest is built on a language feature called decorators. Decorators are a well-known concept in many programming languages, but in the JavaScript world, they are relatively new and have not yet become a standard. Here's a simple definition:

> ES2016 decorators are expressions that return a function, which can take the target, name, and property descriptor as parameters. You can apply them by placing the @ character before the decorator and placing it on top of the content you want to decorate. Decorators can be used for classes, methods, or properties.

It's worth noting that decorators underwent changes at the end of 2022, but a significant issue is that parameter decorators are not yet supported. This is a big problem for Nest. Fortunately, TypeScript is not going to abandon the old version of decorators for a long time. Deno still defaults to the old version of decorators (i.e., `experimentalDecorators` is enabled by default) as of version 1.37. This default behavior may change in the future to support the new version of decorators, and I will provide a reminder when that happens.

Nevertheless, you usually don't need to write low-level decorators directly. If Deno or TypeScript supports parameter decorators, Nest's underlying implementation will switch without breaking upper-level code.

## Parameter Decorators

Nest provides a set of useful parameter decorators that you can use with HTTP route handlers. Here is a list of the provided decorators.

| Decorator | Description |
| --- | --- |
| `@Req()` | Request |
| `@Res()` | Response |
| `@Body(key?: string)` | The body of the request object. Nest has built-in parameter validation using `deno_class_validator`. If a key is passed, it represents a specific value; otherwise, the response is an object. |
| `@Params(key?: string)` | Parameters in the URL path, such as `id` in `/user/:id`. |
| `@Query(key?: string)` | Parameters after the URL, which are URLSearchParams, such as `id` in `?id=123`. |
| `@Cookie(key?: string)` | Cookies of the request object. |
| `@Headers(name?: string)` | Headers of the request object. If no name is passed, it refers to all headers. |
| `@Ip()` | IP address from the `x-real-ip` or `x-forwarded-for` header of the request object. |
| `@Host()` | Host from the `host` header of the request object. |
| `@MethodName()` | The name of the current request method, in the example above, it would be `findAll`. |
| `@ControllerName()` | The name of the current request controller, in the example above, it would be `CatsController`. |
| `@Form()` | When the parameter is a form or FormData, you can perform parameter validation similar to `Body` and return an object. |

## Custom Decorators

Additionally, you can create your own custom decorators. Why would you want to do this?

In the Node.js or Deno world, attaching properties to the request object is a common practice. Then, you can manually extract them in each route handler using code similar to the following:

```typescript
const user = req.states.userInfo;
```

To make the code more readable and transparent, you can create a `@User()` decorator and reuse it in all controllers.

```typescript
import { type Context, createParamDecorator } from "@nest";

export interface UserInfo {
  id: string;
  name: string;
  age: number;
}

export const User = createParamDecorator((ctx: Context) => {
  return ctx.request.states.userInfo;
});
```

Then you can simply use it wherever it's needed:

```typescript
@Get("/")
findOne(@User() user: UserInfo) {
  return {
    data: user,
  };
}
```

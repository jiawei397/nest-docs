---
group:
  title: 概述
order: 9
---

# 装饰器

Nest基于一种称为装饰器（decorator）的语言特性构建。装饰器在许多常用的编程语言中是一个众所周知的概念，但在JavaScript世界中，它们仍然相对较新，尚未成为标准。这是一个简单的定义：

> ES2016装饰器是一个返回函数的表达式，它可以接受目标（target）、名称（name）和属性描述符（property descriptor）作为参数。你可以通过在装饰器前加上@字符并将其放置在要装饰的内容的顶部来应用它。装饰器可以为类、方法或属性定义。

值得一提的是，装饰器在2022年底有了新的变化，但有个大的问题是尚未支持参数装饰器，这对我们的Nest的破坏是巨大的。幸运的是，在未来很长一段时间里，TypeScript并不会放弃旧版装饰器。Deno在1.37时仍然是默认启动了旧版装饰器（即默认开启了`experimentalDecorators`），这个默认行为未来可能会有变化以支持新版装饰器，到时候我会作出提醒的。

尽管如此，你通常没有必要直接手写底层的装饰器。如果Deno或TypeScript支持了参数装饰器，Nest底层会进行切换，不会破坏上层代码的使用。

## 参数装饰器

Nest提供了一组有用的参数装饰器，你可以与HTTP路由处理程序一起使用。以下是提供的装饰器列表。

| 装饰器 | 说明 |
| --- | --- |
| `@Req()` | Request |
| `@Res()` | Response |
| `@Body(key?: string)` | 请求对象的Body，Nest内置了使用`deno_class_validator`进行参数校验。如果传递了key，表示是具体某个值，否则响应为Object |
| `@Params(key?: string)` | URL路径中的参数，如`/user/:id`中的id。 |
| `@Query(key?: string)` | URL后面的参数，也就是URLSearchParams，如`?id=123`中的id |
| `@Cookie(key?: string)` | 请求对象的Cookie |
| `@Headers(name?: string)` | 请求对象的Header，如果不传递name，则是Headers |
| `@Ip()` | 请求对象Header中`x-real-ip`或`x-forwarded-for` |
| `@Host()` | 请求对象Header中`host` |
| `@MethodName()` | 当前请求的方法名，在上例中为`findAll` |
| `@ControllerName()` | 当前请求的Controller名称，在上例中为`CatsController` |
| `@Form()` | 当参数为表单或者FormData时，可像Body一样进行参数校验，返回一个Object |

## 自定义装饰器

此外，你可以创建自己的自定义装饰器。这有什么用处呢？

在 Node.js或 Deno 的世界中，将属性附加到请求对象是一种常见做法。然后，你可以在每个路由处理程序中使用以下类似的代码手动提取它们：

```typescript
const user = req.states.userInfo;
```

为了使代码更可读和透明，你可以创建一个`@User()`装饰器，并在所有控制器中重复使用它。

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

然后你可以在满足需求的任何地方简单地使用它：

```typescript
@Get("/")
findOne(@User() user: UserInfo) {
  return {
    data: user,
  };
}
```

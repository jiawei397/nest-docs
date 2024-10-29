---
group:
  title: 功能
  order: 2
order: 3
---

# 注入范围

对于来自不同编程语言背景的人来说，可能会意外地发现，在`Nest`中，几乎所有东西都是跨传入请求共享的。我们有一个到数据库的连接池，具有全局状态的单一服务，等等。请记住，`Deno`与`Node.js`一样，并不遵循**请求/响应**多线程无状态模型，每个请求都是由事件循环线程处理的，而不是像传统多线程模型中每个请求都有一个独立的线程来处理。因此，使用单一实例对我们的应用程序来说是完全安全的。

然而，在某些情况下，你可能并不希望所有的服务都是一个实例，比如常见的 LogService。

## Provider 范围

Provider 可以具有以下 2 种范围：

1. **DEFAULT**：在整个应用程序中共享`Provider`的单个实例。实例的生命周期直接与应用程序的生命周期相关联。一旦应用程序启动，所有单例提供程序都将被实例化。默认情况下使用单例范围。
2. **TRANSIENT**：`Provider`不会在消费者之间共享。每个注入`TRANSIENT`范围`Provider`的消费者都将收到一个新的专用实例。

## 使用

将作用域指定为 `@Injectable()`装饰器选项对象的 scope 属性。

```typescript
import { Injectable, Scope } from '@nest';

@Injectable({ scope: Scope.TRANSIENT })
export class LogService {}
```

同样，对于自定义 Provider，可以设置 Provider 的作用域属性。

```typescript
{
  provide: 'CACHE_MANAGER',
  useClass: CacheManager,
  scope: Scope.TRANSIENT,
}
```

单例作用域是默认使用的，不需要声明。如果您确实想将提供程序声明为单例作用域，请使用`Scope.DEFAULT`值作为 scope 属性。

## Inquirer provider

如果你想要获取提供者构造的类，例如在日志记录中，你可以注入`INQUIRER`令牌。

```typescript
import {
  type Constructor,
  Inject,
  Injectable,
  INQUIRER,
  Scope,
} from '@nest/core';

@Injectable({
  scope: Scope.TRANSIENT,
})
export class LogService {
  parentName: string;

  constructor(@Inject(INQUIRER) private parentClass: Constructor) {
    this.parentName = this.parentClass.name;
  }

  info(message: string) {
    console.log(`[${this.parentName}] ${message}`);
  }
}
```

然后这样使用：

```typescript
import { Controller, Get } from '@nest/core';
import { LogService } from './log.service.ts';

@Controller('/cats')
export class CatsController {
  constructor(private logService: LogService) {}

  @Get('/')
  async hello() {
    this.logService.info('hello');
    return 'hello world';
  }
}
```

当`hello`被调用时，控制台会打印：`[CatsController] hello`。

同样的，如果 LogService 被 CatsService 引入，会打印`[CatsService] findAll`：

```typescript
import { Injectable } from '@nest/core';
import { LogService } from './log.service.ts';

@Injectable()
export class CatsService {
  constructor(private readonly logService: LogService) {}

  findAll() {
    this.logService.info('findAll');
    return [];
  }
}
```

---
group:
  title: Fundamentals
  order: 2
order: 3
---

# Injection Scopes

For individuals from different programming language backgrounds, it might be surprising to discover that in Nest, almost everything is shared across incoming requests. We have a connection pool to the database, a single service with global state, and so on. Please remember that Deno, like Node.js, does not follow the **request/response** multi-threaded stateless model. Each request is handled by an event loop thread, rather than having a separate thread for each request in a traditional multi-threaded model. Therefore, using a single instance is entirely safe for our application.

However, in certain cases, you may not want all services to be a single instance, such as the common `LogService`.

## Provider Scope

Providers can have the following two scopes:

1. **DEFAULT**: A single instance of the `Provider` is shared throughout the entire application. The instance's lifecycle is directly tied to the application's lifecycle. Once the application starts, all singleton providers will be instantiated. Singleton scope is used by default.
2. **TRANSIENT**: The `Provider` is not shared between consumers. Each consumer injecting a `TRANSIENT` scope provider will receive a new dedicated instance.

## Usage

Specify the scope as the `scope` property of the options object in the `@Injectable()` decorator.

```typescript
import { Injectable, Scope } from '@nest';

@Injectable({ scope: Scope.TRANSIENT })
export class LogService {}
```

Similarly, for custom providers, you can set the scope property of the provider.

```typescript
{
  provide: 'CACHE_MANAGER',
  useClass: CacheManager,
  scope: Scope.TRANSIENT,
}
```

Singleton scope is used by default and does not need to be declared. If you do want to declare a provider as singleton scope, use the `Scope.DEFAULT` value as the scope property.

## Inquiring Provider

If you want to get the class of the provider being constructed, for example, in logging, you can inject the `INQUIRER` token.

```typescript
import { type Constructor, Inject, Injectable, INQUIRER, Scope } from "@nest";

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

Then use it like this:

```typescript
import { Controller, Get } from "@nest";
import { LogService } from "./log.service.ts";

@Controller("/cats")
export class CatsController {
  constructor(
    private logService: LogService,
  ) {}

  @Get("/")
  async hello() {
    this.logService.info("hello");
    return "hello world";
  }
}
```

When `hello` is called, the console will print: `[CatsController] hello`.

Similarly, if the `LogService` is imported by `CatsService`, it will print `[CatsService] findAll`:

```typescript
import { Injectable } from "@nest";
import { LogService } from "./log.service.ts";

@Injectable()
export class CatsService {
  constructor(private readonly logService: LogService) {
  }

  findAll() {
    this.logService.info("findAll");
    return [];
  }
}
```

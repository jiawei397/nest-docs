---
group:
  title: Fundamentals
  order: 2
order: 1
---

# Custom Providers

In the earlier chapters, we covered various aspects of Dependency Injection (DI) and how it is used in Nest. One example is constructor-based dependency injection used to inject instances (typically service providers) into classes.

Dependency injection is a fundamental way built into the core of Nest. So far, we have only explored one main pattern. As the application becomes more complex, you might need to take full advantage of all the features of the DI system. Let's dive into them in more detail.

## DI Basics

Dependency injection is an Inversion of Control (`IoC`) technique where you delegate the instantiation of dependencies to an `IoC` container (in our case, the Nest runtime system), rather than performing it imperatively in your own code. Let's see what happens in the example from the Provider chapter.

First, we define a Provider. The `@Injectable()` decorator marks the `CatsService` class as a Provider.

```typescript
import { Injectable } from '@nest/core';
import { Cat } from './cats.interface.ts';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  findAll(): Cat[] {
    return this.cats;
  }
}
```

Then, we ask `Nest` to inject the provider into our controller class:

```typescript
// deno-lint-ignore-file require-await
import { Controller, Get } from '@nest/core';
import { CatsService } from './cats.service.ts';
import { Cat } from './cats.interface.ts';

@Controller('/cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get('/')
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```

Finally, we register the Provider with the `Nest IoC` container:

```typescript
import { Module } from '@nest/core';
import { CatsController } from './cats/cats.controller.ts';

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

To make this work successfully, what happens behind the scenes? The process is divided into three key steps:

1. In `cats.service.ts`, the `@Injectable()` decorator declares the `CatsService` class as a class that can be managed by the `Nest IoC` container.
2. In `cats.controller.ts`, the `CatsController` uses constructor injection to declare a dependency on the `CatsService` token: `constructor(private catsService: CatsService)`.
3. In `app.module.ts`, we registered the `CatsController`.

When the `Nest IoC` container instantiates the `CatsController`, it first looks for dependencies. When it finds the `CatsService` dependency, it performs a lookup on the `CatsService` token. Assuming a singleton scope is used (default behavior), Nest creates an instance of `CatsService`, caches it, and returns it, or returns the existing instance if it's already cached.

This explanation is somewhat simplified, intended to illustrate the main point. One crucial area we've ignored is that the process of analyzing dependencies is quite complex and occurs during the application startup process. One important feature is that dependency resolution (or "building the dependency graph") is transitive. In the example above, if `CatsService` itself has dependencies, those dependencies will also be resolved. The dependency graph ensures that dependencies are resolved in the correct order—basically "bottom-up". This mechanism relieves developers from managing the complexities of such a dependency graph.

## Standard Providers

Let's take a closer look at the `@Module()` decorator. In `app.module`, we declare:

```typescript
@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

It is equivalent to the following, as Nest automatically resolves the dependencies of `CatsController`:

```typescript
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}
```

The `providers` property takes an array of providers. Since the token we're using by default is a class (constructor function), it's equivalent to the following syntax:

```typescript
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```

## Custom Providers

What happens when your needs go beyond what standard providers offer?

Here are some examples:

- You want to create a custom instance yourself, rather than letting Nest instantiate (or return a cached instance of) a class.
- You want to reuse an existing class in a second dependency.
- You want to override a class with a mock version for testing.

Nest allows you to define custom providers to handle these cases. It provides several ways to define custom providers. Let's take a look at them together.

### Value Provider: `useValue`

The `useValue` syntax is useful for injecting constant values, putting external libraries into the Nest container, or replacing a real implementation with a mock object. Suppose you want to force Nest to use a mocked `CatsService` for testing purposes:

```typescript
import { CatsService } from './cats.service.ts';

const mockCatsService = {
  /* mock implementation
  ...
  */
};

@Module({
  imports: [CatsModule],
  providers: [
    {
      provide: CatsService,
      useValue: mockCatsService,
    },
  ],
})
export class AppModule {}
```

In this example, the `CatsService` token will resolve to the `mockCatsService` mock object. `useValue` takes a value—in this case, a literal object—that has the same interface as the class it replaces. Due to TypeScript's structural typing, you can use any object with a compatible interface, including a literal object or an instance of a class instantiated with `new`.

### Non-Class Provider Tokens

So far, we've been using classes as provider tokens (the `provide` property value in the providers array). This matches the standard pattern used by constructor-based injection, where the token is also a class.

Sometimes, we might want to flexibly use strings or symbols as DI tokens. For example:

```typescript
import { connection } from './connection.ts';

@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useValue: connection,
    },
  ],
})
export class AppModule {}
```

In this example, we associate a string type token (`CONNECTION`) with a pre-existing connection object we imported from an external file.

:::warning{title=Note}
In addition to using strings as token values, you can also use JavaScript Symbols or TypeScript enums.
:::

We've seen how to use constructor-based injection with class-based tokens. This pattern requires dependencies to be declared using classes. The `CONNECTION` custom provider uses a string type token.

Let's see how to inject such a provider. We use the `@Inject()` decorator, which takes one parameter—the `token`.

```typescript
import { Inject, Injectable } from '@nest/core';
import { type Connection } from '../connection.ts';

@Injectable()
export class CatsRepository {
  constructor(@Inject('CONNECTION') connection: Connection) {}
}
```

In the example above, we directly used the string `CONNECTION` just for illustration. But for the sake of cleaner code, a best practice is to define tokens in a separate file, such as `constants.ts`. Treat them as you would Symbols or enums, importing them where needed. This can improve code maintainability and readability.

### Class Provider: `useClass`

The `useClass` syntax allows you to dynamically determine which class a token should resolve to.

For example, suppose we have an abstract (or default) `ConfigService` class. Depending on the current environment, we want Nest to provide a different configuration service implementation.

The following code implements such a strategy.

```typescript
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    Deno.env.get('DENO_ENV') === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```

Let's take a look at some details in this code example. You'll notice that we first defined `configServiceProvider` using a literal object and then passed it to the `providers` property of the module decorator. This is just some code organization, but functionally equivalent to the examples we've used so far in this chapter.

Additionally, we've used the name of the `ConfigService` class as our token. For any class depending on `ConfigService`, Nest will inject an instance of the provided class (`DevelopmentConfigService` or `ProductionConfigService`) based on the current environment, overriding any default implementation declared elsewhere (for example, `ConfigService` declared with the `@Injectable()` decorator).

### Factory Provider: `useFactory`

The `useFactory` syntax allows dynamically creating a provider. The actual provider will be provided by the value returned from a factory function. The factory function can be as simple or complex as needed. A simple factory might not depend on any other providers. A more complex factory might inject other providers it needs to compute its result. For the latter case, the factory provider syntax has a couple of related mechanisms:

1. The factory function can take (optional) parameters.
2. The (optional) inject property takes an array of providers that Nest will resolve and pass as parameters to the factory function during instantiation. Additionally, these providers can be marked as optional. The two lists should be correlated: Nest will pass instances from the `inject` list as parameters to the factory function in the same order.

The following example illustrates this.

```typescript
const connectionProvider = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider, optionalProvider?: string) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider, { token: 'SomeOptionalProvider', optional: true }],
  //       \_____________/            \__________________/
  //        This provider              The provider with this
  //        is mandatory.              token can resolve to `undefined`.
};

@Module({
  providers: [
    connectionProvider,
    OptionsProvider,
    // { provide: 'SomeOptionalProvider', useValue: 'anything' },
  ],
})
export class AppModule {}
```

### Alias Provider: `useExisting`

The `useExisting` syntax allows you to create an alias for an existing provider. This way, you can create two ways to access the same provider.

In the example below, the string-based token `'AliasedLoggerService'` is an alias for the class-based token `LoggerService`. Suppose we have two different dependencies, one is `'AliasedLoggerService'` and the other is `LoggerService`. If both dependencies use the `SINGLETON` scope, they will resolve to the same instance.

```typescript
@Injectable()
class LoggerService {
  /* implementation details */
}

const loggerAliasProvider = {
  provide: 'AliasedLoggerService',
  useExisting: LoggerService,
};

@Module({
  providers: [LoggerService, loggerAliasProvider],
})
export class AppModule {}
```

### Non-service Providers

While providers typically provide services, they are not limited to this purpose. Providers can provide any value. For example, a provider can provide an array of configuration objects based on the current environment, as shown below:

```typescript
const configFactory = {
  provide: 'CONFIG',
  useFactory: () => {
    return Deno.env.get('DENO_ENV') === 'development' ? devConfig : prodConfig;
  },
};

@Module({
  providers: [configFactory],
})
export class AppModule {}
```

### Asynchronous Providers

Sometimes, the application startup should be delayed until one or more asynchronous tasks are completed. For example, you might not want to start accepting requests until a connection to the database is established. We can achieve this using asynchronous providers.

Its syntax involves using `async/await` and `useFactory`. The factory returns a Promise, and the factory function can wait for asynchronous tasks. Nest will wait for the resolution of the promise, then instantiate any classes that depend (inject) on a provider of this kind.

```typescript
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
  },
}
```

Like any other provider, asynchronous providers are injected into other components using their token. In the example above, you can use `@Inject('ASYNC_CONNECTION')` in a constructor.

## Provider Order

Nest orders providers, currently in the order:

> useValue > useFactory > useClass > useExisting

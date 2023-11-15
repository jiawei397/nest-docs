---
group:
  title: Fundamentals
  order: 2
order: 2
---

# Dynamic Modules

The module section covers the basics of Nest modules, including a brief introduction to dynamic modules. This chapter expands on the topic of dynamic modules. By the end, you should have a good understanding of what they are and how and when to use them.

## Introduction

Most of the application code examples in the documentation overview section use regular or static modules. A module defines a set of components, such as providers and controllers, that are combined as modular sections of the entire application. They provide an execution context or scope for these components. For example, the providers defined in a module are visible to other members of that module without exporting them. When a provider needs to be visible outside the module, you first export it from its host module and then import it into the module that uses it.

Let's look at a familiar example.

First, we define a `UsersModule` to provide and export `UsersService`. The `UsersModule` is the host module for `UsersService`.

```typescript
import { Module } from '@nest';
import { UsersService } from './users.service.ts';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Next, we define an `AuthModule` that imports `UsersModule`, making the providers exported by `UsersModule` available internally within `AuthModule`:

```typescript
import { Module } from '@nest';
import { AuthService } from './auth.service.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

This allows us to inject `UsersService` into the `AuthService` constructor, for example, hosted within the `AuthModule`:

```typescript
import { Injectable } from '@nest';
import { UsersService } from '../users/users.service.ts';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}
  /*
    Implementation that makes use of this.usersService
  */
}
```

We'll call this **static module binding**. Nest connects the modules together, and all the information required for the modules to work together is declared in both the host and using modules.

Let's analyze what happens during this process. Nest provides `UsersService` to the internal services of `AuthModule` in the following way:

1. Instantiate `UsersModule`, including passing any other modules that `UsersModule` consumes, and resolving any dependencies (see [Custom Provider](./11_custom_provider)).
2. Instantiate `AuthModule` and make the providers exported by `UsersModule` available to components within `AuthModule` (as if they were already declared in `AuthModule`).
3. Inject `UsersService` into the instance of `AuthService`.

## Use Cases for Dynamic Modules

With static module bindings, the consuming module has no influence on the configuration of the host module's providers. Why is this important? Consider a scenario where you have a generic module that needs to exhibit different behaviors in different use cases. This is similar to the concept of "plugins" in many systems, where a generic feature needs some configuration before being used by consumers.

In Nest, a prime example is the configuration module. Many applications externalize configuration details by using a configuration module, making it easy to dynamically change application settings in different deployments. For example, developers might use a development database, and the testing/pre-production environment might use a staging database. By delegating the management of configuration parameters to the configuration module, the application source code remains independent of configuration details.

The challenge is that the configuration module itself is generic (similar to a "plugin") and needs to be customized by its consuming modules. This is where dynamic modules come into play. With dynamic module functionality, we can make the configuration module dynamic, allowing consuming modules to customize the properties and behavior of the module at import time, rather than using the static bindings we've seen so far.

## Configuration Module Example

Our requirement is to make the `ConfigModule` accept an options object to customize it. Here's what we want to support:

The basic example hardcodes the location of the `.env` file in the project root folder. Suppose we want to make it configurable so that we can manage the `.env` file in any chosen folder. For instance, imagine you want to store various `.env` files in a folder named `config` at the same level as the project root (`src`). You want to be able to choose different folders when using the `ConfigModule` in different projects.

Dynamic modules allow us to pass parameters into the imported module, so that we can change its behavior. Let's see how this works. If we start from the perspective of the consuming module and see what the end goal might be, and then work backward, it can be helpful.

First, let's quickly review the static import of `ConfigModule` (i.e., a way that cannot influence the behavior of the imported module). Note the `imports` array in the `@Module()` decorator:

```typescript
import { Module } from '@nest';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { ConfigModule } from './config/config.module.ts';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Let's consider dynamic module imports, where we pass a configuration object. Compare the difference in the `imports` array between these two examples:

```typescript
import { Module } from '@nest';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { ConfigModule } from './config/config.module.ts';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Let's see what happens in the dynamic example above. What parts are moving?

`ConfigModule` is a regular class, so we can infer that it must have a static method named `register`. We know it's static because we're calling it on the `ConfigModule` class, not on an instance of the class. Note: this method, which we'll create shortly, can have any name, but conventionally, we should call it `forRoot` or `register`.

The `register` method is defined by us, so we can accept any input parameters we like. In this case, we'll accept a simple options object with the relevant properties, as is typical.

We can infer that the `register` method must return something module-like because its return value appears in the familiar import list, just like we've seen with static bindings so far.

Indeed, our `register` method will return a `DynamicModule`. Dynamic modules are modules created at runtime with the same interface as static modules, plus an additional property called `module`. Let's quickly review a sample static module declaration, paying particular attention to the module options passed to the decorator:

```typescript
@Module({
  imports: [DogsModule],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
```

Dynamic modules must return an object with the exact same interface, plus an additional property called `module`. The `module` property serves as the name of the module and should be identical to the class name of the module, as shown in the example below.

:::info
For dynamic modules, all properties of the module options object are optional, except for `module`.
:::

So, what about the static `register` method? Now we can see that its job is to return an object with the `DynamicModule` interface. When we call it, we're actually providing a module to the import list, similar to listing module class names in a static scenario. In other words, the dynamic module API is just returning a module, but we're not fixing the properties in the `@Module()` decorator; instead, we're specifying them programmatically.

There are some details to fill in to better understand the whole process:

1. Now we can declare that the `imports` property of the `@Module()` decorator can accept not only module class names (e.g., `imports: [UsersModule])`, but also functions that return dynamic modules (e.g., `imports: [ConfigModule.register(...)]`).
2. Dynamic modules themselves can import other modules. We don't do this in this example, but if a dynamic module depends on providers from other modules, you can import them using the optional `imports` property. Again, this is exactly the same as declaring metadata for static modules using the `@Module()` decorator.

With this understanding, let's now see what our dynamic `ConfigModule` declaration should look like. Let's give it a try.

```typescript
import { DynamicModule, Module } from '@nest';
import { ConfigService } from './config.service.ts';

@Module({})
export class ConfigModule {
  static register(): DynamicModule {
    return {
      module: ConfigModule,
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
```

Now, it should be clear how the various parts are connected. Calling `ConfigModule.register(...)` will return a `DynamicModule` object with properties identical to the metadata we provided using the `@Module()` decorator.

However, our dynamic module is not very interesting yet, as we haven't introduced any capability to configure it, as mentioned earlier. Let's address that next.

## Module Configuration

The obvious solution to customize the behavior of the `ConfigModule` is to pass an options object in the static `register` method. Let's take another look at the `imports` property in the consuming module:

```typescript
import { Module } from '@nest';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { ConfigModule } from './config/config.module.ts';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Nicely handles passing an options object to the dynamic module.

So, how do we use that options object in the `ConfigModule`? Let's consider. We know that the `ConfigModule` is essentially a host for providing and exporting injectable services — `ConfigService` in our case — to be used by other providers.

Our `ConfigService` needs to provide a `get` method, so other parts of the application can directly use it to query the required configuration items:

```typescript
export class ConfigService {
  get(key: string): string {
    return this.envConfig[key];
  }
}
```

But this `envConfig` is related to the options object mentioned above, and it should be built when the `ConfigService` is instantiated or injected by the Nest IoC container.
We find `std/dotenv` in the Deno standard library:

```typescript
import { load } from "https://deno.land/std@0.205.0/dotenv/mod.ts";

console.log(await load({ export: true })); // { GREETING: "hello world" }
console.log(Deno.env.get("GREETING")); // hello world
```

The `load` it provides is an asynchronous function, which means we can't use it in the constructor (because we can't guarantee when it will complete). So our final `ConfigService` should look like this:

```typescript
import { Inject, Injectable } from "@nest";
import type { EnvConfig } from "./config.interface.ts";
import { CONFIG_KEY } from "./config.constant.ts";

@Injectable()
export class ConfigService {
  constructor(
    @Inject(CONFIG_KEY) private readonly envConfig: EnvConfig,
  ) {
    console.log("ConfigService.constructor()", envConfig);
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

And `config.constant.ts` looks like this:

```typescript
export const CONFIG_KEY = Symbol("config");
```

`config.interface.ts` contains two interfaces:

```typescript
export interface EnvConfig {
  hostname: string;
  [key: string]: string;
}

export interface ConfigOptions {
  folder: string;
}
```

In the previous "[Custom Provider](./11_custom_provider)" section, we mentioned the `useFactory` pattern, which helps us provide the `ConfigService` in the `ConfigModule`. Please pay attention to the `providers` array in the code below:

```typescript
import { DynamicModule, Module } from "@nest";
import { ConfigService } from "./config.service.ts";
import { ConfigOptions, EnvConfig } from "./config.interface.ts";
import { CONFIG_KEY } from "./config.constant.ts";
import { load } from "std/dotenv/mod.ts";
import { join } from "std/path/join.ts";

@Module({})
export class ConfigModule {
  static register(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_KEY,
          useFactory: async () => {
            const folder = options.folder;
            const filePath = `${Deno.env.get("DENO_ENV") || "development"}.env`;
            return await load({
              envPath: join(folder, filePath),
            }) as EnvConfig;
          },
        },
        ConfigService,
      ],
      exports: [ConfigService],
      global: true,
    };
  }
}
```

In the above code, we use a symbol-based injection token (`CONFIG_KEY`), which is defined as a constant in a separate file and imported into this file. This is considered a best practice, although you could use plain strings instead.

:::warning{title=Note}
The `global` setting is set to `true` here, indicating that the contents of `exports` are globally visible. Once imported by a module, other modules can directly use `ConfigService`. Otherwise, each module needs to import `ConfigModule` separately.

When you use `global`, if you want to export tokens in `exports`, to avoid unexpected issues, Nest enforces that tokens must be of type `symbol`.

If you need different configurations in different modules, you can comment out `global` or set it to `false`.
:::

## Example Code

The complete example code above can be found [here](https://deno.land/x/deno_nest/example/dynamicModule?source).

## Community Guidelines

You may have seen the usage of methods like `forRoot`, `register`, and `forFeature` in some `@nest` packages and wondered about the differences between these methods. While there are no strict rules, the `@nest` packages attempt to follow the following guidelines:

- When using `register` to create a module, you expect to configure a dynamic module with specific settings for the calling module. For example, in the configuration module above, you use `ConfigModule.register({ folder: './config' })` in one module. If you use `ConfigModule.register({ folder: './config2' })` in another module, it will have a different configuration.

- When using `forRoot` to create a module, you expect to configure a dynamic module and reuse that configuration in multiple places (although you may not be aware of it, as it is abstracted). In this sense, all `forRoot` should set `global` to `true`.

- When using `forFeature` to create a module, you expect to use the `forRoot` configuration of the dynamic module but need to modify some configuration specific to the requirements of the calling module. For example, the module should access which repository or which context the logger should use.

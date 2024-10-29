---
group:
  title: 功能
  order: 2
order: 2
---

# 动态模块

模块章节涵盖了 Nest 模块的基础知识，并包括动态模块的简要介绍。本章扩展了动态模块的主题。完成后，你应该很好地掌握它们是什么以及如何以及何时使用它们。

## 简介

文档概述部分中的大多数应用程序代码示例都使用常规或静态模块。模块定义了一组组件，例如`Provider`和`Controller`，它们组合在一起作为整个应用程序的模块化部分。它们为这些组件提供执行上下文或范围。例如，模块中定义的`providers`对该模块的其它成员是可见的，而无需导出它们。当`Provider`需要在模块外部可见时，首先从其宿主模块导出它，然后将其导入到其使用模块中。

让我们看一个熟悉的例子。

首先，我们将定义 `UsersModule`来提供和导出 `UsersService`。`UsersModule`是`UsersService`的宿主模块。

```typescript
import { Module } from '@nest';
import { UsersService } from './users.service.ts';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

接下来，我们将定义一个`AuthModule`，它导入`UsersModule`，使`UsersModule`导出的`Providers`在`AuthModule`内部可用：

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

这将允许我们在构造函数中注入`UsersService`，例如，`AuthService`托管在`AuthModule`：

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

我们将其称为**静态模块绑定**。`Nest`将模块连接在一起所需的所有信息都已在宿主和使用模块中声明。

让我们来分析一下这个过程中发生了什么。`Nest`通过以下方式`UsersService`提供内部`AuthModule`服务：

1. 实例化`UsersModule`，包括传递导入`UsersModule`本身消耗的其他模块，以及传递解决任何依赖关系（请在[这里](./11_custom_provider.md)了解更多信息）。
2. 实例化`AuthModule`，并使`UsersModule`的导出 Providers 可用于`AuthModule`中的组件（就像它们已在`AuthModule`中声明一样）。
3. `UsersService`注入到`AuthService`的实例。

## 动态模块用例

使用静态模块绑定，消费模块无法影响宿主模块`Provider`的配置。为什么这很重要呢？考虑这样一种情况，我们有一个通用模块，需要在不同的用例中表现出不同的行为。这类似于许多系统中的“插件”概念，其中一个通用功能需要在被消费者使用之前进行一些配置。

在`Nest`中，一个很好的例子就是配置模块。许多应用程序通过使用配置模块来外部化配置细节，这样可以轻松地在不同的部署中动态更改应用程序设置。例如，开发人员使用开发数据库，测试/预发布环境使用暂存数据库等。通过将配置参数的管理委托给配置模块，应用程序源代码保持独立于配置参数。

挑战在于配置模块本身是通用的（类似于“插件”），需要由其消费模块进行定制。这就是动态模块的作用。使用动态模块功能，我们可以使配置模块动态化，以便消费模块可以在导入时使用 API 来控制如何定制配置模块。

换句话说，动态模块提供了一个 API，用于将一个模块导入到另一个模块中，并在导入时自定义该模块的属性和行为，而不是使用我们迄今为止看到的静态绑定。

## 配置模块示例

我们的要求是使`ConfigModule`接受一个选项对象以自定义它。以下是我们想要支持的功能。

基本示例硬编码了`.env`文件的位置在项目根文件夹中。假设我们想要使其可配置，以便可以在任何选择的文件夹中管理`.env`文件。例如，想象一下，你想要将各种`.env`文件存储在项目根目录下名为`config`的文件夹中（即`src`的同级文件夹）。你希望在不同项目中使用`ConfigModule`时能够选择不同的文件夹。

动态模块使我们能够将参数传递到被导入的模块中，以便我们可以更改其行为。让我们看看这是如何工作的。如果我们从消费模块的角度开始，看看最终目标可能是什么，然后再往回走，这会很有帮助。

首先，让我们快速回顾一下静态导入`ConfigModule`的示例（即一种无法影响导入模块行为的方法）。请注意`@Module()`装饰器中的`imports`数组：

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

让我们考虑一下动态模块导入，其中我们传递了一个配置对象，可能会是什么样子。比较这两个示例之间的导入数组的差异：

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

让我们看看上面动态示例中发生了什么。有哪些移动的部分？

`ConfigModule`是一个普通的类，因此我们可以推断出它必须有一个名为`register()`的静态方法。我们知道它是静态的，因为我们在`ConfigModule`类上调用它，而不是在类的实例上调用它。注意：这个方法，我们很快就会创建，可以有任意的名称，但是按照惯例，我们应该将其称为`forRoot()`或`register()`。

`register()`方法是由我们定义的，因此我们可以接受任何我们喜欢的输入参数。在这种情况下，我们将接受一个带有适当属性的简单选项对象，这是典型情况。

我们可以推断出`register()`方法必须返回一个类似于模块的东西，因为它的返回值出现在熟悉的导入列表中，到目前为止，我们已经看到了一个模块列表。

事实上，我们的`register()`方法将返回一个`DynamicModule`。动态模块只是在运行时创建的模块，具有与静态模块完全相同的属性，加上一个额外的属性称为`module`。让我们快速回顾一下样本静态模块声明，特别注意传递给装饰器的模块选项：

```typescript
@Module({
  imports: [DogsModule],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
```

动态模块必须返回一个具有完全相同接口的对象，加上一个名为`module`的附加属性。`module`属性用作模块的名称，并且应与模块的类名相同，如下面的示例所示。

:::info
对于动态模块，模块选项对象的所有属性都是可选的，除了`module`。
:::

那么静态`register()`方法呢？现在我们可以看到它的工作是返回一个具有`DynamicModule`接口的对象。当我们调用它时，我们实际上是提供一个模块给导入列表，类似于在静态情况下列出模块类名的方式。换句话说，动态模块 API 只是返回一个模块，但我们不是在`@Module`装饰器中固定属性，而是以编程方式指定它们。

还有一些细节需要补充，以便更好地理解整个过程：

1. 现在我们可以声明`@Module()`装饰器的`imports`属性不仅可以接受模块类名（例如，`imports：[UsersModule]）`，还可以接受返回动态模块的函数（例如，`imports：[ConfigModule.register（...）]）`。
2. 动态模块本身可以导入其它模块。我们在此示例中不这样做，但如果动态模块依赖于其它模块的提供程序，则可以使用可选的`imports`属性导入它们。同样，这与使用`@Module()`装饰器为静态模块声明元数据的方式完全相同。

有了这个理解，我们现在可以看看我们的动态`ConfigModule`声明应该是什么样子的。让我们试试。

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

现在应该清楚各个部分是如何联系在一起的了。调用`ConfigModule.register(...)`将返回一个`DynamicModule`对象，其属性与我们之前通过`@Module()`装饰器提供的元数据基本相同。

然而，我们的动态模块目前还不太有趣，因为我们还没有介绍任何配置它的能力，正如我们之前所说的。让我们接下来解决这个问题。

## 模块配置

自定义`ConfigModule`行为的明显解决方案是在静态`register()`方法中传递一个选项对象。让我们再次看一下消费模块的`imports`属性：

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

很好地处理了将选项对象传递给动态模块。

那么我们如何在 `ConfigModule` 中使用该选项对象呢？让我们考虑一下。我们知道 `ConfigModule` 基本上是一个主机，用于提供和导出可注入服务—— `ConfigService`，供其它`Provider`使用。

我们的`ConfigService`需要提供一个`get`方法，让其它程序可以直接使用查询到所需要的配置项：

```typescript
export class ConfigService {
  get(key: string): string {
    return this.envConfig[key];
  }
}
```

但是这个`envConfig`与上面的选项对象有关，它应该在`ConfigService`实例化时就构建好，或者被`Nest IoC`容器注入。
我们在 Deno 的标准库中找到`std/dotenv`：

```typescript
import { load } from 'https://deno.land/std@0.205.0/dotenv/mod.ts';

console.log(await load({ export: true })); // { GREETING: "hello world" }
console.log(Deno.env.get('GREETING')); // hello world
```

它提供的`load`是个异步函数，这就导致我们不能在构造函数中使用（因为这样无法确保完成的时机），所以我们最终的`ConfigService`应该是这样的：

```typescript
import { Inject, Injectable } from '@nest/core';
import type { EnvConfig } from './config.interface.ts';
import { CONFIG_KEY } from './config.constant.ts';

@Injectable()
export class ConfigService {
  constructor(@Inject(CONFIG_KEY) private readonly envConfig: EnvConfig) {
    console.log('ConfigService.constructor()', envConfig);
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

而`config.constant.ts`是这样的：

```typescript
export const CONFIG_KEY = Symbol('config');
```

`config.interface.ts`包含两个接口：

```typescript
export interface EnvConfig {
  hostname: string;
  [key: string]: string;
}

export interface ConfigOptions {
  folder: string;
}
```

在[上节](./11_custom_provider.md)》中，我们提到`useFactory`模式，它帮助我们在`ConfigModule`提供`ConfigService`。请注意下面代码中的`providers`数组：

```typescript
import { DynamicModule, Module } from '@nest/core';
import { ConfigService } from './config.service.ts';
import { ConfigOptions, EnvConfig } from './config.interface.ts';
import { CONFIG_KEY } from './config.constant.ts';
import { load } from 'std/dotenv/mod.ts';
import { join } from 'std/path/join.ts';

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
            const filePath = `${Deno.env.get('DENO_ENV') || 'development'}.env`;
            return (await load({
              envPath: join(folder, filePath),
            })) as EnvConfig;
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

我们在上面使用了一个基于 symbol 的注入令牌（`CONFIG_KEY`），它被定义为一个常量在一个单独的文件中，并导入该文件，这是一种最佳实践，尽管你可以使用普通有字符串代替。

:::warning{title=注意}
这里的`global`设置为`true`，表示`exports`的内容全局可见，只需要被某个模块`import`一次，其它模块都可以直接使用`ConfigService`，否则仍需被各个模块单独再入一次`ConfigModule`。

当你使用`global`时，如果要将在`exports`中导出令牌，为避免出现意外，`Nest`强制要求令牌必须为`symbol`。

如果您需要不同的模块中使用不同的配置，可以注释掉`global`，或者将它设置为`false`。
:::

## 样例代码

以上完整的样例代码可以在[这里](https://deno.land/x/deno_nest/example/dynamicModule?source)找到。

## 社区准则

您可能已经看到了一些 `@nest`包中的 `forRoot`、`register` 和 `forFeature` 等方法的用法，并且可能想知道所有这些方法的区别是什么。对此没有硬性规定，但 `@nest` 包试图遵循以下准则：

- 当使用 `register` 创建一个模块时，你期望为调用模块配置一个具有特定配置的动态模块。例如，上面的配置模块，你在一个模块中使用`ConfigModule.register({ folder: './config' })`。如果在另一个模块中使用 `ConfigModule.register({ folder: './config2' })`，它将具有不同的配置。
- 当使用 `forRoot` 创建一个模块时，你期望配置一个动态模块，并在多个位置重用该配置（尽管可能不知情，因为它被抽象化了）。从这个意义上讲，所有的`forRoot`都应该设置`global`为`true`。
- 当使用 `forFeature` 创建一个模块时，你期望使用动态模块的 `forRoot` 配置，但需要修改一些特定于调用模块需求的配置。例如，该模块应该访问哪个存储库，或者日志记录器应该使用哪个上下文。

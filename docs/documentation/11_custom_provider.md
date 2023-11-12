---
group:
  title: 功能
  order: 2
order: 1
---

# 自定义Provider

在早期章节中，我们涉及了依赖注入（DI）的各个方面以及在Nest中的使用方式。其中一个示例是基于构造函数的依赖注入，用于将实例（通常是服务Provider）注入类中。

依赖注入是内置在Nest核心中的一个基本方式。到目前为止，我们只探讨了一个主要模式。随着应用程序变得更加复杂，你可能需要充分利用DI系统的所有功能，因此让我们更详细地探讨它们。

## DI基础知识

依赖注入是一种控制反转（`IoC`）技术，其中你将依赖项的实例化委托给`IoC`容器（在我们的情况下是Nest运行时系统），而不是在你自己的代码中以命令式方式执行。让我们来看一下Provider章节中的示例中发生了什么。

首先，我们定义了一个Provider。`@Injectable()`装饰器将`CatsService`类标记为Provider。

```typescript
import { Injectable } from "@nest";
import { Cat } from "./cats.interface.ts";

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  findAll(): Cat[] {
    return this.cats;
  }
}
```

然后我们请求 `Nest` 将`provider`注入到我们的控制器类中：

```typescript
// deno-lint-ignore-file require-await
import { Controller, Get } from "@nest";
import { CatsService } from "./cats.service.ts";
import { Cat } from "./cats.interface.ts";

@Controller("/cats")
export class CatsController {
  constructor(
    private catsService: CatsService,
  ) {}

  @Get("/")
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
```

最后，我们向`Nest IoC`容器注册`Provider`：

```typescript
import { Module } from "@nest";
import { CatsController } from "./cats/cats.controller.ts";

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

为了让这项工作成功，幕后究竟发生了什么？该过程分为三个关键步骤：

1.  在`cats.service.ts`中，`@Injectable()`装饰器将`CatsService`类声明为可以由`Nest IoC`容器管理的类。 
2.  在`cats.controller.ts`中，`CatsController`使用构造函数注入声明对`CatsService`令牌的依赖：`constructor(private catsService: CatsService)`。
3.  在`app.module.ts`中，我们注册了`CatsController`。

当`Nest IoC`容器实例化`CatsController`时，它首先查找依赖项。当它找到`CatsService`依赖时，它会在`CatsService`token上执行查找操作，假设采用单例作用域（默认行为），Nest将创建`CatsService`的实例、缓存它并返回它，或者如果已经缓存了一个实例，则返回现有实例。

这个解释有点简化，仅用于说明重点。我们忽略的一个重要领域是分析依赖项的代码过程非常复杂，并且发生在应用程序启动过程中。一个重要特点是依赖分析（或“创建依赖图”）是传递的。在上面的示例中，如果`CatsService`本身有依赖项，这些依赖项也将被解析。依赖图确保依赖项按正确的顺序解决 —— 基本上是“自下而上”。这个机制让开发人员免除了管理这样复杂的依赖图的麻烦。

## 标准Provider

让我们仔细看看`@Module()`装饰器。在`app.module`中，我们声明：

```typescript
@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

它与下面的是等价的，因为Nest自动解析了`CatsController`的依赖关系：

```typescript
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}
```

该`providers`属性采用一个数组`providers`。因为我们默认使用的token是类（构造函数），所以它与下面的写法也是等价的：

```typescript
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```

## 定制Provider

当你的要求超出标准Provider提供的范围时会发生什么？

以下是一些例子：

- 你想创建一个自定义实例，而不是让Nest实例化（或返回缓存的实例）一个类
- 你想在第二个依赖项中重复使用现有类
- 你想用模拟版本覆盖类以进行测试

Nest允许您定义自定义Provider来处理这些情况。它提供了几种定义自定义Provider的方法。让我们一起来看看。

### 值Provider：useValue

`useValue`语法对于注入常量值、将外部库放入Nest容器或者用模拟对象替换真实实现非常有用。假设你想要强制`Nest`在测试目的中使用一个模拟的`CatsService`：

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

在这个例子中，`CatsService`令牌将解析为`mockCatsService`模拟对象。`useValue`需要一个值 —— 在这种情况下，一个字面对象，它具有与其替代的`CatsService`类相同的接口。由于TypeScript的结构类型，你可以使用任何具有兼容接口的对象，包括字面对象或使用new实例化的类实例。

### 非基于类的Provider token
到目前为止，我们使用类作为Provider token（providers 数组中Provider的 provide 属性的值）。这与基于构造函数的注入使用的标准模式相匹配，其中token也是类。

有时，我们可能希望灵活地使用字符串或符号作为 DI 令牌。例如：

```typescript
import { connection } from "./connection.ts";

@Module({
  providers: [
    {
      provide: "CONNECTION",
      useValue: connection,
    },
  ],
})
export class AppModule {}
```

在这个例子中，我们将一个字符串类型的标记（`CONNECTION`）与我们从外部文件导入的一个预先存在的连接对象关联起来。

:::warning{title=注意}
除了使用字符串作为标记值之外，你还可以使用JavaScript Symbol或TypeScript枚举。
:::

我们之前已经看到了如何使用标准构造函数基于注入模式来注入Provider。这种模式要求依赖项使用类进行声明。`CONNECTION`自定义Provider使用字符串类型的标记。

让我们看看如何注入这样的Provider。我们使用`@Inject()`装饰器，它接受一个参数——`token`。

```typescript
import { Inject, Injectable } from "@nest";
import { type Connection } from "../connection.ts";

@Injectable()
export class CatsRepository {
  constructor(@Inject('CONNECTION') connection: Connection) {}
}
```

在上面的示例中，我们直接使用字符串`CONNECTION`仅用于说明。但为了使代码更整洁，最佳实践是将token定义在单独的文件中，例如`constants.ts`。将它们视为与Symbol或枚举一样，在需要的地方导入。这样可以提高代码的可维护性和可读性。

### 类Provider：useClass

`useClass`语法允许你动态确定一个token应该解析为的类。

例如，假设我们有一个抽象（或默认）的`ConfigService`类。根据当前的环境，我们希望Nest提供不同的配置服务实现。
以下代码实现了这样的策略。

```typescript
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    Deno.env.get("DENO_ENV") === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```

让我们来看一下这个代码示例中的一些细节。你会注意到，我们首先使用一个字面对象定义了`configServiceProvider`，然后将其传递给模块装饰器的`providers`属性。这只是一些代码组织，但在功能上等同于本章迄今为止使用的示例。

此外，我们已经将`ConfigService`类名用作我们的token。对于依赖于`ConfigService`的任何类，Nest将注入提供的类的实例（`DevelopmentConfigService`或`ProductionConfigService`），覆盖可能在其它地方声明的任何默认实现（例如，使用`@Injectable()`装饰器声明的`ConfigService`）。

### 工厂Provider：useFactory

`useFactory`语法允许动态创建Provider。实际的Provider将由从工厂函数返回的值提供。工厂函数可以根据需要简单或复杂。一个简单的工厂可能不依赖于任何其他`Provider`。一个更复杂的工厂可以自己注入它需要计算其结果的其他提供`Provider`。对于后一种情况，工厂Provider语法有一对相关机制：

1. 工厂函数可以接受（可选的）参数。
2. （可选的）inject属性接受一个Nest将解析并在实例化过程中作为参数传递给工厂函数的Provider数组。此外，这些Provider可以被标记为可选的。这两个列表应该相关联：Nest将按相同顺序将`inject`列表中的实例作为参数传递给工厂函数。

下面的示例演示了这一点。

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

### 别名Provider：useExisting

`useExisting`语法允许你为现有Provider创建别名。这样可以创建两种访问相同Provider的方式。

在下面的示例中，基于字符串的token `'AliasedLoggerService'`是基于类的token`LoggerService`的别名。假设我们有两个不同的依赖项，一个是`'AliasedLoggerService'`，另一个是`LoggerService`。如果两个依赖项都使用`SINGLETON`作用域指定，它们都将解析为相同的实例。

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

### Non-service的Provider

虽然Provider通常提供service，但它们不限于此用途。Provider可以提供任何值。例如，Provider可以根据当前环境提供配置对象数组，如下所示：

```typescript
const configFactory = {
  provide: 'CONFIG',
  useFactory: () => {
    return Deno.env.get("DENO_ENV") === 'development' ? devConfig : prodConfig;
  },
};

@Module({
  providers: [configFactory],
})
export class AppModule {}
```

### 异步Provider

有时，应用程序的启动应该延迟到一个或多个异步任务完成。例如，在与数据库建立连接之前，你可能不想开始接受请求。我们可以使用异步提供程序来实现这一点。

其语法是使用`async/await`和`useFactory`。工厂返回一个Promise，工厂函数可以等待异步任务。Nest将等待promise的解析，然后再实例化依赖（注入）此类提供程序的任何类。

```typescript
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
  },
}
```

与任何其它`Provider`一样，异步`Provider`通过其`token`注入到其它组件中。在上面的示例中，可以在构建函数中使用`@Inject('ASYNC_CONNECTION')`。

## Providers顺序

Nest会对Provider进行排序，目前顺序为：

> useValue > useFactory > useClass > useExisting


---
group:
  title: 功能
  order: 2
order: 4
---

# 生命周期事件

`Nest`应用程序以及每个应用程序元素都由Nest管理生命周期。`Nest`提供了生命周期钩子，可以查看关键生命周期事件，并在发生时执行（运行注册代码在您的模块，提供程序或控制器上）。

## 生命周期序列

下图显示了关键应用程序生命周期事件的顺序，从引导应用程序到节点进程退出的时间。我们可以将整个生命周期分为三个阶段：初始化、运行和终止。使用此生命周期，你可以计划适当的模块和服务初始化，管理活动连接，并在接收到终止信号时优雅地关闭应用程序。

![image.png](./images/lifecycle-event.png)

## 生命周期事件

生命周期事件发生在应用程序的启动和关闭过程中。`Nest`在每个生命周期事件中调用模块、提供者和控制器上注册的生命周期钩子方法（首先需要启用关闭钩子，如下所述）。如上图所示，`Nest`还调用适当的底层方法来开始监听连接和停止监听连接。

在下表中，只有在显式调用`app.close()`或进程接收到特殊系统信号（如`SIGTERM`）并且在应用程序启动时正确调用了`enableShutdownHooks`时，才会触发`onModuleDestroy`、`beforeApplicationShutdown`和`onApplicationShutdown`。

| 生命周期钩子方法 | 生命周期事件触发钩子方法调用 |
| --- | --- |
| `onModuleInit` | 在主机模块的依赖关系已解析完成后调用一次。 |
| `onApplicationBootstrap` | 在所有模块初始化完成，但在监听连接之前调用一次。 |
| `onModuleDestroy`* | 在接收到终止信号（例如 `SIGTERM`）后调用。 |
| `beforeApplicationShutdown`* | 在所有`onModuleDestroy() `处理程序完成后调用（Promises 已解析或拒绝）；一旦完成（Promises 已解析或拒绝），所有现有连接将关闭（调用 `app.close()`）。 |
| `onApplicationShutdown`* | 在连接关闭后调用（`app.close()` 已解析）。 |

:::warning
`*` 对于这些事件，如果你没有显式调用`app.close()`，则必须选择加入以使它们能够与系统信号（如`SIGTERM`）一起工作。请参见下面的应用程序关闭。
  
`onModuleInit`和`onApplicationBootstrap`的执行顺序直接取决于模块导入的顺序，等待前一个钩子完成。
:::

## 用法

每个生命周期钩子都由一个接口表示。接口在 TypeScript 编译后实际上是可选的，因为它们在编译后不存在。尽管如此，最好还是使用它们以便从强类型和编辑器工具中受益。

要注册一个生命周期钩子，请实现相应的接口。例如，要在特定类（例如 Controller、Provider 或 Module）的模块初始化期间注册一个方法，请实现 `OnModuleInit` 接口，并提供一个 `onModuleInit() `方法，如下所示：

```typescript
import { Injectable, OnModuleInit } from '@nest';

@Injectable()
export class UsersService implements OnModuleInit {
  onModuleInit() {
    console.log(`The module has been initialized.`);
  }
}
```

## 应用程序关闭

在终止阶段（响应于显式调用`app.close()`或接收到系统信号（如`SIGTERM`，如果选择注入的话）），将调用`onModuleDestroy()`、`beforeApplicationShutdown()`和`onApplicationShutdown()`钩子。这个特性通常与`Kubernetes`一起使用来管理容器的生命周期，`Heroku`用于dynos或类似服务。

**关闭钩子侦听器**会消耗系统资源，因此默认情况下它们被禁用。要使用关闭钩子，必须调用`enableShutdownHooks()`：

```typescript
const app = await NestFactory.create(AppModule, Router);
app.enableShutdownHooks();
await app.listen({
  port: 8000,
});
```

:::warning
由于平台限制，Nest 在 Windows 上对应用程序关闭钩子，仅支持`SIGINT`（`CTRL+C`）和`SIGBREAK`（`CTRL+Break`）。然而，由于在任务管理器中杀死进程是无条件的，“即没有应用程序可以检测或防止它”，因此 `SIGTERM` 永远不会在 Windows 上工作。
:::

当应用程序接收到终止信号时，它将调用任何已注册的`onModuleDestroy()`、`beforeApplicationShutdown(signal?: string)`和`onApplicationShutdown(signal?: string)`方法（按上述顺序）。如果已注册的函数等待异步调用（返回一个promise），Nest将在promise被解决或拒绝之前不会继续执行序列。

```typescript
@Injectable()
class UsersService implements OnApplicationShutdown {
  onApplicationShutdown(signal: string) {
    console.log(signal); // e.g. "SIGINT"
  }
}
```

:::warning
调用`app.close()`不会终止Deno进程，而只会触发`onModuleDestroy()`和`onApplicationShutdown()`钩子，因此如果存在一些间隔、长时间运行的后台任务等，进程将不会自动终止。
:::

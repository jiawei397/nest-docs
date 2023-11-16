---
group:
  title: 技巧
  order: 3
order: 4
---

# 任务计划

任务调度允许你在固定的日期/时间、循环间隔或指定的时间间隔后执行任意代码（方法/函数）。在Linux世界中，这通常由操作系统级别的`cron`等软件包处理。对于`Deno`应用程序，有几个模拟`cron`功能的软件包可供选择。`Nest`提供了`@nest/schedule`软件包，它与[deno_cron](https://deno.land/x/deno_cron@v1.0.0/cron.ts)集成。

我们先添加`@nest/schedule`到`importMap`：

```json
{
  "imports": {
    "@nest/schedule": "https://deno.land/x/deno_nest/modules/schedule/mod.ts"
  }
}
```

要激活作业调度，请将`ScheduleModule`导入到根`AppModule`中，并运行如下所示的`forRoot()`静态方法：

```typescript
import { Module } from '@nest';
import { ScheduleModule } from '@nest/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
})
export class AppModule {}
```

`.forRoot()`调用初始化调度程序并注册应用程序中存在的任何声明性 `cron` 作业、超时和间隔。当 `onApplicationBootstrap` 生命周期钩子发生时，注册将发生，确保所有模块都已加载并声明了任何计划的作业。
如果某个作业`Provider`没有在`Controller`中依赖注入，它需要被某个`Module`显式引入：

```typescript
@Module({
  controllers: [...],
  providers: [ScheduleService],
})
export class UserModule {}
```

## 声明性cron作业

`cron`作业可以自动安排运行任意函数（方法调用）。`cron`作业可以在以下情况下运行：

- 一次，在指定的日期/时间。
- 定期运行；定期作业可以在指定间隔内的指定时刻运行（例如，每小时一次、每周一次、每隔 5 分钟一次）。

使用 `@Cron()`装饰器在包含要执行代码的方法定义之前声明`cron`作业，如下所示：

```typescript
import { Injectable } from '@nest';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  @Cron('45 * * * * *')
  handleCron() {
    console.debug('Called when the current second is 45');
  }
}
```

在这个例子中，每当当前秒数为45时，`handleCron()`方法将被调用。换句话说，该方法将每分钟运行一次，在第45秒的时候运行。

`@Cron()`装饰器支持所有标准的`cron`模式：

```bash
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sunday)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59) - [Optional 01 as default]
```

| Field | Required | 允许的值 | 允许的特殊字符 |
|:---:|:---:|:---:|:---:|
| Seconds | No | 0-59 | / - , * |
| Minute | Yes | 0-59 | / - , * |
| Hour | Yes | 0-23 | / - , * |
| Day of Month | Yes | 1-31 | / - , * |
| Month | Yes | 1-12 | / - , * |
| Day of Week | Yes | 0-6 (0 is Sunday) | / - , * |

`@nestjs/schedule`包提供了一个方便的枚举，其中包含常用的 cron 模式。您可以按以下方式使用此枚举：

```typescript
import { Injectable } from '@nest';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    console.debug('Called every 30 seconds');
  }
}
```

在这个例子中，`handleCron()`方法将每30秒被调用一次。

## 声明性intervals

要声明一个方法应该以（定期）指定的间隔运行，需要在方法定义前加上`@Interval()`装饰器。将间隔值作为毫秒数传递给装饰器，如下所示：

```typescript
@Interval(10000)
handleInterval() {
  console.debug('Called every 10 seconds');
}
```

:::info
这个机制在底层使用了JavaScript的`setInterval()`函数。你也可以利用cron job来安排定期执行的任务。
:::

如果你想控制一个定时任务的取消，可以为这个任务添加一个唯一的名称：

```typescript
@Interval(5000, "intervalJob")
async intervalJob() {
   console.debug('Called every 5 seconds');
}
```

你可以在合适的时机取消它：

```typescript
import { schedulerRegistry } from "@nest/schedule";

schedulerRegistry.clearInterval("intervalJob");
```

## 声明性timeouts

要声明一个方法应该在指定的超时时间内运行（一次），请在方法定义前加上`@Timeout()`装饰器。将相对于应用程序启动的时间偏移（以毫秒为单位）作为参数传递给装饰器，如下所示：

```typescript
@Timeout(5000)
handleTimeout() {
  console.debug('Called once after 5 seconds');
}
```

:::info
与`@Interval`一样，`@Timeout`的底层使用了JavaScript的`setTimeout()`函数。
:::

如果你想控制一个定时任务的取消，可以为这个任务添加一个唯一的名称：

```typescript
@Interval(5000, "timeoutJob")
async handleTimeout() {
   console.debug('Called once after 5 seconds');
}
```

你可以在合适的时机取消它：

```typescript
import { schedulerRegistry } from "@nest/schedule";

schedulerRegistry.clearTimeout("intervalJob");
```

## 样例

完整样例在[这里](https://deno.land/x/deno_nest/modules/schedule/example?source)。

---
group:
  title: Tips
  order: 3
order: 4
---

# Task Scheduling

Task scheduling allows you to execute arbitrary code (methods/functions) at fixed dates/times, recurring intervals, or specified time intervals. In the Linux world, this is often handled by operating system-level packages like `cron`. For Deno applications, there are several packages that simulate `cron` functionality. Nest provides the `@nestjs/schedule` package, which integrates with [deno_cron](https://deno.land/x/deno_cron@v1.0.0/cron.ts).

First, add `@nestjs/schedule` to the `importMap`:

```json
{
  "imports": {
    "@nestjs/schedule": "https://deno.land/x/deno_nest/modules/schedule/mod.ts"
  }
}
```

To activate job scheduling, import the `ScheduleModule` into the root `AppModule` and run the `forRoot()` static method as follows:

```typescript
import { Module } from '@nest';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
})
export class AppModule {}
```

The `.forRoot()` call initializes the scheduler and registers any declarative `cron` jobs, timeouts, and intervals that exist in the application. The registration occurs when the `onApplicationBootstrap` lifecycle hook happens, ensuring that all modules have been loaded and have declared any scheduled jobs.

If a job `Provider` is not injected in a `Controller`, it needs to be explicitly imported by some `Module`:

```typescript
@Module({
  controllers: [...],
  providers: [ScheduleService],
})
export class UserModule {}
```

## Declarative Cron Jobs

`cron` jobs allow you to automatically schedule the execution of any function (method call). `cron` jobs can run under the following conditions:

- Once, at a specified date/time.
- Periodically; cron jobs can run at specified times within a specified interval (e.g., every hour, every week, every 5 minutes).

Use the `@Cron()` decorator to declare `cron` jobs before the method definition containing the code to be executed, as shown below:

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

In this example, the `handleCron()` method will be called every time the current second is 45. In other words, the method runs once every minute, at the 45th second.

The `@Cron()` decorator supports all standard `cron` patterns:

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

| Field | Required | Allowed Values | Allowed Special Characters |
|:---:|:---:|:---:|:---:|
| Seconds | No | 0-59 | / - , * |
| Minute | Yes | 0-59 | / - , * |
| Hour | Yes | 0-23 | / - , * |
| Day of Month | Yes | 1-31 | / - , * |
| Month | Yes | 1-12 | / - , * |
| Day of Week | Yes | 0-6 (0 is Sunday) | / - , * |

The `@nestjs/schedule` package provides a convenient enum containing common `cron` patterns. You can use this enum as follows:

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

In this example, the `handleCron()` method will be called every 30 seconds.

## Declarative Intervals

To declare a method that should run at (regular) specified intervals, add the `@Interval()` decorator before the method definition. Pass the interval value in milliseconds as a parameter to the decorator, as shown below:

```typescript
@Interval(10000)
handleInterval() {
  console.debug('Called every 10 seconds');
}
```

:::info
This mechanism uses the underlying JavaScript `setInterval()` function. You can also use cron jobs to schedule regularly occurring tasks.
:::

If you want to control the cancellation of a scheduled task, you can add a unique name to it:

```typescript
@Interval(5000, "intervalJob")
async intervalJob() {
   console.debug('Called every 5 seconds');
}
```

You can cancel it at an appropriate time:

```typescript
import { schedulerRegistry } from "@nestjs/schedule";

schedulerRegistry.clearInterval("intervalJob");
```

## Declarative Timeouts

To declare a method that should run once within a specified timeout, add the `@Timeout()` decorator before the method definition. Pass the time offset in milliseconds relative to the application startup time as a parameter to the decorator, as shown below:

```typescript
@Timeout(

5000)
handleTimeout() {
  console.debug('Called once after 5 seconds');
}
```

:::info
Similar to `@Interval`, `@Timeout` uses the underlying JavaScript `setTimeout()` function.
:::

If you want to control the cancellation of a scheduled task, you can add a unique name to it:

```typescript
@Interval(5000, "timeoutJob")
async handleTimeout() {
   console.debug('Called once after 5 seconds');
}
```

You can cancel it at an appropriate time:

```typescript
import { schedulerRegistry } from "@nestjs/schedule";

schedulerRegistry.clearTimeout("intervalJob");
```

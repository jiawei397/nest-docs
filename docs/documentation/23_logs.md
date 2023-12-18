---
group: 技巧
order: 3
---

# 日志

我们使用[date_log](https://deno.land/x/date_log/mod.ts)这个日志记录包来实现完全我肯定义的生产级日志记录系统。

## date_log使用

以下是`date_log`的简单使用：

```typescript
import {
  DateFileLogConfig,
  getLogger,
  initLog,
} from "https://deno.land/x/date_log@v1.1.1/mod.ts";

const config: DateFileLogConfig = {
  "appenders": {
    "dateFile": {
      "filename": "logs/deno",
      "daysToKeep": 10,
      "pattern": "yyyy-MM-dd.log",
    },
  },
  "categories": {
    "default": {
      "appenders": ["console", "dateFile"],
      "level": "DEBUG",
    },
    "task": {
      "appenders": ["console", "dateFile"],
      "level": "WARNING",
    },
  },
};

await initLog(config);

const logger = getLogger();
logger.warning("warning");
logger.warning(1);
logger.info("info");
logger.error("error");

const logger2 = getLogger("task");
logger2.warning("warning2");
logger2.warning(2);
logger2.info("info2");
logger2.error("error2");
```

当配置了`dateFile`后，在`categories`里可以确定是否要启用。它会在根目录下按日期创建相应的日志，过期后会删除之前的文件：

```bash
logs
|-- deno.2023-11-07.log
|-- deno.2023-11-08.log
`-- deno.2023-11-09.log
```

## 与Nest集成

首先，让我们添加我们的`date_log`到`importMap`：

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.202.0/",
    "date_log": "https://deno.land/x/date_log@v1.1.1/mod.ts"
  }
}
```

添加一个`src/globals.ts`：

```typescript
import { type DateFileLogConfig } from "date_log";
import { parse as parseYaml } from "std/yaml/mod.ts";

async function loadYaml<T = unknown>(path: string) {
  const str = await Deno.readTextFile(path);
  return parseYaml(str) as T;
}

interface Config {
  log: DateFileLogConfig;
}

const config: Config = await loadYaml<Config>("config.yaml");

export default config;
```

再添加一个`log.ts`：

```typescript
// deno-lint-ignore-file no-explicit-any
import { type Constructor, Inject, Injectable, INQUIRER, Scope } from "@nest";
import { getLogger, initLog } from "date_log";
import globals from "./globals.ts";

initLog(globals.log);

export const logger = getLogger();

@Injectable({
  scope: Scope.TRANSIENT,
})
export class Logger {
  private parentName?: string;

  constructor(@Inject(INQUIRER) private parentClass: Constructor) {
    this.parentName = this.parentClass.name;
  }

  private write(
    methodName: "warning" | "info" | "debug" | "error",
    ...messages: any[]
  ): void {
    if (this.parentName) {
      logger[methodName](this.parentName, ...messages);
    } else {
      const [first, ...others] = messages;
      logger[methodName](first, ...others);
    }
  }

  debug(...messages: any[]): void {
    this.write("debug", ...messages);
  }

  info(...messages: any[]): void {
    this.write("info", ...messages);
  }

  warn(...messages: any[]): void {
    this.write("warning", ...messages);
  }

  error(...messages: any[]): void {
    this.write("error", ...messages);
  }
}
```

:::warning{title=注意}
这里在装饰器`Injectable`中使用了`Scope.TRANSIENT`来表示这个类不是单例模式的。
:::

我们在项目根目录下创建一个文件`config.yaml`，配置如下：

```yaml
log:
  appenders:
    dateFile:
      filename: logs/deno
      daysToKeep: 10
      pattern: yyyy-MM-dd.log
  categories:
    default:
      appenders:
        - dateFile
        - console
      level: DEBUG
```

之后，在main.ts中就可以使用logger来打印了：

```typescript
import { NestFactory } from "@nest";
import { Router } from "@nest/hono";
import { AppModule } from "./app.module.ts";
import { logger } from "./log.ts";

const app = await NestFactory.create(AppModule, Router);

const port = Number(Deno.env.get("PORT") || 2000);
app.listen({
  port,
  onListen: ({ hostname, port }) =>
    logger.info(`Listening on http://${hostname}:${port}`),
});
```

当服务启动后，就能看到根目录下创建了一个文件`logs/deno.2023-11-09.log`，内容大致如下：

```bash
2023-11-09 15:52:08 [INFO] - Listening on http://localhost:2000
```

上面的Logger可以被当作Provider被注入，比如在AppController可以这样：

```typescript
import { Controller, Get } from "@nest";
import { Logger } from "./log.ts";

@Controller("")
export class AppController {
  constructor(private logger: Logger) {}

  @Get("/")
  hello() {
    this.logger.info("hello world");
    return "Hello World!";
  }
}
```

当接口被请求时，log中就多了一条：

```bash
2023-11-09 15:53:05 [INFO] - [AppController] hello world
```

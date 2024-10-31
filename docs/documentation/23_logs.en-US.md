---
group: Techniques
order: 3
---

# Logging

We use the [date_log](https://jsr.io/@jw397/date-log) logging package to implement a fully customizable production-grade logging system.

## Using date_log

Here's a simple usage of `date_log`:

```typescript
import {
  type DateFileLogConfig,
  getLogger,
  initLog,
} from 'jsr:@jw397/date-log';

const config: DateFileLogConfig = {
  appenders: {
    dateFile: {
      filename: 'logs/deno',
      daysToKeep: 10,
      pattern: 'yyyy-MM-dd.log',
    },
  },
  categories: {
    default: {
      appenders: ['console', 'dateFile'],
      level: 'DEBUG',
    },
    task: {
      appenders: ['console', 'dateFile'],
      level: 'WARNING',
    },
  },
};

await initLog(config);

const logger = getLogger();
logger.warning('warning');
logger.warning(1);
logger.info('info');
logger.error('error');

const logger2 = getLogger('task');
logger2.warning('warning2');
logger2.warning(2);
logger2.info('info2');
logger2.error('error2');
```

When configuring `dateFile`, you can determine whether to enable it in the `categories`. It creates corresponding logs in the root directory by date and deletes previous files after the specified days:

```bash
logs
|-- deno.2023-11-07.log
|-- deno.2023-11-08.log
`-- deno.2023-11-09.log
```

## Integration with Nest

First, let's add our `date_log` to the `importMap`:

```json
{
  "imports": {
    "@std/yaml": "jsr:@std/yaml@^1.0.5",
    "date_log": "jsr:@jw397/date-log@^2.0.0"
  }
}
```

Add a `src/globals.ts`:

```typescript
import { type DateFileLogConfig } from 'date_log';
import { parse as parseYaml } from '@std/yaml';

async function loadYaml<T = unknown>(path: string) {
  const str = await Deno.readTextFile(path);
  return parseYaml(str) as T;
}

interface Config {
  log: DateFileLogConfig;
}

const config: Config = await loadYaml<Config>('config.yaml');

export default config;
```

Then add a `log.ts`:

```typescript
// deno-lint-ignore-file no-explicit-any
import {
  type Constructor,
  Inject,
  Injectable,
  INQUIRER,
  Scope,
} from '@nest/core';
import { getLogger, initLog } from 'date_log';
import globals from './globals.ts';

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
    methodName: 'warn' | 'info' | 'debug' | 'error',
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
    this.write('debug', ...messages);
  }

  info(...messages: any[]): void {
    this.write('info', ...messages);
  }

  warn(...messages: any[]): void {
    this.write('warn', ...messages);
  }

  error(...messages: any[]): void {
    this.write('error', ...messages);
  }
}
```

:::warning{title=Note}
Here, the `Scope.TRANSIENT` is used in the `Injectable` decorator to indicate that this class is not a singleton.
:::

Create a `config.yaml` file in the project's root directory with the following configuration:

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

After that, in `main.ts`, you can use the logger to print:

```typescript
import { NestFactory } from '@nest/core';
import { Router } from '@nest/hono';
import { AppModule } from './app.module.ts';
import { logger } from './log.ts';

const app = await NestFactory.create(AppModule, Router);

const port = Number(Deno.env.get('PORT') || 2000);
app.listen({
  port,
  onListen: ({ hostname, port }) =>
    logger.info(`Listening on http://${hostname}:${port}`),
});
```

Once the service is started, you will see a file `logs/deno.2023-11-09.log` created in the root directory, with content roughly like this:

```bash
2023-11-09 15:52:08 [INFO] - Listening on http://localhost:2000
```

The above Logger can be injected as a Provider, for example, in `AppController`:

```typescript
import { Controller, Get } from '@nest/core';
import { Logger } from './log.ts';

@Controller('')
export class AppController {
  constructor(private logger: Logger) {}

  @Get('/')
  hello() {
    this.logger.info('hello world');
    return 'Hello World!';
  }
}
```

When the interface is requested, the log will have an additional entry:

```bash
2023-11-09 15:53:05 [INFO] - [AppController] hello world
```

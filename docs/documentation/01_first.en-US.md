---
group:
  title: Overview
  order: 1
order: 1
---

# First steps

## Prerequisites

Make sure [Deno](https://deno.com/) is installed on your operating system (version >= v2.0.0).

## Setup

The easiest way to set up a Nest project is to initialize a project using our CLI:

```bash
deno run --allow-env --allow-run --allow-net --allow-read --allow-write jsr:@nest/cli
```

:::warning
For the convenience of writing, all CDN addresses in this document (such as `https://deno.land/x/deno_nest`) do not carry version numbers. Readers must lock the specific version, especially in `importMap`, when using it. This will not be reminded in later text.
:::

Currently, our CLI functionality, in addition to creating projects, includes a `generate` command to assist in generating different types of files.

Therefore, it is more appropriate to install it globally:

```bash
deno install -g --allow-env --allow-run --allow-net --allow-read --allow-write -n nest  -f  jsr:@nest/cli
```

It should be noted that `-n nests` indicates that the name of the installed global command is `nests`, which is to avoid conflicts with the `NestJS` command. However, if you do not plan to use `NestJS`, you can modify it to `-n nest`.

You can then use the command `nests`, which is equivalent to `nests new`.

```bash
$ nests
We will scaffold your app in a few seconds..
? What name would you like to use for the new project? (deno_nest_app) › aa
? Which platform would you like to download by the new project? › gitee+ssh
? Which engine would you like to use for the new project? (hono) › hono
Project created
🚀  Successfully created project aa
👉  Get started with the following commands:

$ cd aa
$ deno task dev
```

## Directory Structure

The directory structure of our project is roughly as follows:

```bash
├── README.md
├── deno.jsonc
├── import_map.json
└── src
    ├── app.controller.ts
    ├── app.dto.ts
    ├── app.module.ts
    ├── app.service.ts
    ├── exception.ts
    └── main.ts

1 directory, 9 files
```

Here is a brief overview of these core files:

| Path              | Description                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| app.controller.ts | Basic controller with a single route.                                                                              |
| app.module.ts     | Root module of the application.                                                                                    |
| app.service.ts    | Basic service with a single method.                                                                                |
| main.ts           | Entry file for the application where the Nest application instance is created using the core function NestFactory. |

The `main.ts` file includes an asynchronous function that will bootstrap our application:

```typescript
import { NestFactory } from '@nest/core';
import { Router } from '@nest/hono';
import { AppModule } from './app.module.ts';
import { HttpExceptionFilter } from './exception.ts';

const app = await NestFactory.create(AppModule, Router);
app.useGlobalFilters(HttpExceptionFilter);

const port = 8000;
app.listen({ port });
```

To create a `Nest` application instance, we use the core `NestFactory` class. `NestFactory` exposes some static methods that allow the creation of an application instance. The `create()` method returns an application object. This object provides a set of methods, which will be described in the following sections.

In the above `main.ts` example, we simply start our HTTP listener, allowing the application to wait for incoming HTTP requests.

:::warning
Projects created with the Nest CLI template will establish an initial project structure, encouraging developers to follow the convention of placing each module in its dedicated directory.
:::

## Platforms

Nest is designed to be a platform-agnostic framework. Platform independence allows for the creation of reusable logical parts that developers can benefit from in various types of applications.

Technically, once an adapter is created, Nest can work with any Deno HTTP framework. Currently, two HTTP platforms are supported: `hono` and `oak`. You can choose the platform that best suits your needs, although `hono` is recommended by default due to its better performance.

For example, to switch to `oak`, you only need to change the router:

```diff
- import { Router } from "@nest/hono";
+ import { Router } from "@nest/oak";
```

## Running the Program

As indicated in the console printout, the command to run the program is:

```bash
deno task dev
```

It automatically monitors file changes and restarts the service. You can also use:

```bash
deno task start
```

## Code Validation and Formatting

Thanks to Deno's comprehensive tools, you can perform code validation and formatting directly using `deno lint` and `deno fmt` without the need to install additional toolkits.

The project comes with recommended VSCode plugins (specifically, Deno's official plugin `denoland.vscode-deno`). Just install and enable them, and you can code happily!

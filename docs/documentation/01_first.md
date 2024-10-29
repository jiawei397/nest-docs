---
group:
  title: 概述
  order: 1
order: 1
---

# 第一步

## 先决条件

请确保您的操作系统上安装了 [Deno](https://deno.com/)（版本 >= 安装 v2.0.0）。

## 设置

设置 Nest 项目的最简单方法是使用我们的 [CLI](https://jsr.io/@nest/cli) 来初始化一个工程：

```bash
deno run --allow-env --allow-run --allow-net --allow-read --allow-write jsr:@nest/cli
```

:::warning
为行文方便，本文档中所有的`jsr`地址（比如`jsr:@nest/cli`、`jsr:@nest/core`）并不携带版本号，读者在具体使用中尤其是在`imports`中将务必锁定具体版本，后文不再提示。
:::

目前我们的 CLI 功能，除了创建项目外，还包含 generate 命令，可以辅助后续生成不同类型的文件。

所以，更合适的是全局安装：

```bash
deno install -g --allow-env --allow-run --allow-net --allow-read --allow-write -n nests  -f  jsr:@nest/cli
```

需要注意的是，`-n nests` 表示安装的全局命令的名称是`nests`，这是为了避免与`NestJS`的命令冲突。当然，如果你并不准备使用`NestJS`，可以将它修改为`-n nest`。

接着就可以使用命令`nests`了，等同于`nests new`。

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

## 目录结构

我们的工程的目录结构大致如下：

```bash
├── README.md
├── deno.jsonc
└── src
    ├── app.controller.ts
    ├── app.dto.ts
    ├── app.module.ts
    ├── app.service.ts
    ├── exception.ts
    └── main.ts

1 directory, 8 files
```

以下是这些核心文件的简要概述：

| 路径              | 说明                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| app.controller.ts | 具有单一路由的基本控制器。                                           |
| app.module.ts     | 应用程序的根模块。                                                   |
| app.service.ts    | 具有单一方法的基本服务。                                             |
| main.ts           | NestFactory 使用核心函数创建 Nest 应用程序实例的应用程序的入口文件。 |

其中 main.ts 包括一个异步函数，它将引导我们的应用程序：

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

要创建一个`Nest`应用实例，我们使用核心的`NestFactory`类。`NestFactory`暴露了一些静态方法，允许创建一个应用实例。`create()`方法返回一个应用对象。这个对象提供了一组方法，在接下来的章节中将进行描述。

在上面的`main.ts`示例中，我们只是启动了我们的 HTTP 监听器，这样应用程序就可以等待传入的 HTTP 请求。

:::warning{title=注意}
使用 Nest CLI 创建的项目模板会创建一个初始的项目结构，鼓励开发者遵循将每个模块放在自己专用目录中的约定。
:::

## 平台

`Nest`旨在成为一个平台无关的框架。平台独立性使得可以创建可重用的逻辑部分，开发人员可以在多种不同类型的应用程序中受益于它们。

从技术上讲，一旦创建了适配器，`Nest`就能够与任何 Deno HTTP 框架一起使用。现在支持两个 HTTP 平台：`hono`和`oak`。您可以选择最适合您需求的平台，不过默认推荐使用`hono`，它的性能要更好些。

比如，要切换为`oak`的话，只需要这样修改：

```diff
- import { Router } from "@nest/hono";
+ import { Router } from "@nest/oak";
```

## 运行程序

如控制台打印的提示信息，运行程序的命令为：

```bash
deno task dev
# or
deno run dev
```

它默认监听了文件的变化重启服务，你也可以使用：

```bash
deno task start
# or
deno run start
```

## 代码校验与格式化

得益于 Deno 的一揽子工具，不必额外安装任何工具包就可以直接使用`deno lint`、`deno fmt` 进行代码校验与格式化。

工程内置了 VSCode 的插件推荐（也就是 Deno 的官方插件`denoland.vscode-deno`），只需要安装并启用就可以愉快地编码了！

---
group:
  title: 概述
  order: 1
order: 1
---

# 第一步

## 先决条件

请确保您的操作系统上安装了 [Deno](https://deno.com/)（版本 >= 安装 v1.37.0）。

## 设置

设置 Nest 项目的最简单方法是使用我们的CLI来初始化一个工程：

```bash
deno run --allow-env --allow-run --allow-net --allow-read --allow-write --import-map https://deno.land/x/deno_nest@v3.7.0/cli/import_map.json https://deno.land/x/deno_nest@v3.1.5/cli/main.ts
```

目前我们的CLI功能，除了创建项目外，还包含generate命令，可以辅助后续生成不同类型的文件。

所以，更合适的是全局安装：

```bash
deno install --allow-env --allow-run --allow-net --allow-read --allow-write --import-map https://deno.land/x/deno_nest@v3.7.0/cli/import_map.json  -n nest -f https://deno.land/x/deno_nest@v3.1.5/cli/main.ts
```

需要注意的是，`-n nest `表示安装的全局命令的名称是`nest`，它与Node.js的NestJS的命令是一致的，这意味着可能会引起冲突，如果你要同时使用两个命令的话，建议将它修改名称，比如改为`-n dest`。

接着就可以使用命令`nest`了，等同于`nest new`。

```bash
$ nest
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

以下是这些核心文件的简要概述：

| 路径 | 说明 |
| --- | --- |
| app.controller.ts | 具有单一路由的基本控制器。 |
| app.module.ts | 应用程序的根模块。 |
| app.service.ts | 具有单一方法的基本服务。 |
| main.ts | NestFactory使用核心函数创建Nest应用程序实例的应用程序的入口文件。 |

其中main.ts包括一个异步函数，它将引导我们的应用程序：

```typescript
import { NestFactory } from "@nest";
import { Router } from "@nest/hono";
import { AppModule } from "./app.module.ts";
import { HttpExceptionFilter } from "./exception.ts";

const app = await NestFactory.create(AppModule, Router);
app.useGlobalFilters(HttpExceptionFilter);

const port = 8000;
app.listen({ port });
```

要创建一个`Nest`应用实例，我们使用核心的`NestFactory`类。`NestFactory`暴露了一些静态方法，允许创建一个应用实例。`create()`方法返回一个应用对象。这个对象提供了一组方法，在接下来的章节中将进行描述。

在上面的`main.ts`示例中，我们只是启动了我们的HTTP监听器，这样应用程序就可以等待传入的HTTP请求。

:::warning{title=注意}
使用Nest CLI创建的项目模板会创建一个初始的项目结构，鼓励开发者遵循将每个模块放在自己专用目录中的约定。
:::

## 平台

Nest旨在成为一个平台无关的框架。平台独立性使得可以创建可重用的逻辑部分，开发人员可以在多种不同类型的应用程序中受益于它们。

从技术上讲，一旦创建了适配器，Nest就能够与任何Deno HTTP框架一起使用。现在支持两个HTTP平台：hono和oak。您可以选择最适合您需求的平台，不过默认推荐使用`hono`，它的性能要更好些。

比如，要切换为oak的话，只需要切换路由：

```diff
- import { HonoRouter as Router } from "@nest/hono";
+ import { OakRouter as Router } from "@nest/oak";
```

## 运行程序

如控制台打印的提示信息，运行程序的命令为：

```bash
deno task dev
```

它默认监听了文件的变化重启服务，你也可以使用：

```bash
deno task start
```

## 代码校验与格式化

得益于Deno的一揽子工具，不必额外安装任何工具包就可以直接使用deno lint、deno fmt进行代码校验与格式化。

工程内置了VSCode的插件推荐（也就是Deno的官方插件`denoland.vscode-deno`），只需要安装并启用就可以愉快地编码了！

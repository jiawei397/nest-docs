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
deno run --allow-env --allow-run --allow-net --allow-read --allow-write --import-map https://deno.land/x/deno_nest/cli/import_map.json https://deno.land/x/deno_nest/cli/main.ts
```

:::warning
为行文方便，本文档中所有的CDN地址（比如`https://deno.land/x/deno_nest`）并不携带版本号，读者在具体使用中尤其是在`importMap`中将务必锁定具体版本，后文不再提示。
:::

目前我们的CLI功能，除了创建项目外，还包含generate命令，可以辅助后续生成不同类型的文件。

所以，更合适的是全局安装：

```bash
deno install --allow-env --allow-run --allow-net --allow-read --allow-write --import-map https://deno.land/x/deno_nest/cli/import_map.json  -n nests -f https://deno.land/x/deno_nest/cli/main.ts
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

`Nest`旨在成为一个平台无关的框架。平台独立性使得可以创建可重用的逻辑部分，开发人员可以在多种不同类型的应用程序中受益于它们。

从技术上讲，一旦创建了适配器，`Nest`就能够与任何Deno HTTP框架一起使用。现在支持两个HTTP平台：`hono`和`oak`。您可以选择最适合您需求的平台，不过默认推荐使用`hono`，它的性能要更好些。

比如，要切换为`oak`的话，只需要这样修改：

```diff
- import { Router } from "@nest/hono";
+ import { Router } from "@nest/oak";
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

---
group: 技巧
order: 7
---

# 静态资源服务

`Nest`为`Application`提供了一个方法`useStaticAssets`，可以代理本地某个文件夹。

```typescript
const app = await NestFactory.create(AppModule, Router);
app.useStaticAssets("public");
```

上例就是将`public`整个目录的文件代理。当前整体目录结构为：

```bash
./
|-- deno.json
|-- public
|   |-- child
|   |   `-- test.js
|   |-- favicon.ico
|   `-- index.html
`-- src
    |-- app.controller.ts
    |-- app.module.ts
    `-- main.ts
```

当服务启动后，用户请求`http://localhost:2000/`时，其实请求到的是`public/index.html`；请求`http://localhost:2000/child/test.js`时，请求到的是`public/child/test.js`。

`useStaticAssets`还有第二个参数，可以设置`prefix`，也就是为这个文件夹路径添加一个前缀标识：

```typescript
const app = await NestFactory.create(AppModule, Router);
app.useStaticAssets("public", {
  prefix: "static",
});
```

设置了以后，只有请求`http://localhost:2000/static`时，才会请求到`public/index.html`。

同样的，`Nest`还提供了一个`setGlobalPrefix`方法，当用户设置之后，所有经`Nest IoC`容器控制的接口（`app.get`添加的接口不受影响），都会添加相应的前缀：

```typescript
app.setGlobalPrefix("/api");
```

当服务启动时，你在控制台里看到所有的接口打印的路径都添加了`api`前缀：

```bash
[Nest] 2023-11-13 18:24:10 [RouterExplorer] Mapped {/api, GET} route 0ms
[Nest] 2023-11-13 18:24:10 [RoutesResolver] AppController /api 0ms
```

---
group: Techniques
order: 7
---

# Static Assets Service

`Nest` provides a method `useStaticAssets` for the `Application` to proxy a local folder.

```typescript
const app = await NestFactory.create(AppModule, Router);
app.useStaticAssets("public");
```

In the above example, the entire `public` directory is being proxied. The current directory structure is as follows:

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

When the service is started, when a user requests `http://localhost:2000/`, it actually requests `public/index.html`. When a user requests `http://localhost:2000/child/test.js`, it requests `public/child/test.js`.

`useStaticAssets` also has a second parameter that allows setting a `prefix`, which adds a prefix identifier to the folder path:

```typescript
const app = await NestFactory.create(AppModule, Router);
app.useStaticAssets("public", {
  prefix: "static",
});
```

After setting this, only when requesting `http://localhost:2000/static`, it will request `public/index.html`.

Similarly, `Nest` also provides a method `setGlobalPrefix`, which, when set by the user, adds the corresponding prefix to all interfaces controlled by the `Nest IoC` container (interfaces added through `app.get` are not affected):

```typescript
app.setGlobalPrefix("/api");
```

When the service starts, you will see in the console that all printed interface paths have the `api` prefix added:

```bash
[Nest] 2023-11-13 18:24:10 [RouterExplorer] Mapped {/api, GET} route 0ms
[Nest] 2023-11-13 18:24:10 [RoutesResolver] AppController /api 0ms
```

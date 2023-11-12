---
group:
  title: 技巧
  order: 3
order: 6
---

# CORS

跨域资源共享 (`CORS`) 是一种允许从另一个域请求资源的机制。在底层，Nest提供了一个通用的`@nest/cors`包来帮助你进行自定义。

首先添加`importMap`：

```json
{
  "imports": {
    "@nest": "https://deno.land/x/deno_nest@v3.6.2/mod.ts",
    "@nest/hono": "https://deno.land/x/deno_nest@v3.6.2/modules/hono/mod.ts",
    "@nest/cors": "https://deno.land/x/deno_nest@v3.6.2/modules/cors/mod.ts",
    "hono/": "https://deno.land/x/hono@v3.9.1/"
  }
}
```

开始使用：

```typescript
import { NestFactory } from "@nest";
import { Router } from "@nest/hono";
import { CORS } from "@nest/cors";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
app.use(CORS());

await app.listen({
  port: 2000,
});
```

`CORS`方法采用可选的配置对象参数：

```typescript
export function CORS(options?: boolean | CorsOptions) {}
  
export interface CorsOptions {
  /**
   * Configures the `Access-Control-Allow-Origins` CORS header.
   */
  origin?: StaticOrigin | CustomOrigin;
  /**
   * Configures the Access-Control-Allow-Methods CORS header.
   */
  methods?: string | string[];
  /**
   * Configures the Access-Control-Allow-Headers CORS header.
   */
  allowedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Expose-Headers CORS header.
   */
  exposedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Allow-Credentials CORS header.
   */
  credentials?: boolean;
  /**
   * Configures the Access-Control-Max-Age CORS header.
   */
  maxAge?: number;
  /**
   * Whether to pass the CORS preflight response to the next handler.
   */
  preflightContinue?: boolean;
  /**
   * Provides a status code to use for successful OPTIONS requests.
   */
  optionsSuccessStatus?: number;
}
```

默认情况下，`CORS`中间件会读取请求中的`Origin`属性：
![request](./images/cors_request.png)

将它添加到响应标头中：
![response](./images/cors_response.png)

其它选项各有解释，并不复杂，这里就不赘述了。

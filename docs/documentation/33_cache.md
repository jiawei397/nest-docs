---
group: 技巧
order: 13
---

# 缓存

缓存是一项伟大而简单的技术，可以帮助提高应用程序的性能。它充当提供高性能数据访问的临时数据存储。`Nest`提供了一个通用的`@nest/cache`包来帮助你。

先在`importMap`中引入：

```json
{
  "imports": {
    "@nest/cache": "https://deno.land/x/deno_nest/modules/cache/mod.ts"
  }
}
```

:::warning

1. 实际开发中请添加具体版本号，且与`Nest`版本保持一致。
2. `@nest/cache`只支持`GET`请求。
   :::

## 使用

然后在 module 中使用：

```typescript
import { Module } from '@nest/core';
import { CacheModule } from '@nest/cache';
import { AppController } from './app.controller.ts';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60,
      // max: 2,
      // isDebug: true,
      // policy: "public",
      // store: "localStorage",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

以下是`register`的参数：

| 参数名           | 类型                                                                                                  | 描述                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| store            | "memory" &#124; "LRU" &#124; "localStorage" &#124; "KVStore" &#124; CacheStoreMap &#124; CacheFactory | 缓存存储管理器。默认为 memory。                            |
| ttl              | number                                                                                                | 缓存的存活时间，以秒为单位。默认为 5 秒。                  |
| isCacheableValue | (value: any) => boolean                                                                               | 用于确定值是否可缓存的函数。                               |
| getCacheKey      | (params: { constructorName: string; methodName: string; methodType: string; args: any[]; }) => string | 用于确定缓存键的函数。默认会将参数信息 md5 为一个字符串。  |
| policy           | "public" &#124; "private" &#124; "no-cache"                                                           | 用于配置缓存响应标头`cache-control`的选项。                |
| isDebug          | boolean                                                                                               | 是否启用调试模式。会有额外的开发信息打印                   |
| max              | number                                                                                                | 缓存中存储的最大响应数。默认为 1000。仅当 LRU 存储时有效。 |
| maxSize          | number                                                                                                | 缓存的最大大小。默认为 1,000,000。仅当 LRU 存储时有效。    |
| kvStoreBaseKey   | string                                                                                                | KV 存储的基键。仅当存储设置为 KVStore 时使用。             |

然后就可以在`Controller`中使用了：

```typescript
import { Controller, Get, Params, Query, UseInterceptors } from '@nest/core';
import { CacheInterceptor } from '@nest/cache';

@Controller('')
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get('/')
  hello() {}
}
```

与普通的`Interceptor`一样，它同样可以作用在具体某个方法上：

```typescript
@Get("/delay")
@UseInterceptors(CacheInterceptor)
delay(@Query("id") id: string) {}
```

`Nest`还提供了三个装饰器，可以修改全局注册时的值：

| 装饰器                                                                  | 修改的值                                                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `@CacheTTL(ttl: number)`                                                | `ttl`                                                                                  |
| `@CacheKey(key: string)`                                                | 指定具体字符串为某个方法的缓存键，优先级高于`getCacheKey`，但需要自己保障 KEY 的唯一性 |
| `@SetCacheStore(key: CacheStoreName)`                                   | `store`                                                                                |
| `@SetCachePolicy(policy: "public" &#124; "private" &#124; "no-cache") ` | `policy`                                                                               |

比如可以如下使用：

```typescript
@Get("/delay/:id")
@CacheTTL(3000)
delay2(@Params("id") id: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("delay " + id);
    }, 500);
  });
}
```

## store

`@nest/cache`目前支持 4 种`store`：

1. `memory`：`@nest/cache`默认缓存在内存。
2. `LRU`：LRU 是"最近最少使用"（Least Recently Used）的缩写。它是一种缓存淘汰算法，用于管理缓存中的数据项。它可以限制记录的条数、大小，优先清理掉不活跃的缓存。
3. `localStorage`：由于`Deno`实现了浏览器的大部分 API，所以可以将数据存储到`localStorage`中。
4. `KVStore`：[Deno KV](https://docs.deno.com/kv/manual)是原生支持的本地数据库，目前还不稳定，所以使用时需要开启`--unstable`。

除了这四种存储以外，`@nest/cache`还可以将数据缓存到`Redis`中，需要与`@nest/redis`结合使用：

```typescript
import { Module } from '@nest/core';
import { createStore, RedisModule } from '@nest/redis';
import { CacheModule } from '@nest/cache';
import { AppController } from './app.controller.ts';

@Module({
  imports: [
    RedisModule.forRoot({
      port: 6379,
      hostname: '192.168.21.176',
      db: 1,
      // password: "123456",
    }),
    CacheModule.register({
      ttl: 30,
      store: createStore,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

---
group: Techniques
order: 13
---

# Cache

Cache is a great and simple technology that can help improve the performance of applications. It serves as a temporary data storage to facilitate high-performance data access. `Nest` provides a universal `@nest/cache` package to assist you.

First, import it in the `importMap`:

```json
{
  "imports": {
    "@nest/cache": "jsr:@nest/cache@^0.0.2"
  }
}
```

:::warning

1. In actual development, please add a specific version number and keep it consistent with the `Nest` version.
2. `@nest/cache` only supports `GET` requests.
   :::

## Usage

Then use it in the module:

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

Here are the parameters for the `register` method:

| Parameter        | Type                                                                                                  | Description                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| store            | "memory" &#124; "LRU" &#124; "localStorage" &#124; "KVStore" &#124; CacheStoreMap &#124; CacheFactory | Cache storage manager. Defaults to memory.                                                     |
| ttl              | number                                                                                                | Time-to-live for the cache in seconds. Defaults to 5 seconds.                                  |
| isCacheableValue | (value: any) => boolean                                                                               | Function to determine if the value is cacheable.                                               |
| getCacheKey      | (params: { constructorName: string; methodName: string; methodType: string; args: any[]; }) => string | Function to determine the cache key. Defaults to MD5 of the parameter information as a string. |
| policy           | "public" &#124; "private" &#124; "no-cache"                                                           | Options for configuring the `cache-control` header of the cache response.                      |
| isDebug          | boolean                                                                                               | Enable debug mode for additional development information printing.                             |
| max              | number                                                                                                | Maximum number of responses stored in the cache. Defaults to 1000. Only valid for LRU storage. |
| maxSize          | number                                                                                                | Maximum size of the cache. Defaults to 1,000,000. Only valid for LRU storage.                  |
| kvStoreBaseKey   | string                                                                                                | Base key for KV storage. Only used when the store is set to KVStore.                           |

Now you can use it in the controller:

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

Like a regular interceptor, it can also be applied to a specific method:

```typescript
@Get("/delay")
@UseInterceptors(CacheInterceptor)
delay(@Query("id") id: string) {}
```

`Nest` also provides three decorators to modify values during global registration:

| Decorator                                                               | Modified Value                                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@CacheTTL(ttl: number)`                                                | `ttl`                                                                                                                                                     |
| `@CacheKey(key: string)`                                                | Specifies a specific string as the cache key for a method, higher priority than `getCacheKey`, but you need to ensure the uniqueness of the KEY yourself. |
| `@SetCacheStore(key: CacheStoreName)`                                   | `store`                                                                                                                                                   |
| `@SetCachePolicy(policy: "public" &#124; "private" &#124; "no-cache") ` | `policy`                                                                                                                                                  |

For example, you can use them as follows:

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

## Store

`@nest/cache` currently supports four types of stores:

1. `memory`: `@nest/cache` caches in memory by default.
2. `LRU`: LRU stands for "Least Recently Used." It is a cache eviction algorithm used to manage data items in the cache. It can limit the number and size of recorded entries, prioritizing the removal of inactive caches.
3. `localStorage`: Since `Deno` implements most of the browser's APIs, data can be stored in `localStorage`.
4. `KVStore`: [Deno KV](https://docs.deno.com/kv/manual) is a natively supported local database. It is currently unstable, so use it with `--unstable` enabled.

In addition to these four storage options, `@nest/cache` can also cache data to `Redis`, which needs to be combined with `@nest/redis`:

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

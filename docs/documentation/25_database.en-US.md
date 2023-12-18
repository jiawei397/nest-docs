---
group: Techniques
order: 5
---

# Database

## MongoDB

`Nest` comes with a built-in client for `MongoDB`, which is based on the [deno_mongo_schema](https://github.com/jiawei397/deno_mongo_schema) `Deno` package. This package itself is built on `npm:mongodb@5.3.0`.

```json
{
  "imports": {
    "@nest/mongo": "https://deno.land/x/deno_nest/modules/mongo/mod.ts",
    "deno_mongo_schema": "https://deno.land/x/deno_mongo_schema@v1.0.3/mod.ts"
  }
}
```

It includes common APIs that should meet your basic requirements:

![mongodb API](./images/database-mongo-api.jpeg)

When combined with `Nest`, its usage is straightforward.

Firstly, globally register the database in the `AppModule` using `MongoModule.forRoot`:

```typescript
import { Module } from "@nest";
import { MongoModule } from "@nest/mongo";
import { UserModule } from "./user/user.module.ts";

@Module({
  imports: [
    MongoModule.forRoot("mongodb://10.100.30.65:27018/test"),
    UserModule,
  ],
  controllers: [],
})
export class AppModule {}
```

Create a `user/user.schema.ts` file to define a `UserSchema`, representing the fields in a traditional table:

```typescript
import { BaseSchema, Prop, Schema } from "deno_mongo_schema";

@Schema()
export class User extends BaseSchema {
  @Prop({
    required: true,
  })
  email: string;

  @Prop({
    required: true,
    // index: true,
    // sparse: true,
    // unique: true,
  })
  username: string;
}

export type UserKey = keyof User;
export type UserKeys = UserKey[];
```

In the `UserService`, use the `InjectModel` decorator:

```typescript
import { Injectable } from "@nest";
import { InjectModel, Model } from "deno_mongo_schema";
import { User } from "./user.schema.ts";
import { AddUserDto } from "./user.dto.ts";

@Injectable()
export class UserService {
  constructor(@InjectModel(User) private readonly model: Model<User>) {
  }

  async save(createUserDto: AddUserDto): Promise<string> {
    const id = await this.model.insertOne(createUserDto);
    console.debug(`User created successfully for ${createUserDto.username}!`);
    return id.toString();
  }

  findById(id: string): Promise<User | null> {
    return this.model.findById(id);
  }

  findByIds(ids: string[]): Promise<User[]> {
    return this.model.findMany({
      id: {
        $in: ids,
      },
    });
  }

  findByName(name: string) {
    return this.model.findMany({
      username: name,
    }, {
      projection: {
        username: 1,
        email: 1,
      },
    });
  }

  findAll() {
    return this.model.findMany();
  }

  update(id: string, data: Partial<User>) {
    return this.model.findByIdAndUpdate(id, {
      $set: data,
    }, {
      new: true,
    });
  }

  deleteById(id: string) {
    return this.model.deleteById(id);
  }

  syncIndex() {
    return this.model.syncIndexes();
  }
}
```

Now, in the `Controller`, you can use `userService`:

```typescript
import { BadRequestException, Body, Controller, Get, Post, Query } from "@nest";
import { UserService } from "./user.service.ts";
import { AddUserDto, SearchUserDto, UpdateUserDto } from "./user.dto.ts";

@Controller("/user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("add")
  add(@Body() params: AddUserDto) {
    return this.userService.save(params);
  }
}
```

For more usage, I recommend checking the relevant chapters in the book [Learning Deno 3.2 Use MongoDB](https://www.yuque.com/jiqingyun-begup/ewktxz/rwadc6?view=doc_embed).

:::info
The complete example can be found [here](https://deno.land/x/deno_nest/modules/mongo/example?source).
:::

## MySQL

Similarly, `Nest` comes with a built-in toolkit for `MySQL`. First, import it into the `importMap`:

```json
{
  "imports": {
    "@nest/mysql": "https://deno.land/x/deno_nest/modules/mysql/mod.ts",
    "mysql": "https://deno.land/x/mysql@v2.11.0/mod.ts"
  }
}
```

Since `@nest/mysql` only calls a few core methods of the `mysql` client to connect to the database, the client's code can be upgraded directly as long as there are no modifications to the core method APIs.

In the `app.module.ts`, register the `MysqlModule`:

```typescript
import { Module } from "@nest";
import { MysqlModule } from "@nest/mysql";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    MysqlModule.forRoot({
      hostname: "localhost",
      username: "root",
      port: 3306,
      db: "test",
      poolSize: 3, // connection limit
      password: "123456",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

In the `AppController`, you can use it directly. Of course, this is just an example; it's more reasonable to use it in a `service`.

```typescript
import { Client, MYSQL_KEY } from "@nest/mysql";
import { Controller, Get, Inject, Query } from "@nest";

@Controller("")
export class AppController {
  constructor(@Inject(MYSQL_KEY) private readonly client: Client) {}

  @Get("/createUserTable")
  async createUserTable() {
    // await this.client.execute(`CREATE DATABASE IF NOT EXISTS wiki`);
    // await this.client.execute(`USE wiki`);
    await this.client.execute(`DROP TABLE IF EXISTS users`);
    await this.client.execute(`
      CREATE TABLE users (
          id int(11) NOT NULL AUTO_INCREMENT,
          name varchar(100) NOT NULL,
          created_at timestamp not null default current_timestamp,
          PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    `);
    return "created";
  }

  @Get("/createUser")
  async createUser(@Query("username") username: string) {
    const result = await this.client.execute(
      `INSERT INTO users(name) values(?)`,
      [
        username,
      ],
    );
    console.log(result);
    return result;
  }

  @Get("/updateUser")
  async updateUser(@Query("id") id: number) {
    console.info("Updating user " + id);
    const result = await this.client.execute(
      `update users set ?? = ? where id = ?`,
      [
        "name",
        "MYR",
        id,
      ],
    );
    console.log(result);
    return result;
  }
}
```

:::info
The complete example can be found [here](https://deno.land/x/deno_nest/modules/mysql/example?source).
:::

## Postgres

Similarly, `Nest` comes with a built-in toolkit for `Postgres`. First, import it into the `importMap`:

```json
{
  "imports": {
    "@nest/postgres": "https://deno.land/x/deno_nest/modules/postgres/mod.ts",
    "postgres/": "https://deno.land/x/postgres@v0.17.0/"
  }
}
```

Since `@nest/postgres` only calls a few core methods of the `postgres` client to connect to the database, the client's code can be upgraded directly as long as there are no modifications to the core method APIs.

In the `app.module.ts`, register the `PostgresModule`:
```typescript
import { Module } from "@nest";
import { PostgresModule } from "@nest/postgres";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    PostgresModule.forRoot({
      hostname: "localhost",
      username: "your_username",
      port: 5432,
      db: "your_database",
      poolSize: 5, // connection limit
      password: "your_password",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Adjust the configuration parameters (`hostname`, `username`, `port`, `db`, `poolSize`, `password`) according to your Postgres database setup. In the `AppController`, you can then use it directly. As with the other examples, it's typically more reasonable to utilize it within a service.

```typescript
import { Module } from "@nest";
import { PostgresModule } from "@nest/postgres";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    PostgresModule.forRoot({
      hostname: "localhost",
      port: "5432",
      user: "root",
      database: "database", // You must ensure that the database exists, and the program will not automatically create it
      password: "yourpassword", // One thing that must be taken into consideration is that passwords contained inside the URL must be properly encoded in order to be passed down to the database. You can achieve that by using the JavaScript API encodeURIComponent and passing your password as an argument.
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

In `AppController`, you can use it directly. However, this is just an example, and it is more reasonable to place it in a `service`.

```typescript
import { Controller, Get, Inject, Query } from "@nest";
import { Client, POSTGRES_KEY } from "@nest/postgres";

@Controller("")
export class AppController {
  constructor(@Inject(POSTGRES_KEY) private readonly client: Client) {}

  @Get("/createCompanyTable")
  async createCompanyTable() {
    await this.client.queryArray(`DROP TABLE IF EXISTS COMPANY`);
    const result = await this.client.queryObject(`
      CREATE TABLE COMPANY(
        ID INT PRIMARY KEY     NOT NULL,
        NAME           TEXT    NOT NULL,
        AGE            INT     NOT NULL,
        ADDRESS        CHAR(50),
        SALARY         REAL
    );
    `);
    return result;
  }

  @Get("/createCompany")
  async createCompany(
    @Query("username") username: string,
    @Query("id") id: number,
  ) {
    const result = await this.client.queryObject(
      `INSERT INTO COMPANY (ID,NAME,AGE,ADDRESS,SALARY) VALUES (${id}, '${username}', 32, 'California', 20000.00)`,
    );
    console.log(result);
    return result;
  }

  @Get("/updateCompany")
  async updateCompany(@Query("id") id: number) {
    console.info("Updating company " + id);
    const result = await this.client.queryArray(
      `UPDATE COMPANY SET SALARY = 15000 WHERE ID = ${id}`,
    );
    console.log(result);
    return result.rowCount;
  }
}
```

:::info
The complete example can be found [here](https://deno.land/x/deno_nest/modules/postgres/example?source).
:::

## Redis

Similarly, `Nest` comes with a built-in toolkit for `Redis`. First, import it into the `importMap`:

```json
{
  "imports": {
    "@nest/redis": "https://deno.land/x/deno_nest/modules/redis/mod.ts",
    "redis": "https://deno.land/x/redis@v0.29.3/mod.ts"
  }
}
```

Since `@nest/redis` only calls a few core methods of the `redis` client to connect to the database, the client's code can be upgraded directly as long as there are no modifications to the core method APIs.

In the `app.module.ts`, register the `RedisModule`:
```typescript
import { Module } from "@nest";
import { RedisModule } from "@nest/redis";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    RedisModule.forRoot({
      hostname: "localhost",
      port: 6379,
      password: "your_password",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Adjust the configuration parameters (`hostname`, `port`, `password`) according to your Redis server setup. In the `AppController`, you can then use it directly. As with the other examples, it's typically more reasonable to utilize it within a service.

```typescript
import { Module } from "@nest";
import { createStore, RedisModule } from "@nest/redis";
import { CacheModule } from "@nest/cache";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    RedisModule.forRoot({
      port: 6379,
      hostname: "192.168.21.176",
      password: "123456",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

In `AppController`, you can use it directly. However, this is just an example, and it is more reasonable to place it in a `service`.

```typescript
import { Controller, Get, Inject, UseInterceptors } from "@nest";
import { CacheInterceptor, SetCacheStore } from "@nest/cache";
import { type Redis, REDIS_KEY, RedisService } from "@nest/redis";

@Controller("")
export class AppController {
  constructor(private readonly redisService: RedisService) {}
  @Get("/")
  version() {
    this.redisService.set("version", "1.0.0");
    return this.redisService.get("version");
  }
}
```

:::info
The complete example can be found [here](https://deno.land/x/deno_nest/modules/redis/example?source).
:::

## ElasticSearch

Similarly, `Nest` comes with a built-in toolkit for `ElasticSearch`. First, import it into the `importMap`:

```json
{
  "imports": {
    "@nest/elasticsearch": "https://deno.land/x/deno_nest/modules/elasticsearch/mod.ts"
  }
}
```

In the `app.module.ts`, register the `ElasticsearchModule`:
```typescript
import { Module } from "@nest";
import { ElasticsearchModule } from "@nest/elasticsearch";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    ElasticsearchModule.forRoot({
      node: "http://localhost:9200",
      auth: {
        username: "your_username",
        password: "your_password",
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Adjust the configuration parameters (`node`, `auth`) according to your ElasticSearch server setup. In the `AppController`, you can then use it directly. As with the other examples, it's typically more reasonable to utilize it within a service.

```typescript
import { Module } from "@nest";
import { ElasticsearchModule } from "@nest/elasticsearch";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    ElasticsearchModule.forRoot({
      db: "http://elastic:369258@192.168.21.176:9200",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

In `AppController`, you can use it directly. However, this is just an example, and it is more reasonable to place it in a `service`.

```typescript
import { assert, Controller, Get } from "@nest";
import { ElasticsearchService } from "@nest/elasticsearch";

@Controller("")
export class AppController {
  constructor(private readonly elasticSearchService: ElasticsearchService) {}
  @Get("/")
  getById() {
    return this.elasticSearchService.get({
      index: "blog",
      id: "60f69db67cd836379015f256",
    });
  }
}
```

:::info
The complete example can be found [here](https://deno.land/x/deno_nest/modules/elasticsearch/example?source).
:::

## Other databases

As shown in the example above, `Nest` can support any database by using its dynamic module feature. Taking the `Redis` module as an example, the module is named `RedisModule`:

```typescript
@Module({})
export class RedisModule {
  static client: Redis;

  static forRoot(db: RedisConnectOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_KEY,
          useFactory: async () => {
            // ...
          },
        },
      ],
      exports: [REDIS_KEY],
      global: true,
    };
  }

  static getClient() {
    return this.client;
  }
}
```

It uses `useFactory` to provide a client connection. Since `REDIS_KEY` needs to be exported to the outside world and to avoid conflicts with other modules, `Nest` requires it to be a `symbol`:

```typescript
export const REDIS_KEY = Symbol("redis");
```

After this module is imported, `REDIS_KEY` can be used to inject the client in `Controller` or `Service`:

```typescript
@Controller("")
export class AppController {
  constructor(@Inject(REDIS_KEY) public readonly client: Redis) {
  }
  
  @Get("/")
  async version() {
    await this.client.set("version", "1.0.0");
    return this.client.get("version");
  }
}
```

If you don't want to export the raw client, your module can further encapsulate a `Service`:

```typescript
@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_KEY) public readonly client: Redis) {
  }

  set(key: string, value: any, seconds?: number) {
    value = stringify(value);
    return this.client.set(key, value, seconds ? { ex: seconds } : undefined);
  }

  async get(key: string) {
    const data = await this.client.get(key);
    return jsonParse(data);
  }
}
```

Then add `RedisService` to `providers` and `exports`:

```typescript
@Module({})
export class RedisModule {
  static client: Redis;

  static forRoot(db: RedisConnectOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_KEY,
          useFactory: async () => {
            // ...
          },
        },
        RedisService
      ],
      exports: [RedisService],
      global: true,
    };
  }
}
```

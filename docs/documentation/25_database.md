---
group:
  title: 技巧
  order: 3
order: 5
---

# 数据库

## MongoDB

`Nest`内置了`MongoDB`的客户端，它的基于[deno_mongo_schema](https://github.com/jiawei397/deno_mongo_schema)这个`Deno`包，而这个包又是基于`npm:mongodb@5.3.0`的。

```json
{
  "imports": {
    "@nest/mongo": "https://deno.land/x/deno_nest@v3.7.0/modules/mongo/mod.ts",
    "deno_mongo_schema": "https://deno.land/x/deno_mongo_schema@v1.0.3/mod.ts"
  }
}
```

它内置了常见的API，基本能满足你的需求：

![mongodb API](./images/database-mongo-api.jpeg)

结合了`Nest`后，它的使用非常简单。

首先，在`AppModule`中使用`MongoModule.forRoot`全局注册数据库：

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

新建`user/user.schema.ts`文件，定义一个`UserSchema`，也就是传统表格中的字段：

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

在`UserService`中需要与装饰器`InjectModel`一起使用：

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
    console.debug(`创建用户【${createUserDto.username}】成功！`);
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

然后在`Controller`中就可以愉快地使用`userService`了：

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

更多用法建议参看《一起学Deno》中的相关章节：
[3.2 使用MongoDB重构](https://www.yuque.com/jiqingyun-begup/ewktxz/rwadc6?view=doc_embed)

完整样例在[这里](https://deno.land/x/deno_nest@v3.7.0/modules/mongo/example?source)。

## MySQL

`Nest`同样内置了`MySQL`的工具包，先引入到`importMap`：

```json
{
  "imports": {
    "@nest/mysql": "https://deno.land/x/deno_nest@v3.7.0/modules/mysql/mod.ts",
    "mysql": "https://deno.land/x/mysql@v2.11.0/mod.ts"
  }
}
```

由于`@nest/mysql`中只调用了`mysql`客户端的几个核心方法连接数据库，所以在核心方法API不作修改的情况下，客户端的代码是可以直接升级的。

我们在`app.module.ts`中注册`MysqlModule`：

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

在`AppController`中就可以直接使用，当然，这只是个示例，更合理在放在`service`里。

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

## Postgres

`Nest`同样内置了`Postgres`的工具包，先引入到`importMap`：

```json
{
  "imports": {
    "@nest/postgres": "https://deno.land/x/deno_nest@v3.7.0/modules/postgres/mod.ts",
    "postgres/": "https://deno.land/x/postgres@v0.17.0/"
  }
}
```

由于`@nest/postgres`中只调用了`postgres`客户端的几个核心方法连接数据库，所以在核心方法API不作修改的情况下，客户端的代码是可以直接升级的。

我们在`app.module.ts`中注册`PostgresModule`：

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

在`AppController`中就可以直接使用，当然，这只是个示例，更合理在放在`service`里。

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

## Redis

`Nest`同样内置了`Redis`的工具包，先引入到`importMap`：

```json
{
  "imports": {
    "@nest/redis": "https://deno.land/x/deno_nest@v3.7.0/modules/redis/mod.ts",
    "redis": "https://deno.land/x/redis@v0.29.3/mod.ts"
  }
}
```

由于`@nest/redis`中只调用了`redis`客户端的几个核心方法连接数据库，所以在核心方法API不作修改的情况下，客户端的代码是可以直接升级的。

我们在`app.module.ts`中注册`RedisModule`：

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

在`AppController`中就可以直接使用，当然，这只是个示例，更合理在放在`service`里。

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

## ElasticSearch

`Nest`同样内置了`ElasticSearch`的工具包，先引入到`importMap`：

```json
{
  "imports": {
    "@nest/elasticsearch": "https://deno.land/x/deno_nest@v3.7.0/modules/elasticsearch/mod.ts"
  }
}
```

我们在`app.module.ts`中注册`ElasticsearchModule`：

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

在`AppController`中就可以直接使用，当然，这只是个示例，更合理在放在`service`里。

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

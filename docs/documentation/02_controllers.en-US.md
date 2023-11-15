---
group:
  title: Overview
order: 2
---

# Controllers

Controllers are responsible for handling incoming requests and returning responses to the client.

![image.png](./images/controller.png)

The purpose of a controller is to receive specific requests from the application. The routing mechanism determines which controller handles which request. Typically, each controller has multiple routes, and different routes can perform different actions.

To create a basic controller, we use classes and decorators. Decorators associate a class with the required metadata, allowing Nest to create a route mapping (associating requests with the corresponding controller).

## Routes

In the following example, we will use the `@Controller()` decorator, which is necessary for defining a basic controller.

We will specify an optional route path prefix, `cats`. Using a path prefix in the `@Controller()` decorator makes it easy to group a set of related routes and minimizes repetitive code.

For instance, we might choose to group a set of routes that handle interactions with the entity of cats under the route `/cats`. In this case, we can specify the path prefix `cats` in the `@Controller()` decorator, so we don't have to repeat that portion of the path for each route in the file.

```typescript
import { Controller, Get } from '@nest';

@Controller('cats')
export class CatsController {
  @Get("/")
  findAll(): string {
    return 'This action returns all cats';
  }
}
```

:::info
To create a controller using the CLI, simply execute `nests g` and then choose `Controller`.
:::

The `@Get()` HTTP request method decorator precedes the `findAll()` method, informing Nest to create a handler for a specific HTTP request endpoint. The endpoint corresponds to the HTTP request method (in this case, GET) and the route path.

What is a route path? The route path for the handler is determined by concatenating the (optional) controller path prefix declaration and any path specified in the method decorator.

Since we declared a prefix (`cats`) for each route and didn't add any path information in the decorator, Nest maps the `GET /cats` request to this handler.

As mentioned earlier, the path includes the optional controller path prefix and any path string declared in the request method decorator. For example, with the prefix `cats` and the decorator `@Get('breed')`, a route mapping is generated for the `GET /cats/breed` request.

In the example above, when a GET request is made to this endpoint, Nest routes it to our custom `findAll()` method. Note that the method name chosen here is entirely arbitrary. We must declare a method to be bound to, but Nest does not attach any specific meaning to the chosen method name.

This method returns a 200 status code and an associated response, which is just a string in this case. Why is that? To explain this, we first introduce the concept that Nest uses two different options to manipulate responses:

| Type | Description |
| --- | --- |
| Standard (Recommended) | When the request handler returns a JavaScript object, array, number, or boolean, Nest automatically serializes it to JSON. However, when it returns a string, Nest sends only that value without attempting to serialize it, and sets the `Content-Type` header of the response to `text/html`. Additionally, by default, the status code of the response is always 200 unless the `etag` middleware is explicitly enabled to enable cache negotiation. We can easily change this behavior at the handler level by adding the `@HttpCode` decorator. |
| Decorator (`@Res`) | Injected in the method handler signature using the `@Res()` decorator (e.g., `findAll(@Res() response)`). With this approach, you can use methods exposed by the object, such as `response.status = 201` and `response.body = "Hello world"`, to modify the response's status code and content. The content of the body follows the same rules as the standard approach mentioned above. |

## Request Object

Handlers often need access to detailed information about the client's request. Nest provides access to the request object, which is a higher-level abstraction distinct from Hono and Oak, and currently exposes commonly used methods. We can indicate to Nest to inject the request object by adding the `@Req()` decorator to the handler's signature, allowing access to the request object.

```typescript
import { Controller, Get, Req, type Request } from '@nest';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request): string {
    return 'This action returns all cats';
  }
}
```

:::warning
The `Request` type needs to be exported from the `@nestjs/core` library, and the `type` keyword should be added to its definition.
:::

The `Request` object represents an HTTP request and has properties for the request query string, parameters, HTTP headers, and body. In most cases, it is not necessary to manually retrieve these properties. We can use dedicated decorators such as `@Body()` or `@Query()`, which are readily available. The following lists the provided decorators and the common platform-specific objects they represent.

| Decorator | Description |
| --- | --- |
| `@Req()` | Request |
| `@Res()` | Response |
| `@Body(key?: string)` | Body of the request object, Nest has built-in parameter validation using `deno_class_validator`. If a key is passed, it represents a specific value; otherwise, the response is an Object. |
| `@Params(key?: string)` | Parameters in the URL path, such as `id` in `/user/:id`. |
| `@Query(key?: string)` | Parameters in the URL after the path, i.e., URLSearchParams, such as `id` in `?id=123`. |
| `@Cookies()` | The `Nest Cookies` Object of the request object. |
| `@Cookie(name: string)` | Get One `cookie` of the request object. |
| `@Headers(name?: string)` | Headers in the request object. If no name is passed, it represents the entire Headers. |
| `@Ip()` | The `x-real-ip` or `x-forwarded-for` header in the request object. |
| `@Host()` | The `host` header in the request object. |
| `@MethodName()` | The method name of the current request, which is `findAll` in the above example. |
| `@ControllerName()` | The name of the current request's controller, which is `CatsController` in the above example. |
| `@Form()` | When the parameter is a form or FormData, parameter validation can be performed similar to `Body`, returning an Object. |

## Status code

As mentioned earlier, the response status code is always 200 by default. We can easily change this behavior at the handler level by adding the `@HttpCode` decorator.

```typescript
import { HttpCode } from "@nest";

@Post("")
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

Another way is to use the `@Res` decorator:

```typescript
import { Res, type Response } from "@nest";

@Post("")
create(@Res() res: Response) {
  res.status = 204;
  return 'This action adds a new cat';
}
```

:::warning
The `Response` type needs to be exported from the `@nestjs/core` library, and the `type` keyword should be added to its definition.
:::

## Headers

To specify custom response headers, you can use the `@Header` decorator:

```typescript
import { Header } from "@nest";

@Post("")
@Header('Cache-Control', 'none')
create() {
  return 'This action adds a new cat';
}
```

Or directly use the `@Res` decorator to modify headers:

```typescript
import { Res, type Response } from "@nest";

@Post("")
create(@Res() res: Response) {
  res.headers.set("Cache-Control', 'none');
  return 'This action adds a new cat';
}
```

## Redirect

To redirect the response to a specific URL, you can use the `@Redirect()` decorator. `@Redirect()` accepts two parameters, `url` and `statusCode`, the latter being optional and defaulting to 302.

```typescript
import { Redirect } from "@nest";

@Get("")
@Redirect('https://nestjs.com', 301)
```

To redirect the response to a specific URL, you can use the `@Redirect()` decorator. `@Redirect()` accepts two parameters, `url` and `statusCode`, the latter being optional and defaulting to 302.

```typescript
import { Res, type Response } from "@nest";

@Post("")
create(@Res() res: Response) {
  res.headers.set("Location', 'https://nestjs.com');
  res.status = 301;
  return 'This action adds a new cat';
}
```

## Route Parameters

When you need to accept **dynamic data** as part of the request, routes with static paths won't suffice (e.g., `GET/cat/1` to get the `cat` with `id` 1). To define routes with parameters, we can add route parameter tokens in the path of the route to capture dynamic values at that position in the request URL.

The route parameter tokens in the example with the `@Get()` decorator demonstrate this usage. Route parameters declared in this way can be accessed using the `@Param()` decorator, which should be added to the method signature.

```typescript
import { Params } from "@nest";

@Get(":id")
findOne(@Params() params: any): string {
  console.log(params.id);
  return `This action returns a #${params.id} cat`;
}
```

You can also directly pass the key `id` as a parameter:

```typescript
@Get(":id")
findOne(@Params('id') id: string): string {
  return `This action returns a #${id} cat`;
}
```

## Asynchronous

Every method can be asynchronous:

```typescript
@Get('')
async findAll(): Promise<any[]> {
  return [];
}
```

:::warning
Unlike `NestJS`, `deno_nest` does not plan to support the `Observable` capabilities of `RxJS`.
:::

## Request Parameters

### Parameters for POST

Our previous `POST` route handler example doesn't accept any client parameters. Let's fix that by adding the `@Body()` decorator here.
A DTO (Data Transfer Object) is an object that defines how data is sent over the network. We can define the DTO schema by using TypeScript interfaces or simple classes.

Let's create the interface for `CreateCatDto`:

```typescript
export interface CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

It has only three basic properties, and later, we can use the newly created DTO in the `CatsController`:

```typescript
@Post('')
async create(@Body() createCatDto: CreateCatDto) {
  return 'This action adds a new cat';
}
```

However, generally speaking, we should not trust any parameters coming from the client and usually need additional validation. Fortunately, Nest has built-in support for validation. You only need to modify the DTO's `interface` to a `class` and use [class_validator](https://deno.land/x/deno_class_validator@v1.0.0/mod.ts):

```typescript
import { IsNumber, IsString, Max, MaxLength, Min } from "class_validator";

export class CreateCatDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Max(100)
  @Min(1)
  age: number;

  @IsString()
  breed: string;
}
```

If the parameter validation fails, it defaults to responding with an exception with a status code of 400 and a JSON response body:

```json
{
  "statusCode": 400,
  "message": "pageNum must not be less than 1, pageNum must not be greater than 2, pageCount must not be less than 1, pageCount must not be greater than 5",
  "error": "params not valid"
}
```

The type of this exception is `HttpException` and can be caught by an `ExceptionFilter`, which will be discussed in the next section.

:::warning
Interestingly, `class_validator` only works with `class`. Why?

`class` is part of the JavaScript ES6 standard, so they persist as actual entities in the compiled JavaScript. On the other hand, TypeScript interfaces are removed during the transformation process, and `Nest` cannot reference them at runtime. Understanding this is crucial.
:::

### Parameters for GET

Unlike POST parameters, the parameters for GET requests are all in the URL, and their types are all strings. If you want to convert bool, number, or even arrays into the respective formats, an additional decorator `@Property()` can help:

```typescript
import { Property } from "@nest";

export class Dto {
  @Property()
  pageNum: number;

  @Property()
  sex: boolean;

  @Property("number")
  ages: number[];
}
```

It will transform `?pageNum=1&&sex=true&ages=1,2` into:

```json
{
  "pageNum": 1,
  "sex": true,
  "ages": [1, 2]
}
```

You can still use `class_validator` to validate parameters.

## Complete Resource Example

The following example uses several available decorators to create a basic controller. This controller exposes methods for accessing and manipulating internal data.

```typescript
import { Controller, Get, Query, Post, Body, Put, Param, Delete } from '@nest';
import { CreateCatDto, UpdateCatDto, ListAllEntities } from './dto.ts';

@Controller('cats')
export class CatsController {
  @Post("")
  create(@Body() createCatDto: CreateCatDto) {
    return 'This action adds a new cat';
  }

  @Get("")
  findAll(@Query() query: ListAllEntities) {
    return `This action returns all cats (limit: ${query.limit} items)`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return `This action updates a #${id} cat`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes a #${id} cat`;
  }
}
```

## Start the Application

After fully defining the controller above, Nest is still unaware of the existence of `CatsController`, so it won't create an instance of this class.

Controllers always belong to a module, which is why we include an array of controllers in the `@Module()` decorator. Since we haven't defined any other module except the root `AppModule`, we'll use it to import `CatsController`:

```typescript
import { Module } from '@nest';
import { CatsController } from './cats/cats.controller.ts';

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

We use the `@Module()` decorator to attach metadata to the module class, allowing Nest to easily reflect on which controllers need to be mounted.

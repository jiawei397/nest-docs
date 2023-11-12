---
group:
  title: 概述
order: 6
---

# Exception filters

Nest 提供了一个内置的异常层，该层负责处理应用程序中所有未处理的异常。当应用程序代码没有处理异常时，异常被该层捕获，然后该层自动发送适当的用户友好响应。

![image.png](./images/exception-filter.png)

默认情况下，此操作由内置的全局异常过滤器执行，该过滤器处理类型为 `HttpException`（及其子类）的异常。当异常未被识别（既不是 HttpException 也不是继承自 HttpException 的类）时，内置的异常过滤器生成以下默认 JSON 响应：

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## 抛出异常

`Nest`提供了一个内置的`HttpException`类，从`@nest`包中公开。对于典型的基于`HTTP REST API`的应用程序，在某些错误条件发生时发送标准HTTP响应对象是最佳实践。

例如，在`CatsController`中，我们有一个`findAll()`方法（一个`GET`路由处理程序）。假设这个路由处理程序由于某些原因抛出异常。为了演示这一点，我们将硬编码如下：

```typescript
import { ForbiddenException } from "@nest";

@Get("/")
findAll() {
  throw new ForbiddenException("Forbidden");
}
```

当客户端调用此接口时，响应如下：

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

这里的`ForbiddenException`继承自`HttpException`。

构造函数`HttpException`采用两个必需参数来确定响应：

- 该`response`参数定义 JSON 响应正文。它可以是string 或 object。
- 该`status`参数定义[HTTP 状态代码](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)。

默认情况下，JSON 响应正文包含两个属性：

- `statusCode`：默认为参数中提供的 HTTP 状态代码
- `message`：基于 HTTP 错误的简短描述

要仅覆盖 JSON 响应正文的消息部分，请在response参数中提供一个字符串。要覆盖整个 JSON 响应正文，请在response参数中传递一个对象。Nest 将序列化该对象并将其作为 JSON 响应正文返回。

第二个构造函数参数（`status`）应该是有效的 HTTP 状态代码。最佳实践是直接使用`@nest`导出的标准异常类，比如上面的`ForbiddenException`。

还有第三个构造函数参数（可选，`cause`）可用于提供错误[原因](https://nodejs.org/en/blog/release/v16.9.0/#error-cause)。该cause对象不会序列化到响应对象中，但它可用于日志记录目的，提供有关导致抛出的内部错误的有价值的信息HttpException。

下面是一个覆盖整个响应正文并提供错误原因的示例：

```typescript
@Get('')
async findAll() {
  try {
    await this.service.findAll()
  } catch (error) { 
    throw new HttpException({
      status: HttpStatus.FORBIDDEN,
      error: 'This is a custom message',
    }, HttpStatus.FORBIDDEN, {
      cause: error
    });
  }
}
```

得到的响应如下：

```json
{
  "status": 403,
  "error": "This is a custom message"
}
```

## 内置的HTTP异常类

Nest提供了一组从基本`HttpException`继承的标准异常。它们来自于`@nest`包，并且代表了许多常见的HTTP异常。

- BadRequestException
- BodyParamValidationException（与BadRequestException一样，状态码同为400）
- UnauthorizedException
- NotFoundException
- ForbiddenException
- NotAcceptableException
- RequestTimeoutException
- ConflictException
- GoneException
- HttpVersionNotSupportedException
- PayloadTooLargeException
- UnsupportedMediaTypeException
- UnprocessableEntityException
- InternalServerErrorException
- NotImplementedException
- ImATeapotException
- MethodNotAllowedException
- BadGatewayException
- ServiceUnavailableException
- GatewayTimeoutException
- PreconditionFailedException

所有内置的异常也可以使用选项参数提供错误原因和错误描述：

```typescript
throw new BadRequestException(
  "Something bad happened",
  "Some error description",
  new Error("this is error"),
);
```

使用上面的内容，这就是响应的样子：

```json
{
  "statusCode": 400,
  "message": "Something bad happened",
  "error": "Some error description"
}
```

## 异常过滤器

虽然基本的（内置的）异常过滤器（`Exception filters`）可以自动处理许多情况，但你可能希望完全控制异常层。例如，你可能希望添加日志记录或根据某些动态因素使用不同的JSON模式。异常过滤器正是为此目的而设计的。它们允许你控制精确的控制流和发送回客户端的响应内容。

让我们创建一个异常过滤器，负责捕获属于`HttpException`类的异常，并为它们实现自定义的响应逻辑。

```typescript
import { Catch, Context, ExceptionFilter, HttpException } from "@nest";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, context: Context) {
    context.response.status = exception.status;
    context.response.body = {
      statusCode: exception.status,
      timestamp: new Date().toISOString(),
      path: context.request.url,
      type: "HttpExceptionFilter",
      message: exception.message,
    };
  }
}
```

所有异常过滤器都应该实现通用的`ExceptionFilter<T>`接口。这要求您提供具有指示签名的`catch(exception: T, context: Context)`方法。`T`表示异常的类型。

`@Catch(HttpException)`装饰器将所需的元数据绑定到异常过滤器，告诉`Nest`，该特定过滤器只处理类型为`HttpException`的异常，而不处理其他异常。`@Catch()`装饰器可以接受一个参数或逗号分隔的列表。这使你可以同时为多种类型的异常设置过滤器。

## 绑定过滤器

让我们将我们的新`HttpExceptionFilter`绑定到`CatsController`的`create()`方法上。

```typescript
import { UseFilters } from "@nest";

@Post('')
@UseFilters(new HttpExceptionFilter())
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
```

我们在这里使用了`@UseFilters()`装饰器。与`@Catch()`装饰器类似，它可以接受单个过滤器实例或逗号分隔的过滤器实例列表。在这里，我们创建了`HttpExceptionFilter`的实例。

或者，你可以传递类（而不是实例），将实例化的责任交给框架，并启用依赖注入。

```typescript
@Post('')
@UseFilters(HttpExceptionFilter)
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
```

:::info
尽可能使用类来应用过滤器，而不是实例。这样可以减少内存使用，因为Nest可以在整个模块中轻松重用相同类的实例。
:::

在上面的示例中，`HttpExceptionFilter`仅应用于单个`create()`路由处理程序，使其作用于方法范围。异常过滤器可以在不同级别上进行作用域设置：controller的方法范围、controller的全局范围或全局范围。

例如，要将过滤器设置为controller范围，你可以执行以下操作：

```typescript
@UseFilters(new HttpExceptionFilter())
export class CatsController {}
```

而创建全局范围，是这样：

```typescript
const app = await NestFactory.create(AppModule, Router);
app.useGlobalFilters(HttpExceptionFilter);
app.listen({ port: 8000 });
```

全局作用域的过滤器将在整个应用程序中使用，适用于每个控制器和每个路由处理程序。在依赖注入方面，从任何模块外部注册的全局过滤器（如上面的示例中的`useGlobalFilters()`）无法注入依赖项，因为这是在任何模块的上下文之外完成的。

为了解决这个问题，你可以使用以下结构直接从任何模块注册全局作用域过滤器：

```typescript
import { Module, APP_FILTER } from '@nest';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

:::warning
使用这种方法来为过滤器进行依赖注入时，请注意，无论在哪个模块中使用此构造，过滤器实际上都是全局的。应该在哪里进行这样的操作？选择定义过滤器（例如上面的HttpExceptionFilter）的模块。

另外，useClass并不是处理自定义提供者注册的唯一方式。在《[自定义Provider](./11_custom_provider)》了解更多信息。
:::

你可以使用这种技术添加任意数量的过滤器；只需将每个过滤器添加到`providers`数组中即可。

## 捕获所有异常

为了捕获每一个未处理的异常（无论异常类型如何），请将`@Catch()`装饰器的参数列表留空，例如`@Catch()`。

```typescript
import { Catch, Context, ExceptionFilter, HttpException } from "@nest";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, context: Context) {
    context.response.body = {
      statusCode: (exception as HttpException).status || 500,
      timestamp: new Date().toISOString(),
      path: context.request.url,
      type: "AllExceptionsFilter",
      error: (exception as Error).message,
    };
  }
}
```

:::info
当将一个捕获所有异常的过滤器与一个绑定到特定类型的过滤器组合时，应该先声明“捕获所有”过滤器，以便让特定过滤器正确处理绑定的类型。
:::

---
group: 技巧
order: 9
---

# Cookie

`HTTP cookie`是用户浏览器存储的一小段数据。`Cookie`旨在成为网站记住状态信息的可靠机制。当用户再次访问该网站时，`cookie` 会自动随请求一起发送。

`Nest`中默认集成了`Cookie`，无需引入第三方包，开箱即用。

以下样例中，`req.cookies`、`res.cookies`和`@Cookies()`是同一个对象，类型为`ICookies`。这与中间件中的`cookies`也是一致的。

```typescript
import {
  Controller,
  Cookies,
  Get,
  type ICookies,
  Req,
  type Request,
  Res,
  type Response,
} from '@nest/core';

@Controller('')
export class AppController {
  @Get('/req')
  req(@Req() req: Request) {
    return req.cookies.getAll();
  }

  @Get('/')
  getAllCookies(@Cookies() cookies: ICookies) {
    return cookies.getAll();
  }

  @Get('/res')
  res(@Res() res: Response) {
    res.cookies.set('DENO_COOKIE_TEST', 'abc', { path: '/' });
    return 'ok';
  }
}
```

同理，守卫与拦截器中的`ctx.cookies`也是同一个对象。

```typescript
import {
  type CanActivate,
  type Context,
  Injectable,
  type NestInterceptor,
  Next,
} from '@nest/core';

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  async intercept(ctx: Context, next: Next) {
    console.log('DENO_COOKIE_TEST', await ctx.cookies.get('DENO_COOKIE_TEST'));
    await next();
    await ctx.cookies.set('DENO_COOKIE_TEST', 'abc', { path: '/' });
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: Context): Promise<boolean> {
    console.log(await ctx.cookies.getAll());
    return true;
  }
}
```

## Cookie 类型转换

```typescript
import { Controller, Cookie, Get } from '@nest/core';

@Controller('')
export class AppController {
  @Get('/id')
  getId(@Cookie('DENO_COOKIE_USER_ID') id: string) {
    return {
      DENO_COOKIE_USER_ID: id,
    };
  }

  @Get('/id2')
  getId(@Cookie('DENO_COOKIE_USER_ID') id: number) {
    return {
      DENO_COOKIE_USER_ID: id,
    };
  }

  @Get('/id3')
  getId(@Cookie('DENO_COOKIE_USER_ID') id: bool) {
    return {
      DENO_COOKIE_USER_ID: id,
    };
  }
}
```

当使用`@Cookie`装饰器时，`Nest`会根据后面的类型自动转换`id`的类型。

## Sign 签名

由于底层实现不同，`oak`和`hono`在`Cookies`的使用在使用`sign`签名时，会有一些显著的差异。
比如，此时设置 Cookie 时，`oak`会生成两个`cookie`，而`hono`只有一个，但值被加密过了。这个对上层使用时并不重要，所以读者简单了解即可。

### oak

`oak`必须在`create`时就传递`keys`：

```typescript
const app = await NestFactory.create(AppModule, Router, {
  keys: ['nest'],
});
```

然后使用：

```typescript
await cookies.set('DENO_COOKIE_USER_ID', '123', {
  path: '/',
  signed: true,
  // signedSecret: "abcd",
});
```

注意，这时即使设置了`signedSecret`，也会被忽略，因为这个参数只有`hono`才支持。

### hono

`hono`可以在`create`时传递`keys`，当作一个全局的配置：

```typescript
const app = await NestFactory.create(AppModule, Router, {
  keys: ['nest'],
});
```

在具体使用时可以用`signedSecret`覆盖这个配置：

```typescript
await cookies.set('DENO_COOKIE_USER_ID', '123', {
  path: '/',
  signed: true,
  signedSecret: 'abcd',
});
```

如果二者都没有设置，设置时报错。

## 样例

关于 Cookie 的样例，参见[deno_nest/example/cookie](https://deno.land/x/deno_nest/example/cookie?source)。

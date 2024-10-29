---
group: Techniques
order: 9
---

# Cookie

An `HTTP cookie` is a small piece of data stored by the user's browser. Cookies are designed to be a reliable mechanism for websites to remember state information. When a user visits the website again, the cookie is automatically sent along with the request.

`Nest` has built-in support for cookies, so there is no need to import third-party packages. It is ready to use out of the box.

In the example below, `req.cookies`, `res.cookies`, and `@Cookies()` are all referring to the same object of type `ICookies`. This is consistent with the `cookies` in middleware as well.

```typescript
import {
  Controller,
  Cookies,
  Get,
  ICookies,
  Req,
  Request,
  Res,
  Response,
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

Similarly, the `ctx.cookies` in guards and interceptors also refers to the same object.

```typescript
import {
  CanActivate,
  Context,
  Injectable,
  NestInterceptor,
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

## Cookie Type Conversion

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
  getId(@Cookie('DENO_COOKIE_USER_ID') id: boolean) {
    return {
      DENO_COOKIE_USER_ID: id,
    };
  }
}
```

When using the `@Cookie` decorator, `Nest` will automatically convert the type of `id` based on the specified type.

## Signing Cookies

Due to different underlying implementations, there are some notable differences between `oak` and `hono` when using `Cookies` with signing. For example, when setting a cookie with signing, `oak` will generate two cookies, while `hono` only generates one, but its value is encrypted. This is not important for higher-level usage, so readers can simply have a basic understanding of it.

### oak

In `oak`, you must pass the `keys` when creating the application:

```typescript
const app = await NestFactory.create(AppModule, Router, {
  keys: ['nest'],
});
```

Then you can use it like this:

```typescript
await cookies.set('DENO_COOKIE_USER_ID', '123', {
  path: '/',
  signed: true,
  // signedSecret: "abcd",
});
```

Note that even if you set `signedSecret`, it will be ignored because this parameter is only supported by `hono`.

### hono

In `hono`, you can pass the `keys` when creating the application as a global configuration:

```typescript
const app = await NestFactory.create(AppModule, Router, {
  keys: ['nest'],
});
```

You can override this configuration with `signedSecret` when using it specifically:

```typescript
await cookies.set('DENO_COOKIE_USER_ID', '123', {
  path: '/',
  signed: true,
  signedSecret: 'abcd',
});
```

If neither of them is set, an error will be thrown when setting the cookie.

## Examples

For examples related to cookies, please refer to [deno_nest/example/cookie](https://github.com/jiawei397/deno-nest/tree/main/example/cookie).

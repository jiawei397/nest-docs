---
group:
  title: Security
  order: 4
order: 1
---

# Authentication

Identity verification is a crucial component of most applications. There are various methods and strategies for handling authentication, and the chosen approach depends on the specific application requirements. This chapter introduces several authentication methods that can adapt to various demands.

Let's detail our requirements. For this use case, the client will initially authenticate using a username and password. Once authenticated, the server will issue a JWT, which can be sent as a bearer token in the authorization header of subsequent requests to prove authentication. We will also create a protected route that only allows access to requests containing a valid JWT.

We'll start with the first requirement: validating user identity. Then, we'll extend it by issuing a JWT. Finally, we'll create a protected route that checks for a valid JWT in incoming requests.

## Create an Authentication Module

Firstly, we'll generate an `AuthModule`, which includes an `AuthService` and an `AuthController`. We'll use `AuthService` to implement authentication logic and `AuthController` to expose authentication endpoints.

```bash
$ nest g module auth
$ nest g controller auth
$ nest g service auth
```

As we implement `AuthService`, we'll find it useful to encapsulate user operations in `UsersService`. So, let's generate that module and service now:

```bash
$ nest g module users
$ nest g service users
```

Replace the default content of the generated files with the following. For our sample application, `UsersService` maintains a hardcoded in-memory user list and a `find` method to retrieve users by username. In a real application, this is where you'd build your user model and persistence layer, using your chosen database (e.g., MongoDB, MySQL, Elastic Search, Postgres, Redis, etc.).

```typescript
// deno-lint-ignore-file require-await
import { Injectable } from '@nest/core';

export type User = {
  userId: number;
  username: string;
  password: string;
};

@Injectable()
export class UsersService {
  private readonly users = [
    {
      userId: 1,
      username: 'john',
      password: 'changeme',
    },
    {
      userId: 2,
      username: 'maria',
      password: 'guess',
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }
}
```

In the `UsersModule`, the only required change is to add `UsersService` to the exports array in the `@Module` decorator so that it is visible outside of this module (we will soon use it in `AuthService`).

```typescript
import { Module } from '@nest/core';
import { UsersService } from './users.service.ts';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## Implement the "Login" Endpoint

The role of our `AuthService` is to retrieve users and verify passwords. We've created a `signIn()` method to accomplish this. In the code below, we use the convenient ES6 spread operator to remove the password property from the user object before returning it. This is a common practice when returning user objects, as you don't want to expose sensitive fields such as passwords or other security keys.

```typescript
import { Injectable, UnauthorizedException } from '@nest/core';
import { UsersService } from '../users/users.service.ts';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException('');
    }
    const { password, ...result } = user;
    // TODO: Generate a JWT and return it here
    // instead of the user object
    return result;
  }
}
```

:::warning
Of course in a real application, you wouldn't store a password in plain text. You'd instead use a library like bcrypt, with a salted one-way hash algorithm. With that approach, you'd only store hashed passwords, and then compare the stored password to a hashed version of the incoming password, thus never storing or exposing user passwords in plain text. To keep our sample app simple, we violate that absolute mandate and use plain text. Don't do this in your real app!
:::

Now, we update our `AuthModule` to import the `UsersModule`.

```typescript
import { Module } from '@nest/core';
import { AuthService } from './auth.service.ts';
import { AuthController } from './auth.controller.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
})
export class AuthModule {}
```

With this in place, let's open up the `AuthController` and add a `signIn()` method to it. This method will be called by the client to authenticate a user. It will receive the username and password in the request body, and will return a JWT token if the user is authenticated.

```typescript
import { Body, Controller, Post } from '@nest/core';
import { AuthService } from './auth.service.ts';
import { SignInDto } from './auth.dto.ts';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }
}
```

The `SignInDto` is derived from `auth.dto.ts` and is used to validate parameters.

```typescript
import { IsString, MaxLength, MinLength } from 'class_validator';

export class SignInDto {
  @MaxLength(20)
  @MinLength(1)
  @IsString()
  username: string;

  @MaxLength(20)
  @MinLength(1)
  @IsString()
  password: string;
}
```

## JWT token

We're ready to move on to the JWT portion of our auth system. Let's review and refine our requirements:

- Allow users to authenticate with username/password, returning a JWT for use in subsequent calls to protected API endpoints. We're well on our way to meeting this requirement. To complete it, we'll need to write the code that issues a JWT.
- Create API routes which are protected based on the presence of a valid JWT as a bearer token

We need to include the `@nest/jwt` package in the importMap to assist us in handling JWT operations, including the generation and validation of JWT tokens.

```json
{
  "imports": {
    "@nest/jwt": "jsr:@nest/jwt@^0.0.2"
  }
}
```

To keep our service modular and clear, we will handle JWT generation in the `authService`. Open the `auth.service.ts` file in the `auth` folder, inject `JwtService`, and update the `signIn` method to generate a JWT token as follows:

```typescript
import { Injectable, UnauthorizedException } from '@nest/core';
import { UsersService } from '../users/users.service.ts';
import { JwtService } from '@nest/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(username: string, pass: string) {
    const user = await this.usersService.findOne(username);
    if (user?.password !== pass) {
      throw new UnauthorizedException('');
    }
    const payload = { sub: user.userId.toString(), username: user.username };
    const access_token = await this.jwtService.sign(payload);
    return {
      access_token,
    };
  }
}
```

We're using the `@nest/jwt` library, which supplies a `sign()` function to generate our JWT from a subset of the `user` object properties, which we then return as a simple object with a single `access_token` property. Note: we choose a property name of `sub` to hold our `userId` value to be consistent with JWT standards. Don't forget to inject the JwtService provider into the `AuthService`.

We now need to update the `AuthModule` to import the new dependencies and configure the `JwtModule`.

First, create `constants.ts` in the `auth` folder, and add the following code:

```typescript
export const jwtConstants = {
  secret:
    'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
};
```

We'll use this to share our key between the JWT signing and verifying steps.

:::warning
**Do not expose this key publicly**. We have done so here to make it clear what the code is doing, but in a production system you must protect this key using appropriate measures such as a secrets vault, environment variable, or configuration service.
:::

Now, open `auth.module.ts` in the auth folder and update it to look like this:

```typescript
import { APP_GUARD, Module } from '@nest/core';
import { JwtModule } from '@nest/jwt';

import { AuthController } from './auth.controller.ts';
import { UsersModule } from '../users/users.module.ts';
import { jwtConstants } from './auth.constants.ts';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: {
        expiresIn: 60,
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
```

:::info
We're registering the JwtModule as global to make things easier for us. This means that we don't need to import the JwtModule anywhere else in our application.
:::

We use the `register()` method to configure the `JwtModule` by passing in a configuration object.

Let's proceed with testing our routes using `cURL`. You can use any user object hardcoded in the `UsersService` for testing.

```bash
# POST请求login
$ curl -X POST http://localhost:2000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"

# 生成token
{"access_token":"eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImpvaG4iLCJ1c2VySWQiOjEsImV4cCI6MTcwMTc1ODYxNX0.h2wP32ITBk1sUJA7MBF1lt6iEVHXOlB-A9u-hK5ATPJUtIngAEKf3cFwOIWXV52cy7FkdTigOzLbptrblDZ09Q"}
```

## Implementing the authentication guard#

We can now address our final requirement: protecting endpoints by requiring a valid JWT be present on the request. We'll do this by creating an `AuthGuard` that we can use to protect our routes.

```typescript
import {
  CanActivate,
  type Context,
  Injectable,
  type Request,
  UnauthorizedException,
} from '@nest/core';
import { JwtService } from '@nest/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: Context): Promise<boolean> {
    const request = context.request;
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('');
    }
    try {
      const payload = await this.jwtService.verify(token);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request.states.user = payload;
    } catch (e) {
      console.error(`verify token error:`, e);
      throw new UnauthorizedException('');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.header('authorization')?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

We can now implement our protected route and register our `AuthGuard` to protect it.

Open the `auth.controller.ts` file and update it as shown below:

```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  type Request,
  UseGuards,
} from '@nest/core';
import { AuthService } from './auth.service.ts';
import { SignInDto } from './auth.dto.ts';
import { AuthGuard } from './auth.guard.ts';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.states.user;
  }
}
```

We're applying the `AuthGuard` that we just created to the `GET /profile` route so that it will be protected.

Ensure the app is running, and test the routes using `cURL`.

```bash
$ curl http://localhost:2000/auth/profile
# Unauthorized
{"statusCode":401,"message":"Unauthorized"}

$ curl -X POST http://localhost:2000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
# get token
{"access_token":"eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJqb2huIiwiZXhwIjoxNzAxNzY0Mjg0fQ._yeh2nfaytIvfqOopJpc9al27eNsb7Mac3H-TpNOlWrO7LQs_ckQeLU6PGRDlHSTi6LIXS5ceUzJ_IxfQNA9jw"}

# GET /profile using access_token returned from previous step as bearer code
$ curl http://localhost:2000/auth/profile -H "Authorization: Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJqb2huIiwiZXhwIjoxNzAxNzY0Mjg0fQ._yeh2nfaytIvfqOopJpc9al27eNsb7Mac3H-TpNOlWrO7LQs_ckQeLU6PGRDlHSTi6LIXS5ceUzJ_IxfQNA9jw"

# get decoded JWT info
{"sub":"1","username":"john","exp":1701764284}
```

Note that in the `AuthModule`, we configured the JWT to have an expiration of `60 seconds`. This is too short an expiration, and dealing with the details of token expiration and refresh is beyond the scope of this article. However, we chose that to demonstrate an important quality of JWTs. If you wait 60 seconds after authenticating before attempting a `GET /auth/profile` request, you'll receive a `401 Unauthorized` response. This is because `@nest/jwt` automatically checks the JWT for its expiration time, saving you the trouble of doing so in your application.

We've now completed our JWT authentication implementation. JavaScript clients (such as Angular/React/Vue), and other JavaScript apps, can now authenticate and communicate securely with our API Server.

## Enable authentication globally

If the vast majority of your endpoints should be protected by default, you can register the authentication guard as a [global guard](./07_guards.en-US.md) and instead of using `@UseGuards()` decorator on top of each controller, you could simply flag which routes should be public.

First, register the `AuthGuard` as a global guard using the following construction (in any module, for example, in the `AuthModule`):

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
],
```

With this in place, Nest will automatically bind `AuthGuard` to all endpoints.

Now we must provide a mechanism for declaring routes as public. For this, we can create a custom decorator using the `SetMetadata` decorator factory function.

```typescript
import { SetMetadata } from '@nest/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

In the file above, we exported two constants. One being our metadata key named `IS_PUBLIC_KEY`, and the other being our new decorator itself that we’re going to call `Public` (you can alternatively name it `SkipAuth` or `AllowAnon`, whatever fits your project).

Now that we have a custom `@Public()` decorator, we can use it to decorate any method, as follows:

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

Finally, when the `isPublic` metadata is found, we need the `AuthGuard` to return `true`. To achieve this, we will use the `Reflector` class:

```typescript
import {
  CanActivate,
  type Context,
  Injectable,
  Reflector,
  type Request,
  UnauthorizedException,
} from '@nest/core';
import { JwtService } from '@nest/jwt';
import { IS_PUBLIC_KEY } from './auth.decorator.ts';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: Context): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context);
    if (isPublic) {
      return true;
    }

    const request = context.request;
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('');
    }
    try {
      const payload = await this.jwtService.verify(token);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request.states.user = payload;
    } catch (e) {
      console.error(`verify token error:`, e);
      throw new UnauthorizedException('');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.header('authorization')?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

## Example

You can find the complete example code [here](https://github.com/jiawei397/deno-nest/tree/main/example/authentication).

---
group:
  title: 安全
  order: 4
order: 1
---

# 验证

身份验证是大多数应用程序的重要组成部分。处理身份验证有许多不同的方法和策略。采用的方法取决于项目的特定应用要求。本章介绍了几种可以适应各种不同要求的身份验证方法。

让我们详细说明我们的需求。对于这个用例，客户端将首先使用用户名和密码进行身份验证。一旦通过身份验证，服务器将发出一个 JWT，可以将其作为授权头中的承载令牌发送到后续请求中以证明身份验证。我们还将创建一个受保护的路由，只有包含有效 JWT 的请求才能访问。

我们将从第一个要求开始：验证用户身份。然后，我们将通过发出 JWT 来扩展它。最后，我们将创建一个检查请求中是否存在有效 JWT 的受保护路由。

## 创建一个身份验证模块

我们将首先生成一个`AuthModule`，在其中包含一个`AuthService`和一个`AuthController`。我们将使用`AuthService`来实现身份验证逻辑，并使用`AuthController`来公开身份验证端点。

```bash
$ nests g module auth
$ nests g controller auth
$ nests g service auth
```

当我们实现`AuthService`时，我们会发现将用户操作封装在`UsersService`中很有用，所以现在让我们生成该模块和服务：

```bash
$ nests g module users
$ nests g service users
```

将生成文件的默认内容替换为下面所示。对于我们的示例应用程序，`UsersService`仅维护一个硬编码的内存用户列表和一个按用户名检索用户的`find`方法。在实际应用程序中，这是你构建用户模型和持久性层的地方，使用你选择的数据库（例如 MongoDB、MySQL、Elastic Search、PostGres、Redis 等）。

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

在`UsersModule`中，唯一需要的更改是将`UsersService`添加到`@Module`装饰器的`exports`数组中，以便它在此模块之外可见（我们很快将在`AuthService`中使用它）。

```typescript
import { Module } from '@nest/core';
import { UsersService } from './users.service.ts';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## 实现“登录”端点

我们的`AuthService`的工作是检索用户并验证密码。我们创建了一个`signIn()`方法来实现这个目的。在下面的代码中，我们使用了方便的 ES6 扩展运算符来从用户对象中删除密码属性，然后返回它。这是返回用户对象时的常见做法，因为您不希望暴露敏感字段，如密码或其他安全密钥。

```typescript
import { Injectable, UnauthorizedException } from '@nest';
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
当然，在真正的应用程序中，你不会以明文形式存储密码。相反，你将使用像 bcrypt 这样的库，使用盐的单向哈希算法。采用这种方法，你只会存储哈希密码，然后将存储的密码与传入密码的哈希版本进行比较，从而永远不会以明文形式存储或暴露用户密码。为了保持我们的示例应用程序简单，我们违反了这个绝对要求并使用了明文。在你的真实应用程序中不要这样做！
:::

现在，我们更新我们的`AuthModule`以导入`UsersModule`。

```typescript
import { Module } from '@nest';
import { AuthService } from './auth.service.ts';
import { AuthController } from './auth.controller.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
})
export class AuthModule {}
```

有了这个，让我们打开`AuthController`并添加一个`signIn()`方法。这个方法将被客户端调用来验证用户。它将在请求正文中接收用户名和密码，并在用户通过身份验证时返回 JWT 令牌。

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

其中`SignInDto`来自`auth.dto.ts`，用来校验参数：

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

我们准备进入我们的身份验证系统的 JWT 部分。让我们回顾并完善我们的要求：

- 允许用户使用用户名/密码进行身份验证，返回一个 JWT，以便在后续调用受保护的 API 端点时使用。我们已经很接近满足这个要求了。要完成它，我们需要编写代码来发出 JWT。
- 创建基于有效 JWT 作为承载令牌的 API 路由

我们需要在 importMap 中加入`@nest/jwt`包来帮助我们处理 JWT 操作，包括生成和验证 JWT 令牌：

```json
{
  "imports": {
    "@nest/jwt": "https://deno.land/x/deno_nest/modules/jwt/mod.ts"
  }
}
```

为了使我们的服务保持清晰的模块化，我们将在`authService`中处理生成 JWT。打开 auth 文件夹中的`auth.service.ts`文件，注入`JwtService`，并更新`signIn`方法以生成 JWT 令牌，如下所示：

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

我们正在使用`@nest/jwt`库，它提供了一个`sign()`函数来生成我们的 JWT，该 JWT 是从用户对象的一部分属性中生成的，然后我们将其作为一个简单对象返回，其中只有一个`access_token`属性。注意：我们选择了一个名为`sub`的属性来保存我们的`userId`值，以保持与 JWT 标准的一致性。不要忘记将`JwtService`提供者注入到`AuthService`中。

现在，我们需要更新`AuthModule`来导入新的依赖项并配置`JwtModule`。

首先，在`auth`文件夹中创建`constants.ts`，并添加以下代码：

```typescript
export const jwtConstants = {
  secret:
    'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
};
```

我们将使用此密钥在 JWT 签名和验证步骤之间共享。

:::warning
不要公开暴露此密钥。我们在这里这样做是为了清楚代码的作用，但在生产系统中，你必须使用适当的措施保护此密钥，例如秘密存储库、环境变量或配置服务。
:::

现在，打开 auth 文件夹中的`auth.module.ts`并将其更新为以下内容：

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
        expiresIn: 60, // 过期时间
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
```

:::info
我们将 JwtModule 注册为全局模块，以便于我们使用。这意味着我们不需要在应用的其他地方导入 JwtModule。
:::

我们使用`register()`方法来配置`JwtModule`，传入一个配置对象。

让我们继续使用`cURL`测试我们的路由。你可以使用`UsersService`中硬编码的任何用户对象进行测试。

```bash
# POST请求login
$ curl -X POST http://localhost:2000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"

# 生成token
{"access_token":"eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImpvaG4iLCJ1c2VySWQiOjEsImV4cCI6MTcwMTc1ODYxNX0.h2wP32ITBk1sUJA7MBF1lt6iEVHXOlB-A9u-hK5ATPJUtIngAEKf3cFwOIWXV52cy7FkdTigOzLbptrblDZ09Q"}
```

## 实现身份验证守卫

现在我们可以解决最后一个要求：通过要求请求中存在有效的 JWT 来保护端点。
我们将创建一个 AuthGuard 来保护我们的路由。

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

现在我们可以实现我们的受保护路由并注册我们的`AuthGuard`来保护它。

打开`auth.controller.ts`文件并按下面所示进行更新：

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

我们将刚刚创建的 `AuthGuard` 应用于`GET /profile`路由，以便它受到保护。

确保应用正在运行，并使用 `cURL` 测试路由。

```bash
$ curl http://localhost:2000/auth/profile
# 未登陆
{"statusCode":401,"message":"Unauthorized"}

$ curl -X POST http://localhost:2000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
# 生成token
{"access_token":"eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJqb2huIiwiZXhwIjoxNzAxNzY0Mjg0fQ._yeh2nfaytIvfqOopJpc9al27eNsb7Mac3H-TpNOlWrO7LQs_ckQeLU6PGRDlHSTi6LIXS5ceUzJ_IxfQNA9jw"}

# 使用上面的token，拼接上Bearer信息
$ curl http://localhost:2000/auth/profile -H "Authorization: Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJqb2huIiwiZXhwIjoxNzAxNzY0Mjg0fQ._yeh2nfaytIvfqOopJpc9al27eNsb7Mac3H-TpNOlWrO7LQs_ckQeLU6PGRDlHSTi6LIXS5ceUzJ_IxfQNA9jw"

# 得到解析后的JWT信息
{"sub":"1","username":"john","exp":1701764284}
```

请注意，在`AuthModule`中，我们配置了 JWT 的过期时间为`60`秒。这个过期时间太短了，处理令牌过期和刷新的细节超出了本文的范围。但是，我们选择了这个时间来演示 JWT 的一个重要特性。如果你在认证后等待 60 秒再尝试进行`GET /auth/profile`请求，你将收到 401 未经授权的响应。这是因为`@nest/jwt`自动检查 JWT 的过期时间，省去了你在应用程序中进行此操作的麻烦。

我们现在已经完成了 JWT 身份验证的实现。JavaScript 客户端（如 Angular、React、Vue）和其它 JavaScript 应用程序现在可以安全地与我们的 API 服务器进行身份验证和通信。

## 全局启用身份验证

如果大多数端点应该默认受保护，则可以将身份验证守卫注册为全局守卫，而不是在每个控制器顶部使用`@UseGuards()`装饰器，你只需标记哪些路由应该是公共的。

首先，在任何模块中（例如，在 AuthModule 中），使用以下结构将 AuthGuard 注册为全局守卫：

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
],
```

有了这个设置，Nest 将自动将`AuthGuard`绑定到所有端点。现在我们必须提供一种机制来声明路由为公共的。为此，我们可以使用`SetMetadata`装饰器工厂函数创建自定义装饰器。

```typescript
import { SetMetadata } from '@nest/core';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在上面的文件中，我们导出了两个常量。一个是我们的元数据键名为`IS_PUBLIC_KEY`，另一个是我们将要称之为`Public`的新装饰器本身（你也可以将其命名为`SkipAuth`或`AllowAnon`，以适应你的项目）。

现在我们有了一个自定义的`@Public()`装饰器，我们可以将其用于装饰任何方法，如下所示：

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

最后，当找到`isPublic`元数据时，我们需要`AuthGuard`返回`true`。为此，我们将使用`Reflector`类：

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

## 样例

你可以在[这里](https://deno.land/x/deno_nest/example/authentication/src?source)看到完整的样例代码。

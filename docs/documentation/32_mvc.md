---
group: 技巧
order: 12
---

# Model-View-Controller

`Nest`目前支持两种模板引擎来渲染 HTML 视图：[ejs](https://github.com/mde/ejs) 和 [hbs](https://handlebarsjs.com/)。由于二者在使用上大同小异，所以本文以`ejs`为例。

## 使用

我们先添加`@nest/ejs`到`importMap`：

```json
{
  "imports": {
    "@nest/ejs": "https://deno.land/x/deno_nest/modules/ejs/mod.ts"
  }
}
```

在`main.ts`中设置 ejs 文件所在的文件夹路径：

```typescript
import { NestFactory } from '@nest/core';
import { Router } from '@nest/hono';
import { AppModule } from './app.module.ts';
import { setBaseViewsDir } from '@nest/ejs';

const app = await NestFactory.create(AppModule, Router);
setBaseViewsDir('views');
// setBaseViewsDir("views/");
```

我们在 views 下新建一个`index.ejs`文件，里面有个参数`message`需要在渲染前传入：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Nest</title>
  </head>
  <body>
    <h1>Nest</h1>
    <p><%= message %></p>
  </body>
</html>
```

下一步，在`app.controller.ts`中，使用`@Render`装饰器，其参数是`index.ejs`的文件路径，可以忽略`.ejs`后缀：

```typescript
import { Controller, Get } from '@nest/core';
import { Render } from '@nest/ejs';

@Controller('')
export class AppController {
  @Get('/')
  @Render('index')
  hello() {
    return {
      message: 'Hello ejs',
    };
  }
}
```

:::warning
必须在方法中直接返回 ejs 文件所需的参数。
:::

## 样例

1. ejs 的样例在[这里](https://deno.land/x/deno_nest/modules/ejs/example?source)。
2. hbs 的样例在[这里](https://deno.land/x/deno_nest/modules/hbs/example?source)。
3. 如果需要其它模板引擎，可以参考相应的模块代码，自行实现`setBaseViewsDir`函数和`@Render`装饰器即可。

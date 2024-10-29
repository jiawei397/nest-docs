---
group: Techniques
order: 12
---

# Model-View-Controller

Currently, `Nest` supports two template engines to render HTML views: [ejs](https://github.com/mde/ejs) and [hbs](https://handlebarsjs.com/). As they are quite similar in usage, this article will use `ejs` as an example.

## Usage

First, we need to add `@nest/ejs` to the `importMap`:

```json
{
  "imports": {
    "@nest/ejs": "https://deno.land/x/deno_nest/modules/ejs/mod.ts"
  }
}
```

In `main.ts`, we set the folder path where the ejs files are located:

```typescript
import { NestFactory } from '@nest/core';
import { Router } from '@nest/hono';
import { AppModule } from './app.module.ts';
import { setBaseViewsDir } from '@nest/ejs';

const app = await NestFactory.create(AppModule, Router);
setBaseViewsDir('views');
// setBaseViewsDir("views/");
```

Next, we create an `index.ejs` file under `views`, which has a parameter `message` that needs to be passed in before rendering:

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

Finally, in `app.controller.ts`, we use the `@Render` decorator with the file path of `index.ejs`, ignoring the `.ejs` suffix:

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
Note that you must return the parameters required by the ejs file directly in the method.
:::

## Examples

1. The example of ejs can be found [here](https://deno.land/x/deno_nest/modules/ejs/example?source).
2. The example of hbs can be found [here](https://deno.land/x/deno_nest/modules/hbs/example?source).
3. If you need other template engines, you can refer to the corresponding module code and implement the `setBaseViewsDir` function and `@Render` decorator on your own.

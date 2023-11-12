---
group:
  title: 功能
  order: 2
order: 6
---

# 测试

自动化测试被认为是任何严肃的软件开发工作的必要部分。自动化使得在开发过程中快速轻松地重复单个测试或测试套件成为可能。这有助于确保发布符合质量和性能目标。自动化有助于增加覆盖范围并为开发人员提供更快的反馈循环。自动化既增加了单个开发人员的生产力，也确保在关键的开发生命周期拐点（例如源代码控制检入、功能集成和版本发布）运行测试。

这些测试通常涵盖各种类型，包括单元测试、端到端（`E2E`）测试、集成测试等。

`Deno`内置了`Deno.test`函数使得无需引入第三方包就可以直接编写单元测试，而内置标准库中也有[std/testing/bdd.ts](https://deno.land/std@0.202.0/testing/bdd.ts)可以编写更复杂的测试用例，具体用法详见这篇《[Deno单元测试：让你的代码更加健壮](https://www.yuque.com/jiqingyun-begup/ewktxz/tffb9vfme5qu23et)》。

## 单元测试

### 单例的测试

在下面的示例中，我们将展示如何测试`CatsController`。

假设我们的`CatsController`是这样的：

```typescript
import { Controller, Get } from "@nest";
import { CatsService } from "./cats.service.ts";

@Controller("/cats")
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get("/")
  findAll() {
    return this.catsService.findAll();
  }
}
```

而`cats.service.ts`是：

```typescript
import { Injectable } from "@nest";

@Injectable()
export class CatsService {
  findAll() {
    return [];
  }
}
```

我们新建一个`cats.controller_test.ts`。在Nest中，推荐的命名规则是`_test`，尽管你也可以使用`.test`，这样的目的是为了尽可能与`Deno`的规范保持一致。

测试用例是这样的：

```typescript
import { assert, assertEquals, createTestingModule } from "@nest/tests";
import { CatsController } from "./cats.controller.ts";
import { CatsService } from "./cats.service.ts";

Deno.test("CatsController", async () => {
  const callStacks: number[] = [];
  const catsService = {
    findAll() {
      callStacks.push(1);
      return ["test"];
    },
  };
  const moduleRef = await createTestingModule({
    controllers: [CatsController],
  })
    .overrideProvider(CatsService, catsService)
    .compile();
  const catsController = await moduleRef.get(CatsController);
  assert(catsController);
  assertEquals(catsController.findAll(), ["test"]);
  assertEquals(callStacks, [1]);

  callStacks.length = 0;
});
```

我们将`CatsController`的依赖项`CatsService`的实例mock为我们自己的`catsService`，这样只需要关注`CatsController`的逻辑就可以保障我们的功能。

而像`CatsService`这种没有注入依赖的，可以直接`new`一个实例进行测试，这里就不赘述了。

### TRANSIENT的测试
在《[注入范围](./13_scope)》一节中，我们提到除了单例外，另一种范围是`TRANSIENT`，它的作用域范围不是全局唯一的，而是每个构建函数会创建一个新的实例。这在日志服务中很有用，因为我们需要知道父类的名称。

仍以这个`service`为例：

```typescript
import { type Constructor, Inject, Injectable, INQUIRER, Scope } from "@nest";

@Injectable({
  scope: Scope.TRANSIENT,
})
export class LogService {
  parentName: string;

  constructor(@Inject(INQUIRER) private parentClass: Constructor) {
    this.parentName = this.parentClass.name;
  }

  info(message: string) {
    console.log(`[${this.parentName}] ${message}`);
  }
}
```

以下是针对它的测试：

```typescript
import { Controller } from "@nest";
import { assert, createTestingModule } from "@nest/tests";
import { LoggerService } from "./logger.service.ts";

Deno.test("logger service test", async () => {
  @Controller("")
  class A {
    constructor(private loggerService: LoggerService) {}
  }

  @Controller("")
  class B {
    constructor(private loggerService: LoggerService) {}
  }

  const moduleRef = await createTestingModule({
    controllers: [A, B],
  }).compile();
  const loggerService = await moduleRef.get(LoggerService, A);
  const loggerService2 = await moduleRef.get(LoggerService, B);

  assert(loggerService);
  assert(loggerService2);
  assert(loggerService instanceof LoggerService);
  assert(loggerService2 instanceof LoggerService);
  assertEquals(loggerService.parentName, "A");
  assertEquals(loggerService2.parentName, "B");
  assert(loggerService !== loggerService2, "service is not singleton");
});
```

我们需要给`moduleRef.get`传递第二个参数，以获取到真正的实例。

## E2E（端到端）测试

与单元测试关注单个模块和类不同，端到端测试更加注重类和模块之间的交互，更接近最终用户与生产系统的交互方式。随着应用的增长，手动测试每个API端点的端到端行为变得困难。自动化的端到端测试可以帮助我们确保系统的整体行为是正确的，并满足项目需求。

为了执行`E2E`测试，我们使用与单元测试中刚刚介绍的类似的配置。新建一个`cats.e2e_test.ts`文件：

```typescript
import { assertEquals, createTestingModule } from "@nest/tests";
import { CatsController } from "./cats.controller.ts";

Deno.test("e2e test cats", async (t) => {
  const moduleRef = await createTestingModule({
    controllers: [CatsController],
  })
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  await t.step("findAll", async () => {
    const res = await fetch(`http://localhost:${app.port}/cats`);
    assertEquals(res.status, 200);
    assertEquals(await res.json(), []);
  });

  await app.close();
});
```

这个用例等同于：

```typescript
import {
  afterEach,
  App,
  assertEquals,
  beforeEach,
  createTestingModule,
  describe,
  it,
} from "@nest/tests";
import { CatsController } from "./cats.controller.ts";

describe("e2e test cats", () => {
  let app: App;
  beforeEach(async () => {
    const moduleRef = await createTestingModule({
      controllers: [CatsController],
    })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it("findAll", async () => {
    const res = await fetch(`http://localhost:${app.port}/cats`);
    assertEquals(res.status, 200);
    assertEquals(await res.json(), []);
  });

  afterEach(async () => {
    await app.close();
  });
});
```

:::info
前者的优点是在vscode中Deno的插件可以直接进行测试，后者的代码逻辑分块更清晰些，读者可以自行选用喜欢的方式。
:::

`E2E`测试其实是启动了一个本地的HTTP服务，所以我们可以在测试代码中使用`fetch API`来测试响应的结果。也正因为如此，所以需要注意在测试完成前调用`app.close`关闭服务。

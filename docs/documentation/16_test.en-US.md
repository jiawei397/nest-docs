---
group:
  title: Fundamentals
  order: 2
order: 6
---

# Testing

Automated testing is considered an essential part of any serious software development work. Automation enables quick and easy repetition of individual tests or test suites during the development process. This helps ensure that releases meet quality and performance goals. Automation aids in increasing test coverage and provides developers with a faster feedback loop. It enhances the productivity of individual developers and ensures tests run at critical development lifecycle points such as source code control check-ins, feature integration, and version releases.

These tests typically cover various types, including unit tests, end-to-end (`E2E`) tests, integration tests, and more.

`Deno` has built-in support for testing with the `Deno.test` function, allowing you to write unit tests without the need for third-party packages. The standard library also includes [std/testing/bdd.ts](https://deno.land/std@0.202.0/testing/bdd.ts) for writing more complex test cases. For detailed usage, refer to the article "[Deno Unit Testing: Making Your Code More Robust](../blog/02_deno_unit.en-US.md)."

## Unit Testing

### Singleton Testing

In the example below, we demonstrate how to test the `CatsController`.

Assuming our `CatsController` looks like this:

```typescript
import { Controller, Get } from '@nest/core';
import { CatsService } from './cats.service.ts';

@Controller('/cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get('/')
  findAll() {
    return this.catsService.findAll();
  }
}
```

And `cats.service.ts` is:

```typescript
import { Injectable } from '@nest/core';

@Injectable()
export class CatsService {
  findAll() {
    return [];
  }
}
```

We create a new file `cats.controller_test.ts`. In Nest, the recommended naming convention is to use `_test`, although you can also use `.test` to align more with Deno's conventions.

The test case is as follows:

```typescript
import { assert, assertEquals, createTestingModule } from '@nest/tests';
import { CatsController } from './cats.controller.ts';
import { CatsService } from './cats.service.ts';

Deno.test('CatsController', async () => {
  const callStacks: number[] = [];
  const catsService = {
    findAll() {
      callStacks.push(1);
      return ['test'];
    },
  };
  const moduleRef = await createTestingModule({
    controllers: [CatsController],
  })
    .overrideProvider(CatsService, catsService)
    .compile();
  const catsController = await moduleRef.get(CatsController);
  assert(catsController);
  assertEquals(catsController.findAll(), ['test']);
  assertEquals(callStacks, [1]);

  callStacks.length = 0;
});
```

We mock the instance of the `CatsService` dependency of `CatsController` with our own `catsService`, focusing only on the logic of `CatsController` to ensure our functionality.

For services like `CatsService` that do not have injected dependencies, you can directly create a new instance for testing, which is not detailed here.

### TRANSIENT Testing

In the section on "[Injection Scopes](./13_scope.en-US.md)," we mentioned that, in addition to singleton, another scope is `TRANSIENT`, whose scope is not globally unique but creates a new instance for each constructor function. This is useful in logging services where we need to know the parent class's name.

Taking this `service` as an example:

```typescript
import {
  type Constructor,
  Inject,
  Injectable,
  INQUIRER,
  Scope,
} from '@nest/core';

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

Here are the tests for it:

```typescript
import { Controller } from '@nest/core';
import { assert, createTestingModule } from '@nest/tests';
import { LoggerService } from './logger.service.ts';

Deno.test('logger service test', async () => {
  @Controller('')
  class A {
    constructor(private loggerService: LoggerService) {}
  }

  @Controller('')
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
  assertEquals(loggerService.parentName, 'A');
  assertEquals(loggerService2.parentName, 'B');
  assert(loggerService !== loggerService2, 'service is not singleton');
});
```

We need to pass the second parameter to `moduleRef.get` to get the real instance.

## End-to-End (E2E) Testing

Unlike unit testing, which focuses on individual modules and classes, end-to-end testing emphasizes the interaction between classes and modules, closer to the way end users interact with the production system. As the application grows, manual testing of the end-to-end behavior of each API endpoint becomes challenging. Automated end-to-end testing helps ensure that the overall behavior of the system is correct and meets project requirements.

To perform `E2E` testing, we use a configuration similar to what was introduced in unit testing. Create a new file `cats.e2e_test.ts`:

```typescript
import { assertEquals, createTestingModule } from '@nest/tests';
import { CatsController } from './cats.controller.ts';

Deno.test('e2e test cats', async (t) => {
  const moduleRef = await createTestingModule({
    controllers: [CatsController],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  await t.step('findAll', async () => {
    const res = await fetch(`http://localhost:${app.port}/cats`);
    assertEquals(res.status, 200);
    assertEquals(await res.json(), []);
  });

  await app.close();
});
```

This case is equivalent to:

```typescript
import {
  afterEach,
  App,
  assertEquals,
  beforeEach,
  createTestingModule,
  describe,
  it,
} from '@nest/tests';
import { CatsController } from './cats.controller.ts';

describe('e2e test cats', () => {
  let app: App;
  beforeEach(async () => {
    const moduleRef = await createTestingModule({
      controllers: [CatsController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('findAll', async () => {
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
The advantage of the former is that Deno's VSCode plugin can directly run tests. The latter has a clearer code logic division into blocks, and readers can choose their preferred method.
:::

`E2E` testing essentially starts a local HTTP server, allowing us to use the `fetch API` in the test code to test the response results. However, because of this, it is essential to call `app.close` to shut down the service before the tests are completed.

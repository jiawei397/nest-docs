---
group: 技巧
order: 8
---

# 响应流

## 流数据

有时候，我们会有种需求，向客户端响应一个数据流，比如一个需要实时获取日志的接口。

`Nest`提供了一个`getReadableStream`的函数，帮助你快速响应流。

```typescript
import {
  Controller,
  Get,
  getReadableStream,
} from "@nest";

@Controller("")
export class AppController {
  /**
   * response an stream, can test by `curl http://localhost:2000/stream`
   */
  @Get("/stream")
  stream() {
    const { body, write, end } = getReadableStream();
    let num = 0;
    const timer = setInterval(() => {
      if (num === 10) {
        clearInterval(timer);
        console.info("end");
        try {
          end("Task successfully end");
        } catch (error) {
          console.error("end", error); // TypeError: The stream controller cannot close or enqueue
        }
        return;
      }
      num++;
      const message = `It is ${new Date().toISOString()}\n`;
      console.log(message);
      try {
        write(message);
      } catch (error) {
        console.error("write", error); // TypeError: The stream controller cannot close or enqueue
        clearInterval(timer);
      }
    }, 1000);
    return body;
  }
}
```

:::info
在`Nest`中，响应内容，除了文本外，可以直接响应一个`ReadableStream`。本例中的`body`就是一个`ReadableStream`。
:::

当你使用在控制台输入`curl http://localhost:2000/stream`时，会看到每隔一秒就有一条信息打印，直到10次后结束：

```bash
$ curl http://localhost:2000/stream
It is 2023-11-13T09:50:16.256Z
It is 2023-11-13T09:50:17.259Z
It is 2023-11-13T09:50:18.263Z
It is 2023-11-13T09:50:19.265Z
It is 2023-11-13T09:50:20.268Z
It is 2023-11-13T09:50:21.271Z
It is 2023-11-13T09:50:22.273Z
It is 2023-11-13T09:50:23.276Z
It is 2023-11-13T09:50:24.280Z
It is 2023-11-13T09:50:25.284Z
Task successfully end
```

## 流媒体文件

你有时候可能需要提供一个下载文件的接口，那么你会需要响应一个文件而非文本。

如果你对网络熟悉，应该知道只需要将响应头的`Content-Type`设置为`application/octet-stream`即可。

```typescript
import {
  Controller,
  Get,
  Header,
  Res,
  type Response,
} from "@nest";

@Controller("")
export class AppController {
  @Get("/file")
  @Header("Content-Type", "application/octet-stream")
  @Header("Content-Disposition", 'attachment; filename="README.md"')
  async file() {
    const input = await Deno.open("README.md", { read: true });
    return input.readable;
  }

  @Get("/file2")
  async file2(@Res() res: Response) {
    const input = await Deno.open("README.md", { read: true });
    res.headers.set("Content-Type", "application/octet-stream");
    res.headers.set("Content-Disposition", 'attachment; filename="README.md"');
    return input.readable;
  }
}
```

以上样例中两个接口是等价的，当用户请求API时，会收到一个媒体文件，如果客户端是浏览器，会进行下载。

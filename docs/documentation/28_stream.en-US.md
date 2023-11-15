---
group: Tips
order: 8
---

# Response Streams

## Stream Data

Sometimes, we have a need to respond to a client with a data stream, such as an interface that needs to obtain logs in real-time.

`Nest` provides a function `getReadableStream` to help you quickly respond with a stream.

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
In `Nest`, in addition to text, the response content can directly respond with a `ReadableStream`. In this example, `body` is a `ReadableStream`.
:::

When you use `curl http://localhost:2000/stream` in the console, you will see a message printed every second until it ends after 10 times:

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

## Stream Media Files

Sometimes you may need to provide an interface for downloading files, so you will need to respond with a file instead of text.

If you are familiar with the network, you should know that you only need to set the `Content-Type` of the response header to `application/octet-stream`.

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

In the above example, the two interfaces are equivalent. When a user requests the API, they will receive a media file. If the client is a browser, it will be downloaded.

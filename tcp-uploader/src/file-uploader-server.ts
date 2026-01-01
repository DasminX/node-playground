import { randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import fsp from "node:fs/promises";

(() => {
  const server = net.createServer();

  server.on("connection", (client) => {
    console.log("New client connected... Client id: %d", client.remotePort);

    const clientId = client.remotePort!;

    const newFilepath = path.join(process.cwd(), "out", `${randomUUID()}-${clientId}`);

    client.on("close", async () => {
      await fsp.rename(newFilepath, newFilepath + fileExt);
    });

    const saveUploadedFileStream = fs.createWriteStream(newFilepath);

    let fileExt = "";

    // TODO: this part may be cut, so make a workaround to grab from different buffers
    client.on("data", (chunk: Buffer) => {
      const filename = chunk.toString("utf-8");
      if (filename.includes("FILENAME:") && filename.includes("DXDXDX")) {
        const indexOfStart = filename.indexOf("FILENAME:");
        const indexOfEnd = filename.indexOf("DXDXDX");
        const path = filename.slice(indexOfStart + 9, indexOfEnd).split(".");
        if (path.length > 2) {
          fileExt = "." + path.at(-1);
        }

        chunk = Buffer.from(filename.slice(0, indexOfStart) + filename.slice(indexOfEnd + 6));
        if (!chunk.length) return;
      }

      const canWrite = saveUploadedFileStream.write(chunk);
      if (!canWrite) {
        client.pause();
      }
    });

    saveUploadedFileStream.on("drain", () => {
      client.resume();
    });
  });

  server.listen({ port: 3000, host: "localhost" }, () => {
    console.log("Server has started...\n", server.address());
  });
})();

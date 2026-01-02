import { randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import fsp from "node:fs/promises";

(() => {
  const OUT_DIR = path.join(process.cwd(), "out");

  const newConnectionHandler = async (client: net.Socket) => {
    const clientId = client.remotePort!;
    console.log("New client connected... Client id: %d", clientId);

    const newFilepath = path.join(OUT_DIR, `${randomUUID()}-${clientId}`);
    const saveUploadedFileStream = fs.createWriteStream(newFilepath);

    let filenameFound = false;

    // TODO: this part may be cut, so make a workaround to grab from different buffers
    client.on("data", async (chunk: Buffer) => {
      if (!filenameFound) {
        const data = chunk.toString("utf-8");

        if (data.includes("FILENAME:") && data.includes("------")) {
          filenameFound = true;

          const indexOfStart = data.indexOf("FILENAME:");
          const indexOfEnd = data.indexOf("------");

          const fileExt = path.extname(data.slice(indexOfStart + 9, indexOfEnd));
          if (fileExt !== "") {
            client.pause();
            await fsp.rename(newFilepath, newFilepath + fileExt);
            client.resume();
          }

          chunk = Buffer.from(data.slice(0, indexOfStart) + data.slice(indexOfEnd + 6));
          if (!chunk.length) return;
        }
      }

      if (!saveUploadedFileStream.write(chunk)) {
        client.pause();
      }
    });

    saveUploadedFileStream.on("drain", () => {
      client.resume();
    });
  };

  const server = net.createServer();
  server.on("connection", newConnectionHandler);

  server.listen({ port: 3000, host: "localhost" }, async () => {
    console.log("Server has started...\n", server.address());
    if (!fs.existsSync(OUT_DIR)) {
      await fsp.mkdir(OUT_DIR);
    }
  });
})();

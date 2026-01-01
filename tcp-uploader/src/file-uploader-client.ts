import net from "node:net";
import fs from "node:fs/promises";

(async () => {
  const args = process.argv || [];

  const uploadedFileName = args.find((arg) => arg.startsWith("file"))?.split("=")?.[1] || "";
  if (!uploadedFileName) {
    console.log("Invalid filename... Shutting down...");
    process.exit(0);
  }

  let filesize = 0;
  try {
    const fileinfo = await fs.stat(uploadedFileName);
    filesize = fileinfo.size;
    if (fileinfo.isDirectory()) {
      console.log("You cannot provide a directory... Shutting down...");
      process.exit(0);
    }
  } catch (error) {
    const err = error as Error;
    if (err.message.match(/ENOENT/gi)) {
      console.log("File '%s' not found", uploadedFileName);
    } else {
      console.log("Unknown error occured...");
    }
    process.exit(0);
  }

  const fh = await fs.open(uploadedFileName, "r");
  const uploadFileRS = fh.createReadStream();

  uploadFileRS.on("data", (chunk: Buffer) => {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(0);
    console.log("Uploading... %f%", Math.floor(100 * uploadFileRS.bytesRead) / (filesize || 1));
    socket.write(chunk);
  });

  uploadFileRS.on("end", () => {
    console.log("Successfully uploaded!");
    socket.end();
    try {
      fh.close();
    } catch (error) {}
  });

  const socket = net.createConnection({
    host: "127.0.0.1",
    port: 3000,
  });

  socket.on("connect", () => {
    console.log("Successfully connected!");
    console.log("Uploading of the file '%s' has started...", uploadedFileName);
    socket.write(Buffer.from("FILENAME:" + uploadedFileName + "DXDXDX"));
  });

  function closeConnection(hasError: boolean) {
    if (hasError) {
      console.log("Something went wrong...");
    } else {
      console.log("Operation success!");
    }

    console.log("Connection ended...");
  }
  socket.on("end", closeConnection.bind(this, false));
  socket.on("error", closeConnection.bind(this, true));
})();

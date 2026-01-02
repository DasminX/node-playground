import net from "node:net";
import fs from "node:fs/promises";

(async () => {
  const args = process.argv || [];

  const uploadedFileName = args.find((arg) => arg.startsWith("file"))?.split("=")?.[1] || "";
  if (!uploadedFileName) {
    console.log("Invalid filename... Shutting down...");
    process.exit(0);
  }

  try {
    const fileinfo = await fs.stat(uploadedFileName);
    var filesize = fileinfo.size;
    if (fileinfo.isDirectory()) {
      console.log("You cannot provide a directory... Shutting down...");
      process.exit(0);
    }
  } catch (error) {
    if (error instanceof Error && error.message.match(/ENOENT/gi)) {
      console.log("File '%s' not found", uploadedFileName);
    } else {
      console.log("Unknown error occured...");
    }
    process.exit(0);
  }

  if (!filesize) {
    console.log("Cannot retrieve the file size.");
    process.exit(0);
  }

  const socket = net.createConnection(
    {
      host: "127.0.0.1",
      port: 3000,
    },
    async () => {
      console.log("Successfully connected!");
      console.log("Uploading of the file '%s' has started...", uploadedFileName);
      socket.write("FILENAME:" + uploadedFileName + "------");

      const fh = await fs.open(uploadedFileName, "r");
      const uploadFileRS = fh.createReadStream();

      uploadFileRS.on("data", (chunk: Buffer) => {
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine(0);
        console.log("Uploading... %f%", Math.floor((100 * uploadFileRS.bytesRead) / filesize));

        if (!socket.write(chunk)) {
          uploadFileRS.pause();
        }
      });

      socket.on("drain", () => {
        uploadFileRS.resume();
      });

      uploadFileRS.on("end", () => {
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine(0);
        console.log("Successfully uploaded!");
        socket.end();
      });

      socket.on("error", () => {
        console.log("Something went wrong...");
        fh.close();
        socket.end();
      });
    }
  );
})();

const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const app = express();

const upload = multer({
  dest: "uploads/"
});

app.get("/", (req, res) => {
  res.send("Video Export Server is running ✅");
});

app.post(
  "/export",
  upload.single("video"),
  (req, res) => {

    if (!req.file) {
      return res
        .status(400)
        .send("No video uploaded");
    }

    const input = req.file.path;

    const output = path.join(
      "uploads",
      `${req.file.filename}-export.mp4`
    );

    const args = [
      "-y",

      "-i",
      input,

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "23",

      "-c:a",
      "aac",

      "-b:a",
      "128k",

      "-movflags",
      "+faststart",

      output
    ];

    execFile(
      ffmpegPath,
      args,
      (error) => {

        if (error) {

          console.error(error);

          fs.rm(
            input,
            { force: true },
            () => {}
          );

          return res
            .status(500)
            .send("Export failed");
        }

        res.download(
          output,
          "export-test.mp4",
          () => {

            fs.rm(
              input,
              { force: true },
              () => {}
            );

            fs.rm(
              output,
              { force: true },
              () => {}
            );

          }
        );

      }
    );

  }
);

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);

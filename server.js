const express = require("express");
const multer = require("multer");
const cors = require("cors");
const ffmpegPath = require("ffmpeg-static");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());

fs.mkdirSync("uploads", {
  recursive: true
});


const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});


/* ==============================
   HEALTH CHECK
================================ */

app.get("/", (req, res) => {

  res.send(
    "ReelFlow Export Server is running ✅"
  );

});


/* ==============================
   EXPORT REEL
================================ */

app.post(
  "/export-reel",

  upload.fields([
    {
      name: "image",
      maxCount: 1
    },
    {
      name: "hookImage",
      maxCount: 1
    }
  ]),

  (req, res) => {

    const imageFile =
      req.files?.image?.[0];

    const hookFile =
      req.files?.hookImage?.[0];


    if (!imageFile || !hookFile) {

      return res
        .status(400)
        .send(
          "Image or hook is missing"
        );

    }


    /*
      Hook height comes from Editor.

      This allows:

      TOP SPACE
      =
      BOTTOM SPACE

      even when hook height changes.
    */

    let hookHeight =
      Number(
        req.body.hookHeight
      );


    if (
      !Number.isFinite(hookHeight)
    ) {

      hookHeight = 150;

    }


    hookHeight =
      Math.max(
        80,
        Math.min(
          hookHeight,
          280
        )
      );


    /*
      FINAL REEL

      720 x 1280 = 9:16

      Image = 720 x 720 = exact 1:1
    */

    const VIDEO_WIDTH = 720;

    const VIDEO_HEIGHT = 1280;

    const IMAGE_SIZE = 720;


    /*
      Remaining empty space
      is divided equally.

      TOP = BOTTOM
    */

    const emptySpace =
      Math.max(
        0,
        Math.floor(
          (
            VIDEO_HEIGHT -
            IMAGE_SIZE -
            hookHeight
          ) / 2
        )
      );


    const hookY =
      emptySpace;


    const imageY =
      emptySpace +
      hookHeight;


    const imagePath =
      imageFile.path;


    const hookPath =
      hookFile.path;


    const musicPath =
      path.resolve(
        "template1.mp3"
      );


    const outputPath =
      path.join(
        "uploads",
        `${imageFile.filename}-reel.mp4`
      );


    if (
      !fs.existsSync(musicPath)
    ) {

      cleanup();

      return res
        .status(500)
        .send(
          "template1.mp3 not found"
        );

    }


    /*
      Reveal timing

      Starts shortly before beat.

      Image reaches 100%
      at reel ending.
    */

    const REVEAL_START =
      0.95;

    const REEL_END =
      5.04;

    const REVEAL_DURATION =
      REEL_END -
      REVEAL_START;


    const filter = [

      /*
        Black TikTok background
      */

      `color=c=#000000:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=${REEL_END}[bg]`,


      /*
        User image

        Always exact square 1:1.
        Cover crop.
      */

      `[0:v]` +
      `scale=${IMAGE_SIZE}:${IMAGE_SIZE}:force_original_aspect_ratio=increase,` +
      `crop=${IMAGE_SIZE}:${IMAGE_SIZE},` +
      `format=rgba,` +
      `fade=t=in:st=${REVEAL_START}:d=${REVEAL_DURATION}:alpha=1` +
      `[img]`,


      /*
        Hook image
      */

      `[1:v]` +
      `scale=${VIDEO_WIDTH}:${hookHeight}` +
      `[hook]`,


      /*
        Hook overlay
      */

      `[bg][hook]` +
      `overlay=0:${hookY}` +
      `[withhook]`,


      /*
        Image overlay
      */

      `[withhook][img]` +
      `overlay=0:${imageY}` +
      `[video]`

    ].join(";");


    const args = [

      "-y",


      /*
        Static image
      */

      "-loop",
      "1",

      "-i",
      imagePath,


      /*
        Static hook PNG
      */

      "-loop",
      "1",

      "-i",
      hookPath,


      /*
        Template music
      */

      "-i",
      musicPath,


      /*
        Build reel
      */

      "-filter_complex",
      filter,


      "-map",
      "[video]",

      "-map",
      "2:a:0",


      /*
        Reel duration
      */

      "-t",
      String(REEL_END),


      /*
        Video
      */

      "-r",
      "30",

      "-c:v",
      "libx264",

      "-preset",
      "ultrafast",

      "-crf",
      "23",

      "-pix_fmt",
      "yuv420p",


      /*
        Audio
      */

      "-c:a",
      "aac",

      "-b:a",
      "128k",


      /*
        Mobile-friendly MP4
      */

      "-movflags",
      "+faststart",


      outputPath

    ];


    console.log(
      "Starting ReelFlow export..."
    );


    execFile(
      ffmpegPath,
      args,

      {
        maxBuffer:
          10 * 1024 * 1024
      },

      (error) => {

        if (error) {

          console.error(
            "FFmpeg error:",
            error
          );


          cleanup();


          return res
            .status(500)
            .send(
              "Export failed"
            );

        }


        console.log(
          "Export finished ✅"
        );


        res.download(
          outputPath,
          "reelflow-reel.mp4",

          () => {

            cleanup();

          }
        );

      }
    );


    function cleanup() {

      fs.rm(
        imagePath,
        {
          force: true
        },
        () => {}
      );


      fs.rm(
        hookPath,
        {
          force: true
        },
        () => {}
      );


      fs.rm(
        outputPath,
        {
          force: true
        },
        () => {}
      );

    }

  }
);


/* ==============================
   SERVER
================================ */

const PORT =
  process.env.PORT ||
  3000;


app.listen(
  PORT,

  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);

import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  fetchFile,
  toBlobURL
} from "@ffmpeg/util";


const video =
  document.getElementById("video");

const videoInput =
  document.getElementById("videoInput");

const uploadBtn =
  document.getElementById("uploadBtn");

const startRange =
  document.getElementById("startRange");

const endRange =
  document.getElementById("endRange");

const startText =
  document.getElementById("startText");

const endText =
  document.getElementById("endText");

const previewTrimBtn =
  document.getElementById("previewTrimBtn");

const exportBtn =
  document.getElementById("exportBtn");

const exportModal =
  document.getElementById("exportModal");

const closeExport =
  document.getElementById("closeExport");

const startExportBtn =
  document.getElementById("startExportBtn");

const progressSection =
  document.getElementById("progressSection");

const progressLabel =
  document.getElementById("progressLabel");

const progressPercent =
  document.getElementById("progressPercent");

const progressBar =
  document.getElementById("progressBar");

const qualityOptions =
  document.querySelectorAll(".quality-option");


let selectedFile = null;
let videoURL = null;

let duration = 0;
let previewingTrim = false;

let selectedQuality = 720;

let ffmpeg = null;
let ffmpegLoaded = false;

let exporting = false;


const qualitySettings = {

  360: {
    videoBitrate: 700,
    audioBitrate: 96
  },

  480: {
    videoBitrate: 1200,
    audioBitrate: 96
  },

  720: {
    videoBitrate: 2500,
    audioBitrate: 128
  },

  1080: {
    videoBitrate: 5000,
    audioBitrate: 128
  }

};


function formatTime(seconds) {

  seconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );

}


function getTrimDuration() {

  const start =
    Number(startRange.value);

  const end =
    Number(endRange.value);

  return Math.max(
    0.1,
    end - start
  );

}


function estimateSizeMB(quality) {

  const settings =
    qualitySettings[quality];

  const seconds =
    getTrimDuration();

  const totalKbps =
    settings.videoBitrate +
    settings.audioBitrate;

  const megabytes =
    (
      totalKbps *
      1000 *
      seconds
    ) /
    8 /
    1024 /
    1024;

  return megabytes;

}


function updateEstimatedSizes() {

  [360, 480, 720, 1080]
    .forEach((quality) => {

      const element =
        document.getElementById(
          `size${quality}`
        );

      const size =
        estimateSizeMB(quality);

      element.textContent =
        `~${size.toFixed(1)} MB`;

    });

}


function setProgress(percent, label) {

  const value =
    Math.max(
      0,
      Math.min(100, percent)
    );

  progressBar.style.width =
    `${value}%`;

  progressPercent.textContent =
    `${Math.round(value)}%`;

  if (label) {
    progressLabel.textContent =
      label;
  }

}


/* VIDEO UPLOAD */

videoInput.addEventListener(
  "change",
  function () {

    const file =
      this.files[0];

    if (!file) return;

    selectedFile = file;

    if (videoURL) {
      URL.revokeObjectURL(
        videoURL
      );
    }

    videoURL =
      URL.createObjectURL(file);

    video.src =
      videoURL;

    video.style.display =
      "block";

    uploadBtn.style.display =
      "none";

    video.load();

  }
);


video.addEventListener(
  "loadedmetadata",
  function () {

    duration =
      video.duration;

    startRange.min = 0;
    startRange.max = duration;
    startRange.value = 0;

    endRange.min = 0;
    endRange.max = duration;
    endRange.value = duration;

    startText.textContent =
      formatTime(0);

    endText.textContent =
      formatTime(duration);

    updateEstimatedSizes();

  }
);


/* TRIM */

startRange.addEventListener(
  "input",
  function () {

    let start =
      Number(startRange.value);

    const end =
      Number(endRange.value);

    if (start >= end) {

      start =
        Math.max(
          0,
          end - 0.1
        );

      startRange.value =
        start;

    }

    startText.textContent =
      formatTime(start);

    video.currentTime =
      start;

    updateEstimatedSizes();

  }
);


endRange.addEventListener(
  "input",
  function () {

    const start =
      Number(startRange.value);

    let end =
      Number(endRange.value);

    if (end <= start) {

      end =
        Math.min(
          duration,
          start + 0.1
        );

      endRange.value =
        end;

    }

    endText.textContent =
      formatTime(end);

    video.currentTime =
      end;

    updateEstimatedSizes();

  }
);


previewTrimBtn.addEventListener(
  "click",
  async function () {

    if (!selectedFile) {
      alert("Add a video first.");
      return;
    }

    previewingTrim =
      true;

    video.currentTime =
      Number(startRange.value);

    try {
      await video.play();
    } catch (error) {
      console.error(error);
    }

  }
);


video.addEventListener(
  "timeupdate",
  function () {

    if (!previewingTrim) return;

    if (
      video.currentTime >=
      Number(endRange.value)
    ) {

      video.pause();

      video.currentTime =
        Number(startRange.value);

      previewingTrim =
        false;

    }

  }
);


/* EXPORT MODAL */

exportBtn.addEventListener(
  "click",
  function () {

    if (!selectedFile) {

      alert(
        "Add a video first."
      );

      return;
    }

    updateEstimatedSizes();

    exportModal.classList
      .remove("hidden");

  }
);


closeExport.addEventListener(
  "click",
  function () {

    if (exporting) return;

    exportModal.classList
      .add("hidden");

  }
);


qualityOptions.forEach(
  (option) => {

    option.addEventListener(
      "click",
      function () {

        if (exporting) return;

        qualityOptions
          .forEach((item) => {
            item.classList
              .remove("selected");
          });

        this.classList
          .add("selected");

        selectedQuality =
          Number(
            this.dataset.quality
          );

        startExportBtn.textContent =
          `Export ${selectedQuality}p`;

      }
    );

  }
);


/* LOAD FFMPEG */

async function loadFFmpeg() {

  if (ffmpegLoaded) {
    return;
  }

  progressLabel.textContent =
    "Loading export engine...";

  ffmpeg =
    new FFmpeg();

  ffmpeg.on(
    "progress",
    ({ progress }) => {

      if (!exporting) return;

      const percent =
        Math.min(
          99,
          progress * 100
        );

      setProgress(
        percent,
        "Exporting video..."
      );

    }
  );


  const baseURL =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";


  const coreURL =
    await toBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript"
    );


  const wasmURL =
    await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm"
    );


  await ffmpeg.load({
    coreURL,
    wasmURL
  });


  ffmpegLoaded =
    true;

}


/* SCALE FILTER */

function getScaleFilter() {

  const width =
    video.videoWidth;

  const height =
    video.videoHeight;

  if (height >= width) {

    return (
      `scale='min(${selectedQuality},iw)':-2`
    );

  }

  return (
    `scale=-2:'min(${selectedQuality},ih)'`
  );

}


/* EXPORT */

startExportBtn.addEventListener(
  "click",
  async function () {

    if (
      !selectedFile ||
      exporting
    ) {
      return;
    }


    exporting = true;

    startExportBtn.disabled =
      true;

    closeExport.disabled =
      true;

    progressSection.classList
      .remove("hidden");

    setProgress(
      0,
      "Preparing..."
    );


    try {

      await loadFFmpeg();


      setProgress(
        2,
        "Loading video..."
      );


      const extension =
        selectedFile.name
          .split(".")
          .pop()
          .toLowerCase() ||
        "mp4";


      const inputName =
        `input.${extension}`;

      const outputName =
        "exported-video.mp4";


      await ffmpeg.writeFile(
        inputName,
        await fetchFile(
          selectedFile
        )
      );


      const start =
        Number(
          startRange.value
        );


      const trimDuration =
        getTrimDuration();


      const settings =
        qualitySettings[
          selectedQuality
        ];


      const scaleFilter =
        getScaleFilter();


      setProgress(
        3,
        "Exporting video..."
      );


      const result =
        await ffmpeg.exec([

          "-ss",
          start.toFixed(3),

          "-i",
          inputName,

          "-t",
          trimDuration.toFixed(3),

          "-vf",
          scaleFilter,

          "-c:v",
          "libx264",

          "-preset",
          "ultrafast",

          "-b:v",
          `${settings.videoBitrate}k`,

          "-maxrate",
          `${settings.videoBitrate}k`,

          "-bufsize",
          `${settings.videoBitrate * 2}k`,

          "-pix_fmt",
          "yuv420p",

          "-c:a",
          "aac",

          "-b:a",
          `${settings.audioBitrate}k`,

          "-movflags",
          "+faststart",

          outputName

        ]);


      if (result !== 0) {

        throw new Error(
          "FFmpeg export failed."
        );

      }


      setProgress(
        99,
        "Finishing..."
      );


      const data =
        await ffmpeg.readFile(
          outputName
        );


      const blob =
        new Blob(
          [data.buffer],
          {
            type: "video/mp4"
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;

      link.download =
        `video-${selectedQuality}p.mp4`;


      document.body
        .appendChild(link);


      link.click();

      link.remove();


      setProgress(
        100,
        "Done ✓"
      );


      setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        30000
      );


      try {
        await ffmpeg.deleteFile(
          inputName
        );

        await ffmpeg.deleteFile(
          outputName
        );
      } catch (error) {
        console.log(error);
      }


    } catch (error) {

      console.error(error);

      progressLabel.textContent =
        "Export failed";

      alert(
        "Export failed on this video. Try a shorter video or lower quality."
      );

    } finally {

      exporting =
        false;

      startExportBtn.disabled =
        false;

      closeExport.disabled =
        false;

    }

  }
);

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



let videoURL = null;

let duration = 0;

let previewingTrim = false;



function formatTime(seconds) {

  seconds =
    Math.max(
      0,
      Number(seconds) || 0
    );


  const minutes =
    Math.floor(
      seconds / 60
    );


  const secs =
    Math.floor(
      seconds % 60
    );


  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );

}



/* UPLOAD VIDEO */

videoInput.addEventListener(
  "change",
  function () {

    const file =
      this.files[0];


    if (!file) {
      return;
    }


    if (videoURL) {
      URL.revokeObjectURL(
        videoURL
      );
    }


    videoURL =
      URL.createObjectURL(
        file
      );


    video.src =
      videoURL;


    video.style.display =
      "block";


    uploadBtn.style.display =
      "none";


    video.load();

  }
);



/* VIDEO READY */

video.addEventListener(
  "loadedmetadata",
  function () {

    duration =
      video.duration;


    startRange.min =
      0;


    startRange.max =
      duration;


    startRange.value =
      0;


    endRange.min =
      0;


    endRange.max =
      duration;


    endRange.value =
      duration;


    startText.textContent =
      formatTime(0);


    endText.textContent =
      formatTime(duration);

  }
);



/* START TRIM */

startRange.addEventListener(
  "input",
  function () {

    let start =
      Number(
        startRange.value
      );


    const end =
      Number(
        endRange.value
      );


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


    if (
      Number.isFinite(
        video.duration
      )
    ) {

      video.currentTime =
        start;

    }

  }
);



/* END TRIM */

endRange.addEventListener(
  "input",
  function () {

    const start =
      Number(
        startRange.value
      );


    let end =
      Number(
        endRange.value
      );


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


    if (
      Number.isFinite(
        video.duration
      )
    ) {

      video.currentTime =
        end;

    }

  }
);



/* PREVIEW TRIM */

previewTrimBtn.addEventListener(
  "click",
  async function () {

    if (
      !video.src ||
      !duration
    ) {

      return;
    }


    previewingTrim =
      true;


    video.currentTime =
      Number(
        startRange.value
      );


    try {

      await video.play();

    } catch (error) {

      console.log(
        "Playback error:",
        error
      );

    }

  }
);



video.addEventListener(
  "timeupdate",
  function () {

    if (!previewingTrim) {
      return;
    }


    const end =
      Number(
        endRange.value
      );


    if (
      video.currentTime >= end
    ) {

      video.pause();


      video.currentTime =
        Number(
          startRange.value
        );


      previewingTrim =
        false;

    }

  }
);



video.addEventListener(
  "pause",
  function () {

    if (
      video.currentTime <
      Number(
        endRange.value
      )
    ) {

      previewingTrim =
        false;

    }

  }
);



/* EXPORT - NOT ACTIVE YET */

exportBtn.addEventListener(
  "click",
  function () {

    alert(
      "Export will be added next."
    );

  }
);

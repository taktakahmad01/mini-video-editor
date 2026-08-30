const videoInput =
  document.getElementById("videoInput");

const editor =
  document.getElementById("editor");

const video =
  document.getElementById("video");

const videoBox =
  document.querySelector(".video-box");

const playBtn =
  document.getElementById("playBtn");

const timeline =
  document.getElementById("timeline");

const segmentsContainer =
  document.getElementById("segments");

const playhead =
  document.getElementById("playhead");

const splitBtn =
  document.getElementById("splitBtn");

const deleteBtn =
  document.getElementById("deleteBtn");

const currentTimeText =
  document.getElementById("currentTime");

const totalTimeText =
  document.getElementById("totalTime");


let segments = [];

let selectedSegmentId = null;

let thumbnails = [];

let videoDuration = 0;

let currentSegmentIndex = 0;

let objectURL = null;

let generatingThumbnails = false;



/* =========================
   VIDEO LOAD
========================= */

videoInput.addEventListener(
  "change",
  async function () {

    const file =
      this.files[0];

    if (!file) return;


    if (objectURL) {
      URL.revokeObjectURL(objectURL);
    }


    objectURL =
      URL.createObjectURL(file);

    video.src =
      objectURL;


    editor.classList.remove(
      "hidden"
    );


    video.addEventListener(
      "loadedmetadata",
      handleVideoLoaded,
      {
        once: true
      }
    );

  }
);


async function handleVideoLoaded() {

  videoDuration =
    video.duration;


  segments = [
    {
      id: createId(),
      start: 0,
      end: videoDuration
    }
  ];


  selectedSegmentId =
    null;


  currentSegmentIndex =
    0;


  currentTimeText.textContent =
    formatTime(0);

  totalTimeText.textContent =
    formatTime(videoDuration);


  renderSegments();

  updatePlayhead(0);


  generatingThumbnails =
    true;

  thumbnails =
    await createThumbnails();

  generatingThumbnails =
    false;


  renderSegments();


  video.currentTime = 0;

}



/* =========================
   THUMBNAILS
========================= */

async function createThumbnails() {

  const results = [];

  const numberOfFrames =
    Math.min(
      30,
      Math.max(
        12,
        Math.ceil(
          videoDuration / 3
        )
      )
    );


  const canvas =
    document.createElement(
      "canvas"
    );

  const ctx =
    canvas.getContext("2d");


  canvas.width = 180;

  canvas.height = 100;


  const oldTime =
    video.currentTime;


  for (
    let i = 0;
    i < numberOfFrames;
    i++
  ) {

    const time =
      videoDuration *
      (
        i /
        numberOfFrames
      );


    try {

      await seekVideo(time);


      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );


      results.push({
        time,
        image:
          canvas.toDataURL(
            "image/jpeg",
            0.65
          )
      });

    } catch (error) {

      console.log(
        "Thumbnail error",
        error
      );

    }

  }


  video.currentTime =
    Math.min(
      oldTime,
      videoDuration
    );


  return results;

}


function seekVideo(time) {

  return new Promise(
    (resolve) => {

      const done = () => {

        video.removeEventListener(
          "seeked",
          done
        );

        resolve();

      };


      video.addEventListener(
        "seeked",
        done
      );


      video.currentTime =
        Math.min(
          time,
          Math.max(
            0,
            video.duration - 0.05
          )
        );

    }
  );

}



/* =========================
   SEGMENTS
========================= */

function renderSegments() {

  segmentsContainer.innerHTML = "";


  const editedDuration =
    getEditedDuration();


  if (!editedDuration) {
    return;
  }


  segments.forEach(
    (segment, index) => {

      const duration =
        segment.end -
        segment.start;


      const element =
        document.createElement(
          "div"
        );


      element.className =
        "segment";


      element.dataset.id =
        segment.id;


      if (
        segment.id ===
        selectedSegmentId
      ) {

        element.classList.add(
          "selected"
        );

      }


      element.style.width =
        (
          duration /
          editedDuration *
          100
        ) + "%";


      const segmentThumbs =
        thumbnails.filter(
          frame =>
            frame.time >=
              segment.start &&
            frame.time <=
              segment.end
        );


      if (
        segmentThumbs.length
      ) {

        segmentThumbs.forEach(
          frame => {

            const img =
              document.createElement(
                "img"
              );

            img.src =
              frame.image;

            element.appendChild(
              img
            );

          }
        );

      } else {

        const empty =
          document.createElement(
            "div"
          );

        empty.className =
          "segment-empty";

        element.appendChild(
          empty
        );

      }


      element.addEventListener(
        "click",
        function (event) {

          event.stopPropagation();

          selectSegment(
            segment.id
          );

        }
      );


      segmentsContainer.appendChild(
        element
      );

    }
  );


  deleteBtn.disabled =
    selectedSegmentId ===
    null;

}



/* =========================
   TIMELINE TAP / SEEK
========================= */

timeline.addEventListener(
  "click",
  function (event) {

    if (!segments.length) {
      return;
    }


    const rect =
      timeline.getBoundingClientRect();


    const x =
      Math.max(
        0,
        Math.min(
          event.clientX -
          rect.left,
          rect.width
        )
      );


    const ratio =
      x /
      rect.width;


    const editedTime =
      ratio *
      getEditedDuration();


    seekEditedTime(
      editedTime
    );

  }
);



function seekEditedTime(
  editedTime
) {

  let cursor = 0;


  for (
    let i = 0;
    i < segments.length;
    i++
  ) {

    const segment =
      segments[i];

    const duration =
      segment.end -
      segment.start;


    if (
      editedTime <=
      cursor + duration
    ) {

      const localTime =
        editedTime -
        cursor;


      currentSegmentIndex =
        i;


      video.currentTime =
        Math.min(
          segment.start +
          localTime,
          segment.end -
          0.01
        );


      updatePlayhead(
        editedTime
      );


      currentTimeText.textContent =
        formatTime(
          editedTime
        );


      return;

    }


    cursor += duration;

  }

}



/* =========================
   SELECT
========================= */

function selectSegment(id) {

  selectedSegmentId = id;

  renderSegments();

}



/* =========================
   SPLIT
========================= */

splitBtn.addEventListener(
  "click",
  function () {

    if (!segments.length) {
      return;
    }


    const sourceTime =
      video.currentTime;


    const index =
      segments.findIndex(
        segment =>
          sourceTime >
            segment.start &&
          sourceTime <
            segment.end
      );


    if (index === -1) {
      return;
    }


    const segment =
      segments[index];


    const minLength =
      0.08;


    if (
      sourceTime -
      segment.start <
      minLength
    ) {

      return;
    }


    if (
      segment.end -
      sourceTime <
      minLength
    ) {

      return;
    }


    const first =
      {
        id: createId(),
        start: segment.start,
        end: sourceTime
      };


    const second =
      {
        id: createId(),
        start: sourceTime,
        end: segment.end
      };


    segments.splice(
      index,
      1,
      first,
      second
    );


    selectedSegmentId =
      second.id;


    currentSegmentIndex =
      index + 1;


    renderSegments();

    updatePlayheadFromSourceTime();

  }
);



/* =========================
   DELETE
========================= */

deleteBtn.addEventListener(
  "click",
  function () {

    if (
      selectedSegmentId ===
      null
    ) {

      return;

    }


    if (
      segments.length === 1
    ) {

      alert(
        "You can't delete the whole video."
      );

      return;

    }


    const index =
      segments.findIndex(
        segment =>
          segment.id ===
          selectedSegmentId
      );


    if (index === -1) {
      return;
    }


    const wasPlaying =
      !video.paused;


    video.pause();


    segments.splice(
      index,
      1
    );


    selectedSegmentId =
      null;


    currentSegmentIndex =
      Math.min(
        index,
        segments.length - 1
      );


    const next =
      segments[
        currentSegmentIndex
      ];


    video.currentTime =
      next.start;


    renderSegments();

    updatePlayheadFromSourceTime();


    totalTimeText.textContent =
      formatTime(
        getEditedDuration()
      );


    if (wasPlaying) {
      playEditedVideo();
    }

  }
);



/* =========================
   PLAY / PAUSE
========================= */

playBtn.addEventListener(
  "click",
  togglePlay
);


video.addEventListener(
  "click",
  togglePlay
);


function togglePlay() {

  if (!segments.length) {
    return;
  }


  if (video.paused) {

    playEditedVideo();

  } else {

    video.pause();

  }

}


function playEditedVideo() {

  let index =
    getCurrentSegmentIndex();


  if (index === -1) {

    index = 0;

    video.currentTime =
      segments[0].start;

  }


  currentSegmentIndex =
    index;


  const segment =
    segments[
      currentSegmentIndex
    ];


  if (
    video.currentTime >=
      segment.end - 0.02
  ) {

    video.currentTime =
      segment.start;

  }


  video.play();

}



/* =========================
   PLAYBACK LOGIC
========================= */

video.addEventListener(
  "play",
  function () {

    videoBox.classList.add(
      "playing"
    );

    playBtn.textContent =
      "❚❚";

  }
);


video.addEventListener(
  "pause",
  function () {

    videoBox.classList.remove(
      "playing"
    );

    playBtn.textContent =
      "▶";

  }
);


video.addEventListener(
  "timeupdate",
  function () {

    if (
      !segments.length ||
      generatingThumbnails
    ) {

      return;

    }


    const index =
      getCurrentSegmentIndex();


    if (index === -1) {

      return;

    }


    currentSegmentIndex =
      index;


    const segment =
      segments[index];


    if (
      !video.paused &&
      video.currentTime >=
        segment.end - 0.035
    ) {

      if (
        index <
        segments.length - 1
      ) {

        currentSegmentIndex =
          index + 1;


        video.currentTime =
          segments[
            currentSegmentIndex
          ].start;


        video.play();

      } else {

        video.pause();

        currentSegmentIndex =
          0;

        video.currentTime =
          segments[0].start;

      }

    }


    updatePlayheadFromSourceTime();

  }
);



/* =========================
   PLAYHEAD
========================= */

function updatePlayheadFromSourceTime() {

  const index =
    getCurrentSegmentIndex();


  if (index === -1) {
    return;
  }


  let editedTime = 0;


  for (
    let i = 0;
    i < index;
    i++
  ) {

    editedTime +=
      segments[i].end -
      segments[i].start;

  }


  editedTime +=
    Math.max(
      0,
      video.currentTime -
      segments[index].start
    );


  updatePlayhead(
    editedTime
  );


  currentTimeText.textContent =
    formatTime(
      editedTime
    );

}


function updatePlayhead(
  editedTime
) {

  const duration =
    getEditedDuration();


  if (!duration) {
    return;
  }


  const percent =
    Math.max(
      0,
      Math.min(
        100,
        editedTime /
        duration *
        100
      )
    );


  playhead.style.left =
    percent + "%";

}



/* =========================
   HELPERS
========================= */

function getCurrentSegmentIndex() {

  const time =
    video.currentTime;


  return segments.findIndex(
    segment =>
      time >=
        segment.start - 0.03 &&
      time <=
        segment.end + 0.03
  );

}


function getEditedDuration() {

  return segments.reduce(
    (total, segment) => {

      return total +
        (
          segment.end -
          segment.start
        );

    },
    0
  );

}


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {

    return "00:00";

  }


  seconds =
    Math.max(
      0,
      seconds
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
    String(minutes)
      .padStart(2, "0") +
    ":" +
    String(secs)
      .padStart(2, "0")
  );

}


function createId() {

  return (
    Date.now()
      .toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );

}

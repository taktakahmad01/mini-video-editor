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


let objectURL = null;

let sourceDuration = 0;

let segments = [];

let thumbnails = [];

let selectedSegmentId = null;

let currentSegmentIndex = 0;

let draggingPlayhead = false;

let generatingThumbnails = false;

let ignoreNextTimelineClick = false;


/* =========================================
   LOAD VIDEO
========================================= */

videoInput.addEventListener(
  "change",
  function () {

    const file =
      this.files &&
      this.files[0];

    if (!file) return;


    if (objectURL) {
      URL.revokeObjectURL(
        objectURL
      );
    }


    objectURL =
      URL.createObjectURL(file);


    video.pause();

    video.src = "";


    video.onloadedmetadata =
      async function () {

        sourceDuration =
          video.duration;


        segments = [
          {
            id: makeId(),
            start: 0,
            end: sourceDuration
          }
        ];


        selectedSegmentId =
          null;

        currentSegmentIndex =
          0;


        thumbnails = [];


        editor.classList.remove(
          "hidden"
        );


        video.currentTime = 0;


        updateTimeUI(0);

        renderSegments();

        setPlayheadPercent(0);


        generatingThumbnails =
          true;


        thumbnails =
          await generateThumbnails();


        generatingThumbnails =
          false;


        renderSegments();

        seekEditedTime(0);

      };


    video.onerror =
      function () {

        alert(
          "Video ma9darch yt7ell. Jarrab MP4."
        );

      };


    video.src =
      objectURL;

    video.load();

  }
);


/* =========================================
   THUMBNAILS
========================================= */

async function generateThumbnails() {

  const results = [];


  const count =
    Math.min(
      24,
      Math.max(
        10,
        Math.ceil(
          sourceDuration / 2.5
        )
      )
    );


  const canvas =
    document.createElement(
      "canvas"
    );


  const ctx =
    canvas.getContext("2d");


  canvas.width = 160;
  canvas.height = 90;


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const time =
      (
        sourceDuration *
        i
      ) /
      count;


    try {

      await seekSourceVideo(
        time
      );


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
        "Thumbnail:",
        error
      );

    }

  }


  return results;

}


function seekSourceVideo(time) {

  return new Promise(
    resolve => {

      const safeTime =
        Math.min(
          Math.max(
            0,
            time
          ),
          Math.max(
            0,
            sourceDuration -
            0.05
          )
        );


      if (
        Math.abs(
          video.currentTime -
          safeTime
        ) <
        0.01
      ) {

        resolve();

        return;

      }


      const done =
        function () {

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
        safeTime;

    }
  );

}


/* =========================================
   RENDER SEGMENTS
========================================= */

function renderSegments() {

  segmentsContainer.innerHTML =
    "";


  const total =
    getEditedDuration();


  if (!total) {
    return;
  }


  segments.forEach(
    segment => {

      const duration =
        segment.end -
        segment.start;


      const element =
        document.createElement(
          "div"
        );


      element.className =
        "segment";


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
          total *
          100
        ) + "%";


      const segmentFrames =
        thumbnails.filter(
          frame =>
            frame.time >=
              segment.start &&
            frame.time <
              segment.end
        );


      if (
        segmentFrames.length
      ) {

        segmentFrames.forEach(
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

        const placeholder =
          document.createElement(
            "div"
          );


        placeholder.className =
          "segment-placeholder";


        element.appendChild(
          placeholder
        );

      }


      element.addEventListener(
        "click",
        function (event) {

          event.stopPropagation();


          if (
            ignoreNextTimelineClick
          ) {

            ignoreNextTimelineClick =
              false;

            return;

          }


          selectedSegmentId =
            segment.id;


          deleteBtn.disabled =
            false;


          renderSegments();

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


/* =========================================
   PLAY / PAUSE
========================================= */

playBtn.addEventListener(
  "click",
  function (event) {

    event.stopPropagation();

    togglePlayback();

  }
);


video.addEventListener(
  "click",
  togglePlayback
);


function togglePlayback() {

  if (
    !segments.length ||
    generatingThumbnails
  ) {

    return;

  }


  if (video.paused) {

    startEditedPlayback();

  } else {

    video.pause();

  }

}


function startEditedPlayback() {

  let index =
    findSegmentFromSourceTime(
      video.currentTime
    );


  if (index === -1) {

    currentSegmentIndex =
      0;


    video.currentTime =
      segments[0].start;

  } else {

    currentSegmentIndex =
      index;

  }


  const segment =
    segments[
      currentSegmentIndex
    ];


  if (
    video.currentTime >=
      segment.end -
      0.03
  ) {

    video.currentTime =
      segment.start;

  }


  video.play()
    .catch(
      error =>
        console.log(error)
    );

}


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


/* =========================================
   EDITED PLAYBACK
========================================= */

video.addEventListener(
  "timeupdate",
  function () {

    if (
      draggingPlayhead ||
      generatingThumbnails ||
      !segments.length
    ) {

      return;

    }


    let index =
      currentSegmentIndex;


    if (
      index < 0 ||
      index >= segments.length
    ) {

      index =
        findSegmentFromSourceTime(
          video.currentTime
        );

    }


    if (index === -1) {
      return;
    }


    const segment =
      segments[index];


    if (
      !video.paused &&
      video.currentTime >=
        segment.end -
        0.04
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


        return;

      }


      video.pause();


      currentSegmentIndex =
        0;


      video.currentTime =
        segments[0].start;


      updateTimeUI(0);

      setPlayheadPercent(0);


      return;

    }


    const editedTime =
      sourceTimeToEditedTime(
        index,
        video.currentTime
      );


    updateTimeUI(
      editedTime
    );


    setPlayheadFromEditedTime(
      editedTime
    );

  }
);


/* =========================================
   SPLIT
========================================= */

splitBtn.addEventListener(
  "click",
  function () {

    if (!segments.length) {
      return;
    }


    const sourceTime =
      video.currentTime;


    const index =
      findSegmentFromSourceTime(
        sourceTime
      );


    if (index === -1) {
      return;
    }


    const segment =
      segments[index];


    const minimum =
      0.08;


    if (
      sourceTime <=
      segment.start +
      minimum
    ) {

      return;

    }


    if (
      sourceTime >=
      segment.end -
      minimum
    ) {

      return;

    }


    const left = {
      id: makeId(),
      start:
        segment.start,
      end:
        sourceTime
    };


    const right = {
      id: makeId(),
      start:
        sourceTime,
      end:
        segment.end
    };


    segments.splice(
      index,
      1,
      left,
      right
    );


    selectedSegmentId =
      right.id;


    currentSegmentIndex =
      index + 1;


    renderSegments();


    const editedTime =
      sourceTimeToEditedTime(
        currentSegmentIndex,
        sourceTime
      );


    updateTimeUI(
      editedTime
    );


    setPlayheadFromEditedTime(
      editedTime
    );

  }
);


/* =========================================
   DELETE
========================================= */

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
      segments.length <= 1
    ) {

      alert(
        "Ma t9drch tmse7 video kaml."
      );

      return;

    }


    const deleteIndex =
      segments.findIndex(
        segment =>
          segment.id ===
          selectedSegmentId
      );


    if (
      deleteIndex === -1
    ) {

      return;

    }


    video.pause();


    segments.splice(
      deleteIndex,
      1
    );


    selectedSegmentId =
      null;


    currentSegmentIndex =
      Math.min(
        deleteIndex,
        segments.length - 1
      );


    const targetSegment =
      segments[
        currentSegmentIndex
      ];


    video.currentTime =
      targetSegment.start;


    renderSegments();


    const editedTime =
      getEditedTimeAtSegmentStart(
        currentSegmentIndex
      );


    updateTimeUI(
      editedTime
    );


    setPlayheadFromEditedTime(
      editedTime
    );

  }
);


/* =========================================
   TIMELINE TAP
========================================= */

timeline.addEventListener(
  "click",
  function (event) {

    if (
      draggingPlayhead ||
      ignoreNextTimelineClick
    ) {

      ignoreNextTimelineClick =
        false;

      return;

    }


    const editedTime =
      pointerToEditedTime(
        event.clientX
      );


    seekEditedTime(
      editedTime
    );

  }
);


/* =========================================
   DRAG PLAYHEAD
========================================= */

playhead.addEventListener(
  "pointerdown",
  startDragging
);


function startDragging(event) {

  if (!segments.length) {
    return;
  }


  event.preventDefault();
  event.stopPropagation();


  draggingPlayhead =
    true;


  ignoreNextTimelineClick =
    true;


  video.pause();


  playhead.classList.add(
    "dragging"
  );


  try {

    playhead.setPointerCapture(
      event.pointerId
    );

  } catch (error) {}


  movePlayheadFromPointer(
    event.clientX
  );

}


playhead.addEventListener(
  "pointermove",
  function (event) {

    if (
      !draggingPlayhead
    ) {

      return;

    }


    event.preventDefault();


    movePlayheadFromPointer(
      event.clientX
    );

  }
);


playhead.addEventListener(
  "pointerup",
  stopDragging
);


playhead.addEventListener(
  "pointercancel",
  stopDragging
);


function stopDragging(event) {

  if (
    !draggingPlayhead
  ) {

    return;

  }


  draggingPlayhead =
    false;


  playhead.classList.remove(
    "dragging"
  );


  try {

    playhead.releasePointerCapture(
      event.pointerId
    );

  } catch (error) {}

}


function movePlayheadFromPointer(
  clientX
) {

  const editedTime =
    pointerToEditedTime(
      clientX
    );


  seekEditedTime(
    editedTime
  );

}


/* =========================================
   SEEK EDITED VIDEO
========================================= */

function seekEditedTime(
  editedTime
) {

  const total =
    getEditedDuration();


  editedTime =
    Math.max(
      0,
      Math.min(
        editedTime,
        total
      )
    );


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


    const segmentEndEdited =
      cursor +
      duration;


    if (
      editedTime <=
      segmentEndEdited ||
      i ===
      segments.length - 1
    ) {

      let localTime =
        editedTime -
        cursor;


      localTime =
        Math.max(
          0,
          Math.min(
            localTime,
            duration
          )
        );


      currentSegmentIndex =
        i;


      let sourceTime =
        segment.start +
        localTime;


      if (
        sourceTime >=
        segment.end
      ) {

        sourceTime =
          Math.max(
            segment.start,
            segment.end -
            0.015
          );

      }


      video.currentTime =
        sourceTime;


      updateTimeUI(
        editedTime
      );


      setPlayheadFromEditedTime(
        editedTime
      );


      return;

    }


    cursor +=
      duration;

  }

}


/* =========================================
   TIME
========================================= */

function updateTimeUI(
  editedCurrentTime
) {

  currentTimeText.textContent =
    formatTime(
      editedCurrentTime
    );


  totalTimeText.textContent =
    formatTime(
      getEditedDuration()
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


/* =========================================
   PLAYHEAD UI
========================================= */

function setPlayheadFromEditedTime(
  editedTime
) {

  const total =
    getEditedDuration();


  if (!total) {

    setPlayheadPercent(0);

    return;

  }


  const percentage =
    (
      editedTime /
      total
    ) *
    100;


  setPlayheadPercent(
    percentage
  );

}


function setPlayheadPercent(
  percentage
) {

  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );


  playhead.style.left =
    percentage + "%";

}


/* =========================================
   CONVERSION FUNCTIONS
========================================= */

function pointerToEditedTime(
  clientX
) {

  const rect =
    timeline.getBoundingClientRect();


  const x =
    Math.max(
      0,
      Math.min(
        clientX -
        rect.left,
        rect.width
      )
    );


  const ratio =
    x /
    rect.width;


  return (
    ratio *
    getEditedDuration()
  );

}


function sourceTimeToEditedTime(
  segmentIndex,
  sourceTime
) {

  let editedTime =
    getEditedTimeAtSegmentStart(
      segmentIndex
    );


  editedTime +=
    Math.max(
      0,
      sourceTime -
      segments[
        segmentIndex
      ].start
    );


  return editedTime;

}


function getEditedTimeAtSegmentStart(
  index
) {

  let time = 0;


  for (
    let i = 0;
    i < index;
    i++
  ) {

    time +=
      segments[i].end -
      segments[i].start;

  }


  return time;

}


/* =========================================
   SEGMENT HELPERS
========================================= */

function findSegmentFromSourceTime(
  sourceTime
) {

  for (
    let i = 0;
    i < segments.length;
    i++
  ) {

    const segment =
      segments[i];


    if (
      sourceTime >=
        segment.start -
        0.02 &&
      sourceTime <=
        segment.end +
        0.02
    ) {

      return i;

    }

  }


  return -1;

}


function getEditedDuration() {

  return segments.reduce(
    (
      total,
      segment
    ) => {

      return (
        total +
        (
          segment.end -
          segment.start
        )
      );

    },
    0
  );

}


function makeId() {

  return (
    Date.now()
      .toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );

}

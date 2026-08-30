const videoInput = document.getElementById("videoInput");
const editor = document.getElementById("editor");
const video = document.getElementById("video");
const videoBox = document.querySelector(".video-box");
const playBtn = document.getElementById("playBtn");
const timeline = document.getElementById("timeline");
const segmentsContainer = document.getElementById("segments");
const playhead = document.getElementById("playhead");
const splitBtn = document.getElementById("splitBtn");
const deleteBtn = document.getElementById("deleteBtn");
const currentTimeText = document.getElementById("currentTime");
const totalTimeText = document.getElementById("totalTime");

let segments = [];
let selectedSegmentId = null;
let thumbnails = [];
let videoDuration = 0;
let objectURL = null;

/* =========================
   LOAD VIDEO
========================= */

videoInput.addEventListener("change", function () {
  const file = this.files && this.files[0];

  if (!file) return;

  if (objectURL) {
    URL.revokeObjectURL(objectURL);
  }

  objectURL = URL.createObjectURL(file);

  editor.classList.remove("hidden");

  video.onloadedmetadata = async function () {
    videoDuration = video.duration;

    segments = [
      {
        id: createId(),
        start: 0,
        end: videoDuration
      }
    ];

    selectedSegmentId = null;

    currentTimeText.textContent = formatTime(0);
    totalTimeText.textContent = formatTime(videoDuration);

    renderSegments();
    updatePlayhead(0);

    thumbnails = await createThumbnails();

    renderSegments();

    video.currentTime = 0;
  };

  video.onerror = function () {
    alert("Had video ma9darch yt7ell. Jarrab MP4.");
  };

  video.src = objectURL;
  video.load();
});

/* =========================
   THUMBNAILS
========================= */

async function createThumbnails() {
  const results = [];

  const frameCount = Math.min(
    20,
    Math.max(8, Math.ceil(videoDuration / 3))
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 160;
  canvas.height = 90;

  for (let i = 0; i < frameCount; i++) {
    const time = (videoDuration * i) / frameCount;

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
        image: canvas.toDataURL("image/jpeg", 0.6)
      });
    } catch (e) {
      console.log(e);
    }
  }

  return results;
}

function seekVideo(time) {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };

    video.addEventListener("seeked", done);

    video.currentTime = Math.min(
      time,
      Math.max(0, videoDuration - 0.05)
    );
  });
}

/* =========================
   SEGMENTS
========================= */

function renderSegments() {
  segmentsContainer.innerHTML = "";

  const total = getEditedDuration();

  segments.forEach((segment) => {
    const el = document.createElement("div");

    el.className = "segment";

    if (segment.id === selectedSegmentId) {
      el.classList.add("selected");
    }

    const duration = segment.end - segment.start;

    el.style.width = ((duration / total) * 100) + "%";

    const frames = thumbnails.filter(
      frame =>
        frame.time >= segment.start &&
        frame.time <= segment.end
    );

    if (frames.length) {
      frames.forEach((frame) => {
        const img = document.createElement("img");
        img.src = frame.image;
        el.appendChild(img);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "segment-empty";
      el.appendChild(empty);
    }

    el.addEventListener("click", function (e) {
      e.stopPropagation();

      selectedSegmentId = segment.id;
      renderSegments();

      deleteBtn.disabled = false;
    });

    segmentsContainer.appendChild(el);
  });

  deleteBtn.disabled = !selectedSegmentId;
}

/* =========================
   TIMELINE SEEK
========================= */

timeline.addEventListener("click", function (event) {
  if (!segments.length) return;

  const rect = timeline.getBoundingClientRect();

  const x = Math.max(
    0,
    Math.min(event.clientX - rect.left, rect.width)
  );

  const editedTime =
    (x / rect.width) * getEditedDuration();

  seekEditedTime(editedTime);
});

function seekEditedTime(editedTime) {
  let cursor = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    const duration =
      segment.end - segment.start;

    if (editedTime <= cursor + duration) {
      const local = editedTime - cursor;

      video.currentTime = Math.min(
        segment.start + local,
        segment.end - 0.01
      );

      updatePlayhead(editedTime);

      currentTimeText.textContent =
        formatTime(editedTime);

      return;
    }

    cursor += duration;
  }
}

/* =========================
   SPLIT
========================= */

splitBtn.addEventListener("click", function () {
  if (!segments.length) return;

  const t = video.currentTime;

  const index = segments.findIndex(
    segment =>
      t > segment.start + 0.05 &&
      t < segment.end - 0.05
  );

  if (index === -1) return;

  const segment = segments[index];

  const first = {
    id: createId(),
    start: segment.start,
    end: t
  };

  const second = {
    id: createId(),
    start: t,
    end: segment.end
  };

  segments.splice(
    index,
    1,
    first,
    second
  );

  selectedSegmentId = second.id;

  renderSegments();
  updatePlayheadFromSourceTime();
});

/* =========================
   DELETE
========================= */

deleteBtn.addEventListener("click", function () {
  if (!selectedSegmentId) return;

  if (segments.length <= 1) {
    alert("Ma t9drch tmse7 video kaml.");
    return;
  }

  const index = segments.findIndex(
    segment =>
      segment.id === selectedSegmentId
  );

  if (index === -1) return;

  video.pause();

  segments.splice(index, 1);

  selectedSegmentId = null;

  const nextIndex = Math.min(
    index,
    segments.length - 1
  );

  video.currentTime =
    segments[nextIndex].start;

  renderSegments();

  totalTimeText.textContent =
    formatTime(getEditedDuration());

  updatePlayheadFromSourceTime();
});

/* =========================
   PLAY
========================= */

playBtn.addEventListener("click", togglePlay);
video.addEventListener("click", togglePlay);

function togglePlay() {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

video.addEventListener("play", function () {
  videoBox.classList.add("playing");
});

video.addEventListener("pause", function () {
  videoBox.classList.remove("playing");
});

video.addEventListener("timeupdate", function () {
  if (!segments.length) return;

  const index = segments.findIndex(
    segment =>
      video.currentTime >= segment.start &&
      video.currentTime <= segment.end
  );

  if (index === -1) return;

  const segment = segments[index];

  if (
    !video.paused &&
    video.currentTime >= segment.end - 0.04
  ) {
    if (index < segments.length - 1) {
      video.currentTime =
        segments[index + 1].start;
    } else {
      video.pause();
    }
  }

  updatePlayheadFromSourceTime();
});

/* =========================
   PLAYHEAD
========================= */

function updatePlayheadFromSourceTime() {
  let edited = 0;

  for (const segment of segments) {
    if (
      video.currentTime >= segment.start &&
      video.currentTime <= segment.end
    ) {
      edited +=
        video.currentTime -
        segment.start;

      break;
    }

    edited +=
      segment.end -
      segment.start;
  }

  updatePlayhead(edited);

  currentTimeText.textContent =
    formatTime(edited);
}

function updatePlayhead(time) {
  const total = getEditedDuration();

  if (!total) return;

  const percent =
    Math.max(
      0,
      Math.min(100, (time / total) * 100)
    );

  playhead.style.left =
    percent + "%";
}

/* =========================
   HELPERS
========================= */

function getEditedDuration() {
  return segments.reduce(
    (sum, segment) =>
      sum +
      (segment.end - segment.start),
    0
  );
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return (
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}

function createId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

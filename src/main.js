const videoInput = document.getElementById("videoInput");
const video = document.getElementById("video");
const exportBtn = document.getElementById("exportBtn");
const status = document.getElementById("status");

let file = null;

videoInput.addEventListener("change", () => {
  file = videoInput.files[0];

  if (!file) return;

  video.src = URL.createObjectURL(file);

  status.textContent = "Video ready";
});

exportBtn.addEventListener("click", async () => {

  if (!file) {
    alert("Choose a video first");
    return;
  }

  status.textContent = "Exporting...";

  const formData = new FormData();

  formData.append("video", file);

  try {

    const response = await fetch(
      "BACKEND_URL/export",
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "export-test.mp4";

    document.body.appendChild(a);

    a.click();

    a.remove();

    status.textContent = "Done ✓";

  } catch (error) {

    console.error(error);

    status.textContent = "Export failed";

  }

});

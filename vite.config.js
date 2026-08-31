import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/mini-video-editor/",

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        editor: resolve(__dirname, "editor.html"),
        loadTest: resolve(__dirname, "load-test.html")
      }
    }
  }
});

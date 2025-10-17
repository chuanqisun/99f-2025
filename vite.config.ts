import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/99f-2025/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        certificate: resolve(__dirname, "certificate.html"),
        details: resolve(__dirname, "details.html"),
        host: resolve(__dirname, "host.html"),
        humanVow: resolve(__dirname, "human-vow.html"),
      },
    },
  },
});

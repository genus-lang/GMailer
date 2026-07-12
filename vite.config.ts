import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { crx } from "@crxjs/vite-plugin"
import fs from "fs"

const manifest = JSON.parse(fs.readFileSync("./manifest.json", "utf-8"))

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __LIVE_RELOAD__: JSON.stringify(true),
  },
  server: {
    port: 5173,
    strictPort: true,
    ws: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
})

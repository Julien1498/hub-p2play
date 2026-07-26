import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { githubProxyPlugin } from "./vite-plugins/githubProxyPlugin.ts"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), githubProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

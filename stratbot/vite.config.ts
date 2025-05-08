import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [
      'us-praevius.mms-internal.my.id'
    ]
  },
  // Ensure environment variables are properly loaded
  envPrefix: 'VITE_',
  define: {
    'process.env': {}
  }
})

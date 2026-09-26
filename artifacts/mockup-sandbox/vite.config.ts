import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const developmentPlugins =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        ),
      ]
    : [];

export default defineConfig(({ command }) => {
  const isServe = command === "serve";
  const rawPort = process.env.PORT;
  const port = rawPort ? Number(rawPort) : 5173;
  const basePath = process.env.BASE_PATH ?? "/";

  if (isServe && !rawPort) {
    throw new Error(
      "PORT environment variable is required when running the preview server.",
    );
  }

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  if (isServe && !process.env.BASE_PATH) {
    throw new Error(
      "BASE_PATH environment variable is required when running the preview server.",
    );
  }

  return {
    base: basePath,
    plugins: [
      mockupPreviewPlugin(),
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...developmentPlugins,
    ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});

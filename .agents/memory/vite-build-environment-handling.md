---
name: Vite build-time environment handling
description: Build and dev-server environment behavior for this workspace's Vite configurations
---

Production builds may run without PORT or BASE_PATH, while Replit preview servers require both values. Vite's config typing in this workspace rejects an async defineConfig callback, so development-only dynamic plugins must be initialized at module scope and the command-aware config callback must remain synchronous.

**Why:** The deployment build failed when preview-only environment requirements were evaluated during Vercel's build, and an async config callback then caused TypeScript/config-loading failures.

**How to apply:** When changing Vite configs, validate PORT and BASE_PATH only for serve/preview execution, provide build-time defaults, and preserve a synchronous defineConfig callback.
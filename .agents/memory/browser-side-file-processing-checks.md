---
name: Browser-side file processing checks
description: Environment note for validating browser-oriented TypeScript processors from the monorepo.
---

Use Node 24's `--experimental-strip-types` for quick runtime checks of TypeScript processor modules, and run the command from the owning artifact package so its dependencies resolve correctly.

**Why:** The workspace does not include a `tsx` runner by default, and package imports resolve from the current package rather than the repository root when the dependency belongs to an artifact.

**How to apply:** For a local smoke check, change into the artifact directory and run Node with `--experimental-strip-types`; keep the check outside the shipped app.
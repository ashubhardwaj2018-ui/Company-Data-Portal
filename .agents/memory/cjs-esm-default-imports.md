---
name: CJS/ESM default-import quirk
description: CJS packages (sax, xlsx) must be default-imported or their functions are undefined at runtime
---
Rule: In this ESM project, CommonJS packages like `sax` and `xlsx` must be imported as `import lib from "pkg"; const pkg = lib as any` — `import * as pkg` compiles but leaves functions like `xlsx.readFile` undefined at runtime.

**Why:** `import * as xlsx from "xlsx"` silently broke all CSV/Excel imports ("xlsx.readFile is not a function"); same failure earlier with sax.

**How to apply:** Whenever adding/using a CJS dependency, use a default import. If a "X is not a function" runtime error appears for a library call, check the import style first.

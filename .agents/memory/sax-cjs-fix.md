---
name: sax CJS/ESM import fix
description: The sax npm package must be imported with a two-step pattern to avoid ESM/CJS interop failures in tsx.
---

```ts
import saxLib from "sax";
const sax = saxLib as any;
```

**Why:** `sax` is a CommonJS package. Direct named imports or `import { createStream } from "sax"` fail at runtime under tsx's ESM mode. The default import + cast works around the interop boundary.

**How to apply:** Any file that uses the sax streaming parser must use this exact import pattern. Do not attempt `import * as sax from "sax"` either — it also fails.

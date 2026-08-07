---
name: react-helmet-async JSX constraints
description: Two non-obvious rules for using Helmet in this codebase that cause Babel parse errors if broken.
---

1. **Helmet must be the first child inside the outermost `<div>`, not wrapped in a fragment.** Wrapping in `<>...</>` causes Babel to misparse the file end and throw a parse error.

2. **JSON-LD `<script>` inside `<Helmet>` must use `dangerouslySetInnerHTML`.** A JSX expression child (`{JSON.stringify(data)}`) inside a `<script>` tag causes a Babel JSX parse error. Correct pattern:
   ```tsx
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
   ```

**Why:** Babel's JSX transform has edge cases with script tag children and fragment-wrapped Helmet components in this particular project setup (vite + react-helmet-async + dedupe config).

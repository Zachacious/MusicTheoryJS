---
"musictheoryjs": patch
---

Types now resolve under `"moduleResolution": "node16"` and `"nodenext"`.
Before this, `import { Note } from "musictheoryjs"` (and every other named
export, from the main entry and from subpaths like `musictheoryjs/note`)
failed with TS2305 "has no exported member", because the published `.d.ts`
files used relative imports without file extensions. CommonJS projects also
get their own `.d.cts` declarations through the `require` condition, which
fixes TS1479 when `require`-ing the package under `node16`. The JavaScript
output is unchanged.

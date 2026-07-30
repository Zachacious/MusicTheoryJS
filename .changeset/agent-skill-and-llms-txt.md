---
"musictheoryjs": patch
---

The package now ships an Agent Skill (`skills/musictheoryjs/SKILL.md`) — a
distilled v3 reference an AI coding assistant loads so it writes real
MusicTheoryJS code instead of guessing from stale training data. Copy it into
a Claude Code project with
`cp -r node_modules/musictheoryjs/skills/musictheoryjs .claude/skills/`; any
tool that reads `SKILL.md` files works the same way. Every code snippet in the
skill executes in CI alongside the README and guides.

The docs site also publishes the guides in the llms.txt format —
https://musictheoryjs.com/llms.txt (index), /llms-full.txt (every guide in
one file), and /llms-small.txt (abridged) — generated from the guides at
build time, plus a new "AI assistants" guide covering both. The site itself
moved to current Astro and Starlight as part of this.

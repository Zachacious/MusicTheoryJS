---
title: AI assistants
description: Install the Agent Skill and point AI tools at llms.txt so generated code targets the real v3 API.
---

MusicTheoryJS v3 is newer than most models' training data. Asked cold, an AI
coding assistant will guess: it produces v2 calls, or an API that never
existed. The project ships two things that fix this — an Agent Skill for
coding agents, and the docs in the llms.txt format for everything else.

## The Agent Skill

An Agent Skill is a folder holding a `SKILL.md` file that an agent loads when
a task calls for it. Ours condenses the whole library — the module map, the
core idioms, the traps — into a reference the agent reads before writing
MusicTheoryJS code.

The skill ships inside the npm package, so once the package is installed you
already have a copy that matches your installed version. In a Claude Code
project:

```bash
cp -r node_modules/musictheoryjs/skills/musictheoryjs .claude/skills/
```

Use `~/.claude/skills/` instead to install it once for every project. To grab
it without installing the package, fetch it from the repository:

```bash
npx degit Zachacious/MusicTheoryJS/skills/musictheoryjs .claude/skills/musictheoryjs
```

Other tools that support Agent Skills work the same way — the folder is plain
markdown, nothing in it is specific to one product.

The skill is documentation, so it is held to the same standard as the rest:
every code snippet in it executes in CI, and a wrong `// =>` comment fails
the build. What the skill teaches is what the library does.

## llms.txt

The site publishes its guides in the [llms.txt](https://llmstxt.org/) format,
for AI tools that read documentation from the web:

- [`/llms.txt`](https://musictheoryjs.com/llms.txt) — the index: a short
  orientation for the library plus links to the files below.
- [`/llms-full.txt`](https://musictheoryjs.com/llms-full.txt) — every guide's
  complete text in one file, for tools that prefer a single fetch.
- [`/llms-small.txt`](https://musictheoryjs.com/llms-small.txt) — the same,
  abridged for smaller context windows.

All three are generated from the guides at build time, so they can't fall
out of date.

## If you're not using an agent at all

Nothing here is required. The [guides](/guides/getting-started/) and the
[API reference](/api/) are written for people first — the skill and llms.txt
are the same material, packaged for a different reader.

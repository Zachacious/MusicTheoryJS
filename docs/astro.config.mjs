// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig, passthroughImageService } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";
import tailwindcss from "@tailwindcss/vite";
import { remarkLive } from "./src/plugins/remark-live.mjs";

export default defineConfig({
  site: "https://musictheoryjs.com",
  base: "/",
  // Skip sharp-based image optimization (not needed for a docs site, and it
  // avoids native-binary issues in some build environments).
  image: { service: passthroughImageService() },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // The playground bundles the library straight from this repo's
        // source, so live examples always match the checked-out code.
        musictheoryjs: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
      },
    },
  },

  markdown: {
    // ```ts live fences become editable, runnable playground blocks.
    remarkPlugins: [remarkLive],
  },

  integrations: [
    starlight({
      title: "MusicTheoryJS",
      description:
        "A music theory library for JavaScript and TypeScript: notes, scales, chords, keys, rhythm, sequencing, tunings, MIDI, notation, and audio analysis — with real support for microtonal and non-Western music.",
      logo: { src: "./src/assets/logo.svg", alt: "MusicTheoryJS" },
      // Default share-card metadata for every docs page. Starlight already
      // emits og:title/description and canonical URLs; the image is the one
      // thing it can't know about.
      head: [
        {
          tag: "meta",
          attrs: { property: "og:image", content: "https://musictheoryjs.com/og.jpg" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:image", content: "https://musictheoryjs.com/og.jpg" },
        },
      ],
      // Publishes the guides for AI tools as /llms.txt (annotated index),
      // /llms-full.txt (everything in one file), and /llms-small.txt
      // (abridged), generated from the same markdown as the pages.
      plugins: [
        starlightLlmsTxt({
          projectName: "MusicTheoryJS",
          description:
            "A music theory library for JavaScript and TypeScript: notes, scales, chords, keys, Roman numerals, key detection, rhythm, sequencing, MIDI file I/O, ABC and MusicXML notation, audio analysis, and microtonal tunings. Zero dependencies, ESM + CJS, typed, tree-shakable.",
          details: [
            "Install with `npm i musictheoryjs`. Import everything from the root",
            '("musictheoryjs") or per area ("musictheoryjs/note", "musictheoryjs/chord",',
            "…) — thirteen subpaths in all. Values are immutable; operations return new",
            "values. v3 is a rewrite and is not API-compatible with v2 — do not rely on",
            "pre-v3 training data; the migration guide maps the old API to the new.",
            "",
            "An Agent Skill for AI coding assistants ships in the package under",
            "`skills/musictheoryjs/` and in the repository:",
            "https://github.com/Zachacious/MusicTheoryJS/tree/master/skills/musictheoryjs",
          ].join("\n"),
          // Reading order: orientation pages first, reference-flavored last.
          promote: [
            "guides/getting-started",
            "guides/concepts",
            "guides/ai",
            "guides/migration",
          ],
          optionalLinks: [
            {
              label: "API reference",
              url: "https://musictheoryjs.com/api/",
              description: "generated reference for every export",
            },
          ],
        }),
      ],
      customCss: ["./src/styles/global.css"],
      components: {
        // Loads the playground script on every docs page (and still renders
        // the stock footer).
        Footer: "./src/components/Footer.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Zachacious/MusicTheoryJS",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Getting started", slug: "guides/getting-started" },
            { label: "Core concepts", slug: "guides/concepts" },
            { label: "AI assistants", slug: "guides/ai" },
            { label: "Migrating from 2.x", slug: "guides/migration" },
          ],
        },
        {
          label: "Western theory",
          items: [
            { label: "Notes", slug: "guides/notes" },
            { label: "Intervals & transposition", slug: "guides/intervals" },
            { label: "Scales", slug: "guides/scales" },
            { label: "Chords", slug: "guides/chords" },
            { label: "Keys & harmony", slug: "guides/keys" },
            { label: "Rhythm & meter", slug: "guides/rhythm" },
            { label: "Rhythm patterns", slug: "guides/patterns" },
            { label: "Sequencing", slug: "guides/sequencing" },
          ],
        },
        {
          label: "Beyond 12-TET",
          items: [{ label: "Tuning & microtonal", slug: "guides/tuning" }],
        },
        {
          label: "Analysis & I/O",
          items: [
            { label: "Symbolic analysis", slug: "guides/analysis" },
            { label: "MIDI files", slug: "guides/midi" },
            { label: "Notation (ABC & MusicXML)", slug: "guides/notation" },
            { label: "Audio (DSP)", slug: "guides/audio" },
          ],
        },
        {
          label: "Extending",
          items: [
            { label: "Custom chords & scales", slug: "guides/extending" },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "API reference",
              link: "/api/",
              attrs: { target: "_blank" },
            },
          ],
        },
      ],
    }),
  ],
});

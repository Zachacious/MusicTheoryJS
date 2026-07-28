// @ts-check
import { defineConfig, passthroughImageService } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://musictheoryjs.com",
  base: "/",
  // Skip sharp-based image optimization (not needed for a docs site, and it
  // avoids native-binary issues in some build environments).
  image: { service: passthroughImageService() },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    starlight({
      title: "MusicTheoryJS",
      description:
        "A music theory library for JavaScript and TypeScript: notes, scales, chords, keys, tunings, MIDI, and audio analysis — with real support for microtonal and non-Western music.",
      logo: { src: "./src/assets/logo.svg", alt: "MusicTheoryJS" },
      customCss: ["./src/styles/global.css"],
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
            { label: "Audio (DSP)", slug: "guides/audio" },
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

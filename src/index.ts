/**
 * MusicTheoryJS - A comprehensive music theory library
 *
 * This is the main entry point that exposes the note and scale modules.
 */

// Re-export everything from the note module
export * from "./note";

// Re-export everything from the scale module
export * from "./scale";

// Add top-level constants and types if needed
export const VERSION = "1.0.0";

/**
 * Library info
 */
export const LIBRARY_INFO = {
  name: "MusicTheoryJS",
  version: VERSION,
  description: "A comprehensive music theory library for JavaScript/TypeScript",
  author: "Your Name",
  license: "MIT",
  repository: "https://github.com/Zachacious/musictheoryjs",
};

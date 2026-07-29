#!/usr/bin/env bash
# Release smoke test: `npm pack` the library, install the tarball into a
# scratch project, and prove that every documented subpath resolves and works
# from ESM `import`, CJS `require`, and TypeScript (node16 + bundler modes).
#
# Run after `bun run build`. Exits non-zero on any failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULES=(core pcset dict chord scale key roman progression harmony micro tuning)

if [ ! -d "$ROOT/dist" ]; then
  echo "dist/ missing — run 'bun run build' first" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> npm pack"
TARBALL="$(cd "$ROOT" && npm pack --silent --pack-destination "$WORK")"
echo "    $TARBALL"

cd "$WORK"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund "./$(basename "$TARBALL")" typescript@5 >/dev/null

subpath_list() {
  printf '"%s", ' "${MODULES[@]}"
}

echo "==> ESM imports (root + every subpath)"
cat > esm-test.mjs <<'EOF'
import { transpose, noteName, chord, VERSION } from "musictheoryjs";
import { note } from "musictheoryjs/core";
import { chromaFromNotes } from "musictheoryjs/pcset";
import { detectChords } from "musictheoryjs/dict";
import { chord as chordSub } from "musictheoryjs/chord";
import { scale } from "musictheoryjs/scale";
import { majorKey } from "musictheoryjs/key";
import { romanToChord } from "musictheoryjs/roman";
import { progressionChords } from "musictheoryjs/progression";
import { detectKeys } from "musictheoryjs/harmony";
import { addCents } from "musictheoryjs/micro";
import { meantoneTuning } from "musictheoryjs/tuning";
import assert from "node:assert";

assert.strictEqual(noteName(transpose("Eb4", "P5")), "Bb4");
assert.deepStrictEqual(chord("Cm7b5").notes, ["C", "Eb", "Gb", "Bb"]);
assert.strictEqual(chordSub("Cmaj7").symbol, chord("Cmaj7").symbol);
assert.strictEqual(noteName(note("f##3")), "F##3");
assert.strictEqual(chromaFromNotes(["C", "E", "G"]), (1 << 0) | (1 << 4) | (1 << 7));
assert.strictEqual(detectChords(["C", "E", "G"])[0].symbol, "C");
assert.deepStrictEqual(scale("D dorian").notes, ["D", "E", "F", "G", "A", "B", "C"]);
assert.strictEqual(majorKey("Eb").alteration, -3);
assert.strictEqual(majorKey("Eb").keySignature, "bbb");
assert.strictEqual(romanToChord("V7/V", "C major").symbol, "D7");
assert.deepStrictEqual(progressionChords("C major", ["ii7", "V7", "Imaj7"]), ["Dm7", "G7", "Cmaj7"]);
assert.strictEqual(detectKeys(["C", "E", "G", "B", "D", "F", "A"])[0].tonic, "C");
assert.ok(addCents("C4", 50).cents === 50);
assert.notStrictEqual(meantoneTuning().offset("G#"), meantoneTuning().offset("Ab"));
assert.ok(/^3\./.test(VERSION));
console.log("    ESM ok");
EOF
node esm-test.mjs

echo "==> CJS requires (root + every subpath)"
cat > cjs-test.cjs <<EOF
const assert = require("node:assert");
const root = require("musictheoryjs");
assert.strictEqual(root.noteName(root.transpose("Eb4", "P5")), "Bb4");
for (const sub of [$(subpath_list)]) {
  const ns = require("musictheoryjs/" + sub);
  assert.ok(Object.keys(ns).length > 0, sub + " exports nothing");
}
assert.strictEqual(require("musictheoryjs/tuning").frequency("A4"), 440);
console.log("    CJS ok");
EOF
node cjs-test.cjs

echo "==> TypeScript resolution (node16 import + require, bundler)"
cat > ts-test.mts <<'EOF'
import { transpose, note, type Pitch } from "musictheoryjs";
import { chord, type Chord } from "musictheoryjs/chord";
import { meantoneTuning, type Tuning } from "musictheoryjs/tuning";
const p: Pitch = transpose(note("C4"), "m3");
const c: Chord = chord("Cm7");
const t: Tuning = meantoneTuning();
export default { p, c, t };
EOF
cat > ts-test.cts <<'EOF'
import mt = require("musictheoryjs");
import harmony = require("musictheoryjs/harmony");
const p: mt.Pitch = mt.note("C4");
const keys: harmony.KeyDetection[] = harmony.detectKeys(["C", "E", "G"]);
export = { p, keys };
EOF
./node_modules/.bin/tsc --strict --noEmit --module node16 --moduleResolution node16 --skipLibCheck ts-test.mts ts-test.cts
cat > ts-bundler.ts <<'EOF'
import { scale } from "musictheoryjs/scale";
import { pitchBend } from "musictheoryjs/tuning";
export const x: readonly string[] = scale("C major").notes;
export const b: number = pitchBend("C4");
EOF
./node_modules/.bin/tsc --strict --noEmit --module esnext --moduleResolution bundler --skipLibCheck ts-bundler.ts

echo "==> UMD build loads (script-tag style: evaluated against a fake window)"
node -e "
const fs = require('fs');
const path = require('path');
const pkg = require('musictheoryjs/package.json');
const umd = path.join(path.dirname(require.resolve('musictheoryjs/package.json')), 'dist/musictheory.umd.min.js');
// Shadow exports/module so the UMD wrapper takes the browser (global) branch.
const fakeWindow = {};
new Function('self', 'window', 'exports', 'module', 'globalThis', fs.readFileSync(umd, 'utf8'))
  .call(fakeWindow, fakeWindow, fakeWindow, undefined, undefined, undefined);
const m = fakeWindow.MusicTheoryJS;
require('node:assert').strictEqual(m.noteName(m.transpose('Eb4', 'P5')), 'Bb4');
console.log('    UMD ok (' + pkg.version + ')');
"

echo "==> smoke test passed"

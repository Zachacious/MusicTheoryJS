---
title: Rhythm & Meter
---

MusicTheoryJS gives time the same footing as pitch: note-value durations with
dots and tuplets, time signatures with compound and irregular meters, bar/beat
positions, and grid quantization for both MIDI ticks and the seconds-based
[`NoteStream`](/guides/analysis/).

Everything here is a plain object — a duration is `{ value, dots, tuplet? }`,
a time signature `{ numerator, denominator }` — and every function also takes
the shorthand string, so `"q."` and `"6/8"` work anywhere.

## Durations

A duration's base value is named by its denominator, the way musicians say
"an eighth": 1 is a whole note, 2 a half, 4 a quarter, down to 128. Strings
parse as a number or name plus trailing dots, `t` for a triplet, and `[a:n]`
for any other tuplet ratio:

```ts
import { parseDuration, durationName, formatDuration } from "musictheoryjs";

parseDuration("q.");    // { value: 4, dots: 1 }
parseDuration("8t");    // { value: 8, dots: 0, tuplet: { actual: 3, normal: 2 } }
parseDuration("16[5:4]"); // a sixteenth quintuplet

durationName("q.");     // "dotted quarter"
durationName("8t");     // "eighth triplet"
formatDuration({ value: 4, dots: 1 }); // "4." — round-trips with parseDuration
```

`duration()` builds the same objects from parts, and `tuplet(n)` picks the
conventional ratio for a tuplet count (3 → 3:2, 5 → 5:4, 7 → 7:4):

```ts
import { duration, tuplet } from "musictheoryjs";

duration("quarter", { dots: 1 }); // { value: 4, dots: 1 }
duration(8, { tuplet: tuplet(3) }); // an eighth-note triplet
```

Convert a duration to whatever unit the task needs — whole notes, beats,
MIDI ticks, or seconds:

```ts
import { wholeNotes, durationBeats, durationTicks, durationSeconds } from "musictheoryjs";

wholeNotes("q.");            // 0.375
durationBeats("h");          // 2      (quarter-note beats by default)
durationTicks("8t");         // 160    (at the default 480 PPQ)
durationSeconds("q", 120);   // 0.5    (at 120 BPM)
durationSeconds("8", 90, "q."); // an eighth at 90 dotted-quarter BPM (6/8 feel)
```

## Time signatures and meter

```ts
import { parseTimeSignature, meterClass, beatGrouping, beatUnit, beatsPerBar } from "musictheoryjs";

parseTimeSignature("6/8"); // { numerator: 6, denominator: 8 }
parseTimeSignature("C");   // 4/4 — "common"; "cut" or "C|" gives 2/2

meterClass("4/4"); // "simple"    — beats divide in two
meterClass("6/8"); // "compound"  — beats divide in three
meterClass("7/8"); // "irregular" — unequal beats
```

The felt beat comes from the grouping. Simple meters count the written unit,
compound meters group threes, and irregular meters default to threes first,
then twos — 7/8 is 3+2+2, 8/8 is 3+3+2:

```ts
beatGrouping("6/8");  // [3, 3]
beatGrouping("7/8");  // [3, 2, 2]
beatsPerBar("6/8");   // 2
beatUnit("6/8");      // { value: 4, dots: 1 } — a dotted quarter
```

Bar lengths follow in any unit:

```ts
import { barWholeNotes, barTicks, barSeconds } from "musictheoryjs";

barWholeNotes("6/8"); // 0.75
barTicks("4/4");      // 1920 (at 480 PPQ)
barSeconds("4/4", 120); // 2
```

## Bar/beat positions

`tickToPosition` locates an absolute tick as 1-based bar and beat — beats
follow the meter's grouping, so the second beat of 7/8 starts after three
eighths, not two — and `positionToTick` inverts it:

```ts
import { tickToPosition, positionToTick } from "musictheoryjs";

tickToPosition(1500, "6/8");            // { bar: 2, beat: 1, offset: 60 }
tickToPosition(960, "7/8");             // { bar: 1, beat: 2, offset: 240 }
positionToTick({ bar: 2, beat: 2 }, "6/8"); // 2160
```

For the seconds domain, `secondsToBeats` and `beatsToSeconds` convert at a
tempo.

## Quantization

The grid is any duration — `"16"` snaps to sixteenths, `"8t"` to eighth-note
triplets. Starts snap to the nearest grid line; durations are left alone
unless you pass `durations: true`, and never quantize to nothing:

```ts
import { quantizeTick, quantizeStream, quantizeMidi } from "musictheoryjs";

quantizeTick(933, "16"); // 960

// A sloppy performance in seconds (the analysis layer's unit):
const played = [
  { pitch: "C4", start: 0.03, duration: 0.61 },
  { pitch: "E4", start: 0.52, duration: 0.24 },
];
quantizeStream(played, "8", 120);      // starts snap to 0 and 0.5
quantizeMidi(midiFile, "16", { durations: true }); // whole file, in ticks
```

## Time signatures in MIDI files

`parseMidi` surfaces the first time-signature meta event as
`file.timeSignature`, `writeMidi` emits one when set, and `noteStreamToMidi`
accepts one — see the [MIDI guide](/guides/midi/).

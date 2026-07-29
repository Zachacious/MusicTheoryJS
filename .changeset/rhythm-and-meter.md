---
"musictheoryjs": minor
---

Rhythm and meter (roadmap Phase 5). Everything is additive, including a new
`musictheoryjs/rhythm` entry point.

- Durations as plain objects — a base value named by its denominator (4 =
  quarter), dots, and an optional tuplet ratio — with shorthand that parses
  and formats both ways: `"q."` is a dotted quarter, `"8t"` an eighth-note
  triplet, `"16[5:4]"` a sixteenth quintuplet. `tuplet(n)` picks the
  conventional ratio (3 → 3:2, 5 → 5:4, 7 → 7:4), `durationName` speaks
  (`"dotted quarter"`, `"eighth triplet"`), and `wholeNotes`,
  `durationBeats`, `durationTicks`, and `durationSeconds` convert to any
  unit, exact on divisible grids.
- Time signatures and meter: `"6/8"` strings, `[6, 8]` pairs, and plain
  objects everywhere; `meterClass` labels simple/compound/irregular;
  `beatGrouping` gives the felt beats (6/8 → 3+3, 7/8 → 3+2+2, 8/8 → 3+3+2)
  with `beatsPerBar` and `beatUnit` (the dotted quarter of 6/8) derived from
  it; `barWholeNotes`/`barTicks`/`barSeconds` measure a bar in any unit.
- Bar/beat positions: `tickToPosition`/`positionToTick` convert absolute
  ticks to 1-based bar/beat/offset and back, with beats following the
  grouping — the second beat of 7/8 starts after three eighths, not two.
  `secondsToBeats`/`beatsToSeconds` cover the seconds domain.
- Quantization for both time domains: `quantizeTick` and `quantizeSeconds`
  snap single values, `quantizeStream` a seconds-based analysis stream, and
  `quantizeMidi` a whole parsed file — any duration as the grid (sixteenths,
  triplets), starts snapped, durations only on request and never to zero,
  grid lines drift-free on non-divisible PPQs.
- MIDI time signatures: `parseMidi` surfaces the first FF 58 meta event as
  `file.timeSignature` (as tempo already was), `writeMidi` emits one when
  set — metronome click matched to the meter's beat — and `noteStreamToMidi`
  takes a `timeSignature` option.

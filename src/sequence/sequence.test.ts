/**
 * Behavioral edges of the sequence module: the paths the doctests don't
 * exercise — validation, meter corners, spelled-pitch guarantees, and the
 * full progression-to-MIDI integration.
 */
import { describe, expect, test } from "bun:test";
import { parseMidi } from "../midi/reader";
import { writeMidi } from "../midi/writer";
import { toABC } from "../notation/abc";
import { arpeggiate, strum } from "./arpeggio";
import { bassline, compChords, compProgression } from "./comp";
import {
  midiTempoMap,
  midiToSequence,
  sequenceSeconds,
  sequenceToMidi,
  sequenceToScore,
} from "./convert";
import { GM_DRUMS, drumPattern } from "./drums";
import { songForm } from "./form";
import { accent, gate, humanize, rampVelocity, swing } from "./groove";
import { augment, diatonicSequence, invertMelody, retrograde } from "./motif";
import {
  concatStreams,
  loopStream,
  melody,
  mergeStreams,
  patternMelody,
  shiftStream,
  sliceStream,
  streamDuration,
  transposeStream,
} from "./stream";

describe("stream building", () => {
  test("melody cycles a duration array and carries velocity", () => {
    const m = melody(["C4", "D4", "E4"], ["q", "8"], { velocity: 99 });
    expect(m.map((e) => e.start)).toEqual([0, 1, 1.5]);
    expect(m.every((e) => e.velocity === 99)).toBe(true);
  });

  test("melody rests take time but produce no event", () => {
    const m = melody([null, "C4"], "q");
    expect(m).toHaveLength(1);
    expect(m[0]?.start).toBe(1);
  });

  test("melody rejects an empty duration array", () => {
    expect(() => melody(["C4"], [])).toThrow(RangeError);
  });

  test("patternMelody cycles pitches over extra onsets", () => {
    const line = patternMelody(["C4", "E4"], [1, 1, 1], { step: "q" });
    expect(line.map((e) => e.pitch.toString())).toEqual(["C4", "E4", "C4"]);
  });

  test("shiftStream rejects moves before time zero", () => {
    expect(() => shiftStream(melody(["C4"], "q"), -0.5)).toThrow(
      /before time zero/
    );
  });

  test("loopStream honours an explicit period", () => {
    const looped = loopStream(melody(["C4"], "q"), 2, { length: 4 });
    expect(looped.map((e) => e.start)).toEqual([0, 4]);
  });

  test("concat and merge keep events intact", () => {
    const a = melody(["C4"], "q");
    const b = melody(["E4"], "q");
    expect(streamDuration(concatStreams(a, b))).toBe(2);
    expect(mergeStreams(a, shiftStream(b, 0.5)).map((e) => e.start)).toEqual([
      0, 0.5,
    ]);
  });

  test("transposeStream spells through the interval", () => {
    const up = transposeStream(melody(["Eb4"], "q"), "M3");
    expect(up[0]?.pitch.toString()).toBe("G4");
  });

  test("sliceStream truncates at both edges and re-zeros", () => {
    const line = melody(["C4", "D4", "E4", "F4"], "q");
    const cut = sliceStream(line, 0.5, 2.5);
    expect(cut.map((e) => e.pitch.toString())).toEqual(["C4", "D4", "E4"]);
    expect(cut.map((e) => e.start)).toEqual([0, 0.5, 1.5]);
    expect(cut.map((e) => e.duration)).toEqual([0.5, 1, 0.5]);
  });

  test("sliceStream drops events that only touch the window's edge", () => {
    const line = melody(["C4", "D4"], "q");
    expect(sliceStream(line, 1)).toHaveLength(1);
    expect(sliceStream(line, 0, 1)).toHaveLength(1);
  });

  test("sliceStream keepPosition leaves events in place", () => {
    const line = melody(["C4", "D4"], "q");
    expect(sliceStream(line, 1, 2, { keepPosition: true })[0]?.start).toBe(1);
  });

  test("sliceStream rejects an inverted or negative window", () => {
    expect(() => sliceStream([], -1)).toThrow(RangeError);
    expect(() => sliceStream([], 2, 2)).toThrow(RangeError);
  });
});

describe("arpeggio and strum", () => {
  test("explicit indices out of range throw", () => {
    expect(() => arpeggiate("C", { pattern: [0, 3] })).toThrow(/out of range/);
  });

  test("downup turns around without repeating endpoints", () => {
    const run = arpeggiate("C", { pattern: "downup" });
    expect(run.map((e) => e.pitch.toString())).toEqual([
      "G4",
      "E4",
      "C4",
      "E4",
    ]);
  });

  test("octave extension keeps spelling", () => {
    const two = arpeggiate("F#m", { octaves: 2 });
    expect(two[3]?.pitch.toString()).toBe("F#5");
  });

  test("strum spread exceeding the ring throws", () => {
    expect(() => strum("C13", { spread: 2, duration: "q" })).toThrow(
      /exceeds the duration/
    );
  });

  test("all strummed voices release together", () => {
    const s = strum("C", { spread: 0.1, duration: "q" });
    const ends = s.map((e) => e.start + e.duration);
    for (const end of ends) expect(end).toBeCloseTo(1, 9);
  });
});

describe("comp and bassline", () => {
  test("null slots keep their time silently", () => {
    const c = compChords(["C", null, "G"], { voicing: "close" });
    expect(c).toHaveLength(6);
    expect(Math.min(...c.slice(3).map((e) => e.start))).toBe(8);
  });

  test("comp hits sustain to the next onset", () => {
    const c = compChords(["C"], {
      rhythm: [1, 0, 0, 1],
      gate: 1,
      voicing: "close",
    });
    const first = c.filter((e) => e.start === 0);
    expect(first[0]?.duration).toBe(3);
  });

  test("6/8 bars span three quarter-note beats", () => {
    const c = compChords(["C", "F"], {
      timeSignature: "6/8",
      voicing: "close",
    });
    expect(Math.min(...c.filter((e) => e.start > 0).map((e) => e.start))).toBe(
      3
    );
  });

  test("compProgression turns N.C. into silence", () => {
    const played = compProgression("C major", ["I", "N.C.", "V"]);
    const starts = new Set(played.map((e) => e.start));
    expect(starts.has(4)).toBe(false);
  });

  test("walking bass approaches the next root chromatically", () => {
    const walk = bassline(["Dm7", "G7"], { gate: 1 });
    // Last beat of the Dm7 bar approaches G2 (midi 43) by a semitone.
    const approach = walk[3] as { pitch: { midi: number } };
    expect(Math.abs(approach.pitch.midi - 43)).toBe(1);
  });

  test("walking bass turns around to the first chord", () => {
    const walk = bassline(["Dm7", "G7"], { gate: 1 });
    // The G7 bar walks G2 B2 D3, then approaches the turnaround D in the
    // register the line reached: a semitone under D3.
    expect(walk.slice(4).map((e) => e.pitch.midi)).toEqual([43, 47, 50, 49]);
  });
});

describe("groove", () => {
  test("straight ratio is the identity", () => {
    const bar = melody(["C4", "D4", "E4", "F4"], "8");
    expect(swing(bar, { ratio: 0.5 })).toEqual([...bar]);
  });

  test("swing bends inner subdivisions proportionally", () => {
    const sixteenth = melody(["C4"], "16", { start: 0.25 });
    // A sixteenth halfway into the first eighth of a 2/3 swing pair lands
    // halfway into the stretched first two-thirds.
    expect(swing(shiftStream(sixteenth, 0))[0]?.start).toBeCloseTo(1 / 3, 9);
  });

  test("swing rejects degenerate ratios", () => {
    expect(() => swing([], { ratio: 1 })).toThrow(RangeError);
  });

  test("accent knows irregular bar lengths", () => {
    // 7/8 bars are 3.5 beats; the second bar's downbeat is 3.5, not 3.
    const two = melody(["C4", "C4"], ["q", "q"], { velocity: 80 });
    const shifted = [
      ...two.slice(0, 1),
      { ...(two[1] as (typeof two)[0]), start: 3.5 },
    ];
    const out = accent(shifted, "7/8");
    expect(out[1]?.velocity).toBe(96);
  });

  test("accent follows compound grouping", () => {
    const m = melody(["C4", "C4", "C4"], ["q.", "q.", "q."]);
    const out = accent(m, "6/8");
    expect(out.map((e) => e.velocity ?? null)).toEqual([96, 86, 96]);
  });

  test("humanize is reproducible with a fixed rng", () => {
    const m = melody(["C4"], "q", { velocity: 64 });
    const a = humanize(m, { rng: () => 0.75 });
    expect(a).toEqual(humanize(m, { rng: () => 0.75 }));
    expect(a[0]?.start).toBeCloseTo(0.01, 9);
  });

  test("humanize clamps velocity into MIDI range", () => {
    const hot = melody(["C4"], "q", { velocity: 127 });
    const out = humanize(hot, { velocity: 40, rng: () => 0.999 });
    expect(out[0]?.velocity).toBe(127);
  });

  test("gate rejects non-positive factors", () => {
    expect(() => gate([], 0)).toThrow(RangeError);
    expect(() => gate([], -1)).toThrow(RangeError);
  });

  test("rampVelocity lands the last note exactly on the target", () => {
    const line = melody(["C4", "D4", "E4"], "q");
    expect(rampVelocity(line, 40, 120).map((e) => e.velocity)).toEqual([
      40, 80, 120,
    ]);
  });

  test("rampVelocity leaves events outside an explicit span untouched", () => {
    const line = melody(["C4", "D4", "E4"], "q", { velocity: 90 });
    const out = rampVelocity(line, 20, 100, { start: 1 });
    expect(out.map((e) => e.velocity)).toEqual([90, 20, 100]);
  });

  test("rampVelocity clamps into MIDI range and handles one onset", () => {
    expect(rampVelocity(melody(["C4"], "q"), 0, 300)[0]?.velocity).toBe(127);
    expect(rampVelocity([], 40, 120)).toEqual([]);
  });

  test("rampVelocity rejects an inverted span", () => {
    expect(() =>
      rampVelocity(melody(["C4"], "q"), 40, 120, { start: 2, end: 1 })
    ).toThrow(RangeError);
  });
});

describe("drum patterns", () => {
  test("lines share the grid and land on their GM notes", () => {
    const groove = drumPattern(
      { kick: "x...x...", snare: "..x...x." },
      { step: "8" }
    );
    expect(groove).toHaveLength(4);
    expect(
      groove.filter((e) => e.pitch.midi === GM_DRUMS.kick).map((e) => e.start)
    ).toEqual([0, 2]);
    expect(
      groove.filter((e) => e.pitch.midi === GM_DRUMS.snare).map((e) => e.start)
    ).toEqual([1, 3]);
  });

  test("accents ride the base velocity; strays throw", () => {
    expect(drumPattern({ kick: "X" }, { velocity: 100 })[0]?.velocity).toBe(
      120
    );
    expect(drumPattern({ kick: "x" })[0]?.velocity).toBeUndefined();
    expect(() => drumPattern({ kick: "x?" })).toThrow(SyntaxError);
    expect(() => drumPattern({ gong: "x" })).toThrow(/unknown drum/);
  });

  test("a drum stream round-trips through channel-9 MIDI", () => {
    const file = sequenceToMidi(drumPattern({ kick: "x.x." }), { channel: 9 });
    expect(file.tracks[0]?.notes.every((n) => n.channel === 9)).toBe(true);
    expect(file.tracks[0]?.notes.map((n) => n.note)).toEqual([36, 36]);
  });
});

describe("tempo maps", () => {
  test("sequenceSeconds integrates a stepwise map", () => {
    const line = melody(["C4", "D4", "E4", "F4"], "q");
    const timed = sequenceSeconds(line, [
      { beat: 0, bpm: 120 },
      { beat: 2, bpm: 60 },
    ]);
    expect(timed.map((e) => e.start)).toEqual([0, 0.5, 1, 2]);
    // A note spanning the change takes time from both tempi.
    const across = sequenceSeconds(
      [{ pitch: "C4", start: 1, duration: 2 }],
      [
        { beat: 0, bpm: 120 },
        { beat: 2, bpm: 60 },
      ]
    );
    expect(across[0]?.duration).toBeCloseTo(0.5 + 1, 9);
  });

  test("a tempo map survives MIDI bytes and comes back in beats", () => {
    const map = [
      { beat: 0, bpm: 120 },
      { beat: 2, bpm: 60 },
    ];
    const file = sequenceToMidi(melody(["C4"], "q"), { tempoMap: map });
    const back = midiTempoMap(parseMidi(writeMidi(file)));
    expect(back).toEqual(map);
  });

  test("sequenceSeconds rejects empty maps and bad points", () => {
    expect(() => sequenceSeconds([], [])).toThrow(/at least one point/);
    expect(() => sequenceSeconds([], [{ beat: -1, bpm: 100 }])).toThrow(
      /before beat 0/
    );
    expect(() => sequenceSeconds([], 0)).toThrow(/positive/);
  });
});

describe("motif transforms", () => {
  test("retrograde is an involution", () => {
    const m = melody(["C4", "E4", "G4"], ["8", "q", "h"]);
    expect(retrograde(retrograde(m))).toEqual([...m]);
  });

  test("chromatic inversion is spelled, not enharmonic", () => {
    const down = invertMelody(melody(["E4"], "q"), "C4");
    expect(down[0]?.pitch.toString()).toBe("Ab3"); // not G#3
  });

  test("tonal inversion keeps out-of-scale notes chromatic", () => {
    const m = melody(["F#4"], "q");
    const out = invertMelody(m, "C4", "C4 major");
    expect(out[0]?.pitch.midi).toBe(54); // mirror of 66 around 60
  });

  test("tonal inversion needs an in-scale axis", () => {
    expect(() => invertMelody([], "C#4", "C4 major")).toThrow(/axis/);
  });

  test("augment scales onsets and durations together", () => {
    const m = melody(["C4", "D4"], "q");
    const twice = augment(m, 2);
    expect(twice.map((e) => e.start)).toEqual([0, 2]);
    expect(() => augment(m, 0)).toThrow(RangeError);
  });

  test("diatonic sequence carries chromatic riders", () => {
    // C4 with an F#4 neighbour, sequenced up one step in C major:
    // C4 -> D4, and F#4 rides its anchor F4 -> G4, landing on G#4.
    const m = melody(["C4", "F#4"], "8");
    const seq = diatonicSequence(m, "C4 major", 1, { times: 2 });
    expect(seq[2]?.pitch.toString()).toBe("D4");
    expect(seq[3]?.pitch.midi).toBe(68); // G#4
  });
});

describe("song form", () => {
  test("unknown sections name the available parts", () => {
    expect(() => songForm("AC", { A: [] })).toThrow(/available: A/);
  });

  test("per-name lengths override stream length", () => {
    const tune = songForm(
      "AB",
      { A: melody(["C4"], "q"), B: melody(["D4"], "q") },
      { lengths: { A: 8 } }
    );
    expect(tune.sections.map((s) => s.start)).toEqual([0, 8]);
    expect(tune.sections[1]?.length).toBe(1);
  });
});

describe("conversions", () => {
  test("sequenceToMidi rejects negative starts", () => {
    expect(() =>
      sequenceToMidi([{ pitch: "C4", start: -1, duration: 1 }])
    ).toThrow(/before time zero/);
  });

  test("MIDI round-trip through real bytes preserves the line", () => {
    const out = melody(["C4", "E4", "G4"], "8", { velocity: 70 });
    const bytes = writeMidi(sequenceToMidi(out, { bpm: 90 }));
    const back = midiToSequence(parseMidi(bytes));
    expect(back.map((e) => e.pitch.toString())).toEqual(["C4", "E4", "G4"]);
    expect(back.map((e) => e.start)).toEqual([0, 0.5, 1]);
    expect(back[0]?.velocity).toBe(70);
  });

  test("sequenceToScore groups chords and rejects overlap", () => {
    const chord = [
      { pitch: "C4", start: 0, duration: 1 },
      { pitch: "E4", start: 0, duration: 1 },
    ];
    expect(sequenceToScore(chord).events[0]?.notes).toHaveLength(2);
    const overlap = [
      { pitch: "C4", start: 0, duration: 2 },
      { pitch: "E4", start: 1, duration: 1 },
    ];
    expect(() => sequenceToScore(overlap)).toThrow(/overlap/);
    const voices = [
      { pitch: "C4", start: 0, duration: 2 },
      { pitch: "E4", start: 0, duration: 1 },
    ];
    expect(() => sequenceToScore(voices)).toThrow(/no voices/);
  });

  test("sequenceToScore rejects unnotatable durations", () => {
    expect(() =>
      sequenceToScore([{ pitch: "C4", start: 0, duration: 0.7 }])
    ).toThrow(/quantize/);
  });

  test("a triplet survives into the score", () => {
    const third = 1 / 3; // an eighth-note triplet in beats
    const score = sequenceToScore([{ pitch: "C4", start: 0, duration: third }]);
    expect(score.events[0]?.duration).toEqual({
      value: 8,
      dots: 0,
      tuplet: { actual: 3, normal: 2 },
    });
  });
});

describe("integration: progression to played bytes", () => {
  test("comp + bass + swing renders to a valid MIDI file and back", () => {
    const comp = swing(
      compProgression("C major", "ii-V-I", { rhythm: [1, 0, 1, 0, 0, 1, 0, 0] })
    );
    // An octave down keeps bass pitches clear of the comp's low voices —
    // same-pitch same-tick notes merge in an SMF's on/off pairing.
    const bass = transposeStream(bassline(["Dm7", "G7", "Cmaj7"]), -12);
    const bytes = writeMidi(
      sequenceToMidi(mergeStreams(comp, bass), {
        bpm: 140,
        timeSignature: "4/4",
      })
    );
    expect(bytes.length).toBeGreaterThan(100);
    const back = midiToSequence(parseMidi(bytes));
    expect(back.length).toBe(comp.length + bass.length);
    expect(streamDuration(back)).toBeCloseTo(12, 0); // 3 bars, minus gate
  });

  test("a melody round-trips into ABC notation", () => {
    const line = melody(["C4", "D4", "E4", null, "G4"], "q");
    const abc = toABC(sequenceToScore(line, { key: "C major" }));
    expect(abc).toContain("z"); // the rest survived
  });
});

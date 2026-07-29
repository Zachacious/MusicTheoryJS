import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import { Scale } from "../scale/scale";
import { toABC } from "./abc";
import { toMusicXML } from "./musicxml";

describe("toABC", () => {
  test("renders a scale run with header fields", () => {
    const abc = toABC(Scale.from("C4", "major"), {
      title: "C major",
      tempo: 96,
    });
    expect(abc).toBe(
      [
        "X:1",
        "T:C major",
        "M:4/4",
        "L:1/8",
        "Q:1/4=96",
        "K:C",
        "C2 D2 E2 F2 | G2 A2 B2 |]",
      ].join("\n")
    );
  });

  test("key signatures absorb their accidentals", () => {
    const abc = toABC(Scale.from("D4", "major"), { key: "D major" });
    expect(abc).toContain("K:D");
    // F#4 and C#5 are in the signature: no ^ marks in the body.
    expect(abc).toContain("D2 E2 F2 G2 | A2 B2 c2 |]");
    expect(abc).not.toContain("^");
  });

  test("minor keys and octave marks", () => {
    const abc = toABC(["F#3", "C6", "Bb4"], { key: "F# minor" });
    expect(abc).toContain("K:F#m");
    // F# is in the signature; C6 must be naturalised against its C#.
    expect(abc).toContain("F,2 =c'2 _B2");
  });

  test("accidentals persist through a measure, ABC-style", () => {
    // F#4 inflects; the next F4 must be explicitly naturalised; the F#5 an
    // octave up still needs its own mark (ABC accidentals are per octave).
    const abc = toABC(["F#4", "F4", "F#5"]);
    expect(abc).toContain("^F2 =F2 ^f2");
  });

  test("chords, rests, and duration factors", () => {
    const abc = toABC([
      { chord: "Cmaj7", duration: "h" },
      { duration: "q" },
      { notes: ["G4"], duration: "8." },
      { notes: ["A4"], duration: "16" },
    ]);
    expect(abc).toContain("[CEGB]4 z2 G3/2 A/2");
  });

  test("ties across the barline", () => {
    // A whole note starting on beat 4 of 4/4: quarter tied to dotted half.
    const abc = toABC([
      { notes: ["C4"], duration: "h." },
      { notes: ["D4"], duration: "1" },
    ]);
    expect(abc).toContain("C6 D2- | D6 |]");
  });

  test("rests split across barlines without ties", () => {
    const abc = toABC([
      { notes: ["C4"], duration: "h." },
      { duration: "1" },
      { notes: ["E4"], duration: "q" },
    ]);
    expect(abc).toContain("C6 z2 | z6 E2 |]");
  });

  test("triplets group with (p:q:r", () => {
    const abc = toABC([
      { notes: ["C4"], duration: "8t" },
      { notes: ["D4"], duration: "8t" },
      { notes: ["E4"], duration: "8t" },
      { notes: ["F4"], duration: "h." },
    ]);
    expect(abc).toContain("(3:2:3 C D E F6");
  });

  test("a tuplet crossing a barline is rejected", () => {
    // A half-note triplet (1/3 of a whole) into the last quarter of the bar.
    const events = [
      { notes: ["C4"], duration: "h." },
      { notes: ["D4"], duration: "2t" },
    ];
    expect(() => toABC(events)).toThrow(RangeError);
  });

  test("wraps the body every four measures", () => {
    const notes = Array.from({ length: 20 }, () => "C4");
    const body = toABC(notes).split("\n").at(-2);
    expect(body).toBe(
      "C2 C2 C2 C2 | C2 C2 C2 C2 | C2 C2 C2 C2 | C2 C2 C2 C2 |"
    );
  });
});

describe("toMusicXML", () => {
  test("renders structure, key, time, and final barline", () => {
    const xml = toMusicXML(Scale.from("D4", "major"), {
      key: "D major",
      timeSignature: "3/4",
      title: "Run & jump",
      tempo: 80,
    });
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain("<work-title>Run &amp; jump</work-title>");
    expect(xml).toContain("<fifths>2</fifths>");
    expect(xml).toContain("<mode>major</mode>");
    expect(xml).toContain("<beats>3</beats>");
    expect(xml).toContain("<per-minute>80</per-minute>");
    expect(xml).toContain("<bar-style>light-heavy</bar-style>");
    // 7 quarters in 3/4 = 3 measures (last padded with rests).
    expect(xml.match(/<measure number=/g)?.length).toBe(3);
  });

  test("spells altered notes and pads the last measure", () => {
    const xml = toMusicXML(["F#4"], { key: "D major" });
    expect(xml).toContain("<step>F</step><alter>1</alter><octave>4</octave>");
    // A quarter note leaves half + quarter of rest in 4/4.
    expect(xml).toContain("<rest/>");
    expect(xml).toContain("<type>half</type>");
  });

  test("chords use <chord/> on the stacked notes", () => {
    const xml = toMusicXML(Chord.from("Cmaj7"));
    expect(xml.match(/<chord\/>/g)?.length).toBe(3);
    // Whole-note default for a bare chord fills the measure: no padding rest.
    expect(xml).not.toContain("<rest/>");
  });

  test("ties split notes across barlines", () => {
    const xml = toMusicXML([
      { notes: ["C4"], duration: "h." },
      { notes: ["D4"], duration: "1" },
    ]);
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tie type="stop"/>');
    expect(xml).toContain('<tied type="start"/>');
    expect(xml).toContain('<tied type="stop"/>');
  });

  test("a note spanning three measures stops and starts a tie in the middle", () => {
    const xml = toMusicXML([{ notes: ["G4"], duration: "breve." }]);
    expect(xml).toContain('<tie type="stop"/>\n<tie type="start"/>');
    expect(xml).toContain('<tied type="stop"/>\n<tied type="start"/>');
  });

  test("ties come after the duration, per the content model", () => {
    const xml = toMusicXML([
      { notes: ["C4"], duration: "h." },
      { notes: ["D4"], duration: "1" },
    ]);
    expect(xml).toMatch(/<\/pitch>\n<duration>\d+<\/duration>\n<tie /);
    expect(xml).not.toMatch(/<\/pitch>\n<tie /);
  });

  test("tuplets carry time-modification", () => {
    const xml = toMusicXML([
      { notes: ["C4"], duration: "8t" },
      { notes: ["D4"], duration: "8t" },
      { notes: ["E4"], duration: "8t" },
    ]);
    expect(xml).toContain("<actual-notes>3</actual-notes>");
    expect(xml).toContain("<normal-notes>2</normal-notes>");
    // A triplet eighth is 160 divisions at 480/quarter.
    expect(xml).toContain("<duration>160</duration>");
  });

  test("durations and dots are written in divisions of 480", () => {
    const xml = toMusicXML([{ notes: ["C4"], duration: "q." }]);
    expect(xml).toContain("<duration>720</duration>");
    expect(xml).toContain("<dot/>");
    expect(xml).toContain("<type>quarter</type>");
  });
});

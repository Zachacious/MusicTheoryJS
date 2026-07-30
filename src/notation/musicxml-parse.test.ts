/**
 * MusicXML import: round-trips through our own exporter, plus hand-written
 * documents for what the exporter never produces — multiple voices via
 * backup, multiple parts, timewise arrangement, foreign divisions values.
 */
import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import { toMusicXML } from "./musicxml";
import { fromMusicXML } from "./musicxml-parse";

const wrap = (measures: string, extra = ""): string => `<?xml version="1.0"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  ${extra}
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">${measures}</part>
</score-partwise>`;

describe("round-trips through toMusicXML", () => {
  test("a melody with a rest and its front matter", () => {
    const xml = toMusicXML(
      [
        { notes: ["C4"], duration: "q" },
        { notes: [], duration: "q" },
        { notes: ["E4"], duration: "h" },
      ],
      { key: "D major", timeSignature: "3/4", tempo: 72, title: "Trip" }
    );
    const doc = fromMusicXML(xml);
    expect(doc.title).toBe("Trip");
    expect(doc.key?.toString()).toBe("D major");
    expect(doc.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    expect(doc.tempo).toBe(72);
    expect(doc.stream.map((e) => e.pitch.toString())).toEqual(["C4", "E4"]);
    expect(doc.stream.map((e) => e.start)).toEqual([0, 2]);
  });

  test("chords come back stacked", () => {
    const doc = fromMusicXML(toMusicXML(Chord.from("F#m7")));
    expect(doc.stream).toHaveLength(4);
    expect(new Set(doc.stream.map((e) => e.start))).toEqual(new Set([0]));
    expect(doc.stream.map((e) => e.pitch.toString())).toContain("F#4");
  });

  test("spelling survives: Ab stays Ab", () => {
    const doc = fromMusicXML(toMusicXML(["Ab4"], { key: "Ab major" }));
    expect(doc.stream[0]?.pitch.toString()).toBe("Ab4");
    expect(doc.key?.toString()).toBe("Ab major");
  });

  test("an event split over the barline is one event again", () => {
    // A whole note in 2/4 exports as two tied halves.
    const xml = toMusicXML([{ notes: ["G4"], duration: 1 }], {
      timeSignature: "2/4",
    });
    expect(xml).toContain('<tie type="start"/>');
    const doc = fromMusicXML(xml);
    expect(doc.stream).toHaveLength(1);
    expect(doc.stream[0]?.duration).toBe(4);
  });
});

describe("hand-written documents", () => {
  test("two voices via backup share the timeline", () => {
    const doc = fromMusicXML(
      wrap(`<measure number="1">
        <attributes><divisions>2</divisions></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
        <backup><duration>4</duration></backup>
        <note><pitch><step>E</step><octave>3</octave></pitch><duration>2</duration></note>
        <note><pitch><step>G</step><octave>3</octave></pitch><duration>2</duration></note>
      </measure>`)
    );
    expect(doc.stream.map((e) => e.pitch.toString())).toEqual([
      "C5",
      "E3",
      "G3",
    ]);
    expect(doc.stream.map((e) => e.start)).toEqual([0, 0, 1]);
    expect(doc.parts[0]?.name).toBe("Piano");
  });

  test("a tie chain merges through its middle note", () => {
    const note = (tie: string) =>
      `<note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration>${tie}</note>`;
    const doc = fromMusicXML(
      wrap(`<measure number="1">
        <attributes><divisions>2</divisions></attributes>
        ${note('<tie type="start"/>')}
        ${note('<tie type="stop"/><tie type="start"/>')}
        ${note('<tie type="stop"/>')}
      </measure>`)
    );
    expect(doc.stream).toHaveLength(1);
    expect(doc.stream[0]?.duration).toBe(3);
  });

  test("grace notes are skipped without disturbing time", () => {
    const doc = fromMusicXML(
      wrap(`<measure number="1">
        <attributes><divisions>1</divisions></attributes>
        <note><grace/><pitch><step>B</step><octave>4</octave></pitch></note>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>
      </measure>`)
    );
    expect(doc.stream.map((e) => e.pitch.toString())).toEqual(["C5"]);
    expect(doc.stream[0]?.start).toBe(0);
  });

  test("flat keys and minor mode resolve", () => {
    const doc = fromMusicXML(
      wrap(`<measure number="1">
        <attributes>
          <divisions>1</divisions>
          <key><fifths>-3</fifths><mode>minor</mode></key>
        </attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      </measure>`)
    );
    expect(doc.key?.toString()).toBe("C minor");
  });

  test("score-timewise parses like its partwise twin", () => {
    const doc = fromMusicXML(`<?xml version="1.0"?>
      <score-timewise version="4.0">
        <part-list><score-part id="P1"><part-name>One</part-name></score-part></part-list>
        <measure number="1">
          <part id="P1">
            <attributes><divisions>1</divisions></attributes>
            <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
          </part>
        </measure>
        <measure number="2">
          <part id="P1">
            <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration></note>
          </part>
        </measure>
      </score-timewise>`);
    expect(doc.stream.map((e) => e.pitch.toString())).toEqual(["A4", "Bb4"]);
    expect(doc.stream[1]?.start).toBe(1);
  });

  test("multiple parts keep their identity and merge", () => {
    const doc = fromMusicXML(`<?xml version="1.0"?>
      <score-partwise version="4.0">
        <part-list>
          <score-part id="P1"><part-name>Right</part-name></score-part>
          <score-part id="P2"><part-name>Left</part-name></score-part>
        </part-list>
        <part id="P1"><measure number="1">
          <attributes><divisions>1</divisions></attributes>
          <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration></note>
        </measure></part>
        <part id="P2"><measure number="1">
          <attributes><divisions>1</divisions></attributes>
          <note><pitch><step>C</step><octave>3</octave></pitch><duration>2</duration></note>
        </measure></part>
      </score-partwise>`);
    expect(doc.parts.map((p) => p.name)).toEqual(["Right", "Left"]);
    expect(doc.stream).toHaveLength(2);
    expect(doc.stream.every((e) => e.start === 0)).toBe(true);
  });

  test("entities and CDATA decode in titles", () => {
    const doc = fromMusicXML(
      wrap(
        `<measure number="1">
          <attributes><divisions>1</divisions></attributes>
          <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
        </measure>`,
        "<work><work-title>Song &amp; Dance &#233;</work-title></work>"
      )
    );
    expect(doc.title).toBe("Song & Dance é");
  });

  test("a non-score document is rejected", () => {
    expect(() => fromMusicXML("<html><body/></html>")).toThrow(
      /not a MusicXML/
    );
    expect(() => fromMusicXML("<score-partwise><part id=")).toThrow(
      SyntaxError
    );
  });
});

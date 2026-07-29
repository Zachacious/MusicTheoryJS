import { describe, expect, test } from "bun:test";
import { Note } from "../note/note";
import { Key, respellInKey } from "./key";

describe("key-aware respelling", () => {
  test("diatonic notes take the key's own spelling", () => {
    expect(Key.from("G major").respell("Gb4").toString()).toBe("F#4");
    expect(Key.from("F major").respell("A#4").toString()).toBe("Bb4");
    expect(Key.from("B major").respell("Gb4").toString()).toBe("F#4");
    expect(Key.from("Db major").respell("C#5").toString()).toBe("Db5");
    // Already-correct spellings pass through untouched.
    expect(Key.from("E major").respell("G#3").toString()).toBe("G#3");
  });

  test("chromatic notes follow the harmonic chromatic convention", () => {
    const c = Key.from("C major");
    expect(c.respell("C#4").toString()).toBe("Db4"); // b2
    expect(c.respell("D#4").toString()).toBe("Eb4"); // b3
    expect(c.respell("Gb4").toString()).toBe("F#4"); // #4
    expect(c.respell("G#4").toString()).toBe("Ab4"); // b6
    expect(c.respell("A#4").toString()).toBe("Bb4"); // b7
  });

  test("minor keys keep their raised degrees", () => {
    const a = Key.from("A minor");
    expect(a.respell("Ab4").toString()).toBe("G#4"); // leading tone
    expect(a.respell("Gb4").toString()).toBe("F#4"); // raised 6th
    expect(a.respell("Db4").toString()).toBe("C#4"); // raised 3rd (picardy)
    const cm = Key.from("C minor");
    expect(cm.respell("D#4").toString()).toBe("Eb4");
    expect(cm.respell("G#4").toString()).toBe("Ab4");
    expect(cm.respell("B4").toString()).toBe("B4");
  });

  test("the sounding pitch is always preserved", () => {
    const inputs = ["Cb2", "B#3", "Fx4", "Gbb5", "A#0", "Dbb7"];
    for (const keyName of ["C major", "F# major", "Eb minor", "B minor"]) {
      const k = Key.from(keyName);
      for (const input of inputs) {
        const note = Note.from(input);
        expect(k.respell(note).chroma).toBe(note.chroma);
      }
    }
  });

  test("octaves carry through around the wrap point", () => {
    // B#3 sounds as C4; in F major it respells to C4, not C3.
    expect(Key.from("F major").respell("B#3").toString()).toBe("C4");
    // Cb4 sounds as B3.
    expect(Key.from("G major").respell("Cb4").toString()).toBe("B3");
  });

  test("free function accepts any KeyLike", () => {
    expect(respellInKey("Ab4", { tonic: "E4", mode: "major" }).toString()).toBe(
      "G#4"
    );
    expect(respellInKey("C#4", "bb minor").toString()).toBe("Db4");
  });
});

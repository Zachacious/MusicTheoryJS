import { describe, expect, test } from "bun:test";
import { identifyRowForm, rowMatrix, rowTransform, toneRow } from "./serial";

// Schoenberg's op. 25 row.
const ROW = toneRow([4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]);

describe("tone rows", () => {
  test("toneRow rejects short and duplicated rows", () => {
    expect(() => toneRow([0, 1, 2])).toThrow(/exactly once/);
    expect(() => toneRow([0, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toThrow(
      /exactly once/
    );
  });

  test("every form is itself a valid row, and R/RI reverse P/I", () => {
    for (const kind of ["P", "I", "R", "RI"]) {
      for (let n = 0; n < 12; n++) {
        expect(() => toneRow(rowTransform(ROW, `${kind}${n}`))).not.toThrow();
      }
    }
    expect(rowTransform(ROW, "R3")).toEqual(
      [...rowTransform(ROW, "P3")].reverse()
    );
    expect(rowTransform(ROW, "RI9")).toEqual(
      [...rowTransform(ROW, "I9")].reverse()
    );
  });

  test("P and I forms begin on their label", () => {
    for (let n = 0; n < 12; n++) {
      expect(rowTransform(ROW, `P${n}`)[0]).toBe(n);
      expect(rowTransform(ROW, `I${n}`)[0]).toBe(n);
    }
  });

  test("the matrix reads P across and I down", () => {
    const m = rowMatrix(ROW);
    expect(m).toHaveLength(12);
    expect(m[0]).toEqual([...ROW]);
    const firstColumn = m.map((r) => r[0] as number);
    expect(firstColumn).toEqual(rowTransform(ROW, `I${ROW[0]}`));
    for (const matrixRow of m) {
      expect(identifyRowForm(ROW, matrixRow)).toBe(`P${matrixRow[0]}`);
    }
  });

  test("identifyRowForm names all 48 forms and rejects strangers", () => {
    for (const kind of ["P", "I", "R", "RI"]) {
      for (let n = 0; n < 12; n++) {
        const form = `${kind}${n}`;
        expect(identifyRowForm(ROW, rowTransform(ROW, form))).toBe(form);
      }
    }
    expect(identifyRowForm(ROW, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe(
      null
    );
    expect(identifyRowForm(ROW, [0, 1])).toBe(null);
  });
});

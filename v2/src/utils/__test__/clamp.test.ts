import clamp from "../clamp";

describe("Clamp Util", () => {
   it("should clamp a number between a min and max", () => {
      expect(clamp(10, 0, 10)).toBe(10);
      expect(clamp(10, 10, 0)).toBe(10);
      expect(clamp(10, 0, 0)).toBe(0);
      expect(clamp(10, 10, 10)).toBe(10);
      expect(clamp(10, 5, 15)).toBe(10);
      expect(clamp(10, 15, 5)).toBe(10);
      expect(clamp(10, -5, 15)).toBe(10);
      expect(clamp(10, 15, -5)).toBe(10);
      expect(clamp(10, -5, -15)).toBe(-5);
      expect(clamp(10, -15, -5)).toBe(-5);
   });
});

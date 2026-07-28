// __tests__/interval.test.ts

import { describe, expect, it } from "vitest";

import {
  HALF_STEP,
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MAJOR_THIRD,
  MINOR_SECOND,
  MINOR_SEVENTH,
  MINOR_SIXTH,
  MINOR_THIRD,
  OCTAVE,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  TRITONE,
  UNISON,
  WHOLE_STEP,
  invertInterval,
  isSimpleInterval,
  simplifyInterval,
} from "../src/interval";
// Adjust the path if your test file is located elsewhere

describe("Interval Module", () => {
  // Test suite for the exported interval constants
  describe("Interval Constants", () => {
    it("should have correct values for interval constants", () => {
      expect(UNISON).toBe(0);
      expect(HALF_STEP).toBe(1);
      expect(MINOR_SECOND).toBe(1);
      expect(WHOLE_STEP).toBe(2);
      expect(MAJOR_SECOND).toBe(2);
      expect(MINOR_THIRD).toBe(3);
      expect(MAJOR_THIRD).toBe(4);
      expect(PERFECT_FOURTH).toBe(5);
      expect(TRITONE).toBe(6);
      expect(PERFECT_FIFTH).toBe(7);
      expect(MINOR_SIXTH).toBe(8);
      expect(MAJOR_SIXTH).toBe(9);
      expect(MINOR_SEVENTH).toBe(10);
      expect(MAJOR_SEVENTH).toBe(11);
      expect(OCTAVE).toBe(12);
    });
  });

  // Test suite for the isSimpleInterval function
  describe("isSimpleInterval", () => {
    it("should return true for intervals between 0 and 12 (inclusive)", () => {
      expect(isSimpleInterval(0)).toBe(true); // Unison
      expect(isSimpleInterval(5)).toBe(true); // Perfect Fourth
      expect(isSimpleInterval(12)).toBe(true); // Octave
    });

    it("should return false for intervals less than 0", () => {
      expect(isSimpleInterval(-1)).toBe(false);
      expect(isSimpleInterval(-12)).toBe(false);
    });

    it("should return false for intervals greater than 12", () => {
      expect(isSimpleInterval(13)).toBe(false); // Minor Ninth
      expect(isSimpleInterval(24)).toBe(false); // Double Octave
    });
  });

  // Test suite for the simplifyInterval function
  describe("simplifyInterval", () => {
    it("should return the interval itself if it is already simple (0-11)", () => {
      expect(simplifyInterval(0)).toBe(0);
      expect(simplifyInterval(7)).toBe(7);
      expect(simplifyInterval(11)).toBe(11);
    });

    it("should simplify compound intervals to their simple equivalent (0-11)", () => {
      expect(simplifyInterval(12)).toBe(0); // Octave -> Unison class
      expect(simplifyInterval(13)).toBe(1); // Major Ninth -> Minor Second class (13 % 12)
      expect(simplifyInterval(14)).toBe(2); // Major Ninth + HS -> Major Second class (14 % 12)
      expect(simplifyInterval(23)).toBe(11); // (23 % 12)
      expect(simplifyInterval(24)).toBe(0); // Double Octave -> Unison class (24 % 12)
    });

    it("should handle negative intervals according to JavaScripts modulo operator", () => {
      // JavaScript's % operator preserves the sign for negative numbers
      expect(simplifyInterval(-1)).toBe(-1); // e.g. -1 % 12 = -1
      expect(simplifyInterval(-2)).toBe(-2); // e.g. -2 % 12 = -2
      expect(simplifyInterval(-11)).toBe(-11);
      expect(simplifyInterval(-12)).toBe(0);
      expect(simplifyInterval(-13)).toBe(-1);
      expect(simplifyInterval(-24)).toBe(0);
    });

    // Example of how one might test for always positive simplified intervals if that were the goal
    // it('should return a positive simplified interval (0-11) if using (interval % 12 + 12) % 12 logic', () => {
    //   const simplifyToPositive = (interval: Interval) => (interval % 12 + 12) % 12;
    //   expect(simplifyToPositive(-2)).toBe(10);
    //   expect(simplifyToPositive(-13)).toBe(11);
    // });
  });

  // Test suite for the invertInterval function
  describe("invertInterval", () => {
    it("should correctly invert simple intervals greater than unison and up to an octave", () => {
      expect(invertInterval(MINOR_SECOND)).toBe(MAJOR_SEVENTH); // 1 -> 11
      expect(invertInterval(MAJOR_SECOND)).toBe(MINOR_SEVENTH); // 2 -> 10
      expect(invertInterval(MINOR_THIRD)).toBe(MAJOR_SIXTH); // 3 -> 9
      expect(invertInterval(MAJOR_THIRD)).toBe(MINOR_SIXTH); // 4 -> 8
      expect(invertInterval(PERFECT_FOURTH)).toBe(PERFECT_FIFTH); // 5 -> 7
      expect(invertInterval(TRITONE)).toBe(TRITONE); // 6 -> 6
      expect(invertInterval(PERFECT_FIFTH)).toBe(PERFECT_FOURTH); // 7 -> 5
      expect(invertInterval(MINOR_SIXTH)).toBe(MAJOR_THIRD); // 8 -> 4
      expect(invertInterval(MAJOR_SIXTH)).toBe(MINOR_THIRD); // 9 -> 3
      expect(invertInterval(MINOR_SEVENTH)).toBe(MAJOR_SECOND); // 10 -> 2
      expect(invertInterval(MAJOR_SEVENTH)).toBe(MINOR_SECOND); // 11 -> 1
    });

    it("should invert an OCTAVE (12) to UNISON (0)", () => {
      expect(invertInterval(OCTAVE)).toBe(UNISON); // 12 -> 0
    });

    it("should return undefined for UNISON (0)", () => {
      expect(invertInterval(UNISON)).toBeUndefined();
    });

    it("should return undefined for compound intervals (greater than 12)", () => {
      expect(invertInterval(13)).toBeUndefined(); // Major Ninth
      expect(invertInterval(14)).toBeUndefined();
    });

    it("should return undefined for negative intervals", () => {
      expect(invertInterval(-1)).toBeUndefined();
      expect(invertInterval(-PERFECT_FIFTH)).toBeUndefined();
    });

    it("should return undefined for intervals greater than OCTAVE", () => {
      expect(invertInterval(13)).toBeUndefined();
    });
  });
});

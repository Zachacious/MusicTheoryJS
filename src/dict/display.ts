/**
 * @module dict/display
 * The alias used when *printing* a chord type in a symbol. Selection rules:
 *
 * - The empty alias wins when present (a major triad prints "C", not "CM").
 * - Only plain-ASCII aliases are considered (no `Δ`/`°`/`ø`, and no `/`
 *   which would read as a slash bass).
 * - Aliases starting with an accidental character are never used: appended
 *   to a root they change it — C + "b9sus" reads as Cb + "9sus".
 * - Long alphabetic nicknames ("phryg") lose to conventional symbols
 *   ("7b9sus"); a leading capital M is dropped when an alternative exists
 *   ("Cadd9" over "CMadd9") unless the alternative is a bare numeral
 *   ("C2" is a worse print than "CMadd9"'s alternative "Cadd9").
 *
 * Every symbol built from this alias parses back to the same chord type —
 * the property suite sweeps the whole dictionary to keep it that way.
 */

import { ChordTypeData } from "./types";

/**
 * The alias used when printing `type` in a chord symbol, chosen by the rules
 * above. The major triad prints as the empty string.
 *
 * @example
 * ```ts
 * import { chordDisplayAlias, resolveChordQuality } from "musictheoryjs";
 *
 * chordDisplayAlias(resolveChordQuality("half-diminished")); // => "m7b5"
 * chordDisplayAlias(resolveChordQuality("minor")); // => "m"
 * chordDisplayAlias(resolveChordQuality("major")); // => ""
 * ```
 */
export function chordDisplayAlias(type: ChordTypeData): string {
  if (type.aliases.includes("")) return "";
  const ascii = type.aliases.filter(
    (a) => /^[A-Za-z0-9#b+-]+$/.test(a) && !/^[b#x]/.test(a)
  );
  const primary =
    ascii.find((a) => /\d/.test(a) || a.length <= 4) ?? ascii[0] ?? type.aliases[0];
  if (!primary.startsWith("M")) return primary;
  const alt = ascii.find((a) => !a.startsWith("M") && !/^\d+$/.test(a));
  return alt ?? primary;
}

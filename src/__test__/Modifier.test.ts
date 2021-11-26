import { isRegularExpressionLiteral } from "typescript";
import Modifier, { parseModifier } from "../Modifier";

describe("Modifier", () => {
   describe("parseModifier", () => {
      it("should parse strings into Modifiers", () => {
         const sharp1 = parseModifier("#");
         expect(sharp1).toEqual(Modifier.SHARP);

         const sharp2 = parseModifier("s");
         expect(sharp2).toEqual(Modifier.SHARP);

         const sharp3 = parseModifier("sharp");
         expect(sharp3).toEqual(Modifier.SHARP);

         const flat1 = parseModifier("b");
         expect(flat1).toEqual(Modifier.FLAT);

         const flat2 = parseModifier("flat");
         expect(flat2).toEqual(Modifier.FLAT);
      });

      it("should return natural if any value other than #,s,sharp,b,flat is passed", () => {
         const natural = parseModifier("natural");
         expect(natural).toEqual(Modifier.NATURAL);

         const none = parseModifier("none");
         expect(none).toEqual(Modifier.NATURAL);

         const empty = parseModifier("");
         expect(empty).toEqual(Modifier.NATURAL);

         const randomValue = parseModifier("random");
         expect(randomValue).toEqual(Modifier.NATURAL);
      });
   });
});

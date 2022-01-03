import { createTables } from "./instrumentTables";
import { uid } from "uid";
import Entity from "../Entity";

/**
 * Tuning component used by Instrument class<br>
 * containes the a4 tuning - default is 440Hz<br>
 * builds lookup tables for midi key and frequency<br>
 * based on the tuning
 * @internal
 */
class Tuning implements Entity {
   /**
    * Creates the object and builds the lookup tables.
    */
   constructor(a4Freq: number = 440) {
      this._a4 = a4Freq;
      this.buildTables();
   }

   /**
    * unique id for this instance
    */
   id: string = uid();

   public copy(): Tuning {
      return new Tuning(this._a4);
   }

   public equals(other: Tuning): boolean {
      return this._a4 === other._a4;
   }

   /**
    * a4 Tuning
    */
   protected _a4: number = 440;

   public get a4(): number {
      return this._a4;
   }

   /**
    * setting the tuning will rebuild the lookup tables
    */
   public set a4(value: number) {
      this._a4 = value;
      this.buildTables();
   }

   /**
    * lookup table for midi key
    */

   protected _midiKeyTable: { [key: string]: number } = {};

   public midiKeyLookup(octave: number, semitone: number): number {
      const key = `${octave}-${semitone}`;
      return this._midiKeyTable[key];
   }

   /**
    * lookup table for frequency
    */
   protected _freqTable: { [key: string]: number } = {};

   public freqLookup(octave: number, semitone: number): number {
      const key = `${octave}-${semitone}`;
      return this._freqTable[key];
   }

   /**
    * Builds the lookup tables for midi key and frequency
    */
   protected buildTables(): void {
      const tables = createTables(this._a4);
      this._midiKeyTable = tables.midiLookup;
      this._freqTable = tables.freqLookup;
   }

   /**
    * returns the tuning as a string
    */
   public toString(): string {
      return `Tuning(${this._a4})`;
   }
}

export default Tuning;

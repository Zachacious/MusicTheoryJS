import { createTables } from "./instrumentTables";

//**********************************************************
/**
 * Tuning component used by Instrument class
 * - containes the a4 tuning - default is 440Hz
 * - builds lookup tables for midi key and frequency
 * - based on the tuning
 */
//**********************************************************
class Tuning {
   /**
    * Creates the object and builds the lookup tables.
    */
   constructor(a4Freq: number = 440) {
      this._a4 = a4Freq;
      this.buildTables();
   }

   //**********************************************************
   /**
    * a4 Tuning
    */
   //**********************************************************
   private _a4: number = 440;

   public get a4(): number {
      return this._a4;
   }

   //**********************************************************
   /**
    * setting the tuning will rebuild the lookup tables
    */
   //**********************************************************
   public set a4(value: number) {
      this._a4 = value;
      this.buildTables();
   }

   //**********************************************************
   /**
    * lookup table for midi key
    */
   //**********************************************************

   private _midiKeyTable: { [key: string]: number } = {};

   public midiKeyLookup(octave: number, semitone: number): number {
      const key = `${octave}-${semitone}`;
      return this._midiKeyTable[key];
   }

   //**********************************************************
   /**
    * lookup table for frequency
    */
   //**********************************************************
   private _freqTable: { [key: string]: number } = {};

   public freqLookup(octave: number, semitone: number): number {
      const key = `${octave}-${semitone}`;
      return this._freqTable[key];
   }

   //**********************************************************
   /**
    * Builds the lookup tables for midi key and frequency
    */
   //**********************************************************
   private buildTables(): void {
      const tables = createTables(this._a4);
      this._midiKeyTable = tables.midiLookup;
      this._freqTable = tables.freqLookup;
   }
}

export default Tuning;

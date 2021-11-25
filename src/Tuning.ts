// let _tuning: { [key: string]: any } = {
//   a4: 440,
// };

// const tuning = (tuning?: { [key: string]: any }): { [key: string]: any } => {
//   if (tuning) {
//     _tuning = { ..._tuning, ...tuning };
//   }

//   return _tuning;
// };

// export default tuning;
import { createTables } from "./Tables";
class tuning {
  private _a4: number = 440;
  private _midiKeyTable: { [key: string]: number } = {};
  private _freqTable: { [key: string]: number } = {};

  private buildTables(): void {
    const tables = createTables(this._a4);
    this._midiKeyTable = tables.midiLookup;
    this._freqTable = tables.freqLookup;
  }

  /**
   * Creates the object and builds the lookup tables.
   */
  constructor() {
    this.buildTables();
  }

  public get a4(): number {
    return this._a4;
  }

  public set a4(value: number) {
    this._a4 = value;
    this.buildTables();
  }

  public midiKeyLookup(octave: number, semitone: number): number {
    const key = `${octave}-${semitone}`;
    return this._midiKeyTable[key];
  }

  public freqLookup(octave: number, semitone: number): number {
    const key = `${octave}-${semitone}`;
    return this._freqTable[key];
  }
}

export default tuning;

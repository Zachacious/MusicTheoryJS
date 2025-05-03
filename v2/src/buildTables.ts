import { buildChordTable } from "./Chord/chordNameParser";
import { buildNoteTable } from "./Note/noteParser";
import { buildNoteStringTable } from "./Note/stringTable";
import { buildScaleTable } from "./Scale/scaleParser";
import { buildScaleNoteTable } from "./Scale/Scale";
import { buildScaleNameTable } from "./Scale/scaleNameLookup";

/**
 * Builds lookup tables for more performant string parsing.<br/>
 * Should only(optionally) be called once soon after the library is loaded and<br/>
 * only if you are using string initializers.
 */
const buildTables = () => {
   buildNoteTable();
   buildNoteStringTable();
   buildScaleTable();
   buildScaleNoteTable();
   buildScaleNameTable();
   buildChordTable();
};

export default buildTables;

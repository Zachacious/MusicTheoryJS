import { registerInitializer } from "../Initializer/Initializer";
import isEqual from "../utils/isEqual";
import ScaleTemplates from "./ScaleTemplates";

const scaleNameLookup = (
   template: number[],
   supressWarning: boolean = false
) => {
   try {
      const result = nameTable(JSON.stringify(template));
      if (result) return result;
   } catch (e) {
      if (!supressWarning) console.warn(e);
   }

   const keys = Object.keys(ScaleTemplates);
   const values = Object.values(ScaleTemplates);
   const scaleNames: string[] = [];
   for (let i = 0; i < keys.length; ++i) {
      if (isEqual(values[i], template)) {
         scaleNames.push(keys[i].charAt(0).toUpperCase() + keys[i].slice(1));
      }
   }
   const scaleNamesString = scaleNames.join(" AKA ");
   return scaleNamesString;
};

const createTable = (): { [key: string]: string } => {
   const table: { [key: string]: string } = {};

   for (const template of Object.values(ScaleTemplates)) {
      table[JSON.stringify(template)] = scaleNameLookup(template, true);
   }

   return table;
};

let _nameTable: { [key: string]: string } = {};

const nameTable = (key: string) => {
   if (!_nameTable[key]) {
      _nameTable = createTable();
   }

   return _nameTable[key];
};

registerInitializer(() => {
   _nameTable = createTable();
});

export default scaleNameLookup;

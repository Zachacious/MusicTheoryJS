const scaleTemplates = {
   wholeTone: [0, 2, 2, 2, 2, 2, 2],

   // major
   major: [0, 2, 2, 1, 2, 2, 2],
   major7s4s5: [0, 2, 2, 2, 2, 1, 2],

   // modes
   dorian: [0, 2, 1, 2, 2, 2, 1],
   phrygian: [0, 1, 2, 2, 2, 1, 2],
   lydian: [0, 2, 2, 2, 1, 2, 2],
   lydianDominant: [0, 2, 2, 2, 1, 2, 1],
   mixolydian: [0, 2, 2, 1, 2, 2, 1],
   mixolydianFlat6: [0, 2, 2, 1, 2, 1, 2],
   locrian: [0, 1, 2, 2, 1, 2, 2],
   superLocrian: [0, 1, 2, 1, 2, 2, 2],

   // minor
   minor: [0, 2, 1, 2, 2, 1, 2],
   minor7b9: [0, 1, 2, 2, 2, 2, 1],
   minor7b5: [0, 2, 1, 2, 1, 2, 2],

   // harmonic
   harmonicMajor: [0, 2, 2, 1, 2, 1, 3],
   harmonicMinor: [0, 2, 1, 2, 2, 1, 3],
   doubleHarmonic: [0, 1, 3, 1, 2, 1, 3],

   // melodic
   melodicMinorAscending: [0, 2, 1, 2, 2, 2, 2],
   melodicMinorDescending: [0, 2, 2, 1, 2, 2, 1],

   // pentatonic
   majorPentatonic: [0, 2, 2, 3, 2],
   majorPentatonicBlues: [0, 2, 1, 1, 3, 2],
   minorPentatonic: [0, 3, 2, 2, 3],
   minorPentatonicBlues: [0, 3, 2, 1, 1, 3],
   b5Pentatonic: [0, 3, 2, 1, 4, 2],
   minor6Pentatonic: [0, 3, 2, 2, 2, 3],

   // enigmatic
   enigmaticMajor: [0, 1, 3, 2, 2, 2, 1],
   enigmaticMinor: [0, 1, 2, 3, 1, 3, 1],

   // 8Tone
   dim8Tone: [0, 2, 1, 2, 1, 2, 1, 2],
   dom8Tone: [0, 1, 2, 1, 2, 1, 2, 1],

   // neapolitan
   neapolitanMajor: [0, 1, 2, 2, 2, 2, 2],
   neapolitanMinor: [0, 1, 2, 2, 2, 1, 3],

   // hungarian
   hungarianMajor: [0, 3, 1, 2, 1, 2, 1],
   hungarianMinor: [0, 2, 1, 3, 1, 1, 3],
   hungarianGypsy: [0, 1, 3, 1, 2, 1, 3],

   // spanish
   spanish: [0, 1, 2, 1, 2, 2, 2],
   spanish8Tone: [0, 1, 2, 1, 1, 1, 2, 2],
   spanishGypsy: [0, 1, 3, 1, 2, 1, 2],

   // aug dom
   augmented: [0, 3, 1, 3, 1, 3, 1],
   dominantSuspended: [0, 2, 3, 2, 2, 1, 2],

   // bebop
   bebopMajor: [0, 2, 2, 1, 2, 1, 1, 2],
   bebopDominant: [0, 2, 2, 1, 2, 2, 1, 1],

   mystic: [0, 2, 2, 2, 3, 2],

   overtone: [0, 2, 2, 2, 1, 1, 2],

   leadingTone: [0, 2, 2, 2, 2, 2, 1],

   // japanese
   hirojoshi: [0, 2, 1, 4, 1],
   japaneseA: [0, 1, 4, 1, 3],
   japaneseB: [0, 2, 3, 1, 3],

   // cultures
   oriental: [0, 1, 3, 1, 1, 3, 1],
   persian: [0, 1, 4, 1, 2, 3],
   arabian: [0, 2, 2, 1, 1, 2, 2],
   balinese: [0, 1, 2, 4, 1],
   kumoi: [0, 2, 1, 4, 2, 2],
   pelog: [0, 1, 2, 3, 1, 1],
   algerian: [0, 2, 1, 2, 1, 1, 1, 3],
   chinese: [0, 4, 2, 1, 4],
   mongolian: [0, 2, 2, 3, 2],
   egyptian: [0, 2, 3, 2, 3],
   romainian: [0, 2, 1, 3, 1, 2, 1],
   hindu: [0, 2, 2, 1, 2, 1, 2],
   insen: [0, 1, 4, 2, 3],
   iwato: [0, 1, 4, 1, 4],
   scottish: [0, 2, 3, 2, 2],
   yo: [0, 3, 2, 2, 3],
   istrian: [0, 1, 2, 2, 2, 1, 2],
   ukranianDorian: [0, 2, 1, 3, 1, 2, 1],
   petrushka: [0, 1, 3, 2, 1, 3],
   ahavaraba: [0, 1, 3, 1, 2, 1, 2],
};

export default scaleTemplates;

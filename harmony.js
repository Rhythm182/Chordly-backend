
// All 12 notes
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale intervals (in semitones from root)
const SCALES = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

// Common chord shapes (intervals from root)
const CHORDS = {
  major:      [0, 4, 7],
  minor:      [0, 3, 7],
  dominant7:  [0, 4, 7, 10],
  minor7:     [0, 3, 7, 10],
  major7:     [0, 4, 7, 11],
  diminished: [0, 3, 6],
};

// Strip octave number: "C4" -> "C", "F#3" -> "F#"
function stripOctave(note) {
  return note.replace(/[0-9]/g, '');
}

// Get index of a note in the NOTES array
function noteIndex(note) {
  return NOTES.indexOf(stripOctave(note));
}

// Given a root and a scale, return all note names in that scale
function getScaleNotes(root, scaleName) {
  const rootIdx = noteIndex(root);
  if (rootIdx === -1) return [];
  return SCALES[scaleName].map(interval => NOTES[(rootIdx + interval) % 12]);
}

// Detect which key/scale best fits the given notes
function detectKey(playedNotes) {
  const played = [...new Set(playedNotes.map(stripOctave))]; // unique note names
  let bestMatch = { root: 'C', scale: 'major', score: -1 };

  for (const root of NOTES) {
    for (const scaleName of Object.keys(SCALES)) {
      const scaleNotes = getScaleNotes(root, scaleName);
      const score = played.filter(n => scaleNotes.includes(n)).length;
      if (score > bestMatch.score) {
        bestMatch = { root, scale: scaleName, score };
      }
    }
  }

  return bestMatch;
}

// Detect which chord best fits the given notes
function detectChord(playedNotes) {
  const played = [...new Set(playedNotes.map(stripOctave))];
  let bestMatch = { root: 'C', chord: 'major', score: -1 };

  for (const root of NOTES) {
    for (const chordName of Object.keys(CHORDS)) {
      const chordNotes = CHORDS[chordName].map(i => NOTES[(noteIndex(root) + i) % 12]);
      const score = played.filter(n => chordNotes.includes(n)).length;
      if (score > bestMatch.score) {
        bestMatch = { root, chord: chordName, score };
      }
    }
  }

  return bestMatch;
}

// Main function: given played notes, return suggestions
function getSuggestions(playedNotes) {
  if (!playedNotes || playedNotes.length === 0) {
    return { suggestions: ['C4', 'E4', 'G4'], key: null, chord: null };
  }

  const key = detectKey(playedNotes);
  const chord = detectChord(playedNotes);
  const scaleNotes = getScaleNotes(key.root, key.scale);

  const played = new Set(playedNotes.map(stripOctave));

  // Suggest notes in the scale that haven't been played yet, prioritize chord tones
  const chordNotes = CHORDS[chord.chord].map(i => NOTES[(noteIndex(chord.root) + i) % 12]);

  const suggestions = scaleNotes
    .filter(n => !played.has(n))          // not already played
    .sort((a, b) => {
      const aIsChordTone = chordNotes.includes(a) ? -1 : 1;
      const bIsChordTone = chordNotes.includes(b) ? -1 : 1;
      return aIsChordTone - bIsChordTone; // chord tones first
    })
    .slice(0, 3)                          // top 3 suggestions
    .map(n => n + '4');                   // add octave back

  return {
    suggestions,
    key: `${key.root} ${key.scale}`,
    chord: `${chord.root} ${chord.chord}`,
  };
}

module.exports = { getSuggestions };
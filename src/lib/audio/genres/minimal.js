// Minimal genre definition for MusicMap
// Subtle spatial cues only — designed as an overlay on the user's own music
// Quiet tones, no melody or beat, just directional hints and soft texture

export const minimalGenre = {
  name: 'Minimal',

  bpm: { min: 50, max: 60, default: 55 },

  lead: {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.4, decay: 0.6, sustain: 0.2, release: 1.5 },
    pattern: ['G4', null, null, null, 'E4', null, null, null],
    interval: '4n',
    filterFrequency: 1500,
    reverbDecay: 3.0
  },

  pad: {
    oscillator: { type: 'sine' },
    envelope: { attack: 3.0, decay: 1.0, sustain: 0.4, release: 5.0 },
    chords: [
      ['C3', 'G3'],
      ['C3', 'G3'],
      ['A2', 'E3'],
      ['A2', 'E3']
    ],
    interval: '4m',
    filterFrequency: 400,
    chorusFrequency: 0.1
  },

  rhythm: null, // No rhythm — overlay mode

  texture: {
    noiseType: 'brown',
    gain: 0.01,
    filterFrequency: 1500,
    filterType: 'lowpass'
  },

  filterRange: { min: 100, max: 3000 },
  tensionNotes: ['Bb4'],

  // Quiet levels — designed to sit under the user's own music
  levels: {
    master: 0.35,
    lead: 0.3,
    pad: 0.15,
    rhythm: 0,
    texture: 0.04
  },

  sonification: {
    proximityMode: 'tempo',
    spatialMode: 'pan3d'
  }
};

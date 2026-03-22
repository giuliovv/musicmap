// Ambient genre definition for MusicMap
// Evolving drones, slow pads, heavy reverb — atmospheric but present

export const ambientGenre = {
  name: 'Ambient',

  bpm: { min: 40, max: 55, default: 45 },

  lead: {
    oscillator: { type: 'sine' },
    envelope: { attack: 1.5, decay: 1.0, sustain: 0.6, release: 3.0 },
    pattern: ['C4', null, 'E4', null, 'G4', null, 'A4', null],
    interval: '2n',
    filterFrequency: 1200,
    reverbDecay: 4.0
  },

  pad: {
    oscillator: { type: 'fatsawtooth' },
    envelope: { attack: 2.0, decay: 1.0, sustain: 0.7, release: 4.0 },
    chords: [
      ['C2', 'G2', 'E3'],
      ['A1', 'E2', 'C3'],
      ['F2', 'C3', 'A3'],
      ['G2', 'D3', 'B3']
    ],
    interval: '2m',
    filterFrequency: 600,
    chorusFrequency: 0.2
  },

  rhythm: null, // No rhythm in ambient

  texture: {
    noiseType: 'pink',
    gain: 0.02,
    filterFrequency: 2000,
    filterType: 'lowpass'
  },

  filterRange: { min: 150, max: 4000 },
  tensionNotes: ['Db4', 'Ab4', 'Gb4'],

  levels: {
    master: 0.55,
    lead: 0.3,
    pad: 0.3,
    rhythm: 0,
    texture: 0.05
  },

  sonification: {
    proximityMode: 'tempo',
    spatialMode: 'pan3d'
  }
};

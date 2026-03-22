// Lo-fi genre definition for MusicMap

export const lofiGenre = {
  name: 'Lo-fi',

  bpm: { min: 65, max: 90, default: 72 },

  lead: {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
    pattern: ['C4', 'E4', 'G4', 'A4', 'E4', 'G4', 'C5', 'G4'],
    interval: '8n',
    filterFrequency: 2000,
    reverbDecay: 1.5
  },

  pad: {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 2 },
    chords: [
      ['C3', 'E3', 'G3'],
      ['A2', 'C3', 'E3'],
      ['F2', 'A2', 'C3'],
      ['G2', 'B2', 'D3']
    ],
    interval: '1m',
    filterFrequency: 800,
    chorusFrequency: 0.5
  },

  rhythm: {
    // Kick + hat pattern using noise synth
    pattern: [1, 0, 0, 1, 0, 0, 1, 0], // 8th note hat hits
    interval: '8n',
    filterFrequency: 3000
  },

  texture: {
    // Vinyl crackle via filtered noise
    noiseType: 'brown',
    gain: 0.03,
    filterFrequency: 4000,
    filterType: 'bandpass'
  },

  // Sonification ranges
  filterRange: { min: 200, max: 6000 },
  tensionNotes: ['Bb4', 'Eb4', 'Gb4'],

  sonification: {
    proximityMode: 'tempo', // ramp BPM as user approaches turn
    spatialMode: 'pan3d'
  }
};

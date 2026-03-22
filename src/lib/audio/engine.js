// SonicEngine — Tone.js-based generative music engine for MusicMap

import * as Tone from 'tone';

export class SonicEngine {
  constructor() {
    this.isPlaying = false;
    this.genre = null;

    // Mixer nodes
    this.masterGain = null;
    this.masterFilter = null;
    this.leadGain = null;
    this.padGain = null;
    this.rhythmGain = null;
    this.textureGain = null;
    this.leadPanner = null;

    // Instruments
    this.leadSynth = null;
    this.leadSequence = null;
    this.padSynth = null;
    this.padSequence = null;
    this.rhythmSynth = null;
    this.rhythmSequence = null;
    this.textureNoise = null;

    // Effects
    this.leadFilter = null;
    this.leadReverb = null;
    this.padFilter = null;
    this.padChorus = null;
    this.rhythmFilter = null;
    this.textureFilter = null;

    // Current sonification state
    this._currentPattern = null;
    this._tensionActive = false;
  }

  async init() {
    // iOS Safari requires Tone.start() in a direct user gesture.
    // Also force-resume the underlying AudioContext for iOS silent-mode workaround.
    await Tone.start();
    const ctx = Tone.getContext().rawContext;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Master chain: masterFilter → masterGain → destination
    this.masterGain = new Tone.Gain(0.7).toDestination();
    this.masterFilter = new Tone.Filter(8000, 'lowpass').connect(this.masterGain);

    // Channel gains
    this.leadGain = new Tone.Gain(0.4).connect(this.masterFilter);
    this.padGain = new Tone.Gain(0.25).connect(this.masterFilter);
    this.rhythmGain = new Tone.Gain(0.15).connect(this.masterFilter);
    this.textureGain = new Tone.Gain(0.08).connect(this.masterFilter);

    // Spatial panner for lead (binaural)
    this.leadPanner = new Tone.Panner3D({
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 10000,
      positionX: 0,
      positionY: 0,
      positionZ: -1 // in front
    }).connect(this.leadGain);
  }

  loadGenre(genreDef) {
    this._teardownInstruments();
    this.genre = genreDef;

    Tone.getTransport().bpm.value = genreDef.bpm.default;

    // Apply per-genre channel levels
    const levels = genreDef.levels || {};
    this.masterGain.gain.value = levels.master ?? 0.7;
    this.leadGain.gain.value = levels.lead ?? 0.4;
    this.padGain.gain.value = levels.pad ?? 0.25;
    this.rhythmGain.gain.value = levels.rhythm ?? 0.15;
    this.textureGain.gain.value = levels.texture ?? 0.08;

    this._buildLead(genreDef);
    this._buildPad(genreDef);
    this._buildRhythm(genreDef);
    this._buildTexture(genreDef);
  }

  _buildLead(genre) {
    // Lead filter → reverb → panner
    this.leadFilter = new Tone.Filter(genre.lead.filterFrequency, 'lowpass');
    this.leadReverb = new Tone.Reverb({ decay: genre.lead.reverbDecay, wet: 0.3 });

    this.leadSynth = new Tone.Synth({
      oscillator: genre.lead.oscillator,
      envelope: genre.lead.envelope
    }).chain(this.leadFilter, this.leadReverb, this.leadPanner);

    this._currentPattern = [...genre.lead.pattern];

    this.leadSequence = new Tone.Sequence(
      (time, note) => {
        if (note) {
          this.leadSynth.triggerAttackRelease(note, '8n', time);
        }
      },
      this._currentPattern,
      genre.lead.interval
    );
  }

  _buildPad(genre) {
    this.padFilter = new Tone.Filter(genre.pad.filterFrequency, 'lowpass');
    this.padChorus = new Tone.Chorus({
      frequency: genre.pad.chorusFrequency,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.3
    }).start();

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: genre.pad.oscillator,
      envelope: genre.pad.envelope,
      maxPolyphony: 4
    }).chain(this.padFilter, this.padChorus, this.padGain);

    this.padSequence = new Tone.Sequence(
      (time, chord) => {
        if (chord) {
          this.padSynth.triggerAttackRelease(chord, '2n', time, 0.3);
        }
      },
      genre.pad.chords,
      genre.pad.interval
    );
  }

  _buildRhythm(genre) {
    if (!genre.rhythm) return;

    this.rhythmFilter = new Tone.Filter(genre.rhythm.filterFrequency, 'lowpass');

    this.rhythmSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
    }).chain(this.rhythmFilter, this.rhythmGain);

    this.rhythmSequence = new Tone.Sequence(
      (time, hit) => {
        if (hit) {
          this.rhythmSynth.triggerAttackRelease('16n', time);
        }
      },
      genre.rhythm.pattern,
      genre.rhythm.interval
    );
  }

  _buildTexture(genre) {
    if (!genre.texture) return;

    this.textureFilter = new Tone.Filter(
      genre.texture.filterFrequency,
      genre.texture.filterType || 'lowpass'
    );

    this.textureNoise = new Tone.Noise(genre.texture.noiseType || 'brown');
    this.textureNoise.chain(this.textureFilter, this.textureGain);
  }

  start() {
    if (this.isPlaying || !this.genre) return;

    this.leadSequence?.start(0);
    this.padSequence?.start(0);
    this.rhythmSequence?.start(0);
    this.textureNoise?.start();

    Tone.getTransport().start();
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying) return;

    Tone.getTransport().stop();

    this.leadSequence?.stop();
    this.padSequence?.stop();
    this.rhythmSequence?.stop();
    this.textureNoise?.stop();

    this.isPlaying = false;
  }

  /**
   * Update sonification parameters from navigation state
   * @param {Object} params
   * @param {number} params.panX - Lead panning X (-1 left to 1 right)
   * @param {number} params.panZ - Lead panning Z (depth)
   * @param {number} params.bpmTarget - Target BPM
   * @param {number} params.filterCutoff - Lead filter cutoff Hz
   * @param {number} params.tension - 0-1 tension level
   * @param {number} params.masterFilterCutoff - Master filter cutoff Hz
   */
  updateSonification(params) {
    if (!this.isPlaying || !this.genre) return;

    const now = Tone.now();

    // Spatial panning — smooth ramp
    if (this.leadPanner && params.panX !== undefined) {
      this.leadPanner.positionX.rampTo(params.panX * 2, 0.15, now);
      this.leadPanner.positionZ.rampTo(params.panZ !== undefined ? params.panZ : -1, 0.15, now);
    }

    // Tempo — ramp over 2 seconds to avoid jarring shifts
    if (params.bpmTarget !== undefined && this.genre.sonification.proximityMode === 'tempo') {
      Tone.getTransport().bpm.rampTo(params.bpmTarget, 2);
    }

    // Lead filter cutoff — proximity brightening
    if (this.leadFilter && params.filterCutoff !== undefined) {
      this.leadFilter.frequency.rampTo(params.filterCutoff, 0.3, now);
    }

    // Master filter — destination progress
    if (this.masterFilter && params.masterFilterCutoff !== undefined) {
      this.masterFilter.frequency.rampTo(params.masterFilterCutoff, 1, now);
    }

    // Tension — weave in dissonant notes
    this._updateTension(params.tension || 0);
  }

  _updateTension(tension) {
    if (!this.genre || !this.leadSequence) return;

    const shouldTense = tension > 0.3;

    if (shouldTense && !this._tensionActive) {
      // Add tension notes to the pattern
      const basePattern = [...this.genre.lead.pattern];
      const tensionNotes = this.genre.tensionNotes;
      // Intersperse tension notes
      for (let i = 0; i < tensionNotes.length && i * 2 + 1 < basePattern.length; i++) {
        basePattern[i * 2 + 1] = tensionNotes[i];
      }
      this._replaceLeadPattern(basePattern);
      this._tensionActive = true;
    } else if (!shouldTense && this._tensionActive) {
      // Restore original pattern
      this._replaceLeadPattern([...this.genre.lead.pattern]);
      this._tensionActive = false;
    }
  }

  _replaceLeadPattern(newPattern) {
    if (!this.leadSequence) return;
    // Tone.Sequence doesn't support live pattern swap easily,
    // so we update events in place
    this._currentPattern = newPattern;
    this.leadSequence.dispose();
    this.leadSequence = new Tone.Sequence(
      (time, note) => {
        if (note) {
          this.leadSynth.triggerAttackRelease(note, '8n', time);
        }
      },
      newPattern,
      this.genre.lead.interval
    );
    if (this.isPlaying) {
      this.leadSequence.start(0);
    }
  }

  /**
   * Fade out to a consonant resolution over 4 bars, then stop
   */
  fadeOutAndStop() {
    if (!this.isPlaying) return;

    const now = Tone.now();
    const fadeTime = (60 / Tone.getTransport().bpm.value) * 4 * 4; // 4 bars

    // Resolve to tonic
    if (this.padSynth) {
      this.padSynth.triggerAttackRelease(['C3', 'E3', 'G3'], fadeTime * 0.8, now, 0.3);
    }

    // Fade master gain
    this.masterGain.gain.rampTo(0, fadeTime, now);

    // Stop after fade
    setTimeout(() => {
      this.stop();
      this.masterGain.gain.value = this.genre?.levels?.master ?? 0.7; // restore for next time
    }, fadeTime * 1000 + 200);
  }

  _teardownInstruments() {
    this.leadSequence?.dispose();
    this.padSequence?.dispose();
    this.rhythmSequence?.dispose();
    this.textureNoise?.dispose();
    this.leadSynth?.dispose();
    this.padSynth?.dispose();
    this.rhythmSynth?.dispose();
    this.leadFilter?.dispose();
    this.leadReverb?.dispose();
    this.padFilter?.dispose();
    this.padChorus?.dispose();
    this.rhythmFilter?.dispose();
    this.textureFilter?.dispose();

    this.leadSequence = null;
    this.padSequence = null;
    this.rhythmSequence = null;
    this.textureNoise = null;
    this.leadSynth = null;
    this.padSynth = null;
    this.rhythmSynth = null;
    this.leadFilter = null;
    this.leadReverb = null;
    this.padFilter = null;
    this.padChorus = null;
    this.rhythmFilter = null;
    this.textureFilter = null;

    this._currentPattern = null;
    this._tensionActive = false;
  }

  dispose() {
    this.stop();
    this._teardownInstruments();
    this.leadPanner?.dispose();
    this.masterFilter?.dispose();
    this.masterGain?.dispose();
    this.leadGain?.dispose();
    this.padGain?.dispose();
    this.rhythmGain?.dispose();
    this.textureGain?.dispose();
  }
}

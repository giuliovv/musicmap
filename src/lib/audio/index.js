// MusicMap Audio — Public API

import { SonicEngine } from './engine.js';
import { lofiGenre } from './genres/lofi.js';
import { ambientGenre } from './genres/ambient.js';
import { minimalGenre } from './genres/minimal.js';
import { computeSonificationParams } from './sonification.js';

const genres = {
  lofi: lofiGenre,
  ambient: ambientGenre,
  minimal: minimalGenre
};

const engine = new SonicEngine();
let currentGenre = lofiGenre;
let initialized = false;

/**
 * Initialize the audio engine (must be called from a user gesture)
 */
export async function initAudio() {
  if (initialized) return;
  await engine.init();
  engine.loadGenre(currentGenre);
  initialized = true;
}

/**
 * Start music playback
 */
export function startMusic() {
  if (!initialized) return;
  engine.start();
}

/**
 * Stop music playback
 */
export function stopMusic() {
  engine.stop();
}

/**
 * Fade out music gracefully and stop (for arrival)
 */
export function fadeOutMusic() {
  engine.fadeOutAndStop();
}

/**
 * Set the active genre
 * @param {string} genreName - 'lofi' | 'ambient'
 */
export function setGenre(genreName) {
  const genre = genres[genreName];
  if (!genre) return;

  currentGenre = genre;
  if (initialized) {
    const wasPlaying = engine.isPlaying;
    if (wasPlaying) engine.stop();
    engine.loadGenre(currentGenre);
    if (wasPlaying) engine.start();
  }
}

/**
 * Get all available genre names
 */
export function getGenreNames() {
  return Object.keys(genres);
}

/**
 * Get the current genre definition
 */
export function getCurrentGenre() {
  return currentGenre;
}

/**
 * Update audio parameters from navigation state
 * @param {Object} navState - Raw navigation state
 * @param {number} navState.bearingDelta
 * @param {number} navState.distanceToStep
 * @param {number} navState.totalRouteDistance
 * @param {number} navState.distanceToDestination
 */
export function updateNavigationParams(navState) {
  if (!initialized || !engine.isPlaying) return;
  const params = computeSonificationParams(navState, currentGenre);
  engine.updateSonification(params);
}

/**
 * Check if audio is playing
 */
export function isPlaying() {
  return engine.isPlaying;
}

/**
 * Check if audio is ready
 */
export function isAudioReady() {
  return initialized;
}

/**
 * Test audio with a simulated direction
 * @param {number} bearingDelta - Direction in degrees (-90=left, 0=ahead, 90=right, 180=behind)
 * @param {number} proximity - How close to a turn (0=far, 1=at turn)
 */
export function testDirection(bearingDelta, proximity = 0.5) {
  if (!initialized || !engine.isPlaying) return;
  const params = computeSonificationParams({
    bearingDelta,
    distanceToStep: (1 - proximity) * 100,
    totalRouteDistance: 1000,
    distanceToDestination: 500
  }, currentGenre);
  engine.updateSonification(params);
}

/**
 * Clean up everything
 */
export function disposeAudio() {
  engine.dispose();
  initialized = false;
}

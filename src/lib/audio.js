// Web Audio API module for spatial audio chimes

let audioContext = null;
let isUnlocked = false;

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export async function unlockAudio() {
  if (isUnlocked) return true;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Play silent buffer to unlock on iOS
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  isUnlocked = true;
  return true;
}

export function isAudioUnlocked() {
  return isUnlocked;
}

/**
 * Play a spatial chime from a specific direction
 * @param {number} bearingDelta - Angle in degrees relative to device heading
 *                                0 = ahead, 90 = right, -90 = left, 180 = behind
 */
export function playSpatialChime(bearingDelta) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    console.warn('Audio context suspended, cannot play chime');
    return;
  }

  const now = ctx.currentTime;

  // Create oscillator for 880Hz sine tone
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, now);

  // Create gain node for soft envelope
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // Decay

  // Create panner node with HRTF
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.maxDistance = 10000;
  panner.rolloffFactor = 1;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.coneOuterGain = 0;

  // Convert bearing delta to 3D position
  // Bearing: 0 = north/forward, 90 = east/right
  // In WebAudio: x = right, y = up, z = out of screen (towards listener)
  // Listener faces -z by default
  const angleRad = (bearingDelta * Math.PI) / 180;
  const distance = 2; // Virtual distance for spatial effect

  // Position the sound source
  // x: positive = right, negative = left
  // z: negative = in front, positive = behind
  const x = Math.sin(angleRad) * distance;
  const z = -Math.cos(angleRad) * distance;

  panner.positionX.setValueAtTime(x, now);
  panner.positionY.setValueAtTime(0, now);
  panner.positionZ.setValueAtTime(z, now);

  // Connect the audio graph
  oscillator.connect(gainNode);
  gainNode.connect(panner);
  panner.connect(ctx.destination);

  // Play the tone
  oscillator.start(now);
  oscillator.stop(now + 0.4);

  // Cleanup
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
    panner.disconnect();
  };
}

/**
 * Calculate the bearing delta between device heading and turn bearing
 * @param {number} deviceHeading - Current compass heading (0-360)
 * @param {number} turnBearing - Absolute bearing of the turn (0-360)
 * @returns {number} Bearing delta (-180 to 180)
 */
export function calculateBearingDelta(deviceHeading, turnBearing) {
  let delta = turnBearing - deviceHeading;

  // Normalize to -180 to 180
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;

  return delta;
}

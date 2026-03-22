// Sonification — maps navigation state to audio parameters

const PROXIMITY_RANGE = 50; // meters — start affecting audio within this range of a turn
const CHIME_RANGE = 30; // meters — music fades in within this range

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Compute audio sonification parameters from navigation state
 * @param {Object} state
 * @param {number} state.bearingDelta - Degrees from heading to next turn (-180 to 180)
 * @param {number} state.distanceToStep - Meters to current step maneuver point
 * @param {number} state.totalRouteDistance - Total route length in meters
 * @param {number} state.distanceToDestination - Remaining distance in meters
 * @param {Object} genre - Current genre definition
 * @returns {Object} Audio parameters for engine.updateSonification()
 */
export function computeSonificationParams(state, genre) {
  const {
    bearingDelta,
    distanceToStep,
    totalRouteDistance,
    distanceToDestination
  } = state;

  // Proximity: 0 = far from turn, 1 = at the turn
  const proximity = clamp(1 - (distanceToStep / PROXIMITY_RANGE), 0, 1);

  // Spatial: bearing delta → panner position
  const angleRad = (bearingDelta * Math.PI) / 180;
  const panX = Math.sin(angleRad);  // -1 (left) to 1 (right)
  const panZ = -Math.cos(angleRad); // negative = in front

  // Tempo: ramp from default to max BPM based on proximity
  const bpmTarget = lerp(genre.bpm.default, genre.bpm.max, proximity);

  // Filter: brighten as approaching turn
  const filterCutoff = lerp(genre.filterRange.min, genre.filterRange.max, proximity);

  // Tension: only activate in the close half of proximity range
  const tension = proximity > 0.5 ? (proximity - 0.5) * 2 : 0;

  // Destination progress: 0 = just started, 1 = arrived
  const destinationProgress = totalRouteDistance > 0
    ? clamp(1 - (distanceToDestination / totalRouteDistance), 0, 1)
    : 0;

  // Master filter: opens up as destination approaches
  const masterFilterCutoff = lerp(400, 8000, destinationProgress);

  // Volume: only play when near a turn (within CHIME_RANGE)
  // This makes the music act like "chimes" - silent when far, audible when near turns
  const chimeProximity = clamp(1 - (distanceToStep / CHIME_RANGE), 0, 1);
  const volume = chimeProximity; // 0 = silent, 1 = full volume

  return {
    panX,
    panZ,
    proximity,
    bpmTarget,
    filterCutoff,
    tension,
    destinationProgress,
    masterFilterCutoff,
    volume
  };
}

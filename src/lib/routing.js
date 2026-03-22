// OSRM routing module

const OSRM_URL = 'https://router.project-osrm.org';

/**
 * Get route from OSRM
 * @param {[number, number]} start - [lng, lat]
 * @param {[number, number]} end - [lng, lat]
 * @param {'foot' | 'bike'} mode - Travel mode
 * @returns {Promise<{coordinates: [number, number][], steps: Step[]}>}
 */
export async function getRoute(start, end, mode = 'foot') {
  const profile = mode === 'bike' ? 'bike' : 'foot';
  const url = `${OSRM_URL}/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates;

  // Parse turn-by-turn steps
  const steps = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      if (step.maneuver) {
        steps.push({
          instruction: formatInstruction(step.maneuver, step.name),
          location: step.maneuver.location, // [lng, lat]
          bearing: step.maneuver.bearing_after,
          distance: step.distance,
          type: step.maneuver.type,
          modifier: step.maneuver.modifier
        });
      }
    }
  }

  return {
    coordinates,
    steps,
    distance: route.distance,
    duration: route.duration
  };
}

/**
 * Format a human-readable instruction from OSRM maneuver
 */
function formatInstruction(maneuver, streetName) {
  const type = maneuver.type;
  const modifier = maneuver.modifier;

  let instruction = '';

  switch (type) {
    case 'depart':
      instruction = 'Start';
      break;
    case 'arrive':
      instruction = 'Arrive at destination';
      break;
    case 'turn':
      instruction = `Turn ${modifier || 'ahead'}`;
      break;
    case 'continue':
      instruction = 'Continue straight';
      break;
    case 'merge':
      instruction = `Merge ${modifier || ''}`;
      break;
    case 'new name':
      instruction = 'Continue';
      break;
    case 'fork':
      instruction = `Take the ${modifier || ''} fork`;
      break;
    case 'end of road':
      instruction = `Turn ${modifier || 'ahead'}`;
      break;
    case 'roundabout':
      instruction = 'Enter roundabout';
      break;
    case 'exit roundabout':
      instruction = 'Exit roundabout';
      break;
    default:
      instruction = modifier ? `Go ${modifier}` : 'Continue';
  }

  if (streetName && streetName !== '') {
    instruction += ` onto ${streetName}`;
  }

  return instruction;
}

/**
 * Geocode an address using Nominatim
 * @param {string} query - Search query
 * @returns {Promise<{name: string, lat: number, lng: number}[]>}
 */
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MusicMap/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data = await response.json();

  return data.map(item => ({
    name: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon)
  }));
}

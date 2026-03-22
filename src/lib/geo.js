// Geolocation and compass heading module

/**
 * Calculate distance between two points using Haversine formula
 * @param {[number, number]} p1 - [lng, lat]
 * @param {[number, number]} p2 - [lng, lat]
 * @returns {number} Distance in meters
 */
export function getDistance(p1, p2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const deltaLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const deltaLng = ((p2[0] - p1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing from p1 to p2
 * @param {[number, number]} p1 - [lng, lat]
 * @param {[number, number]} p2 - [lng, lat]
 * @returns {number} Bearing in degrees (0-360)
 */
export function getBearing(p1, p2) {
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const deltaLng = ((p2[0] - p1[0]) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Watch device position
 * @param {function} callback - Called with {lat, lng, accuracy, heading}
 * @returns {number} Watch ID for clearing
 */
export function watchPosition(callback, errorCallback) {
  if (!navigator.geolocation) {
    errorCallback?.(new Error('Geolocation not supported'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading, // May be null
        speed: position.coords.speed
      });
    },
    (error) => {
      errorCallback?.(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
}

/**
 * Stop watching position
 * @param {number} watchId
 */
export function clearWatch(watchId) {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Request compass heading permission (iOS 13+)
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestCompassPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    return false;
  }

  // iOS 13+ requires permission
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Compass permission error:', e);
      return false;
    }
  }

  // Android and older iOS don't need permission
  return true;
}

/**
 * Start watching compass heading
 * @param {function} callback - Called with heading in degrees (0-360)
 * @returns {function} Cleanup function
 */
export function watchCompassHeading(callback) {
  let lastHeading = 0;

  const handler = (event) => {
    let heading = null;

    // iOS provides webkitCompassHeading
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    }
    // Android/Chrome provides absolute alpha when available
    else if (event.absolute && event.alpha !== null) {
      // Alpha is rotation around z-axis, 0-360, clockwise when looking down
      // Compass heading: 0 = North, 90 = East
      heading = 360 - event.alpha;
    }
    // Fallback for non-absolute readings
    else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    if (heading !== null) {
      // Smooth the heading to avoid jitter
      const delta = heading - lastHeading;
      if (Math.abs(delta) > 180) {
        lastHeading = heading;
      } else {
        lastHeading = lastHeading + delta * 0.3; // Low-pass filter
      }
      lastHeading = (lastHeading + 360) % 360;
      callback(lastHeading);
    }
  };

  window.addEventListener('deviceorientation', handler, true);

  return () => {
    window.removeEventListener('deviceorientation', handler, true);
  };
}

/**
 * Find the closest point on a route to a given position
 * @param {[number, number]} position - [lng, lat]
 * @param {[number, number][]} coordinates - Route coordinates
 * @returns {{index: number, distance: number, point: [number, number]}}
 */
export function findClosestPointOnRoute(position, coordinates) {
  let minDistance = Infinity;
  let closestIndex = 0;
  let closestPoint = coordinates[0];

  for (let i = 0; i < coordinates.length; i++) {
    const dist = getDistance(position, coordinates[i]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
      closestPoint = coordinates[i];
    }
  }

  return {
    index: closestIndex,
    distance: minDistance,
    point: closestPoint
  };
}

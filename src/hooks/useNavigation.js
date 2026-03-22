import { useState, useRef, useCallback, useEffect } from 'react';
import { getRoute } from '../lib/routing.js';
import { getDistance, watchPosition, clearWatch, requestCompassPermission, watchCompassHeading } from '../lib/geo.js';
import { unlockAudio, playSpatialChime } from '../lib/audio.js';
import { createSimulator } from '../lib/simulation.js';

const GEOFENCE_RADIUS = 20; // meters
const CHIME_COOLDOWN = 3000; // milliseconds between chimes for same step

export function useNavigation(mapboxToken) {
  const [position, setPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [error, setError] = useState(null);
  const [travelMode, setTravelMode] = useState('foot'); // 'foot' or 'bike'

  const watchIdRef = useRef(null);
  const compassCleanupRef = useRef(null);
  const simulatorRef = useRef(null);
  const lastChimeTimeRef = useRef({});
  const initialPositionRequestedRef = useRef(false);

  // Request GPS position immediately on mount
  useEffect(() => {
    if (initialPositionRequestedRef.current) return;
    initialPositionRequestedRef.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.log('Initial position request denied or failed:', err.message);
        // Use default position (London) if denied
        setPosition({ lat: 51.509865, lng: -0.118092 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Get initial position
  const getInitialPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Set destination and fetch route
  const setDestinationAndFetchRoute = useCallback(async (dest, mode) => {
    setDestination(dest);
    setError(null);
    if (mode) setTravelMode(mode);
    const useMode = mode || travelMode;

    try {
      // Try to get current position
      let startPos;
      try {
        startPos = await getInitialPosition();
        setPosition(startPos);
      } catch (e) {
        // Use default position if geolocation fails
        console.warn('Could not get position, using default:', e);
        startPos = { lat: 51.509865, lng: -0.118092 }; // London default
        setPosition(startPos);
      }

      // Fetch route
      const routeData = await getRoute(
        [startPos.lng, startPos.lat],
        [dest.lng, dest.lat],
        useMode
      );

      setRoute(routeData);
      setCurrentStepIndex(0);

      return routeData;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [getInitialPosition, travelMode]);

  // Start navigation
  const startNavigation = useCallback(async () => {
    if (!route) {
      setError('No route set');
      return;
    }

    setError(null);

    // Unlock audio
    await unlockAudio();

    // Request compass permission (iOS)
    await requestCompassPermission();

    // Start compass heading
    compassCleanupRef.current = watchCompassHeading((h) => {
      setHeading(h);
    });

    // Try to start real geolocation
    let useSimulation = false;

    try {
      await getInitialPosition();

      watchIdRef.current = watchPosition(
        (pos) => {
          setPosition({ lat: pos.lat, lng: pos.lng });
          // Use GPS heading if available, otherwise keep compass heading
          if (pos.heading != null && !isNaN(pos.heading)) {
            setHeading(pos.heading);
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Switch to simulation on error
          if (!simulatorRef.current) {
            startSimulation();
          }
        }
      );
    } catch (e) {
      console.warn('Geolocation failed, starting simulation:', e);
      useSimulation = true;
    }

    if (useSimulation) {
      startSimulation();
    }

    setIsNavigating(true);
  }, [route, getInitialPosition]);

  // Start simulation mode
  const startSimulation = useCallback(() => {
    if (!route?.coordinates) return;

    setIsSimulation(true);
    simulatorRef.current = createSimulator(route.coordinates, travelMode);

    simulatorRef.current.subscribe((pos) => {
      setPosition({ lat: pos.lat, lng: pos.lng });
      setHeading(pos.heading);
    });

    simulatorRef.current.start();
  }, [route, travelMode]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);

    if (watchIdRef.current) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (compassCleanupRef.current) {
      compassCleanupRef.current();
      compassCleanupRef.current = null;
    }

    if (simulatorRef.current) {
      simulatorRef.current.stop();
      simulatorRef.current = null;
    }

    setIsSimulation(false);
  }, []);

  // Check geofence and play chimes
  useEffect(() => {
    if (!isNavigating || !position || !route?.steps) return;

    const currentStep = route.steps[currentStepIndex];
    if (!currentStep || currentStep.type === 'arrive') return;

    // Only play chimes for actual turns based on modifier
    const turnModifiers = ['left', 'right', 'slight left', 'slight right', 'sharp left', 'sharp right'];
    const isTurn = turnModifiers.includes(currentStep.modifier) ||
                   (currentStep.type === 'turn' && currentStep.modifier);

    if (!isTurn) return;

    // Calculate distance to current step
    const stepLocation = currentStep.location;
    const distance = getDistance(
      [position.lng, position.lat],
      stepLocation
    );

    // Check if we're within geofence
    if (distance <= GEOFENCE_RADIUS) {
      const now = Date.now();
      const lastChime = lastChimeTimeRef.current[currentStepIndex] || 0;

      // Play chime if cooldown has passed
      if (now - lastChime >= CHIME_COOLDOWN) {
        // Determine turn direction from modifier
        let turnAngle = 0;
        const mod = currentStep.modifier;
        if (mod === 'left') turnAngle = -90;
        else if (mod === 'slight left') turnAngle = -30;
        else if (mod === 'sharp left') turnAngle = -135;
        else if (mod === 'right') turnAngle = 90;
        else if (mod === 'slight right') turnAngle = 30;
        else if (mod === 'sharp right') turnAngle = 135;

        if (turnAngle !== 0) {
          console.log(`Playing chime: ${mod} (${turnAngle}°) at ${Math.round(distance)}m`);
          playSpatialChime(turnAngle);
          lastChimeTimeRef.current[currentStepIndex] = now;
        }
      }
    }

    // Check if we've passed the turn (moved beyond it)
    if (distance <= 10 && currentStepIndex < route.steps.length - 1) {
      // Check if we're closer to next step
      const nextStep = route.steps[currentStepIndex + 1];
      if (nextStep) {
        const nextDistance = getDistance(
          [position.lng, position.lat],
          nextStep.location
        );
        if (nextDistance < distance) {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    }
  }, [isNavigating, position, heading, route, currentStepIndex]);

  // Get current instruction
  const currentInstruction = route?.steps?.[currentStepIndex]?.instruction || null;
  const currentDistance = route?.steps?.[currentStepIndex] ?
    (position ? getDistance([position.lng, position.lat], route.steps[currentStepIndex].location) : null)
    : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNavigation();
    };
  }, [stopNavigation]);

  return {
    position,
    destination,
    route,
    heading,
    isNavigating,
    isSimulation,
    error,
    currentInstruction,
    currentDistance,
    travelMode,
    setTravelMode,
    setDestinationAndFetchRoute,
    startNavigation,
    stopNavigation,
    startSimulation
  };
}

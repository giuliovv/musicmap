import { useState, useRef, useCallback, useEffect } from 'react';
import { getRoute } from '../lib/routing.js';
import { getDistance, watchPosition, clearWatch, requestCompassPermission, watchCompassHeading, calculateBearingDelta } from '../lib/geo.js';
import { initAudio, updateNavigationParams, fadeOutMusic } from '../lib/audio/index.js';
import { createSimulator } from '../lib/simulation.js';

export function useNavigation() {
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

      // Log route steps for debugging
      console.log('Route steps:', routeData.steps.map((s, i) =>
        `${i}: ${s.type} ${s.modifier || ''} - ${s.instruction}`
      ));

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

    // Init audio engine
    await initAudio();

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

  // Continuous sonification — update audio params on every position/heading change
  useEffect(() => {
    if (!isNavigating || !position || !route?.steps) return;

    const currentStep = route.steps[currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to current step
    const stepLocation = currentStep.location;
    const distanceToStep = getDistance(
      [position.lng, position.lat],
      stepLocation
    );

    // Find distance to next step (remote's improved step advancement)
    const nextStep = route.steps[currentStepIndex + 1];
    const nextDistance = nextStep
      ? getDistance([position.lng, position.lat], nextStep.location)
      : Infinity;

    // Advance to next step if we're closer to it than current step
    if (nextStep && nextDistance < distanceToStep && currentStepIndex < route.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      return;
    }

    // Calculate remaining distance to destination
    const lastStep = route.steps[route.steps.length - 1];
    const distanceToDestination = lastStep
      ? getDistance([position.lng, position.lat], lastStep.location)
      : 0;

    // Bearing delta for spatial panning
    const bearingDelta = calculateBearingDelta(heading, currentStep.bearing);

    // Handle arrival
    if (currentStep.type === 'arrive' && distanceToStep <= 15) {
      fadeOutMusic();
    } else if (currentStep.type !== 'depart') {
      // Update sonification continuously (skip depart steps)
      updateNavigationParams({
        bearingDelta,
        distanceToStep,
        totalRouteDistance: route.distance || 1,
        distanceToDestination
      });
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

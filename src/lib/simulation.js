// Simulation mode for testing navigation without real GPS

import { getDistance, getBearing } from './geo.js';

const WALKING_SPEED = 1.4; // meters per second (~5 km/h)
const UPDATE_INTERVAL = 100; // milliseconds

export class RouteSimulator {
  constructor(coordinates) {
    this.coordinates = coordinates;
    this.currentIndex = 0;
    this.progress = 0; // Progress between current and next point (0-1)
    this.heading = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.callbacks = [];
  }

  /**
   * Start the simulation
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.update();
    }, UPDATE_INTERVAL);
  }

  /**
   * Pause the simulation
   */
  pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Stop and reset the simulation
   */
  stop() {
    this.pause();
    this.currentIndex = 0;
    this.progress = 0;
  }

  /**
   * Subscribe to position updates
   * @param {function} callback - Called with {lat, lng, heading, speed}
   * @returns {function} Unsubscribe function
   */
  subscribe(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current simulated position
   */
  getCurrentPosition() {
    if (this.coordinates.length === 0) {
      return null;
    }

    if (this.currentIndex >= this.coordinates.length - 1) {
      const lastPoint = this.coordinates[this.coordinates.length - 1];
      return {
        lat: lastPoint[1],
        lng: lastPoint[0],
        heading: this.heading,
        speed: 0,
        accuracy: 5
      };
    }

    const current = this.coordinates[this.currentIndex];
    const next = this.coordinates[this.currentIndex + 1];

    // Interpolate position
    const lng = current[0] + (next[0] - current[0]) * this.progress;
    const lat = current[1] + (next[1] - current[1]) * this.progress;

    return {
      lat,
      lng,
      heading: this.heading,
      speed: WALKING_SPEED,
      accuracy: 5
    };
  }

  /**
   * Update simulation state
   */
  update() {
    if (this.currentIndex >= this.coordinates.length - 1) {
      this.pause();
      this.notifyCallbacks();
      return;
    }

    const current = this.coordinates[this.currentIndex];
    const next = this.coordinates[this.currentIndex + 1];
    const segmentDistance = getDistance(current, next);

    // Calculate heading towards next point
    this.heading = getBearing(current, next);

    // Move along the segment
    const distancePerUpdate = (WALKING_SPEED * UPDATE_INTERVAL) / 1000;
    const progressIncrement = segmentDistance > 0 ? distancePerUpdate / segmentDistance : 1;

    this.progress += progressIncrement;

    // Move to next segment if we've passed the current one
    while (this.progress >= 1 && this.currentIndex < this.coordinates.length - 1) {
      this.progress -= 1;
      this.currentIndex++;

      if (this.currentIndex < this.coordinates.length - 1) {
        const newCurrent = this.coordinates[this.currentIndex];
        const newNext = this.coordinates[this.currentIndex + 1];
        this.heading = getBearing(newCurrent, newNext);
      }
    }

    this.notifyCallbacks();
  }

  /**
   * Notify all subscribers of current position
   */
  notifyCallbacks() {
    const position = this.getCurrentPosition();
    if (position) {
      for (const callback of this.callbacks) {
        callback(position);
      }
    }
  }

  /**
   * Check if simulation has reached the end
   */
  isComplete() {
    return this.currentIndex >= this.coordinates.length - 1;
  }

  /**
   * Get progress as percentage (0-100)
   */
  getProgressPercentage() {
    if (this.coordinates.length <= 1) return 100;
    const totalSegments = this.coordinates.length - 1;
    return ((this.currentIndex + this.progress) / totalSegments) * 100;
  }
}

/**
 * Create a simulator if geolocation is unavailable
 * @param {[number, number][]} coordinates - Route coordinates
 * @returns {RouteSimulator}
 */
export function createSimulator(coordinates) {
  return new RouteSimulator(coordinates);
}

/**
 * Check if we should use simulation mode
 * @returns {boolean}
 */
export function shouldUseSimulation() {
  // Check if geolocation is available
  if (!navigator.geolocation) {
    return true;
  }

  // We'll determine this dynamically when we try to get position
  return false;
}

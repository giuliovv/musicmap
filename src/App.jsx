import { useState, useCallback } from 'react';
import Map from './components/Map.jsx';
import SearchBar from './components/SearchBar.jsx';
import NavigationPill from './components/NavigationPill.jsx';
import AudioTest from './components/AudioTest.jsx';
import { useNavigation } from './hooks/useNavigation.js';
import { unlockAudio } from './lib/audio.js';

// You'll need to provide your Mapbox token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function App() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showAudioTest, setShowAudioTest] = useState(false);

  const {
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
    stopNavigation
  } = useNavigation(MAPBOX_TOKEN);

  // Handle first tap to unlock audio
  const handleFirstTap = useCallback(async () => {
    if (!audioUnlocked) {
      await unlockAudio();
      setAudioUnlocked(true);
    }
  }, [audioUnlocked]);

  // Handle destination selection
  const handleDestinationSelect = useCallback(async (result) => {
    await handleFirstTap();
    try {
      await setDestinationAndFetchRoute({
        lat: result.lat,
        lng: result.lng,
        name: result.name
      }, travelMode);
    } catch (e) {
      console.error('Failed to set destination:', e);
    }
  }, [setDestinationAndFetchRoute, handleFirstTap, travelMode]);

  // Handle mode change
  const handleModeChange = useCallback(async (mode) => {
    setTravelMode(mode);
    // Re-fetch route if we have a destination
    if (destination) {
      try {
        await setDestinationAndFetchRoute(destination, mode);
      } catch (e) {
        console.error('Failed to update route:', e);
      }
    }
  }, [destination, setDestinationAndFetchRoute, setTravelMode]);

  // Handle start button
  const handleStart = useCallback(async () => {
    await handleFirstTap();
    await startNavigation();
  }, [startNavigation, handleFirstTap]);

  // Handle stop
  const handleStop = useCallback(() => {
    stopNavigation();
  }, [stopNavigation]);

  // Check for missing token
  if (!MAPBOX_TOKEN) {
    return (
      <div style={errorContainerStyle}>
        <h1>Missing Mapbox Token</h1>
        <p>Create a <code>.env</code> file in the project root with:</p>
        <pre>VITE_MAPBOX_TOKEN=your_token_here</pre>
        <p>Get a free token at <a href="https://mapbox.com">mapbox.com</a></p>
      </div>
    );
  }

  return (
    <div style={appStyle} onClick={handleFirstTap}>
      {/* Map */}
      <Map
        mapboxToken={MAPBOX_TOKEN}
        position={position}
        destination={destination}
        routeCoordinates={route?.coordinates}
        heading={isNavigating ? heading : null}
      />

      {/* Search bar */}
      <div style={searchContainerStyle}>
        <SearchBar
          onSelect={handleDestinationSelect}
          disabled={isNavigating}
        />
      </div>

      {/* Error message */}
      {error && (
        <div style={errorBannerStyle}>
          {error}
        </div>
      )}

      {/* Mode toggle */}
      {!isNavigating && (
        <div style={modeToggleContainerStyle}>
          <button
            style={{
              ...modeButtonStyle,
              ...(travelMode === 'foot' ? modeButtonActiveStyle : {})
            }}
            onClick={() => handleModeChange('foot')}
          >
            Walk
          </button>
          <button
            style={{
              ...modeButtonStyle,
              borderBottom: 'none',
              ...(travelMode === 'bike' ? modeButtonActiveStyle : {})
            }}
            onClick={() => handleModeChange('bike')}
          >
            Bike
          </button>
        </div>
      )}

      {/* Start/Stop button */}
      {route && !isNavigating && (
        <button style={startButtonStyle} onClick={handleStart}>
          Start Navigation
        </button>
      )}

      {isNavigating && (
        <button style={stopButtonStyle} onClick={handleStop}>
          Stop
        </button>
      )}

      {/* Navigation pill */}
      {isNavigating && currentInstruction && (
        <div style={pillContainerStyle}>
          <NavigationPill
            instruction={currentInstruction}
            distance={currentDistance}
            isSimulation={isSimulation}
          />
        </div>
      )}

      {/* Audio test button */}
      <button
        style={audioTestButtonStyle}
        onClick={() => setShowAudioTest(true)}
      >
        Test Audio
      </button>

      {/* Audio test panel */}
      {showAudioTest && (
        <AudioTest onClose={() => setShowAudioTest(false)} />
      )}
    </div>
  );
}

const appStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const searchContainerStyle = {
  position: 'absolute',
  top: '16px',
  left: '16px',
  right: '16px',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10
};

const startButtonStyle = {
  position: 'absolute',
  bottom: '100px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '16px 32px',
  fontSize: '16px',
  fontWeight: '600',
  color: 'white',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
  cursor: 'pointer',
  zIndex: 10
};

const stopButtonStyle = {
  position: 'absolute',
  top: '80px',
  right: '16px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: '600',
  color: 'white',
  background: '#ef4444',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  zIndex: 10
};

const pillContainerStyle = {
  position: 'absolute',
  bottom: '40px',
  left: '16px',
  right: '16px',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10
};

const errorBannerStyle = {
  position: 'absolute',
  top: '80px',
  left: '16px',
  right: '16px',
  padding: '12px 16px',
  background: '#fef2f2',
  color: '#dc2626',
  borderRadius: '8px',
  fontSize: '14px',
  textAlign: 'center',
  zIndex: 10
};

const errorContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  padding: '20px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  textAlign: 'center'
};

const audioTestButtonStyle = {
  position: 'absolute',
  bottom: '40px',
  right: '16px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  background: 'white',
  border: 'none',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  cursor: 'pointer',
  zIndex: 10
};

const modeToggleContainerStyle = {
  position: 'absolute',
  bottom: '100px',
  left: '16px',
  display: 'flex',
  flexDirection: 'column',
  background: 'white',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  zIndex: 10
};

const modeButtonStyle = {
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#6b7280',
  background: 'white',
  border: 'none',
  borderBottom: '1px solid #e5e7eb',
  cursor: 'pointer',
  transition: 'all 0.15s'
};

const modeButtonActiveStyle = {
  color: 'white',
  background: '#3b82f6'
};

export default App;

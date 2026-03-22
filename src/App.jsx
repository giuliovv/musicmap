import { useState, useCallback, useEffect } from 'react';
import Map from './components/Map.jsx';
import SearchBar from './components/SearchBar.jsx';
import NavigationPill from './components/NavigationPill.jsx';
import AudioTestPanel from './components/AudioTestPanel.jsx';
import { useNavigation } from './hooks/useNavigation.js';
import { initAudio, startMusic, stopMusic } from './lib/audio/index.js';
import {
  isSpotifyConnected,
  initiateSpotifyAuth,
  handleSpotifyCallback,
  clearTokens
} from './lib/spotify.js';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';

function App() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(isSpotifyConnected());

  // Handle Spotify OAuth callback on mount
  useEffect(() => {
    handleSpotifyCallback()
      .then((handled) => {
        if (handled) {
          setSpotifyConnected(true);
        }
      })
      .catch((err) => {
        console.error('Spotify auth error:', err);
      });
  }, []);

  const handleSpotifyConnect = useCallback(() => {
    initiateSpotifyAuth();
  }, []);

  const handleSpotifyDisconnect = useCallback(() => {
    clearTokens();
    setSpotifyConnected(false);
  }, []);

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
  } = useNavigation();

  // Handle first tap to unlock audio
  const handleFirstTap = useCallback(async () => {
    if (!audioUnlocked) {
      await initAudio();
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
    startMusic();
  }, [startNavigation, handleFirstTap]);

  // Handle stop
  const handleStop = useCallback(() => {
    stopMusic();
    stopNavigation();
  }, [stopNavigation]);

  return (
    <div style={appStyle} onTouchStart={handleFirstTap} onClick={handleFirstTap}>
      {/* Map */}
      <Map
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

      {/* Audio test panel — hidden during navigation */}
      {!isNavigating && <AudioTestPanel />}

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

      {/* Bottom right buttons */}
      <div style={bottomRightContainerStyle}>
        {SPOTIFY_CLIENT_ID && (
          <button
            style={{
              ...smallButtonStyle,
              background: spotifyConnected ? '#1DB954' : 'white',
              color: spotifyConnected ? 'white' : '#374151'
            }}
            onClick={spotifyConnected ? handleSpotifyDisconnect : handleSpotifyConnect}
          >
            {spotifyConnected ? 'Spotify ✓' : 'Spotify'}
          </button>
        )}
      </div>
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
  zIndex: 1000
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
  zIndex: 1000
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
  zIndex: 1000
};

const pillContainerStyle = {
  position: 'absolute',
  bottom: '40px',
  left: '16px',
  right: '16px',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 1000
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
  zIndex: 1000
};

const bottomRightContainerStyle = {
  position: 'absolute',
  bottom: '100px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  zIndex: 1000
};

const smallButtonStyle = {
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  background: 'white',
  border: 'none',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  cursor: 'pointer'
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
  zIndex: 1000
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

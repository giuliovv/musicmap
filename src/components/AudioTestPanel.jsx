import { useState, useCallback } from 'react';
import { initAudio, startMusic, stopMusic, testDirection, setGenre, getGenreNames } from '../lib/audio/index.js';

const directions = [
  { label: 'Left',    bearing: -90, icon: '←' },
  { label: 'Ahead',   bearing: 0,   icon: '↑' },
  { label: 'Right',   bearing: 90,  icon: '→' },
  { label: 'Behind',  bearing: 180, icon: '↓' },
];

const genreLabels = {
  lofi: 'Lo-fi',
  ambient: 'Ambient',
  minimal: 'Minimal'
};

export default function AudioTestPanel() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeDir, setActiveDir] = useState(null);
  const [proximity, setProximity] = useState(0.3);
  const [activeGenre, setActiveGenre] = useState('lofi');

  const handleToggleMusic = useCallback(async (e) => {
    e.stopPropagation(); // prevent app-level click handler from interfering
    if (!playing) {
      // initAudio must complete in this same user gesture for iOS
      await initAudio();
      setGenre(activeGenre);
      startMusic();
      setPlaying(true);
    } else {
      stopMusic();
      setPlaying(false);
      setActiveDir(null);
    }
  }, [playing, activeGenre]);

  const handleGenreChange = useCallback((genreName) => {
    setActiveGenre(genreName);
    setGenre(genreName);
  }, []);

  const handleDirection = useCallback((dir) => {
    if (!playing) return;
    setActiveDir(dir.label);
    testDirection(dir.bearing, proximity);
  }, [playing, proximity]);

  const handleProximity = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setProximity(val);
    if (playing && activeDir !== null) {
      const dir = directions.find(d => d.label === activeDir);
      if (dir) testDirection(dir.bearing, val);
    }
  }, [playing, activeDir]);

  if (!open) {
    return (
      <button style={toggleBtnStyle} onClick={() => setOpen(true)}>
        Test Audio
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>Audio Test</span>
        <button style={closeBtnStyle} onClick={() => { stopMusic(); setPlaying(false); setOpen(false); }}>
          ✕
        </button>
      </div>

      {/* Genre picker */}
      <div style={genreRowStyle}>
        {getGenreNames().map((name) => (
          <button
            key={name}
            style={activeGenre === name ? genreBtnActiveStyle : genreBtnStyle}
            onClick={() => handleGenreChange(name)}
          >
            {genreLabels[name] || name}
          </button>
        ))}
      </div>

      {/* Play/Stop */}
      <button style={playing ? playBtnActiveStyle : playBtnStyle} onClick={handleToggleMusic}>
        {playing ? 'Stop Music' : 'Play Music'}
      </button>

      {/* Direction buttons */}
      <div style={dirGridStyle}>
        {directions.map((dir) => (
          <button
            key={dir.label}
            style={activeDir === dir.label ? dirBtnActiveStyle : dirBtnStyle}
            onClick={() => handleDirection(dir)}
            disabled={!playing}
          >
            <span style={{ fontSize: '18px' }}>{dir.icon}</span>
            <span style={{ fontSize: '11px' }}>{dir.label}</span>
          </button>
        ))}
      </div>

      {/* Proximity slider */}
      <div style={sliderContainerStyle}>
        <label style={{ fontSize: '12px', color: '#666' }}>
          Proximity: {proximity < 0.3 ? 'Far' : proximity < 0.7 ? 'Near' : 'At turn'}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={proximity}
          onChange={handleProximity}
          disabled={!playing}
          style={{ width: '100%' }}
        />
      </div>

      <p style={hintStyle}>
        Use headphones for spatial effect
      </p>
    </div>
  );
}

const toggleBtnStyle = {
  position: 'absolute',
  bottom: '40px',
  right: '16px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#3b82f6',
  background: 'white',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  cursor: 'pointer',
  zIndex: 1000,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  outline: 'none'
};

const panelStyle = {
  position: 'absolute',
  bottom: '40px',
  right: '16px',
  width: '220px',
  padding: '12px',
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#999',
  padding: '0 4px',
  outline: 'none'
};

const genreRowStyle = {
  display: 'flex',
  gap: '4px'
};

const genreBtnStyle = {
  flex: 1,
  padding: '6px 4px',
  fontSize: '12px',
  fontWeight: '500',
  color: '#666',
  background: '#f3f4f6',
  border: '2px solid transparent',
  borderRadius: '6px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.15s'
};

const genreBtnActiveStyle = {
  ...genreBtnStyle,
  color: '#3b82f6',
  background: '#eff6ff',
  borderColor: '#3b82f6',
  fontWeight: '600'
};

const playBtnStyle = {
  padding: '10px',
  fontSize: '14px',
  fontWeight: '600',
  color: 'white',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  outline: 'none'
};

const playBtnActiveStyle = {
  ...playBtnStyle,
  background: '#ef4444'
};

const dirGridStyle = {
  display: 'flex',
  gap: '6px'
};

const dirBtnStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  padding: '8px 4px',
  background: '#f3f4f6',
  border: '2px solid transparent',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  outline: 'none'
};

const dirBtnActiveStyle = {
  ...dirBtnStyle,
  background: '#eff6ff',
  borderColor: '#3b82f6'
};

const sliderContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const hintStyle = {
  margin: 0,
  fontSize: '11px',
  color: '#999',
  textAlign: 'center'
};

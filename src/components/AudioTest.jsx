import { useState, useCallback, useRef } from 'react';
import { unlockAudio, getAudioContext } from '../lib/audio.js';

export default function AudioTest({ onClose }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [frequency, setFrequency] = useState(880);
  const [duration, setDuration] = useState(0.4);
  const [volume, setVolume] = useState(0.3);
  const [lastPlayed, setLastPlayed] = useState(null);

  const handleUnlock = useCallback(async () => {
    await unlockAudio();
    setIsUnlocked(true);
  }, []);

  const playTestChime = useCallback((bearingDelta) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      console.warn('Audio not unlocked');
      return;
    }

    const now = ctx.currentTime;

    // Create oscillator
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    // Create gain node for envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Create panner with HRTF
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0;

    // Convert bearing to 3D position
    const angleRad = (bearingDelta * Math.PI) / 180;
    const distance = 2;
    const x = Math.sin(angleRad) * distance;
    const z = -Math.cos(angleRad) * distance;

    panner.positionX.setValueAtTime(x, now);
    panner.positionY.setValueAtTime(0, now);
    panner.positionZ.setValueAtTime(z, now);

    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    setLastPlayed(bearingDelta);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      panner.disconnect();
    };
  }, [frequency, duration, volume]);

  const directions = [
    { label: 'Front', angle: 0, emoji: '⬆️' },
    { label: 'Front-Right', angle: 45, emoji: '↗️' },
    { label: 'Right', angle: 90, emoji: '➡️' },
    { label: 'Back-Right', angle: 135, emoji: '↘️' },
    { label: 'Back', angle: 180, emoji: '⬇️' },
    { label: 'Back-Left', angle: -135, emoji: '↙️' },
    { label: 'Left', angle: -90, emoji: '⬅️' },
    { label: 'Front-Left', angle: -45, emoji: '↖️' },
  ];

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>Audio Test & Tuning</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {!isUnlocked ? (
          <div style={sectionStyle}>
            <p style={{ marginBottom: 16, color: '#666' }}>
              Browsers require a user gesture to enable audio.
            </p>
            <button onClick={handleUnlock} style={unlockButtonStyle}>
              Tap to Enable Audio
            </button>
          </div>
        ) : (
          <>
            {/* Direction buttons */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Test Directions</h3>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                Use headphones for best spatial effect
              </p>
              <div style={directionGridStyle}>
                {directions.map(({ label, angle, emoji }) => (
                  <button
                    key={angle}
                    onClick={() => playTestChime(angle)}
                    style={{
                      ...directionButtonStyle,
                      background: lastPlayed === angle ? '#3b82f6' : '#f3f4f6',
                      color: lastPlayed === angle ? 'white' : '#1f2937'
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{emoji}</span>
                    <span style={{ fontSize: 11 }}>{label}</span>
                    <span style={{ fontSize: 10, color: lastPlayed === angle ? '#dbeafe' : '#9ca3af' }}>
                      {angle}°
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Tune Parameters</h3>

              <div style={sliderRowStyle}>
                <label style={labelStyle}>
                  Frequency: {frequency} Hz
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="10"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              <div style={sliderRowStyle}>
                <label style={labelStyle}>
                  Duration: {duration.toFixed(2)}s
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              <div style={sliderRowStyle}>
                <label style={labelStyle}>
                  Volume: {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            </div>

            {/* Quick play */}
            <div style={sectionStyle}>
              <button
                onClick={() => playTestChime(0)}
                style={playButtonStyle}
              >
                Play Front
              </button>
              <button
                onClick={() => playTestChime(90)}
                style={{ ...playButtonStyle, marginLeft: 8 }}
              >
                Play Right
              </button>
              <button
                onClick={() => playTestChime(-90)}
                style={{ ...playButtonStyle, marginLeft: 8 }}
              >
                Play Left
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16
};

const panelStyle = {
  background: 'white',
  borderRadius: 16,
  width: '100%',
  maxWidth: 400,
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#6b7280',
  padding: 4
};

const sectionStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb'
};

const sectionTitleStyle = {
  margin: '0 0 12px 0',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151'
};

const unlockButtonStyle = {
  width: '100%',
  padding: '16px',
  fontSize: 16,
  fontWeight: 600,
  color: 'white',
  background: '#3b82f6',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer'
};

const directionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 8
};

const directionButtonStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 8px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.15s',
  gap: 2
};

const sliderRowStyle = {
  marginBottom: 16
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6
};

const sliderStyle = {
  width: '100%',
  height: 6,
  cursor: 'pointer'
};

const playButtonStyle = {
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 500,
  color: 'white',
  background: '#10b981',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
};

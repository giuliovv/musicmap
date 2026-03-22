export default function NavigationPill({ instruction, distance, isSimulation }) {
  if (!instruction) return null;

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div style={containerStyle}>
      {isSimulation && (
        <div style={simulationBadgeStyle}>
          SIMULATION
        </div>
      )}
      <div style={pillStyle}>
        <span style={instructionStyle}>{instruction}</span>
        {distance != null && (
          <span style={distanceStyle}>{formatDistance(distance)}</span>
        )}
      </div>
    </div>
  );
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
};

const simulationBadgeStyle = {
  padding: '4px 12px',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  background: '#f59e0b',
  color: 'white',
  borderRadius: '12px'
};

const pillStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 20px',
  background: 'white',
  borderRadius: '24px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  maxWidth: '90vw'
};

const instructionStyle = {
  fontSize: '15px',
  fontWeight: '500',
  color: '#1f2937'
};

const distanceStyle = {
  fontSize: '14px',
  color: '#6b7280',
  fontWeight: '600'
};

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Convert OSRM [lng, lat] to Leaflet [lat, lng]
function toLatlng(coord) {
  return [coord[1], coord[0]];
}

// Auto-center map on position changes
function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], map.getZoom(), { duration: 0.5 });
    }
  }, [position?.lat, position?.lng, map]);

  return null;
}

// Create position marker icon with heading arrow
function createPositionIcon(heading) {
  const headingArrow = heading != null
    ? `<div style="
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 10px solid #3b82f6;
      "></div>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transform: rotate(${heading != null ? heading : 0}deg);
      position: relative;
    ">${headingArrow}</div>`
  });
}

// Destination marker icon
const destinationIcon = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: `<div style="
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ef4444;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`
});

export default function Map({
  position,
  destination,
  routeCoordinates,
  heading
}) {
  const center = position
    ? [position.lat, position.lng]
    : [51.509865, -0.118092];

  // Convert route coords from [lng, lat] to [lat, lng]
  const polylinePositions = routeCoordinates
    ? routeCoordinates.map(toLatlng)
    : null;

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <MapUpdater position={position} />

      {/* Route polyline */}
      {polylinePositions && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.8 }}
        />
      )}

      {/* Current position marker */}
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={createPositionIcon(heading)}
        />
      )}

      {/* Destination marker */}
      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationIcon}
        />
      )}
    </MapContainer>
  );
}

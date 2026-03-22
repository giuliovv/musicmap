import { useRef, useEffect, useCallback } from 'react';
import MapGL, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const routeLayerStyle = {
  id: 'route',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 5,
    'line-opacity': 0.8
  }
};

const positionMarkerStyle = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: '#3b82f6',
  border: '3px solid white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
};

const destinationMarkerStyle = {
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: '#ef4444',
  border: '2px solid white',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
};

export default function MapboxMap({
  mapboxToken,
  position,
  destination,
  routeCoordinates,
  heading
}) {
  const mapRef = useRef(null);

  // Create GeoJSON for route
  const routeGeoJSON = routeCoordinates ? {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: routeCoordinates
    }
  } : null;

  // Center map on position changes
  useEffect(() => {
    if (mapRef.current && position) {
      mapRef.current.easeTo({
        center: [position.lng, position.lat],
        duration: 500
      });
    }
  }, [position?.lat, position?.lng]);

  const initialViewState = {
    longitude: position?.lng || -0.118092,
    latitude: position?.lat || 51.509865,
    zoom: 15,
    bearing: 0,
    pitch: 0
  };

  return (
    <MapGL
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={mapboxToken}
      attributionControl={false}
    >
      {/* Route polyline */}
      {routeGeoJSON && (
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer {...routeLayerStyle} />
        </Source>
      )}

      {/* Current position marker */}
      {position && (
        <Marker
          longitude={position.lng}
          latitude={position.lat}
          anchor="center"
        >
          <div
            style={{
              ...positionMarkerStyle,
              transform: heading != null ? `rotate(${heading}deg)` : 'none'
            }}
          >
            {heading != null && (
              <div style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '10px solid #3b82f6'
              }} />
            )}
          </div>
        </Marker>
      )}

      {/* Destination marker */}
      {destination && (
        <Marker
          longitude={destination.lng}
          latitude={destination.lat}
          anchor="center"
        >
          <div style={destinationMarkerStyle} />
        </Marker>
      )}
    </MapGL>
  );
}

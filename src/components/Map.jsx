import LeafletMap from './LeafletMap.jsx';
import MapboxMap from './MapboxMap.jsx';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function Map(props) {
  if (MAPBOX_TOKEN) {
    return <MapboxMap {...props} mapboxToken={MAPBOX_TOKEN} />;
  }
  return <LeafletMap {...props} />;
}

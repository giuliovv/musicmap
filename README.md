# MusicMap

Navigation through music — a PWA that replaces voice prompts with a spatial audio soundscape. Instead of "Turn left in 200 meters", the music pans to your left ear, the tempo picks up, and the sound brightens as you approach the turn.

## Features

- **Spatial audio navigation** — lead instrument pans toward the direction of the next turn (binaural, HRTF)
- **Proximity feedback** — tempo, filter brightness, and harmonic tension increase as you approach a maneuver
- **Three audio modes** — Lo-fi (full soundtrack), Ambient (drones/pads), Minimal (subtle overlay for use with your own music)
- **OpenStreetMap + Leaflet** — free, no API key required
- **Mapbox GL** — optional, set a token for vector map tiles
- **Walk / Bike modes** — OSRM pedestrian and cycling routing
- **Spotify integration** — optional, pauses your music during directions
- **PWA** — installable on mobile, works offline after first load
- **Simulation mode** — auto-activates when GPS is unavailable, walks the route at realistic speed

## Quick start

```bash
cd musicmap
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser. No API keys needed — it uses OpenStreetMap by default.

## Configuration (optional)

Copy `.env.example` to `.env` and fill in any optional values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_MAPBOX_TOKEN` | No | Set to use Mapbox GL instead of Leaflet/OSM. Get a free token at [mapbox.com](https://mapbox.com) |
| `VITE_SPOTIFY_CLIENT_ID` | No | Enables Spotify integration (requires Premium). Create an app at [developer.spotify.com](https://developer.spotify.com/dashboard) |

## Testing audio

1. Open the app
2. Tap **Test Audio** (bottom-right)
3. Pick a genre: Lo-fi, Ambient, or Minimal
4. Tap **Play Music**
5. Use the direction buttons to hear spatial panning
6. Drag the proximity slider to hear tempo/filter changes

Use headphones for the spatial effect — it uses binaural audio (HRTF) which doesn't work on phone speakers.

## Mobile

Start the dev server with network access:

```bash
npx vite --host
```

Open the **Network** URL on your phone (same WiFi). For GPS and compass to work, you'll need HTTPS — the simulation fallback kicks in automatically over HTTP.

## Tech stack

- **React 19** + **Vite 6**
- **Tone.js** — generative music engine, Panner3D for spatial audio
- **Leaflet** / **react-leaflet** — default map renderer (OSM tiles)
- **Mapbox GL** / **react-map-gl** — optional map renderer
- **OSRM** — open-source routing (pedestrian + cycling)
- **Nominatim** — OSM geocoding

## Project structure

```
src/
  App.jsx                    # Main app shell
  components/
    Map.jsx                  # Map switcher (Leaflet or Mapbox)
    LeafletMap.jsx           # OpenStreetMap map
    MapboxMap.jsx            # Mapbox GL map
    SearchBar.jsx            # Location search with Nominatim
    NavigationPill.jsx       # Turn-by-turn instruction display
    AudioTestPanel.jsx       # Audio testing UI
  hooks/
    useNavigation.js         # Core navigation logic + sonification
  lib/
    audio/
      index.js               # Audio public API
      engine.js              # Tone.js mixer, instruments, sonification
      sonification.js        # Maps nav state to audio parameters
      genres/
        lofi.js              # Lo-fi genre definition
        ambient.js           # Ambient genre definition
        minimal.js           # Minimal overlay genre definition
    geo.js                   # Geolocation, compass, distance/bearing math
    routing.js               # OSRM routing + Nominatim geocoding
    simulation.js            # Route simulator for testing without GPS
    spotify.js               # Spotify Web API integration
```

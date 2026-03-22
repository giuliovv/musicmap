// Spotify Web API integration for playback control

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

// Get client ID from environment
const getClientId = () => import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const getRedirectUri = () => {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  if (configured && configured.trim()) return configured.trim();
  return `${window.location.origin}/`;
};

// PKCE helpers
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Storage keys
const TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_code_verifier';

// Token management
export function getStoredToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);

  if (token && expiry && Date.now() < parseInt(expiry)) {
    return token;
  }
  return null;
}

function storeTokens(accessToken, refreshToken, expiresIn) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function isSpotifyConnected() {
  return !!getStoredToken();
}

// OAuth flow
export async function initiateSpotifyAuth() {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID not configured');
  }

  const codeVerifier = generateRandomString(64);
  localStorage.setItem(VERIFIER_KEY, codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlencode(hashed);

  const redirectUri = getRedirectUri();
  const scope = 'user-modify-playback-state user-read-playback-state';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    throw new Error(`Spotify auth error: ${error}`);
  }

  if (!code) {
    return false; // No callback to handle
  }

  const codeVerifier = localStorage.getItem(VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Missing code verifier');
  }

  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await response.json();
  storeTokens(data.access_token, data.refresh_token, data.expires_in);

  // Clean up URL
  localStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, document.title, window.location.pathname);

  return true;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  const clientId = getClientId();

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = await response.json();
  storeTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
  return data.access_token;
}

async function getValidToken() {
  let token = getStoredToken();
  if (!token) {
    token = await refreshAccessToken();
  }
  return token;
}

// Playback control
let wasPlaying = false;

export async function getPlaybackState() {
  const token = await getValidToken();
  if (!token) return null;

  try {
    const response = await fetch(`${SPOTIFY_API_URL}/me/player`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 204) {
      return { isPlaying: false, hasActiveDevice: false };
    }

    if (!response.ok) return null;

    const data = await response.json();
    return {
      isPlaying: data.is_playing,
      hasActiveDevice: true,
      trackName: data.item?.name,
      artistName: data.item?.artists?.[0]?.name,
    };
  } catch (e) {
    console.error('Failed to get playback state:', e);
    return null;
  }
}

export async function pausePlayback() {
  const token = await getValidToken();
  if (!token) {
    console.log('Spotify: No valid token');
    return false;
  }

  try {
    // Check if currently playing
    const state = await getPlaybackState();
    console.log('Spotify playback state:', state);
    wasPlaying = state?.isPlaying || false;

    if (!wasPlaying) {
      console.log('Spotify: Not playing, nothing to pause');
      return true;
    }

    console.log('Spotify: Pausing playback...');
    const response = await fetch(`${SPOTIFY_API_URL}/me/player/pause`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      console.error('Spotify pause failed:', response.status, text);
      return false;
    }
    console.log('Spotify: Paused successfully');
    return true;
  } catch (e) {
    console.error('Failed to pause playback:', e);
    return false;
  }
}

export async function resumePlayback() {
  if (!wasPlaying) return true; // Wasn't playing before

  const token = await getValidToken();
  if (!token) return false;

  try {
    const response = await fetch(`${SPOTIFY_API_URL}/me/player/play`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.ok || response.status === 204;
  } catch (e) {
    console.error('Failed to resume playback:', e);
    return false;
  }
}

// Convenience function for directions
export async function pauseForDirection() {
  if (!isSpotifyConnected()) return () => {};

  await pausePlayback();

  // Return a function to resume after a delay
  return (delayMs = 500) => {
    setTimeout(() => {
      resumePlayback();
    }, delayMs);
  };
}

import { config } from './config';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with a 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    client_id: config.twitch.clientId,
    client_secret: config.twitch.clientSecret,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Twitch access token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  console.log('[auth] Fetched new Twitch app access token');
  return cachedToken;
}

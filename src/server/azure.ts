type AzureTokenResponse = {
  access_token: string;
  expires_in?: number;
  expires_on?: number | string;
};

const DEFAULT_SCOPE = 'https://cognitiveservices.azure.com/.default';

let cachedToken: { token: string; expiresAt: number } | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseExpiration(response: AzureTokenResponse): number {
  const expiresOn = response.expires_on;
  if (expiresOn) {
    const numeric = typeof expiresOn === 'string' ? Number(expiresOn) : expiresOn;
    if (!Number.isNaN(numeric)) {
      return numeric * 1000;
    }
  }

  const expiresIn = response.expires_in;
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    return Date.now() + expiresIn * 1000;
  }

  // Default to a short lived token if expiration is not provided
  return Date.now() + 5 * 60 * 1000;
}

async function requestAzureToken(): Promise<{ token: string; expiresAt: number }> {
  const tenantId = getRequiredEnv('AZURE_OPENAI_TENANT_ID');
  const clientId = getRequiredEnv('AZURE_OPENAI_CLIENT_ID');
  const clientSecret = getRequiredEnv('AZURE_OPENAI_CLIENT_SECRET');
  const scope = process.env.AZURE_OPENAI_SCOPE ?? DEFAULT_SCOPE;

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to acquire Azure OpenAI token: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const json = (await response.json()) as AzureTokenResponse;
  const expiresAt = parseExpiration(json);

  return { token: json.access_token, expiresAt };
}

export async function getAzureAccessToken() {
  if (cachedToken && cachedToken.expiresAt - 60 * 1000 > Date.now()) {
    return cachedToken.token;
  }

  cachedToken = await requestAzureToken();
  return cachedToken.token;
}

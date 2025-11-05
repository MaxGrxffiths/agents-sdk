import { ClientSecretCredential } from '@azure/identity';
import type { AccessToken } from '@azure/core-auth';

const TOKEN_SCOPE = 'https://cognitiveservices.azure.com/.default';

type AzureOpenAIEnvironment = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  endpoint: string;
  apiVersion: string;
};

type AzureEnvKey = keyof AzureOpenAIEnvironment;

const ENV_VAR_NAMES: Record<AzureEnvKey, string> = {
  tenantId: 'AZURE_TENANT_ID',
  clientId: 'AZURE_CLIENT_ID',
  clientSecret: 'AZURE_CLIENT_SECRET',
  endpoint: 'AZURE_OPENAI_ENDPOINT',
  apiVersion: 'AZURE_OPENAI_API_VERSION',
};

let cachedEnvironment: AzureOpenAIEnvironment | null = null;
let cachedCredential: ClientSecretCredential | null = null;
let cachedAccessToken: AccessToken | null = null;

function readRequiredEnv(key: AzureEnvKey): string {
  const envVarName = ENV_VAR_NAMES[key];
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Missing required Azure OpenAI environment variable: ${envVarName}`);
  }
  if (key === 'clientSecret') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Azure OpenAI environment variable ${envVarName} cannot be empty`);
  }
  return trimmed;
}

function loadEnvironment(): AzureOpenAIEnvironment {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const tenantId = readRequiredEnv('tenantId');
  const clientId = readRequiredEnv('clientId');
  const clientSecret = readRequiredEnv('clientSecret');
  const endpoint = readRequiredEnv('endpoint');
  if (!/^https?:\/\//i.test(endpoint)) {
    throw new Error('AZURE_OPENAI_ENDPOINT must include an https:// URL');
  }
  const apiVersion = readRequiredEnv('apiVersion');

  cachedEnvironment = { tenantId, clientId, clientSecret, endpoint, apiVersion };
  return cachedEnvironment;
}

export function getAzureCredential(): ClientSecretCredential {
  if (cachedCredential) {
    return cachedCredential;
  }

  const { tenantId, clientId, clientSecret } = loadEnvironment();
  cachedCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return cachedCredential;
}

export async function getAzureAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresOnTimestamp - now > 60_000) {
    return cachedAccessToken.token;
  }

  const credential = getAzureCredential();
  const token = await credential.getToken(TOKEN_SCOPE);
  if (!token) {
    throw new Error('Failed to acquire Azure OpenAI access token');
  }

  cachedAccessToken = token;
  return token.token;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

function ensureRealtimeProtocol(endpoint: string): string {
  if (endpoint.startsWith('http://')) {
    return `ws://${endpoint.slice('http://'.length)}`;
  }
  if (endpoint.startsWith('https://')) {
    return `wss://${endpoint.slice('https://'.length)}`;
  }
  return endpoint;
}

/**
 * Builds the Azure OpenAI REST endpoint used by the Responses API.
 *
 * Example usage inside `/api/responses`:
 * ```ts
 * const url = buildAzureOpenAIRestUrl('my-responses-deployment', '/responses');
 * const response = await fetch(url, { method: 'POST', headers, body });
 * ```
 */
export function buildAzureOpenAIRestUrl(deployment: string, resourcePath: string): string {
  if (!deployment) {
    throw new Error('Azure OpenAI deployment name is required for REST URL construction');
  }
  if (!resourcePath) {
    throw new Error('A resource path is required for Azure OpenAI REST URL construction');
  }
  const { endpoint, apiVersion } = loadEnvironment();
  const cleanEndpoint = normalizeEndpoint(endpoint);
  const cleanResource = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${cleanEndpoint}/openai/deployments/${deployment}${cleanResource}?api-version=${apiVersion}`;
}

/**
 * Builds the Azure OpenAI Realtime WebSocket URL used by the `/api/session` route.
 *
 * Example usage inside `/api/session`:
 * ```ts
 * const url = buildAzureOpenAIRealtimeUrl('my-realtime-deployment');
 * const response = await fetch(url, { method: 'POST', headers, body });
 * ```
 */
export function buildAzureOpenAIRealtimeUrl(deployment: string): string {
  if (!deployment) {
    throw new Error('Azure OpenAI deployment name is required for Realtime URL construction');
  }
  const { endpoint, apiVersion } = loadEnvironment();
  const cleanEndpoint = normalizeEndpoint(endpoint);
  const realtimeBase = ensureRealtimeProtocol(cleanEndpoint);
  return `${realtimeBase}/openai/realtime?api-version=${apiVersion}&deployment=${deployment}`;
}

export function resetAzureOpenAIInternals() {
  cachedEnvironment = null;
  cachedCredential = null;
  cachedAccessToken = null;
}

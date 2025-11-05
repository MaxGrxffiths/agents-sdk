import { ClientSecretCredential, TokenCredential } from '@azure/identity';

const AZURE_SCOPE = 'https://cognitiveservices.azure.com/.default';

const endpoint = getRequiredEnv('AZURE_OPENAI_ENDPOINT');
const apiVersion = getRequiredEnv('AZURE_OPENAI_API_VERSION');
const tenantId = getRequiredEnv('AZURE_TENANT_ID');
const clientId = getRequiredEnv('AZURE_CLIENT_ID');
const clientSecret = getRequiredEnv('AZURE_CLIENT_SECRET');

let credential: TokenCredential | undefined;

function getRequiredEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAzureOpenAIEndpoint(): string {
  return endpoint.replace(/\/$/, '');
}

export function getAzureOpenAIApiVersion(): string {
  return apiVersion;
}

export function getAzureRealtimeDeployment(): string {
  return getRequiredEnv('AZURE_OPENAI_REALTIME_DEPLOYMENT');
}

export function getAzureTranscribeDeployment(): string | undefined {
  return process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT;
}

export function getAzureGuardrailDeployment(): string | undefined {
  return process.env.AZURE_OPENAI_GUARDRAIL_DEPLOYMENT;
}

function getCredential(): TokenCredential {
  if (!credential) {
    credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return credential;
}

export async function getAzureOpenAIToken(): Promise<string> {
  const token = await getCredential().getToken(AZURE_SCOPE);
  if (!token?.token) {
    throw new Error('Failed to retrieve Azure OpenAI access token');
  }
  return token.token;
}

export function buildAzureOpenAIUrl(
  path: string,
  searchParams: Record<string, string | undefined> = {},
): string {
  const base = new URL(getAzureOpenAIEndpoint() + '/');
  const url = new URL(path.replace(/^\//, ''), base);
  url.searchParams.set('api-version', getAzureOpenAIApiVersion());
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

const DEFAULT_REALTIME_MODEL = 'gpt-4o-realtime-preview-2025-06-03';
const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const DEFAULT_REALTIME_BASE_URL = 'https://api.openai.com/v1/realtime';
const DEFAULT_REALTIME_SESSION_URL = `${DEFAULT_REALTIME_BASE_URL}/sessions`;
const DEFAULT_AZURE_API_VERSION = '2024-10-01-preview';

const stripTrailingSlashes = (value?: string) =>
  value?.replace(/\/+$/, '');

export interface BrowserRealtimeConfig {
  baseUrl: string;
  model: string;
  transcriptionModel: string;
  isAzure: boolean;
}

export function getBrowserRealtimeConfig(): BrowserRealtimeConfig {
  const azureEndpoint = stripTrailingSlashes(
    process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT,
  );
  const azureApiVersion =
    process.env.NEXT_PUBLIC_AZURE_OPENAI_REALTIME_API_VERSION ??
    DEFAULT_AZURE_API_VERSION;
  const baseUrl = azureEndpoint
    ? `${azureEndpoint}/openai/realtime?api-version=${azureApiVersion}`
    : stripTrailingSlashes(process.env.NEXT_PUBLIC_REALTIME_BASE_URL) ??
      DEFAULT_REALTIME_BASE_URL;

  const model =
    process.env.NEXT_PUBLIC_AZURE_OPENAI_REALTIME_DEPLOYMENT ??
    process.env.NEXT_PUBLIC_REALTIME_MODEL ??
    DEFAULT_REALTIME_MODEL;

  const transcriptionModel =
    process.env.NEXT_PUBLIC_AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT ??
    process.env.NEXT_PUBLIC_TRANSCRIPTION_MODEL ??
    DEFAULT_TRANSCRIPTION_MODEL;

  return {
    baseUrl,
    model,
    transcriptionModel,
    isAzure: Boolean(azureEndpoint),
  };
}

export interface ServerRealtimeConfig {
  sessionUrl: string;
  model: string;
  headers: Record<string, string>;
  isAzure: boolean;
}

export function getServerRealtimeConfig(): ServerRealtimeConfig {
  const azureEndpoint = stripTrailingSlashes(
    process.env.AZURE_OPENAI_ENDPOINT ??
      process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT,
  );
  const azureApiVersion =
    process.env.AZURE_OPENAI_REALTIME_API_VERSION ??
    process.env.NEXT_PUBLIC_AZURE_OPENAI_REALTIME_API_VERSION ??
    DEFAULT_AZURE_API_VERSION;
  const isAzure = Boolean(azureEndpoint);

  const sessionUrl = isAzure
    ? `${azureEndpoint}/openai/realtime?api-version=${azureApiVersion}`
    : process.env.OPENAI_REALTIME_SESSION_URL ?? DEFAULT_REALTIME_SESSION_URL;

  const model =
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT ??
    process.env.NEXT_PUBLIC_AZURE_OPENAI_REALTIME_DEPLOYMENT ??
    process.env.REALTIME_MODEL ??
    DEFAULT_REALTIME_MODEL;

  const headers: Record<string, string> = isAzure
    ? {
        'api-key': process.env.AZURE_OPENAI_API_KEY ?? '',
        'Content-Type': 'application/json',
      }
    : {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
        'Content-Type': 'application/json',
      };

  return { sessionUrl, model, headers, isAzure };
}

export const DEFAULTS = {
  REALTIME_MODEL: DEFAULT_REALTIME_MODEL,
  TRANSCRIPTION_MODEL: DEFAULT_TRANSCRIPTION_MODEL,
  REALTIME_BASE_URL: DEFAULT_REALTIME_BASE_URL,
  REALTIME_SESSION_URL: DEFAULT_REALTIME_SESSION_URL,
  AZURE_API_VERSION: DEFAULT_AZURE_API_VERSION,
};

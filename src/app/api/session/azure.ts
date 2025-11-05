const DEFAULT_REALTIME_PATH = "/openai/realtime";

export interface AzureRealtimeSessionRequest {
  url: string;
  headers: HeadersInit;
  deployment: string;
}

function resolveAzureEndpoint(endpoint?: string) {
  if (!endpoint) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT (or equivalent) is required to build the Azure Realtime URL.",
    );
  }

  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function resolveRealtimePath(deployment: string) {
  const pathFromEnv = process.env.AZURE_OPENAI_REALTIME_PATH;
  if (!pathFromEnv || pathFromEnv.trim().length === 0) {
    return DEFAULT_REALTIME_PATH;
  }

  if (pathFromEnv.includes("{deployment}")) {
    return pathFromEnv.replace("{deployment}", encodeURIComponent(deployment));
  }

  return pathFromEnv.startsWith("/") ? pathFromEnv : `/${pathFromEnv}`;
}

export function buildAzureRealtimeSessionRequest(): AzureRealtimeSessionRequest {
  const endpoint = resolveAzureEndpoint(
    process.env.AZURE_OPENAI_ENDPOINT ?? process.env.OPENAI_BASE_URL,
  );
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION ?? process.env.OPENAI_API_VERSION;
  if (!apiVersion) {
    throw new Error(
      "AZURE_OPENAI_API_VERSION (or OPENAI_API_VERSION) must be provided for Azure Realtime sessions.",
    );
  }

  const deployment =
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT ??
    process.env.AZURE_OPENAI_DEPLOYMENT ??
    process.env.OPENAI_MODEL;
  if (!deployment) {
    throw new Error(
      "Azure Realtime deployment name is missing. Set AZURE_OPENAI_REALTIME_DEPLOYMENT or AZURE_OPENAI_DEPLOYMENT.",
    );
  }

  const bearerToken =
    process.env.AZURE_OPENAI_AD_TOKEN ?? process.env.AZURE_OPENAI_TOKEN;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!bearerToken && !apiKey) {
    throw new Error(
      "Azure credentials are missing. Provide AZURE_OPENAI_AD_TOKEN (or AZURE_OPENAI_TOKEN) or AZURE_OPENAI_API_KEY.",
    );
  }

  const realtimePath = resolveRealtimePath(deployment);
  const url = new URL(`${endpoint}${realtimePath}`);
  url.searchParams.set("api-version", apiVersion);

  if (!realtimePath.includes("/deployments/") && !realtimePath.includes("{deployment}")) {
    url.searchParams.set("deployment", deployment);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "OpenAI-Beta": "realtime=v1",
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (apiKey) {
    headers["api-key"] = apiKey;
  }

  return {
    url: url.toString(),
    headers,
    deployment,
  };
}

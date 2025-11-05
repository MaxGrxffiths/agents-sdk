import { NextRequest, NextResponse } from 'next/server';
import { getAzureAccessToken } from '@/server/azure';

// Proxy endpoint for the OpenAI Responses API
export async function POST(req: NextRequest) {
  const body = await req.json();

  const deployment = getDeploymentForModel(body.model);

  if (!deployment) {
    return NextResponse.json(
      { error: `No Azure deployment configured for model: ${body.model ?? 'undefined'}` },
      { status: 400 }
    );
  }

  let config: AzureConfig;
  try {
    config = getAzureConfig();
  } catch (err) {
    console.error('Missing Azure configuration', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  if (body.text?.format?.type === 'json_schema') {
    return await structuredResponse(config, deployment, body);
  } else {
    return await textResponse(config, deployment, body);
  }
}

type AzureConfig = {
  endpoint: string;
  apiVersion: string;
};

async function structuredResponse(config: AzureConfig, deployment: string, body: any) {
  try {
    const response = await callAzureResponses(config, deployment, body);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

async function textResponse(config: AzureConfig, deployment: string, body: any) {
  try {
    const response = await callAzureResponses(config, deployment, body);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

function getAzureConfig(): AzureConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  if (!endpoint) {
    throw new Error('Missing required environment variable: AZURE_OPENAI_ENDPOINT');
  }

  if (!apiVersion) {
    throw new Error('Missing required environment variable: AZURE_OPENAI_API_VERSION');
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ''),
    apiVersion,
  };
}

function getDeploymentMap(): Record<string, string> {
  const raw = process.env.AZURE_OPENAI_DEPLOYMENT_MAP;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  } catch (err) {
    console.error('Failed to parse AZURE_OPENAI_DEPLOYMENT_MAP', err);
    return {};
  }
}

const deploymentMap = getDeploymentMap();

function getDeploymentForModel(model: string | undefined): string | undefined {
  if (!model) {
    return undefined;
  }

  return deploymentMap[model];
}

async function callAzureResponses(config: AzureConfig, deployment: string, body: any): Promise<any> {
  const token = await getAzureAccessToken();
  const url = new URL(`${config.endpoint}/openai/deployments/${deployment}/responses`);
  url.searchParams.set('api-version', config.apiVersion);

  const rest: Record<string, unknown> = { ...((body ?? {}) as Record<string, unknown>) };
  delete rest.model;
  const payload = { ...rest, stream: false };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (process.env.AZURE_OPENAI_API_KEY) {
    headers['api-key'] = process.env.AZURE_OPENAI_API_KEY;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Azure Responses API request failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return (await response.json()) as unknown;
}
  

import { NextRequest, NextResponse } from 'next/server';

import {
  buildAzureOpenAIUrl,
  getAzureGuardrailDeployment,
  getAzureOpenAIToken,
} from '@/server/azureOpenAI';

// Proxy endpoint for the Azure OpenAI Responses API
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const result = await callAzureResponses(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

async function callAzureResponses(body: any) {
  if (!body?.model) {
    throw new Error('Missing deployment name in request body (model)');
  }

  const url = buildAzureOpenAIUrl(
    `/openai/deployments/${encodeURIComponent(body.model)}/responses`,
  );
  const token = await getAzureOpenAIToken();

  const requestPayload = {
    ...(body as Record<string, unknown>),
    stream: false,
    guardrails: body.guardrails ?? buildGuardrailConfig(body.guardrails),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Azure OpenAI responses call failed (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();
  const parsed = extractParsedContent(data);
  if (parsed !== undefined) {
    data.output_parsed = parsed;
  }
  return data;
}

function buildGuardrailConfig(existing: unknown) {
  if (existing) {
    return existing;
  }

  const guardrailDeployment = getAzureGuardrailDeployment();
  if (!guardrailDeployment) {
    return existing;
  }

  return [
    {
      deployment_name: guardrailDeployment,
      input: { type: 'guardrail_content_policy' },
      output: { type: 'guardrail_content_policy' },
    },
  ];
}

function extractParsedContent(data: any) {
  const outputs = Array.isArray(data?.output) ? data.output : [];
  for (const message of outputs) {
    const contents = Array.isArray(message?.content) ? message.content : [];
    for (const item of contents) {
      if (item?.type === 'json_schema') {
        if (item.parsed !== undefined) return item.parsed;
        if (item.schema?.parsed !== undefined) return item.schema.parsed;
      }
      if (item?.type === 'output_json') {
        if (item.parsed !== undefined) return item.parsed;
        if (item.json !== undefined) return item.json;
      }
    }
  }
  return undefined;
}
  
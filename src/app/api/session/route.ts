import { NextResponse } from 'next/server';

import {
  buildAzureOpenAIUrl,
  getAzureOpenAIToken,
  getAzureRealtimeDeployment,
  getAzureTranscribeDeployment,
} from '@/server/azureOpenAI';

export async function GET() {
  try {
    const deployment = getAzureRealtimeDeployment();
    const token = await getAzureOpenAIToken();

    const url = buildAzureOpenAIUrl('/openai/realtime', {
      deployment,
    });

    const body: Record<string, unknown> = {
      model: deployment,
    };

    const transcribeDeployment = getAzureTranscribeDeployment();
    if (transcribeDeployment) {
      body.transcription = { deployment: transcribeDeployment };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure OpenAI realtime session creation failed (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

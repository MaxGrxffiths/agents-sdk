import { NextResponse } from 'next/server';

import {
  buildAzureOpenAIUrl,
  getAzureOpenAIToken,
  getAzureRealtimeDeployment,
  getAzureTranscribeDeployment,
} from '@/server/azureOpenAI';

import { buildAzureRealtimeSessionRequest } from "./azure";

import { getServerRealtimeConfig } from "../../lib/realtimeConfig";

export async function GET() {
  try {
    const { sessionUrl, model, headers } = getServerRealtimeConfig();

    if (!headers["api-key"] && !headers["Authorization"]) {
      throw new Error(
        "Missing API credentials for realtime session creation",
      );
    }

    const response = await fetch(sessionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(
        `Failed to create realtime session: ${response.status} ${response.statusText}`,
      );
      (error as any).response = data;
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

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
    const config = getServerRealtimeConfig();

    let sessionUrl = config.sessionUrl;
    let model = config.model;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.isAzure) {
      const request = await buildAzureRealtimeSessionRequest();
      sessionUrl = request.url;
      model = request.deployment;
      headers = request.headers as Record<string, string>;
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Missing OPENAI_API_KEY for realtime session creation",
        );
      }
      headers.Authorization = `Bearer ${apiKey}`;
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

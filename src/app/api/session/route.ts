import { NextResponse } from "next/server";

import { buildAzureRealtimeSessionRequest } from "./azure";

export async function GET() {
  try {
    const { url, headers, deployment } = buildAzureRealtimeSessionRequest();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: deployment,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Azure Realtime session creation failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });

      return NextResponse.json(
        { error: "Failed to create Azure Realtime session" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data?.client_secret) {
      console.error("Azure Realtime session response missing client_secret", {
        data,
      });
      return NextResponse.json(
        { error: "Azure Realtime session response missing client_secret" },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    AZURE_OPENAI_ENDPOINT: string;
    AZURE_OPENAI_API_VERSION: string;
    AZURE_OPENAI_REALTIME_DEPLOYMENT: string;
    AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT?: string;
    AZURE_OPENAI_GUARDRAIL_DEPLOYMENT?: string;
    AZURE_TENANT_ID: string;
    AZURE_CLIENT_ID: string;
    AZURE_CLIENT_SECRET: string;
  }
}

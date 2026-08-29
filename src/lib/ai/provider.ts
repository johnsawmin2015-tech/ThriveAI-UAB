import { GoogleGenAI } from "@google/genai";

import { MODEL_DECISION_JSON_SCHEMA } from "./schemas";
import { SYSTEM_INSTRUCTION } from "./prompt";

const DEFAULT_MODEL = "gemini-3.7-flash";
const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 15_000;
const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

const unsupportedGeminiSchemaKeys = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "pattern",
]);

const toGeminiJsonSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toGeminiJsonSchema);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsupportedGeminiSchemaKeys.has(key))
      .map(([key, nested]) => [key, toGeminiJsonSchema(nested)]),
  );
};

const GEMINI_RESPONSE_JSON_SCHEMA = toGeminiJsonSchema(
  MODEL_DECISION_JSON_SCHEMA,
);

export interface ModelProvider {
  generate(prompt: string, abortSignal: AbortSignal): Promise<string | undefined>;
}

export type ModelRuntime =
  | { readonly state: "enabled"; readonly provider: ModelProvider }
  | { readonly state: "disabled" }
  | { readonly state: "not_configured" };

const providerDisabled = (): boolean => {
  const setting = process.env.AI_ENABLED?.trim().toLocaleLowerCase("en-US");
  return setting === "false" || setting === "0" || setting === "off";
};

export const resolveAiTimeoutMs = (): number => {
  const configured = Number(process.env.AI_TIMEOUT_MS);

  if (!Number.isFinite(configured)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Math.round(configured)),
  );
};

const resolveDirectModel = (): string =>
  process.env.AI_MODEL?.trim() || DEFAULT_MODEL;

const resolveGatewayModel = (): string => {
  const configured = resolveDirectModel();
  return configured.includes("/") ? configured : `google/${configured}`;
};

const createGoogleProvider = (apiKey: string): ModelProvider => {
  const client = new GoogleGenAI({ apiKey });
  const model = resolveDirectModel();

  return {
    async generate(
      prompt: string,
      abortSignal: AbortSignal,
    ): Promise<string | undefined> {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0,
          maxOutputTokens: 1_200,
          responseMimeType: "application/json",
          responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
          abortSignal,
        },
      });

      return response.text;
    },
  };
};

interface GatewayChatResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: {
      readonly content?: string;
    };
  }>;
}

const createGatewayProvider = (token: string): ModelProvider => {
  const model = resolveGatewayModel();

  return {
    async generate(
      prompt: string,
      abortSignal: AbortSignal,
    ): Promise<string | undefined> {
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: abortSignal,
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 1_200,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway request failed (${response.status}).`);
      }

      const payload = (await response.json()) as GatewayChatResponse;
      return payload.choices?.[0]?.message?.content;
    },
  };
};

export const resolveModelRuntime = (oidcToken?: string): ModelRuntime => {
  if (providerDisabled()) {
    return { state: "disabled" };
  }

  const googleKey = process.env.GEMINI_API_KEY?.trim();
  if (googleKey) {
    return { state: "enabled", provider: createGoogleProvider(googleKey) };
  }

  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    oidcToken?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim();

  if (gatewayToken) {
    return { state: "enabled", provider: createGatewayProvider(gatewayToken) };
  }

  return { state: "not_configured" };
};

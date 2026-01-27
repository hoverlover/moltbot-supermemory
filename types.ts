/**
 * Supermemory Plugin Types
 *
 * Configuration schema and types for the Supermemory integration.
 * API docs: https://supermemory.ai/docs/api-reference
 */

import { Type, type Static } from "@sinclair/typebox";

/**
 * Memory operation mode:
 * - tandem: Both built-in memory and Supermemory active. Registers supermemory_search tool.
 * - primary: Supermemory only. Replaces memory_search tool. Requires slot config.
 * - off: Plugin disabled.
 */
export const MemoryMode = Type.Union([
  Type.Literal("tandem"),
  Type.Literal("primary"),
  Type.Literal("off"),
]);

export type MemoryMode = Static<typeof MemoryMode>;

/**
 * Supermemory plugin configuration schema.
 */
export const supermemoryConfigSchema = Type.Object({
  /** Supermemory API key (required) */
  apiKey: Type.String({ description: "Supermemory API key" }),

  /** Memory operation mode (default: tandem) */
  mode: Type.Optional(
    Type.Union([Type.Literal("tandem"), Type.Literal("primary"), Type.Literal("off")], {
      default: "tandem",
      description: "Memory mode: tandem (both active), primary (replace built-in), or off",
    }),
  ),

  /** Optional container/namespace tag for organizing memories */
  containerTag: Type.Optional(
    Type.String({ description: "Container tag for organizing memories by namespace" }),
  ),

  /** Auto-inject relevant memories on agent start (default: true) */
  autoRecall: Type.Optional(
    Type.Boolean({
      default: true,
      description: "Automatically inject relevant memories into agent context",
    }),
  ),

  /** Chunk relevance threshold for search 0.0-1.0 (default: 0.5) */
  threshold: Type.Optional(
    Type.Number({
      minimum: 0,
      maximum: 1,
      default: 0.5,
      description: "Chunk threshold for search relevance (0.2=broad, 0.8=precise)",
    }),
  ),

  /** Base URL for Supermemory API (default: https://api.supermemory.ai) */
  baseUrl: Type.Optional(
    Type.String({
      default: "https://api.supermemory.ai",
      description: "Supermemory API base URL",
    }),
  ),
});

export type SupermemoryConfig = Static<typeof supermemoryConfigSchema>;

/**
 * Supermemory v3 API response types.
 */

/** Chunk within a document search result */
export type SupermemoryChunk = {
  content: string;
  score: number;
  isRelevant?: boolean;
};

/** Document result from /v3/search */
export type SupermemoryDocumentResult = {
  documentId: string;
  title?: string;
  type?: string;
  score: number;
  chunks: SupermemoryChunk[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** Response from POST /v3/search */
export type SupermemorySearchResponse = {
  results: SupermemoryDocumentResult[];
  total?: number;
  timing?: Record<string, number>;
};

/** Flattened search result for easier consumption */
export type SupermemorySearchResult = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

/** Response from POST /v3/documents */
export type SupermemoryAddResponse = {
  id: string;
  status: string;
};

/**
 * Parsed configuration with defaults applied.
 */
export function parseConfig(raw: unknown): SupermemoryConfig {
  const cfg = raw as Partial<SupermemoryConfig>;
  return {
    apiKey: cfg.apiKey ?? "",
    mode: cfg.mode ?? "tandem",
    containerTag: cfg.containerTag,
    autoRecall: cfg.autoRecall ?? true,
    threshold: cfg.threshold ?? 0.5,
    baseUrl: cfg.baseUrl ?? "https://api.supermemory.ai",
  };
}

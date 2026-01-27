/**
 * Supermemory Tools
 *
 * Tool definitions for memory search operations.
 * - supermemory_search: Additional tool for tandem mode
 * - memory_search: Replacement tool for primary mode
 */

import { Type } from "@sinclair/typebox";
import type { SupermemoryClient } from "./supermemory-client.js";
import type { SupermemoryConfig } from "./types.js";

export type ToolContext = {
  client: SupermemoryClient;
  config: SupermemoryConfig;
};

/**
 * Create the supermemory_search tool for tandem mode.
 * This is an additional tool that doesn't conflict with built-in memory_search.
 */
export function createSupermemorySearchTool(ctx: ToolContext) {
  return {
    name: "supermemory_search",
    label: "Supermemory Search",
    description:
      "Search Supermemory for long-term memories and context. Use when you need to recall " +
      "information from past conversations, user preferences, or historical context that " +
      "may not be in the current session.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query to find relevant memories" }),
      limit: Type.Optional(Type.Number({ description: "Max results to return (default: 5)" })),
    }),
    async execute(
      _toolCallId: string,
      params: { query: string; limit?: number },
    ): Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }> {
      try {
        const results = await ctx.client.search({
          q: params.query,
          containerTag: ctx.config.containerTag,
          limit: params.limit ?? 5,
          chunkThreshold: ctx.config.threshold,
        });

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No relevant memories found in Supermemory." }],
            details: { count: 0 },
          };
        }

        const text = results
          .map((r, i) => `${i + 1}. ${r.content} (relevance: ${(r.score * 100).toFixed(0)}%)`)
          .join("\n");

        return {
          content: [{ type: "text", text: `Found ${results.length} memories:\n\n${text}` }],
          details: {
            count: results.length,
            memories: results.map((r) => ({
              id: r.id,
              content: r.content,
              score: r.score,
            })),
          },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Supermemory search failed: ${String(err)}` }],
          details: { error: String(err) },
        };
      }
    },
  };
}

/**
 * Create the memory_search replacement tool for primary mode.
 * This replaces the built-in memory_search when the memory slot is claimed.
 */
export function createMemorySearchTool(ctx: ToolContext) {
  return {
    name: "memory_search",
    label: "Memory Search",
    description:
      "Search through long-term memories using Supermemory. Use when you need to recall " +
      "information from past conversations, user preferences, decisions, or any " +
      "historical context.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query to find relevant memories" }),
      limit: Type.Optional(Type.Number({ description: "Max results to return (default: 5)" })),
    }),
    async execute(
      _toolCallId: string,
      params: { query: string; limit?: number },
    ): Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }> {
      try {
        const results = await ctx.client.search({
          q: params.query,
          containerTag: ctx.config.containerTag,
          limit: params.limit ?? 5,
          chunkThreshold: ctx.config.threshold,
        });

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No relevant memories found." }],
            details: { count: 0, source: "supermemory" },
          };
        }

        const text = results
          .map((r, i) => `${i + 1}. ${r.content} (relevance: ${(r.score * 100).toFixed(0)}%)`)
          .join("\n");

        return {
          content: [{ type: "text", text: `Found ${results.length} memories:\n\n${text}` }],
          details: {
            count: results.length,
            source: "supermemory",
            memories: results.map((r) => ({
              id: r.id,
              content: r.content,
              score: r.score,
            })),
          },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Memory search failed: ${String(err)}` }],
          details: { error: String(err), source: "supermemory" },
        };
      }
    },
  };
}

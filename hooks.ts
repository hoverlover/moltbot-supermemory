/**
 * Supermemory Hooks
 *
 * Lifecycle hook handlers for automatic memory operations:
 * - before_agent_start: Auto-recall relevant memories into context
 * - after_compaction: Store compacted summaries as long-term memory
 */

import type { SupermemoryClient } from "./supermemory-client.js";
import type { SupermemoryConfig } from "./types.js";
import { resolveContainerTag } from "./types.js";
import { sanitizeQuery } from "./sanitize-query.js";

export type HookContext = {
  client: SupermemoryClient | null;
  config: SupermemoryConfig;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
};

/**
 * Create the before_agent_start hook handler for auto-recall.
 * Queries Supermemory search API and injects relevant memories into context.
 */
export function createBeforeAgentStartHandler(ctx: HookContext) {
  return async (
    event: { prompt: string; messages?: unknown[] },
    hookCtx: { agentId?: string; sessionKey?: string },
  ): Promise<{ prependContext?: string } | void> => {
    // Skip if client not configured (apiKey missing)
    if (!ctx.client) {
      return;
    }

    // Skip if auto-recall is disabled or mode is off
    if (!ctx.config.autoRecall || ctx.config.mode === "off") {
      return;
    }

    // Skip empty or very short prompts
    if (!event.prompt || event.prompt.length < 5) {
      return;
    }

    // Sanitize the prompt to remove channel metadata and artifacts
    const sanitizedQuery = sanitizeQuery(event.prompt);
    if (!sanitizedQuery || sanitizedQuery.length < 3) {
      return;
    }

    // Resolve container tag based on scope configuration
    const containerTag = resolveContainerTag({
      config: ctx.config,
      agentId: hookCtx.agentId,
      sessionKey: hookCtx.sessionKey,
    });

    try {
      const results = await ctx.client.search({
        q: sanitizedQuery,
        containerTag,
        limit: 5,
        chunkThreshold: ctx.config.threshold,
      });

      if (results.length === 0) {
        return;
      }

      const memoryContext = results
        .slice(0, 5)
        .map((r) => `- ${r.content}`)
        .join("\n");

      ctx.logger.info(`supermemory: injecting ${results.length} memories into context`);

      return {
        prependContext:
          `<supermemory-context>\n` +
          `The following memories from Supermemory may be relevant:\n${memoryContext}\n` +
          `</supermemory-context>`,
      };
    } catch (err) {
      ctx.logger.warn(`supermemory: auto-recall failed: ${String(err)}`);
      return;
    }
  };
}

/**
 * Create the after_compaction hook handler for memory storage.
 * Stores compacted summaries as long-term memories in Supermemory.
 */
export function createAfterCompactionHandler(ctx: HookContext) {
  return async (
    event: {
      messageCount: number;
      tokenCount?: number;
      compactedCount: number;
      summary: string;
      sessionId?: string;
      sessionKey?: string;
    },
    hookCtx: { agentId?: string; sessionKey?: string },
  ): Promise<void> => {
    ctx.logger.info(
      `supermemory: after_compaction fired (client: ${!!ctx.client}, mode: ${ctx.config.mode}, ` +
        `summaryLen: ${event.summary?.length ?? 0}, compacted: ${event.compactedCount})`,
    );

    // Skip if client not configured (apiKey missing)
    if (!ctx.client) {
      ctx.logger.warn("supermemory: after_compaction skipped — no client");
      return;
    }

    // Skip if mode is off
    if (ctx.config.mode === "off") {
      return;
    }

    // Skip if no summary provided
    if (!event.summary || event.summary.trim().length === 0) {
      ctx.logger.warn("supermemory: after_compaction called without summary, skipping storage");
      return;
    }

    try {
      // Resolve container tag based on scope configuration
      const containerTag = resolveContainerTag({
        config: ctx.config,
        agentId: hookCtx.agentId,
        sessionKey: event.sessionKey ?? hookCtx.sessionKey,
      });

      // Store the compacted summary as a document
      const result = await ctx.client.add({
        content: event.summary,
        containerTag,
        metadata: {
          source: "clawdbot-compaction",
          sessionId: event.sessionId,
          sessionKey: event.sessionKey,
          compactedCount: event.compactedCount,
          timestamp: new Date().toISOString(),
        },
      });

      ctx.logger.info(
        `supermemory: stored compaction summary (${event.compactedCount} messages compacted, ` +
          `id: ${result.id}, status: ${result.status})`,
      );
    } catch (err) {
      // Fire-and-forget: log error but don't block compaction
      ctx.logger.error(`supermemory: failed to store compaction summary: ${String(err)}`);
    }
  };
}

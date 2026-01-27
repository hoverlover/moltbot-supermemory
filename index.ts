/**
 * Clawdbot Supermemory Plugin
 *
 * Long-term memory integration with Supermemory (supermemory.ai).
 * Provides automatic memory storage during compaction and retrieval on agent start.
 *
 * Modes:
 * - tandem: Both built-in memory and Supermemory active (default)
 * - primary: Supermemory only, replaces built-in memory (requires slot config)
 * - off: Plugin disabled
 *
 * @see https://supermemory.ai/docs/quickstart
 */

import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { SupermemoryClient } from "./supermemory-client.js";
import { createSupermemorySearchTool, createMemorySearchTool } from "./tools.js";
import { createBeforeAgentStartHandler, createAfterCompactionHandler } from "./hooks.js";
import { supermemoryConfigSchema, parseConfig } from "./types.js";

const supermemoryPlugin = {
  id: "supermemory",
  name: "Supermemory",
  description: "Long-term memory integration with Supermemory for persistent AI conversations",
  kind: "memory" as const,
  configSchema: supermemoryConfigSchema,

  register(api: ClawdbotPluginApi) {
    const config = parseConfig(api.pluginConfig);

    // Skip registration if mode is off
    if (config.mode === "off") {
      api.logger.info("supermemory: plugin disabled (mode: off)");
      return;
    }

    // Warn if apiKey is missing but continue registration
    // This allows users to enable plugin first, then configure apiKey
    if (!config.apiKey) {
      api.logger.warn(
        "supermemory: apiKey not configured. Plugin enabled but inactive. " +
          "Set apiKey with: clawdbot config set plugins.supermemory.apiKey <your-key>",
      );
    }

    // Create client (may be unconfigured - hooks will check at runtime)
    const client = config.apiKey
      ? new SupermemoryClient({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        })
      : null;

    api.logger.info(
      `supermemory: plugin registered (mode: ${config.mode}, autoRecall: ${config.autoRecall}, ` +
        `configured: ${!!config.apiKey})`,
    );

    // Tool context for tool factories (tools require client)
    if (client) {
      const toolCtx = { client, config };

      // Register tools based on mode
      if (config.mode === "tandem") {
        api.registerTool(createSupermemorySearchTool(toolCtx), { name: "supermemory_search" });
        api.logger.info("supermemory: registered supermemory_search tool (tandem mode)");
      } else if (config.mode === "primary") {
        api.registerTool(createMemorySearchTool(toolCtx), { name: "memory_search" });
        api.logger.info("supermemory: registered memory_search replacement tool (primary mode)");
      }
    }

    // Hook context - hooks check for client at runtime
    const hookCtx = {
      client,
      config,
      logger: api.logger,
    };

    // Register lifecycle hooks (they will skip if client is null)
    if (config.autoRecall) {
      api.on("before_agent_start", createBeforeAgentStartHandler(hookCtx));
      api.logger.info("supermemory: registered before_agent_start hook (auto-recall)");
    }

    api.on("after_compaction", createAfterCompactionHandler(hookCtx));
    api.logger.info("supermemory: registered after_compaction hook (memory storage)");

    // Register service for startup/shutdown logging
    api.registerService({
      id: "supermemory",
      start: () => {
        api.logger.info(
          `supermemory: service started (mode: ${config.mode}, ` +
            `containerTag: ${config.containerTag ?? "default"}, ` +
            `configured: ${!!config.apiKey})`,
        );
      },
      stop: () => {
        api.logger.info("supermemory: service stopped");
      },
    });
  },
};

export default supermemoryPlugin;

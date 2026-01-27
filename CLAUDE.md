# Clawdbot Supermemory Plugin

## Plugin Development Constraints

### No Top-Level Await

Clawdbot plugins are loaded via jiti (synchronous evaluation), NOT native ESM. Top-level await is NOT supported and will cause a SyntaxError at load time.

**Don't do this:**
```typescript
const sdk = await import('clawdbot/plugin-sdk'); // Fails with jiti
```

**Do this instead:**
```typescript
function getStripEnvelope() {
  const sdk = require('clawdbot/plugin-sdk');
  return sdk.stripEnvelope;
}
```

### No Dynamic Imports at Module Level

Similarly, avoid dynamic imports at module scope. Use synchronous require() or lazy initialization patterns.

### Testing

- Always verify the plugin loads: `clawdbot plugins list`
- Check for syntax errors before committing
- Test both tandem and primary modes
- Verify hooks fire correctly: check gateway logs for `supermemory:` messages

## Project Structure

| File | Purpose |
|------|---------|
| index.ts | Plugin entry point, registration logic |
| hooks.ts | before_agent_start, after_compaction handlers |
| tools.ts | memory_search, supermemory_search tool definitions |
| supermemory-client.ts | Supermemory v3 API client |
| sanitize-query.ts | Query sanitization (stripEnvelope wrapper with fallback) |
| types.ts | Config schema, API types, resolveContainerTag |
| clawdbot.plugin.json | Plugin manifest with configSchema |

## Configuration

Config options are defined in two places (keep in sync):
1. `types.ts` - TypeBox schema for runtime validation
2. `clawdbot.plugin.json` - JSON Schema for CLI/UI validation

## API

Uses Supermemory v3 REST API:
- `POST /v3/documents` - Store memories
- `POST /v3/search` - Search memories (returns chunked results)

## Debugging

Check gateway logs for plugin messages:
```bash
tail -f /tmp/clawdbot-gateway.log | grep supermemory
```

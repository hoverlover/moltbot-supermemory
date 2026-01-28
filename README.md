<p align="center">
  <img src="./banner.png" alt="Moltbot x Supermemory" width="1200" />
</p>

# @hoverlover/moltbot-supermemory

Long-term memory integration for Moltbot using [Supermemory](https://supermemory.ai).

## Features

- **Automatic memory storage**: Compacted conversation summaries are automatically stored as long-term memories
- **Auto-recall**: Relevant memories are automatically injected into agent context at conversation start
- **Dual-mode operation**: Run alongside built-in memory (tandem) or replace it entirely (primary)
- **Flexible namespacing**: Organize memories with container tags

## Installation

### Method 1: CLI Installation (Recommended)

```bash
# 1. Download and install the plugin
cd /tmp
curl -L https://github.com/hoverlover/moltbot-supermemory/archive/refs/heads/main.tar.gz -o supermemory.tar.gz
moltbot plugins install /tmp/supermemory.tar.gz

# 2. Add to allowlist
moltbot config set plugins.allow '["supermemory"]'

# 3. Enable the plugin
moltbot plugins enable supermemory

# 4. Set your Supermemory API key
moltbot config set plugins.entries.supermemory.config.apiKey "YOUR_SUPERMEMORY_API_KEY"

# 5. Optionally set mode (tandem is default)
moltbot config set plugins.entries.supermemory.config.mode "tandem"

# 6. Restart the gateway
moltbot gateway restart

# 7. Verify
moltbot plugins list
```

### Method 2: Manual Config Editing

Edit `~/.clawdbot/clawdbot.json` and add/merge:

```json
{
  "plugins": {
    "allow": ["supermemory"],
    "entries": {
      "supermemory": {
        "enabled": true,
        "config": {
          "apiKey": "YOUR_SUPERMEMORY_API_KEY",
          "mode": "tandem"
        }
      }
    }
  }
}
```

Then restart:

```bash
moltbot gateway restart
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| apiKey | string | (required) | Your Supermemory API key |
| mode | string | tandem | Memory mode: tandem, primary, or off |
| containerScope | string | agent | Memory isolation: agent (shared) or session (isolated) |
| autoRecall | boolean | true | Auto-inject memories on agent start |
| threshold | number | 0.5 | Chunk relevance threshold (0.0-1.0) |
| containerTag | string | (optional) | Custom namespace prefix for memories |
| baseUrl | string | (optional) | Custom Supermemory API endpoint |

### Memory Isolation (containerScope)

The `containerScope` option controls how memories are organized:

- **agent** (default): Memories are shared across all sessions for the agent. Best for personal assistant use cases where you want the agent to remember everything about you.

- **session**: Memories are isolated per conversation/session. Best for multi-group scenarios where members of different groups should not see each other's memories.

**Privacy note**: If you run Moltbot in multiple groups where members should not see each other's memories, set `containerScope: "session"`:

```bash
moltbot config set plugins.entries.supermemory.config.containerScope "session"
```

## Getting a Supermemory API Key

1. Sign up at https://console.supermemory.ai
2. Navigate to API Keys
3. Create a new API key

## Modes

### Tandem Mode (default)

Both Moltbot's built-in memory and Supermemory are active simultaneously:

- Built-in `memory_search` tool remains available (queries local memory)
- Additional `supermemory_search` tool is registered (queries Supermemory)
- Memories are stored in Supermemory on compaction
- Agent can query either memory source
- Best for: Testing Supermemory alongside existing memory, or using both for different purposes

### Primary Mode (Replace Built-in Memory)

Supermemory completely replaces Moltbot's built-in memory system:

- `memory_search` tool queries Supermemory instead of local memory
- Built-in memory plugins (memory-core, memory-lancedb) are disabled
- The slot system ensures only one memory plugin is active
- Best for: Using Supermemory as your sole long-term memory solution

#### Primary Mode Setup - Option 1: CLI Commands

```bash
# 1. Set memory slot to supermemory (disables memory-core automatically)
moltbot config set plugins.slots.memory "supermemory"

# 2. Disable memory-lancedb if installed
moltbot plugins disable memory-lancedb

# 3. Set mode to primary
moltbot config set plugins.entries.supermemory.config.mode "primary"

# 4. Restart
moltbot gateway restart
```

#### Primary Mode Setup - Option 2: Manual Config (JSON)

Edit `~/.clawdbot/clawdbot.json`:

```json
{
  "plugins": {
    "allow": ["supermemory"],
    "slots": {
      "memory": "supermemory"
    },
    "entries": {
      "supermemory": {
        "enabled": true,
        "config": {
          "apiKey": "YOUR_SUPERMEMORY_API_KEY",
          "mode": "primary",
          "containerScope": "agent"
        }
      },
      "memory-core": {
        "enabled": false
      },
      "memory-lancedb": {
        "enabled": false
      }
    }
  }
}
```

Then restart:

```bash
moltbot gateway restart
```

#### How the Slot System Works

- Setting `plugins.slots.memory` to `"supermemory"` claims the memory slot
- This automatically prevents memory-core from loading
- memory-lancedb should also be disabled to avoid conflicts
- In primary mode, supermemory registers the `memory_search` tool

### Off Mode

Plugin is disabled entirely. No tools registered, no hooks active.

## How It Compares

Moltbot has three memory tiers. Here's how they differ:

| | memory-core | memory-lancedb | Supermemory |
|---|---|---|---|
| **Status** | Default (built-in) | Off by default | Plugin |
| **Storage** | Local markdown files | LanceDB vector DB | Cloud API |
| **Capture method** | Manual only | Regex extraction (max 3 fragments/session) | Full compaction summaries (LLM-curated) |
| **Auto-recall** | No | Yes (vector search) | Yes (semantic search) |
| **Embeddings** | Local (built-in) | OpenAI API key required | Managed (no key needed) |
| **Knowledge graph** | No | No | Yes |
| **User profiles** | No | No | Auto-generated |
| **Smart forgetting** | No | No | Yes (managed decay) |
| **External sources** | No | No | Gmail, Notion, Drive, etc. |

**Capture quality** is the biggest difference. memory-lancedb extracts up to 3 short fragments per session using regex pattern matching. Supermemory captures full compaction summaries — LLM-curated distillations of entire conversations, preserving context, decisions, and preferences that regex extraction misses.

**External connections** are unique to Supermemory. Connect Gmail, Notion, Google Drive, and other sources so the agent can recall information beyond just chat history.

## How It Works

### Memory Storage (after_compaction hook)

When a conversation session is compacted, the compacted summary is automatically stored in Supermemory:

1. Agent session accumulates messages
2. Compaction is triggered (auto or manual)
3. Summary is generated by the LLM
4. `after_compaction` hook fires with the summary
5. Summary is stored in Supermemory via `POST /v3/documents`

### Memory Retrieval (before_agent_start hook)

When a new agent conversation starts, relevant memories are automatically retrieved:

1. User sends a message
2. `before_agent_start` hook fires with the prompt
3. Plugin queries Supermemory `POST /v3/search`
4. Relevant memories are injected into agent context
5. Agent has historical context for the conversation

## Tools

### supermemory_search (tandem mode)

Search Supermemory for long-term memories:

```
User: Search my supermemory for user preferences
```

### memory_search (primary mode)

When in primary mode, this tool queries Supermemory instead of built-in memory.

## API Reference

This plugin uses the Supermemory v3 REST API:

- `POST /v3/documents` - Store new memory content
- `POST /v3/search` - Search memories

See [Supermemory docs](https://supermemory.ai/docs/api-reference) for details.

## License

MIT

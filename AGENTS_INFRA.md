# Agents Infrastructure Plan

This document outlines the plan for upgrading from a simple chatbot to a full multi-agent system with tool calling, chat persistence, and admin-configurable agents.

## Overview

### Current State
- AI SDK 6 beta with `useChat` hook and `DefaultChatTransport`
- Simple streaming chatbot
- 5 model options (GPT-4.1 Mini, Gemini 2.5 Flash, Gemini 3 Flash, Claude Haiku 4.5, Mistral Small Creative)
- No chat persistence
- Fixed system prompt
- No tool calling

### Target State
- AI SDK 6 (beta) with `ToolLoopAgent`
- Multi-agent system with tool calling
- Full chat history with search
- Admin-configurable agents (system prompts, tools, models)
- User can switch agents mid-chat
- Human-in-the-loop tool approval (per-agent, per-tool)
- Auto-generated chat titles (editable by user)

---

## 1. AI SDK v6 Migration

### Package Changes
```bash
# Remove old
pnpm remove ai @ai-sdk/react

# Install v6 beta
pnpm add ai@beta @ai-sdk/react@beta
```

### Key API Changes

| v5 | v6 |
|----|-----|
| `streamText()` | `ToolLoopAgent.stream()` or `streamText()` |
| `useChat({ api })` | `useChat({ transport: new DefaultChatTransport({ api }) })` |
| `message.content` | `message.parts` (array of parts) |
| `sendMessage(text)` | `sendMessage({ text })` |
| `toUIMessageStreamResponse()` | `createAgentUIStreamResponse()` |

### New Concepts
- **ToolLoopAgent**: Automatic tool execution loops (default 20 steps)
- **UIMessage.parts**: Messages contain typed parts (text, tool-call, tool-result, file, etc.)
- **Tool approval**: `needsApproval` per tool for human-in-the-loop
- **Call options**: Runtime configuration via `callOptionsSchema`

---

## 2. Database Schema

### New Tables

```
┌─────────────────────────────────────────────────────────────┐
│  agent                                                       │
├─────────────────────────────────────────────────────────────┤
│  id              TEXT PRIMARY KEY                            │
│  name            TEXT NOT NULL (e.g., "Research Assistant")  │
│  slug            TEXT UNIQUE NOT NULL (e.g., "research")     │
│  description     TEXT (shown in agent selector)              │
│  system_prompt   TEXT NOT NULL                               │
│  model           TEXT NOT NULL (OpenRouter model ID)         │
│  enabled_tools   TEXT (JSON array of tool slugs)             │
│  tool_approvals  TEXT (JSON: { toolSlug: boolean })          │
│  is_default      INTEGER (boolean, only one can be default)  │
│  created_at      INTEGER (timestamp)                         │
│  updated_at      INTEGER (timestamp)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  chat                                                        │
├─────────────────────────────────────────────────────────────┤
│  id              TEXT PRIMARY KEY                            │
│  user_id         TEXT NOT NULL (FK → user.id)                │
│  agent_id        TEXT NOT NULL (FK → agent.id)               │
│  title           TEXT (auto-generated, user-editable)        │
│  created_at      INTEGER (timestamp)                         │
│  updated_at      INTEGER (timestamp)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  chat_message                                                │
├─────────────────────────────────────────────────────────────┤
│  id              TEXT PRIMARY KEY                            │
│  chat_id         TEXT NOT NULL (FK → chat.id)                │
│  role            TEXT NOT NULL (user | assistant | system)   │
│  parts           TEXT NOT NULL (JSON: UIMessagePart[])       │
│  metadata        TEXT (JSON: tokens, model, etc.)            │
│  created_at      INTEGER (timestamp)                         │
└─────────────────────────────────────────────────────────────┘
```

### Why Store `parts` as JSON?

AI SDK v6 uses `UIMessage.parts` which is an array of typed parts:
```typescript
type UIMessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-invocation'; toolCallId: string; toolName: string; args: unknown; state: string; result?: unknown }
  | { type: 'file'; url: string; mediaType: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source'; source: { type: string; id: string; url?: string } }
```

Storing as JSON preserves the exact structure needed by the SDK and supports future part types.

### Chat Attachments

Chats should support file attachments (images, documents):
- **Images**: Stored in R2, referenced in message parts as `{ type: 'file', url, mediaType }`
- **Documents**: PDF, text files - stored in R2, can be used for context
- **UI**: Drag-and-drop or paste into chat input
- **Storage**: Reuse existing R2 infrastructure from `src/lib/services/s3/`

### Seed Data

On first migration, seed a default agent:
```typescript
{
  id: "default-assistant",
  name: "General Assistant",
  slug: "assistant",
  description: "A helpful AI assistant for general tasks",
  system_prompt: "You are a helpful AI assistant. Be concise and friendly.",
  model: "google/gemini-2.5-flash",  // Fast and capable default
  enabled_tools: JSON.stringify(["web_search"]),
  tool_approvals: JSON.stringify({ web_search: false }), // auto-execute
  is_default: true,
}
```

---

## 3. Tool System

### Tool Registry (Code-Defined)

Tools are defined in code for type safety and security. Starting with 2 example tools (no API keys required):

```typescript
// src/lib/agents/tools/registry.ts
export const TOOL_REGISTRY = {
  web_search: {
    slug: "web_search",
    name: "Web Search",
    description: "Search the web using DuckDuckGo (free, no API key)",
    category: "research",
    tool: tool({
      description: "Search the web for current information",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
      }),
      execute: async ({ query }) => {
        // Use DuckDuckGo Instant Answer API (free, no key required)
        // https://api.duckduckgo.com/?q=query&format=json
        const response = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
        );
        const data = await response.json();
        return {
          abstract: data.Abstract,
          source: data.AbstractSource,
          url: data.AbstractURL,
          relatedTopics: data.RelatedTopics?.slice(0, 5),
        };
      },
    }),
  },

  weather: {
    slug: "weather",
    name: "Weather Lookup",
    description: "Get current weather for a location (free Open-Meteo API)",
    category: "utilities",
    tool: tool({
      description: "Get weather information for a location",
      inputSchema: z.object({
        location: z.string().describe("City name"),
      }),
      execute: async ({ location }) => {
        // Step 1: Geocode location using Open-Meteo (free, no key)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        );
        const geoData = await geoRes.json();
        if (!geoData.results?.[0]) {
          return { error: "Location not found" };
        }
        const { latitude, longitude, name, country } = geoData.results[0];

        // Step 2: Get weather (free, no key)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`
        );
        const weather = await weatherRes.json();
        return {
          location: `${name}, ${country}`,
          temperature: weather.current.temperature_2m,
          unit: weather.current_units.temperature_2m,
          windSpeed: weather.current.wind_speed_10m,
          weatherCode: weather.current.weather_code,
        };
      },
    }),
  },

  // Image tools - uses existing Replicate service (src/lib/services/replicate/)
  image_generation: {
    slug: "image_generation",
    name: "Image Generation",
    description: "Generate images from text prompts using AI (Replicate API)",
    category: "creative",
    // Uses: generateImage() from src/lib/services/replicate/
    // Models: Imagen 4 Ultra, FLUX 1.1 Pro, FLUX Schnell
  },

  image_editing: {
    slug: "image_editing",
    name: "Image Editing",
    description: "Edit images with AI - upscale, remove background, etc. (Replicate API)",
    category: "creative",
    // Uses: editImage(), upscaleImage(), removeBackground() from src/lib/services/replicate/
  },

  // Future tools (can add later)...
  // calculator: { ... },
  // code_interpreter: { ... },
} as const;
```

### Streaming Tool UI

> **Note**: Previous implementation in `almonddb` used `@assistant-ui/react` library for tool UI.
> AI SDK v6 now has this built-in via `message.parts` with streaming `state` - no extra library needed.
> We'll port the nice UX patterns (cycling messages, elapsed time, tool emojis) to native v6.

The UI should show real-time feedback as the agent works. Each tool invocation has a `state` that streams to the client:

```
┌────────────────────────────────────────────────────────────┐
│  User: What's the weather in Tokyo?                        │
├────────────────────────────────────────────────────────────┤
│  Assistant:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔧 Using: Weather Lookup                             │   │
│  │ 📍 Location: Tokyo                                   │   │
│  │ ⏳ Fetching weather data...                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  The current weather in Tokyo is 18°C with clear skies...  │
└────────────────────────────────────────────────────────────┘
```

Tool invocation states (streamed in real-time):

| State | UI Display |
|-------|------------|
| `input-streaming` | "Preparing to use [tool]..." (args streaming) |
| `input-available` | "Using: [tool]" + show args |
| `output-streaming` | "Running..." (if tool streams partial results) |
| `output-available` | Show result card + continue with text |
| `output-error` | Show error message |
| `requires-approval` | Show approval dialog (if `needsApproval: true`) |

```tsx
// Tool invocation part rendering
function ToolInvocationPart({ part }: { part: ToolInvocationPart }) {
  const toolMeta = TOOL_REGISTRY[part.toolName];

  return (
    <div className="rounded-lg border bg-muted/50 p-3 my-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4" />
        <span>Using: {toolMeta?.name || part.toolName}</span>
      </div>

      {/* Show args */}
      <div className="mt-2 text-xs text-muted-foreground">
        {JSON.stringify(part.args, null, 2)}
      </div>

      {/* State-based UI */}
      {part.state === 'input-streaming' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Preparing...
        </div>
      )}

      {part.state === 'input-available' && !part.result && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running...
        </div>
      )}

      {part.state === 'output-available' && (
        <div className="mt-2 p-2 rounded bg-background text-sm">
          <ToolResultDisplay toolName={part.toolName} result={part.result} />
        </div>
      )}

      {part.state === 'requires-approval' && (
        <ToolApprovalButtons toolCallId={part.toolCallId} />
      )}

      {part.state === 'output-error' && (
        <div className="mt-2 text-sm text-destructive">
          Tool failed: {part.result?.error}
        </div>
      )}
    </div>
  );
}
```

### UX Patterns to Port from almonddb

The `almonddb` project has nice tool UI patterns we'll reuse:

```typescript
// Tool-specific loading messages (cycling every 2s)
const TOOL_LOADING_MESSAGES: Record<string, string[]> = {
  web_search: [
    "Searching the web...",
    "Analyzing search results...",
    "Gathering information...",
  ],
  weather: [
    "Looking up location...",
    "Fetching weather data...",
    "Compiling forecast...",
  ],
};

// Tool-specific display (emoji + color)
const TOOL_DISPLAY: Record<string, { emoji: string; color: string }> = {
  web_search: { emoji: "🔍", color: "text-blue-600" },
  weather: { emoji: "🌤️", color: "text-amber-600" },
};

// Elapsed time tracking
const [elapsed, setElapsed] = useState(0);
useEffect(() => {
  if (!isRunning) return;
  const interval = setInterval(() => setElapsed(e => e + 1), 1000);
  return () => clearInterval(interval);
}, [isRunning]);

// Display: "Running for 5s"
```

### Tool Approval Flow

When `needsApproval: true` for a tool:

1. Agent generates tool call → streamed to client with `state: 'requires-approval'`
2. UI shows approval dialog with tool name and arguments
3. User approves/denies → `addToolOutput()` called
4. If approved, tool executes and result streams back
5. Agent continues with tool result

```typescript
// Per-agent, per-tool approval settings from DB
const toolsWithApproval = enabledTools.map(slug => ({
  ...TOOL_REGISTRY[slug].tool,
  needsApproval: agent.tool_approvals[slug] ?? false,
}));
```

---

## 4. Agent Architecture

### Agent Creation (Runtime)

Agents are created at request time using DB config:

```typescript
// src/lib/agents/create-agent.ts
import { ToolLoopAgent } from 'ai';
import { TOOL_REGISTRY } from './tools/registry';

export function createAgentFromConfig(agentConfig: Agent) {
  // Build tools object with approval settings
  const tools: Record<string, Tool> = {};
  const enabledTools = JSON.parse(agentConfig.enabled_tools || '[]');
  const toolApprovals = JSON.parse(agentConfig.tool_approvals || '{}');

  for (const slug of enabledTools) {
    const registry = TOOL_REGISTRY[slug];
    if (registry) {
      tools[slug] = {
        ...registry.tool,
        needsApproval: toolApprovals[slug] ?? false,
      };
    }
  }

  return new ToolLoopAgent({
    model: openrouter(agentConfig.model),
    instructions: agentConfig.system_prompt,
    tools,
    stopWhen: stepCountIs(10), // Limit tool loops
  });
}
```

### Switching Agents Mid-Chat

When user switches agents:
1. Insert a system message: `[Switched to ${newAgent.name}]`
2. Update `chat.agent_id` to new agent
3. Continue conversation with new agent's system prompt and tools
4. Previous messages remain (context preserved)

---

## 5. Chat Persistence

### Creating a New Chat

```typescript
// POST /api/chats
export async function POST(request: Request) {
  const { session } = await requireAuth();
  const { agentId } = await request.json();

  const agent = agentId
    ? await getAgent(agentId)
    : await getDefaultAgent();

  const chatId = generateId();

  await db.insert(chat).values({
    id: chatId,
    userId: session.user.id,
    agentId: agent.id,
    title: null, // Generated after first exchange
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ chatId, agent });
}
```

### Streaming with Persistence

```typescript
// POST /api/chat
export async function POST(request: Request) {
  const { session } = await requireAuth();
  const { chatId, messages } = await request.json();

  // Load chat and agent
  const chat = await getChat(chatId, session.user.id);
  const agentConfig = await getAgent(chat.agentId);
  const agent = createAgentFromConfig(agentConfig);

  // Validate loaded messages (important for tool calls)
  const validatedMessages = validateUIMessages(messages, {
    tools: agent.tools,
  });

  return createAgentUIStreamResponse({
    agent,
    messages: validatedMessages,
    onFinish: async ({ messages: finalMessages }) => {
      // Save all messages
      await saveMessages(chatId, finalMessages);

      // Generate title if first exchange
      if (!chat.title && finalMessages.length >= 2) {
        const title = await generateChatTitle(finalMessages);
        await updateChatTitle(chatId, title);
      }
    },
  });
}
```

### Title Generation

Use the cheapest/fastest model for title generation:

```typescript
async function generateChatTitle(messages: UIMessage[]): Promise<string> {
  const userMessage = messages.find(m => m.role === 'user');
  const assistantMessage = messages.find(m => m.role === 'assistant');

  if (!userMessage || !assistantMessage) return "New Chat";

  const result = await generateText({
    model: openrouter('openai/gpt-4.1-nano'), // Cheapest option
    prompt: `Generate a short title (max 6 words) for this conversation:
User: ${getTextFromParts(userMessage.parts)}
Assistant: ${getTextFromParts(assistantMessage.parts).slice(0, 200)}

Title:`,
    temperature: 0.7,
    maxTokens: 20,
  });

  return result.text.trim().replace(/^["']|["']$/g, '');
}
```

---

## 6. API Routes

### Chat Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chats` | List user's chats (paginated) |
| POST | `/api/chats` | Create new chat |
| GET | `/api/chats/[id]` | Get chat with messages |
| PATCH | `/api/chats/[id]` | Update chat (title, agent) |
| DELETE | `/api/chats/[id]` | Delete chat |
| GET | `/api/chats/search` | Search chats by title/content |

### Agent Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List enabled agents (user) |
| GET | `/api/admin/agents` | List all agents (admin) |
| POST | `/api/admin/agents` | Create agent (admin) |
| PATCH | `/api/admin/agents/[id]` | Update agent (admin) |
| DELETE | `/api/admin/agents/[id]` | Delete agent (admin) |

### Chat Streaming

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Stream chat response (existing, updated) |

---

## 7. UI Components

### New Components

```
src/components/chat/
├── chat-layout.tsx          # Main layout with sidebar + chat area
├── chat-sidebar.tsx         # Chat history list with search
├── chat-list-item.tsx       # Single chat in sidebar
├── chat-messages.tsx        # Message list with tool UI
├── chat-message.tsx         # Single message (handles parts)
├── chat-input.tsx           # Message input with attachments
├── agent-selector.tsx       # Dropdown to select/switch agent
├── tool-approval-dialog.tsx # Approval UI for tools
└── tool-result-card.tsx     # Display tool results inline
```

### Admin Components

```
src/components/admin/
├── agents-table.tsx         # List agents with actions
├── agent-form.tsx           # Create/edit agent form
└── tool-selector.tsx        # Multi-select for enabling tools
```

### Message Parts Rendering

```tsx
function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
      <div className="max-w-[80%] space-y-2">
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <TextPart key={i} text={part.text} />;
            case 'tool-invocation':
              return <ToolInvocationPart key={i} part={part} />;
            case 'reasoning':
              return <ReasoningPart key={i} text={part.text} />;
            case 'source':
              return <SourcePart key={i} source={part.source} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

---

## 8. Implementation Phases

### Phase 1: AI SDK v6 Migration (Foundation) ✅ COMPLETE
- [x] Upgrade packages to v6 beta (`ai@6.0.0-beta.164`, `@ai-sdk/react@3.0.0-beta.167`)
- [x] Update `useChat` to new transport API (`DefaultChatTransport` with body params)
- [x] Update message rendering for `parts` structure
- [x] Update API route to use new streaming API (async `convertToModelMessages`)
- [x] Test basic chat functionality works

### Phase 2: Database Schema & Chat Persistence ✅ COMPLETE
- [x] Create `agent`, `chat`, `chat_message` tables
- [x] Seed default agent (General Assistant with Gemini 2.5 Flash)
- [x] Implement chat CRUD API routes (`/api/chats`, `/api/chats/[id]`, `/api/agents`)
- [x] Implement message persistence in `onFinish`
- [x] Implement chat title auto-generation (using gpt-4.1-nano)
- [x] Add chat history sidebar UI (collapsible with localStorage persistence)
- [x] Load existing chats with persisted messages

### Phase 3: Multi-Agent System
- [ ] Create agent CRUD API routes (admin)
- [ ] Build admin UI for agent management
- [ ] Implement `createAgentFromConfig()` factory
- [ ] Add agent selector to chat UI
- [ ] Implement agent switching mid-chat

### Phase 4: Tool System
- [ ] Create tool registry infrastructure
- [ ] Implement DuckDuckGo web search tool (free, no API key)
- [ ] Implement Open-Meteo weather lookup tool (free, no API key)
- [ ] Add streaming tool UI (shows tool name, args, progress, results)
- [ ] Add tool approval flow with UI dialog
- [ ] Display tool results inline in messages
- [ ] Add tool configuration to admin agent form

### Phase 5: Polish & Search
- [ ] Implement chat search with abstracted search service
- [ ] Add chat rename functionality
- [ ] Add chat deletion with confirmation
- [ ] Responsive design for mobile
- [ ] Error handling and loading states
- [ ] Rate limiting for tool calls

### Search Implementation (Abstracted)

Start with simple keyword search, but abstract for future improvements:

```typescript
// src/lib/search/index.ts
export interface SearchProvider {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

export interface SearchOptions {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  chatId: string;
  title: string;
  snippet: string;      // Matched text preview
  matchType: 'title' | 'content';
  score: number;        // Relevance score
  createdAt: Date;
}

// Initial implementation: simple keyword search
// src/lib/search/keyword-search.ts
export class KeywordSearchProvider implements SearchProvider {
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const db = await getDb();
    const keywords = query.toLowerCase().split(/\s+/);

    // Search in chat titles
    const titleMatches = await db
      .select()
      .from(chat)
      .where(and(
        eq(chat.userId, options.userId),
        sql`LOWER(${chat.title}) LIKE ${'%' + keywords.join('%') + '%'}`
      ))
      .limit(options.limit || 20);

    // Search in message content (JSON parts)
    const contentMatches = await db
      .select({ chat: chat, message: chatMessage })
      .from(chatMessage)
      .innerJoin(chat, eq(chat.id, chatMessage.chatId))
      .where(and(
        eq(chat.userId, options.userId),
        sql`LOWER(${chatMessage.parts}) LIKE ${'%' + keywords.join('%') + '%'}`
      ))
      .limit(options.limit || 20);

    // Combine and dedupe results...
    return [...titleMatches, ...contentMatches];
  }
}

// Future: can swap in BM25, vector search, etc.
// export class BM25SearchProvider implements SearchProvider { ... }
// export class VectorSearchProvider implements SearchProvider { ... }
```

---

## 9. Environment Variables

### New Variables Needed

```bash
# No new API keys required for initial tools!
# - DuckDuckGo Instant Answer API: free, no key
# - Open-Meteo Weather API: free, no key

# OpenRouter (already configured) handles all LLM calls
# including title generation with gpt-4.1-nano
```

---

## 10. File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Updated for v6
│   │   ├── chats/
│   │   │   ├── route.ts               # List/create chats
│   │   │   ├── [id]/route.ts          # Get/update/delete chat
│   │   │   └── search/route.ts        # Search chats
│   │   └── admin/
│   │       └── agents/
│   │           ├── route.ts           # List/create agents
│   │           └── [id]/route.ts      # Update/delete agent
│   └── dashboard/
│       ├── page.tsx                   # Chat UI (updated)
│       └── chat/[id]/page.tsx         # Specific chat
├── components/
│   ├── chat/                          # New chat components
│   └── admin/
│       └── agents/                    # Agent admin components
├── db/
│   └── schema/
│       ├── agents.ts                  # New
│       ├── chats.ts                   # New
│       └── chat-messages.ts           # New
└── lib/
    ├── agents/
    │   ├── create-agent.ts            # Agent factory
    │   ├── tools/
    │   │   ├── registry.ts            # Tool definitions & metadata
    │   │   ├── web-search.ts          # DuckDuckGo search (free)
    │   │   └── weather.ts             # Open-Meteo weather (free)
    │   └── title-generator.ts         # Chat title generation
    ├── search/
    │   ├── index.ts                   # SearchProvider interface
    │   └── keyword-search.ts          # Simple keyword implementation
    └── services/
        └── llm/                       # Updated for v6
```

---

## Open Questions

1. **Message Validation**: Should we validate messages on every load, or trust stored data?
   - Recommendation: Validate on load to handle schema evolution

2. **Tool Rate Limiting**: Should tools have per-user rate limits?
   - Recommendation: Yes, especially for paid APIs like Perplexity

3. **Chat Export**: Should users be able to export chat history?
   - Can add later as a nice-to-have

4. **Streaming Resume**: Should we implement stream resumption on disconnect?
   - AI SDK v6 supports this via `resume` option - can add in Phase 5

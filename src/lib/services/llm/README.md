# LLM Service

AI-powered text generation and structured data extraction using AI SDK 5 with OpenRouter.

## Features

- 🤖 **Multiple Models**: OpenAI GPT-4o Mini, Google Gemini Flash, Anthropic Claude Haiku
- 📝 **Text Generation**: Simple prompt-to-text with customizable parameters
- 🔍 **Structured Extraction**: Type-safe data extraction using Zod schemas
- 🌊 **Streaming**: Real-time token streaming for chat interfaces
- ⚡ **Serverless**: Optimized for Cloudflare Workers

## Setup

Add your OpenRouter API key to environment variables:

```bash
# .dev.vars or .env.local
OPENROUTER_API_KEY=your-api-key-here
```

Get your API key at: https://openrouter.ai/keys

## Usage

### Simple Text Generation

```typescript
import { generateText, LLM_MODELS } from "@/lib/services/llm";

const response = await generateText("Write a haiku about TypeScript", {
  model: LLM_MODELS.GPT_4O_MINI,
  temperature: 0.8,
  maxTokens: 100,
});

console.log(response.text);
console.log(response.usage); // Token usage stats
```

### Structured Data Extraction

```typescript
import { generateObject, LLM_MODELS } from "@/lib/services/llm";
import { z } from "zod";

// Define your schema
const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prepTime: z.number(), // minutes
});

// Extract structured data
const recipe = await generateObject(
  "Give me a simple chocolate chip cookie recipe",
  {
    schema: RecipeSchema,
    model: LLM_MODELS.CLAUDE_HAIKU,
    schemaName: "recipe",
    schemaDescription: "A cooking recipe with ingredients and instructions",
  }
);

// Type-safe access!
console.log(recipe.object.name); // ✅ TypeScript knows this is a string
console.log(recipe.object.ingredients); // ✅ TypeScript knows this is string[]
```

### Streaming Text (for Chat)

```typescript
import { streamText, LLM_MODELS } from "@/lib/services/llm";

// In an API route handler
export async function POST(request: Request) {
  const { message } = await request.json();

  const stream = await streamText(message, {
    model: LLM_MODELS.GEMINI_FLASH,
    systemPrompt: "You are a helpful assistant",
  });

  // Return as streaming response
  return stream.toDataStreamResponse();
}
```

## Available Models

```typescript
import { LLM_MODELS } from "@/lib/services/llm";

LLM_MODELS.GPT_4O_MINI;     // OpenAI GPT-4o Mini (fast, cheap)
LLM_MODELS.GEMINI_FLASH;    // Google Gemini 2.0 Flash (free, fast)
LLM_MODELS.CLAUDE_HAIKU;    // Anthropic Claude 3.5 Haiku (balanced)
```

## API Reference

### `generateText(prompt, options)`

Generate unstructured text from a prompt.

**Parameters:**
- `prompt: string` - The user prompt
- `options?: GenerateTextOptions`
  - `model?: LLMModel` - Model to use (default: GPT_4O_MINI)
  - `temperature?: number` - Randomness 0-2 (default: 0.7)
  - `maxTokens?: number` - Max response tokens (default: 1000)
  - `systemPrompt?: string` - System instructions

**Returns:** `Promise<TextResponse>`
- `text: string` - Generated text
- `finishReason: string` - Why generation stopped
- `usage: { promptTokens, completionTokens, totalTokens }`

### `generateObject(prompt, options)`

Generate structured data matching a Zod schema.

**Parameters:**
- `prompt: string` - The user prompt
- `options: GenerateObjectOptions<T>`
  - `schema: z.ZodType` - Zod schema for output (required)
  - `schemaName?: string` - Name for the schema
  - `schemaDescription?: string` - Description for better results
  - Plus all `GenerateTextOptions`

**Returns:** `Promise<ObjectResponse<T>>`
- `object: T` - Typed object matching schema
- `finishReason: string`
- `usage: { ... }`

### `streamText(prompt, options)`

Stream text generation for real-time responses.

**Parameters:**
- `prompt: string` - The user prompt
- `options?: StreamTextOptions`
  - `onChunk?: (chunk: string) => void` - Callback for each chunk
  - Plus all `GenerateTextOptions`

**Returns:** Stream object with `.toDataStreamResponse()` method

## Examples

### Chat with System Prompt

```typescript
const response = await generateText(userMessage, {
  model: LLM_MODELS.CLAUDE_HAIKU,
  systemPrompt: "You are a friendly coding tutor. Explain concepts simply.",
  temperature: 0.8,
});
```

### Extract Multiple Entities

```typescript
const PeopleSchema = z.object({
  people: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      email: z.string().email(),
    })
  ),
});

const result = await generateObject(
  "Team: Alice (CEO, alice@co.com), Bob (CTO, bob@co.com)",
  { schema: PeopleSchema }
);

result.object.people.forEach((person) => {
  console.log(`${person.name}: ${person.email}`);
});
```

### Streaming Chat API Route

```typescript
// app/api/chat/route.ts
import { streamText, LLM_MODELS } from "@/lib/services/llm";

export async function POST(request: Request) {
  const { message, model } = await request.json();

  const stream = await streamText(message, {
    model: model || LLM_MODELS.GPT_4O_MINI,
    systemPrompt: "You are a helpful AI assistant",
    temperature: 0.7,
  });

  return stream.toDataStreamResponse();
}
```

## Notes

- **Cost**: OpenRouter charges vary by model. Gemini Flash is free, GPT-4o Mini is very cheap.
- **Rate Limits**: Depends on your OpenRouter plan
- **Timeouts**: Set reasonable `maxTokens` for faster responses
- **Error Handling**: Service throws errors for missing API keys or API failures

## See Also

- [AI SDK Docs](https://sdk.vercel.ai/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Zod Documentation](https://zod.dev)

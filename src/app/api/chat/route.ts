import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { LLM_MODELS, type LLMModel } from "@/lib/services/llm";

export const maxDuration = 30;

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return createOpenRouter({
    apiKey,
  });
}

export async function POST(request: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json();

    // Get model from header
    const modelFromHeader = request.headers.get("X-Model") as LLMModel | null;

    // Validate model is one of our supported models
    const validModels = Object.values(LLM_MODELS);
    const selectedModel = modelFromHeader || LLM_MODELS.GPT_4_1_MINI;

    if (!validModels.includes(selectedModel)) {
      return new Response("Invalid model", { status: 400 });
    }

    const openrouter = getOpenRouter();

    // Stream the response
    const result = streamText({
      model: openrouter(selectedModel),
      messages: convertToModelMessages(messages),
      system: "You are a helpful AI assistant. Be concise and friendly.",
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}

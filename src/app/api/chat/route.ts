import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { LLM_MODELS, getOpenRouter, type LLMModel } from "@/lib/services/llm";
import { requireAuth } from "@/lib/admin";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Require authentication (costs money via OpenRouter)
    const { error } = await requireAuth();
    if (error) return error;

    const { messages, model: modelFromBody }: { messages: UIMessage[]; model?: string } = await request.json();

    // Validate model is one of our supported models
    const validModels = Object.values(LLM_MODELS);
    const selectedModel = (modelFromBody as LLMModel) || LLM_MODELS.GPT_4_1_MINI;

    if (!validModels.includes(selectedModel)) {
      return new Response("Invalid model", { status: 400 });
    }

    console.log("Using model:", selectedModel);

    const openrouter = getOpenRouter();

    // Convert UI messages to model messages (async in v6)
    const modelMessages = await convertToModelMessages(messages);

    // Stream the response
    const result = streamText({
      model: openrouter(selectedModel),
      messages: modelMessages,
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

import { generateText } from "ai";
import { getOpenRouter } from "@/lib/services/llm";

/**
 * Extract text content from message parts
 */
function getTextFromParts(parts: unknown[]): string {
  if (!Array.isArray(parts)) return "";

  return parts
    .filter((part): part is { type: "text"; text: string } =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "text" &&
      "text" in part
    )
    .map((part) => part.text)
    .join(" ");
}

interface Message {
  role: string;
  parts: unknown[];
}

/**
 * Generate a short, descriptive title for a chat based on the first exchange
 * Uses a cheap/fast model for cost efficiency
 */
export async function generateChatTitle(messages: Message[]): Promise<string> {
  const userMessage = messages.find((m) => m.role === "user");
  const assistantMessage = messages.find((m) => m.role === "assistant");

  if (!userMessage || !assistantMessage) {
    return "New Chat";
  }

  const userText = getTextFromParts(userMessage.parts);
  const assistantText = getTextFromParts(assistantMessage.parts).slice(0, 200);

  if (!userText) {
    return "New Chat";
  }

  try {
    const openrouter = getOpenRouter();

    const result = await generateText({
      model: openrouter("openai/gpt-4.1-nano"), // Cheapest model for title generation
      prompt: `Generate a short title (max 6 words) for this conversation. Return ONLY the title, no quotes or explanation.

User: ${userText.slice(0, 200)}
Assistant: ${assistantText}

Title:`,
      temperature: 0.7,
      maxOutputTokens: 20,
    });

    // Clean up the title
    const title = result.text
      .trim()
      .replace(/^["']|["']$/g, "") // Remove quotes
      .replace(/^Title:\s*/i, "") // Remove "Title:" prefix if present
      .slice(0, 50); // Limit length

    return title || "New Chat";
  } catch (error) {
    console.error("Error generating chat title:", error);
    return "New Chat";
  }
}

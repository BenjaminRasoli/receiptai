const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = {
  default: "openai/gpt-oss-120b",
  fast: "openai/gpt-oss-20b",
} as const;

export class AIError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function generateText(
  prompt: string,
  options?: { json?: boolean; maxTokens?: number; model?: string },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AIError("Groq API key not configured.", 500);
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model ?? GROQ_MODELS.default,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: options?.maxTokens ?? 1024,
      ...(options?.json
        ? { response_format: { type: "json_object" } }
        : {}),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AIError(
      data?.error?.message ?? "Groq request failed.",
      response.status,
    );
  }

  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : "";
}

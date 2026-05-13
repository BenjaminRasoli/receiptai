import { NextRequest, NextResponse } from "next/server";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const buildPrompt = (message: string, rows: unknown[]) => `
You are a helpful assistant for a reselling tracker app called ReceiptAI.
The user tracks items they buy and resell. Here is their full inventory data as JSON:

${JSON.stringify(rows, null, 2)}

Answer questions about their items, profits, platforms, trends, and anything else related to their data.
Be concise and friendly. Use SEK for prices. If asked about profit, it is soldPrice minus purchasePrice.
Only answer questions related to their inventory and reselling activity.

User question: ${message}
`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (!message) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Gemini API key not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(message, rows) }] }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Google AI request failed." },
      { status: response.status },
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";

  return NextResponse.json({ reply: text });
}

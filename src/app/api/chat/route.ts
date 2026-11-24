import { NextRequest, NextResponse } from "next/server";
import { AIError, generateText } from "@/utils/ai";

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

  try {
    const reply = await generateText(buildPrompt(message, rows));
    return NextResponse.json({
      reply: reply.trim() || "No response.",
    });
  } catch (error) {
    if (error instanceof AIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "AI request failed." },
      { status: 500 },
    );
  }
}

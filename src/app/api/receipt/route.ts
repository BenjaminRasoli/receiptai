import { NextRequest, NextResponse } from "next/server";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

const promptForReceipt = (
  text: string,
) => `Extract structured data from this receipt and return ONLY valid JSON with fields: seller, itemName, totalPrice, itemPrice, shipping, buyerProtectionFee, paymentMethod, paymentDate, transactionId. Use numbers for numeric fields and strings for text fields. Do not include any extra explanation or markdown.

Receipt: ${text}`;

const parseJson = (text: string) => {
  const objectMatch = text.match(/\{[\s\S]*\}/m);
  const arrayMatch = text.match(/\[[\s\S]*\]/m);
  const jsonText = objectMatch?.[0] ?? arrayMatch?.[0] ?? text;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { error: "Missing receipt text." },
      { status: 400 },
    );
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
      contents: [
        {
          parts: [{ text: promptForReceipt(text) }],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: data.error?.message ?? "Google AI request failed.",
        details: data,
      },
      { status: response.status },
    );
  }

  const outputText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.[0]?.text ??
    data?.output?.[0]?.content?.[0]?.text ??
    "";

  const parsed = parseJson(outputText);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "Could not parse JSON from AI output.",
        raw: outputText,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ raw: outputText, parsed });
}

import { NextRequest, NextResponse } from "next/server";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Gemini API key not configured." },
      { status: 500 },
    );
  }

  const prompt = `Fix obvious speech-to-text errors in the text below. It is a mixed Swedish/English spoken sentence about a purchase (item, price, platform, date).

Rules:
- Expand spoken number words into digits ("trehundred" -> "300", "five days a go" -> "5 days ago").
- Fix misheard words using context ("thyrtiofive ten" -> "HF3510", "vinterd" -> "Vinted", "badat" -> the intended verb).
- Keep the original language and meaning. Do not translate.
- Return ONLY the corrected text — no quotes, no explanation, no markdown.

Text: ${text}`;

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300 },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Google AI request failed." },
      { status: response.status },
    );
  }

  const cleanText = (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ??
    text
  )
    .trim()
    .replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, "")
    .trim();

  return NextResponse.json({ cleanText: cleanText || text });
}

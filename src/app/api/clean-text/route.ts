import { NextRequest, NextResponse } from "next/server";
import { AIError, generateText, GROQ_MODELS } from "@/utils/ai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  const prompt = `Fix obvious speech-to-text errors in the text below. It is a mixed Swedish/English spoken sentence about a purchase (item, price, platform, date).

Rules:
- Expand spoken number words into digits ("trehundred" -> "300", "five days a go" -> "5 days ago").
- Fix misheard words using context ("thyrtiofive ten" -> "HF3510", "vinterd" -> "Vinted", "badat" -> the intended verb).
- Keep the original language and meaning. Do not translate.
- Return ONLY the corrected text — no quotes, no explanation, no markdown.

Text: ${text}`;

  try {
    const cleanText = (
      await generateText(prompt, {
        model: GROQ_MODELS.fast,
        maxTokens: 300,
      })
    )
      .trim()
      .replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, "")
      .trim();

    return NextResponse.json({ cleanText: cleanText || text });
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

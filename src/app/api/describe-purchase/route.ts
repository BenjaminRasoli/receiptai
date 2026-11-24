import { NextRequest, NextResponse } from "next/server";
import { AIError, generateText } from "@/utils/ai";

type HistoryMessage = { role: "user" | "assistant"; text: string };

const buildPrompt = (
  message: string,
  history: HistoryMessage[],
  platforms: string[],
  today: string,
) => `
You are a parser for a reselling tracker app. The user describes purchases they made in casual spoken or written language (Swedish/English mix, prices in SEK/kr). The text may contain speech-to-text errors — use context to correct obvious mishearings.

Today's date is ${today}. Use it to resolve relative dates like "igår"/"yesterday" (yesterday = ${today} minus 1 day), "today"/"idag", "förra veckan", etc.

Known platforms the user already uses: ${platforms.length ? platforms.join(", ") : "(none yet)"}.
If the user names a platform that is a close misspelling or mishearing of a known platform (e.g. "vinterd" -> "Vinted", "tradera" -> "Tradera"), ALWAYS use the known platform's exact spelling/casing instead of inventing a new one.

Extract the purchase details. Required fields: item name, price, and purchase date. Optional fields: platform (where it was bought) and seller.

Conversation so far:
${history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n") || "(none)"}

Latest user message: ${message}

Rules:
- Combine info from the whole conversation, not just the latest message.
- "complete" is true only when item name, price, AND purchase date are all known.
- "missingFields" lists which required fields are still missing (values: "item", "price", "date"). Only include required fields.
- "message" is a short, friendly reply to the user: if complete, confirm what was captured in one sentence; if not complete, ask ONLY for the missing required fields (e.g. "Nice! How much did you pay for it, and when did you buy it?"). Never ask for optional fields.
- "cleanText" is a cleaned-up version of the LATEST user message only: fix obvious speech-to-text errors (e.g. "thyrtiofive ten" -> "HF3510", "trehundredrounds" -> "300", "five days a go" -> "5 days ago", "badat" -> the intended verb), expand spoken number words into digits, and keep the original language and meaning. If the message is already clean, return it unchanged.
- Prices are numbers in SEK. Strip "kr", ":-", commas used as thousands separators.

Respond ONLY with valid JSON, no markdown:
{"item": string|null, "price": number|null, "platform": string|null, "date": "YYYY-MM-DD"|null, "seller": string|null, "missingFields": string[], "message": string, "cleanText": string, "complete": boolean}
`;

const parseJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/m);
  try {
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const history: HistoryMessage[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (m: unknown): m is HistoryMessage =>
            typeof m === "object" &&
            m !== null &&
            ((m as HistoryMessage).role === "user" ||
              (m as HistoryMessage).role === "assistant") &&
            typeof (m as HistoryMessage).text === "string",
        )
        .slice(-10)
    : [];
  const platforms = Array.isArray(body?.platforms)
    ? body.platforms
        .filter((p: unknown): p is string => typeof p === "string")
        .slice(0, 50)
    : [];

  if (!message && history.length === 0) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const outputText = await generateText(
      buildPrompt(message, history, platforms, today),
      { json: true, maxTokens: 1024 },
    );

    const parsed = parseJson(outputText);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { error: "Could not parse AI response.", raw: outputText },
        { status: 500 },
      );
    }

    const result = parsed as Record<string, unknown>;
    const item = String(result.item ?? "").trim();
    const priceRaw = result.price;
    const price =
      typeof priceRaw === "number" && Number.isFinite(priceRaw)
        ? priceRaw
        : Number(String(priceRaw ?? "").replace(",", ".")) || null;

    const missingFields: string[] = Array.isArray(result.missingFields)
      ? result.missingFields.filter(
          (f): f is string =>
            typeof f === "string" && ["item", "price", "date"].includes(f),
        )
      : [];

    const date = String(result.date ?? "").trim();
    const complete =
      Boolean(result.complete) &&
      Boolean(item) &&
      typeof price === "number" &&
      price > 0 &&
      Boolean(date);

    return NextResponse.json({
      item: item || null,
      price,
      platform: String(result.platform ?? "").trim() || null,
      date: date || null,
      seller: String(result.seller ?? "").trim() || null,
      missingFields,
      message: String(result.message ?? "").trim(),
      cleanText: String(result.cleanText ?? "").trim(),
      complete,
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

import { NextRequest, NextResponse } from "next/server";
import { AIError, generateText } from "@/utils/ai";

const promptForReceipt = (
  text: string,
) => `Extract structured data from this receipt and return ONLY valid JSON with fields: seller, itemName, totalPrice, itemPrice, shipping, buyerProtectionFee, paymentMethod, paymentDate, purchaseDate, platform, transactionId, soldPrice, soldPlatform, soldDate. Use numbers for numeric fields and strings for text fields. platform is where the item was bought or sold (e.g. Vinted, Tradera, Blocket, eBay, Facebook Marketplace) — extract it if mentioned anywhere in the receipt. purchaseDate must be date only in YYYY-MM-DD format with no time. If this receipt is for a SALE of an item, also fill soldPrice, soldPlatform, and soldDate (YYYY-MM-DD, no time). Do not include any extra explanation or markdown.

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

  try {
    const outputText = await generateText(promptForReceipt(text), {
      json: true,
      maxTokens: 2048,
    });

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

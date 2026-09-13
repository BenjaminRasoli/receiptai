import type { Metadata } from "next";
import SummaryClient from "@/components/SummaryClient";

export const metadata: Metadata = {
  title: "Summary – ReceiptAI",
  description:
    "Daily purchase and profit summary for your ReceiptAI inventory.",
};

export default function SummaryPage() {
  return <SummaryClient />;
}

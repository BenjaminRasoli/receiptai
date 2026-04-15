import type { Metadata } from "next";
import DashboardClient from "@/components/DashboardClient";

export const metadata: Metadata = {
  title: "ReceiptAI – AI Receipt Tracker & Profit Calculator",
  description:
    "Track receipts, calculate profit, and extract data using AI. ReceiptAI helps you manage purchases and sales in one place.",
  keywords: [
    "receipt tracker",
    "AI receipt scanner",
    "profit calculator",
    "inventory tracker",
  ],
};

export default function HomePage() {
  return <DashboardClient />;
}

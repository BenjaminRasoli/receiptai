import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Login – ReceiptAI",
  description: "Login or create an account to use ReceiptAI.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthPage() {
  return <AuthForm />;
}

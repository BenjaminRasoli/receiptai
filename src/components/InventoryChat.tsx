"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ReceiptRow } from "@/types/receipt";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  rows: ReceiptRow[];
};

export default function InventoryChat({ rows }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, rows }),
      });
      const data = await response.json();
      const reply = response.ok
        ? (data.reply ?? "No response.")
        : (data.error ?? "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Request failed. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-2xl font-semibold dark:text-slate-50">
          Ask about your inventory
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ask questions about your items, profits, and trends.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 max-h-96">
        {messages
          .filter((msg) => msg.text)
          .map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce [animation-delay:0ms]">·</span>
                <span className="animate-bounce [animation-delay:150ms]">
                  ·
                </span>
                <span className="animate-bounce [animation-delay:300ms]">
                  ·
                </span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask something…"
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:bg-slate-800"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="cursor-pointer rounded-2xl bg-slate-950 px-4 py-2.5 text-white transition hover:bg-slate-800 disabled:hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:hover:bg-slate-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

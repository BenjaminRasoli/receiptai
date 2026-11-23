"use client";

import { useRef, useState } from "react";
import { ChevronDown, EyeOff, Mic, Send, Square } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { ReceiptRow } from "@/types/receipt";
import { createEmptyRow, getToday } from "@/utils/receipt";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ParsedPurchase = {
  item: string | null;
  price: number | null;
  platform: string | null;
  date: string | null;
  seller: string | null;
  missingFields: string[];
  message: string;
  cleanText?: string;
  complete: boolean;
};

type Props = {
  platformOptions: string[];
  onAdd: (row: ReceiptRow) => Promise<void>;
  onHide: () => void;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string; confidence?: number };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
};

const buildRow = (parsed: ParsedPurchase): ReceiptRow => {
  const row = createEmptyRow();
  const itemName = parsed.item?.trim() || "Item";
  const price = String(parsed.price ?? "");
  return {
    ...row,
    seller: parsed.seller ?? "",
    itemName,
    item: itemName,
    purchaseDate: parsed.date || getToday(),
    platform: parsed.platform ?? "",
    purchasePrice: price,
    totalPrice: price,
    status: "available",
    sold: false,
  };
};

const SV_WORDS = [
  "och", "att", "för", "jag", "köpte", "köpt", "igår", "idag", "på", "med",
  "det", "den", "är", "som", "men", "eller", "vad", "hur", "mycket",
  "kronor", "från", "till", "inte", "har", "vi", "om", "av", "en", "ett",
  "sek", "lägenhet", "jacka", "tröja", "skick", "kom",
];

const EN_WORDS = [
  "bought", "buy", "the", "and", "for", "with", "on", "at", "from",
  "yesterday", "today", "how", "much", "did", "pay", "paid", "it", "this",
  "that", "was", "were", "price", "item", "got", "just", "a", "an", "is",
];

const detectLang = (text: string): "sv-SE" | "en-US" | null => {
  const normalized = ` ${text
    .toLowerCase()
    .replace(/[^a-zåäöøæéèü\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
  let sv = /[åäöøæ]/.test(normalized) ? 2 : 0;
  let en = 0;
  for (const word of SV_WORDS) {
    if (normalized.includes(` ${word} `)) sv += 1;
  }
  for (const word of EN_WORDS) {
    if (normalized.includes(` ${word} `)) en += 1;
  }
  if (sv === en || (sv === 0 && en === 0)) return null;
  return sv > en ? "sv-SE" : "en-US";
};

export default function DescribePurchaseSection({
  platformOptions,
  onAdd,
  onHide,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported] = useState(() => getSpeechRecognition() !== null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const deadRef = useRef(false);
  const baseTextRef = useRef("");
  const carryRef = useRef("");
  const sessionTranscriptRef = useRef("");
  const activeLangRef = useRef("sv-SE");
  const pendingLangRef = useRef<string | null>(null);
  const lastSwitchRef = useRef(0);
  const suppressResultsRef = useRef(false);
  const skipResultsRef = useRef(false);
  const cleaningRef = useRef(false);
  const lastCleanedRef = useRef("");
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinParts = (...parts: string[]) =>
    parts.map((p) => p.trim()).filter(Boolean).join(" ");

  const syncInput = () => {
    setInput(
      joinParts(baseTextRef.current, carryRef.current, sessionTranscriptRef.current),
    );
  };

  const stopListening = () => {
    wantListeningRef.current = false;
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
    syncInput();
    setListening(false);
  };

  const maybeCleanTranscript = async () => {
    if (!wantListeningRef.current || cleaningRef.current) return;
    const text = joinParts(
      carryRef.current,
      sessionTranscriptRef.current,
    ).trim();
    if (text.length < 8 || text === lastCleanedRef.current) return;

    cleaningRef.current = true;
    try {
      const response = await fetch("/api/clean-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      const cleaned =
        response.ok && typeof data.cleanText === "string"
          ? data.cleanText.trim()
          : "";

      const current = joinParts(
        carryRef.current,
        sessionTranscriptRef.current,
      ).trim();
      if (
        cleaned &&
        cleaned !== text &&
        current === text &&
        wantListeningRef.current
      ) {
        carryRef.current = cleaned;
        sessionTranscriptRef.current = "";
        lastCleanedRef.current = cleaned;
        skipResultsRef.current = true;
        syncInput();
        try {
          recognitionRef.current?.stop();
        } catch {
          skipResultsRef.current = false;
        }
      }
    } catch {
      // keep raw transcript on failure
    } finally {
      cleaningRef.current = false;
    }
  };

  const scheduleCleanup = () => {
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = setTimeout(() => {
      cleanupTimerRef.current = null;
      void maybeCleanTranscript();
    }, 800);
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    baseTextRef.current = input.trim();
    carryRef.current = "";
    sessionTranscriptRef.current = "";
    activeLangRef.current = "sv-SE";
    pendingLangRef.current = null;
    lastSwitchRef.current = 0;
    deadRef.current = false;
    suppressResultsRef.current = false;
    wantListeningRef.current = true;

    const recognition = new Ctor();
    recognition.lang = activeLangRef.current;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (suppressResultsRef.current || skipResultsRef.current) return;
      let transcript = "";
      let lastFinal = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        transcript += result[0].transcript;
        if (result.isFinal) lastFinal = result[0].transcript;
      }
      sessionTranscriptRef.current = transcript.trim();
      syncInput();

      if (
        lastFinal &&
        Date.now() - lastSwitchRef.current > 1500
      ) {
        const detected = detectLang(lastFinal);
        if (detected && detected !== activeLangRef.current) {
          pendingLangRef.current = detected;
          lastSwitchRef.current = Date.now();
          try {
            recognition.stop();
          } catch {
            // ignore
          }
        }
      }

      scheduleCleanup();
    };
    recognition.onend = () => {
      if (!wantListeningRef.current || deadRef.current) return;
      try {
        carryRef.current = joinParts(
          carryRef.current,
          sessionTranscriptRef.current,
        );
        sessionTranscriptRef.current = "";
        const nextLang = pendingLangRef.current ?? activeLangRef.current;
        pendingLangRef.current = null;
        if (nextLang !== activeLangRef.current) {
          activeLangRef.current = nextLang;
          recognition.lang = nextLang;
        }
        recognition.start();
        skipResultsRef.current = false;
        syncInput();
      } catch {
        deadRef.current = true;
        wantListeningRef.current = false;
        setListening(false);
      }
    };
    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        deadRef.current = true;
        wantListeningRef.current = false;
        setListening(false);
      }
    };

    setListening(true);
    try {
      recognition.start();
    } catch {
      deadRef.current = true;
      wantListeningRef.current = false;
      setListening(false);
    }
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (listening) stopListening();
    suppressResultsRef.current = true;
    baseTextRef.current = "";
    carryRef.current = "";
    sessionTranscriptRef.current = "";

    const history = messages.slice(-10);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/describe-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          platforms: platformOptions,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const reply = data.error ?? "Something went wrong.";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        return;
      }

      const parsed = data as ParsedPurchase;
      if (parsed.cleanText) {
        setMessages((prev) =>
          prev.map((msg, i) =>
            i === prev.length - 1 && msg.role === "user"
              ? { ...msg, text: parsed.cleanText as string }
              : msg,
          ),
        );
      }
      const reply =
        parsed.message ||
        (parsed.complete
          ? "Got it, item added."
          : `I'm still missing: ${parsed.missingFields.join(", ")}.`);

      if (parsed.complete) {
        try {
          await onAdd(buildRow(parsed));
          const confirm = `${reply} Added "${parsed.item}" for ${parsed.price} kr.`;
          setMessages((prev) => [...prev, { role: "assistant", text: confirm }]);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "I parsed it, but saving failed. Please try again.",
            },
          ]);
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      }
    } catch {
      const reply = "Request failed. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 px-6 py-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between text-left"
        >
          <div>
            <h2 className="text-2xl font-semibold dark:text-slate-50">
              Describe a purchase
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Say or type what you bought, for how much, when, and where —
              Google AI fills in the rest.
            </p>
          </div>
          <ChevronDown
            className={`ml-2 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={onHide}
          aria-label="Hide describe purchase section"
          title="Hide section"
          className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 max-h-96 border-t border-slate-100 dark:border-slate-800">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try: &quot;I bought a vintage Levi&apos;s jacket for 450 kr on
                Tradera yesterday&quot; — or just tell me the item and price.
              </p>
            )}
            {messages.map((msg, i) => (
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
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <LoadingSpinner size={16} label="Thinking..." />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-2">
            <div className="flex gap-2">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={loading}
                  aria-label={listening ? "Stop listening" : "Start voice input"}
                  title={listening ? "Stop listening" : "Voice input"}
                  className={`cursor-pointer rounded-2xl px-3.5 py-2.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    listening
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                  }`}
                >
                  {listening ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={
                  listening ? "Listening... keep talking" : "Describe your purchase…"
                }
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
            {listening && (
              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                Listening — press the red button or Enter when you&apos;re done.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

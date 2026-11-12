"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CircleAlert,
  Crosshair,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import type { CategorySlug } from "@/types/place";
import type { Itinerary } from "@/lib/planner/types";
import { SafeMarkdown } from "@/components/assistant/safe-markdown";
import { PlaceArt } from "@/components/places/place-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { formatDistance, formatDuration, formatMinutesAsTime } from "@/lib/geo/distance";
import { cn } from "@/lib/utils/cn";

interface AssistantPlace {
  slug: string;
  name: string;
  category: CategorySlug;
  summary: string;
  lat: number;
  lng: number;
  estimatedVisitMinutes: number;
  entryFeeLkr: number | null;
  openingHours: string | null;
  verification: string;
  website: string | null;
}

interface AssistantResponse {
  answer: string;
  mode: "local" | "openai";
  places: AssistantPlace[];
  itinerary: Itinerary | null;
  suggestions: string[];
  sources: Array<{ label: string; url: string }>;
  notice?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: AssistantResponse;
  error?: boolean;
}

const QUICK_PROMPTS = [
  "Plan 3 hours around Kandy Lake",
  "Best viewpoints for sunset",
  "Where can I eat near the Temple of the Tooth?",
  "What should I see if it rains?",
  "I have 5 hours and a LKR 5000 budget",
];

const GREETING =
  "I'm the KandyVerse guide. I answer from the same editorial database as the explorer and planner — real coordinates, verified facts where they exist, and a clear “not verified” when they don't.\n\nTry asking for a short plan, a neighbourhood, a category, or a practical service.";

export function AssistantChat() {
  const { toast } = useToast();
  const saveItinerary = useSavedStore((state) => state.saveItinerary);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "greeting", role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setInput("");

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };
    const history = messages
      .filter((item) => item.id !== "greeting")
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));

    setMessages((current) => [...current, userMessage]);
    setPending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, near: near ?? undefined }),
      });
      const data = (await response.json()) as AssistantResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The assistant could not answer.");

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          data,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant is unavailable right now. Try again in a moment.",
          error: true,
        },
      ]);
    } finally {
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      toast("This browser does not expose geolocation.", "info");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNear({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
        toast("Nearby answers will now use your location.", "success");
      },
      () => {
        setLocating(false);
        toast("Location permission was denied. You can still name a landmark.", "info");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-8">
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line/80 bg-surface/40">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">KandyVerse guide</h2>
              <p className="text-[10px] text-muted-2">
                Grounded in the city database · never invents hours or prices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className={cn(
              "kv-focus inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] transition",
              near
                ? "border-mint/40 bg-mint/10 text-mint"
                : "border-line text-muted hover:text-foreground",
            )}
          >
            <Crosshair className="h-3 w-3" />
            {locating ? "Locating…" : near ? "Location on" : "Use location"}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2.5",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                  message.role === "assistant"
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : "border-line bg-surface-2 text-muted",
                )}
              >
                {message.role === "assistant" ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </span>

              <div
                className={cn(
                  "min-w-0 max-w-[85%] rounded-2xl border px-3.5 py-3",
                  message.role === "user"
                    ? "border-accent/30 bg-accent/10"
                    : message.error
                      ? "border-red-300/50 bg-red-50"
                      : "border-line/80 bg-surface/60",
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-line text-[13px] leading-6 text-foreground">
                    {message.content}
                  </p>
                ) : (
                  <SafeMarkdown text={message.content} />
                )}

                {message.data && (
                  <AssistantExtras
                    data={message.data}
                    onSave={() => {
                      if (!message.data?.itinerary) return;
                      saveItinerary(
                        `Assistant · ${message.data.itinerary.startTime} in Kandy`,
                        message.data.itinerary,
                      );
                      toast("Itinerary saved to this device.", "success");
                    }}
                  />
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-mint/30 bg-mint/10 text-mint">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </span>
              <span className="rounded-2xl border border-line/80 bg-surface/60 px-3.5 py-2.5 text-[12px] text-muted">
                Searching the KandyVerse database…
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-line/70 bg-surface/50 p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                disabled={pending}
                className="kv-focus shrink-0 rounded-full border border-line px-2.5 py-1 text-[10px] text-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask about places, a plan, food, weather or practical services…"
              rows={2}
              className="min-h-[52px] resize-none"
              aria-label="Message the KandyVerse guide"
            />
            <Button
              type="button"
              onClick={() => void send(input)}
              disabled={pending || !input.trim()}
              className="h-[52px] px-4"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-2">
            Enter to send · Shift+Enter for a new line. Answers are generated from
            the editorial database; verify opening hours before travelling.
          </p>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl border border-line/80 bg-surface/40 p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <CircleAlert className="h-4 w-4 text-amber" />
            What it will not do
          </h2>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
            <li>· Invent opening hours, ticket prices or phone numbers.</li>
            <li>· Claim a restaurant is “the best” without reviews.</li>
            <li>· Promise a live route when the Routes API is not configured.</li>
            <li>· Hide uncertainty — missing facts are labelled.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-line/80 bg-surface/40 p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-accent" />
            Better questions
          </h2>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
            <li>· “2 hours near the railway station, indoors.”</li>
            <li>· “A temple and a viewpoint before lunch.”</li>
            <li>· “Where is the nearest pharmacy to the lake?”</li>
            <li>· “Plan for a family of four, relaxed pace.”</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-line/80 bg-surface/40 p-4 text-[11px] leading-relaxed text-muted">
          <p>
            Prefer a visual plan? The{" "}
            <Link href="/planner" className="text-accent hover:text-emerald-700">
              trip planner
            </Link>{" "}
            shows the timeline and map side by side.
          </p>
        </div>
      </aside>
    </div>
  );
}

function AssistantExtras({
  data,
  onSave,
}: {
  data: AssistantResponse;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={data.mode === "openai" ? "accent" : "neutral"}>
          {data.mode === "openai" ? "OpenAI + tools" : "Grounded retrieval"}
        </Badge>
        {data.notice && (
          <span className="text-[9px] leading-relaxed text-muted-2">{data.notice}</span>
        )}
      </div>

      {data.places.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {data.places.slice(0, 6).map((place) => (
            <Link
              key={place.slug}
              href={`/places/${place.slug}`}
              className="kv-focus group flex gap-2 rounded-xl border border-line/70 bg-surface/60 p-2 transition hover:border-accent/50"
            >
              <PlaceArt
                slug={place.slug}
                category={place.category}
                className="h-12 w-12 shrink-0 rounded-md"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-foreground group-hover:text-accent">
                  {place.name}
                </span>
                <span className="mt-0.5 block text-[9px] text-muted-2">
                  {formatDuration(place.estimatedVisitMinutes)} ·{" "}
                  {place.entryFeeLkr !== null
                    ? `LKR ${place.entryFeeLkr.toLocaleString("en-LK")}`
                    : "fee not verified"}
                </span>
              </span>
              <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-muted-2 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      )}

      {data.itinerary && data.itinerary.stops.length > 0 && (
        <div className="rounded-xl border border-mint/25 bg-mint/[0.04] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              {data.itinerary.startTime}–{data.itinerary.endTime} ·{" "}
              {data.itinerary.stops.length} stops
            </p>
            <Button size="sm" variant="mint" className="h-7 px-2.5 text-[10px]" onClick={onSave}>
              Save plan
            </Button>
          </div>
          <ol className="mt-1.5 space-y-1">
            {data.itinerary.stops.map((stop) => (
              <li key={stop.place.slug} className="flex items-start gap-2 text-[10px]">
                <span className="w-9 shrink-0 font-mono text-muted-2">
                  {formatMinutesAsTime(stop.arrivalMinutes)}
                </span>
                <Link
                  href={`/places/${stop.place.slug}`}
                  className="kv-focus text-muted hover:text-accent"
                >
                  {stop.place.name}
                </Link>
                <span className="ml-auto shrink-0 text-muted-2">
                  {formatDistance(stop.travel.meters)} · {stop.travel.minutes} min
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.sources.length > 0 && (
        <div className="text-[10px] text-muted-2">
          Sources:{" "}
          {data.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && " · "}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-emerald-700"
              >
                {source.label}
              </a>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

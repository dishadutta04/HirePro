"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";
import { Avatar, RichText, inputCls } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import type { ChatHistory } from "@/lib/types";

type Msg = { id: string; role: "user" | "assistant"; text: string; error?: boolean };

const STARTERS = [
  "How many sick leaves do I get?",
  "Can I work from home?",
  "What is the notice period?",
  "What benefits do we have?",
  "How long is probation?",
  "What are the working hours?",
];

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}

function Chat() {
  const { me } = useMe();
  const params = useSearchParams();
  const history = useApi<ChatHistory[]>("/api/chat/history");
  const frequent = useApi<{ question: string; count: number }[]>("/api/chat/frequent-questions");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!history.data) return;
    // History comes newest first; show it oldest first.
    setMessages(
      [...history.data].reverse().flatMap((h) => [
        { id: `${h.id}q`, role: "user" as const, text: h.message },
        { id: `${h.id}a`, role: "assistant" as const, text: h.response },
      ]),
    );
  }, [history.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text: q }]);
    try {
      const res = await api<{ response: string }>("/api/chat", { method: "POST", json: { message: q } });
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: "assistant", text: res.response }]);
      void frequent.reload();
    } catch (e) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: "assistant", text: errorMessage(e), error: true }]);
    } finally {
      setSending(false);
    }
  }

  // Questions linked from the dashboard (/chat?q=...) are asked once history has loaded.
  useEffect(() => {
    const q = params.get("q");
    if (q && !asked.current && !history.loading) {
      asked.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, history.loading]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const suggestions = frequent.data?.length ? frequent.data.map((f) => f.question).slice(0, 4) : STARTERS;

  return (
    <div className="mx-auto flex h-[calc(100vh-150px)] max-w-[820px] flex-col md:h-[calc(100vh-190px)]">
      <div className="scroll-quiet flex-1 space-y-4 overflow-y-auto pb-4">
        {!messages.length && !history.loading && (
          <section className="mac-card p-6 text-center">
            <LogoMark size={44} className="mx-auto" />
            <p className="mt-4 font-display text-[22px] font-medium tracking-tight">Hi {me.full_name.split(" ")[0]}, ask me anything about company policy.</p>
            <p className="mt-1 text-[13px] text-[var(--fg-2)]">Answers come from the employee handbook. For anything personal, HR is a message away.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {STARTERS.map((s) => (
                <button key={s} className="mac-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </section>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end gap-2">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-2.5 text-[14px] text-[var(--primary-fg)]">{m.text}</p>
              <Avatar name={me.full_name} size={30} />
            </div>
          ) : (
            <section key={m.id} className="mac-card max-w-[90%] p-4" style={m.error ? { boxShadow: "0 0 0 1.5px var(--bad), var(--shadow-card)" } : undefined}>
              <RichText text={m.text} className={m.error ? "text-[var(--bad)]" : ""} />
              <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[var(--fg-3)]">
                <LogoMark size={14} /> HireFlow AI · HR Assistant
              </p>
            </section>
          ),
        )}

        {sending && (
          <section className="mac-card inline-flex items-center gap-2 p-4 text-[13px] text-[var(--fg-2)]">
            <LogoMark size={18} animated /> Looking it up in the handbook…
          </section>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mac-card p-3">
        {messages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button type="button" key={s} className="mac-chip" onClick={() => send(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            className={`${inputCls} h-12 flex-1 resize-none !py-3`}
            placeholder="Ask about leave, benefits, working hours…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button className="mac-btn-primary h-12 px-4" disabled={sending || !input.trim()} aria-label="Send">
            <Icon name="send" size={16} />
          </button>
        </div>
        {!me.employee && <p className="mt-2 text-[11px] text-[var(--fg-3)]">Chat history is only saved for accounts linked to an employee profile.</p>}
      </form>
    </div>
  );
}

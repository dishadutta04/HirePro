"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Avatar, Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, StatusBadge, inputCls } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmtDate, label } from "@/lib/format";
import type { AiReviewSummary, Cycle, Review } from "@/lib/types";

export default function PerformancePage() {
  const { me, isManager } = useMe();
  const cycles = useApi<Cycle[]>("/api/reviews/cycles");
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const { run } = useAction();

  useEffect(() => {
    if (cycleId === null && cycles.data?.length) {
      setCycleId((cycles.data.find((c) => c.status === "active") ?? cycles.data[0]).id);
    }
  }, [cycles.data, cycleId]);

  const reviews = useApi<Review[]>(cycleId ? `/api/reviews/cycles/${cycleId}/reviews` : null);
  const cycle = cycles.data?.find((c) => c.id === cycleId);
  const mine = reviews.data?.find((r) => r.employee_id === me.employee?.id);
  const open = reviews.data?.find((r) => r.id === openId);

  async function activate() {
    if (!cycle) return;
    if (await run(() => api(`/api/reviews/cycles/${cycle.id}/activate`, { method: "POST" }), "Cycle activated, reviews created")) {
      void cycles.reload();
      void reviews.reload();
    }
  }

  const done = reviews.data?.filter((r) => r.status === "completed").length ?? 0;

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle="Review cycles, self-assessments and manager reviews"
        actions={
          isManager && (
            <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setCreating(true)}>
              <Icon name="plus" size={14} /> New cycle
            </button>
          )
        }
      />

      {cycles.error && <ErrorNote message={cycles.error} onRetry={cycles.reload} />}
      {cycles.loading && !cycles.data && <Loading />}
      {cycles.data && !cycles.data.length && (
        <Card><Empty icon="star" title="No review cycles yet" text={isManager ? "Create a cycle, then activate it to create a review for every active employee." : "Your manager hasn't started a review cycle."} /></Card>
      )}

      {cycles.data && cycles.data.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {cycles.data.map((c) => (
            <button key={c.id} className="mac-chip" aria-pressed={c.id === cycleId} onClick={() => setCycleId(c.id)}>
              {c.name} <span className="ml-1 opacity-60">{label(c.status)}</span>
            </button>
          ))}
        </div>
      )}

      {cycle && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-4">
            <Card title="Cycle" action={<StatusBadge status={cycle.status} />}>
              <p className="text-[16px] font-semibold">{cycle.name}</p>
              {cycle.description && <p className="mt-1 text-[13px] text-[var(--fg-2)]">{cycle.description}</p>}
              <p className="mt-2 text-[12px] text-[var(--fg-3)]">{fmtDate(cycle.start_date)} – {fmtDate(cycle.end_date)}</p>
              {cycle.review_count > 0 && (
                <>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--card-soft)]">
                    <div className="h-full rounded-full bg-[var(--ok)]" style={{ width: `${(done / cycle.review_count) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--fg-2)]">{done} of {cycle.review_count} reviews complete</p>
                </>
              )}
              {isManager && cycle.status === "draft" && (
                <button className="mac-btn-primary mt-3 w-full py-2 text-[13px]" onClick={activate}>
                  <Icon name="bolt" size={14} /> Activate & create reviews
                </button>
              )}
            </Card>

            {me.employee && cycle.status !== "draft" && (
              <Card title="My review">
                {mine ? <MyReview review={mine} onSaved={reviews.reload} /> : reviews.loading ? <Loading /> : <p className="text-[13px] text-[var(--fg-2)]">You aren&apos;t part of this cycle.</p>}
              </Card>
            )}
          </div>

          {isManager && (
            <Card title="Team reviews">
              {reviews.error && <ErrorNote message={reviews.error} onRetry={reviews.reload} />}
              {reviews.data?.length ? (
                <ul className="divide-y divide-[var(--line)]">
                  {reviews.data.map((r) => (
                    <li key={r.id}>
                      <button className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-[var(--hover)]" onClick={() => setOpenId(r.id)}>
                        <Avatar name={r.employee_name} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium">{r.employee_name}</p>
                          <p className="text-[12px] text-[var(--fg-2)]">
                            {r.department} · self {r.self_rating ?? "—"} · manager {r.manager_rating ?? "—"}
                          </p>
                        </div>
                        {r.overall_rating !== null && <Stars value={r.overall_rating} />}
                        <StatusBadge status={r.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : reviews.loading ? <Loading /> : <Empty icon="star" title="No reviews in this cycle" text={cycle.status === "draft" ? "Activate the cycle to create them." : undefined} />}
            </Card>
          )}
        </div>
      )}

      {creating && <NewCycle onClose={() => setCreating(false)} onDone={(id) => { void cycles.reload(); setCycleId(id); }} />}
      {open && <ReviewModal review={open} onClose={() => setOpenId(null)} onSaved={reviews.reload} />}
    </>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="hidden items-center gap-0.5 sm:flex" title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={12} className={i <= Math.round(value) ? "fill-[var(--warn)] text-[var(--warn)]" : "text-[var(--fg-3)]"} />
      ))}
    </span>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} role="radio" aria-checked={value === n} className="mac-chip !px-3" aria-pressed={value === n} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

function MyReview({ review: r, onSaved }: { review: Review; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ self_rating: r.self_rating ?? 3, self_comments: r.self_comments ?? "", achievements: r.achievements ?? "", goals: r.goals ?? "" });

  if (r.status === "completed") {
    return (
      <div className="space-y-3 text-[13px]">
        <div className="flex items-center gap-3">
          <span className="font-display text-[32px] font-semibold tabular-nums">{r.overall_rating}</span>
          <div>
            <Stars value={r.overall_rating ?? 0} />
            <p className="text-[12px] text-[var(--fg-2)]">Overall · self {r.self_rating} · manager {r.manager_rating}</p>
          </div>
        </div>
        {r.manager_comments && <p><span className="mac-label block">Manager feedback</span>{r.manager_comments}</p>}
        {r.areas_of_improvement && <p><span className="mac-label block">Areas to grow</span>{r.areas_of_improvement}</p>}
      </div>
    );
  }
  if (r.status !== "pending") {
    return <p className="text-[13px] text-[var(--fg-2)]">Self-assessment submitted (rated {r.self_rating}/5). Waiting for your manager.</p>;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api(`/api/reviews/${r.id}/self-assessment`, { method: "POST", json: form }), "Self-assessment submitted")) onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="How did this period go? (1–5)" group><RatingPicker value={form.self_rating} onChange={(n) => setForm((f) => ({ ...f, self_rating: n }))} /></Field>
      <Field label="Comments"><textarea className={`${inputCls} h-20 resize-y`} required value={form.self_comments} onChange={(e) => setForm((f) => ({ ...f, self_comments: e.target.value }))} /></Field>
      <Field label="Achievements"><textarea className={`${inputCls} h-20 resize-y`} value={form.achievements} onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))} /></Field>
      <Field label="Goals for next period"><textarea className={`${inputCls} h-20 resize-y`} value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} /></Field>
      <button className="mac-btn-primary w-full py-2.5 text-[14px]" disabled={busy}><Icon name="send" size={14} /> Submit self-assessment</button>
    </form>
  );
}

function ReviewModal({ review: r, onClose, onSaved }: { review: Review; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ manager_rating: r.manager_rating ?? 3, manager_comments: r.manager_comments ?? "", areas_of_improvement: r.areas_of_improvement ?? "" });
  const [summary, setSummary] = useState<{ loading: boolean; data: AiReviewSummary | null; error?: string }>({ loading: false, data: r.ai_summary });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api(`/api/reviews/${r.id}/manager-review`, { method: "POST", json: form }), "Review completed")) {
      onSaved();
      onClose();
    }
  }

  async function generate() {
    setSummary((s) => ({ ...s, loading: true, error: undefined }));
    try {
      setSummary({ loading: false, data: await api<AiReviewSummary>(`/api/reviews/${r.id}/generate-summary`, { method: "POST" }) });
    } catch (e) {
      setSummary((s) => ({ ...s, loading: false, error: errorMessage(e) }));
    }
  }

  const row = (k: string, v: string | number | null) => v !== null && v !== "" && (
    <div><dt className="mac-label">{k}</dt><dd className="mt-0.5 whitespace-pre-wrap text-[13px]">{v}</dd></div>
  );

  return (
    <Modal open title={`${r.employee_name} · review`} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Self-assessment" action={<StatusBadge status={r.status} />}>
          {r.self_rating !== null ? (
            <dl className="space-y-2">
              {row("Rating", `${r.self_rating} / 5`)}
              {row("Comments", r.self_comments)}
              {row("Achievements", r.achievements)}
              {row("Goals", r.goals)}
            </dl>
          ) : (
            <p className="text-[13px] text-[var(--fg-2)]">Not submitted yet. You can still review now.</p>
          )}
        </Card>

        {r.status === "completed" ? (
          <Card title="Manager review">
            <dl className="space-y-2">
              {row("Rating", `${r.manager_rating} / 5`)}
              {row("Overall", `${r.overall_rating} / 5`)}
              {row("Comments", r.manager_comments)}
              {row("Areas to grow", r.areas_of_improvement)}
            </dl>
          </Card>
        ) : (
          <Card title="Your review">
            <form onSubmit={submit} className="space-y-3">
              <Field label="Rating (1–5)" group><RatingPicker value={form.manager_rating} onChange={(n) => setForm((f) => ({ ...f, manager_rating: n }))} /></Field>
              <Field label="Comments"><textarea className={`${inputCls} h-20 resize-y`} required value={form.manager_comments} onChange={(e) => setForm((f) => ({ ...f, manager_comments: e.target.value }))} /></Field>
              <Field label="Areas to grow"><textarea className={`${inputCls} h-16 resize-y`} value={form.areas_of_improvement} onChange={(e) => setForm((f) => ({ ...f, areas_of_improvement: e.target.value }))} /></Field>
              <button className="mac-btn-primary w-full py-2.5 text-[14px]" disabled={busy}>Complete review</button>
            </form>
          </Card>
        )}
      </div>

      <Card
        className="mt-4"
        title={<span className="flex items-center gap-1.5"><Icon name="sparkle" size={13} className="text-[var(--accent)]" /> AI summary</span>}
        action={
          <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={generate} disabled={summary.loading}>
            <Icon name={summary.data ? "refresh" : "sparkle"} size={13} /> {summary.loading ? "Thinking…" : summary.data ? "Regenerate" : "Generate"}
          </button>
        }
      >
        {summary.error && <p className="text-[13px] text-[var(--bad)]">{summary.error}</p>}
        {summary.data ? (
          <div className="space-y-3 text-[13px]">
            <p className="leading-relaxed">{summary.data.summary}</p>
            {summary.data.flags.length > 0 && (
              <div>
                <p className="mac-label">Flags</p>
                <ul className="mt-1 space-y-1">{summary.data.flags.map((f, i) => <li key={i} className="flex gap-2"><Icon name="info" size={14} className="mt-0.5 shrink-0 text-[var(--warn)]" />{f}</li>)}</ul>
              </div>
            )}
            {summary.data.suggestions.length > 0 && (
              <div>
                <p className="mac-label">Suggestions</p>
                <ul className="mt-1 space-y-1">{summary.data.suggestions.map((s, i) => <li key={i} className="flex gap-2"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--ok)]" />{s}</li>)}</ul>
              </div>
            )}
          </div>
        ) : (
          !summary.loading && <p className="text-[13px] text-[var(--fg-2)]">Gemini summarises both reviews, flags rating gaps and suggests next steps.</p>
        )}
      </Card>
    </Modal>
  );
}

function NewCycle({ onClose, onDone }: { onClose: () => void; onDone: (id: number) => void }) {
  const { busy, run } = useAction();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: `H2 ${year} review`, description: "", start_date: `${year}-07-01`, end_date: `${year}-12-31` });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    let id = 0;
    const ok = await run(async () => {
      id = (await api<{ id: number }>("/api/reviews/cycles", { method: "POST", json: { ...form, description: form.description || null } })).id;
    }, "Cycle created as draft");
    if (ok) {
      onDone(id);
      onClose();
    }
  }

  return (
    <Modal
      open
      title="New review cycle"
      onClose={onClose}
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="new-cycle" disabled={busy}>Create</button>
        </>
      }
    >
      <form id="new-cycle" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Name"><input className={inputCls} required value={form.name} onChange={set("name")} /></Field></div>
        <Field label="Starts"><input className={inputCls} type="date" required value={form.start_date} onChange={set("start_date")} /></Field>
        <Field label="Ends"><input className={inputCls} type="date" required value={form.end_date} onChange={set("end_date")} /></Field>
        <div className="sm:col-span-2"><Field label="Description"><textarea className={`${inputCls} h-20 resize-none`} value={form.description} onChange={set("description")} /></Field></div>
      </form>
    </Modal>
  );
}

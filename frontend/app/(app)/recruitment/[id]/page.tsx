"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { AiBlock, AiCard, Avatar, Card, ErrorNote, Field, Loading, Modal, StatusBadge, inputCls } from "@/components/ui";
import { api, errorMessage, fileUrl, useApi } from "@/lib/api";
import { fmtDate, inr, label, parseAi } from "@/lib/format";
import type { Candidate, Job, JobDetail } from "@/lib/types";
import JobForm from "../JobForm";

const STAGES = ["applied", "screening", "interview", "shortlisted", "offered", "hired", "rejected"];

type Score = { total_score?: number; skills_match?: number; experience_relevance?: number; education_fit?: number; overall_impression?: number; summary?: string };

const scoreOf = (c: Candidate) => c.score ?? parseAi<Score>(c.ai_summary)?.total_score ?? null;

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useMe();
  const job = useApi<JobDetail>(`/api/jobs/${id}`);
  const { run } = useAction();
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [compare, setCompare] = useState<{ open: boolean; loading: boolean; data?: unknown; error?: string }>({ open: false, loading: false });

  if (job.error) return <ErrorNote message={job.error} onRetry={job.reload} />;
  if (!job.data) return <Loading />;
  const j = job.data;

  const updateCandidate = (cid: number, patch: Partial<Candidate>) =>
    job.setData((cur) => cur && { ...cur, candidates: cur.candidates.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });

  async function move(cid: number, stage: string) {
    const before = j.candidates.find((c) => c.id === cid)?.stage;
    if (!before || before === stage) return;
    updateCandidate(cid, { stage }); // optimistic; put it back if the server says no
    const ok = await run(() => api(`/api/jobs/${id}/candidates/${cid}/stage`, { method: "PUT", json: { stage } }), `Moved to ${label(stage)}`);
    if (!ok) updateCandidate(cid, { stage: before });
  }

  async function runCompare() {
    setCompare({ open: true, loading: true });
    try {
      setCompare({ open: true, loading: false, data: await api(`/api/jobs/${id}/compare`) });
    } catch (e) {
      setCompare({ open: true, loading: false, error: errorMessage(e) });
    }
  }

  async function removeJob() {
    if (!confirm(`Delete "${j.title}" and all its candidates?`)) return;
    if (await run(() => api(`/api/jobs/${id}`, { method: "DELETE" }), "Job deleted")) router.replace("/recruitment");
  }

  const open = j.candidates.find((c) => c.id === openId);

  return (
    <>
      <Link href="/recruitment" className="mac-btn mb-3 -ml-2 text-[13px] text-[var(--fg-2)]">
        <Icon name="back" size={14} /> All jobs
      </Link>

      <section className="mac-card p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[24px] font-semibold tracking-tight">{j.title}</h1>
              <StatusBadge status={j.status} />
            </div>
            <p className="mt-1 text-[13px] text-[var(--fg-2)]">
              {[j.department, j.location, label(j.employment_type)].filter(Boolean).join(" · ")}
              {(j.salary_min || j.salary_max) && ` · ${inr(j.salary_min)} – ${inr(j.salary_max)}`}
              {j.closing_date && ` · closes ${fmtDate(j.closing_date)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="mac-btn-outline px-3 py-1.5 text-[13px]" onClick={runCompare} disabled={!j.candidates.length}>
              <Icon name="sparkle" size={14} /> Compare with AI
            </button>
            <button className="mac-btn-outline px-3 py-1.5 text-[13px]" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Edit
            </button>
            {isAdmin && (
              <button className="mac-btn-outline px-3 py-1.5 text-[13px] text-[var(--bad)]" onClick={removeJob}>
                <Icon name="trash" size={14} />
              </button>
            )}
            <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} /> Add candidate
            </button>
          </div>
        </div>
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-[var(--fg-2)]">Description & requirements</summary>
          <p className="mt-2 whitespace-pre-wrap">{j.description}</p>
          {j.requirements && <p className="mt-2 whitespace-pre-wrap text-[var(--fg-2)]">{j.requirements}</p>}
        </details>
      </section>

      <p className="mb-2 mt-5 text-[12px] text-[var(--fg-3)]">Drag a card to another column to move the candidate, or open it to use the stage menu.</p>
      <div className="scroll-quiet -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
        {STAGES.map((stage) => {
          const cards = j.candidates.filter((c) => c.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => {
                if (dragging !== null) void move(dragging, stage);
                setDragging(null);
                setOverStage(null);
              }}
              className={`flex w-[240px] shrink-0 flex-col rounded-2xl p-2 transition ${
                overStage === stage ? "bg-[var(--selected)]" : "bg-[var(--card-soft)]"
              }`}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <StatusBadge status={stage} />
                <span className="text-[12px] tabular-nums text-[var(--fg-3)]">{cards.length}</span>
              </div>
              <div className="mt-1 min-h-[80px] space-y-2">
                {cards.map((c) => {
                  const score = scoreOf(c);
                  return (
                    <button
                      key={c.id}
                      draggable
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setOpenId(c.id)}
                      className={`mac-card block w-full cursor-grab p-3 text-left active:cursor-grabbing ${dragging === c.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{c.name}</p>
                          <p className="truncate text-[11px] text-[var(--fg-3)]">{c.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--fg-2)]">
                        <span>{fmtDate(c.applied_at, false)}</span>
                        {score !== null && (
                          <span className="flex items-center gap-1 font-semibold text-[var(--fg)]">
                            <Icon name="sparkle" size={11} className="text-[var(--accent)]" /> {score}/100
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {adding && <AddCandidate jobId={j.id} onClose={() => setAdding(false)} onDone={job.reload} />}
      {editing && (
        <JobForm
          job={j as Job}
          onClose={() => setEditing(false)}
          onSaved={(saved) => job.setData((cur) => cur && { ...cur, ...saved, candidates: cur.candidates })}
        />
      )}
      {open && <CandidatePanel jobId={j.id} candidate={open} onClose={() => setOpenId(null)} onMove={move} onUpdate={(p) => updateCandidate(open.id, p)} />}

      <Modal open={compare.open} title="AI candidate comparison" onClose={() => setCompare({ open: false, loading: false })} wide>
        <AiCard
          title="Comparison"
          loading={compare.loading}
          error={compare.error}
          text={compare.data ? JSON.stringify(compare.data) : undefined}
          onRun={runCompare}
        />
      </Modal>
    </>
  );
}

function AddCandidate({ jobId, onClose, onDone }: { jobId: number; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: "", email: "", phone: "", resume_text: "", cover_letter: "" });
  const [resume, setResume] = useState<File | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      const created = await api<{ id: number }>(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        json: { ...form, phone: form.phone || null },
      });
      if (resume) {
        const body = new FormData();
        body.append("file", resume);
        await api(`/api/jobs/${jobId}/candidates/${created.id}/upload-resume`, { method: "POST", body });
      }
    }, "Candidate added");
    if (ok) {
      onDone();
      onClose();
    }
  }

  return (
    <Modal
      open
      title="Add candidate"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="add-candidate" disabled={busy}>{busy ? "Saving…" : "Add candidate"}</button>
        </>
      }
    >
      <form id="add-candidate" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><input className={inputCls} required value={form.name} onChange={set("name")} /></Field>
        <Field label="Email"><input className={inputCls} type="email" required value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Resume file (optional)"><input className={inputCls} type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setResume(e.target.files?.[0] ?? null)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Resume text" hint="Paste the resume here. Gemini reads this text when scoring and writing questions.">
            <textarea className={`${inputCls} h-32 resize-y`} value={form.resume_text} onChange={set("resume_text")} />
          </Field>
        </div>
        <div className="sm:col-span-2"><Field label="Cover letter"><textarea className={`${inputCls} h-20 resize-y`} value={form.cover_letter} onChange={set("cover_letter")} /></Field></div>
      </form>
    </Modal>
  );
}

function CandidatePanel({
  jobId,
  candidate: c,
  onClose,
  onMove,
  onUpdate,
}: {
  jobId: number;
  candidate: Candidate;
  onClose: () => void;
  onMove: (id: number, stage: string) => void;
  onUpdate: (p: Partial<Candidate>) => void;
}) {
  const [scoring, setScoring] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [questions, setQuestions] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });
  const parsed = parseAi<Score>(c.ai_summary);
  // Older records keep a plain-text summary plus a numeric score instead of Gemini's JSON.
  const score: Score | null = parsed ?? (c.score !== null ? { total_score: c.score, summary: c.ai_summary ?? undefined } : null);

  async function runScore() {
    setScoring({ loading: true });
    try {
      const res = await api<{ ai_summary: string }>(`/api/jobs/${jobId}/candidates/${c.id}/score`, { method: "POST" });
      onUpdate({ ai_summary: res.ai_summary });
      setScoring({ loading: false });
    } catch (e) {
      setScoring({ loading: false, error: errorMessage(e) });
    }
  }

  async function runQuestions() {
    setQuestions({ loading: true });
    try {
      const res = await api<{ questions: string }>(`/api/jobs/${jobId}/candidates/${c.id}/questions`, { method: "POST" });
      setQuestions({ loading: false, text: res.questions });
    } catch (e) {
      setQuestions({ loading: false, error: errorMessage(e) });
    }
  }

  const parts: [string, number | undefined, number][] = [
    ["Skills", score?.skills_match, 30],
    ["Experience", score?.experience_relevance, 30],
    ["Education", score?.education_fit, 20],
    ["Impression", score?.overall_impression, 20],
  ];

  return (
    <Modal open title={c.name} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold">{c.name}</p>
          <p className="text-[13px] text-[var(--fg-2)]">
            {c.email}
            {c.phone && ` · ${c.phone}`}
          </p>
        </div>
        <select className={`${inputCls} !w-auto`} value={c.stage} onChange={(e) => onMove(c.id, e.target.value)} aria-label="Stage">
          {STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        {c.resume_url && (
          <a href={fileUrl(c.resume_url)} target="_blank" rel="noreferrer" className="mac-btn-outline px-3 py-2 text-[13px]">
            <Icon name="doc" size={14} /> Resume
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-3">
        <Card
          title={<span className="flex items-center gap-1.5"><Icon name="sparkle" size={13} className="text-[var(--accent)]" /> Resume score</span>}
          action={
            <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={runScore} disabled={scoring.loading}>
              <Icon name={c.ai_summary ? "refresh" : "sparkle"} size={13} /> {scoring.loading ? "Scoring…" : c.ai_summary ? "Re-score" : "Score with AI"}
            </button>
          }
        >
          {scoring.error && <p className="text-[13px] text-[var(--bad)]">{scoring.error}</p>}
          {score?.total_score !== undefined ? (
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-[40px] font-semibold leading-none tabular-nums">{score.total_score}</span>
                <span className="pb-1 text-[13px] text-[var(--fg-2)]">/ 100 match</span>
              </div>
              <div className={`mt-3 grid gap-2 sm:grid-cols-2 ${parts.some(([, v]) => v !== undefined) ? "" : "hidden"}`}>
                {parts.map(([name, value, max]) => (
                  <div key={name}>
                    <div className="flex justify-between text-[12px]">
                      <span>{name}</span>
                      <span className="tabular-nums text-[var(--fg-2)]">{value ?? "—"}/{max}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--card-soft)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${((value ?? 0) / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {score.summary && <p className="mt-3 text-[13px] leading-relaxed">{score.summary}</p>}
            </>
          ) : c.ai_summary ? (
            <AiBlock text={c.ai_summary} />
          ) : (
            !scoring.loading && <p className="text-[13px] text-[var(--fg-2)]">Gemini scores the resume text against this job&apos;s description and requirements.</p>
          )}
        </Card>

        <AiCard
          title="Interview questions"
          text={questions.text}
          loading={questions.loading}
          error={questions.error}
          onRun={runQuestions}
          runLabel="Generate questions"
          empty="Tailored technical, behavioural and situational questions for this candidate."
        />
      </div>
    </Modal>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { AiCard, Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, StatusBadge, inputCls } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { daysBetween, fmtDate, label, today } from "@/lib/format";
import type { Leave, LeaveBalance } from "@/lib/types";

const LEAVE_TYPES = ["casual", "sick", "earned", "maternity", "paternity", "unpaid"];

export default function LeavePage() {
  const { me, isManager } = useMe();
  const [tab, setTab] = useState<"mine" | "pending" | "all">(me.employee ? "mine" : "pending");
  const [statusFilter, setStatusFilter] = useState("all");
  const mine = useApi<Leave[]>(me.employee ? `/api/leaves?employee_id=${me.employee.id}` : null);
  const balance = useApi<LeaveBalance[]>(me.employee ? `/api/leaves/balance/${me.employee.id}?year=${new Date().getFullYear()}` : null);
  const all = useApi<Leave[]>(isManager ? "/api/leaves" : null);
  const [deciding, setDeciding] = useState<{ leave: Leave; action: "approved" | "rejected" } | null>(null);
  const [ai, setAi] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });

  async function analyze() {
    setAi({ loading: true });
    try {
      setAi({ loading: false, text: (await api<{ analysis: string }>("/api/leaves/ai/analyze")).analysis });
    } catch (e) {
      setAi({ loading: false, error: errorMessage(e) });
    }
  }

  const pending = (all.data ?? []).filter((l) => l.status === "pending");
  const allShown = (all.data ?? []).filter((l) => statusFilter === "all" || l.status === statusFilter);

  return (
    <>
      <PageHeader title="Leave" subtitle="Apply for time off and track approvals" />

      {(isManager || me.employee) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {me.employee && (
            <button className="mac-chip" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>My leave</button>
          )}
          {isManager && (
            <>
              <button className="mac-chip" aria-pressed={tab === "pending"} onClick={() => setTab("pending")}>
                Approvals {pending.length > 0 && <span className="ml-1 opacity-60">{pending.length}</span>}
              </button>
              <button className="mac-chip" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All requests</button>
            </>
          )}
        </div>
      )}

      {tab === "mine" && me.employee && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <Card title={`Balance ${new Date().getFullYear()}`}>
              {balance.data?.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {balance.data.map((b) => (
                    <div key={b.leave_type} className="rounded-xl bg-[var(--card-soft)] p-3">
                      <p className="text-[12px] text-[var(--fg-2)]">{label(b.leave_type)}</p>
                      <p className="font-display text-[24px] font-semibold tabular-nums">{b.remaining_days}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--card)]">
                        <div className="h-full rounded-full bar-accent" style={{ width: `${(b.remaining_days / Math.max(1, b.total_days)) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--fg-3)]">of {b.total_days} left</p>
                    </div>
                  ))}
                </div>
              ) : balance.loading ? <Loading /> : <p className="text-[13px] text-[var(--fg-2)]">No balance for this year.</p>}
            </Card>
            <ApplyForm balances={balance.data ?? []} onDone={() => { void mine.reload(); void all.reload(); }} />
          </div>
          <Card title="My requests">
            {mine.error && <ErrorNote message={mine.error} onRetry={mine.reload} />}
            {mine.data?.length ? <LeaveList leaves={mine.data} /> : mine.loading ? <Loading /> : <Empty icon="calendar" title="No requests yet" />}
          </Card>
        </div>
      )}

      {tab === "mine" && !me.employee && (
        <Card><Empty icon="user" title="No employee profile linked" text="Ask an admin to link your account to an employee profile to apply for leave." /></Card>
      )}

      {tab === "pending" && isManager && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Waiting for approval">
            {all.error && <ErrorNote message={all.error} onRetry={all.reload} />}
            {all.loading && !all.data ? (
              <Loading />
            ) : pending.length ? (
              <LeaveList
                leaves={pending}
                showName
                actions={(l) => (
                  <div className="flex gap-1.5">
                    <button className="mac-btn-primary px-2.5 py-1 text-[12px]" onClick={() => setDeciding({ leave: l, action: "approved" })}>Approve</button>
                    <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => setDeciding({ leave: l, action: "rejected" })}>Reject</button>
                  </div>
                )}
              />
            ) : (
              <Empty icon="check" title="All caught up" text="No leave requests are waiting." />
            )}
          </Card>
          <AiCard title="Leave patterns" text={ai.text} loading={ai.loading} error={ai.error} onRun={analyze} runLabel="Analyze" empty="Gemini looks for patterns like frequent Monday/Friday leave, busy months and department load." />
        </div>
      )}

      {tab === "all" && isManager && (
        <Card
          title="All leave requests"
          action={
            <select className={`${inputCls} !w-auto !py-1 !text-[12px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {["all", "pending", "approved", "rejected", "cancelled"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : label(s)}</option>)}
            </select>
          }
        >
          {allShown.length ? <LeaveList leaves={allShown} showName /> : all.loading ? <Loading /> : <Empty icon="calendar" title="Nothing here" />}
        </Card>
      )}

      {deciding && (
        <DecideModal
          {...deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            void all.reload();
            void mine.reload();
          }}
        />
      )}
    </>
  );
}

function LeaveList({ leaves, showName = false, actions }: { leaves: Leave[]; showName?: boolean; actions?: (l: Leave) => React.ReactNode }) {
  return (
    <ul className="divide-y divide-[var(--line)]">
      {leaves.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">
              {showName ? `${l.employee_name} · ` : ""}
              {label(l.leave_type)} leave
              <span className="ml-1.5 font-normal text-[var(--fg-2)]">
                {daysBetween(l.start_date, l.end_date)} day{daysBetween(l.start_date, l.end_date) === 1 ? "" : "s"}
              </span>
            </p>
            <p className="text-[12px] text-[var(--fg-2)]">
              {fmtDate(l.start_date)} – {fmtDate(l.end_date)}
              {l.reason && ` · ${l.reason}`}
            </p>
            {l.comments && <p className="text-[12px] text-[var(--fg-3)]">Comment: {l.comments}</p>}
          </div>
          {actions ? actions(l) : <StatusBadge status={l.status} />}
        </li>
      ))}
    </ul>
  );
}

function ApplyForm({ balances, onDone }: { balances: LeaveBalance[]; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ leave_type: "casual", start_date: today(), end_date: today(), reason: "" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const days = form.start_date && form.end_date ? daysBetween(form.start_date, form.end_date) : 0;
  const left = balances.find((b) => b.leave_type === form.leave_type)?.remaining_days;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api("/api/leaves", { method: "POST", json: form }), "Leave request sent")) {
      setForm((f) => ({ ...f, reason: "" }));
      onDone();
    }
  }

  return (
    <Card title="Apply for leave">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Type" group>
            <div className="flex flex-wrap gap-1.5">
              {LEAVE_TYPES.map((t) => (
                <button type="button" key={t} className="mac-chip" aria-pressed={form.leave_type === t} onClick={() => setForm((f) => ({ ...f, leave_type: t }))}>
                  {label(t)}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="From"><input className={inputCls} type="date" required value={form.start_date} onChange={set("start_date")} /></Field>
        <Field label="To"><input className={inputCls} type="date" required min={form.start_date} value={form.end_date} onChange={set("end_date")} /></Field>
        <div className="sm:col-span-2"><Field label="Reason"><textarea className={`${inputCls} h-20 resize-none`} value={form.reason} onChange={set("reason")} placeholder="Optional" /></Field></div>
        <p className="text-[12px] text-[var(--fg-2)] sm:col-span-2">
          {days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "Check the dates"}
          {left !== undefined && ` · ${left} ${label(form.leave_type).toLowerCase()} left`}
          {left !== undefined && days > left && <span className="text-[var(--bad)]"> · more than your balance</span>}
        </p>
        <button className="mac-btn-primary py-2.5 text-[14px] sm:col-span-2" disabled={busy || days < 1}>
          <Icon name="send" size={14} /> {busy ? "Sending…" : "Send request"}
        </button>
      </form>
    </Card>
  );
}

function DecideModal({ leave, action, onClose, onDone }: { leave: Leave; action: "approved" | "rejected"; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [comments, setComments] = useState("");
  async function submit() {
    if (await run(() => api(`/api/leaves/${leave.id}/action`, { method: "PUT", json: { action, comments: comments || null } }), `Leave ${action}`)) {
      onDone();
      onClose();
    }
  }
  return (
    <Modal
      open
      title={`${action === "approved" ? "Approve" : "Reject"} leave`}
      onClose={onClose}
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" onClick={submit} disabled={busy}>{action === "approved" ? "Approve" : "Reject"}</button>
        </>
      }
    >
      <p className="text-[14px]">
        <strong>{leave.employee_name}</strong> · {label(leave.leave_type)} leave, {fmtDate(leave.start_date)} – {fmtDate(leave.end_date)} ({daysBetween(leave.start_date, leave.end_date)} days)
      </p>
      {leave.reason && <p className="mt-1 text-[13px] text-[var(--fg-2)]">“{leave.reason}”</p>}
      <div className="mt-3">
        <Field label="Comment (optional)"><textarea className={`${inputCls} h-20 resize-none`} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

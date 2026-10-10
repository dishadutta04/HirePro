"use client";

import { FormEvent, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, StatusBadge, inputCls } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate, parseAi } from "@/lib/format";
import type { Checklist, ChecklistItem, Employee, Progress } from "@/lib/types";

const itemsOf = (json: string) => parseAi<ChecklistItem[]>(json) ?? [];
const doneOf = (p: Progress) => new Set(p.completed_items.split(",").filter((x) => x.trim()).map(Number));

export default function OnboardingPage() {
  const { me, isManager } = useMe();
  const [tab, setTab] = useState<"mine" | "manage">(isManager ? "manage" : "mine");

  return (
    <>
      <PageHeader title="Onboarding" subtitle="Checklists that get new joiners productive" />
      {isManager && me.employee && (
        <div className="mb-4 flex gap-1.5">
          <button className="mac-chip" aria-pressed={tab === "manage"} onClick={() => setTab("manage")}>Checklists & assignments</button>
          <button className="mac-chip" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>My onboarding</button>
        </div>
      )}
      {tab === "mine" &&
        (me.employee ? <ProgressList employeeId={me.employee.id} editable /> : <Card><Empty icon="user" title="No employee profile linked" /></Card>)}
      {tab === "manage" && isManager && <Manage />}
    </>
  );
}

function ProgressList({ employeeId, editable }: { employeeId: number; editable: boolean }) {
  const progress = useApi<Progress[]>(`/api/onboarding/progress/${employeeId}`);
  const { run } = useAction();

  async function toggle(p: Progress, index: number) {
    const done = doneOf(p);
    if (done.has(index)) done.delete(index);
    else done.add(index);
    const completed_items = [...done].sort((a, b) => a - b).join(",");
    progress.setData((cur) => cur?.map((x) => (x.id === p.id ? { ...x, completed_items } : x)));
    const ok = await run(async () => {
      const res = await api<{ status: string }>(`/api/onboarding/progress/${p.id}`, { method: "PUT", json: { completed_items } });
      progress.setData((cur) => cur?.map((x) => (x.id === p.id ? { ...x, status: res.status } : x)));
    });
    if (!ok) void progress.reload();
  }

  if (progress.error) return <ErrorNote message={progress.error} onRetry={progress.reload} />;
  if (!progress.data) return <Loading />;
  if (!progress.data.length) return <Card><Empty icon="clipboard" title="No onboarding assigned" text="Checklists assigned by HR show up here." /></Card>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {progress.data.map((p) => {
        const items = itemsOf(p.items);
        const done = doneOf(p);
        const pct = items.length ? Math.round((done.size / items.length) * 100) : 0;
        return (
          <Card key={p.id} title={p.title} action={<StatusBadge status={p.status} />}>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--card-soft)]">
                <div className="h-full rounded-full bg-[var(--ok)] transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] font-semibold tabular-nums">{pct}%</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--fg-3)]">Started {fmtDate(p.started_at)}{p.completed_at && ` · completed ${fmtDate(p.completed_at)}`}</p>
            <ul className="mt-3 space-y-1">
              {items.map((item, i) => (
                <li key={i}>
                  <button
                    disabled={!editable}
                    onClick={() => toggle(p, i)}
                    className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--hover)] disabled:hover:bg-transparent"
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done.has(i) ? "border-[var(--ok)] bg-[var(--ok)] text-white" : "border-[var(--fg-3)]"}`}>
                      {done.has(i) && <Icon name="check" size={13} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[14px] font-medium ${done.has(i) ? "text-[var(--fg-2)] line-through" : ""}`}>{item.title}</span>
                      <span className="block text-[12px] text-[var(--fg-2)]">
                        {[item.description, item.assignee && `Owner: ${item.assignee}`, item.due_days && `Day ${item.due_days}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function Manage() {
  const checklists = useApi<Checklist[]>("/api/onboarding/checklists");
  const employees = useApi<{ employees: Employee[] }>("/api/employees?status=active&limit=500");
  const { busy, run } = useAction();
  const [creating, setCreating] = useState(false);
  const [assign, setAssign] = useState({ employee: "", checklist: "" });
  const [viewing, setViewing] = useState<string>("");
  const [assigned, setAssigned] = useState(0); // remounts the progress list after an assignment

  async function doAssign(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api(`/api/onboarding/assign/${assign.employee}/${assign.checklist}`, { method: "POST" }), "Checklist assigned")) {
      setViewing(assign.employee);
      setAssigned((n) => n + 1);
    }
  }

  const empList = employees.data?.employees ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title="Checklists"
          action={
            <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => setCreating(true)}>
              <Icon name="plus" size={13} /> New checklist
            </button>
          }
        >
          {checklists.error && <ErrorNote message={checklists.error} onRetry={checklists.reload} />}
          {checklists.data?.length ? (
            <ul className="space-y-2">
              {checklists.data.map((c) => {
                const items = itemsOf(c.items);
                return (
                  <li key={c.id} className="rounded-xl bg-[var(--card-soft)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold">{c.title}</p>
                      <span className="text-[12px] text-[var(--fg-2)]">{items.length} steps{c.department && ` · ${c.department}`}</span>
                    </div>
                    {c.description && <p className="mt-0.5 text-[12px] text-[var(--fg-2)]">{c.description}</p>}
                    <p className="mt-1.5 text-[12px] text-[var(--fg-3)]">{items.map((i) => i.title).join(" → ")}</p>
                  </li>
                );
              })}
            </ul>
          ) : checklists.loading ? <Loading /> : <Empty icon="clipboard" title="No checklists" />}
        </Card>

        <Card title="Assign to a new joiner">
          <form onSubmit={doAssign} className="space-y-3">
            <Field label="Employee">
              <select className={inputCls} required value={assign.employee} onChange={(e) => setAssign((a) => ({ ...a, employee: e.target.value }))}>
                <option value="">Choose…</option>
                {empList.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.department}</option>)}
              </select>
            </Field>
            <Field label="Checklist">
              <select className={inputCls} required value={assign.checklist} onChange={(e) => setAssign((a) => ({ ...a, checklist: e.target.value }))}>
                <option value="">Choose…</option>
                {checklists.data?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <button className="mac-btn-primary w-full py-2.5 text-[14px]" disabled={busy}><Icon name="send" size={14} /> Assign</button>
          </form>
        </Card>
      </div>

      <Card
        title="Progress"
        action={
          <select className={`${inputCls} !w-auto !py-1 !text-[12px]`} value={viewing} onChange={(e) => setViewing(e.target.value)}>
            <option value="">Choose an employee…</option>
            {empList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        }
      >
        {viewing ? <ProgressList key={`${viewing}-${assigned}`} employeeId={Number(viewing)} editable /> : <p className="text-[13px] text-[var(--fg-2)]">Pick someone to see where they are.</p>}
      </Card>

      {creating && <NewChecklist onClose={() => setCreating(false)} onDone={checklists.reload} />}
    </div>
  );
}

function NewChecklist({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ title: "", description: "", department: "" });
  const [steps, setSteps] = useState<ChecklistItem[]>([{ title: "", assignee: "HR", due_days: 1 }]);
  const setStep = (i: number, patch: Partial<ChecklistItem>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save(e: FormEvent) {
    e.preventDefault();
    const items = steps.filter((s) => s.title.trim());
    if (!items.length) return;
    const json = { ...form, description: form.description || null, department: form.department || null, items: JSON.stringify(items) };
    if (await run(() => api("/api/onboarding/checklists", { method: "POST", json }), "Checklist created")) {
      onDone();
      onClose();
    }
  }

  return (
    <Modal
      open
      title="New checklist"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="new-checklist" disabled={busy}>Create</button>
        </>
      }
    >
      <form id="new-checklist" onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title"><input className={inputCls} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Department"><input className={inputCls} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
        </div>
        <Field label="Description"><input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        <p className="mac-label">Steps</p>
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input className={inputCls} placeholder={`Step ${i + 1}`} value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} />
            <select className={`${inputCls} !w-28`} value={s.assignee} onChange={(e) => setStep(i, { assignee: e.target.value })}>
              {["HR", "IT", "Manager", "Employee"].map((a) => <option key={a}>{a}</option>)}
            </select>
            <input className={`${inputCls} !w-20`} type="number" min={1} title="Due on day" value={s.due_days} onChange={(e) => setStep(i, { due_days: Number(e.target.value) })} />
            <button type="button" className="mac-btn !px-2 text-[var(--fg-3)]" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label="Remove step">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="mac-btn-outline px-3 py-1.5 text-[12px]" onClick={() => setSteps((s) => [...s, { title: "", assignee: "Employee", due_days: 3 }])}>
          <Icon name="plus" size={13} /> Add step
        </button>
      </form>
    </Modal>
  );
}

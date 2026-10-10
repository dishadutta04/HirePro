"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Avatar, Card, Empty, ErrorNote, Field, Loading, PageHeader, Stat, StatusBadge, inputCls } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate, fmtTime, label, today } from "@/lib/format";
import type { AttendanceRow, Employee } from "@/lib/types";

const STATUSES = ["present", "work_from_home", "half_day", "absent", "on_leave"];

const STATUS_DOT: Record<string, string> = {
  present: "bg-[var(--ok)]",
  work_from_home: "bg-[var(--accent)]",
  half_day: "bg-[var(--warn)]",
  absent: "bg-[var(--bad)]",
  on_leave: "bg-[var(--fg-3)]",
};

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
};

export default function AttendancePage() {
  const { me, isManager } = useMe();
  const [tab, setTab] = useState<"mine" | "team">(me.employee ? "mine" : "team");

  return (
    <>
      <PageHeader title="Attendance" subtitle="Daily check-ins and work hours" />
      {isManager && me.employee && (
        <div className="mb-4 flex gap-1.5">
          <button className="mac-chip" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>My attendance</button>
          <button className="mac-chip" aria-pressed={tab === "team"} onClick={() => setTab("team")}>Team by day</button>
        </div>
      )}
      {tab === "mine" && me.employee && <Mine employeeId={me.employee.id} />}
      {tab === "mine" && !me.employee && (
        <Card><Empty icon="user" title="No employee profile linked" text="Ask an admin to link your account to an employee profile." /></Card>
      )}
      {tab === "team" && isManager && <Team />}
    </>
  );
}

function Mine({ employeeId }: { employeeId: number }) {
  const records = useApi<AttendanceRow[]>(`/api/attendance?employee_id=${employeeId}&from_date=${isoDaysAgo(60)}`);
  const { busy, run } = useAction();
  const [form, setForm] = useState({ date: today(), status: "present", check_in: "09:30", check_out: "18:00", notes: "" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const byDate = useMemo(() => new Map((records.data ?? []).map((r) => [r.date, r])), [records.data]);
  const todays = byDate.get(today());
  const last30 = (records.data ?? []).filter((r) => r.date >= isoDaysAgo(30));
  const worked = last30.filter((r) => r.work_hours);
  const avgHours = worked.length ? worked.reduce((s, r) => s + (r.work_hours ?? 0), 0) / worked.length : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const working = form.status !== "absent" && form.status !== "on_leave";
    const json = {
      date: form.date,
      status: form.status,
      check_in: working && form.check_in ? `${form.date}T${form.check_in}:00` : null,
      check_out: working && form.check_out ? `${form.date}T${form.check_out}:00` : null,
      notes: form.notes || null,
    };
    if (await run(() => api("/api/attendance", { method: "POST", json }), "Attendance marked")) void records.reload();
  }

  // Current month calendar
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday first

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Days logged (30d)" value={last30.length} icon="calendar" />
          <Stat label="Avg hours" value={avgHours ? avgHours.toFixed(1) : "—"} icon="clock" />
        </div>
        <Card title={todays ? "Today" : "Mark attendance"}>
          {todays && form.date === today() ? (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ok)_15%,transparent)] text-[var(--ok)]">
                <Icon name="check" />
              </span>
              <div className="flex-1">
                <p className="text-[15px] font-semibold">{label(todays.status)}</p>
                <p className="text-[12px] text-[var(--fg-2)]">
                  {fmtTime(todays.check_in)} – {fmtTime(todays.check_out)}
                  {todays.work_hours ? ` · ${todays.work_hours} h` : ""}
                </p>
              </div>
              <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => setForm((f) => ({ ...f, date: isoDaysAgo(1) }))}>
                Log another day
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Field label="Date"><input className={inputCls} type="date" max={today()} value={form.date} onChange={set("date")} /></Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={set("status")}>
                  {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </Field>
              {form.status !== "absent" && form.status !== "on_leave" && (
                <>
                  <Field label="Check in"><input className={inputCls} type="time" value={form.check_in} onChange={set("check_in")} /></Field>
                  <Field label="Check out"><input className={inputCls} type="time" value={form.check_out} onChange={set("check_out")} /></Field>
                </>
              )}
              <div className="sm:col-span-2"><Field label="Notes"><input className={inputCls} value={form.notes} onChange={set("notes")} placeholder="Optional" /></Field></div>
              {byDate.has(form.date) && <p className="text-[12px] text-[var(--bad)] sm:col-span-2">Already marked for {fmtDate(form.date)}.</p>}
              <button className="mac-btn-primary py-2.5 text-[14px] sm:col-span-2" disabled={busy || byDate.has(form.date)}>
                <Icon name="check" size={14} /> {busy ? "Saving…" : "Save attendance"}
              </button>
            </form>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-[var(--fg-3)]">{d}</span>)}
            {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const iso = new Date(now.getFullYear(), now.getMonth(), i + 1).toLocaleDateString("en-CA");
              const r = byDate.get(iso);
              return (
                <span
                  key={iso}
                  title={r ? `${fmtDate(iso)}: ${label(r.status)}` : fmtDate(iso)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[12px] ${iso === today() ? "ring-1 ring-[var(--fg)]" : ""} ${r ? "bg-[var(--card-soft)] font-medium" : "text-[var(--fg-3)]"}`}
                >
                  {i + 1}
                  {r && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-[var(--fg-3)]"}`} />}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--fg-2)]">
            {STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />{label(s)}</span>
            ))}
          </div>
        </Card>
        <Card title="Recent">
          {records.error && <ErrorNote message={records.error} onRetry={records.reload} />}
          {records.data?.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {records.data.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-24 shrink-0 font-medium">{fmtDate(r.date, false)}</span>
                  <span className="flex-1 text-[var(--fg-2)]">
                    {r.check_in ? `${fmtTime(r.check_in)} – ${fmtTime(r.check_out)}` : "—"}
                    {r.work_hours ? ` · ${r.work_hours} h` : ""}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : records.loading ? <Loading /> : <Empty icon="clock" title="No attendance yet" />}
        </Card>
      </div>
    </div>
  );
}

function Team() {
  const [date, setDate] = useState(today());
  const employees = useApi<{ employees: Employee[] }>("/api/employees?status=active&limit=500");
  const records = useApi<AttendanceRow[]>(`/api/attendance?from_date=${date}&to_date=${date}`);
  const byEmp = new Map((records.data ?? []).map((r) => [r.employee_id, r]));
  const list = employees.data?.employees ?? [];
  const counts = STATUSES.map((s) => [s, (records.data ?? []).filter((r) => r.status === s).length] as const);
  const notMarked = list.filter((e) => !byEmp.has(e.id)).length;

  return (
    <Card
      title="Team attendance"
      action={<input className={`${inputCls} !w-auto !py-1 !text-[12px]`} type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {counts.map(([s, n]) => (
          <span key={s} className="flex items-center gap-1.5 rounded-full bg-[var(--card-soft)] px-2.5 py-1 text-[12px]">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} /> {label(s)} <strong className="tabular-nums">{n}</strong>
          </span>
        ))}
        <span className="rounded-full bg-[var(--card-soft)] px-2.5 py-1 text-[12px]">Not marked <strong className="tabular-nums">{notMarked}</strong></span>
      </div>
      {employees.error && <ErrorNote message={employees.error} onRetry={employees.reload} />}
      {(employees.loading || records.loading) && !list.length ? (
        <Loading />
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {list.map((e) => {
            const r = byEmp.get(e.id);
            return (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <Avatar name={e.name} url={e.profile_picture} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{e.name}</p>
                  <p className="truncate text-[11px] text-[var(--fg-3)]">{e.department}</p>
                </div>
                <span className="hidden text-[12px] text-[var(--fg-2)] sm:block">{r?.check_in ? `${fmtTime(r.check_in)} – ${fmtTime(r.check_out)}` : ""}</span>
                {r ? <StatusBadge status={r.status} /> : <span className="text-[11px] text-[var(--fg-3)]">Not marked</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

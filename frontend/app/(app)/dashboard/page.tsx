"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { AiCard, Card, Empty, ErrorNote, Loading, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmtDate, label } from "@/lib/format";
import type { Dashboard, Leave, LeaveBalance } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { me, isManager } = useMe();
  const stats = useApi<Dashboard>("/api/analytics/dashboard");
  const pending = useApi<Leave[]>(isManager ? "/api/leaves?status=pending" : null);
  const myLeaves = useApi<Leave[]>(me.employee ? `/api/leaves?employee_id=${me.employee.id}` : null);
  const balance = useApi<LeaveBalance[]>(me.employee ? `/api/leaves/balance/${me.employee.id}?year=${new Date().getFullYear()}` : null);
  const [summary, setSummary] = useState<{ text?: string; loading: boolean; error?: string }>({ loading: false });
  const { run } = useAction();

  async function generateSummary() {
    setSummary({ loading: true });
    try {
      const res = await api<{ summary: string }>("/api/analytics/hr-summary");
      setSummary({ loading: false, text: res.summary });
    } catch (e) {
      setSummary({ loading: false, error: errorMessage(e) });
    }
  }

  async function decide(id: number, action: "approved" | "rejected") {
    if (await run(() => api(`/api/leaves/${id}/action`, { method: "PUT", json: { action } }), `Leave ${action}`)) {
      void pending.reload();
      void stats.reload();
    }
  }

  const firstName = me.full_name.split(" ")[0];
  const d = stats.data;
  const maxDept = Math.max(1, ...(d?.departments.map((x) => x.count) ?? [1]));

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            <Link href="/leave" className="mac-btn-outline px-3 py-1.5 text-[13px]">
              <Icon name="calendar" size={14} /> Apply leave
            </Link>
            <Link href="/attendance" className="mac-btn-outline px-3 py-1.5 text-[13px]">
              <Icon name="clock" size={14} /> Mark attendance
            </Link>
          </>
        }
      />

      {stats.error && <ErrorNote message={stats.error} onRetry={stats.reload} />}
      {stats.loading && !d && <Loading />}

      {d && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active employees" value={d.total_employees} icon="users" />
          <Stat label="Present today" value={d.present_today} icon="check" hint={d.total_employees ? `${Math.round((d.present_today / d.total_employees) * 100)}% of team` : undefined} />
          <Stat label="Pending leave" value={d.pending_leaves} icon="calendar" />
          <Stat label="Open positions" value={d.open_positions} icon="briefcase" hint={`${d.total_candidates} candidates`} />
        </div>
      )}

      <div className="masonry mt-4 columns-1 lg:columns-2">
        {isManager && (
          <AiCard title="AI HR summary" text={summary.text} loading={summary.loading} error={summary.error} onRun={generateSummary} empty="Gemini reads today's numbers and writes a short briefing for HR." />
        )}

        {isManager && (
          <Card title="Waiting for your approval" action={<Link href="/leave" className="text-[12px] text-[var(--fg-2)] hover:text-[var(--fg)]">See all</Link>}>
            {pending.loading && !pending.data ? (
              <Loading />
            ) : pending.data?.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {pending.data.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">{l.employee_name}</p>
                      <p className="text-[12px] text-[var(--fg-2)]">
                        {label(l.leave_type)} · {fmtDate(l.start_date, false)} – {fmtDate(l.end_date, false)}
                      </p>
                    </div>
                    <button className="mac-btn-primary px-2.5 py-1 text-[12px]" onClick={() => decide(l.id, "approved")}>
                      Approve
                    </button>
                    <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => decide(l.id, "rejected")}>
                      Reject
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="check" title="All caught up" text="No leave requests are waiting." />
            )}
          </Card>
        )}

        {d && (
          <Card title="Team by department">
            <ul className="space-y-2.5">
              {d.departments.map((dept) => (
                <li key={dept.name}>
                  <div className="flex justify-between text-[13px]">
                    <span>{dept.name}</span>
                    <span className="tabular-nums text-[var(--fg-2)]">{dept.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--card-soft)]">
                    <div className="h-full rounded-full bar-accent" style={{ width: `${(dept.count / maxDept) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {me.employee && (
          <Card title="My leave balance">
            {balance.data?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {balance.data.map((b) => (
                  <div key={b.leave_type} className="rounded-xl bg-[var(--card-soft)] p-3">
                    <p className="text-[12px] text-[var(--fg-2)]">{label(b.leave_type)}</p>
                    <p className="font-display text-[22px] font-semibold tabular-nums">{b.remaining_days}</p>
                    <p className="text-[11px] text-[var(--fg-3)]">of {b.total_days} days</p>
                  </div>
                ))}
              </div>
            ) : balance.loading ? (
              <Loading />
            ) : (
              <p className="text-[13px] text-[var(--fg-2)]">No balance set up for this year.</p>
            )}
          </Card>
        )}

        {me.employee && (
          <Card title="My recent leave">
            {myLeaves.data?.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {myLeaves.data.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                    <span>
                      {label(l.leave_type)} · {fmtDate(l.start_date, false)} – {fmtDate(l.end_date, false)}
                    </span>
                    <StatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="calendar" title="No leave yet" text="Requests you make will show up here." />
            )}
          </Card>
        )}

        <Card title="Need something?">
          <div className="grid gap-2">
            {[
              ["How many casual leaves do I get?", "message"],
              ["What is the work from home policy?", "home"],
              ["What is the notice period?", "doc"],
            ].map(([q, icon]) => (
              <Link key={q} href={`/chat?q=${encodeURIComponent(q)}`} className="flex items-center gap-2.5 rounded-xl bg-[var(--card-soft)] px-3 py-2.5 text-[13px] hover:bg-[var(--hover)]">
                <Icon name={icon as "message"} size={15} className="text-[var(--fg-2)]" />
                {q}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

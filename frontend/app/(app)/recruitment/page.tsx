"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Empty, ErrorNote, Loading, PageHeader, StatusBadge } from "@/components/ui";
import { useApi } from "@/lib/api";
import { fmtDate, inr, label } from "@/lib/format";
import type { Job } from "@/lib/types";
import JobForm from "./JobForm";

const STATUSES = ["all", "open", "draft", "on_hold", "closed"];

export default function RecruitmentPage() {
  const jobs = useApi<Job[]>("/api/jobs");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);

  const list = (jobs.data ?? []).filter((j) => status === "all" || j.status === status);
  const count = (s: string) => (jobs.data ?? []).filter((j) => s === "all" || j.status === s).length;

  return (
    <>
      <PageHeader
        title="Recruitment"
        subtitle="Job openings and their candidate pipelines"
        actions={
          <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} /> New job
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button key={s} className="mac-chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : label(s)} <span className="ml-1 opacity-60">{count(s)}</span>
          </button>
        ))}
      </div>

      {jobs.error && <ErrorNote message={jobs.error} onRetry={jobs.reload} />}
      {jobs.loading && !jobs.data && <Loading />}
      {jobs.data && !list.length && <Empty icon="briefcase" title="No jobs here" text="Create a job to start collecting candidates." />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((j) => (
          <Link key={j.id} href={`/recruitment/${j.id}`} className="mac-card flex flex-col p-4 transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[16px] font-semibold leading-snug">{j.title}</p>
              <StatusBadge status={j.status} />
            </div>
            <p className="mt-1 text-[12px] text-[var(--fg-2)]">
              {[j.department, j.location, label(j.employment_type)].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-3 line-clamp-2 text-[13px] text-[var(--fg-2)]">{j.description}</p>
            <div className="mt-auto flex items-center justify-between pt-4 text-[12px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon name="users" size={14} /> {j.candidate_count} candidate{j.candidate_count === 1 ? "" : "s"}
              </span>
              <span className="text-[var(--fg-3)]">
                {j.salary_min || j.salary_max ? `${inr(j.salary_min)} – ${inr(j.salary_max)}` : j.closing_date ? `Closes ${fmtDate(j.closing_date, false)}` : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {creating && <JobForm onClose={() => setCreating(false)} onSaved={() => jobs.reload()} />}
    </>
  );
}

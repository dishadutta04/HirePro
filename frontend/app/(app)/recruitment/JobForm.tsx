"use client";

import { FormEvent, useState } from "react";
import { useAction } from "@/components/AppShell";
import { Field, Modal, inputCls } from "@/components/ui";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";

/** Create a job, or edit one when `job` is given (the backend's PUT takes the full job). */
export default function JobForm({ job, onClose, onSaved }: { job?: Job; onClose: () => void; onSaved: (j: Job) => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    title: job?.title ?? "",
    description: job?.description ?? "",
    requirements: job?.requirements ?? "",
    department: job?.department ?? "",
    location: job?.location ?? "",
    employment_type: job?.employment_type ?? "full-time",
    salary_min: job?.salary_min?.toString() ?? "",
    salary_max: job?.salary_max?.toString() ?? "",
    status: job?.status ?? "open",
    closing_date: job?.closing_date ?? "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      closing_date: form.closing_date || null,
    };
    let saved: Job | undefined;
    const ok = await run(async () => {
      saved = await api<Job>(job ? `/api/jobs/${job.id}` : "/api/jobs", { method: job ? "PUT" : "POST", json: body });
    }, job ? "Job updated" : "Job created");
    if (ok && saved) {
      onSaved(saved);
      onClose();
    }
  }

  return (
    <Modal
      open
      title={job ? "Edit job" : "New job"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="job-form" disabled={busy}>{busy ? "Saving…" : "Save job"}</button>
        </>
      }
    >
      <form id="job-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title"><input className={inputCls} required value={form.title} onChange={set("title")} /></Field></div>
        <Field label="Department"><input className={inputCls} value={form.department} onChange={set("department")} /></Field>
        <Field label="Location"><input className={inputCls} placeholder="Bengaluru / Remote" value={form.location} onChange={set("location")} /></Field>
        <Field label="Employment type">
          <select className={inputCls} value={form.employment_type} onChange={set("employment_type")}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={set("status")}>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="on_hold">On hold</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Salary from (₹ / month)"><input className={inputCls} type="number" min={0} value={form.salary_min} onChange={set("salary_min")} /></Field>
        <Field label="Salary to (₹ / month)"><input className={inputCls} type="number" min={0} value={form.salary_max} onChange={set("salary_max")} /></Field>
        <Field label="Closing date"><input className={inputCls} type="date" value={form.closing_date} onChange={set("closing_date")} /></Field>
        <div className="sm:col-span-2"><Field label="Description"><textarea className={`${inputCls} h-24 resize-y`} required value={form.description} onChange={set("description")} /></Field></div>
        <div className="sm:col-span-2">
          <Field label="Requirements" hint="Gemini scores resumes against the description and these requirements.">
            <textarea className={`${inputCls} h-24 resize-y`} value={form.requirements} onChange={set("requirements")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

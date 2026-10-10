"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useAction } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { AiCard, Avatar, Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, StatusBadge, inputCls } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import type { Employee } from "@/lib/types";

const EMPTY_FORM = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  date_of_joining: "",
  employment_type: "full-time",
  salary: "",
  skills: "",
};

export default function EmployeesPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ total: number; employees: Employee[] }>("/api/employees?limit=500");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("active");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupes, setDupes] = useState<{ open: boolean; loading: boolean; text?: string; error?: string }>({ open: false, loading: false });
  const { busy, run } = useAction();

  const employees = data?.employees ?? [];
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[], [employees]);
  const shown = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    return (
      (!dept || e.department === dept) &&
      (status === "all" || e.status === status) &&
      (!q || [e.name, e.email, e.designation, e.employee_code, e.skills].some((v) => v?.toLowerCase().includes(q)))
    );
  });

  async function create(e: FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      salary: Number(form.salary) || 0,
      date_of_joining: form.date_of_joining || null,
      phone: form.phone || null,
    };
    let created: Employee | undefined;
    const ok = await run(async () => {
      created = await api<Employee>("/api/employees", { method: "POST", json: body });
    }, "Employee added");
    if (ok && created) {
      setAdding(false);
      setForm(EMPTY_FORM);
      router.push(`/employees/${created.id}`);
    }
  }

  async function findDuplicates() {
    setDupes({ open: true, loading: true });
    try {
      const res = await api<{ analysis: string }>("/api/employees/ai/detect-duplicates");
      setDupes({ open: true, loading: false, text: res.analysis });
    } catch (e) {
      setDupes({ open: true, loading: false, error: errorMessage(e) });
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} people in the directory` : undefined}
        actions={
          <>
            <button className="mac-btn-outline px-3 py-1.5 text-[13px]" onClick={findDuplicates}>
              <Icon name="sparkle" size={14} /> Check data quality
            </button>
            <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} /> Add employee
            </button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
            <input className={`${inputCls} !pl-9`} placeholder="Search name, email, skill, code…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button className="mac-chip" aria-pressed={dept === null} onClick={() => setDept(null)}>
            All departments
          </button>
          {departments.map((d) => (
            <button key={d} className="mac-chip" aria-pressed={dept === d} onClick={() => setDept(d)}>
              {d}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        {error && <ErrorNote message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
        {data && !shown.length && <Empty icon="users" title="No one matches" text="Try a different search or filter." />}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e) => (
            <Link key={e.id} href={`/employees/${e.id}`} className="mac-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
              <Avatar name={e.name} url={e.profile_picture} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{e.name}</p>
                <p className="truncate text-[12px] text-[var(--fg-2)]">{e.designation ?? "—"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                  {e.employee_code} · {e.department ?? "Unassigned"}
                </p>
              </div>
              <StatusBadge status={e.status} />
            </Link>
          ))}
        </div>
      </div>

      <Modal
        open={adding}
        title="Add employee"
        onClose={() => setAdding(false)}
        wide
        footer={
          <>
            <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className="mac-btn-primary px-4 py-2 text-[13px]" form="add-employee" disabled={busy}>
              {busy ? "Saving…" : "Add employee"}
            </button>
          </>
        }
      >
        <form id="add-employee" onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <Field label="First name"><input className={inputCls} required value={form.first_name} onChange={set("first_name")} /></Field>
          <Field label="Last name"><input className={inputCls} required value={form.last_name} onChange={set("last_name")} /></Field>
          <Field label="Work email"><input className={inputCls} type="email" required value={form.email} onChange={set("email")} /></Field>
          <Field label="Employee code"><input className={inputCls} required placeholder="EMP012" value={form.employee_code} onChange={set("employee_code")} /></Field>
          <Field label="Designation"><input className={inputCls} value={form.designation} onChange={set("designation")} /></Field>
          <Field label="Department">
            <input className={inputCls} list="departments" value={form.department} onChange={set("department")} />
            <datalist id="departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Date of joining"><input className={inputCls} type="date" value={form.date_of_joining} onChange={set("date_of_joining")} /></Field>
          <Field label="Employment type">
            <select className={inputCls} value={form.employment_type} onChange={set("employment_type")}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </Field>
          <Field label="Monthly salary (₹)"><input className={inputCls} type="number" min={0} value={form.salary} onChange={set("salary")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Skills" hint="Comma separated, e.g. Python, React, SQL"><input className={inputCls} value={form.skills} onChange={set("skills")} /></Field>
          </div>
        </form>
      </Modal>

      <Modal open={dupes.open} title="Data quality check" onClose={() => setDupes({ open: false, loading: false })} wide>
        <AiCard title="Duplicates & incomplete profiles" text={dupes.text} loading={dupes.loading} error={dupes.error} onRun={findDuplicates} />
      </Modal>
    </>
  );
}

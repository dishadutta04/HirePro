"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, Stat, StatusBadge, inputCls } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { MONTHS, inr } from "@/lib/format";
import type { Employee, Payroll } from "@/lib/types";

const period = (p: Payroll) => `${MONTHS[p.month - 1]} ${p.year}`;

export default function PayrollPage() {
  const { me, isAdmin } = useMe();
  // Only admins run payroll; everyone else (managers included) sees just their own payslips.
  const path = isAdmin ? "/api/payroll" : me.employee ? `/api/payroll?employee_id=${me.employee.id}` : null;
  const records = useApi<Payroll[]>(path);
  const { run } = useAction();
  const [slip, setSlip] = useState<Payroll | null>(null);
  const [creating, setCreating] = useState(false);
  const [periodKey, setPeriodKey] = useState("all");

  const periods = useMemo(() => [...new Set((records.data ?? []).map((p) => `${p.year}-${p.month}`))], [records.data]);
  const shown = (records.data ?? []).filter((p) => periodKey === "all" || `${p.year}-${p.month}` === periodKey);
  const totals = shown.reduce((t, p) => ({ gross: t.gross + p.gross_salary, net: t.net + p.net_salary, tax: t.tax + p.tax_deduction }), { gross: 0, net: 0, tax: 0 });

  async function advance(p: Payroll) {
    const next = p.status === "draft" ? "process" : "pay";
    if (await run(() => api(`/api/payroll/${p.id}/${next}`, { method: "PUT" }), next === "process" ? "Payroll processed" : "Marked as paid")) {
      void records.reload();
    }
  }

  if (!path) {
    return (
      <>
        <PageHeader title="Payroll" />
        <Card><Empty icon="wallet" title="No employee profile linked" text="Payslips appear once your account is linked to an employee profile." /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? "Payroll" : "My payslips"}
        subtitle={isAdmin ? "Monthly salary records, from draft to paid" : "Your monthly salary breakdown"}
        actions={
          isAdmin && (
            <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setCreating(true)}>
              <Icon name="plus" size={14} /> New record
            </button>
          )
        }
      />

      {records.error && <ErrorNote message={records.error} onRetry={records.reload} />}
      {records.loading && !records.data && <Loading />}

      {records.data && (
        <>
          {isAdmin && (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                <button className="mac-chip" aria-pressed={periodKey === "all"} onClick={() => setPeriodKey("all")}>All periods</button>
                {periods.map((k) => {
                  const [y, m] = k.split("-").map(Number);
                  return (
                    <button key={k} className="mac-chip" aria-pressed={periodKey === k} onClick={() => setPeriodKey(k)}>
                      {MONTHS[m - 1]} {y}
                    </button>
                  );
                })}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Records" value={shown.length} icon="doc" />
                <Stat label="Gross" value={inr(totals.gross)} icon="wallet" />
                <Stat label="Tax withheld" value={inr(totals.tax)} icon="shield" />
                <Stat label="Net payout" value={inr(totals.net)} icon="check" />
              </div>
            </>
          )}

          {!shown.length ? (
            <Card><Empty icon="wallet" title="No payroll records" /></Card>
          ) : isAdmin ? (
            <section className="mac-card overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-wide text-[var(--fg-3)]">
                    <th className="px-4 py-2.5 font-semibold">Employee</th>
                    <th className="px-4 py-2.5 font-semibold">Period</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Gross</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Deductions</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--hover)]">
                      <td className="px-4 py-2.5">
                        <button className="font-medium hover:underline" onClick={() => setSlip(p)}>{p.employee_name}</button>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--fg-2)]">{period(p)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{inr(p.gross_salary)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--fg-2)]">{inr(p.tax_deduction + p.pf_deduction + p.other_deductions)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{inr(p.net_salary)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5 text-right">
                        {p.status !== "paid" && (
                          <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => advance(p)}>
                            {p.status === "draft" ? "Process" : "Mark paid"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <button key={p.id} className="mac-card p-4 text-left transition hover:-translate-y-0.5" onClick={() => setSlip(p)}>
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold">{period(p)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-3 font-display text-[26px] font-semibold tabular-nums">{inr(p.net_salary)}</p>
                  <p className="text-[12px] text-[var(--fg-2)]">net · {inr(p.gross_salary)} gross</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {slip && <Payslip p={slip} onClose={() => setSlip(null)} />}
      {creating && <NewRecord onClose={() => setCreating(false)} onDone={records.reload} />}
    </>
  );
}

function Payslip({ p, onClose }: { p: Payroll; onClose: () => void }) {
  const earnings: [string, number][] = [["Basic", p.basic_salary], ["HRA", p.hra], ["Transport", p.transport_allowance], ["Other allowances", p.other_allowances]];
  const deductions: [string, number][] = [["Income tax", p.tax_deduction], ["Provident fund", p.pf_deduction], ["Other", p.other_deductions]];
  const lines = (rows: [string, number][]) =>
    rows.map(([k, v]) => (
      <div key={k} className="flex justify-between py-1 text-[13px]">
        <span className="text-[var(--fg-2)]">{k}</span>
        <span className="tabular-nums">{inr(v)}</span>
      </div>
    ));
  return (
    <Modal
      open
      title={`Payslip · ${period(p)}`}
      onClose={onClose}
      footer={
        <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={() => window.print()}>
          <Icon name="doc" size={14} /> Print
        </button>
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[16px] font-semibold">{p.employee_name}</p>
          <p className="text-[12px] text-[var(--fg-2)]">{period(p)}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mac-label">Earnings</p>
          <div className="mt-1 divide-y divide-[var(--line)]">{lines(earnings)}</div>
          <div className="mt-1 flex justify-between border-t border-[var(--line-strong)] pt-1.5 text-[13px] font-semibold">
            <span>Gross</span><span className="tabular-nums">{inr(p.gross_salary)}</span>
          </div>
        </div>
        <div>
          <p className="mac-label">Deductions</p>
          <div className="mt-1 divide-y divide-[var(--line)]">{lines(deductions)}</div>
          <div className="mt-1 flex justify-between border-t border-[var(--line-strong)] pt-1.5 text-[13px] font-semibold">
            <span>Total</span><span className="tabular-nums">{inr(p.tax_deduction + p.pf_deduction + p.other_deductions)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--card-soft)] p-4">
        <span className="text-[14px] font-medium">Net pay</span>
        <span className="font-display text-[26px] font-semibold tabular-nums">{inr(p.net_salary)}</span>
      </div>
    </Modal>
  );
}

function NewRecord({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const employees = useApi<{ employees: Employee[] }>("/api/employees?status=active&limit=500");
  const { busy, run } = useAction();
  const now = new Date();
  const [form, setForm] = useState({
    employee_id: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    basic_salary: "",
    hra: "",
    transport_allowance: "3000",
    other_allowances: "",
    tax_deduction: "",
    pf_deduction: "",
    other_deductions: "500",
  });
  const n = (k: keyof typeof form) => Number(form[k]) || 0;
  const gross = n("basic_salary") + n("hra") + n("transport_allowance") + n("other_allowances");
  const net = gross - n("tax_deduction") - n("pf_deduction") - n("other_deductions");

  // Picking someone fills the same split the seed data uses: HRA 20%, other 10%, PF 12% of basic, tax 10% of gross.
  function pick(id: string) {
    const emp = employees.data?.employees.find((e) => String(e.id) === id);
    const basic = emp?.salary ?? 0;
    const g = basic * 1.3 + 3000;
    setForm((f) => ({
      ...f,
      employee_id: id,
      basic_salary: String(basic),
      hra: String(Math.round(basic * 0.2)),
      other_allowances: String(Math.round(basic * 0.1)),
      pf_deduction: String(Math.round(basic * 0.12)),
      tax_deduction: String(Math.round(g * 0.1)),
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const json = Object.fromEntries(Object.keys(form).map((k) => [k, Number(form[k as keyof typeof form]) || 0]));
    if (await run(() => api("/api/payroll", { method: "POST", json }), "Payroll record created")) {
      onDone();
      onClose();
    }
  }

  const money = (k: keyof typeof form, text: string) => (
    <Field label={text}><input className={inputCls} type="number" min={0} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></Field>
  );

  return (
    <Modal
      open
      title="New payroll record"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="new-payroll" disabled={busy || !form.employee_id}>Create (draft)</button>
        </>
      }
    >
      <form id="new-payroll" onSubmit={save} className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Employee">
            <select className={inputCls} required value={form.employee_id} onChange={(e) => pick(e.target.value)}>
              <option value="">Choose…</option>
              {employees.data?.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {inr(e.salary)}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Month">
          <select className={inputCls} value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Year"><input className={inputCls} type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} /></Field>
        <div />
        {money("basic_salary", "Basic")}
        {money("hra", "HRA")}
        {money("transport_allowance", "Transport")}
        {money("other_allowances", "Other allowances")}
        {money("tax_deduction", "Income tax")}
        {money("pf_deduction", "Provident fund")}
        {money("other_deductions", "Other deductions")}
        <div className="flex items-center justify-between rounded-xl bg-[var(--card-soft)] p-3 sm:col-span-3">
          <span className="text-[13px] text-[var(--fg-2)]">Gross {inr(gross)}</span>
          <span className="text-[15px] font-semibold">Net {inr(net)}</span>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Avatar, Badge, Card, Empty, ErrorNote, Field, Loading, Modal, PageHeader, inputCls } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { label } from "@/lib/format";
import type { AppUser, Employee, Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "manager", "hr", "employee"];

const ROLE_HELP: Record<Role, string> = {
  admin: "Everything, including payroll and user management",
  manager: "Approves leave, runs hiring and reviews",
  hr: "Self-service access (same as employee for now)",
  employee: "Own profile, leave, attendance, payslips",
};

export default function UsersPage() {
  const { me } = useMe();
  const users = useApi<AppUser[]>("/api/users");
  const employees = useApi<{ employees: Employee[] }>("/api/employees?limit=500");
  const { run } = useAction();
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState("");

  const empList = employees.data?.employees ?? [];
  const empName = (id: number | null) => empList.find((e) => e.id === id)?.name;
  const shown = (users.data ?? []).filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const patch = (id: number, p: Partial<AppUser>) => users.setData((cur) => cur?.map((u) => (u.id === id ? { ...u, ...p } : u)));

  async function setRole(u: AppUser, role: Role) {
    if (await run(() => api(`/api/users/${u.id}/role?role=${role}`, { method: "PUT" }), `${u.full_name} is now ${label(role)}`)) patch(u.id, { role });
  }
  async function setActive(u: AppUser, active: boolean) {
    if (!active && !confirm(`Deactivate ${u.full_name}? They won't be able to use HireFlow.`)) return;
    if (await run(() => api(`/api/users/${u.id}/${active ? "activate" : "deactivate"}`, { method: "PUT" }), active ? "Account reactivated" : "Account deactivated")) {
      patch(u.id, { is_active: active });
    }
  }
  async function link(u: AppUser, employeeId: string) {
    if (!employeeId) return;
    if (await run(() => api(`/api/users/${u.id}/link-employee/${employeeId}`, { method: "PUT" }), "Linked to employee profile")) {
      patch(u.id, { employee_id: Number(employeeId) });
    }
  }

  return (
    <>
      <PageHeader
        title="Users & roles"
        subtitle="Who can sign in, and what they can see"
        actions={
          <button className="mac-btn-primary px-3 py-1.5 text-[13px]" onClick={() => setInviting(true)}>
            <Icon name="mail" size={14} /> Invite user
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="mac-card p-3">
            <p className="flex items-center justify-between text-[13px] font-semibold">
              {label(r)} <span className="tabular-nums text-[var(--fg-2)]">{(users.data ?? []).filter((u) => u.role === r).length}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-2)]">{ROLE_HELP[r]}</p>
          </div>
        ))}
      </div>

      <Card
        action={
          <div className="relative w-full max-w-[260px]">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
            <input className={`${inputCls} !py-1.5 !pl-8 !text-[13px]`} placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
        title={`${users.data?.length ?? 0} accounts`}
      >
        {users.error && <ErrorNote message={users.error} onRetry={users.reload} />}
        {users.loading && !users.data ? (
          <Loading />
        ) : shown.length ? (
          <ul className="divide-y divide-[var(--line)]">
            {shown.map((u) => (
              <li key={u.id} className={`flex flex-wrap items-center gap-3 py-3 ${u.is_active ? "" : "opacity-55"}`}>
                <Avatar name={u.full_name} size={34} />
                <div className="min-w-[180px] flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-medium">
                    {u.full_name}
                    {u.id === me.id && <Badge>You</Badge>}
                    {!u.is_active && <Badge tone="bad">Deactivated</Badge>}
                  </p>
                  <p className="text-[12px] text-[var(--fg-2)]">{u.email}</p>
                </div>
                <select
                  className={`${inputCls} !w-[200px] !py-1.5 !text-[12px]`}
                  value={u.employee_id ?? ""}
                  onChange={(e) => link(u, e.target.value)}
                  aria-label="Employee profile"
                >
                  <option value="">{u.employee_id ? empName(u.employee_id) : "Link employee profile…"}</option>
                  {empList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select
                  className={`${inputCls} !w-[120px] !py-1.5 !text-[12px]`}
                  value={u.role}
                  onChange={(e) => setRole(u, e.target.value as Role)}
                  disabled={u.id === me.id}
                  aria-label="Role"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                </select>
                {u.id !== me.id && (
                  <button className="mac-btn-outline px-2.5 py-1.5 text-[12px]" onClick={() => setActive(u, !u.is_active)}>
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="users" title="No users found" />
        )}
      </Card>

      {inviting && <InviteModal employees={empList} onClose={() => setInviting(false)} onDone={users.reload} />}
    </>
  );
}

function InviteModal({ employees, onClose, onDone }: { employees: Employee[]; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ email: "", full_name: "", role: "employee" as Role, employee_id: "" });

  function pickEmployee(id: string) {
    const e = employees.find((x) => String(x.id) === id);
    setForm((f) => ({ ...f, employee_id: id, ...(e ? { email: e.email, full_name: e.name } : {}) }));
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    const json = { ...form, employee_id: form.employee_id ? Number(form.employee_id) : null };
    if (await run(() => api("/api/users/invite", { method: "POST", json }), `Invite sent to ${form.email}`)) {
      onDone();
      onClose();
    }
  }

  return (
    <Modal
      open
      title="Invite user"
      onClose={onClose}
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="invite" disabled={busy}>
            <Icon name="send" size={14} /> {busy ? "Sending…" : "Send invite"}
          </button>
        </>
      }
    >
      <form id="invite" onSubmit={invite} className="space-y-3">
        <Field label="Employee profile" hint="Pick one to fill in the name and email, and to link the account.">
          <select className={inputCls} value={form.employee_id} onChange={(e) => pickEmployee(e.target.value)}>
            <option value="">None</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.email}</option>)}
          </select>
        </Field>
        <Field label="Full name"><input className={inputCls} required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></Field>
        <Field label="Email"><input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Role" group>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button type="button" key={r} className="mac-chip" aria-pressed={form.role === r} onClick={() => setForm((f) => ({ ...f, role: r }))}>{label(r)}</button>
            ))}
          </div>
        </Field>
        <p className="rounded-xl bg-[var(--card-soft)] p-3 text-[12px] text-[var(--fg-2)]">
          Supabase emails them a link. They set a password, then sign in with this email. {ROLE_HELP[form.role]}.
        </p>
      </form>
    </Modal>
  );
}

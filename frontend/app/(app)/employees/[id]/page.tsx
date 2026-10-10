"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { useAction, useMe } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Avatar, Card, Empty, ErrorNote, Field, Loading, Modal, RichText, StatusBadge, inputCls } from "@/components/ui";
import { api, fileUrl, useApi } from "@/lib/api";
import { fmtDate, inr, label } from "@/lib/format";
import type { DocumentRow, Employee, LeaveBalance } from "@/lib/types";

const DOC_TYPES = ["id_proof", "offer_letter", "resume", "other"];

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me, isManager, isAdmin } = useMe();
  const emp = useApi<Employee>(`/api/employees/${id}`);
  const docs = useApi<DocumentRow[]>(`/api/documents?employee_id=${id}`);
  const balance = useApi<LeaveBalance[]>(`/api/leaves/balance/${id}?year=${new Date().getFullYear()}`);
  const { busy, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const isSelf = me.employee?.id === Number(id);
  const canEdit = isManager;
  const canSelfServe = isManager || isSelf;

  if (emp.error) return <ErrorNote message={emp.error} onRetry={emp.reload} />;
  if (!emp.data) return <Loading />;
  const e = emp.data;

  async function generateBio() {
    setBioBusy(true);
    await run(async () => {
      const res = await api<{ bio: string }>(`/api/employees/${id}/generate-bio`, { method: "POST" });
      emp.setData((cur) => cur && { ...cur, bio: res.bio });
    }, "Bio written by Gemini");
    setBioBusy(false);
  }

  async function uploadPhoto(file: File) {
    const body = new FormData();
    body.append("file", file);
    await run(async () => {
      const res = await api<{ image_url: string }>(`/api/employees/${id}/upload-image`, { method: "POST", body });
      emp.setData((cur) => cur && { ...cur, profile_picture: res.image_url });
    }, "Photo updated");
  }

  async function remove() {
    if (!confirm(`Delete ${e.name}? This can't be undone.`)) return;
    if (await run(() => api(`/api/employees/${id}`, { method: "DELETE" }), "Employee deleted")) router.replace("/employees");
  }

  async function deleteDoc(docId: number) {
    if (!confirm("Delete this document?")) return;
    if (await run(() => api(`/api/documents/${docId}`, { method: "DELETE" }), "Document deleted")) void docs.reload();
  }

  const details: [string, string][] = [
    ["Email", e.email],
    ["Phone", e.phone ?? "—"],
    ["Department", e.department ?? "—"],
    ["Employment", label(e.employment_type)],
    ["Joined", fmtDate(e.date_of_joining)],
    ["Date of birth", fmtDate(e.date_of_birth)],
    ["Gender", label(e.gender)],
    ["Address", e.address ?? "—"],
  ];

  return (
    <>
      {isManager && (
        <Link href="/employees" className="mac-btn mb-3 -ml-2 text-[13px] text-[var(--fg-2)]">
          <Icon name="back" size={14} /> Employees
        </Link>
      )}

      <section className="mac-card flex flex-wrap items-center gap-4 p-5">
        <div className="relative">
          <Avatar name={e.name} url={e.profile_picture} size={76} />
          {canSelfServe && (
            <>
              <button
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shadow-[var(--shadow-card)]"
                onClick={() => photoRef.current?.click()}
                title="Change photo"
                aria-label="Change photo"
              >
                <Icon name="upload" size={13} />
              </button>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={(ev) => ev.target.files?.[0] && uploadPhoto(ev.target.files[0])} />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[26px] font-semibold tracking-tight">{e.name}</h1>
            <StatusBadge status={e.status} />
          </div>
          <p className="text-[14px] text-[var(--fg-2)]">
            {e.designation ?? "—"} · {e.department ?? "Unassigned"}
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-3)]">
            {e.employee_code}
            {e.manager_name && ` · Reports to ${e.manager_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button className="mac-btn-outline px-3 py-1.5 text-[13px]" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Edit
            </button>
          )}
          {isAdmin && (
            <button className="mac-btn-outline px-3 py-1.5 text-[13px] text-[var(--bad)]" onClick={remove} disabled={busy}>
              <Icon name="trash" size={14} /> Delete
            </button>
          )}
        </div>
      </section>

      <div className="masonry mt-4 columns-1 lg:columns-2">
        <Card title="Details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            {details.map(([k, v]) => (
              <div key={k} className={k === "Address" || k === "Email" ? "col-span-2" : ""}>
                <dt className="text-[var(--fg-3)]">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
            {canEdit && (
              <div>
                <dt className="text-[var(--fg-3)]">Monthly salary</dt>
                <dd className="font-medium">{inr(e.salary)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card
          title="About"
          action={
            canSelfServe && (
              <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={generateBio} disabled={bioBusy}>
                <Icon name="sparkle" size={13} /> {bioBusy ? "Writing…" : e.bio ? "Rewrite with AI" : "Write with AI"}
              </button>
            )
          }
        >
          {e.bio ? <RichText text={e.bio} /> : <p className="text-[13px] text-[var(--fg-2)]">No bio yet.</p>}
          {e.skills && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {e.skills.split(",").map((s) => (
                <span key={s} className="rounded-full bg-[var(--card-soft)] px-2.5 py-1 text-[12px]">
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Leave balance ${new Date().getFullYear()}`}>
          {balance.data?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {balance.data.map((b) => (
                <div key={b.leave_type} className="rounded-xl bg-[var(--card-soft)] p-3">
                  <p className="text-[12px] text-[var(--fg-2)]">{label(b.leave_type)}</p>
                  <p className="font-display text-[22px] font-semibold tabular-nums">{b.remaining_days}</p>
                  <p className="text-[11px] text-[var(--fg-3)]">{b.used_days} used of {b.total_days}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[var(--fg-2)]">No balance for this year.</p>
          )}
        </Card>

        <Card
          title="Documents"
          action={
            canSelfServe && (
              <button className="mac-btn-outline px-2.5 py-1 text-[12px]" onClick={() => setUploading(true)}>
                <Icon name="upload" size={13} /> Upload
              </button>
            )
          }
        >
          {docs.data?.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {docs.data.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2">
                  <Icon name="doc" size={16} className="shrink-0 text-[var(--fg-2)]" />
                  <a href={fileUrl(d.file_url)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-[13px] font-medium">{d.document_name}</p>
                    <p className="text-[11px] text-[var(--fg-3)]">
                      {label(d.document_type)} · {fmtDate(d.uploaded_at)}
                    </p>
                  </a>
                  {isManager && (
                    <button className="mac-btn !p-1 text-[var(--fg-3)]" onClick={() => deleteDoc(d.id)} aria-label="Delete document">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="folder" title="No documents" text="ID proofs, offer letters and other files will appear here." />
          )}
        </Card>
      </div>

      {editing && <EditModal employee={e} onClose={() => setEditing(false)} onSaved={(u) => emp.setData(u)} />}
      {uploading && <UploadModal employeeId={e.id} onClose={() => setUploading(false)} onDone={docs.reload} />}
    </>
  );
}

function EditModal({ employee, onClose, onSaved }: { employee: Employee; onClose: () => void; onSaved: (e: Employee) => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    first_name: employee.first_name,
    last_name: employee.last_name,
    phone: employee.phone ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    salary: String(employee.salary ?? ""),
    skills: employee.skills ?? "",
    address: employee.address ?? "",
    gender: employee.gender ?? "",
    status: employee.status,
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    let updated: Employee | undefined;
    const ok = await run(async () => {
      updated = await api<Employee>(`/api/employees/${employee.id}`, {
        method: "PUT",
        json: { ...form, salary: Number(form.salary) || 0, gender: form.gender || null },
      });
    }, "Profile saved");
    if (ok && updated) {
      onSaved(updated);
      onClose();
    }
  }

  return (
    <Modal
      open
      title={`Edit ${employee.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="edit-employee" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="edit-employee" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="First name"><input className={inputCls} required value={form.first_name} onChange={set("first_name")} /></Field>
        <Field label="Last name"><input className={inputCls} required value={form.last_name} onChange={set("last_name")} /></Field>
        <Field label="Designation"><input className={inputCls} value={form.designation} onChange={set("designation")} /></Field>
        <Field label="Department"><input className={inputCls} value={form.department} onChange={set("department")} /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Monthly salary (₹)"><input className={inputCls} type="number" min={0} value={form.salary} onChange={set("salary")} /></Field>
        <Field label="Gender">
          <select className={inputCls} value={form.gender} onChange={set("gender")}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Skills"><input className={inputCls} value={form.skills} onChange={set("skills")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Address"><textarea className={`${inputCls} h-20 resize-none`} value={form.address} onChange={set("address")} /></Field></div>
      </form>
    </Modal>
  );
}

function UploadModal({ employeeId, onClose, onDone }: { employeeId: number; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("id_proof");

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("document_name", name || file.name);
    body.append("document_type", type);
    body.append("employee_id", String(employeeId));
    if (await run(() => api("/api/documents", { method: "POST", body }), "Document uploaded")) {
      onDone();
      onClose();
    }
  }

  return (
    <Modal
      open
      title="Upload document"
      onClose={onClose}
      footer={
        <>
          <button className="mac-btn-outline px-4 py-2 text-[13px]" onClick={onClose}>Cancel</button>
          <button className="mac-btn-primary px-4 py-2 text-[13px]" form="upload-doc" disabled={busy || !file}>{busy ? "Uploading…" : "Upload"}</button>
        </>
      }
    >
      <form id="upload-doc" onSubmit={upload} className="space-y-3">
        <Field label="File"><input className={inputCls} type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Name"><input className={inputCls} placeholder={file?.name ?? "e.g. Aadhaar card"} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Type">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

/** Calls the FastAPI backend with the signed-in user's Supabase access token. */
export async function api<T = unknown>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the HireFlow server. Is the backend running?");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
    throw new ApiError(res.status, errorText(body.detail) ?? `Server error (${res.status})`);
  }
  return (await res.json()) as T;
}

function errorText(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors: [{ loc: [...], msg: "..." }]
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => `${d.loc?.slice(1).join(".") ?? ""} ${d.msg ?? ""}`.trim())
      .join("; ");
  }
  return undefined;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** GET a path and keep the result in state. Pass null to skip (e.g. while an id isn't known yet). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(path !== null);

  const reload = useCallback(async () => {
    if (path === null) return;
    setLoading(true);
    setError(undefined);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Uploaded files are served by the backend at /uploads/... */
export const fileUrl = (path: string | null | undefined) => (!path ? undefined : path.startsWith("http") ? path : `${API_URL}${path}`);

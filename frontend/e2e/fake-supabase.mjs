// Stand-in for Supabase Auth (GoTrue) used only by the end-to-end tests, so they never touch a
// real project. Any password works for any email; tokens are HS256-signed with the shared test
// secret that the e2e backend is started with (SUPABASE_JWT_SECRET).
import { createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
const SECRET = "e2e-test-secret";
const ISS = `http://localhost:${PORT}/auth/v1`;

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const sign = (claims) => {
  const head = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`;
  return `${head}.${createHmac("sha256", SECRET).update(head).digest("base64url")}`;
};
const verify = (token) => {
  const [h, p, s] = (token ?? "").split(".");
  if (!s || createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  return claims.exp > Date.now() / 1000 ? claims : null;
};

const userFor = (email) => ({
  id: `user-${Buffer.from(email).toString("hex").slice(0, 24)}`,
  aud: "authenticated",
  role: "authenticated",
  email,
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  email_confirmed_at: "2026-01-01T00:00:00Z",
});

const session = (email) => {
  const now = Math.floor(Date.now() / 1000);
  const user = userFor(email);
  const access_token = sign({ sub: user.id, email, aud: "authenticated", role: "authenticated", iss: ISS, iat: now, exp: now + 3600, session_id: randomUUID() });
  return { access_token, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `r-${email}`, user };
};

const send = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url, ISS);
    const body = raw ? JSON.parse(raw) : {};
    if (req.method === "OPTIONS") return send(res, 204);
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    if (req.method === "POST" && url.pathname === "/auth/v1/token") {
      const email = url.searchParams.get("grant_type") === "refresh_token" ? body.refresh_token?.slice(2) : body.email;
      return email ? send(res, 200, session(email)) : send(res, 400, { msg: "missing email" });
    }
    if (url.pathname === "/auth/v1/user") {
      const claims = verify(req.headers.authorization?.slice(7));
      return claims ? send(res, 200, userFor(claims.email)) : send(res, 401, { msg: "invalid JWT" });
    }
    if (req.method === "POST" && url.pathname === "/auth/v1/logout") return send(res, 204);
    if (req.method === "POST" && url.pathname === "/auth/v1/recover") return send(res, 200, {});
    send(res, 404, { msg: "not found" });
  });
}).listen(PORT, "127.0.0.1", () => console.log(`fake supabase on ${PORT}`));

import crypto from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "seo_session";

type SessionPayload = {
  userId: string;
  role: "admin" | "employee";
};

function getSecret() {
  return process.env.APP_SESSION_SECRET || "local-dev-secret-change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function setSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encoded}.${sign(encoded)}`;

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

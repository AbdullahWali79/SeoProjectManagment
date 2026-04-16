import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { getDb, getOne } from "@/lib/db";
import { clearSession, getSession, setSession } from "@/lib/session";

export type AppRole = "admin" | "employee";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
};

export async function loginWithPassword(email: string, password: string) {
  const db = await getDb();
  const user = await getOne<{
    id: string;
    full_name: string;
    email: string;
    role: AppRole;
    password_hash: string;
    is_active: boolean;
  }>(
    db,
    `
      SELECT id, full_name, email, role, password_hash, is_active
      FROM users
      WHERE email = $1
    `,
    [email],
  );

  if (!user || !user.is_active) {
    return { success: false as const, message: "User not found or inactive." };
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return { success: false as const, message: "Wrong email or password." };
  }

  await setSession({ userId: user.id, role: user.role });

  return {
    success: true as const,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function logout() {
  await clearSession();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const db = await getDb();
  const user = await getOne<{
    id: string;
    full_name: string;
    email: string;
    role: AppRole;
  }>(
    db,
    `
      SELECT id, full_name, email, role
      FROM users
      WHERE id = $1
    `,
    [session.userId],
  );

  if (!user) {
    await clearSession();
    return null;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

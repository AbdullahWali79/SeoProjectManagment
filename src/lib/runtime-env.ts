import fs from "node:fs";
import path from "node:path";

const FALLBACK_ENV_FILE = ".env.vercel";

let loadedFallbackEnv = false;

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function ensureRuntimeEnv() {
  if (loadedFallbackEnv) {
    return;
  }

  loadedFallbackEnv = true;

  const envPath = path.join(process.cwd(), FALLBACK_ENV_FILE);
  if (!fs.existsSync(envPath)) {
    return;
  }

  const fileContents = fs.readFileSync(envPath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(trimmedLine.slice(separatorIndex + 1));

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value;
  }
}

function getConnectionString() {
  ensureRuntimeEnv();

  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || "";
}

function hasPlaceholderDatabasePassword(connectionString: string) {
  return /replace[-_ ]with|your-supabase-db-password|REPLACE_WITH/i.test(connectionString);
}

export function getDatabaseSetupError() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return "Database configured nahi hai. Local ke liye real `DATABASE_URL` `.env.local` ya `.env.vercel` mein add karo, aur Vercel par Project Settings > Environment Variables mein `DATABASE_URL` set karo.";
  }

  if (hasPlaceholderDatabasePassword(connectionString)) {
    return "`DATABASE_URL` abhi placeholder password par hai. Supabase ka real database password local env ya Vercel environment variables mein lagaye baghair login nahi chalega.";
  }

  return null;
}

export function getConfiguredConnectionString() {
  const setupError = getDatabaseSetupError();

  if (setupError) {
    throw new Error(setupError);
  }

  return getConnectionString();
}

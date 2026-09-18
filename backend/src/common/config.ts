export const institution = () => process.env.INSTITUTION_ID || "buk";
export function validateConfig(env: Record<string, unknown>) {
  if (typeof env.JWT_SECRET !== "string" || env.JWT_SECRET.length < 32)
    throw new Error(
      "JWT_SECRET must contain at least 32 characters. See docs/ENVIRONMENT.md.",
    );
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (env.OPENAI_API_KEY && !env.OPENAI_MODEL)
    throw new Error("Set OPENAI_MODEL when configuring OPENAI_API_KEY");
  const retention = Number(env.DOCUMENT_RETENTION_HOURS ?? 24);
  if (!Number.isInteger(retention) || retention < 1 || retention > 168)
    throw new Error("DOCUMENT_RETENTION_HOURS must be 1–168");
  return env;
}

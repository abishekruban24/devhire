/**
 * DevHire Environment Diagnostics and URL Validation
 * 
 * Validates authentication and service environment variables.
 * In accordance with security standards:
 * - Does NOT silently normalize, unset, or replace invalid environment variables in production.
 * - Validates AUTH_URL and NEXTAUTH_URL strictly and reports safe diagnostics without exposing secrets.
 * - Ensures authentication and protected routes fail securely when configuration is invalid.
 */

export interface SafeDiagnosticsSummary {
  databaseConfigured: boolean;
  databaseScheme: string | null;
  authSecretConfigured: boolean;
  authUrlConfigured: boolean;
  authUrlValid: boolean;
  redisConfigured: boolean;
  isProduction: boolean;
  isVercel: boolean;
}

export interface AuthValidationResult {
  isValid: boolean;
  error: string | null;
  summary: SafeDiagnosticsSummary;
}

function validateUrlFormat(
  raw: string | undefined,
  varName: "AUTH_URL" | "NEXTAUTH_URL"
): { isValid: boolean; error: string | null } {
  if (!raw) {
    return { isValid: true, error: null };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: `${varName} is configured as an empty string. Provide a valid absolute URL or remove the variable.`,
    };
  }

  // Check for surrounding quotes (e.g. "https://..." or 'https://...')
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return {
      isValid: false,
      error: `${varName} contains surrounding quotation marks. In Vercel environment variables, enter the URL directly without quotes.`,
    };
  }

  // Check for protocol
  if (!trimmed.includes("://")) {
    return {
      isValid: false,
      error: `${varName} is missing a protocol. It must start with https:// (e.g. https://devhire-ten.vercel.app).`,
    };
  }

  // Attempt URL parse
  try {
    const parsed = new URL(trimmed);
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (isProduction && !isLocalhost && parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: `${varName} must use https:// protocol in production environments.`,
      };
    }

    if (!parsed.hostname) {
      return {
        isValid: false,
        error: `${varName} does not have a valid hostname.`,
      };
    }

    return { isValid: true, error: null };
  } catch {
    return {
      isValid: false,
      error: `${varName} is not a valid absolute URL.`,
    };
  }
}

/**
 * Validates the authentication environment configuration strictly.
 * Reports clear, credential-safe error messages.
 */
export function validateAuthEnvironment(): AuthValidationResult {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercel = Boolean(process.env.VERCEL);

  // 1. Check AUTH_URL / NEXTAUTH_URL
  const rawAuthUrl = process.env.AUTH_URL;
  const rawNextAuthUrl = process.env.NEXTAUTH_URL;

  let urlValidation: { isValid: boolean; error: string | null } = { isValid: true, error: null };
  if (rawAuthUrl) {
    urlValidation = validateUrlFormat(rawAuthUrl, "AUTH_URL");
  } else if (rawNextAuthUrl) {
    urlValidation = validateUrlFormat(rawNextAuthUrl, "NEXTAUTH_URL");
  }

  // 2. Check AUTH_SECRET / NEXTAUTH_SECRET
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  let secretError: string | null = null;
  if (!secret || secret.trim().length === 0) {
    secretError = "AUTH_SECRET or NEXTAUTH_SECRET is not configured.";
  }

  // 3. Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  let dbError: string | null = null;
  let dbScheme: string | null = null;
  if (!dbUrl || dbUrl.trim().length === 0) {
    dbError = "DATABASE_URL is not configured.";
  } else {
    try {
      const idx = dbUrl.indexOf("://");
      if (idx !== -1) {
        dbScheme = dbUrl.substring(0, idx);
      }
    } catch {
      dbScheme = "unparseable";
    }
  }

  const primaryError = urlValidation.error || secretError || dbError || null;
  const isValid = !primaryError;

  const summary: SafeDiagnosticsSummary = {
    databaseConfigured: Boolean(dbUrl && dbUrl.length > 10),
    databaseScheme: dbScheme,
    authSecretConfigured: Boolean(secret && secret.length > 0),
    authUrlConfigured: Boolean(rawAuthUrl || rawNextAuthUrl),
    authUrlValid: urlValidation.isValid,
    redisConfigured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    isProduction,
    isVercel,
  };

  return {
    isValid,
    error: primaryError,
    summary,
  };
}

/**
 * Generates a safe diagnostic report that NEVER prints credentials or tokens.
 */
export function getSafeDiagnostics(): SafeDiagnosticsSummary {
  return validateAuthEnvironment().summary;
}

// Perform initial validation check at module load and log safe diagnostics if invalid
const initialValidation = validateAuthEnvironment();
if (!initialValidation.isValid) {
  console.error(
    `[DevHire Auth Configuration Error]: ${initialValidation.error}`
  );
}

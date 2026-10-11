const SENSITIVE_KEY_REGEX = /^(password|passwordhash|token|secret|apikey|authorization|cookie|key|aiapikey|cronsecret|authsecret)$/i;
const POSTGRES_URL_REGEX = /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi;
const BEARER_REGEX = /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi;

/**
 * Recursively redacts sensitive values from objects, arrays, and strings before logging.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data
      .replace(POSTGRES_URL_REGEX, '$1***$3')
      .replace(BEARER_REGEX, '$1[REDACTED]');
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeLogData(data.message, depth + 1),
      stack: sanitizeLogData(data.stack, depth + 1),
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

export const logger = {
  info(message: string, context?: unknown) {
    const cleanContext = context !== undefined ? sanitizeLogData(context) : undefined;
    if (cleanContext) {
      console.log(`[INFO] ${message}`, cleanContext);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message: string, context?: unknown) {
    const cleanContext = context !== undefined ? sanitizeLogData(context) : undefined;
    if (cleanContext) {
      console.warn(`[WARN] ${message}`, cleanContext);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error(message: string, error?: unknown, context?: unknown) {
    const cleanError = error !== undefined ? sanitizeLogData(error) : undefined;
    const cleanContext = context !== undefined ? sanitizeLogData(context) : undefined;
    if (cleanError || cleanContext) {
      console.error(`[ERROR] ${message}`, { error: cleanError, context: cleanContext });
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};

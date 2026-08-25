/**
 * Centralized Error Sanitizer & Information Leakage Prevention
 * 
 * Ensures that users never receive raw database errors, schema/table names,
 * internal server paths, or stack traces in the UI.
 * 
 * Maps Postgres and Supabase error codes to safe, friendly messages
 * while preserving full debugging details in the developer console.
 */

interface SupabaseLikeError {
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

/**
 * Standard sanitized error message map for common Supabase and Postgres error codes
 */
const ERROR_CODE_MAP: Record<string, string> = {
  // Supabase Auth
  'invalid_credentials': 'Invalid email or password. Please check your credentials.',
  'invalid_grant': 'Invalid email or password. Please check your credentials.',
  'user_not_found': 'No account found with this email address.',
  'user_already_exists': 'An account with this email already exists. Please sign in instead.',
  'over_email_send_rate_limit': 'Email rate limit exceeded. Please wait a few minutes before trying again.',
  'email_rate_limit_exceeded': 'Too many emails sent. Please wait a moment before requesting another.',
  'email_not_confirmed': 'Please verify your email address before signing in.',
  'weak_password': 'Password is too weak. Please use at least 8 characters including letters and numbers.',
  'session_expired': 'Your session has expired. Please sign in again.',

  // Postgres Database Error Codes
  '23505': 'This record or identifier already exists.', // unique_violation
  '23503': 'Cannot perform this action because a related record does not exist.', // foreign_key_violation
  '23502': 'Please fill in all required fields.', // not_null_violation
  '23514': 'The provided data does not meet the required constraints.', // check_violation
  '42501': 'You do not have permission to perform this action.', // insufficient_privilege / RLS
  '42P01': 'The requested service resource is temporarily unavailable.', // undefined_table
  '22P02': 'Invalid input format provided.', // invalid_text_representation
  'PGRST116': 'The requested record was not found.', // PostgREST single row error
  'PGRST301': 'You are not authorized to perform this operation.', // JWT invalid / expired
}

/**
 * Patterns in raw error strings that should be stripped / normalized
 */
const SENSITIVE_ERROR_PATTERNS = [
  /duplicate key value violates unique constraint/i,
  /violates row-level security policy/i,
  /relation ".*" does not exist/i,
  /syntax error at or near/i,
  /null value in column ".*" violates not-null constraint/i,
  /permission denied for (table|schema|relation)/i,
  /column ".*" does not exist/i,
  /function .* does not exist/i,
]

/**
 * Sanitizes any unknown error object into a safe, human-readable message.
 */
export function sanitizeAppError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): string {
  // Always log full error details for developer debugging
  if (import.meta.env.DEV) {
    console.error('[NexMess Error]', error)
  }

  if (!error) {
    return fallbackMessage
  }

  // Handle string errors
  if (typeof error === 'string') {
    return cleanRawErrorString(error, fallbackMessage)
  }

  // Handle Error instances or Supabase error objects
  const err = error as SupabaseLikeError

  // 1. Check known error code map
  if (err.code && ERROR_CODE_MAP[err.code]) {
    return ERROR_CODE_MAP[err.code]
  }

  const rawMessage = err.message || ''

  // 2. Check Auth specific keywords in message
  const lowerMsg = rawMessage.toLowerCase()
  if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid credentials')) {
    return 'Invalid email or password. Please verify your credentials.'
  }
  if (lowerMsg.includes('email already registered') || lowerMsg.includes('user already registered')) {
    return 'This email is already registered. Please sign in instead.'
  }
  if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
    return 'Too many requests. Please wait a moment before trying again.'
  }
  if (lowerMsg.includes('jwt') || lowerMsg.includes('token is expired') || lowerMsg.includes('session expired')) {
    return 'Your session has expired. Please sign in again.'
  }
  if (lowerMsg.includes('network error') || lowerMsg.includes('failed to fetch')) {
    return 'Network connection error. Please check your internet connection.'
  }

  // 3. Prevent raw SQL / internal database leaks
  for (const pattern of SENSITIVE_ERROR_PATTERNS) {
    if (pattern.test(rawMessage)) {
      if (pattern.source.includes('unique constraint')) {
        return 'A record with this information already exists.'
      }
      if (pattern.source.includes('row-level security') || pattern.source.includes('permission denied')) {
        return 'You do not have permission to perform this action.'
      }
      return fallbackMessage
    }
  }

  // 4. Return sanitized message if safe, or fallback
  return cleanRawErrorString(rawMessage, fallbackMessage)
}

function cleanRawErrorString(msg: string, fallback: string): string {
  if (!msg || msg.length > 200 || msg.includes('at ') || msg.includes('SELECT ') || msg.includes('INSERT INTO')) {
    return fallback
  }
  return msg
}

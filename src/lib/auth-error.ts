/**
 * Supabase reports a failed magic link by bouncing the browser back with the
 * reason in the URL — as a hash fragment on the implicit flow, or as a query
 * string on PKCE. Left unread it looks like nothing happened at all.
 */
export interface AuthUrlError {
  code: string
  message: string
}

const FRIENDLY: Record<string, string> = {
  otp_expired:
    'That sign-in link has expired or was already used. Links work once, and some mail apps open them automatically while scanning. Ask for a new one, or use the 6-digit code instead.',
  access_denied: 'That sign-in link is no longer valid. Ask for a new one.',
  flow_state_not_found:
    'This browser did not start that sign-in. Open the link in the same browser you requested it from, or use the 6-digit code instead.',
  flow_state_expired: 'That sign-in attempt timed out. Ask for a new link.',
  bad_code_verifier:
    'This browser did not start that sign-in. Open the link in the same browser you requested it from, or use the 6-digit code instead.',
  validation_failed: 'Something about that request was malformed. Ask for a new link.',
}

export function readAuthError(url = window.location.href): AuthUrlError | null {
  const parsed = new URL(url)
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const query = parsed.searchParams

  const code = hash.get('error_code') ?? query.get('error_code') ?? hash.get('error') ?? query.get('error')
  if (!code) return null

  const raw =
    hash.get('error_description') ?? query.get('error_description') ?? 'Sign-in did not complete.'

  return { code, message: FRIENDLY[code] ?? raw.replace(/\+/g, ' ') }
}

/** Strip the error out of the address bar so a refresh does not re-show it. */
export function clearAuthError() {
  window.history.replaceState({}, '', window.location.pathname)
}

/**
 * Errors the auth API returns to a call we made, as opposed to the ones it
 * puts in the URL above. Supabase sets `code` on recent releases and only a
 * message on older ones, so both are checked.
 */
const API: Record<string, string> = {
  invalid_credentials:
    'That email and password do not match. Check the password, or send yourself a reset link.',
  email_not_confirmed:
    'This account still has to confirm its email. Open the confirmation email, or sign in with a link instead.',
  user_already_exists:
    'An account with this email already exists. Sign in with your password, or reset it if you have forgotten.',
  weak_password: 'That password is too weak. Use at least 8 characters.',
  same_password: 'That is already your password. Pick a different one.',
  over_email_send_rate_limit:
    'This project has sent too many emails in the last hour. Wait a while, or use a password instead of a link.',
  over_request_rate_limit: 'Too many attempts in a row. Wait a minute and try again.',
  validation_failed: 'Check the email and password, then try again.',
}

export function authMessage(error: { message: string; code?: string; status?: number }) {
  if (error.code && API[error.code]) return API[error.code]
  if (error.status === 429) return API.over_request_rate_limit

  const m = error.message.toLowerCase()
  if (m.includes('invalid login credentials')) return API.invalid_credentials
  if (m.includes('already registered') || m.includes('already exists')) return API.user_already_exists
  if (m.includes('email rate limit') || m.includes('rate limit')) return API.over_email_send_rate_limit
  if (m.includes('password should be') || m.includes('password is too')) return API.weak_password
  if (m.includes('email not confirmed')) return API.email_not_confirmed
  // The request never left the browser: wrong project URL, the dev server
  // started without env vars, or simply no connection.
  if (m.includes('failed to fetch') || m.includes('load failed') || m.includes('networkerror'))
    return 'Could not reach the server. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY point at your project, then reload.'
  return error.message
}

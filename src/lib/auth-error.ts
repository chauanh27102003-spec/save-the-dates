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

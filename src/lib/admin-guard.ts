/**
 * The demo admin has no sign-in. It exists only outside production, or when LF_ADMIN_DEMO=1 is set
 * deliberately (the snapshot and the static demo set it at build time). A real build puts the admin
 * behind staff authentication (see README).
 */
export function adminAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.LF_ADMIN_DEMO === '1';
}

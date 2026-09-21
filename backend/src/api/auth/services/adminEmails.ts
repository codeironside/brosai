/** Emails that always receive the admin (super admin) role */
export const EXPLICIT_ADMIN_EMAILS = [
  'admin@vamvamvam.ai',
  'fury25423@gmail.com',
];

export function isExplicitAdminEmail(email?: string | null): boolean {
  return EXPLICIT_ADMIN_EMAILS.includes(String(email || '').toLowerCase().trim());
}

export function resolveRoleForEmail(email?: string | null, fallback: 'admin' | 'user' = 'user'): 'admin' | 'user' {
  return isExplicitAdminEmail(email) ? 'admin' : fallback;
}

// Only Silpakorn University addresses may hold an account — su.ac.th or
// silpakorn.edu, including faculty/department subdomains such as cp.su.ac.th.
// Checked at every way in: password login, Google login, and an admin
// creating an account.
const UNIVERSITY_DOMAINS = ['su.ac.th', 'silpakorn.edu'];

export const UNIVERSITY_EMAIL_HINT = '@su.ac.th หรือ @silpakorn.edu';

export function isUniversityEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  return UNIVERSITY_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

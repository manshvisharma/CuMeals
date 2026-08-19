export const ADMIN_EMAILS = [
  '17monusharma@gmail.com',
  'admin@mess.com'
];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === clean);
};

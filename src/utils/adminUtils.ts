export const ADMIN_EMAILS = [
  '17monusharma@gmail.com',
  '17monusharma'
];

export const isUserAdmin = (email?: string | null): boolean => {
  // Support persistent admin session key
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('mess_admin_session') === 'true') {
      return true;
    }
  }

  if (!email) return false;
  const clean = email.trim().toLowerCase();
  
  return ADMIN_EMAILS.some(adminEmail => {
    const target = adminEmail.toLowerCase().trim();
    return clean === target || clean.startsWith(target + '@') || target.startsWith(clean + '@');
  });
};


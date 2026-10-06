/**
 * Utility validation functions for authentication and input handling
 */

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
};

export const isNotEmpty = (val) => {
  if (val === null || val === undefined) return false;
  return String(val).trim().length > 0;
};

export const doPasswordsMatch = (password, confirmPassword) => {
  return isNotEmpty(password) && password === confirmPassword;
};

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  score: number;
  label: PasswordStrength;
  segments: number;
  hints: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const hints: string[] = [];

  if (password.length >= 8) score += 1;
  else hints.push("At least 8 characters");

  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  else hints.push("Add uppercase letter");

  if (/[a-z]/.test(password)) score += 1;
  else hints.push("Add lowercase letter");

  if (/[0-9]/.test(password)) score += 1;
  else hints.push("Add a number");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else hints.push("Add a symbol for extra strength");

  let label: PasswordStrength = "weak";
  if (score >= 5) label = "strong";
  else if (score >= 4) label = "good";
  else if (score >= 3) label = "fair";

  return {
    score,
    label,
    segments: Math.min(4, Math.max(1, Math.ceil(score / 1.5))),
    hints: hints.slice(0, 2),
  };
}

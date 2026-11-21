export function validateNewAccountAge(ageStr: string): string | null {
  const trimmed = ageStr.trim();
  const ageNum = Number(trimmed);
  if (!trimmed || !Number.isFinite(ageNum)) {
    return "Age is required.";
  }
  if (ageNum < 18) {
    return "You must be at least 18 years old to create an account.";
  }
  if (ageNum > 120) {
    return "Age must be between 18 and 120.";
  }
  return null;
}

export function validateNewAccountAgeNumber(age: number | null | undefined): string | null {
  if (age == null || age <= 0 || !Number.isFinite(age)) {
    return "Age is required.";
  }
  return validateNewAccountAge(String(Math.trunc(age)));
}
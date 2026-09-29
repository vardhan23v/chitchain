export function validateCircleForm(name: string, amount: string, members: number) {
  const errors: Record<string, string> = {};

  if (!name || name.trim().length < 3) {
    errors.name = 'Circle name must be at least 3 characters.';
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Contribution amount must be greater than zero.';
  }

  if (members < 2 || members > 20) {
    errors.members = 'Member count must be between 2 and 20.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

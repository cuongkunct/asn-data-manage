import crypto from 'crypto';

export interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  specialChars: boolean;
}

export function generatePassword(config: PasswordConfig): string {
  const length = Math.max(6, Math.min(64, config.length || 12));
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let nums = '0123456789';
  let specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let allowedChars = '';
  const requiredChars: string[] = [];

  if (config.uppercase) {
    allowedChars += upper;
    requiredChars.push(upper[Math.floor(Math.random() * upper.length)]);
  }
  if (config.lowercase) {
    allowedChars += lower;
    requiredChars.push(lower[Math.floor(Math.random() * lower.length)]);
  }
  if (config.numbers) {
    allowedChars += nums;
    requiredChars.push(nums[Math.floor(Math.random() * nums.length)]);
  }
  if (config.specialChars) {
    allowedChars += specials;
    requiredChars.push(specials[Math.floor(Math.random() * specials.length)]);
  }

  if (!allowedChars) {
    allowedChars = lower + nums; // Fallback
  }

  let result = [...requiredChars];
  while (result.length < length) {
    const randomByte = crypto.randomBytes(1)[0];
    result.push(allowedChars[randomByte % allowedChars.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

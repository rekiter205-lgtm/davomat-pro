/**
 * Auto-generate username and password for new accounts.
 */

// Uzbek-to-Latin mapping for transliteration
const UZ_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
  'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'қ': 'q', 'ғ': 'g', 'ҳ': 'h', 'ў': 'o',
  'ʼ': '', 'ʻ': '', "'": '',
};

/** "Aliyev Sardor" → "aliyev_s" */
export function generateUsername(fullName: string): string {
  // Transliterate Cyrillic + Latin Uzbek
  const translit = fullName
    .toLowerCase()
    .split('')
    .map((c) => UZ_MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9_ ]/g, '');

  const parts = translit.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'user' + Math.floor(Math.random() * 10000);
  if (parts.length === 1) return parts[0];

  // "aliyev_s" — first name + initial of last
  return `${parts[0]}_${parts[1][0]}`;
}

/** Generate a 8-char readable password (no confusing chars) */
export function generatePassword(length = 8): string {
  // Removed: 0, O, 1, l, I — to avoid confusion
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique username — if base is taken, appends a number.
 */
export async function generateUniqueUsername(
  fullName: string,
  isUsernameTaken: (username: string) => Promise<boolean>,
): Promise<string> {
  const base = generateUsername(fullName);
  if (!await isUsernameTaken(base)) return base;

  // Try base + 1, base + 2, ...
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}${i}`;
    if (!await isUsernameTaken(candidate)) return candidate;
  }
  // Fallback
  return base + Date.now();
}

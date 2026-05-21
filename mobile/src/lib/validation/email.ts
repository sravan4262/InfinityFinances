export type EmailValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const MAX_LENGTH = 254;

const FORMAT_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/;

const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "maildrop.cc",
  "getnada.com",
  "fakeinbox.com",
]);

export function validateEmail(raw: string): EmailValidationResult {
  const value = raw.trim().toLowerCase();

  if (!value) return { ok: false, error: "Enter your email" };
  if (value.length > MAX_LENGTH) return { ok: false, error: "Email is too long" };
  if (!FORMAT_RE.test(value)) return { ok: false, error: "Enter a valid email" };

  const atIndex = value.lastIndexOf("@");
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, error: "Enter a valid email" };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, error: "Disposable email addresses aren't allowed" };
  }

  return { ok: true, value };
}

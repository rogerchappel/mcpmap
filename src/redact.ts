const SECRET_KEY_PATTERN = /(token|secret|password|passwd|apikey|api_key|auth|credential|private|bearer|session|cookie)/i;
const SECRET_VALUE_PATTERN = /(sk-[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9_]{20,}|xox[baprs]-[a-z0-9-]{10,}|Bearer\s+[a-z0-9._-]{12,}|[a-z0-9+/]{32,}={0,2})/i;

export function looksSensitiveKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function looksSensitiveValue(value: string): boolean {
  return SECRET_VALUE_PATTERN.test(value) || value.length > 80;
}

export function redactValue(key: string, value: unknown): string {
  const stringValue = String(value ?? '');
  if (looksSensitiveKey(key) || looksSensitiveValue(stringValue)) {
    return '<redacted>';
  }
  if (stringValue.includes('$') || stringValue.includes('%')) {
    return stringValue.replace(/(=)[^:;\s]+/g, '$1<redacted>');
  }
  return stringValue;
}

export function redactObject(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, redactValue(key, value)]));
}

export function redactArguments(input: unknown[]): string[] {
  let redactNext = false;
  return input.map((value) => {
    const argument = String(value);
    if (redactNext) {
      redactNext = false;
      return '<redacted>';
    }

    const separator = argument.indexOf('=');
    if (separator > 0) {
      const key = argument.slice(0, separator).replace(/^-+/, '');
      const argumentValue = argument.slice(separator + 1);
      if (looksSensitiveKey(key) || looksSensitiveValue(argumentValue)) {
        return `${argument.slice(0, separator + 1)}<redacted>`;
      }
    } else if (argument.startsWith('-') && looksSensitiveKey(argument.replace(/^-+/, ''))) {
      redactNext = true;
    }

    if (looksSensitiveValue(argument)) return '<redacted>';
    return redactInline(argument);
  });
}

export function redactInline(text: string): string {
  return text
    .replace(/(token|secret|password|api[_-]?key)(["'\s:=]+)([^"'\s,}]+)/gi, '$1$2<redacted>')
    .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, '<redacted>')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, '<redacted>');
}

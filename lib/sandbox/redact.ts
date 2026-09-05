const patterns: Array<[RegExp, string]> = [
  [/AKIA[0-9A-Z]{16}/g, "AKIA****************"],
  [/(aws_secret_access_key\s*[=:]\s*)\S+/gi, "$1[REDACTED]"],
  [/(aws_session_token\s*[=:]\s*)\S+/gi, "$1[REDACTED]"],
  [/((?:api[_-]?key|token|password|secret)\s*[=:]\s*)\S+/gi, "$1[REDACTED]"],
  [/(authorization:\s*bearer\s+)\S+/gi, "$1[REDACTED]"],
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi, "$1[REDACTED]"],
  [/(sk_(?:live|test)_[A-Za-z0-9]{12,})/g, "sk_[REDACTED]"],
];

export function redactSecrets(value: string, limit = 12_000) {
  let output = value.slice(0, limit);
  for (const [pattern, replacement] of patterns) output = output.replace(pattern, replacement);
  return output;
}

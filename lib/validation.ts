export function isSteamId64(value: string): boolean {
  return /^\d{17}$/.test(value);
}

export function parseOffset(value: string | null): number | null {
  if (value === null || value === '') {
    return 0;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

export function extractVanityInput(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  return (match?.[1] ?? trimmed).trim();
}

export function extractSteamIdInput(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  return match?.[1] ?? null;
}

export class UpstreamFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UpstreamFetchError';
    this.status = status;
  }
}

interface FetchJsonOptions extends RequestInit {
  retries?: number;
  timeoutMs?: number;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, init?: FetchJsonOptions): Promise<T> {
  const { retries = 0, timeoutMs = 10000, headers, signal, ...rest } = init ?? {};

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await fetch(url, {
        ...rest,
        signal: combinedSignal,
        headers: {
          Accept: 'application/json',
          ...(headers ?? {})
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (attempt < retries && RETRYABLE_STATUSES.has(response.status)) {
          await sleep(250 * (attempt + 1));
          continue;
        }

        throw new UpstreamFetchError(`Upstream request failed with status ${response.status}`, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UpstreamFetchError) {
        throw error;
      }

      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }

      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new UpstreamFetchError('Upstream request timed out', 504);
      }

      throw new UpstreamFetchError('Upstream request failed', 502);
    }
  }

  throw new UpstreamFetchError('Upstream request failed', 502);
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { extractSteamIdInput, extractVanityInput } from '@/lib/validation';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  initialValue?: string;
  vanityLookupEnabled?: boolean;
}

export function SearchBar({
  placeholder = 'Player or SteamId64',
  className,
  initialValue = '',
  vanityLookupEnabled = true
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = value.trim();

    if (!input) {
      return;
    }

    setError(null);
    setIsResolving(true);

    const profileSteamId = extractSteamIdInput(input);

    if (/^\d{17}$/.test(input) || profileSteamId) {
      startTransition(() => {
        router.push(`/player/${profileSteamId ?? input}`);
      });
      return;
    }

    if (!vanityLookupEnabled) {
      setIsResolving(false);
      setError('Vanity lookup is unavailable. Enter a SteamID64 instead.');
      return;
    }

    const vanity = extractVanityInput(input);

    try {
      const response = await fetch(`/api/resolve?vanity=${encodeURIComponent(vanity)}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Could not resolve that name');
      }

      const payload = (await response.json()) as { steamid: string };

      startTransition(() => {
        router.push(`/player/${payload.steamid}`);
      });
    } catch (error) {
      setIsResolving(false);
      setError(error instanceof Error ? error.message : 'Could not resolve that name');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={['search-form', className].filter(Boolean).join(' ')}>
      <input
        value={value}
        onChange={(event) =>
          setValue(vanityLookupEnabled ? event.target.value : event.target.value.replace(/\D+/g, ''))
        }
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="search-input"
        aria-label="Player search"
        inputMode={vanityLookupEnabled ? undefined : 'numeric'}
        pattern={vanityLookupEnabled ? undefined : '\\d*'}
      />
      <p className={`search-feedback${error ? ' search-feedback-error' : ''}`}>
        {error ??
          (isResolving || isPending ? 'Resolving player...' : '')}
      </p>
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  );
}

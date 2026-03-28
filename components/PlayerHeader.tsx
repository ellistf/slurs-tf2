import Link from 'next/link';
import Image from 'next/image';

import type { PlayerProfile } from '@/types';

export function PlayerHeader({
  steamId,
  profile
}: {
  steamId: string;
  profile: PlayerProfile | null;
}) {
  const name = profile?.name || steamId;
  const regionLabel = profile?.regionLabel || profile?.countryCode || 'Unknown';
  const flagCode = profile?.flagCode || profile?.countryCode.toLowerCase() || '';

  return (
    <section className="player-header">
      <div className="player-header-top">
        <Link href="/" className="player-home-link">
          Return home
        </Link>
      </div>

      <div className="player-header-card">
        <div className="player-avatar">
          {profile?.avatarUrl ? (
            <Image src={profile.avatarUrl} alt={name} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="player-avatar-fallback">?</div>
          )}
        </div>

        <div className="player-meta">
          <div className="player-name-row">
            <h1>{name}</h1>
            {flagCode ? (
              <img
                src={`https://flagcdn.com/24x18/${flagCode}.png`}
                alt={`${regionLabel} flag`}
                width={24}
                height={18}
                className="player-flag"
              />
            ) : null}
          </div>

          <div className="player-subline">
            <span>{steamId}</span>
            {regionLabel ? <span className="player-region">{regionLabel}</span> : null}
          </div>

          <div className="player-links">
            <a href={`https://steamcommunity.com/profiles/${steamId}`} target="_blank" rel="noreferrer">
              Steam
            </a>
            <a href={`https://etf2l.org/search/${steamId}/`} target="_blank" rel="noreferrer">
              ETF2L
            </a>
            <a
              href={`https://rgl.gg/Public/PlayerProfile.aspx?steamid=${steamId}`}
              target="_blank"
              rel="noreferrer"
            >
              RGL
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

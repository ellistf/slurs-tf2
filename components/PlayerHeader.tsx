import { House } from 'lucide-react';
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
        <a href="#/" className="player-home-link" aria-label="Return home" title="Return home">
          <House size={18} strokeWidth={1.9} aria-hidden="true" />
        </a>
      </div>

      <div className="player-header-card">
        <div className="player-avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={name} className="player-avatar-image" />
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

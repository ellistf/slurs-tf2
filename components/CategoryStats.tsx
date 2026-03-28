'use client';

import type { PlayerStats } from '@/types';

export function CategoryStats({ stats }: { stats: PlayerStats }) {
  return (
    <div className="cat-stats">
      <div className="cat-stat">
        <div className="cat-label">
          Racial: <span data-testid="racial-count">({stats.racial})</span>
        </div>
      </div>
      <div className="cat-stat bigotry">
        <div className="cat-label">
          Bigotry: <span data-testid="bigotry-count">({stats.bigotry})</span>
        </div>
      </div>
      <div className="cat-stat">
        <div className="cat-label">
          Generic: <span data-testid="generic-count">({stats.generic})</span>
        </div>
      </div>
    </div>
  );
}

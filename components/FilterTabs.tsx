'use client';

import type { FilterKey } from '@/types';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'racial', label: 'Racial' },
  { key: 'bigotry', label: 'Bigotry' },
  { key: 'generic', label: 'Generic' },
  { key: 'flagged', label: 'Flagged' }
];

export function FilterTabs({
  value,
  onChange
}: {
  value: FilterKey;
  onChange: (next: FilterKey) => void;
}) {
  return (
    <div className="filter-tabs">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onChange(filter.key)}
          className={`ftab${value === filter.key ? ' active' : ''}`}
        >
          {filter.key === 'flagged' ? 'Flagged only' : filter.label}
        </button>
      ))}
    </div>
  );
}

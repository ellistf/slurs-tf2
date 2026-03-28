import type { Category } from '@/types';

import racialTerms from '@/lib/slur-data/racial.json';
import bigotryTerms from '@/lib/slur-data/bigotry.json';
import genericTerms from '@/lib/slur-data/generic.json';

export type FlagCategory = Exclude<Category, 'CLEAN'>;

function uniqueTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

export const SLURS: Record<FlagCategory, string[]> = {
  RACIAL: uniqueTerms(racialTerms),
  BIGOTRY: uniqueTerms(bigotryTerms),
  GENERIC: uniqueTerms(genericTerms)
};

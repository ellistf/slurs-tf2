import type { Category, InfractionMatch } from '@/types';
import { SLURS, type FlagCategory } from '@/lib/slur-list';

interface PatternDefinition {
  category: FlagCategory;
  term: string;
  regex: RegExp;
}

const JOINER_PATTERN = '[^a-z0-9]{0,3}';
const WORD_JOINER_PATTERN = '[^a-z0-9]{1,6}';
const CATEGORY_PRIORITY: Record<FlagCategory, number> = {
  RACIAL: 0,
  BIGOTRY: 1,
  GENERIC: 2
};

const CHAR_GROUPS: Record<string, string> = {
  a: 'a4@',
  b: 'b8',
  c: 'c(<',
  d: 'd',
  e: 'e3',
  f: 'f',
  g: 'g69q',
  h: 'h#',
  i: 'i1!|l',
  j: 'j',
  k: 'k',
  l: 'l1!|i',
  m: 'm',
  n: 'n',
  o: 'o0',
  p: 'p',
  q: 'q9',
  r: 'r',
  s: 's5$z',
  t: 't7+',
  u: 'uuv',
  v: 'v',
  w: 'w',
  x: 'x%',
  y: 'y',
  z: 'z2s'
};

function escapeForCharClass(value: string): string {
  return value.replace(/[\\\]-]/g, '\\$&');
}

function buildTokenPattern(token: string): string {
  return token
    .split('')
    .map((character, index, chars) => {
      if (character === "'") {
        return "'?";
      }

      const variants = escapeForCharClass(CHAR_GROUPS[character] ?? character);
      const joiner = index < chars.length - 1 ? JOINER_PATTERN : '';
      return `[${variants}]+${joiner}`;
    })
    .join('');
}

function buildPattern(term: string): RegExp {
  const tokens = term
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const joined = tokens.map(buildTokenPattern).join(WORD_JOINER_PATTERN);
  return new RegExp(`(?<![a-z0-9])${joined}(?![a-z0-9])`, 'gi');
}

function compareMatches(left: InfractionMatch, right: InfractionMatch): number {
  if (left.start !== right.start) {
    return left.start - right.start;
  }

  const leftLength = left.end - left.start;
  const rightLength = right.end - right.start;

  if (leftLength !== rightLength) {
    return rightLength - leftLength;
  }

  return CATEGORY_PRIORITY[left.category] - CATEGORY_PRIORITY[right.category];
}

function dedupeMatches(matches: InfractionMatch[]): InfractionMatch[] {
  const sorted = [...matches].sort(compareMatches);
  const deduped: InfractionMatch[] = [];

  for (const match of sorted) {
    const previous = deduped[deduped.length - 1];

    if (!previous) {
      deduped.push(match);
      continue;
    }

    const isContained =
      match.start >= previous.start &&
      match.end <= previous.end &&
      CATEGORY_PRIORITY[match.category] >= CATEGORY_PRIORITY[previous.category];

    if (!isContained) {
      deduped.push(match);
    }
  }

  return deduped;
}

const PATTERNS = Object.entries(SLURS).flatMap(([category, terms]) =>
  terms.map(
    (term) =>
      ({
        category: category as FlagCategory,
        term,
        regex: buildPattern(term)
      }) satisfies PatternDefinition
  )
);

export function analyzeMessage(message: string): {
  category: Category;
  matches: InfractionMatch[];
} {
  const matches: InfractionMatch[] = [];

  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;

    for (const result of message.matchAll(pattern.regex)) {
      if (result.index === undefined) {
        continue;
      }

      matches.push({
        category: pattern.category,
        term: pattern.term,
        text: result[0],
        start: result.index,
        end: result.index + result[0].length
      });
    }
  }

  const dedupedMatches = dedupeMatches(matches);

  if (!dedupedMatches.length) {
    return {
      category: 'CLEAN',
      matches: []
    };
  }

  const category = [...dedupedMatches]
    .sort((left, right) => CATEGORY_PRIORITY[left.category] - CATEGORY_PRIORITY[right.category])[0]
    .category;

  return {
    category,
    matches: dedupedMatches
  };
}

export function categorize(message: string): Category {
  return analyzeMessage(message).category;
}

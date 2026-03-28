import { analyzeMessage, categorize } from '@/lib/categorize';

describe('categorize', () => {
  it('matches racial slurs', () => {
    expect(categorize('that player said nigger in chat')).toBe('RACIAL');
  });

  it('is case-insensitive', () => {
    expect(categorize('FAGGOT')).toBe('BIGOTRY');
  });

  it('matches phrase-based generic flags', () => {
    expect(categorize('please kill yourself')).toBe('GENERIC');
  });

  it('handles obfuscated slurs with symbols and numbers', () => {
    const analysis = analyzeMessage('what a n1.gg3r');

    expect(analysis.category).toBe('RACIAL');
    expect(analysis.matches[0]?.text).toBe('n1.gg3r');
  });

  it('matches short terms only on word boundaries', () => {
    expect(categorize('that frag was clean')).toBe('CLEAN');
    expect(categorize('you fag')).toBe('BIGOTRY');
  });

  it('returns clean for safe messages', () => {
    expect(categorize('gg nice round')).toBe('CLEAN');
  });
});

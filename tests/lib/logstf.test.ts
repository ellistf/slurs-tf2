import { sid3ToSid64 } from '@/lib/logstf';
import { extractSteamIdInput, extractVanityInput, isSteamId64, parseOffset } from '@/lib/validation';

describe('logstf helpers', () => {
  it('converts SteamID3 to SteamID64', () => {
    expect(sid3ToSid64('[U:1:1]')).toBe('76561197960265729');
  });

  it('returns null for invalid SteamID3 input', () => {
    expect(sid3ToSid64('not-a-steamid')).toBeNull();
  });
});

describe('validation helpers', () => {
  it('validates SteamID64 route params', () => {
    expect(isSteamId64('76561197960265729')).toBe(true);
    expect(isSteamId64('vanity-name')).toBe(false);
  });

  it('extracts vanity slugs from pasted Steam URLs', () => {
    expect(extractVanityInput('https://steamcommunity.com/id/example-user/')).toBe('example-user');
  });

  it('extracts SteamID64 values from pasted profile URLs', () => {
    expect(extractSteamIdInput('https://steamcommunity.com/profiles/76561197960265729/')).toBe(
      '76561197960265729'
    );
  });

  it('parses offsets and rejects bad values', () => {
    expect(parseOffset('100')).toBe(100);
    expect(parseOffset(null)).toBe(0);
    expect(parseOffset('-1')).toBeNull();
  });
});

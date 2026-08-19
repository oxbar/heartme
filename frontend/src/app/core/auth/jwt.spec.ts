import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt';

function token(payload: object): string {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `x.${b64}.y`;
}

describe('decodeJwt', () => {
  it('decodes subject and expiration', () => {
    expect(decodeJwt(token({ sub: 'user-1', exp: 9999999999 }))).toMatchObject({ sub: 'user-1', exp: 9999999999 });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwt('broken')).toBeNull();
  });
});

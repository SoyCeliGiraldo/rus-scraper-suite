const { sanitizeObject } = require('../../src/utils/secrets');

describe('secrets.sanitizeObject', () => {
  it('replaces password/email/pass fields with asterisks', () => {
    const input = { password: 'abc', userPassword: 'def', email: 'test@example.com', other: 'keep' };
    const out = sanitizeObject(input);
    expect(out.password).toBe('***');
    expect(out.userPassword).toBe('***');
    expect(out.email).toBe('***');
    expect(out.other).toBe('keep');
  });

  it('does not modify non-sensitive keys', () => {
    const input = { token: 'xyz', name: 'john' };
    const out = sanitizeObject(input);
    expect(out).toEqual(input);
  });
});

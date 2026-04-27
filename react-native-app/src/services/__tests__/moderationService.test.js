import {
  moderateText,
  sanitize,
} from '../moderationService';

describe('moderationService.moderateText', () => {
  test('accepte un texte normal', () => {
    expect(moderateText('Belle propriete bien situee').ok).toBe(true);
  });

  test('rejette les mots interdits', () => {
    const r = moderateText('Cest une arnaque totale');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/mot_interdit/);
  });

  test('rejette les textes trop courts', () => {
    expect(moderateText('').ok).toBe(true); // null/empty -> ok pour pas bloquer pour rien
    const r = moderateText('a ');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('trop_court');
  });

  test('rejette si plusieurs telephones detectes', () => {
    const r = moderateText('contact +509 1111 2222 ou +1 333 444 5555');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('contacts_externes');
  });

  test('rejette si plusieurs emails detectes', () => {
    const r = moderateText('contact a@b.com ou c@d.com pour plus');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('contacts_externes');
  });
});

describe('moderationService.sanitize', () => {
  test('echappe les chevrons html', () => {
    expect(sanitize('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  test('gere null/undefined', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
  });
});

import { buildPropertyMessage, buildPropertyLink } from '../shareService';

const sampleProp = {
  id: 'p-1',
  title: 'Maison Petionville',
  location: 'Petion-Ville, HT',
  price: 250000,
  bedrooms: 3,
  bathrooms: 2,
  area: 180,
};

describe('shareService.buildPropertyLink', () => {
  test('contient l id', () => {
    expect(buildPropertyLink('abc')).toMatch(/abc$/);
  });
});

describe('shareService.buildPropertyMessage', () => {
  test('FR contient le titre + prix USD', () => {
    const msg = buildPropertyMessage(sampleProp, { language: 'fr', currency: 'USD' });
    expect(msg).toContain('Maison Petionville');
    expect(msg).toContain('$');
    expect(msg).toContain('Petion-Ville');
  });

  test('HT prix en HTG', () => {
    const msg = buildPropertyMessage(sampleProp, { language: 'ht', currency: 'HTG' });
    expect(msg).toContain('HTG');
    expect(msg).toContain('chanm');
  });

  test('EN format anglais', () => {
    const msg = buildPropertyMessage(sampleProp, { language: 'en', currency: 'USD' });
    expect(msg).toContain('bed');
    expect(msg).toContain('View on ORIZON');
  });

  test('property null -> chaine vide', () => {
    expect(buildPropertyMessage(null)).toBe('');
  });
});

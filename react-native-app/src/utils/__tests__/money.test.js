import { convertPrice, formatPrice, USD_TO_HTG } from '../../utils/money';

describe('money.convertPrice', () => {
  test('USD garde la valeur', () => {
    expect(convertPrice(100, 'USD')).toBe(100);
  });
  test('HTG multiplie par taux', () => {
    expect(convertPrice(100, 'HTG')).toBe(100 * USD_TO_HTG);
  });
  test('valeur invalide -> 0', () => {
    expect(convertPrice(undefined, 'USD')).toBe(0);
    expect(convertPrice('abc', 'HTG')).toBe(0);
  });
});

describe('money.formatPrice', () => {
  test('USD avec symbole $', () => {
    expect(formatPrice(1500, 'USD')).toMatch(/\$/);
  });
  test('HTG avec symbole HTG', () => {
    expect(formatPrice(100, 'HTG')).toMatch(/HTG/);
  });
  test('mode compact pour grandes valeurs', () => {
    expect(formatPrice(1500000, 'USD', { compact: true })).toMatch(/M/);
    expect(formatPrice(15000, 'USD', { compact: true })).toMatch(/k/);
  });
});

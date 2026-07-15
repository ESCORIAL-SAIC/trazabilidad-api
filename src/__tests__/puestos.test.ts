import { normalizarTipo } from '../domain/puestos';

test('normalizarTipo mapea como el Delphi', () => {
  expect(normalizarTipo('COCINA')).toBe('COCINA');
  expect(normalizarTipo('TERMOTANQUE')).toBe('TERMOTANQUE');
  expect(normalizarTipo('TERMOTANQUE GAS')).toBe('TERMOTANQUE');
  expect(normalizarTipo('TERMOTANQUE GEISER')).toBe('TERMOTANQUE');
  expect(normalizarTipo('CALEFON')).toBe('TERMOTANQUE');
  expect(normalizarTipo('BARRAL')).toBe('BARRAL');
});

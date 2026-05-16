import { describe, it, expect } from 'vitest';
import { friendlyError } from '../src/lib/errors';

describe('friendlyError', () => {
  it('retorna fallback quando err é vazio', () => {
    expect(friendlyError(null)).toBe('Algo deu errado. Tente novamente.');
    expect(friendlyError(undefined, 'custom')).toBe('custom');
  });

  it('aceita string direta', () => {
    expect(friendlyError('algum erro raro')).toBe('algum erro raro');
  });

  it('traduz códigos custom de RPC (puros)', () => {
    expect(friendlyError({ message: 'NAO_AUTENTICADO' })).toMatch(/sessão expirou/i);
    expect(friendlyError({ message: 'CLIENTE_NAO_ENCONTRADO' })).toMatch(/Cliente não encontrado/i);
    expect(friendlyError({ message: 'PERMISSAO_NEGADA' })).toMatch(/não tem permissão/i);
  });

  it('traduz código RPC com detalhe (ESTOQUE_INSUFICIENTE: Coca)', () => {
    const msg = friendlyError({ message: 'ESTOQUE_INSUFICIENTE: Coca-Cola' });
    expect(msg).toMatch(/Coca-Cola/);
    expect(msg).toMatch(/estoque/i);
  });

  it('traduz ESTOQUE_INSUFICIENTE sem detalhe', () => {
    const msg = friendlyError({ message: 'ESTOQUE_INSUFICIENTE' });
    expect(msg).toMatch(/estoque/i);
  });

  it('traduz mensagens de auth Supabase', () => {
    expect(friendlyError({ message: 'Invalid login credentials' })).toMatch(
      /E-mail ou senha incorretos/i,
    );
    expect(friendlyError({ message: 'User already registered' })).toMatch(
      /Já existe uma conta/i,
    );
    expect(friendlyError({ message: 'Email not confirmed' })).toMatch(/Confirme seu e-mail/i);
    expect(friendlyError({ message: 'Failed to fetch' })).toMatch(/conexão/i);
  });

  it('traduz códigos Postgres', () => {
    expect(friendlyError({ message: 'duplicate key', code: '23505' })).toMatch(/já existe/i);
    expect(friendlyError({ message: 'fk violation', code: '23503' })).toMatch(/referência/i);
    expect(friendlyError({ message: 'not null', code: '23502' })).toMatch(/obrigatórios/i);
    expect(friendlyError({ message: 'rls', code: '42501' })).toMatch(/permissão/i);
  });

  it('extrai pelo menos N caracteres em password too short', () => {
    const msg = friendlyError({ message: 'Password should be at least 8 characters' });
    expect(msg).toMatch(/pelo menos 8/);
  });

  it('cai no raw quando não conhece', () => {
    expect(friendlyError({ message: 'algo bem custom xyz' })).toBe('algo bem custom xyz');
  });
});

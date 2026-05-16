import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/cn';

describe('cn', () => {
  it('junta strings simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('respeita condições falsy do clsx', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('faz merge de classes Tailwind conflitantes (última vence)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('aceita objetos { classe: boolean }', () => {
    expect(cn({ foo: true, bar: false }, 'baz')).toBe('foo baz');
  });

  it('aceita arrays aninhados', () => {
    expect(cn(['a', ['b', 'c']], 'd')).toBe('a b c d');
  });
});

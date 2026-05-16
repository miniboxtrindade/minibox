import { describe, it, expect } from 'vitest';
import { formatFileSize, inferExtension } from '../src/lib/image';

describe('formatFileSize', () => {
  it('formata bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formata KB com 1 casa', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1023)).toBe('1023.0 KB');
  });

  it('formata MB com 1 casa', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});

describe('inferExtension', () => {
  it('mapeia mimes conhecidos', () => {
    expect(inferExtension(new Blob([], { type: 'image/webp' }))).toBe('webp');
    expect(inferExtension(new Blob([], { type: 'image/jpeg' }))).toBe('jpg');
    expect(inferExtension(new Blob([], { type: 'image/png' }))).toBe('png');
  });

  it('cai em bin para tipo desconhecido', () => {
    expect(inferExtension(new Blob([], { type: 'application/octet-stream' }))).toBe('bin');
    expect(inferExtension(new Blob([], { type: '' }))).toBe('bin');
  });
});

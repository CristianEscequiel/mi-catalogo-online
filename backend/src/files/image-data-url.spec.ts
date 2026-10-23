import { toImageDataUrl } from './image-data-url';

describe('toImageDataUrl', () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x10, 0x4a, 0x46]);

  it.each(['image/jpeg', 'image/png', 'image/webp'])('REQ-2.17: %s produce data:<mime>;base64,<contenido>', (mimetype) => {
    expect(toImageDataUrl({ mimetype, buffer: bytes })).toBe(`data:${mimetype};base64,${bytes.toString('base64')}`);
  });

  it('REQ-2.17: el contenido base64 se decodifica a los mismos bytes', () => {
    const url = toImageDataUrl({ mimetype: 'image/png', buffer: bytes });
    const content = url.slice('data:image/png;base64,'.length);
    expect(Buffer.from(content, 'base64').equals(bytes)).toBe(true);
  });
});

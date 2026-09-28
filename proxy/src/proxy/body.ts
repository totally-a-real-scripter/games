/**
 * Body helpers: bounded buffering, safe decompression and charset decoding.
 *
 * Decompression bombs: a few KB of gzip/brotli can expand to gigabytes. We
 * count bytes both before AND after decompression and abort as soon as either
 * exceeds the configured limit, so memory use is bounded regardless of the
 * compression ratio.
 */
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';

export class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`Response exceeds the ${Math.round(limit / 1024 / 1024)} MB processing limit.`);
  }
}

export class UnsupportedEncodingError extends Error {}

function decoderFor(encoding: string): NodeJS.ReadWriteStream | null {
  switch (encoding) {
    case '':
    case 'identity':
      return null;
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip();
    case 'deflate':
      // Some servers send raw deflate instead of zlib-wrapped; `Unzip` only
      // handles gzip/zlib, so use InflateRaw detection in readDecoded.
      return zlib.createInflate();
    case 'br':
      return zlib.createBrotliDecompress();
    default:
      throw new UnsupportedEncodingError(`Unsupported content-encoding: ${encoding}`);
  }
}

/**
 * Read `stream` fully, decoding `contentEncoding`, never holding more than
 * `limit` bytes of either compressed or decompressed data.
 */
export async function readDecoded(stream: Readable, contentEncoding: string | undefined, limit: number): Promise<Buffer> {
  const encodings = (contentEncoding ?? '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'identity');
  let raw = await readLimited(stream, limit);
  // Content-Encoding lists codings in the order applied; undo in reverse.
  for (const enc of encodings.reverse()) {
    raw = await decodeBuffer(raw, enc, limit);
  }
  return raw;
}

async function decodeBuffer(buf: Buffer, enc: string, limit: number): Promise<Buffer> {
  const dec = decoderFor(enc);
  if (!dec) return buf;
  try {
    return await pipeLimited(buf, dec, limit);
  } catch (err) {
    if (enc === 'deflate' && !(err instanceof BodyTooLargeError)) {
      return pipeLimited(buf, zlib.createInflateRaw(), limit);
    }
    throw err;
  }
}

function pipeLimited(input: Buffer, dec: NodeJS.ReadWriteStream, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;
    dec.on('data', (c: Buffer) => {
      if (done) return;
      total += c.length;
      if (total > limit) {
        done = true;
        (dec as unknown as { destroy(): void }).destroy();
        reject(new BodyTooLargeError(limit));
        return;
      }
      chunks.push(c);
    });
    dec.on('end', () => {
      if (!done) {
        done = true;
        resolve(Buffer.concat(chunks, total));
      }
    });
    dec.on('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
    dec.end(input);
  });
}

export function readLimited(stream: Readable, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;
    stream.on('data', (c: Buffer) => {
      if (done) return;
      total += c.length;
      if (total > limit) {
        done = true;
        stream.destroy();
        reject(new BodyTooLargeError(limit));
        return;
      }
      chunks.push(c);
    });
    stream.on('end', () => {
      if (!done) {
        done = true;
        resolve(Buffer.concat(chunks, total));
      }
    });
    stream.on('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
    stream.on('close', () => {
      if (!done) {
        done = true;
        reject(new Error('Upstream connection closed before the response completed.'));
      }
    });
    // The stream may have been paused (e.g. after content sniffing); adding a
    // 'data' listener doesn't restart an explicitly paused stream.
    stream.resume();
  });
}

/**
 * Decode bytes to a string using, in order: BOM, Content-Type charset,
 * <meta charset> / @charset sniffing in the first 2 KB, then UTF-8.
 */
export function decodeText(buf: Buffer, contentType: string | undefined, kind: 'html' | 'css'): string {
  let label: string | undefined;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) label = 'utf-8';
  else if (buf[0] === 0xfe && buf[1] === 0xff) label = 'utf-16be';
  else if (buf[0] === 0xff && buf[1] === 0xfe) label = 'utf-16le';
  if (!label) label = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? '')?.[1];
  if (!label) {
    const head = buf.subarray(0, 2048).toString('latin1');
    if (kind === 'html') {
      label =
        /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1] ??
        undefined;
    } else {
      label = /^@charset\s+"([\w.:-]+)"/i.exec(head)?.[1];
    }
  }
  try {
    return new TextDecoder(label ?? 'utf-8', { fatal: false, ignoreBOM: false }).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

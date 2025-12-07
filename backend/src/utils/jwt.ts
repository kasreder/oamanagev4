import crypto from 'crypto';

type JwtPayload = Record<string, unknown>;

const base64UrlEncode = (input: Buffer | string): string => {
  const source = typeof input === 'string' ? Buffer.from(input) : input;
  return source
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (input: string): Buffer => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
};

const safeJsonParse = (data: Buffer): JwtPayload | null => {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
};

export const signToken = (
  payload: JwtPayload,
  secret: string,
  expiresInSeconds: number
): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = { ...payload, exp };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(body));
  const data = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
};

export const verifyToken = (
  token: string,
  secret: string
): JwtPayload | null => {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB4, signature] = parts as [string, string, string];
  const payloadB64 = payloadB4;
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (expected !== signature) {
    return null;
  }

  const payload = safeJsonParse(base64UrlDecode(payloadB64));

  if (!payload) {
    return null;
  }

  const { exp } = payload;
  if (typeof exp === 'number' && Date.now() / 1000 > exp) {
    return null;
  }

  return payload;
};

import { JwtPayload } from '@core/models';

/** Decode JWT payload (no signature verification — UI/session helpers only). */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, body] = token.split('.');
    if (!body) return null;
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

import { KeyObject, createSign, generateKeyPairSync } from 'node:crypto';

/**
 * Local RSA keypairs used to sign "session" JWTs.
 *
 * Clerk's session tokens are RS256 JWTs signed by Clerk's private keys and
 * verified with a public key. The API is configured (CLERK_JWT_KEY) with the
 * matching public PEM so that @clerk/backend verifies networklessly via
 * verifyToken -> verifyJwt -> hasValidSignature. These tests exercise that
 * real verification path using locally generated keys.
 */
export const VALID_KEYPAIR = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const rogueKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });

export const CLERK_JWT_KEY_PEM: string = (() => {
  const pem = VALID_KEYPAIR.publicKey.export({ type: 'spki', format: 'pem' });
  return typeof pem === 'string' ? pem : pem.toString('utf8');
})();

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Signs a Clerk-shaped session JWT with the given private key.
 *
 * The token is verified in the API via the real @clerk/backend verification
 * path: signature (RS256 over the PEM public key), subject (sub), and the
 * exp/nbf/iat timestamps.
 */
export function signSessionToken(
  key: KeyObject,
  payload: Record<string, unknown>
): string {
  const now = Math.floor(Date.now() / 1000);
  const body: Record<string, unknown> = {
    sid: `sess_test_${Math.floor(Math.random() * 1e9)}`,
    iat: now - 5,
    nbf: now - 5,
    exp: now + 3600,
    ...payload,
  };

  const header = { alg: 'RS256', typ: 'JWT', kid: 'test-signing-key' };
  const signingInput = `${base64url(header)}.${base64url(body)}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key, 'base64url');

  return `${signingInput}.${signature}`;
}
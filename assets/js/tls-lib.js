// Real WebCrypto handshakes, simplified only where labelled: RSA-OAEP instead of
// PKCS#1 v1.5, and HKDF with short labels instead of the TLS PRF / key schedule.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function subtle() {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto unavailable');
  return globalThis.crypto.subtle;
}

export function randomBytes(n) {
  let b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function concat(...parts) {
  let size = 0;
  for (let p of parts) size += p.length;
  let out = new Uint8Array(size);
  let at = 0;
  for (let p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function sha256(data) {
  return new Uint8Array(await subtle().digest('SHA-256', data));
}

async function hkdf(ikm, salt, label, bits) {
  let key = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  let out = await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: ENC.encode(label) }, key, bits);
  return new Uint8Array(out);
}

async function seal(rawKey, iv, plain) {
  let key = await subtle().importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  return new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, plain));
}

async function unseal(rawKey, iv, sealed) {
  let key = await subtle().importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, key, sealed));
}

async function hmac(rawKey, data) {
  let key = await subtle().importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle().sign('HMAC', key, data));
}

function base64urlToBytes(s) {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  let bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const REQUEST = 'GET /secret';

// TLS 1.2 with RSA key transport. Eve keeps every byte that crossed the wire;
// after the server's private key leaks she replays the server's own work.
export async function tls12Session() {
  let server = await subtle().generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  let jwk = await subtle().exportKey('jwk', server.publicKey);
  let modulus = base64urlToBytes(jwk.n);

  let rC = randomBytes(32);
  let rS = randomBytes(32);
  let pms = randomBytes(48);
  pms[0] = 3;
  pms[1] = 3;
  let encPms = new Uint8Array(await subtle().encrypt({ name: 'RSA-OAEP' }, server.publicKey, pms));

  let salt = concat(rC, rS);
  let label = 'tls12 traffic key';
  let clientKey = await hkdf(pms, salt, label, 128);
  let serverPms = new Uint8Array(await subtle().decrypt({ name: 'RSA-OAEP' }, server.privateKey, encPms));
  let serverKey = await hkdf(serverPms, salt, label, 128);

  let finIv = randomBytes(12);
  let finished = await seal(clientKey, finIv, await hmac(clientKey, concat(rC, rS, encPms)));

  let iv = randomBytes(12);
  let request = await seal(clientKey, iv, ENC.encode(REQUEST));
  let serverReads = DEC.decode(await unseal(serverKey, iv, request));

  let evePms = new Uint8Array(await subtle().decrypt({ name: 'RSA-OAEP' }, server.privateKey, encPms));
  let eveKey = await hkdf(evePms, concat(rC, rS), label, 128);
  let eveReads = DEC.decode(await unseal(eveKey, iv, request));

  return {
    rC,
    rS,
    modulus,
    pms,
    encPms,
    clientKey,
    serverKey,
    keysMatch: equalBytes(clientKey, serverKey),
    finished,
    iv,
    request,
    serverReads,
    evePms,
    eveKey,
    eveReads,
  };
}

const CV_CONTEXT = concat(new Uint8Array(64).fill(0x20), ENC.encode('TLS 1.3, server CertificateVerify'), new Uint8Array([0]));

// TLS 1.3 with ephemeral ECDH. The ephemeral private keys never leave this
// function, which is what "discarded after the handshake" means here.
export async function tls13Session() {
  let ecdh = { name: 'ECDH', namedCurve: 'P-256' };
  let ecdsa = { name: 'ECDSA', namedCurve: 'P-256' };
  let client = await subtle().generateKey(ecdh, true, ['deriveBits']);
  let server = await subtle().generateKey(ecdh, true, ['deriveBits']);
  let identity = await subtle().generateKey(ecdsa, true, ['sign', 'verify']);

  let gx = new Uint8Array(await subtle().exportKey('raw', client.publicKey));
  let gy = new Uint8Array(await subtle().exportKey('raw', server.publicKey));
  let rC = randomBytes(32);
  let rS = randomBytes(32);
  let clientHello = concat(ENC.encode('ClientHello'), rC, gx);
  let serverHello = concat(ENC.encode('ServerHello'), rS, gy);
  let helloHash = await sha256(concat(clientHello, serverHello));

  let zClient = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: server.publicKey }, client.privateKey, 256));
  let zServer = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: client.publicKey }, server.privateKey, 256));
  let hsClient = await hkdf(zClient, helloHash, 'tls13 hs traffic', 128);
  let hsServer = await hkdf(zServer, helloHash, 'tls13 hs traffic', 128);

  let cert = new Uint8Array(await subtle().exportKey('spki', identity.publicKey));
  let certIv = randomBytes(12);
  let encCert = await seal(hsServer, certIv, cert);
  let certHash = await sha256(concat(clientHello, serverHello, cert));

  let signature = new Uint8Array(
    await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, concat(CV_CONTEXT, certHash)),
  );
  let signatureOk = await subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, identity.publicKey, signature, concat(CV_CONTEXT, certHash));
  let cvIv = randomBytes(12);
  let encCv = await seal(hsServer, cvIv, signature);

  let cvHash = await sha256(concat(clientHello, serverHello, cert, signature));
  let finKeyServer = await hkdf(zServer, helloHash, 'tls13 finished', 256);
  let finKeyClient = await hkdf(zClient, helloHash, 'tls13 finished', 256);
  let finished = await hmac(finKeyServer, cvHash);
  let finishedOk = equalBytes(finished, await hmac(finKeyClient, cvHash));
  let finIv = randomBytes(12);
  let encFin = await seal(hsServer, finIv, finished);

  let appClient = await hkdf(zClient, cvHash, 'tls13 ap traffic', 128);
  let appServer = await hkdf(zServer, cvHash, 'tls13 ap traffic', 128);
  let iv = randomBytes(12);
  let request = await seal(appClient, iv, ENC.encode(REQUEST));
  let serverReads = DEC.decode(await unseal(appServer, iv, request));

  // After the leak Eve holds identity.privateKey: she can sign for a session that
  // has not happened yet, but nothing she recorded contains z.
  let futureHash = await sha256(randomBytes(64));
  let forged = new Uint8Array(
    await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, identity.privateKey, concat(CV_CONTEXT, futureHash)),
  );
  let forgedOk = await subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, identity.publicKey, forged, concat(CV_CONTEXT, futureHash));

  return {
    rC,
    rS,
    gx,
    gy,
    z: zClient,
    zMatch: equalBytes(zClient, zServer),
    hsKey: hsClient,
    encCert,
    signature,
    signatureOk,
    encCv,
    finished,
    finishedOk,
    encFin,
    appKey: appClient,
    iv,
    request,
    serverReads,
    futureHash,
    forged,
    forgedOk,
  };
}

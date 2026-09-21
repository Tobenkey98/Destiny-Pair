const CRYPTO_KEY =
  import.meta.env.VITE_FLW_ENCRYPTION_KEY ||
  (typeof process !== "undefined" && process.env?.REACT_APP_FLW_ENCRYPTION_KEY) ||
  "";

const NONCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function getEncryptionKey() {
  return CRYPTO_KEY;
}

export function generateNonce(length = 12) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) out += NONCE_CHARS[bytes[i] % NONCE_CHARS.length];
  return out;
}

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function getCryptoKey(encryptionKey) {
  return crypto.subtle.importKey(
    "raw",
    decodeBase64(encryptionKey),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
}

async function encryptValue(value, cryptoKey, nonce) {
  const data = typeof value === "string" ? value : JSON.stringify(value);
  const iv = new TextEncoder().encode(nonce);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(data),
  );
  return toBase64(encrypted);
}

export async function encryptAES(dataObject, encryptionKey, nonce) {
  const cryptoKey = await getCryptoKey(encryptionKey);
  return encryptValue(dataObject, cryptoKey, nonce);
}

export async function encryptCard(cardDetails, encryptionKey, nonce = generateNonce()) {
  const cryptoKey = await getCryptoKey(encryptionKey);
  return {
    encrypted_data: {
      encrypted_card_number: await encryptValue(cardDetails.card_number, cryptoKey, nonce),
      encrypted_expiry_month: await encryptValue(cardDetails.expiry_month, cryptoKey, nonce),
      encrypted_expiry_year: await encryptValue(cardDetails.expiry_year, cryptoKey, nonce),
      encrypted_cvv: await encryptValue(cardDetails.cvv, cryptoKey, nonce),
    },
    nonce,
  };
}
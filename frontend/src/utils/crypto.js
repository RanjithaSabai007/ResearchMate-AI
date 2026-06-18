import CryptoJS from 'crypto-js';

// The key used must match backend's key (exactly 32 bytes)
const KEY_STRING = import.meta.env.VITE_ENCRYPTION_KEY || "ResearchMateAISecretKey32Bytes!!";
const KEY = CryptoJS.enc.Utf8.parse(KEY_STRING.substring(0, 32).padEnd(32, '!'));

/**
 * Encrypt standard plaintext using AES-256-CBC with a random 16-byte IV.
 * Prepends the IV to the ciphertext and returns a single Base64 encoded string.
 */
export const encryptPayload = (plainText) => {
  try {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plainText, KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV (first 16 bytes) and Ciphertext
    const combined = iv.clone().concat(encrypted.ciphertext);
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Payload encryption failed");
  }
};

/**
 * Decrypts a Base64 encoded string where the first 16 bytes are the random IV,
 * and the rest is the AES-256-CBC encrypted ciphertext.
 */
export const decryptPayload = (base64String) => {
  try {
    const combined = CryptoJS.enc.Base64.parse(base64String);
    
    // Extract 16-byte IV (4 words in CryptoJS)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    
    // Extract Ciphertext
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plainText) {
      throw new Error("Decrypted result is empty");
    }
    return plainText;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Payload decryption failed");
  }
};

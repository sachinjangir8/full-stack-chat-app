/**
 * E2EE Utility using Web Crypto API
 * Implements ECDH for key exchange and AES-GCM for encryption.
 */

const KEY_PAIR_ALGO = {
    name: "ECDH",
    namedCurve: "P-256",
};

const SYMMETRIC_ALGO = {
    name: "AES-GCM",
    length: 256,
};

/**
 * Generate a new ECDH key pair
 */
export const generateKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
        KEY_PAIR_ALGO,
        true, // extractable
        ["deriveKey", "deriveBits"]
    );

    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    return {
        publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
        privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
    };
};

/**
 * Derive a shared secret key from local private key and remote public key
 */
export const deriveKey = async (localPrivateKeyB64, remotePublicKeyB64) => {
    const privateKeyBuffer = Uint8Array.from(atob(localPrivateKeyB64), (c) => c.charCodeAt(0));
    const publicKeyBuffer = Uint8Array.from(atob(remotePublicKeyB64), (c) => c.charCodeAt(0));

    const localPrivateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        KEY_PAIR_ALGO,
        false,
        ["deriveKey"]
    );

    const remotePublicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyBuffer,
        KEY_PAIR_ALGO,
        true,
        []
    );

    return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: remotePublicKey },
        localPrivateKey,
        SYMMETRIC_ALGO,
        true,
        ["encrypt", "decrypt"]
    );
};

/**
 * Encrypt text using a shared key
 */
export const encryptMessage = async (text, sharedKey) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedKey,
        encodedText
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv)),
    };
};

/**
 * Decrypt text using a shared key
 */
export const decryptMessage = async (encryptedData, sharedKey) => {
    try {
        const { ciphertext, iv } = encryptedData;
        const ciphertextBuffer = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
        const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer },
            sharedKey,
            ciphertextBuffer
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error("Decryption failed:", error);
        return "[Encrypted Message]";
    }
};

const VAULT_KEY = 'bs_vault';
const SALT_KEY = 'bs_vault_salt';
const PBKDF2_ITER = 100_000;
const ENC_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;

let _sessionKey = null;

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => { _sessionKey = null; });
}

function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

function getOrCreateSalt() {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        salt = bufToB64(bytes);
        localStorage.setItem(SALT_KEY, salt);
    }
    return b64ToBuf(salt);
}

export async function unlockVault(password) {
    const salt = getOrCreateSalt();
    const enc = new TextEncoder();

    const baseKey = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );

    _sessionKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
        baseKey,
        { name: ENC_ALGO, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

export function lockVault() {
    _sessionKey = null;
}

export function isVaultUnlocked() {
    return _sessionKey !== null;
}

export function hasVault() {
    return !!localStorage.getItem(VAULT_KEY);
}

export async function saveSecret(secret) {
    if (!_sessionKey) throw new Error('Vault is locked');

    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
        { name: ENC_ALGO, iv },
        _sessionKey,
        enc.encode(secret)
    );

    const blob = {
        iv: bufToB64(iv),
        ciphertext: bufToB64(ciphertext),
        version: 1
    };

    localStorage.setItem(VAULT_KEY, JSON.stringify(blob));
}

export async function loadSecret() {
    if (!_sessionKey) throw new Error('Vault is locked');

    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;

    const { iv, ciphertext } = JSON.parse(raw);

    const plain = await crypto.subtle.decrypt(
        { name: ENC_ALGO, iv: b64ToBuf(iv) },
        _sessionKey,
        b64ToBuf(ciphertext)
    );

    return new TextDecoder().decode(plain);
}

export function clearVault() {
    localStorage.removeItem(VAULT_KEY);
    localStorage.removeItem(SALT_KEY);
    _sessionKey = null;
}

export async function migrateFromLocalStorage() {
    const existing = sessionStorage.getItem('bs_api_key') || localStorage.getItem('bs_api_key');
    if (existing && !hasVault()) {
        await saveSecret(existing);
        sessionStorage.removeItem('bs_api_key');
        localStorage.removeItem('bs_api_key');
    }
}

export function getStoredProvider() {
    return sessionStorage.getItem('bs_provider') || localStorage.getItem('bs_provider') || 'openai';
}

export function getStoredModel() {
    return sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model') || 'gpt-4o-mini';
}

export function getStoredOllamaUrl() {
    return sessionStorage.getItem('bs_ollama_url') || localStorage.getItem('bs_ollama_url');
}

export async function getEffectiveApiKey(provider) {
    if (isVaultUnlocked()) {
        const fromVault = await loadSecret();
        if (fromVault) return fromVault;
    }
    if (hasVault() && !isVaultUnlocked()) return null;
    if (provider === 'ollama') {
        return getStoredOllamaUrl();
    }
    return sessionStorage.getItem('bs_api_key') || localStorage.getItem('bs_api_key');
}

export function getStoredCorsProxy() {
    return sessionStorage.getItem('bs_cors_proxy') || localStorage.getItem('bs_cors_proxy') || '';
}

export function saveStoredCorsProxy(url) {
    const cleanUrl = url ? url.trim() : '';
    sessionStorage.setItem('bs_cors_proxy', cleanUrl);
    localStorage.setItem('bs_cors_proxy', cleanUrl);
}

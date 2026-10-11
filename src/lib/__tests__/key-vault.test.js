import { describe, it, expect, beforeEach } from 'vitest';
import {
    unlockVault,
    lockVault,
    isVaultUnlocked,
    hasVault,
    saveSecret,
    loadSecret,
    clearVault,
    getEffectiveApiKey,
    saveStoredCorsProxy,
    getStoredCorsProxy
} from '../key-vault';

describe('key-vault', () => {
    beforeEach(() => {
        clearVault();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('should initialize with locked vault and no vault stored', () => {
        expect(isVaultUnlocked()).toBe(false);
        expect(hasVault()).toBe(false);
    });

    it('should throw error when saving or loading without unlocking', async () => {
        await expect(saveSecret('my-secret-key')).rejects.toThrow('Vault is locked');
        await expect(loadSecret()).rejects.toThrow('Vault is locked');
    });

    it('should encrypt and decrypt a secret successfully with password', async () => {
        await unlockVault('strong-password-123');
        expect(isVaultUnlocked()).toBe(true);

        await saveSecret('sk-test-secret-api-key');
        expect(hasVault()).toBe(true);

        const loaded = await loadSecret();
        expect(loaded).toBe('sk-test-secret-api-key');
    });

    it('should lock vault and reject wrong password decryption', async () => {
        await unlockVault('correct-password');
        await saveSecret('secret-token');

        lockVault();
        expect(isVaultUnlocked()).toBe(false);

        // Wrong password is rejected and must not leave the vault unlocked
        await expect(unlockVault('wrong-password')).rejects.toThrow();
        expect(isVaultUnlocked()).toBe(false);

        // Correct password still works
        await unlockVault('correct-password');
        expect(await loadSecret()).toBe('secret-token');
    });

    it('should still unlock a legacy vault created with 100k iterations', async () => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
        const baseKey = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode('old-pass'), 'PBKDF2', false, ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
            baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
        );
        const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, key, new TextEncoder().encode('legacy-secret')
        );
        localStorage.setItem('bs_vault_salt', b64(salt));
        // Legacy blob: no `iterations` field, version 1
        localStorage.setItem('bs_vault', JSON.stringify({ iv: b64(iv), ciphertext: b64(ct), version: 1 }));

        await unlockVault('old-pass');
        expect(await loadSecret()).toBe('legacy-secret');
    });

    it('should support clearing vault', async () => {
        await unlockVault('password');
        await saveSecret('secret-token');
        expect(hasVault()).toBe(true);

        clearVault();
        expect(hasVault()).toBe(false);
        expect(isVaultUnlocked()).toBe(false);
    });

    it('should getEffectiveApiKey correctly across vault and fallback storages', async () => {
        // Fallback when no vault exists
        localStorage.setItem('bs_api_key', 'plain-api-key');
        let key = await getEffectiveApiKey('openai');
        expect(key).toBe('plain-api-key');

        // When vault is unlocked
        await unlockVault('pass');
        await saveSecret('vaulted-key');
        key = await getEffectiveApiKey('openai');
        expect(key).toBe('vaulted-key');

        // When vault exists but locked
        lockVault();
        key = await getEffectiveApiKey('openai');
        expect(key).toBeNull();
    });

    it('should save and retrieve CORS proxy properly', () => {
        saveStoredCorsProxy('  https://my-proxy.com/  ');
        expect(getStoredCorsProxy()).toBe('https://my-proxy.com/');
    });
});

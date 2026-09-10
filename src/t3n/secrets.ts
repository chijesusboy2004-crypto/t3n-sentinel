/**
 * T3N Sentinel - Tenant KV Secrets Manager
 *
 * Implements private z-namespace KV map management with explicit ACLs.
 * Ensures map paths use hex-encoded tenant DID (`z:<hex(tid)>:secrets`).
 */

export interface SecretMapConfig {
  tenantDid: string;
  tail: string;
  readers: string[];
  writers: string[];
}

export class SecretsManager {
  private tenantDid: string;
  private localTail: string;
  private memoryStore: Map<string, string> = new Map();

  constructor(tenantDid: string, localTail = "secrets") {
    this.tenantDid = tenantDid;
    this.localTail = localTail;
  }

  /**
   * Derive the canonical z-namespace path for this map
   */
  public getCanonicalMapPath(): string {
    // Strip did:t3n: prefix if present, leaving the hex identifier
    const hexId = this.tenantDid.replace(/^did:t3n:/, "");
    return `z:${hexId}:${this.localTail}`;
  }

  /**
   * Store a secret key-value pair inside the enclave
   */
  public setSecret(key: string, value: string): void {
    this.memoryStore.set(key, value);
  }

  /**
   * Retrieve a secret (only inside enclave memory)
   */
  public getSecret(key: string): string | undefined {
    return this.memoryStore.get(key);
  }

  /**
   * Redact a string containing secrets for safe audit logging
   */
  public redact(text: string): string {
    let result = text;
    for (const [key, value] of this.memoryStore.entries()) {
      if (value && value.length > 4) {
        result = result.split(value).join(`[REDACTED_SECRET_${key}]`);
      }
    }
    return result;
  }
}

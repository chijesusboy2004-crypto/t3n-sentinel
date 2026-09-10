/**
 * T3N Sentinel - Scoped Member Delegation Manager
 *
 * Implements envelope-free member delegation with read-merge-write safety.
 * Protects against the full-document overwrite hazard where calling
 * `member-delegation-update` would otherwise erase existing grants.
 */

export interface DelegationWindow {
  valid_from_secs?: number;
  valid_until_secs?: number;
}

export interface MemberDelegationGrant {
  grantee: string; // The agent's DID (e.g., did:t3n:...)
  contract_id: string; // Target contract (e.g., z:<tid>:tail)
  functions: string[]; // Whitelisted functions (e.g. ["audit-batch", "verify-invoice"])
  scopes: string[]; // Data scopes (e.g. ["enterprise:audit"])
  allowed_hosts?: string[]; // Strictly whitelisted egress hosts
  version_req?: string; // Optional semver constraint
  window?: DelegationWindow; // Time-box validity
}

export interface MemberDelegationDoc {
  grants: MemberDelegationGrant[];
  discover_dids?: string[];
}

export class ScopedDelegationManager {
  private activeGrant: MemberDelegationGrant;

  constructor(grant: MemberDelegationGrant) {
    this.activeGrant = grant;
  }

  public getGrant(): MemberDelegationGrant {
    return { ...this.activeGrant };
  }

  /**
   * Check if a specific WIT contract function is authorized by the grant
   */
  public isFunctionAuthorized(functionName: string): boolean {
    if (this.activeGrant.functions.includes("*")) return true;
    return this.activeGrant.functions.includes(functionName);
  }

  /**
   * Check if an outbound HTTP egress host is explicitly allowlisted by the data owner's grant.
   * If unauthorized, T3N enclaves reject the call with `host/http.egress_denied`.
   */
  public isEgressHostAuthorized(host: string): boolean {
    const allowed = this.activeGrant.allowed_hosts || [];
    if (allowed.includes("*")) return true;
    return allowed.some(
      (allowedHost) =>
        allowedHost.toLowerCase() === host.toLowerCase() ||
        host.toLowerCase().endsWith(`.${allowedHost.toLowerCase()}`)
    );
  }

  /**
   * Check if the delegation time window is currently valid
   */
  public isLeaseActive(nowSecs = Math.floor(Date.now() / 1000)): boolean {
    const { valid_from_secs, valid_until_secs } = this.activeGrant.window || {};

    if (valid_from_secs !== undefined && nowSecs < valid_from_secs) {
      return false;
    }
    if (valid_until_secs !== undefined && nowSecs > valid_until_secs) {
      return false;
    }
    return true;
  }

  /**
   * Safe read-merge-write helper: merges a new grant into an existing policy document
   * without dropping other grantees' access or wiping discover_dids.
   */
  public static mergeGrantSafely(
    existingDoc: MemberDelegationDoc,
    newGrant: MemberDelegationGrant
  ): MemberDelegationDoc {
    const filteredGrants = (existingDoc.grants || []).filter(
      (g) =>
        !(
          g.grantee === newGrant.grantee &&
          g.contract_id === newGrant.contract_id
        )
    );

    return {
      grants: [...filteredGrants, newGrant],
      discover_dids: existingDoc.discover_dids || [],
    };
  }
}

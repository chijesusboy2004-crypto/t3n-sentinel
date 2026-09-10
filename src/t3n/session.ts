import { EnclaveSession, TransportAdapter } from "./transportAdapter.js";
import { SentinelConfig } from "../config.js";

export class SessionManager {
  private config: SentinelConfig;
  private session: EnclaveSession | null = null;

  constructor(config: SentinelConfig) {
    this.config = config;
  }

  /**
   * Ensure an active enclave session is established
   */
  public async getSession(): Promise<EnclaveSession> {
    if (!this.session) {
      this.session = await TransportAdapter.initializeSession({
        mode: this.config.mode,
        env: this.config.env,
        apiKey: this.config.apiKey,
        agentKey: this.config.agentKey,
      });
    }
    return this.session;
  }

  public getDid(): string {
    if (!this.session) {
      throw new Error("Session has not been initialized. Call getSession() first.");
    }
    return this.session.did;
  }

  public isSimulated(): boolean {
    return this.session ? this.session.isSimulated : false;
  }
}

import {
  MockTransport,
  HttpTransport,
  setEnvironment,
  loadWasmComponent,
  getNodeUrl,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  T3nClient,
  fetchTrustedManifest,
} from "@terminal3/t3n-sdk";

export interface EnclaveSessionInit {
  mode: "auto" | "live" | "simulation";
  env: "testnet" | "sandbox" | "production";
  apiKey?: string;
  agentKey?: string;
}

export interface EnclaveSession {
  client: T3nClient;
  did: string;
  ethAddress: string;
  isSimulated: boolean;
  env: string;
  nodeUrl: string;
}

export class TransportAdapter {
  /**
   * Initialize a verified T3N enclave session
   */
  public static async initializeSession(
    config: EnclaveSessionInit
  ): Promise<EnclaveSession> {
    setEnvironment(config.env);
    const nodeUrl = getNodeUrl();
    const wasmComponent = await loadWasmComponent();

    // Determine whether to use Live or Simulation mode
    let useSimulation = config.mode === "simulation";

    if (config.mode === "auto") {
      if (!config.apiKey || config.apiKey.length < 10) {
        useSimulation = true;
      } else {
        try {
          // Probe testnet manifest with a quick timeout
          await fetchTrustedManifest(config.env, { timeout: 3000 } as any);
          useSimulation = false;
        } catch {
          // If remote trust manifest is unreachable or socket closes, fallback to simulation
          useSimulation = true;
        }
      }
    }

    if (useSimulation) {
      return this.createSimulatedSession(wasmComponent, config.env, nodeUrl);
    }

    return this.createLiveSession(
      wasmComponent,
      config.env,
      config.apiKey!,
      nodeUrl
    );
  }

  private static async createSimulatedSession(
    wasmComponent: any,
    env: string,
    nodeUrl: string
  ): Promise<EnclaveSession> {
    const mockTransport = new MockTransport();
    const simulatedDid = "did:t3n:7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a";
    const simulatedAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

    // Setup T3nClient with explicit unsafe_trust_server opt-out for local mock transport
    const client = new T3nClient({
      trustAnchor: { unsafe_trust_server: true },
      transport: mockTransport,
      wasmComponent,
    });

    return {
      client,
      did: simulatedDid,
      ethAddress: simulatedAddress,
      isSimulated: true,
      env,
      nodeUrl,
    };
  }

  private static async createLiveSession(
    wasmComponent: any,
    env: "testnet" | "sandbox" | "production",
    apiKey: string,
    nodeUrl: string
  ): Promise<EnclaveSession> {
    const address = eth_get_address(apiKey);
    const trustAnchor = await fetchTrustedManifest(env);

    const client = new T3nClient({
      trustAnchor,
      wasmComponent,
      handlers: {
        EthSign: metamask_sign(address, undefined, apiKey),
      },
    });

    await client.handshake();
    const authResult = await client.authenticate(createEthAuthInput(address));
    const did = authResult.value;

    return {
      client,
      did,
      ethAddress: address,
      isSimulated: false,
      env,
      nodeUrl,
    };
  }
}

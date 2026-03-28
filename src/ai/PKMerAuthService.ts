import { Notice, Platform, requestUrl } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { getPKMerAuthorizationEntryUrl } from "./pkmerWeb";
import { PKMER_OAUTH_CONFIG, PKMER_SECRET_KEYS, type PKMerUserInfo } from "./types";

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export class PKMerAuthService {
  private plugin: EditingToolbarPlugin;
  private cachedVerified: boolean | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private callbackServer: any = null;
  private pendingCodeVerifier: string | null = null;
  private pendingState: string | null = null;
  private memAccessToken: string | null = null;
  private memRefreshToken: string | null = null;
  private memAiToken: string | null = null;
  private memCustomModelApiKey: string | null = null;

  constructor(plugin: EditingToolbarPlugin) {
    this.plugin = plugin;
  }

  private get secrets() {
    return (this.plugin.app as any).secretStorage;
  }

  private get supportsSecretStorage(): boolean {
    return !!this.secrets && typeof this.secrets.getSecret === "function" && typeof this.secrets.setSecret === "function";
  }

  loadSecrets(): void {
    if (!this.supportsSecretStorage) return;
    this.memAccessToken = this.secrets.getSecret(PKMER_SECRET_KEYS.accessToken) ?? null;
    this.memRefreshToken = this.secrets.getSecret(PKMER_SECRET_KEYS.refreshToken) ?? null;
    this.memAiToken = this.secrets.getSecret(PKMER_SECRET_KEYS.aiToken) ?? null;
    this.memCustomModelApiKey = this.secrets.getSecret(PKMER_SECRET_KEYS.customModelApiKey) ?? null;
  }

  private setAccessToken(token: string): void {
    this.memAccessToken = token;
    if (this.supportsSecretStorage) this.secrets.setSecret(PKMER_SECRET_KEYS.accessToken, token);
  }

  private setRefreshToken(token: string): void {
    this.memRefreshToken = token;
    if (this.supportsSecretStorage) this.secrets.setSecret(PKMER_SECRET_KEYS.refreshToken, token);
  }

  private setAiToken(token: string): void {
    this.memAiToken = token;
    if (this.supportsSecretStorage) this.secrets.setSecret(PKMER_SECRET_KEYS.aiToken, token);
  }

  private clearSecrets(): void {
    this.memAccessToken = null;
    this.memRefreshToken = null;
    this.memAiToken = null;
    this.memCustomModelApiKey = null;
    if (this.supportsSecretStorage) {
      this.secrets.setSecret(PKMER_SECRET_KEYS.accessToken, "");
      this.secrets.setSecret(PKMER_SECRET_KEYS.refreshToken, "");
      this.secrets.setSecret(PKMER_SECRET_KEYS.aiToken, "");
      this.secrets.setSecret(PKMER_SECRET_KEYS.customModelApiKey, "");
    }
  }

  get accessToken(): string {
    return this.memAccessToken ?? "";
  }

  get aiToken(): string {
    return this.memAiToken ?? "";
  }

  get customModelApiKey(): string {
    return this.memCustomModelApiKey ?? "";
  }

  get hasSecureStorage(): boolean {
    return this.supportsSecretStorage;
  }

  async migrateCustomModelApiKeyFromSettings(): Promise<void> {
    const legacyApiKey = this.plugin.settings.ai.customModel.apiKey?.trim();
    if (!legacyApiKey || !this.supportsSecretStorage) {
      return;
    }

    this.setCustomModelApiKey(legacyApiKey);
    this.plugin.settings.ai.customModel.apiKey = "";
    await this.plugin.saveSettings();
  }

  setCustomModelApiKey(apiKey: string): void {
    const normalized = apiKey.trim();
    this.memCustomModelApiKey = normalized || null;
    if (this.supportsSecretStorage) {
      this.secrets.setSecret(PKMER_SECRET_KEYS.customModelApiKey, normalized);
    }
  }

  clearCustomModelApiKey(): void {
    this.memCustomModelApiKey = null;
    if (this.supportsSecretStorage) {
      this.secrets.setSecret(PKMER_SECRET_KEYS.customModelApiKey, "");
    }
  }

  async verify(): Promise<boolean> {
    const pkmer = this.plugin.settings.ai.pkmer;
    if (!this.memAccessToken) {
      this.cachedVerified = false;
      return false;
    }
    if (pkmer.tokenExpiresAt && Date.now() < pkmer.tokenExpiresAt) {
      this.cachedVerified = true;
      return true;
    }
    if (this.memRefreshToken) {
      const refreshed = await this.refreshTokens();
      this.cachedVerified = refreshed;
      return refreshed;
    }
    this.cachedVerified = false;
    return false;
  }

  async verifyWithResult(): Promise<{ verified: boolean; userInfo: PKMerUserInfo | null; expiresAt: number }> {
    const verified = await this.verify();
    return {
      verified,
      userInfo: this.plugin.settings.ai.pkmer.userInfo ?? null,
      expiresAt: this.plugin.settings.ai.pkmer.tokenExpiresAt ?? 0,
    };
  }

  async login(): Promise<void> {
    if (!this.supportsSecretStorage) {
      new Notice(t("Current Obsidian version does not support secure token storage."));
      return;
    }

    const state = this.generateRandom();
    const codeVerifier = this.generateRandom();
    this.pendingCodeVerifier = codeVerifier;
    this.pendingState = state;
    const codeChallenge = await this.computeCodeChallenge(codeVerifier);

    const authorizationParams = new URLSearchParams({
      response_type: "code",
      client_id: PKMER_OAUTH_CONFIG.clientId,
      redirect_uri: Platform.isMobile
        ? PKMER_OAUTH_CONFIG.mobileRedirectUri
        : PKMER_OAUTH_CONFIG.desktopRedirectUri,
      scope: PKMER_OAUTH_CONFIG.scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    const authorizationUrl = `${PKMER_OAUTH_CONFIG.authorizationUrl}?${authorizationParams.toString()}`;
    const loginEntryUrl = getPKMerAuthorizationEntryUrl(authorizationUrl);

    if (Platform.isMobile) {
      window.open(loginEntryUrl);
      setTimeout(() => {
        if (this.pendingState === state) {
          this.pendingState = null;
          this.pendingCodeVerifier = null;
        }
      }, 5 * 60 * 1000);
      return;
    }

    const codePromise = this.startCallbackServer(state);
    window.open(loginEntryUrl);

    try {
      const code = await codePromise;
      if (!code) {
        this.pendingCodeVerifier = null;
        this.pendingState = null;
        new Notice(t("Login cancelled or timed out."));
        return;
      }

      const success = await this.exchangeCodeForTokens(code, PKMER_OAUTH_CONFIG.desktopRedirectUri);
      if (success) {
        await this.fetchUserInfo();
        new Notice(t("Successfully logged in to PKMer!"));
      } else {
        new Notice(t("Failed to complete login. Please try again."));
      }
    } catch (error) {
      console.error("PKMer OAuth login error:", error);
      new Notice(t("Login failed. Please try again."));
    } finally {
      this.pendingCodeVerifier = null;
      this.pendingState = null;
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<boolean> {
    if (!this.pendingState || state !== this.pendingState) {
      new Notice(t("OAuth state mismatch. Please try logging in again."));
      this.pendingState = null;
      this.pendingCodeVerifier = null;
      return false;
    }

    try {
      const success = await this.exchangeCodeForTokens(code, PKMER_OAUTH_CONFIG.mobileRedirectUri);
      if (success) {
        await this.fetchUserInfo();
        new Notice(t("Successfully logged in to PKMer!"));
        return true;
      }
      new Notice(t("Failed to complete login. Please try again."));
      return false;
    } catch (error) {
      console.error("PKMer OAuth callback error:", error);
      new Notice(t("Login failed. Please try again."));
      return false;
    } finally {
      this.pendingState = null;
      this.pendingCodeVerifier = null;
    }
  }

  async logout(): Promise<void> {
    this.clearSecrets();
    this.plugin.settings.ai.pkmer = {
      ...this.plugin.settings.ai.pkmer,
      tokenExpiresAt: 0,
      userInfo: null,
    };
    this.cachedVerified = false;
    await this.plugin.saveSettings();
    new Notice(t("Logged out from PKMer."));
  }

  async refreshQuota(): Promise<{ quota: number; remainingQuota: number } | null> {
    const valid = await this.verify();
    if (!valid) return null;
    await this.fetchUserInfo();
    return (this.plugin.settings.ai.pkmer.userInfo?.ai_quota as { quota: number; remainingQuota: number } | undefined) ?? null;
  }

  onunload(): void {
    this.closeCallbackServer();
  }

  private async computeCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
    return base64url(digest);
  }

  private startCallbackServer(expectedState: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const http = (window as any).require("node:http");
        const server = http.createServer((req: any, res: any) => {
          const url = new URL(req.url, `http://localhost:${PKMER_OAUTH_CONFIG.callbackPort}`);

          if (url.pathname !== "/editing-toolbar/callback") {
            res.writeHead(404);
            res.end();
            return;
          }

          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");

          if (state !== expectedState) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<html><body><h2>State mismatch. Please try again.</h2></body></html>");
            resolve(null);
          } else if (code) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<html><body><h2>Login successful!</h2><p>You can close this window and return to Obsidian.</p><script>window.close()</script></body></html>");
            resolve(code);
          } else {
            const error = url.searchParams.get("error") || "unknown error";
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<html><body><h2>Login failed: ${error}</h2></body></html>`);
            resolve(null);
          }

          setTimeout(() => this.closeCallbackServer(), 500);
        });

        server.on("error", (error: any) => {
          console.error("Callback server error:", error);
          new Notice(`Failed to start login server: ${error.message}`);
          resolve(null);
        });

        server.listen(PKMER_OAUTH_CONFIG.callbackPort, "127.0.0.1");
        this.callbackServer = server;

        setTimeout(() => {
          if (this.callbackServer === server) {
            this.closeCallbackServer();
            resolve(null);
          }
        }, 5 * 60 * 1000);
      } catch (error) {
        console.error("Failed to start callback server:", error);
        resolve(null);
      }
    });
  }

  private closeCallbackServer(): void {
    if (!this.callbackServer) return;
    try {
      this.callbackServer.close();
    } catch {
      // ignore
    }
    this.callbackServer = null;
  }

  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<boolean> {
    try {
      const body: Record<string, string> = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: PKMER_OAUTH_CONFIG.clientId,
      };

      if (this.pendingCodeVerifier) {
        body.code_verifier = this.pendingCodeVerifier;
      }

      const response = await requestUrl({
        url: PKMER_OAUTH_CONFIG.tokenUrl,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });

      const data = response.json;
      if (!data.access_token) return false;

      this.setAccessToken(data.access_token);
      this.setRefreshToken(data.refresh_token || "");
      this.plugin.settings.ai.pkmer = {
        ...this.plugin.settings.ai.pkmer,
        tokenExpiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      await this.plugin.saveSettings();
      this.cachedVerified = true;
      return true;
    } catch (error) {
      console.error("Token exchange failed:", error);
      return false;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await requestUrl({
          url: PKMER_OAUTH_CONFIG.tokenUrl,
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.memRefreshToken || "",
            client_id: PKMER_OAUTH_CONFIG.clientId,
          }).toString(),
        });

        const data = response.json;
        if (!data.access_token) return false;

        this.setAccessToken(data.access_token);
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }

        this.plugin.settings.ai.pkmer = {
          ...this.plugin.settings.ai.pkmer,
          tokenExpiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        };
        await this.plugin.saveSettings();
        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        this.clearSecrets();
        this.plugin.settings.ai.pkmer = {
          ...this.plugin.settings.ai.pkmer,
          tokenExpiresAt: 0,
          userInfo: null,
        };
        await this.plugin.saveSettings();
        return false;
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async fetchUserInfo(): Promise<void> {
    try {
      const response = await requestUrl({
        url: PKMER_OAUTH_CONFIG.userinfoUrl,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.memAccessToken}`,
        },
      });

      const data = response.json;
      if (data.ai_token) {
        this.setAiToken(data.ai_token);
      }

      this.plugin.settings.ai.pkmer = {
        ...this.plugin.settings.ai.pkmer,
        userInfo: {
          sub: data.sub || data.id || "",
          name: data.name || data.preferred_username || data.username || undefined,
          email: data.email || undefined,
          avatar: data.picture || data.avatar || undefined,
          ai_quota: data.ai_quota || undefined,
          device_count: data.device_count ?? undefined,
          thino: data.thino ?? undefined,
          thinoWebExpir: data.thinoWebExpir ?? undefined,
          supporter: data.supporter ?? undefined,
        },
      };
      await this.plugin.saveSettings();
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    }
  }

  private generateRandom(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
  }
}

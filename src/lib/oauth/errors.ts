export class TokenExpiredError extends Error {
  public readonly accountId: string;
  public readonly provider: string;

  constructor(accountId: string, provider: string, message?: string) {
    super(message || "Token has expired or been revoked. Please reconnect your account.");
    this.name = "TokenExpiredError";
    this.accountId = accountId;
    this.provider = provider;
  }
}

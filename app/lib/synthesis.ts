/**
 * Server-side Synthesis API helper functions.
 * All calls to Synthesis happen here — never from the browser.
 */

const SYNTHESIS_BASE = 'https://api.synthesis.trade';

function getProjectApiKey(): string {
  const key = process.env.SYNTHESIS_API_KEY;
  if (!key) throw new Error('SYNTHESIS_API_KEY environment variable is not set');
  return key;
}

// ---------------------------------------------------------------------------
// Low-level fetch helpers
// ---------------------------------------------------------------------------

async function projectFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${SYNTHESIS_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-PROJECT-API-KEY': getProjectApiKey(),
      ...(options.headers || {}),
    },
  });
  return res;
}

async function accountFetch(apiKey: string, path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${SYNTHESIS_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...(options.headers || {}),
    },
  });
  return res;
}

// ---------------------------------------------------------------------------
// Account management (project-level auth)
// ---------------------------------------------------------------------------

interface CreateAccountResponse {
  account_id: string;
  [key: string]: unknown;
}

/**
 * Create a new Synthesis account, optionally linking it to a Privy user.
 */
export async function createSynthesisAccount(
  privyUserId?: string,
): Promise<CreateAccountResponse> {
  const body: Record<string, unknown> = {};
  if (privyUserId) {
    body.metadata = { privy_user_id: privyUserId };
  }

  const res = await projectFetch('/api/v1/project/account', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis create account failed: ${JSON.stringify(json)}`);
  }
  return json.response as CreateAccountResponse;
}

/**
 * Create an API key for a Synthesis account.
 * Returns { public_key, secret_key }.
 */
export async function createAccountApiKey(
  accountId: string,
): Promise<{ public_key: string; secret_key: string }> {
  const res = await projectFetch(`/api/v1/project/account/${accountId}/api-key`, {
    method: 'POST',
    body: JSON.stringify({ name: 'singl-app' }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis create API key failed: ${JSON.stringify(json)}`);
  }
  return json.response as { public_key: string; secret_key: string };
}

// ---------------------------------------------------------------------------
// Wallet management (account-level auth)
// ---------------------------------------------------------------------------

interface SynthesisWallet {
  wallet_id: string;
  chains: {
    POL?: { address: string };
    [chain: string]: { address: string } | undefined;
  };
}

/**
 * Get wallets for this account. Auto-creates first wallet if none exist.
 */
export async function getSynthesisWallet(
  accountApiKey: string,
): Promise<SynthesisWallet> {
  const res = await accountFetch(accountApiKey, '/api/v1/wallet', {
    method: 'GET',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis get wallet failed: ${JSON.stringify(json)}`);
  }

  const wallets = json.response as SynthesisWallet[];
  if (!wallets || wallets.length === 0) {
    throw new Error('Synthesis returned no wallets');
  }
  return wallets[0];
}

// ---------------------------------------------------------------------------
// Trading (account-level auth)
// ---------------------------------------------------------------------------

export interface OrderParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  amount: string;
  units: 'USDC' | 'SHARES';
  price?: string; // required for LIMIT orders
}

interface OrderResponse {
  order_id: string;
  status: string;
  [key: string]: unknown;
}

/**
 * Place an order on Polygon via Synthesis.
 */
export async function placeOrder(
  accountApiKey: string,
  walletId: string,
  params: OrderParams,
): Promise<OrderResponse> {
  const body: Record<string, string> = {
    token_id: params.tokenId,
    side: params.side,
    type: params.type,
    amount: params.amount,
    units: params.units,
  };
  if (params.price) {
    body.price = params.price;
  }

  const res = await accountFetch(
    accountApiKey,
    `/api/v1/wallet/pol/${walletId}/order`,
    { method: 'POST', body: JSON.stringify(body) },
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis place order failed: ${JSON.stringify(json)}`);
  }
  return json.response as OrderResponse;
}

/**
 * Get an order quote (preview) without executing.
 */
export async function getOrderQuote(
  accountApiKey: string,
  walletId: string,
  params: OrderParams,
): Promise<Record<string, unknown>> {
  const body: Record<string, string> = {
    token_id: params.tokenId,
    side: params.side,
    type: params.type,
    amount: params.amount,
    units: params.units,
  };
  if (params.price) {
    body.price = params.price;
  }

  const res = await accountFetch(
    accountApiKey,
    `/api/v1/wallet/pol/${walletId}/order/quote`,
    { method: 'POST', body: JSON.stringify(body) },
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis order quote failed: ${JSON.stringify(json)}`);
  }
  return json.response as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Positions & Balance (account-level auth)
// ---------------------------------------------------------------------------

export async function getPositions(
  accountApiKey: string,
  walletId: string,
): Promise<Record<string, unknown>[]> {
  const res = await accountFetch(
    accountApiKey,
    `/api/v1/wallet/pol/${walletId}/positions`,
    { method: 'GET' },
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis get positions failed: ${JSON.stringify(json)}`);
  }
  return json.response as Record<string, unknown>[];
}

export async function getBalance(
  accountApiKey: string,
  walletId: string,
): Promise<Record<string, unknown>> {
  const res = await accountFetch(
    accountApiKey,
    `/api/v1/wallet/${walletId}/balance`,
    { method: 'GET' },
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Synthesis get balance failed: ${JSON.stringify(json)}`);
  }
  return json.response as Record<string, unknown>;
}

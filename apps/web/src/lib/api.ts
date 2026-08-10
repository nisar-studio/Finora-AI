const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorPayload = {
  error?: { code?: string; message?: string };
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
    let body: ApiErrorPayload = {};
    try {
      body = (await response.json()) as ApiErrorPayload;
    } catch {
      body = {};
    }
    throw new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? `Request failed with status ${response.status}.`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
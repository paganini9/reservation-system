const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    credentials: 'include', // 쿠키 포함
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });

  const data = await res.json();

  if (!data.success) {
    const error = new Error(data.error?.message ?? '요청에 실패했습니다.') as any;
    error.code = data.error?.code;
    error.status = res.status;
    throw error;
  }

  return data.data as T;
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) =>
            request<T>(path, { method: 'GET', ...opts }),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch:  <T>(path: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) =>
            request<T>(path, { method: 'DELETE', ...opts }),
};

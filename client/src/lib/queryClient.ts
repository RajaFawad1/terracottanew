import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = (import.meta as any)?.env?.VITE_API_URL || "";

function withBase(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  const res = await fetch(withBase(url), {
    method,
    headers: {
      ...(!isFormData && data ? { "Content-Type": "application/json" } : {}),
      "Cache-Control": "no-store",
    },
    body: data
      ? isFormData
        ? (data as BodyInit)
        : JSON.stringify(data)
      : undefined,
    credentials: "include",
    cache: "no-store",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(withBase(queryKey.join("/") as string), {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

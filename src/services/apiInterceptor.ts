import { handleLocalApi } from './localBackend';

/**
 * Initializes transparent API fallback for Cloudflare Pages / Static Hosting.
 * If the server is not available or returns 404/HTML (as Cloudflare Pages static hosting does),
 * it seamlessly routes through the in-memory Cloudflare D1 compatibility backend.
 */
export function setupApiInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = (typeof window.fetch === 'function' ? window.fetch : fetch).bind(window);

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }

    // Only intercept requests destined for /api/*
    const isApiRequest =
      urlString.startsWith('/api/') ||
      urlString.includes(window.location.origin + '/api/');

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    // Try real fetch first
    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';

      // If response is valid JSON and not 404/502/HTML, return it
      if (
        response.status !== 404 &&
        response.status !== 502 &&
        !contentType.includes('text/html')
      ) {
        return response;
      }

      // If Cloudflare Pages returned 404 or index.html fallback for an API call, fallback to local backend
      // console.warn(`API route ${urlString} returned ${response.status} (${contentType}), using local client-side database.`);
    } catch (networkError) {
      // Network failure / offline: fallback to local database
      // console.warn(`Network error fetching ${urlString}, using local client-side database:`, networkError);
    }

    // Execute through local client backend
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    let parsedBody: any = undefined;

    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          parsedBody = JSON.parse(init.body);
        } else if (init.body instanceof FormData) {
          parsedBody = Object.fromEntries((init.body as any).entries());
        }
      } catch (e) {
        parsedBody = init.body;
      }
    }

    const { status, data } = await handleLocalApi(urlString, method, parsedBody);

    return new Response(JSON.stringify(data), {
      status,
      statusText: status === 200 || status === 201 ? 'OK' : 'Error',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Backend-Source': 'Cloudflare-Local-Storage-Engine',
      },
    });
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (e1) {
    try {
      (window as any).fetch = customFetch;
    } catch (e2) {
      try {
        Object.defineProperty(globalThis, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (e3) {
        // Fallback: window.fetch cannot be redefined in this environment
      }
    }
  }
}

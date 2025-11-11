import type { ApiTest, ApiResponse } from '../types';

interface FormDataEntry {
  key: string;
  value: string;
}

export const runApiTest = async (test: ApiTest, proxyTemplate: string, signal: AbortSignal, file?: File): Promise<ApiResponse> => {
  const startTime = Date.now();
  
  let urlToFetch = test.url;
  if (proxyTemplate) {
    if (proxyTemplate.includes('{url}')) {
      urlToFetch = proxyTemplate.replace('{url}', encodeURIComponent(test.url));
    } else {
      urlToFetch = proxyTemplate + test.url;
    }
  }

  const requestOptions: RequestInit = {
    method: test.method,
    headers: new Headers(test.headers),
    mode: 'cors',
    signal,
  };

  // FIX: Remove redundant check for 'HEAD' method as it's not a possible value for ApiTest.method, resolving a TypeScript comparison error.
  if (test.method !== 'GET') {
    const headers = requestOptions.headers as Headers;
    const hasContentType = Object.keys(test.headers).some(h => h.toLowerCase() === 'content-type');
    const bodyType = test.bodyType || (test.body ? 'json' : 'none');

    switch (bodyType) {
      case 'json':
        if (test.body) {
          if (!hasContentType) headers.set('Content-Type', 'application/json');
          requestOptions.body = test.body;
        }
        break;
      
      case 'text':
        if (test.body) {
          if (!hasContentType) headers.set('Content-Type', 'text/plain');
          requestOptions.body = test.body;
        }
        break;
      
      case 'form-data':
        if (test.body) {
          try {
            const formData = new FormData();
            const entries: FormDataEntry[] = JSON.parse(test.body);
            if(Array.isArray(entries)) {
              entries.forEach(entry => {
                if (entry.key) {
                  formData.append(entry.key, entry.value);
                }
              });
            }
            requestOptions.body = formData;
            // Let the browser set the 'Content-Type' with the correct boundary.
            // If the user set it manually, we must remove it.
            if (headers.has('Content-Type')) {
              headers.delete('Content-Type');
            }
          } catch(e) {
            console.error("Invalid form-data body format.", e);
            throw new Error("Invalid Form Data: Body must be a valid JSON array of key-value pairs.");
          }
        }
        break;
      
      case 'binary':
        if (file) {
          requestOptions.body = file;
          // Don't set content-type header here; let the browser handle it
          // based on the file type, unless the user has explicitly set one.
        }
        break;

      case 'none':
      default:
        // No body
        break;
    }
  }

  const response = await fetch(urlToFetch, requestOptions);
  const endTime = Date.now();

  // Explicitly check if the request was aborted after headers were received
  // but before the body is read. This adds robustness.
  if (signal.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBodyText = await response.text();
  const responseSize = new Blob([responseBodyText]).size;
  
  let body;
  try {
    body = JSON.parse(responseBodyText);
  } catch (e) {
    body = responseBodyText;
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body,
    size: responseSize,
    time: endTime - startTime,
  };
};
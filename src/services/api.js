import axios from 'axios';
import { API_BASE_URL } from '@/shared/constants';
import { cleanParams } from '@/shared/utils/helpers';

/**
 * Axios client (ticket SN1 / SN3):
 * - the access token is kept in memory only (never localStorage);
 * - the refresh token is an httpOnly cookie, so requests use withCredentials;
 * - on a 401 the client tries ONE silent refresh, then replays the request;
 * - every failure is normalised into an ApiError { status, code, message, details }.
 */

let accessToken = null;
let refreshPromise = null;
let authFailureHandler = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

/** AuthProvider registers this so a failed refresh logs the user out everywhere. */
export function setAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN_ERROR', message, details = [], isNetworkError = false }) {
    super(message || 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
    this.isNetworkError = isNetworkError;
  }
}

const DEFAULT_MESSAGES = {
  400: 'The request was not valid.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have access to this.",
  404: 'We could not find what you were looking for.',
  409: 'This conflicts with the current state. Refresh and try again.',
  410: 'This link or quote has expired.',
  422: 'Please check the highlighted fields.',
  429: 'Too many attempts. Please wait a minute and try again.',
  500: 'The server had a problem. Please try again shortly.',
};

export function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (error?.response) {
    const { status, data } = error.response;
    const body = data && typeof data === 'object' ? data : {};
    const apiError = body.error || {};
    return new ApiError({
      status,
      code: apiError.code || `HTTP_${status}`,
      message:
        apiError.message ||
        DEFAULT_MESSAGES[status] ||
        (status >= 500 ? DEFAULT_MESSAGES[500] : 'Request failed.'),
      details: apiError.details || [],
    });
  }
  if (error?.code === 'ECONNABORTED') {
    return new ApiError({
      code: 'TIMEOUT',
      message: 'The server took too long to respond. Please try again.',
      isNetworkError: true,
    });
  }
  if (error?.request) {
    return new ApiError({
      code: 'NETWORK_ERROR',
      message: "Can't reach the server. Check your connection and try again.",
      isNetworkError: true,
    });
  }
  return new ApiError({ message: error?.message });
}

/** Accepts both plain resources and { success: true, data } envelopes. */
export function unwrap(body) {
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

// Separate instance without interceptors so a failing refresh can never loop.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function shouldTryRefresh(config) {
  if (!config || config._retry || config.skipAuthRefresh) return false;
  const url = config.url || '';
  return !NO_REFRESH_PATHS.some((path) => url.includes(path));
}

/** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const data = unwrap(response.data);
        setAccessToken(data?.accessToken);
        return data;
      })
      .catch((error) => {
        clearAccessToken();
        throw toApiError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.params) config.params = cleanParams(config.params);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    if (error?.response?.status === 401 && shouldTryRefresh(original)) {
      original._retry = true;
      try {
        await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        if (authFailureHandler) authFailureHandler();
        return Promise.reject(toApiError(error));
      }
    }
    return Promise.reject(toApiError(error));
  },
);

/** Thin helpers that return the unwrapped response body. */
export const api = {
  get: (url, params, config = {}) =>
    apiClient.get(url, { ...config, params }).then((res) => unwrap(res.data)),
  post: (url, body, config = {}) => apiClient.post(url, body, config).then((res) => unwrap(res.data)),
  put: (url, body, config = {}) => apiClient.put(url, body, config).then((res) => unwrap(res.data)),
  patch: (url, body, config = {}) =>
    apiClient.patch(url, body, config).then((res) => unwrap(res.data)),
  delete: (url, config = {}) => apiClient.delete(url, config).then((res) => unwrap(res.data)),
};

/** Resolves to null instead of throwing when the resource does not exist (404). */
export async function orNullOn404(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export default api;

/**
 * API Client for Saturway
 * Handles all HTTP requests to the backend with JWT authentication
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://saturway.com/api';
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 30000;

interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private token: string | null = null;

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.loadToken();
  }

  /**
   * Load JWT token from localStorage
   */
  private loadToken(): void {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      this.token = token;
    }
  }

  /**
   * Save JWT token to localStorage
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('jwt_token', token);
  }

  /**
   * Remove JWT token
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('jwt_token');
  }

  /**
   * Get current token
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Make HTTP request with automatic token injection
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Prepare headers
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only add Content-Type for requests with non-empty body
    if (options.body && options.body !== '{}') {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: 'Unknown error',
          statusCode: response.status,
        }));

        // Handle 401 Unauthorized - clear token
        if (response.status === 401) {
          this.clearToken();
        }

        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      // Parse JSON response
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  /**
   * GET request
   */
  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  public async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL, API_TIMEOUT);

// Export class for testing
export { ApiClient };

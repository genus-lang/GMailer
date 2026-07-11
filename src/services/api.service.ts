const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ApiService = {
  async get<T>(endpoint: string, token?: string | null): Promise<T> {
    console.log(`[API] GET ${endpoint}`);
    
    // In extension environment, fetch directly connects to localhost server because of CORS setup
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  },

  async post<T>(endpoint: string, data?: any, token?: string | null): Promise<T> {
    console.log(`[API] POST ${endpoint}`, data);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  }
};

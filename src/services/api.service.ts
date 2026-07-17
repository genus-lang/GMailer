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
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || response.statusText;
      } catch (e) {}
      throw new Error(`API Error: ${errorMsg}`);
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
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || response.statusText;
      } catch (e) {}
      throw new Error(`API Error: ${errorMsg}`);
    }

    return await response.json();
  },

  async upload<T>(endpoint: string, formData: FormData, token?: string | null): Promise<T> {
    console.log(`[API] UPLOAD ${endpoint}`);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Note: Do not set Content-Type for FormData, browser sets it with boundary

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || response.statusText;
      } catch (e) {}
      throw new Error(`API Error: ${errorMsg}`);
    }

    return await response.json();
  },

  async delete<T>(endpoint: string, token?: string | null): Promise<T> {
    console.log(`[API] DELETE ${endpoint}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || response.statusText;
      } catch (e) {}
      throw new Error(`API Error: ${errorMsg}`);
    }

    return await response.json();
  }
};

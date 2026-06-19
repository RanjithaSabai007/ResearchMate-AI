import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject token
api.interceptors.request.use(
  (config) => {
    // Inject Authentication Session Token
    const token = localStorage.getItem('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Unwrap response payloads and format errors
api.interceptors.response.use(
  (response) => {
    // If response follows the ApiResponse format { success, data, message, error_code, details }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        // Create an error representation to be handled by error handler
        const apiError = new Error(response.data.message || 'API Error');
        apiError.response = response;
        return Promise.reject(apiError);
      }
      // Unwrap the successful data field
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalResponse = error.response;

    // Handle promise rejection from unwrapped successful errors
    if (originalResponse && originalResponse.data && typeof originalResponse.data === 'object' && 'success' in originalResponse.data) {
      // Data is already mapped
    } else if (originalResponse && originalResponse.data) {
      // Map standard FastAPI details if they leak
      if (originalResponse.data.detail) {
        originalResponse.data = originalResponse.data.detail;
      }
    }

    // Output formatted errors to Console (Inspect option)
    if (originalResponse && originalResponse.data) {
      const { error_code, message, details } = originalResponse.data;
      
      console.group(`🚨 API Error [${originalResponse.status}] - ${error_code || 'ERROR'}`);
      console.error(`Status Code: ${originalResponse.status}`);
      console.error(`Error Code: ${error_code || 'N/A'}`);
      console.error(`Message: ${message || error.message}`);
      if (details) {
        console.error('Details:', details);
      }
      console.groupEnd();
    } else {
      console.error('🚨 Network/System Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

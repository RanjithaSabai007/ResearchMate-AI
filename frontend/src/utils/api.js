import axios from 'axios';
import { encryptPayload, decryptPayload } from './crypto';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Encrypt payload and inject token
api.interceptors.request.use(
  (config) => {
    // 1. Inject Authentication Session Token
    const token = localStorage.getItem('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Encrypt Payload for POST, PUT, PATCH requests
    const isMutation = ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '');
    if (isMutation && config.data && config.headers['Content-Type'] === 'application/json') {
      try {
        // Stringify the payload
        const jsonString = JSON.stringify(config.data);
        
        // Encrypt the string
        const encrypted = encryptPayload(jsonString);
        
        // Overwrite request data with encrypted format
        config.data = { payload: encrypted };
        
        // Add header to let backend know it's encrypted
        config.headers['X-Encrypted'] = 'true';
      } catch (error) {
        console.error('Failed to encrypt request payload:', error);
        return Promise.reject(error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Decrypt response payloads and format errors
api.interceptors.response.use(
  (response) => {
    // Decrypt if server returned encrypted flag or payload exists
    const isEncrypted = response.headers['x-encrypted'] === 'true' || (response.data && response.data.payload);
    
    if (isEncrypted && response.data && response.data.payload) {
      try {
        const decryptedStr = decryptPayload(response.data.payload);
        response.data = JSON.parse(decryptedStr);
      } catch (error) {
        console.error('Failed to decrypt response payload:', error);
      }
    }

    return response;
  },
  async (error) => {
    const originalResponse = error.response;
    
    // Check if error response payload is encrypted
    if (originalResponse && originalResponse.data && originalResponse.data.payload) {
      try {
        const decryptedStr = decryptPayload(originalResponse.data.payload);
        originalResponse.data = JSON.parse(decryptedStr);
      } catch (e) {
        console.error('Failed to decrypt error payload:', e);
      }
    }

    // Output formatted errors to Console (Inspect option)
    if (originalResponse && originalResponse.data) {
      const { status_code, error_code, message, details } = originalResponse.data;
      
      console.group(`🚨 API Error [${originalResponse.status}] - ${error_code || 'ERROR'}`);
      console.error(`Status Code: ${status_code || originalResponse.status}`);
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

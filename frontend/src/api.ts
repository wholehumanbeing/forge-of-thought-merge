import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 30000; // 30s to tolerate cold-start

export const fetchArchetypes = async () => {
  // ... existing code ...
} 
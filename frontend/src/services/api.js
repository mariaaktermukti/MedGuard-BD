import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8001/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to attach the JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('access');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;

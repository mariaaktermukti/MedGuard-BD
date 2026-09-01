import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserStatus = async () => {
            const token = localStorage.getItem('access_token') || localStorage.getItem('access');
            if (token) {
                try {
                    const response = await api.get('users/me/');
                    setUser(response.data);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh_token');
                }
            }
            setLoading(false);
        };
        checkUserStatus();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('token/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            
            // Fetch user info after login
            let userData = null;
            try {
                const userResponse = await api.get('users/me/');
                userData = userResponse.data;
                setUser(userData);
            } catch (e) {
                userData = { 
                    role: response.data.role || 'citizen', 
                    username: response.data.username || username,
                    full_name: response.data.full_name || username
                };
                setUser(userData);
            }
            
            return { success: true, role: userData?.role || 'citizen' };
        } catch (error) {
            console.error("Login failed:", error);
            let detailMsg = "Invalid username/email or password.";
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
                detailMsg = "Unable to connect to backend server (ERR_CONNECTION_REFUSED). Please ensure Python Django server is running on port 8000.";
            } else if (error.response?.data?.detail) {
                detailMsg = error.response.data.detail;
            } else if (typeof error.response?.data === 'string') {
                detailMsg = error.response.data;
            }
            return { success: false, error: detailMsg };
        }
    };

    const register = async (userData) => {
        try {
            await api.post('users/register/', userData);
            return await login(userData.username, userData.password);
        } catch (error) {
            return { success: false, error: error.response?.data || "Registration failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh_token');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

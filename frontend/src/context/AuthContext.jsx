import React, { createContext, useState, useEffect } from 'react';
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
            const userResponse = await api.get('users/me/');
            setUser(userResponse.data);
            
            // Do NOT navigate here so Login page can show animation
            return { success: true, role: userResponse.data.role };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || "Invalid username/email or password." };
        }
    };

    const register = async (userData) => {
        try {
            await api.post('users/register/', userData);
            // Automatically login after successful registration
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

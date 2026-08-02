import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Register = () => {
    const { register } = useContext(AuthContext);
    const [formData, setFormData] = useState({ 
        username: '', email: '', password: '', full_name: '', phone: '', role: 'citizen' 
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const result = await register(formData);
        if (!result.success) {
            setError(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
        }
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <Shield size={40} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Create Account</h1>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Username</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Phone</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Register As</label>
                        <select name="role" value={formData.role} onChange={handleChange} required>
                            <option value="citizen">Citizen</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="manufacturer">Manufacturer</option>
                            <option value="doctor">Doctor</option>
                            <option value="distributor">Distributor</option>
                            <option value="researcher">Researcher</option>
                        </select>
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem' }} disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;

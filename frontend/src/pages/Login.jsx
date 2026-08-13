import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Shield, LockKey } from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const result = await login(credentials.username, credentials.password);
        if (!result.success) {
            setError(result.error);
        }
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
            
            {/* Left Side - Form */}
            <div style={{ flex: '1 1 50%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <div style={{ width: '100%', maxWidth: '440px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <Shield weight="fill" size={40} color="var(--primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            MedGuard <span style={{ color: 'var(--primary)' }}>BD</span>
                        </h2>
                    </div>

                    <Card padding="lg" style={{ boxShadow: 'var(--shadow-lg)', border: 'none' }}>
                        <CardContent>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Welcome Back</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Access your secure national healthcare portal.</p>

                            {error && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <Input 
                                    label="Username" 
                                    name="username" 
                                    value={credentials.username} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Enter your username" 
                                />
                                
                                <Input 
                                    label="Password" 
                                    type="password" 
                                    name="password" 
                                    value={credentials.password} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="••••••••" 
                                />
                                
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    fullWidth 
                                    style={{ marginTop: '1rem' }} 
                                    disabled={isLoading}
                                >
                                    <LockKey size={20} weight="bold" style={{ marginRight: '0.5rem' }} />
                                    {isLoading ? 'Authenticating...' : 'Secure Sign In'}
                                </Button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Side - Brand/Trust Section */}
            <div style={{ 
                flex: '1 1 50%', 
                backgroundColor: 'var(--secondary)', 
                backgroundImage: 'radial-gradient(circle at center, var(--primary-hover) 0%, var(--secondary) 100%)',
                display: 'none', 
                '@media (minWidth: 768px)': { display: 'flex' }, /* inline fallback handled via css usually, let's use standard flex but hide on mobile with standard css if needed */
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem',
                color: 'white',
                textAlign: 'center'
            }} className="hide-on-mobile">
                <Shield weight="duotone" size={120} color="var(--primary-light)" style={{ opacity: 0.8, marginBottom: '2rem' }} />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>Securing the Nation's Health.</h2>
                <p style={{ fontSize: '1.125rem', color: 'var(--primary-light)', maxWidth: '480px', lineHeight: 1.6 }}>
                    MedGuard BD is the official platform for monitoring pharmaceutical supply chains, combatting counterfeit medicines, and protecting citizens.
                </p>
                <div style={{ marginTop: '4rem', display: 'flex', gap: '2rem', color: 'var(--primary-light)', opacity: 0.8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>100%</span>
                        <span style={{ fontSize: '0.875rem' }}>Verified Medicine</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>DGDA</span>
                        <span style={{ fontSize: '0.875rem' }}>Approved Platform</span>
                    </div>
                </div>
            </div>
            {/* simple inline style fallback for hide-on-mobile */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    .hide-on-mobile { display: none !important; }
                }
            `}} />
        </div>
    );
};

export default Login;

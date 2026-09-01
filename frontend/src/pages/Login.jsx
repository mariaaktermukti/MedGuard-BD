import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Shield, LockKey, CheckCircle, User, Eye, EyeSlash, 
    ShieldCheck, ArrowRight, XCircle, Check, ArrowLeft
} from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const navigate = useNavigate();

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
            setIsLoading(false);
        } else {
            setShowSuccess(true);
            setTimeout(() => {
                const rolePaths = {
                    citizen: '/dashboard',
                    doctor: '/dashboard/doctor',
                    pharmacy: '/dashboard/pharmacy',
                    manufacturer: '/dashboard/manufacturer',
                    distributor: '/dashboard/distributor',
                    dgda: '/dashboard/dgda',
                    researcher: '/dashboard/researcher'
                };
                navigate(rolePaths[result.role] || '/dashboard');
            }, 2500);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Left Form Side */}
            <div style={{ flex: '1 1 50%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem 1.5rem' }}>
                <div style={{ width: '100%', maxWidth: '440px' }}>
                    
                    {showSuccess ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '3rem 2rem', 
                            background: 'var(--bg-card)', 
                            borderRadius: '20px', 
                            border: '1px solid var(--border)',
                            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)',
                            animation: 'fadeIn 0.4s ease-out' 
                        }}>
                            <div style={{ fontSize: '4.5rem', marginBottom: '1rem', animation: 'slideRight 2.5s ease-in-out' }}>🚑</div>
                            
                            <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                color: 'var(--primary)', 
                                backgroundColor: 'var(--primary-light)', 
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                marginBottom: '1.25rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 700 
                            }}>
                                <CheckCircle weight="fill" size={20} color="var(--primary)" /> Authentication Successful
                            </div>
                            
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
                                Welcome to MedGuard BD
                            </h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.925rem' }}>
                                Accessing your role-based national dashboard...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Back Button */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <Link 
                                    to="/" 
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '0.4rem', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 600, 
                                        color: 'var(--text-muted)', 
                                        textDecoration: 'none',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-card)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'var(--primary)';
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                    }}
                                >
                                    <ArrowLeft size={16} weight="bold" />
                                    <span>Back to Home</span>
                                </Link>
                            </div>

                          

                            {/* Main Card - Shadcn Style */}
                            <Card style={{ 
                                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.025)', 
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'var(--bg-card)'
                            }}>
                                <CardContent style={{ padding: '2.25rem' }}>
                                    <div style={{ marginBottom: '1.75rem' }}>
                                        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                                            Welcome Back
                                        </h1>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            Sign in to access your secure national healthcare portal.
                                        </p>
                                    </div>

                                    {/* Alert Error */}
                                    {error && (
                                        <div style={{ 
                                            background: 'rgba(239, 68, 68, 0.08)', 
                                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                                            color: 'var(--danger)', 
                                            padding: '0.875rem 1rem', 
                                            borderRadius: '10px', 
                                            marginBottom: '1.5rem', 
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.65rem',
                                            animation: 'fadeIn 0.2s ease-in'
                                        }}>
                                            <XCircle size={20} weight="fill" style={{ flexShrink: 0 }} />
                                            <div style={{ fontWeight: 500 }}>{error}</div>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        
                                        {/* Username */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                Username or Email <span style={{ color: 'var(--danger)' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input 
                                                    name="username" 
                                                    value={credentials.username} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="Enter your username" 
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 0.85rem 0.75rem 2.4rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--bg-input)',
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.925rem',
                                                        outline: 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'var(--primary)';
                                                        e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'var(--border)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Password */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                    Password <span style={{ color: 'var(--danger)' }}>*</span>
                                                </label>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <LockKey size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input 
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password" 
                                                    value={credentials.password} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="••••••••••••" 
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 2.5rem 0.75rem 2.4rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--bg-input)',
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.925rem',
                                                        outline: 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'var(--primary)';
                                                        e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'var(--border)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '4px'
                                                    }}
                                                >
                                                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Submit Button */}
                                        <Button 
                                            type="submit" 
                                            variant="primary" 
                                            fullWidth 
                                            style={{ 
                                                marginTop: '0.5rem',
                                                padding: '0.85rem',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                fontSize: '0.975rem',
                                                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }} 
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span>Signing in...</span>
                                            ) : (
                                                <>
                                                    <LockKey size={19} weight="bold" />
                                                    <span>Secure Sign In</span>
                                                    <ArrowRight size={16} weight="bold" />
                                                </>
                                            )}
                                        </Button>
                                    </form>

                                    {/* Sign Up Link */}
                                    <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        Don't have an account?{' '}
                                        <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                            Create an account
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* Right Side - Brand Showcase - Fresh Light White & Green Theme */}
            <div style={{ 
                flex: '1 1 50%', 
                backgroundColor: '#f0fdf4', 
                backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 50%, #d1fae5 100%)',
                display: 'none', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem',
                color: '#0f172a',
                position: 'relative',
                overflow: 'hidden',
                borderLeft: '1px solid var(--border)'
            }} className="show-on-desktop">

                {/* Decorative Ambient Shapes */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: '350px',
                    height: '350px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />

                <div style={{ maxWidth: '440px', zIndex: 2, textAlign: 'left' }}>
                    
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        background: '#ffffff',
                        border: '1px solid #a7f3d0',
                        color: '#047857',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        marginBottom: '1.75rem',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.08)'
                    }}>
                        <ShieldCheck size={16} color="#059669" weight="fill" /> Official DGDA National Platform
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem', color: '#064e3b', letterSpacing: '-0.02em' }}>
                        Securing the Nation's Health.
                    </h2>
                    
                    <p style={{ fontSize: '1.025rem', color: '#334155', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 500 }}>
                        MedGuard BD is the official platform for monitoring pharmaceutical supply chains, combatting counterfeit medicines, and protecting citizens.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #d1fae5',
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.06)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>100%</div>
                            <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600, marginTop: '0.2rem' }}>Verified Medicine</div>
                        </div>
                        <div style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #d1fae5',
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.06)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>DGDA</div>
                            <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600, marginTop: '0.2rem' }}>Approved Portal</div>
                        </div>
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media (min-width: 900px) {
                    .show-on-desktop { display: flex !important; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideRight {
                    0% { transform: translateX(-100px); opacity: 0; }
                    20% { transform: translateX(0); opacity: 1; }
                    80% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(100px); opacity: 0; }
                }
            `}} />
        </div>
    );
};

export default Login;

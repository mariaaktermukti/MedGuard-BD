import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Shield, UserPlus } from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
            
            {/* Left Side - Form */}
            <div style={{ flex: '1 1 50%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '500px', margin: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <Shield weight="fill" size={40} color="var(--primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            MedGuard <span style={{ color: 'var(--primary)' }}>BD</span>
                        </h2>
                    </div>

                    <Card padding="lg" style={{ boxShadow: 'var(--shadow-lg)', border: 'none' }}>
                        <CardContent>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Create Account</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Join the national pharmaceutical monitoring network.</p>

                            {error && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <Input 
                                    label="Full Name" 
                                    name="full_name" 
                                    value={formData.full_name} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Enter your full name"
                                />
                                
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <Input 
                                        label="Username" 
                                        name="username" 
                                        value={formData.username} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="Choose a username"
                                        style={{ flex: 1 }}
                                    />
                                    <Input 
                                        label="Phone" 
                                        name="phone" 
                                        value={formData.phone} 
                                        onChange={handleChange}
                                        placeholder="Phone number"
                                        style={{ flex: 1 }}
                                    />
                                </div>

                                <Input 
                                    label="Email Address" 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="your@email.com"
                                />

                                <Input 
                                    label="Password" 
                                    type="password" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="••••••••"
                                />

                                <Input 
                                    label="Register As" 
                                    type="select" 
                                    name="role" 
                                    value={formData.role} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="citizen">Citizen</option>
                                    <option value="pharmacy">Pharmacy</option>
                                    <option value="manufacturer">Manufacturer</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="distributor">Distributor</option>
                                    <option value="researcher">Researcher</option>
                                    <option value="dgda">DGDA</option>
                                </Input>
                                
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    fullWidth 
                                    style={{ marginTop: '1rem' }} 
                                    disabled={isLoading}
                                >
                                    <UserPlus size={20} weight="bold" style={{ marginRight: '0.5rem' }} />
                                    {isLoading ? 'Registering...' : 'Sign Up'}
                                </Button>
                            </form>

                            <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
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
                '@media (minWidth: 768px)': { display: 'flex' },
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem',
                color: 'white',
                textAlign: 'center'
            }} className="hide-on-mobile">
                <Shield weight="duotone" size={120} color="var(--primary-light)" style={{ opacity: 0.8, marginBottom: '2rem' }} />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>Join the Network.</h2>
                <p style={{ fontSize: '1.125rem', color: 'var(--primary-light)', maxWidth: '480px', lineHeight: 1.6 }}>
                    Create your account to verify medicines, report side effects, and access real-time pharmaceutical intelligence.
                </p>
                <div style={{ marginTop: '4rem', display: 'flex', gap: '2rem', color: 'var(--primary-light)', opacity: 0.8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>Free</span>
                        <span style={{ fontSize: '0.875rem' }}>For Citizens</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>Secure</span>
                        <span style={{ fontSize: '0.875rem' }}>Data Protection</span>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    .hide-on-mobile { display: none !important; }
                }
            `}} />
        </div>
    );
};

export default Register;

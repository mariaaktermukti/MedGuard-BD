import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
    Shield, UserPlus, CheckCircle, XCircle, User, EnvelopeSimple, 
    LockKey, Phone, Eye, EyeSlash, Heartbeat, FirstAid, Storefront, 
    Factory, Truck, Flask, ShieldCheck, ArrowRight, Check, ArrowLeft
} from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const ROLES = [
    { id: 'citizen', label: 'Citizen', icon: Heartbeat, desc: 'Public patient portal' },
    { id: 'doctor', label: 'Doctor', icon: FirstAid, desc: 'Medical professional' },
    { id: 'pharmacy', label: 'Pharmacy', icon: Storefront, desc: 'Licensed drug store' },
    { id: 'manufacturer', label: 'Manufacturer', icon: Factory, desc: 'Pharma producer' },
    { id: 'distributor', label: 'Distributor', icon: Truck, desc: 'Logistics provider' },
    { id: 'researcher', label: 'Researcher', icon: Flask, desc: 'Academic & clinical' },
    { id: 'dgda', label: 'DGDA / Admin', icon: ShieldCheck, desc: 'Government regulator' },
];

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ 
        username: '', email: '', password: '', full_name: '', phone: '', role: 'citizen' 
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Password validation logic
    const reqs = {
        length: formData.password.length >= 8,
        upper: /[A-Z]/.test(formData.password),
        lower: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[^A-Za-z0-9]/.test(formData.password)
    };
    
    const metCount = Object.values(reqs).filter(Boolean).length;
    const isPasswordValid = metCount === 5;

    const getStrengthColor = () => {
        if (metCount <= 2) return '#ef4444'; // Red
        if (metCount <= 4) return '#f59e0b'; // Amber
        return '#10b981'; // Emerald
    };

    const getStrengthText = () => {
        if (formData.password.length === 0) return 'Required';
        if (metCount <= 2) return 'Weak';
        if (metCount <= 4) return 'Moderate';
        return 'Strong';
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleSelect = (roleId) => {
        setFormData({ ...formData, role: roleId });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.full_name.trim()) {
            setError("Please enter your full name.");
            return;
        }
        if (!formData.username.trim()) {
            setError("Please enter a username.");
            return;
        }
        if (!formData.email.trim()) {
            setError("Please enter your email address.");
            return;
        }
        if (!isPasswordValid) {
            setError("Please meet all 5 password requirements before continuing to role selection.");
            return;
        }

        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isPasswordValid) {
            setError("Please meet all 5 password requirements.");
            setStep(1);
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const result = await register(formData);
        if (result.success) {
            Swal.fire({
                title: 'Registration Successful! 🎉',
                text: `Welcome to MedGuard BD, ${formData.full_name || formData.username}! Logging you into your portal...`,
                icon: 'success',
                confirmButtonColor: '#059669',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            }).then(() => {
                const userRole = result.role || formData.role;
                switch (userRole) {
                    case 'doctor':
                        navigate('/dashboard/doctor');
                        break;
                    case 'pharmacy':
                        navigate('/dashboard/pharmacy');
                        break;
                    case 'manufacturer':
                        navigate('/dashboard/manufacturer');
                        break;
                    case 'distributor':
                        navigate('/dashboard/distributor');
                        break;
                    case 'researcher':
                        navigate('/dashboard/researcher');
                        break;
                    case 'dgda':
                        navigate('/dashboard/dgda');
                        break;
                    default:
                        navigate('/dashboard');
                }
            });
        } else {
            let errorMsg = result.error;
            if (typeof result.error === 'object') {
                errorMsg = Object.entries(result.error).map(([key, val]) => {
                    const cleanKey = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
                    return `${cleanKey}: ${Array.isArray(val) ? val.join(' ') : val}`;
                }).join(' | ');
            }
            setError(errorMsg);
        }
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Left Form Area */}
            <div style={{ flex: '1 1 55%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem 1.5rem', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '560px', margin: 'auto' }}>
                    
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

                    {/* Main Form Card - Generous Internal Padding */}
                    <Card 
                        padding="none"
                        style={{ 
                            boxShadow: 'var(--shadow-md)', 
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-card)'
                        }}
                    >
                        <CardContent style={{ padding: '2.25rem 2rem' }}>
                            
                            {/* Step Indicator Wizard Header */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{ 
                                        flex: 1, height: '6px', borderRadius: '3px', 
                                        backgroundColor: 'var(--primary)', transition: 'all 0.3s ease' 
                                    }} />
                                    <div style={{ 
                                        flex: 1, height: '6px', borderRadius: '3px', 
                                        backgroundColor: step >= 2 ? 'var(--primary)' : 'var(--border)', transition: 'all 0.3s ease' 
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
                                            {step === 1 ? 'Step 1: Account Information' : 'Step 2: Select Your Role'}
                                        </h1>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            {step === 1 ? 'Enter your personal details and set up your credentials.' : 'Choose how you will be using the MedGuard BD platform.'}
                                        </p>
                                    </div>
                                    <span style={{ 
                                        padding: '0.35rem 0.75rem', 
                                        borderRadius: '20px', 
                                        background: 'var(--primary-light)', 
                                        color: 'var(--primary)', 
                                        fontSize: '0.775rem', 
                                        fontWeight: 700 
                                    }}>
                                        Step {step} of 2
                                    </span>
                                </div>
                            </div>

                            {/* Alert Banner for Errors */}
                            {error && (
                                <div style={{ 
                                    background: 'rgba(239, 68, 68, 0.08)', 
                                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                                    color: 'var(--danger)', 
                                    padding: '0.875rem 1rem', 
                                    borderRadius: '8px', 
                                    marginBottom: '1.25rem', 
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.65rem',
                                    animation: 'fadeIn 0.2s ease-in'
                                }}>
                                    <XCircle size={20} weight="fill" style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <div style={{ lineHeight: 1.4, fontWeight: 500 }}>{error}</div>
                                </div>
                            )}

                            {/* STEP 1 FORM FIELDS */}
                            {step === 1 && (
                                <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    
                                    {/* Full Name */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input 
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Dr. Tanvir Hossain"
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

                                    {/* Username & Phone Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                Username <span style={{ color: 'var(--danger)' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>@</span>
                                                <input 
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="tanvir88"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 0.85rem 0.75rem 2.3rem',
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

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                Phone Number
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input 
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="+8801700000000"
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
                                    </div>

                                    {/* Email Address */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            Email Address <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <EnvelopeSimple size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input 
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="tanvir@example.com"
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

                                    {/* Password Field with Toggle */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            Password <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <LockKey size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input 
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
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

                                    {/* Password Strength & Clear Requirements Box */}
                                    <div style={{ 
                                        backgroundColor: 'var(--bg-page)', 
                                        padding: '1rem 1.15rem', 
                                        borderRadius: '10px', 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Password Requirements</span>
                                            <span style={{ fontWeight: 800, color: getStrengthColor() }}>
                                                {getStrengthText()}
                                            </span>
                                        </div>

                                        {/* Progress Bar Track */}
                                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(metCount / 5) * 100}%`,
                                                height: '100%',
                                                backgroundColor: getStrengthColor(),
                                                transition: 'width 0.3s ease, background-color 0.3s ease'
                                            }} />
                                        </div>

                                        {/* Requirements Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                                            {[
                                                { key: 'length', text: '8+ characters' },
                                                { key: 'upper', text: 'Uppercase letter' },
                                                { key: 'lower', text: 'Lowercase letter' },
                                                { key: 'number', text: 'At least one number' },
                                                { key: 'special', text: 'Special character' }
                                            ].map(({ key, text }) => {
                                                const met = reqs[key];
                                                return (
                                                    <div key={key} style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.45rem', 
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        color: met ? 'var(--primary)' : 'var(--text-main)',
                                                        transition: 'all 0.2s ease'
                                                    }}>
                                                        {met ? (
                                                            <CheckCircle size={16} weight="fill" color="var(--primary)" style={{ flexShrink: 0 }} />
                                                        ) : (
                                                            <XCircle size={16} weight="bold" color="var(--danger)" style={{ flexShrink: 0 }} />
                                                        )}
                                                        <span>{text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Next Step Button */}
                                    <Button 
                                        type="submit" 
                                        variant="primary" 
                                        fullWidth 
                                        style={{ 
                                            marginTop: '0.5rem',
                                            padding: '0.85rem',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: '0.975rem',
                                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }} 
                                    >
                                        <span>Next: Select Role</span>
                                        <ArrowRight size={18} weight="bold" />
                                    </Button>
                                </form>
                            )}

                            {/* STEP 2 ROLE SELECTION */}
                            {step === 2 && (
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Choose your registration role <span style={{ color: 'var(--danger)' }}>*</span></span>
                                            <span style={{ fontSize: '0.775rem', color: 'var(--primary)', fontWeight: 700 }}>
                                                Selected: {ROLES.find(r => r.id === formData.role)?.label}
                                            </span>
                                        </label>

                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                            gap: '0.75rem',
                                            maxHeight: '380px',
                                            overflowY: 'auto',
                                            paddingRight: '4px'
                                        }}>
                                            {ROLES.map((role) => {
                                                const Icon = role.icon;
                                                const isSelected = formData.role === role.id;
                                                return (
                                                    <div 
                                                        key={role.id}
                                                        onClick={() => handleRoleSelect(role.id)}
                                                        style={{
                                                            padding: '0.85rem 0.75rem',
                                                            borderRadius: '12px',
                                                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            textAlign: 'center',
                                                            gap: '0.4rem',
                                                            position: 'relative',
                                                            transition: 'all 0.15s ease-in-out'
                                                        }}
                                                    >
                                                        {isSelected && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '8px',
                                                                right: '8px',
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'var(--primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white'
                                                            }}>
                                                                <Check size={12} weight="bold" />
                                                            </div>
                                                        )}
                                                        <Icon size={26} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} weight={isSelected ? 'fill' : 'regular'} />
                                                        <span style={{ 
                                                            fontSize: '0.875rem', 
                                                            fontWeight: isSelected ? 800 : 600, 
                                                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                                            lineHeight: 1.2
                                                        }}>
                                                            {role.label}
                                                        </span>
                                                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.1 }}>
                                                            {role.desc}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={() => setStep(1)}
                                            style={{ flex: '1', padding: '0.85rem' }}
                                        >
                                            <ArrowLeft size={16} weight="bold" />
                                            <span>Back</span>
                                        </Button>

                                        <Button 
                                            type="submit" 
                                            variant="primary" 
                                            style={{ 
                                                flex: '2', 
                                                padding: '0.85rem',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                fontSize: '0.975rem',
                                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }} 
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span>Creating Account...</span>
                                            ) : (
                                                <>
                                                    <UserPlus size={19} weight="bold" />
                                                    <span>Create Account</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Sign In Link */}
                            <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Already have an account?{' '}
                                <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                    Sign in
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Brand Showcase Panel - Fresh White & Green Aesthetics */}
            <div style={{ 
                flex: '1 1 45%', 
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
                    
                    {/* Badge Pill */}
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
                        <ShieldCheck size={16} color="#059669" weight="fill" /> Official DGDA National Portal
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem', color: '#064e3b', letterSpacing: '-0.02em' }}>
                        Securing Bangladesh's Pharmaceutical Network.
                    </h2>
                    
                    <p style={{ fontSize: '1.025rem', color: '#334155', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 500 }}>
                        MedGuard BD connects citizens, doctors, pharmacies, and manufacturers to eliminate counterfeit medicines and ensure drug safety nationwide.
                    </p>

                    {/* Trust Highlights Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { title: '100% Verification', desc: 'Real-time serial authentication across the entire supply chain.' },
                            { title: 'Role-Based Control', desc: 'Tailored portals for Citizens, Doctors, DGDA, and Enterprise.' },
                            { title: 'Instant ADR Reporting', desc: 'Direct adverse drug reaction reporting to regulatory health bodies.' }
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                background: '#ffffff',
                                border: '1px solid #d1fae5',
                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.06)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.85rem'
                            }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#d1fae5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}>
                                    <Check size={14} weight="bold" />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.925rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#475569', lineHeight: 1.4 }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
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
            `}} />
        </div>
    );
};

export default Register;

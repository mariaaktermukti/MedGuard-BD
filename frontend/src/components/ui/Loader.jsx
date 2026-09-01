import React, { useState, useEffect } from 'react';
import { CircleNotch, ShieldCheck, Pill, Sparkle, Lock, Heartbeat, CheckCircle, Warning } from '@phosphor-icons/react';

// Live Micro Health Security Messages for Interactive Loading
const LOADING_STEPS = [
    "🔒 Verifying DGDA National Platform Credentials...",
    "💊 Syncing Personal Medicine Records & Real-Time Alarms...",
    "🛡️ Inspecting Anti-Counterfeit Verification Signatures...",
    "✨ Loading Personalized Healthcare Dashboard..."
];

// 1. High-Performance Emerald Spinner Component
export const Spinner = ({ size = 26, color = '#059669' }) => {
    return (
        <CircleNotch 
            size={size} 
            color={color} 
            style={{ 
                animation: 'spin 0.85s linear infinite', 
                flexShrink: 0 
            }} 
        />
    );
};

// 2. Inline Section Loader
export const Loader = ({ text = 'Loading data...', size = 'md' }) => {
    const isSmall = size === 'sm';
    
    return (
        <div style={{
            display: 'flex',
            flexDirection: isSmall ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isSmall ? '0.65rem' : '0.85rem',
            padding: isSmall ? '0.5rem' : '2.5rem 1.5rem',
            color: '#059669',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleNotch 
                    size={isSmall ? 22 : 40} 
                    color="#059669" 
                    style={{ animation: 'spin 0.85s linear infinite' }} 
                />
                {!isSmall && (
                    <Pill 
                        size={18} 
                        color="#059669" 
                        weight="fill" 
                        style={{ position: 'absolute', animation: 'pulse 1.5s ease-in-out infinite' }} 
                    />
                )}
            </div>
            {text && (
                <span style={{ 
                    fontSize: isSmall ? '0.85rem' : '0.925rem', 
                    fontWeight: 700, 
                    color: 'var(--text-main, #1e293b)',
                    letterSpacing: '-0.01em'
                }}>
                    {text}
                </span>
            )}
        </div>
    );
};

// 3. Interactive Full Page & Section Loader with Animated Progress Bar & Tip Ticker
export const PageLoader = ({ text = 'Loading MedGuard BD...' }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(25);

    useEffect(() => {
        const stepTimer = setInterval(() => {
            setStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
        }, 1400);

        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 94) return 96;
                return prev + Math.floor(Math.random() * 18) + 8;
            });
        }, 400);

        return () => {
            clearInterval(stepTimer);
            clearInterval(progressTimer);
        };
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 253, 244, 0.98) 50%, rgba(209, 250, 229, 0.98) 100%)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.25s ease-out',
            textAlign: 'center',
            overflow: 'hidden'
        }}>
            {/* Glowing Emerald Aura Ring */}
            <div style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 50%, #d1fae5 100%)',
                border: '2px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 12px 24px -6px rgba(5, 150, 105, 0.2)'
            }}>
                <CircleNotch 
                    size={88} 
                    color="#059669" 
                    style={{ 
                        position: 'absolute', 
                        animation: 'spin 1s linear infinite' 
                    }} 
                />
                
                {/* Heartbeat EKG Pulse Icon */}
                <Heartbeat size={38} color="#059669" weight="fill" style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
            </div>

            {/* Title */}
            <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#064e3b',
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <Sparkle size={20} color="#059669" weight="fill" />
                <span>{text}</span>
            </div>

            {/* Interactive Progress Bar */}
            <div style={{
                width: '100%',
                maxWidth: '320px',
                height: '8px',
                backgroundColor: '#e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                margin: '1rem 0 0.85rem 0',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    borderRadius: '10px',
                    transition: 'width 0.3s ease-out',
                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
                }} />
            </div>

            {/* Rotating Health Tip Message */}
            <div style={{
                fontSize: '0.875rem',
                color: '#047857',
                fontWeight: 700,
                minHeight: '24px',
                transition: 'opacity 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
            }}>
                <span>{LOADING_STEPS[stepIndex]}</span>
            </div>

            {/* Equalizer Micro Animation Bars */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '1.25rem', alignItems: 'flex-end', height: '16px' }}>
                <div style={{ width: '4px', height: '100%', background: '#059669', borderRadius: '2px', animation: 'bounce 0.6s ease-in-out infinite alternate' }} />
                <div style={{ width: '4px', height: '60%', background: '#10b981', borderRadius: '2px', animation: 'bounce 0.6s ease-in-out 0.2s infinite alternate' }} />
                <div style={{ width: '4px', height: '80%', background: '#059669', borderRadius: '2px', animation: 'bounce 0.6s ease-in-out 0.4s infinite alternate' }} />
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes bounce {
                    from { height: 30%; }
                    to { height: 100%; }
                }
            `}} />
        </div>
    );
};

// 4. Shadcn Shimmer Skeleton Component for Zero Layout Shift
export const Skeleton = ({ height = '20px', width = '100%', borderRadius = '8px', style = {} }) => {
    return (
        <div style={{
            height,
            width,
            borderRadius,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            ...style
        }} />
    );
};

export default PageLoader;

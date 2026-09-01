import React, { useState, useRef, useEffect, useContext } from 'react';
import { Chat, PaperPlaneRight, Robot, User, SpeakerHigh, WarningCircle, Lightbulb, Trash, ClockCounterClockwise } from '@phosphor-icons/react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const AIAssistant = () => {
    const { user } = useContext(AuthContext);
    const storageKey = `medguard_ai_chat_history_${user?.username || user?.id || 'guest'}`;

    const defaultInitialMessage = [
        { 
            role: 'assistant', 
            content: "আমি আপনার ওষুধ সহায়ক। কী জানতে চান?" 
        }
    ];

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Failed to load chat history:", e);
        }
        return defaultInitialMessage;
    });

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        } catch (e) {
            console.error("Failed to save chat history:", e);
        }
        scrollToBottom();
    }, [messages, storageKey]);

    const handleSend = async (e, text = input) => {
        if (e && e.preventDefault) e.preventDefault();
        const textToSend = text || input;
        if (!textToSend.trim()) return;

        const userMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post('core/ai-assistant/', { prompt: textToSend });
            const aiMsg = { 
                role: 'assistant', 
                content: response.data.response || response.data.error || "Sorry, I could not generate a response."
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("AI Assistant request failed:", error);
            const errorMessage = error.response?.data?.response || error.response?.data?.error || "Sorry, something went wrong. Please try again.";
            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = () => {
        setMessages(defaultInitialMessage);
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.error("Failed to clear chat history:", e);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    const parseInlineFormatting = (text, isUser = false) => {
        const parts = text.split('**');
        return parts.map((part, idx) => {
            if (idx % 2 === 1) {
                return <strong key={idx} style={{ color: isUser ? '#FFFFFF' : 'var(--primary)', fontWeight: 700 }}>{part}</strong>;
            }
            if (part.includes('*')) {
                const subParts = part.split('*');
                return subParts.map((sub, sIdx) => sIdx % 2 === 1 ? <em key={sIdx} style={{ fontStyle: 'italic', color: isUser ? '#E2E8F0' : 'var(--text-muted)', opacity: 0.9 }}>{sub}</em> : sub);
            }
            return part;
        });
    };

    const renderFormattedText = (text, isUser = false) => {
        return text.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} style={{ height: '0.4rem' }} />;

            if (trimmed.startsWith('> ⚠️') || trimmed.startsWith('>')) {
                const warningMsg = trimmed.replace(/^>\s*⚠️?\s*/, '');
                return (
                    <div key={i} style={{ 
                        background: 'rgba(239, 68, 68, 0.12)', 
                        borderLeft: '4px solid #EF4444', 
                        padding: '0.75rem 1rem', 
                        marginTop: '0.75rem',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        color: isUser ? '#FFFFFF' : 'var(--text-main)',
                        display: 'flex', gap: '0.6rem', alignItems: 'center',
                        fontSize: '0.875rem', fontWeight: 500
                    }}>
                        <WarningCircle size={22} weight="fill" style={{ flexShrink: 0, color: '#EF4444' }} />
                        <div>{parseInlineFormatting(warningMsg, isUser)}</div>
                    </div>
                );
            }

            if (trimmed.startsWith('•')) {
                const content = trimmed.substring(1).trim();
                return (
                    <div key={i} style={{ 
                        display: 'flex', gap: '0.6rem', alignItems: 'flex-start', margin: '0.4rem 0',
                        background: isUser ? 'rgba(255, 255, 255, 0.15)' : 'var(--primary-light)', padding: '0.65rem 0.85rem', borderRadius: '0.6rem',
                        border: isUser ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border)'
                    }}>
                        <span style={{ color: isUser ? '#FFFFFF' : 'var(--primary)', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                        <div style={{ flex: 1, fontSize: '0.925rem', lineHeight: 1.5, color: isUser ? '#FFFFFF' : 'var(--text-main)', fontWeight: 500 }}>
                            {parseInlineFormatting(content, isUser)}
                        </div>
                    </div>
                );
            }

            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return (
                    <div key={i} style={{ fontSize: '1.05rem', fontWeight: 700, color: isUser ? '#FFFFFF' : 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                        {trimmed.replace(/\*\*/g, '')}
                    </div>
                );
            }

            return (
                <div key={i} style={{ margin: '0.25rem 0', lineHeight: 1.5, color: isUser ? '#FFFFFF' : 'var(--text-main)', fontWeight: 500 }}>
                    {parseInlineFormatting(trimmed, isUser)}
                </div>
            );
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            
            {/* Header with Clear History Option */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 800 }}>
                        <Robot size={28} weight="duotone" /> 
                        AI Medicine Assistant
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.875rem' }}>কৃত্রিম বুদ্ধিমত্তার সাহায্যে আপনার স্বাস্থ্য বিষয়ক যেকোনো প্রশ্ন করুন।</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                        <ClockCounterClockwise size={14} /> History Saved ({messages.length})
                    </span>
                    {messages.length > 1 && (
                        <button 
                            type="button" 
                            onClick={handleClearHistory}
                            style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                padding: '0.4rem 0.85rem', 
                                borderRadius: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Trash size={14} /> Clear History
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Message Log */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '1rem',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{
                                background: msg.role === 'user' ? 'var(--primary)' : 'var(--primary-light)',
                                color: msg.role === 'user' ? '#FFFFFF' : 'var(--primary)',
                                padding: '0.75rem',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '40px', height: '40px',
                                border: '1px solid var(--border)',
                                flexShrink: 0
                            }}>
                                {msg.role === 'user' ? <User size={20} weight="fill" /> : (
                                    <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                                        <path d="M12.001 0c6.627 0 11.999 5.372 11.999 11.999 0 6.627-5.372 12-11.999 12-6.626 0-12-5.373-12-12C0 5.372 5.375 0 12.001 0zM7.228 17.51h1.564V6.444H7.228v11.065zm2.747 0h1.564V6.444H9.975v11.065zm2.747 0h1.565V6.444h-1.565v11.065zm2.745 0h1.563V6.444h-1.563v11.065zM6.16 8.362v7.24l-3.327.91v-9.155l3.327 1.005zm14.776-.913v9.157l-3.329-.913V8.451l3.329-1.002z"/>
                                    </svg>
                                )}
                            </div>
                            
                            <div style={{
                                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                                color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-main)',
                                padding: '1rem 1.25rem',
                                borderRadius: '1rem',
                                borderTopRightRadius: msg.role === 'user' ? 0 : '1rem',
                                borderTopLeftRadius: msg.role === 'user' ? '1rem' : 0,
                                maxWidth: '75%',
                                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                                boxShadow: 'var(--shadow-sm)',
                                position: 'relative'
                            }}>
                                {renderFormattedText(msg.content, msg.role === 'user')}
                                
                                {msg.role === 'assistant' && (
                                    <button style={{
                                        position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem'
                                    }}>
                                        <SpeakerHigh size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38BDF8',
                                padding: '0.75rem', 
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '40px', height: '40px'
                            }}>
                                <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                                    <path d="M12.001 0c6.627 0 11.999 5.372 11.999 11.999 0 6.627-5.372 12-11.999 12-6.626 0-12-5.373-12-12C0 5.372 5.375 0 12.001 0zM7.228 17.51h1.564V6.444H7.228v11.065zm2.747 0h1.564V6.444H9.975v11.065zm2.747 0h1.565V6.444h-1.565v11.065zm2.745 0h1.563V6.444h-1.563v11.065zM6.16 8.362v7.24l-3.327.91v-9.155l3.327 1.005zm14.776-.913v9.157l-3.329-.913V8.451l3.329-1.002z"/>
                                </svg>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '1rem', borderTopLeftRadius: 0, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                Assistant is typing...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area with Textarea */}
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>

                    {/* Textarea Form */}
                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <textarea
                            rows={2}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your medical query or prompt... (Press Enter to send, Shift+Enter for new line)"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-input)',
                                color: 'var(--text-main)',
                                fontFamily: 'inherit',
                                fontSize: '0.925rem',
                                outline: 'none',
                                resize: 'none',
                                minHeight: '52px',
                                maxHeight: '140px',
                                lineHeight: '1.4',
                                transition: 'all 0.15s ease',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary)';
                                e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.boxShadow = 'var(--shadow-sm)';
                            }}
                        />

                        <button 
                            type="submit" 
                            disabled={!input.trim() || loading} 
                            style={{ 
                                height: '48px',
                                width: '48px', 
                                padding: '0', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                borderRadius: '12px',
                                backgroundColor: (!input.trim() || loading) ? 'var(--border)' : 'var(--primary)',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0,
                                boxShadow: (!input.trim() || loading) ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)'
                            }}
                        >
                            <PaperPlaneRight size={20} weight="fill" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;

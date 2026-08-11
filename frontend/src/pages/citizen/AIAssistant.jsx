import React, { useState, useRef, useEffect } from 'react';
import { Chat, PaperPlaneRight, Robot, User, Microphone, SpeakerHigh, WarningCircle } from '@phosphor-icons/react';
import api from '../../services/api';

const AIAssistant = () => {
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            content: "আমি আপনার ওষুধ সহায়ক। কী জানতে চান?" 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const suggestions = ["পার্শ্বপ্রতিক্রিয়া", "ডোজ", "বিকল্প ওষুধ"];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e, text = input) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post('core/ai-assistant/', { prompt: text });
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

    const parseInlineFormatting = (text) => {
        const parts = text.split('**');
        return parts.map((part, idx) => {
            if (idx % 2 === 1) {
                return <strong key={idx} style={{ color: '#38BDF8', fontWeight: 700 }}>{part}</strong>;
            }
            if (part.includes('*')) {
                const subParts = part.split('*');
                return subParts.map((sub, sIdx) => sIdx % 2 === 1 ? <em key={sIdx} style={{ fontStyle: 'italic', color: '#94A3B8', opacity: 0.9 }}>{sub}</em> : sub);
            }
            return part;
        });
    };

    const renderFormattedText = (text) => {
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
                        color: '#FCA5A5',
                        display: 'flex', gap: '0.6rem', alignItems: 'center',
                        fontSize: '0.875rem', fontWeight: 500
                    }}>
                        <WarningCircle size={22} weight="fill" style={{ flexShrink: 0, color: '#EF4444' }} />
                        <div>{parseInlineFormatting(warningMsg)}</div>
                    </div>
                );
            }

            if (trimmed.startsWith('•')) {
                const content = trimmed.substring(1).trim();
                return (
                    <div key={i} style={{ 
                        display: 'flex', gap: '0.6rem', alignItems: 'flex-start', margin: '0.4rem 0',
                        background: 'rgba(56, 189, 248, 0.08)', padding: '0.65rem 0.85rem', borderRadius: '0.6rem',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}>
                        <span style={{ color: '#38BDF8', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                        <div style={{ flex: 1, fontSize: '0.925rem', lineHeight: 1.5, color: '#F8FAFC' }}>
                            {parseInlineFormatting(content)}
                        </div>
                    </div>
                );
            }

            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return (
                    <div key={i} style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38BDF8', margin: '0.5rem 0 0.25rem 0' }}>
                        {trimmed.replace(/\*\*/g, '')}
                    </div>
                );
            }

            return (
                <div key={i} style={{ margin: '0.25rem 0', lineHeight: 1.5, color: '#FFFFFF' }}>
                    {parseInlineFormatting(trimmed)}
                </div>
            );
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Robot size={28} weight="duotone" /> 
                    AI Medicine Assistant
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>কৃত্রিম বুদ্ধিমত্তার সাহায্যে আপনার স্বাস্থ্য বিষয়ক যেকোনো প্রশ্ন করুন।</p>
            </div>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '1rem',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{
                                background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(56, 189, 248, 0.15)',
                                color: msg.role === 'user' ? '#FFFFFF' : '#38BDF8',
                                padding: '0.75rem',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '40px', height: '40px',
                                border: '1px solid rgba(56, 189, 248, 0.25)'
                            }}>
                                {msg.role === 'user' ? <User size={20} weight="fill" /> : (
                                    <svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                                        <path d="M12.001 0c6.627 0 11.999 5.372 11.999 11.999 0 6.627-5.372 12-11.999 12-6.626 0-12-5.373-12-12C0 5.372 5.375 0 12.001 0zM7.228 17.51h1.564V6.444H7.228v11.065zm2.747 0h1.564V6.444H9.975v11.065zm2.747 0h1.565V6.444h-1.565v11.065zm2.745 0h1.563V6.444h-1.563v11.065zM6.16 8.362v7.24l-3.327.91v-9.155l3.327 1.005zm14.776-.913v9.157l-3.329-.913V8.451l3.329-1.002z"/>
                                    </svg>
                                )}
                            </div>
                            
                            <div style={{
                                background: msg.role === 'user' ? 'var(--primary-color)' : 'var(--bg-card)',
                                color: msg.role === 'user' ? '#FFFFFF' : '#FFFFFF',
                                padding: '1rem 1.25rem',
                                borderRadius: '1rem',
                                borderTopRightRadius: msg.role === 'user' ? 0 : '1rem',
                                borderTopLeftRadius: msg.role === 'user' ? '1rem' : 0,
                                maxWidth: '75%',
                                border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                position: 'relative'
                            }}>
                                {renderFormattedText(msg.content)}
                                
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
                            <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '1rem', borderTopLeftRadius: 0, color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                Assistant is typing...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about side effects, usage, alternatives..."
                        className="input-field"
                        style={{ flex: 1 }}
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading} style={{ width: '50px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <PaperPlaneRight size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;

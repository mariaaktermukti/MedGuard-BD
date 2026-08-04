import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

const AIAssistant = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your MedGuard AI Assistant. How can I help you with your medicines or health today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:8000/api/core/ai-assistant/', { prompt: userMessage.content }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            console.error(err);
            let errorMessage = "Sorry, I couldn't process your request at this time.";
            if (err.response?.status === 503) {
                errorMessage = "AI Service is currently unavailable (API Key missing). Please check your configuration.";
            }
            setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot className="text-primary" size={32} />
                AI Medicine Assistant
            </h1>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            <div style={{ 
                                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: msg.role === 'user' ? 'var(--primary-color)' : '#10b981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div style={{ 
                                background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(0,0,0,0.05)',
                                padding: '1rem 1.25rem',
                                borderRadius: '1rem',
                                borderTopRightRadius: msg.role === 'user' ? '0' : '1rem',
                                borderTopLeftRadius: msg.role === 'assistant' ? '0' : '1rem',
                                color: msg.role === 'user' ? 'white' : 'var(--text-light)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.5',
                                border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={20} />
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem 1.25rem', borderRadius: '1rem', borderTopLeftRadius: 0, color: 'var(--text-muted)' }}>
                                Thinking...
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
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;

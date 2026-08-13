import React, { useState } from 'react';
import { ShieldWarning, Plus, Trash, WarningCircle, CheckCircle, Warning, ChatText } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const InteractionChecker = () => {
    const [medicines, setMedicines] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [result, setResult] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleAdd = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            setMedicines([...medicines, { id: Date.now(), name: inputValue.trim() }]);
            setInputValue('');
            setResult(null); // Reset result when list changes
        }
    };

    const handleRemove = (id) => {
        setMedicines(medicines.filter(m => m.id !== id));
        setResult(null);
    };

    const handleCheck = async () => {
        if (medicines.length < 2) return;
        setIsChecking(true);
        try {
            const medNames = medicines.map(m => m.name);
            const response = await api.post('core/interaction-checker/', { medicines: medNames });
            
            const aiText = response.data.response || '';
            let status = 'caution';
            const lowerText = aiText.toLowerCase();
            if (lowerText.includes('major') || lowerText.includes('dangerous') || lowerText.includes('severe')) status = 'dangerous';
            else if (lowerText.includes('none') || lowerText.includes('safe') || lowerText.includes('no interaction')) status = 'safe';

            setResult({ status, message: aiText });
        } catch (error) {
            console.error("Interaction check failed:", error);
            setResult({ status: 'caution', message: 'দুঃখিত, সংযোগ স্থাপন করা সম্ভব হয়নি। আবার চেষ্টা করুন।' });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldWarning size={32} weight="duotone" /> Medicine Interaction Checker
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>একাধিক ওষুধ একসাথে সেবন করা নিরাপদ কিনা যাচাই করুন।</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>ওষুধ যোগ করুন</h3>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleAdd}
                        placeholder="ওষুধের নাম লিখুন এবং এন্টার চাপুন..."
                        style={{ width: '100%', padding: '1rem', paddingRight: '3rem', borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: '1rem' }}
                    />
                    <Plus size={24} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <AnimatePresence>
                        {medicines.map((med) => (
                            <motion.div 
                                key={med.id} 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(27, 79, 114, 0.05)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}
                            >
                                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{med.name}</span>
                                <button onClick={() => handleRemove(med.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Trash size={20} weight="fill" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {medicines.length > 0 && (
                    <button 
                        onClick={handleCheck}
                        disabled={isChecking || medicines.length < 2}
                        className="ui-btn ui-btn-primary" 
                        style={{ marginTop: '1.5rem', opacity: (isChecking || medicines.length < 2) ? 0.6 : 1 }}
                    >
                        {isChecking ? 'চেক করা হচ্ছে...' : 'চেক করুন'}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `6px solid ${result.status === 'safe' ? 'var(--success)' : result.status === 'dangerous' ? 'var(--danger)' : '#F39C12'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            {result.status === 'safe' && <CheckCircle size={32} weight="fill" color="var(--success)" />}
                            {result.status === 'caution' && <WarningCircle size={32} weight="fill" color="#F39C12" />}
                            {result.status === 'dangerous' && <Warning size={32} weight="fill" color="var(--danger)" />}
                            
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: result.status === 'safe' ? 'var(--success)' : result.status === 'dangerous' ? 'var(--danger)' : '#F39C12' }}>
                                {result.status === 'safe' ? 'নিরাপদ (Safe)' : result.status === 'caution' ? 'সতর্কতা (Caution)' : 'বিপজ্জনক (Dangerous)'}
                            </h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            {result.message}
                        </p>
                        
                        <a href="/dashboard/ai-assistant" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(27, 79, 114, 0.1)', color: 'var(--primary)', padding: '0.75rem 1.25rem', borderRadius: '2rem', textDecoration: 'none', fontWeight: 600 }}>
                            <ChatText size={20} weight="fill" /> AI সহায়ককে জিজ্ঞাসা করুন
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InteractionChecker;

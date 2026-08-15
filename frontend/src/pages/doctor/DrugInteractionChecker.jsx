import React, { useState } from 'react';
import { Plus, Trash, WarningCircle, CheckCircle, Warning } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const DrugInteractionChecker = () => {
    const [medicines, setMedicines] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [result, setResult] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            setMedicines((prev) => [...prev, { id: Date.now(), name: inputValue.trim() }]);
            setInputValue('');
            setResult(null);
        }
    };

    const handleRemove = (id) => {
        setMedicines((prev) => prev.filter((m) => m.id !== id));
        setResult(null);
    };

    const handleCheck = async () => {
        if (medicines.length < 2) return;
        setIsChecking(true);
        setError('');
        try {
            const medNames = medicines.map((m) => m.name);
            const response = await api.post('doctor/interactions/check/', { medicines: medNames });

            const aiText = response.data.response || '';
            let severity = 'caution';
            const lowerText = aiText.toLowerCase();
            if (lowerText.includes('major') || lowerText.includes('dangerous') || lowerText.includes('severe')) severity = 'dangerous';
            else if (lowerText.includes('none') || lowerText.includes('safe') || lowerText.includes('no interaction')) severity = 'safe';

            setResult({ severity, message: aiText });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not check interactions right now.');
        } finally {
            setIsChecking(false);
        }
    };

    const severityColor = result?.severity === 'safe' ? 'var(--success)' : result?.severity === 'dangerous' ? 'var(--danger)' : 'var(--warning)';

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="Drug Interaction Checker" subtitle="Check whether prescribed medicines are safe to take together." />
                <CardContent>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleAdd}
                            placeholder="Type a medicine name and press Enter..."
                            style={{ width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                        <Plus size={20} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem', marginBottom: medicines.length ? '1rem' : 0 }}>
                        {medicines.map((med) => (
                            <div key={med.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <span style={{ fontWeight: 600 }}>{med.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(med.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

                    <Button type="button" onClick={handleCheck} disabled={isChecking || medicines.length < 2}>
                        {isChecking ? 'Checking...' : 'Check Interactions'}
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardContent>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            {result.severity === 'safe' && <CheckCircle size={28} weight="fill" color="var(--success)" />}
                            {result.severity === 'caution' && <WarningCircle size={28} weight="fill" color="var(--warning)" />}
                            {result.severity === 'dangerous' && <Warning size={28} weight="fill" color="var(--danger)" />}
                            <h3 style={{ margin: 0, color: severityColor }}>
                                {result.severity === 'safe' ? 'Likely Safe' : result.severity === 'dangerous' ? 'Dangerous Interaction' : 'Use Caution'}
                            </h3>
                        </div>
                        <p style={{ color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{result.message}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default DrugInteractionChecker;

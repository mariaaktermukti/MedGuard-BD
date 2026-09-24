import React, { useEffect, useState } from 'react';
import { Gear, Check, WarningCircle } from '@phosphor-icons/react';
import api from '../services/api';

const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
};

const Field = ({ label, hint, error, children }) => (
    <div className="input-group" style={{ marginBottom: 0 }}>
        <label>{label}</label>
        {children}
        {hint && !error && <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hint}</p>}
        {error && <p role="alert" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
);

const Settings = () => {
    const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('users/me/');
                if (cancelled) return;
                setAccount(res.data);
                setForm({
                    full_name: res.data.full_name || '',
                    phone: res.data.phone || '',
                    email: res.data.email || '',
                });
            } catch {
                if (!cancelled) setMessage('Could not load your profile right now.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});
        setMessage('');
        setSaving(true);
        try {
            const res = await api.patch('users/me/', form);
            setAccount(res.data);
            // The header name comes from AuthContext, which has no setter, so it
            // catches up on the next page load rather than immediately.
            setMessage('Your profile has been updated.');
        } catch (error) {
            const data = error.response?.data;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                setErrors(data);
            } else {
                setMessage('Could not save your profile. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p style={{ color: 'var(--text-muted)' }}>Loading your profile…</p>;
    }

    return (
        <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <Gear size={28} weight="duotone" color="var(--primary)" />
                <h1 style={{ margin: 0, color: 'var(--primary)' }}>Account Settings</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.75rem' }}>
                Update the details other parts of MedGuard use to find you.
            </p>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                    <Field label="Full name" error={errors.full_name}>
                        <input value={form.full_name} onChange={update('full_name')} maxLength={100} style={inputStyle} />
                    </Field>

                    <Field
                        label="Phone number"
                        hint="A pharmacy looks you up by this number when recording a sale. Without it they can only find you by username."
                        error={errors.phone}
                    >
                        <input value={form.phone} onChange={update('phone')} maxLength={20} placeholder="e.g. 01700000000" style={inputStyle} />
                    </Field>

                    <Field label="Email" error={errors.email}>
                        <input type="email" value={form.email} onChange={update('email')} style={inputStyle} />
                    </Field>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        {message && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: message.startsWith('Could not') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                                {message.startsWith('Could not') ? <WarningCircle size={18} weight="fill" /> : <Check size={18} weight="bold" />}
                                {message}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {account && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Account</h2>
                    <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        <div><strong style={{ color: 'var(--text-main)' }}>Username:</strong> {account.username}</div>
                        <div><strong style={{ color: 'var(--text-main)' }}>Role:</strong> {account.role}</div>
                    </div>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Username and role cannot be changed here. Ask a DGDA administrator if either is wrong.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Settings;

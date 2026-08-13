import React, { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, Trash, PencilSimple, Check, X } from '@phosphor-icons/react';
import api from '../../services/api';

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

const Field = ({ label, children }) => (
    <div className="input-group" style={{ marginBottom: 0 }}>
        <label>{label}</label>
        {children}
    </div>
);

const Warehouses = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [form, setForm] = useState({ name: '', location: '', capacity: '' });
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', location: '', capacity: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('core/distributor/warehouses/');
            setWarehouses(response.data);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
            setMessage('Warehouse name is required.');
            return;
        }

        setSubmitting(true);
        setMessage('');
        try {
            await api.post('core/distributor/warehouses/', {
                name: form.name.trim(),
                location: form.location.trim() || null,
                capacity: form.capacity ? Number(form.capacity) : null,
            });
            setMessage('Warehouse added successfully.');
            setForm({ name: '', location: '', capacity: '' });
            fetchWarehouses();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not add this warehouse.');
        } finally {
            setSubmitting(false);
        }
    };

    const startEdit = (warehouse) => {
        setEditingId(warehouse.id);
        setEditForm({
            name: warehouse.name,
            location: warehouse.location || '',
            capacity: warehouse.capacity ?? '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: '', location: '', capacity: '' });
    };

    const saveEdit = async (id) => {
        if (!editForm.name.trim()) {
            setMessage('Warehouse name is required.');
            return;
        }

        setSavingEdit(true);
        try {
            await api.patch(`core/distributor/warehouses/${id}/`, {
                name: editForm.name.trim(),
                location: editForm.location.trim() || null,
                capacity: editForm.capacity ? Number(editForm.capacity) : null,
            });
            setMessage('Warehouse updated.');
            cancelEdit();
            fetchWarehouses();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not update this warehouse.');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async (warehouse) => {
        const confirmed = window.confirm(`Delete "${warehouse.name}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await api.delete(`core/distributor/warehouses/${warehouse.id}/`);
            setMessage('Warehouse deleted.');
            fetchWarehouses();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not delete this warehouse.');
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>Warehouse Management</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Create and manage your warehouse locations.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Add Warehouse</h2>
                <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem' }}>
                        <Field label="Name">
                            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Dhaka Central Depot" style={inputStyle} />
                        </Field>
                        <Field label="Location (optional)">
                            <input value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} placeholder="e.g. Tejgaon, Dhaka" style={inputStyle} />
                        </Field>
                        <Field label="Capacity (optional)">
                            <input type="number" min="0" value={form.capacity} onChange={(e) => setForm((current) => ({ ...current, capacity: e.target.value }))} placeholder="e.g. 50000" style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                            <Plus size={18} weight="bold" /> Add Warehouse
                        </button>
                    </div>
                </form>
                {message && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{message}</p>}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Your Warehouses</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading warehouses...</p>
                ) : warehouses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <WarehouseIcon size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No warehouses yet. Add one above to get started.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {warehouses.map((warehouse) => (
                            <div key={warehouse.id} style={{ padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                                {editingId === warehouse.id ? (
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                                            <input value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} placeholder="Name" style={inputStyle} />
                                            <input value={editForm.location} onChange={(e) => setEditForm((current) => ({ ...current, location: e.target.value }))} placeholder="Location" style={inputStyle} />
                                            <input type="number" min="0" value={editForm.capacity} onChange={(e) => setEditForm((current) => ({ ...current, capacity: e.target.value }))} placeholder="Capacity" style={inputStyle} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button type="button" onClick={cancelEdit} style={{ ...inputStyle, width: 'auto', padding: '0.5rem 1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <X size={16} /> Cancel
                                            </button>
                                            <button type="button" className="ui-btn ui-btn-primary" disabled={savingEdit} onClick={() => saveEdit(warehouse.id)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                                                <Check size={16} /> Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{warehouse.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {warehouse.location || 'No location set'} &bull; Capacity: {warehouse.capacity ?? 'N/A'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="button" onClick={() => startEdit(warehouse)} style={{ ...inputStyle, width: 'auto', padding: '0.5rem 0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <PencilSimple size={16} /> Edit
                                            </button>
                                            <button type="button" onClick={() => handleDelete(warehouse)} style={{ width: 'auto', padding: '0.5rem 0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', background: 'transparent', color: 'var(--danger)' }}>
                                                <Trash size={16} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Warehouses;

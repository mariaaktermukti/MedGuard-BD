import React, { useState } from 'react';
import { ChartLineUp, Sparkle } from '@phosphor-icons/react';
import api from '../../services/api';

const StockForecast = () => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateForecast = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('core/pharmacy/demand-forecast/');
            setForecast(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not generate a forecast right now.');
        } finally {
            setLoading(false);
        }
    };

    const confidencePercent = forecast ? Math.round(Number(forecast.confidence_score) * 100) : 0;

    return (
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>AI Stock Forecasting</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Estimate next month's demand from your recent sales and current stock.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <button type="button" className="ui-btn ui-btn-primary" onClick={generateForecast} disabled={loading} style={{ width: 'auto', padding: '0.75rem 1.5rem', margin: '0 auto' }}>
                    <Sparkle size={18} /> {loading ? 'Generating...' : 'Generate Forecast'}
                </button>
                {error && <p style={{ marginTop: '1rem', color: 'var(--danger)' }}>{error}</p>}
            </div>

            {forecast && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <ChartLineUp size={22} color="var(--primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Forecast for {forecast.forecast_date}</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{forecast.predicted_demand}</div>
                            <div style={{ color: 'var(--text-muted)' }}>units predicted demand — {forecast.region}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: `conic-gradient(var(--primary) 0% ${confidencePercent}%, rgba(148, 163, 184, 0.16) ${confidencePercent}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{confidencePercent}%</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>{forecast.seasonal_signal}</p>
                </div>
            )}
        </div>
    );
};

export default StockForecast;

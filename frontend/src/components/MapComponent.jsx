import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// A fixed zoom clipped the northernmost markers (Rangpur sat on the top edge), so the
// view is fitted to whatever is plotted. maxZoom keeps a single point from zooming to
// street level, and the key means this only re-fits when the coordinates really change.
const FitToPoints = ({ points }) => {
    const map = useMap();
    const key = (points || []).map((point) => `${point.lat},${point.lng}`).join('|');
    useEffect(() => {
        if (!key) return;
        const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
        // Fitting before the container has its final size zooms out to half of Asia,
        // so measure first and fit on the next frame.
        const timer = setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
        }, 120);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, key]);
    return null;
};

// `legend` is opt-in: a caller that colours its own points (supply coverage,
// the pharmacy finder) already labels them in its own words, so only the
// callers whose colours come from this file ask for one.
const MapComponent = ({ points, legend = null }) => {
    // Center on Bangladesh; overridden by FitToPoints as soon as there is anything to show.
    const center = [23.6850, 90.3563];

    // A point may name its own colour (the supply map draws supplied/unsupplied
    // regions); otherwise the colour is derived from what kind of point it is.
    const SEVERITY_COLOURS = {
        critical: '#dc3545',  // red
        high: '#fd7e14',      // orange
        medium: '#ffc107',    // amber
        low: '#0d6efd',       // blue
    };

    const getColor = (point) => {
        if (point.color) return point.color;
        const { type, severity } = point;
        // Severity decides the colour, because that is what a heat map is for.
        // It used to be decided by type, and the adr branch had no case for
        // 'critical' - so Dhaka, with 42 critical events, fell through to the
        // same calm blue as a district with one low-severity one. Types with no
        // rule at all (price_anomaly, expired, supply_chain_anomaly) were blue too.
        if (severity && SEVERITY_COLOURS[severity]) return SEVERITY_COLOURS[severity];
        if (type === 'counterfeit') return '#dc3545';
        if (type === 'shortage') return '#fd7e14';
        return '#0d6efd';
    };

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            {legend && legend.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: '1.25rem', left: '0.75rem', zIndex: 1000,
                    background: 'rgba(255,255,255,0.94)', borderRadius: '0.5rem',
                    padding: '0.5rem 0.7rem', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    display: 'grid', gap: '0.25rem', fontSize: '0.75rem', color: '#333',
                }}>
                    {legend.map(({ label, color }) => (
                        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {label}
                        </span>
                    ))}
                </div>
            )}
            <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <FitToPoints points={points} />
                {points && points.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        pathOptions={{
                            color: getColor(point),
                            fillColor: getColor(point),
                            fillOpacity: 0.6,
                        }}
                        // count / 5 with a floor of 10 meant everything under 50
                        // drew at the same size: 42 events and 1 looked alike.
                        // A square root spreads small counts apart.
                        radius={point.count > 0 ? Math.max(8, Math.min(30, 6 + Math.sqrt(point.count) * 3)) : 12}
                    >
                        <Popup>
                            <div style={{ color: '#333' }}>
                                <h4 style={{ margin: '0 0 5px 0', textTransform: 'capitalize' }}>{point.district}</h4>
                                {point.details ? (
                                    // Callers with their own vocabulary (supply coverage) pass
                                    // labelled rows rather than bending Type/Count/Severity.
                                    point.details.map(([label, value]) => (
                                        <p key={label} style={{ margin: '0' }}><strong>{label}:</strong> {value}</p>
                                    ))
                                ) : (
                                    <>
                                        <p style={{ margin: '0' }}><strong>Type:</strong> {(point.type || '').toUpperCase()}</p>
                                        {point.count > 0 && <p style={{ margin: '0' }}><strong>Count:</strong> {point.count}</p>}
                                        {point.medicine && <p style={{ margin: '0' }}><strong>Medicine:</strong> {point.medicine}</p>}
                                        <p style={{ margin: '0' }}><strong>Severity:</strong> {point.severity}</p>
                                    </>
                                )}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;

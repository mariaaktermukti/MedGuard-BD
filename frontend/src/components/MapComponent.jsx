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

const MapComponent = ({ points }) => {
    // Center on Bangladesh; overridden by FitToPoints as soon as there is anything to show.
    const center = [23.6850, 90.3563];

    // A point may name its own colour (the supply map draws supplied/unsupplied
    // regions); otherwise the colour is derived from what kind of point it is.
    const getColor = (point) => {
        if (point.color) return point.color;
        const { type, severity } = point;
        if (type === 'counterfeit') return '#dc3545'; // Danger Red
        if (type === 'shortage') return '#fd7e14'; // Orange
        if (type === 'adr') {
            if (severity === 'high') return '#ffc107'; // Warning Yellow
            if (severity === 'medium') return '#17a2b8'; // Info Cyan
            return '#0d6efd'; // Primary Blue
        }
        return '#0d6efd';
    };

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                        radius={point.count > 0 ? Math.max(10, Math.min(30, point.count / 5)) : 15}
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

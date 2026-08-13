import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const MapComponent = ({ points }) => {
    // Center on Bangladesh
    const center = [23.6850, 90.3563];

    const getColor = (type, severity) => {
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
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {points && points.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        pathOptions={{ 
                            color: getColor(point.type, point.severity),
                            fillColor: getColor(point.type, point.severity),
                            fillOpacity: 0.6,
                        }}
                        radius={point.count ? Math.max(10, Math.min(30, point.count / 5)) : 15}
                    >
                        <Popup>
                            <div style={{ color: '#333' }}>
                                <h4 style={{ margin: '0 0 5px 0', textTransform: 'capitalize' }}>{point.district}</h4>
                                <p style={{ margin: '0' }}><strong>Type:</strong> {point.type.toUpperCase()}</p>
                                {point.count && <p style={{ margin: '0' }}><strong>Count:</strong> {point.count}</p>}
                                {point.medicine && <p style={{ margin: '0' }}><strong>Medicine:</strong> {point.medicine}</p>}
                                <p style={{ margin: '0' }}><strong>Severity:</strong> {point.severity}</p>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;

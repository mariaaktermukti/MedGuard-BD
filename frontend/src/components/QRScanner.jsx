import React, { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraSlash, X } from '@phosphor-icons/react';
import Button from './ui/Button';

const cameraErrorMessage = (error) => {
    const name = error?.name || '';
    const text = String(error?.message || error || '');
    if (name === 'NotAllowedError' || /permission|denied/i.test(text)) return 'Camera permission was denied. Allow camera access in your browser settings, then try again.';
    if (name === 'NotFoundError' || /not ?found|no camera|requested device/i.test(text)) return 'No camera was found on this device. Enter the QR code manually instead.';
    if (name === 'NotReadableError' || /in use|could not start video source/i.test(text)) return 'The camera is already in use by another app or tab. Close it and try again.';
    return 'Could not start the camera. Enter the QR code manually instead.';
};

const QRScanner = ({ onScan, onClose }) => {
    const elementId = `qr-scanner-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const onScanRef = useRef(onScan);
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(true);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setError('Camera access needs a secure connection (HTTPS or localhost). Enter the QR code manually instead.');
            setStarting(false);
            return undefined;
        }

        const scanner = new Html5Qrcode(elementId, { verbose: false });
        let active = true;
        let handled = false;

        // getCameras() triggers the permission prompt, so denial and "no camera" both surface here
        const startPromise = Html5Qrcode.getCameras()
            .then((cameras) => {
                if (!cameras.length) throw Object.assign(new Error('No camera found'), { name: 'NotFoundError' });
                if (!active) return undefined;
                return scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        if (handled) return;
                        handled = true;
                        onScanRef.current?.(decodedText);
                    },
                    () => {} // fires on every frame without a QR code; not an error
                );
            })
            .then(() => {
                if (active) setStarting(false);
            })
            .catch((err) => {
                if (!active) return;
                setError(cameraErrorMessage(err));
                setStarting(false);
            });

        // Wait for any in-flight start before stopping, so StrictMode's mount/unmount/mount never leaves the camera on
        return () => {
            active = false;
            startPromise
                .then(() => (scanner.isScanning ? scanner.stop() : undefined))
                .catch(() => {})
                .finally(() => {
                    try {
                        scanner.clear();
                    } catch {
                        // container already removed from the DOM
                    }
                });
        };
    }, [elementId]);

    return (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '0 auto', borderRadius: '1rem', overflow: 'hidden', background: '#000', minHeight: '260px', display: error ? 'none' : 'block' }}>
                <div id={elementId} style={{ width: '100%' }} />
                {starting && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
                        Starting camera...
                    </div>
                )}
            </div>
            {error && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: 600 }}>
                    <CameraSlash size={20} /> {error}
                </div>
            )}
            {onClose && (
                <Button type="button" variant="outline" size="sm" onClick={onClose} style={{ justifySelf: 'center' }}>
                    <X size={16} /> Close scanner
                </Button>
            )}
        </div>
    );
};

export default QRScanner;

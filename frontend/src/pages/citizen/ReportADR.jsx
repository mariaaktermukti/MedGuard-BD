import React, { useState, useRef } from 'react';
import axios from 'axios';
import { AlertTriangle, Mic, MicOff, Send, Upload, Camera } from 'lucide-react';

const ReportADR = () => {
    const [medicineId, setMedicineId] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('mild');
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const recognitionRef = useRef(null);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please type your description.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US'; // Or 'bn-BD' for Bangla
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setDescription((prev) => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
        recognitionRef.current = recognition;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/api/core/adr/', {
                medicine: medicineId, // Assuming ID is entered for now
                description,
                severity
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setSuccess(true);
            setDescription('');
            setMedicineId('');
            setSeverity('mild');
        } catch (err) {
            console.error(err);
            alert('Failed to submit report. Please check the Medicine ID.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }} className="glass-panel p-8">
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <AlertTriangle size={40} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Report Submitted Successfully</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Thank you for your report. Our medical team and the DGDA will review it to ensure drug safety.</p>
                <button className="btn btn-primary" onClick={() => setSuccess(false)}>Submit Another Report</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle className="text-primary" size={32} />
                Report Adverse Drug Reaction
            </h1>

            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>If you have experienced side effects from a medicine, please report it here. You can type or use your voice to describe the reaction.</p>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Medicine ID (Internal ID)</label>
                    <input 
                        type="number" 
                        required 
                        className="input-field" 
                        value={medicineId}
                        onChange={e => setMedicineId(e.target.value)}
                        placeholder="e.g. 1" 
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Severity</label>
                    <select className="input-field" value={severity} onChange={e => setSeverity(e.target.value)}>
                        <option value="mild">Mild (Slight discomfort, no treatment needed)</option>
                        <option value="moderate">Moderate (Interferes with normal activities)</option>
                        <option value="severe">Severe (Incapacitating, life-threatening, or requires hospitalization)</option>
                    </select>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ fontWeight: 500 }}>Description of Reaction</label>
                        <button 
                            type="button" 
                            onClick={toggleRecording}
                            style={{ 
                                background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                color: isRecording ? '#ef4444' : 'var(--primary-color)',
                                border: 'none', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                            {isRecording ? 'Stop Recording' : 'Voice Input (English/Bangla)'}
                        </button>
                    </div>
                    <textarea 
                        required 
                        className="input-field" 
                        rows="5"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Describe the side effects, when they started, and how long they lasted..."
                        style={{ width: '100%' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Attach Image (Optional)</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-light)' }}>
                            <Upload size={18} /> Upload Photo
                        </button>
                        <button type="button" className="btn" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-light)' }}>
                            <Camera size={18} /> Take Photo
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2.5rem' }}>
                        <Send size={18} />
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReportADR;

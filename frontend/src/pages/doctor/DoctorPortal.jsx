import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Users, ClipboardText, ShieldWarning, MagnifyingGlass, QrCode, Warning, Bell, Star, Database, VideoCamera } from '@phosphor-icons/react';
import PatientMedicineHistory from './PatientMedicineHistory';
import DigitalPrescription from './DigitalPrescription';
import DrugInteractionChecker from './DrugInteractionChecker';
import MedicineLookup from './MedicineLookup';
import DrugPassportViewer from './DrugPassportViewer';
import DoctorADRReport from './DoctorADRReport';
import RecallAlerts from './RecallAlerts';
import MedicineLibrary from './MedicineLibrary';
import ResearchDatasets from './ResearchDatasets';
import DoctorConsultations from './DoctorConsultations';

const tabs = [
    { path: 'patient-history', label: 'Patient Medicine History', icon: <Users size={18} /> },
    { path: 'prescriptions', label: 'Digital Prescription', icon: <ClipboardText size={18} /> },
    { path: 'interaction-checker', label: 'Drug Interaction Checker', icon: <ShieldWarning size={18} /> },
    { path: 'medicine-lookup', label: 'Medicine Lookup', icon: <MagnifyingGlass size={18} /> },
    { path: 'drug-passport', label: 'Digital Drug Passport', icon: <QrCode size={18} /> },
    { path: 'adr-report', label: 'Report ADR', icon: <Warning size={18} /> },
    { path: 'recall-alerts', label: 'Recall Notifications', icon: <Bell size={18} /> },
    { path: 'medicine-library', label: 'My Medicine Library', icon: <Star size={18} /> },
    { path: 'research-datasets', label: 'Research Datasets', icon: <Database size={18} /> },
    { path: 'consultations', label: 'Consultations', icon: <VideoCamera size={18} /> },
];

const DoctorPortal = () => {
    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)' }}>Doctor Portal</h1>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>Smart prescriptions and patient medicine management.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        style={({ isActive }) => ({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: isActive ? '#fff' : 'var(--text-main)',
                            background: isActive ? 'var(--primary)' : 'transparent',
                        })}
                    >
                        {tab.icon} {tab.label}
                    </NavLink>
                ))}
            </div>

            <Routes>
                <Route index element={<PatientMedicineHistory />} />
                <Route path="patient-history" element={<PatientMedicineHistory />} />
                <Route path="prescriptions" element={<DigitalPrescription />} />
                <Route path="interaction-checker" element={<DrugInteractionChecker />} />
                <Route path="medicine-lookup" element={<MedicineLookup />} />
                <Route path="drug-passport" element={<DrugPassportViewer />} />
                <Route path="adr-report" element={<DoctorADRReport />} />
                <Route path="recall-alerts" element={<RecallAlerts />} />
                <Route path="medicine-library" element={<MedicineLibrary />} />
                <Route path="research-datasets" element={<ResearchDatasets />} />
                <Route path="consultations" element={<DoctorConsultations />} />
            </Routes>
        </div>
    );
};

export default DoctorPortal;

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Stethoscope, ShieldCheck, Heartbeat } from '@phosphor-icons/react';
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

const DoctorPortal = () => {
    return (
        <div style={{ display: 'grid', gap: '1.75rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '2.5rem' }}>
            {/* Sleek Portal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        <ShieldCheck size={16} weight="fill" /> Verified BMDC Doctor Workspace
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Stethoscope size={34} weight="duotone" color="var(--primary)" /> Doctor Portal
                    </h1>
                    <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.925rem' }}>
                        Smart digital prescriptions, patient medicine intelligence & real-time telehealth consultations.
                    </p>
                </div>
            </div>

            {/* Portal Routes */}
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

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Stethoscope } from '@phosphor-icons/react';
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

// These ten destinations now live in the sidebar (components/Sidebar.jsx, doctorNavItems);
// keep the two lists in step when a tab is added or renamed.
const DoctorPortal = () => {
    return (
        // One column for the heading and whichever page is showing, so the two line up.
        // Capped and centred the way the other portals cap their own pages, which stops
        // a form from stretching the full width of a large screen.
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Stethoscope size={30} weight="duotone" /> Doctor Portal</h1>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>Smart prescriptions and patient medicine management.</p>
            </div>

            {/* The same ten destinations are in the sidebar, which every other portal
                navigates from, so repeating them across the top said nothing new. */}
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

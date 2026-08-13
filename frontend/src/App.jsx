import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import DrugPassport from './pages/citizen/DrugPassport';
import MyMedicines from './pages/citizen/MyMedicines';
import ReportADR from './pages/citizen/ReportADR';
import AIAssistant from './pages/citizen/AIAssistant';
import PharmacyFinder from './pages/citizen/PharmacyFinder';
import InteractionChecker from './pages/citizen/InteractionChecker';
import Notifications from './pages/citizen/Notifications';
import ManufacturerPortal from './pages/manufacturer/ManufacturerPortal';
import Warehouses from './pages/distributor/Warehouses';
import Shipments from './pages/distributor/Shipments';
import Analytics from './pages/distributor/Analytics';
import RouteOptimization from './pages/distributor/RouteOptimization';
import FleetMonitoring from './pages/distributor/FleetMonitoring';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            {/* Additional protected routes can go here */}
            <Route path="drug-passport" element={<DrugPassport />} />
            <Route path="my-medicines" element={<MyMedicines />} />
            <Route path="report-adr" element={<ReportADR />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="find-pharmacy" element={<PharmacyFinder />} />
            <Route path="interaction-checker" element={<InteractionChecker />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="manufacturer" element={<ManufacturerPortal />} />
            <Route path="manufacturer/register" element={<ManufacturerPortal />} />
            <Route path="manufacturer/batch" element={<ManufacturerPortal />} />
            <Route path="manufacturer/verify" element={<ManufacturerPortal />} />
            <Route path="manufacturer/recall" element={<ManufacturerPortal />} />
            <Route path="manufacturer/shipment" element={<ManufacturerPortal />} />
            <Route path="distributor/warehouses" element={<Warehouses />} />
            <Route path="distributor/shipments" element={<Shipments />} />
            <Route path="distributor/analytics" element={<Analytics />} />
            <Route path="distributor/route-optimization" element={<RouteOptimization />} />
            <Route path="distributor/fleet-monitoring" element={<FleetMonitoring />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { DashboardSkeleton } from './components/ui/Skeleton';

// Lazy-Loaded Page Components for Fast Chunk Loading
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DrugPassport = lazy(() => import('./pages/citizen/DrugPassport'));
const MyMedicines = lazy(() => import('./pages/citizen/MyMedicines'));
const ReportADR = lazy(() => import('./pages/citizen/ReportADR'));
const AIAssistant = lazy(() => import('./pages/citizen/AIAssistant'));
const PharmacyFinder = lazy(() => import('./pages/citizen/PharmacyFinder'));
const InteractionChecker = lazy(() => import('./pages/citizen/InteractionChecker'));
const Notifications = lazy(() => import('./pages/citizen/Notifications'));
const ManufacturerPortal = lazy(() => import('./pages/manufacturer/ManufacturerPortal'));
const Inventory = lazy(() => import('./pages/pharmacy/Inventory'));
const Suppliers = lazy(() => import('./pages/pharmacy/Suppliers'));
const BatchVerify = lazy(() => import('./pages/pharmacy/BatchVerify'));
const SaleLogging = lazy(() => import('./pages/pharmacy/SaleLogging'));
const Alerts = lazy(() => import('./pages/pharmacy/Alerts'));
const StockForecast = lazy(() => import('./pages/pharmacy/StockForecast'));
const Complaints = lazy(() => import('./pages/pharmacy/Complaints'));
const PharmacyDashboard = lazy(() => import('./pages/pharmacy/PharmacyDashboard'));
const Warehouses = lazy(() => import('./pages/distributor/Warehouses'));
const Shipments = lazy(() => import('./pages/distributor/Shipments'));
const Analytics = lazy(() => import('./pages/distributor/Analytics'));
const RouteOptimization = lazy(() => import('./pages/distributor/RouteOptimization'));
const FleetMonitoring = lazy(() => import('./pages/distributor/FleetMonitoring'));
const RouteRisk = lazy(() => import('./pages/distributor/RouteRisk'));
const DGDAPortal = lazy(() => import('./pages/dgda/DGDAPortal'));
const DoctorPortal = lazy(() => import('./pages/doctor/DoctorPortal'));

function App() {
  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <Suspense fallback={<DashboardSkeleton />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardLayout />}>
                      <Route index element={<Dashboard />} />
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
                      <Route path="pharmacy" element={<PharmacyDashboard />} />
                      <Route path="pharmacy/inventory" element={<Inventory />} />
                      <Route path="dgda/*" element={<DGDAPortal />} />
                      <Route path="doctor/*" element={<DoctorPortal />} />
                      <Route path="pharmacy/suppliers" element={<Suppliers />} />
                      <Route path="pharmacy/verify" element={<BatchVerify />} />
                      <Route path="pharmacy/sales" element={<SaleLogging />} />
                      <Route path="pharmacy/alerts" element={<Alerts />} />
                      <Route path="pharmacy/forecast" element={<StockForecast />} />
                      <Route path="pharmacy/complaints" element={<Complaints />} />
                      <Route path="distributor/warehouses" element={<Warehouses />} />
                      <Route path="distributor/shipments" element={<Shipments />} />
                      <Route path="distributor/analytics" element={<Analytics />} />
                      <Route path="distributor/route-optimization" element={<RouteOptimization />} />
                      <Route path="distributor/fleet-monitoring" element={<FleetMonitoring />} />
                      <Route path="distributor/route-risk" element={<RouteRisk />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

import React from 'react';
import { Link } from 'react-router-dom';
import { Pill, Building2, Building, ShieldCheck, Truck, Stethoscope, FlaskConical, ArrowRight } from 'lucide-react';
import './landing.css';

const ParticipantCard = ({ num, icon, title, desc, color }) => (
    <div className="landing-card">
        <div className="card-header">
            <div className="icon-wrapper" style={{ color: color }}>
                {icon}
            </div>
            <span className="card-num">{num}</span>
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
    </div>
);

const FlowNode = ({ icon, label }) => (
    <div className="flow-node">
        {icon}
        <span>{label}</span>
    </div>
);

const Landing = () => {
    return (
        <div className="landing-page">
            {/* Navbar */}
            <nav className="landing-nav">
                <div className="logo-container">
                    <div className="logo-icon">
                        <Pill size={20} />
                    </div>
                    <div className="logo-text">
                        <span className="main-title">MedGuard_BD</span>
                        <span className="sub-title">Pharmaceutical Supply Chain</span>
                    </div>
                </div>
                <div className="nav-actions">
                    <Link to="/login" className="nav-link">Login</Link>
                    <Link to="/register" className="nav-btn-register">Register</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section">
                <div className="hero-content">
                    <div className="badge">
                        Trusted • Traceable • Transparent
                    </div>
                    <h1>
                        The complete platform for<br />
                        the <span className="text-highlight">pharmaceutical<br />ecosystem</span>
                    </h1>
                    <p className="hero-desc">
                        Track every drug from manufacturer to patient. A unified platform connecting 7 key stakeholders
                        in the pharmaceutical supply chain with role-specific tools and full auditability.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn-create">Create an account</Link>
                        <Link to="/login" className="btn-signin">Sign in</Link>
                    </div>
                </div>
            </header>

            {/* Participants Grid */}
            <section className="participants-section">
                <div className="section-header">
                    <h2>Built for 7 types of participants</h2>
                    <p>Each entity has a dedicated portal with specialized tools.</p>
                </div>

                <div className="participants-grid">
                    <ParticipantCard
                        num="01" icon={<div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#a855f7' }}><Building2 size={24} /></div>}
                        title="Citizen / Patient"
                        desc="View prescriptions, purchase history & verify drug authenticity."
                        color="#a855f7"
                    />
                    <ParticipantCard
                        num="02" icon={<div style={{ background: 'rgba(209, 213, 219, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#d1d5db' }}><Building size={24} /></div>}
                        title="Government Regulator"
                        desc="Audit the supply chain, monitor compliance & generate reports."
                        color="#d1d5db"
                    />
                    <ParticipantCard
                        num="03" icon={<div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#ef4444' }}><Pill size={24} /></div>}
                        title="Pharmacy"
                        desc="Manage inventory, fulfill prescriptions & record patient sales."
                        color="#ef4444"
                    />
                    <ParticipantCard
                        num="04" icon={<div style={{ background: 'rgba(248, 113, 113, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#f87171' }}><Building2 size={24} /></div>}
                        title="Manufacturer"
                        desc="Register products, create batches & ship to distributors."
                        color="#f87171"
                    />
                    <ParticipantCard
                        num="05" icon={<div style={{ background: 'rgba(251, 146, 60, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#fb923c' }}><Truck size={24} /></div>}
                        title="Distributor"
                        desc="Receive batches & transfer to pharmacies across the network."
                        color="#fb923c"
                    />
                    <ParticipantCard
                        num="06" icon={<div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#3b82f6' }}><Stethoscope size={24} /></div>}
                        title="Doctor"
                        desc="Write digital prescriptions for citizens and track fulfillment."
                        color="#3b82f6"
                    />
                    <ParticipantCard
                        num="07" icon={<div style={{ background: 'rgba(167, 139, 250, 0.2)', padding: '0.75rem', borderRadius: '50%', color: '#a78bfa' }}><FlaskConical size={24} /></div>}
                        title="Researcher"
                        desc="Access aggregated anonymized data for drug research."
                        color="#a78bfa"
                    />
                </div>
            </section>

            {/* Supply Chain Flow */}
            <section className="flow-section">
                <h2>How the supply chain flows</h2>
                <div className="flow-container">
                    <FlowNode icon={<Building2 size={18} color="#f87171" />} label="Manufacturer" />
                    <ArrowRight size={16} className="flow-arrow" />
                    <FlowNode icon={<Truck size={18} color="#fb923c" />} label="Distributor" />
                    <ArrowRight size={16} className="flow-arrow" />
                    <FlowNode icon={<Pill size={18} color="#ef4444" />} label="Pharmacy" />
                    <ArrowRight size={16} className="flow-arrow" />
                    <FlowNode icon={<Building2 size={18} color="#a855f7" />} label="Citizen" />
                </div>
                <div className="flow-footer">
                    <span><Stethoscope size={14} color="#3b82f6" /> Doctors prescribe</span>
                    <span className="dot">•</span>
                    <span><ShieldCheck size={14} color="#d1d5db" /> Govt audits</span>
                    <span className="dot">•</span>
                    <span><FlaskConical size={14} color="#a78bfa" /> Researchers analyze</span>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                MedGuard_BD © 2026 — Built for the pharmaceutical supply chain
            </footer>
        </div>
    );
};

export default Landing;

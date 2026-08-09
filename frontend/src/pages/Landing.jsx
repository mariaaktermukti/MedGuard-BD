import React from 'react';
import { Link } from 'react-router-dom';
import { Pill, User, Bank, Storefront, Factory, Truck, Stethoscope, Flask, ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import './landing.css';

const ParticipantCard = ({ num, icon, title, desc }) => (
    <div className="landing-card">
        <div className="card-header">
            <div className="icon-wrapper">
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
                        <Pill size={24} weight="fill" />
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
                        the <span className="text-highlight">pharmaceutical ecosystem</span>
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
                        num="01" icon={<User size={32} weight="duotone" />}
                        title="Citizen / Patient"
                        desc="View prescriptions, purchase history & verify drug authenticity."
                    />
                    <ParticipantCard
                        num="02" icon={<Bank size={32} weight="duotone" />}
                        title="Government Regulator"
                        desc="Audit the supply chain, monitor compliance & generate reports."
                    />
                    <ParticipantCard
                        num="03" icon={<Storefront size={32} weight="duotone" />}
                        title="Pharmacy"
                        desc="Manage inventory, fulfill prescriptions & record patient sales."
                    />
                    <ParticipantCard
                        num="04" icon={<Factory size={32} weight="duotone" />}
                        title="Manufacturer"
                        desc="Register products, create batches & ship to distributors."
                    />
                    <ParticipantCard
                        num="05" icon={<Truck size={32} weight="duotone" />}
                        title="Distributor"
                        desc="Receive batches & transfer to pharmacies across the network."
                    />
                    <ParticipantCard
                        num="06" icon={<Stethoscope size={32} weight="duotone" />}
                        title="Doctor"
                        desc="Write digital prescriptions for citizens and track fulfillment."
                    />
                    <ParticipantCard
                        num="07" icon={<Flask size={32} weight="duotone" />}
                        title="Researcher"
                        desc="Access aggregated anonymized data for drug research."
                    />
                </div>
            </section>

            {/* Supply Chain Flow */}
            <section className="flow-section">
                <h2>How the supply chain flows</h2>
                <div className="flow-container">
                    <FlowNode icon={<Factory size={20} weight="fill" />} label="Manufacturer" />
                    <ArrowRight size={20} weight="bold" className="flow-arrow" />
                    <FlowNode icon={<Truck size={20} weight="fill" />} label="Distributor" />
                    <ArrowRight size={20} weight="bold" className="flow-arrow" />
                    <FlowNode icon={<Storefront size={20} weight="fill" />} label="Pharmacy" />
                    <ArrowRight size={20} weight="bold" className="flow-arrow" />
                    <FlowNode icon={<User size={20} weight="fill" />} label="Citizen" />
                </div>
                <div className="flow-footer">
                    <span><Stethoscope size={18} weight="fill" style={{ color: 'var(--safety-green)' }} /> Doctors prescribe</span>
                    <span className="dot">•</span>
                    <span><ShieldCheck size={18} weight="fill" style={{ color: 'var(--trust-blue)' }} /> Govt audits</span>
                    <span className="dot">•</span>
                    <span><Flask size={18} weight="fill" style={{ color: 'var(--alert-red)' }} /> Researchers analyze</span>
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

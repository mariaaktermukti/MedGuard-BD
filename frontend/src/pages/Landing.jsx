import React from 'react';
import { Link } from 'react-router-dom';
import { Pill, User, Bank, Storefront, Factory, Truck, Stethoscope, Flask, ArrowRight, ShieldCheck, Shield } from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import './landing.css';

const ParticipantCard = ({ num, icon, title, desc }) => (
    <Card className="hover-lift" padding="lg">
        <CardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ 
                    background: 'var(--primary-light)', color: 'var(--primary)', 
                    padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex' 
                }}>
                    {icon}
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--border)' }}>{num}</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{desc}</p>
        </CardContent>
    </Card>
);

const FlowNode = ({ icon, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '50%', boxShadow: 'var(--shadow-md)', color: 'var(--primary)' }}>
            {icon}
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{label}</span>
    </div>
);

const Landing = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Navbar */}
            <nav style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '1rem 5%', background: 'var(--bg-card)', 
                borderBottom: '1px solid var(--border)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield weight="fill" size={32} color="var(--primary)" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1 }}>MedGuard <span style={{ color: 'var(--primary)' }}>BD</span></span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>National Health Infrastructure</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <Button variant="ghost">Sign In</Button>
                    </Link>
                    <Link to="/register" style={{ textDecoration: 'none' }}>
                        <Button variant="primary">Register</Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main style={{ flex: 1, marginTop: '72px' }}>
                <section style={{ 
                    padding: '6rem 5%', textAlign: 'center', backgroundColor: 'var(--bg-page)', 
                    backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(5, 150, 105, 0.05), transparent 25%), radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.05), transparent 25%)' 
                }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
                            <ShieldCheck weight="fill" /> Trusted • Traceable • Transparent
                        </div>
                        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                            The complete platform for the <span style={{ color: 'var(--primary)' }}>pharmaceutical ecosystem</span>
                        </h1>
                        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
                            Track every drug from manufacturer to patient. A unified platform connecting 7 key stakeholders in the pharmaceutical supply chain with role-specific tools and full auditability.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Link to="/register" style={{ textDecoration: 'none' }}>
                                <Button variant="primary" size="lg">Create an account</Button>
                            </Link>
                            <Link to="/login" style={{ textDecoration: 'none' }}>
                                <Button variant="outline" size="lg">Sign in</Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Participants Grid */}
                <section style={{ padding: '6rem 5%', backgroundColor: 'white' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Built for 7 types of participants</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Each entity has a dedicated portal with specialized tools.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                        <ParticipantCard num="01" icon={<User size={32} weight="duotone" />} title="Citizen / Patient" desc="View prescriptions, purchase history & verify drug authenticity." />
                        <ParticipantCard num="02" icon={<Bank size={32} weight="duotone" />} title="DGDA Regulator" desc="Audit the supply chain, monitor compliance & generate reports." />
                        <ParticipantCard num="03" icon={<Storefront size={32} weight="duotone" />} title="Pharmacy" desc="Manage inventory, fulfill prescriptions & record patient sales." />
                        <ParticipantCard num="04" icon={<Factory size={32} weight="duotone" />} title="Manufacturer" desc="Register products, create batches & ship to distributors." />
                        <ParticipantCard num="05" icon={<Truck size={32} weight="duotone" />} title="Distributor" desc="Receive batches & transfer to pharmacies across the network." />
                        <ParticipantCard num="06" icon={<Stethoscope size={32} weight="duotone" />} title="Doctor" desc="Write digital prescriptions for citizens and track fulfillment." />
                        <ParticipantCard num="07" icon={<Flask size={32} weight="duotone" />} title="Researcher" desc="Access aggregated anonymized data for drug research." />
                    </div>
                </section>

                {/* Supply Chain Flow */}
                <section style={{ padding: '6rem 5%', backgroundColor: 'var(--bg-page)', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4rem' }}>How the supply chain flows</h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(1rem, 3vw, 3rem)', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto', marginBottom: '4rem' }}>
                        <FlowNode icon={<Factory size={28} weight="fill" />} label="Manufacturer" />
                        <ArrowRight size={24} color="var(--border)" weight="bold" />
                        <FlowNode icon={<Truck size={28} weight="fill" />} label="Distributor" />
                        <ArrowRight size={24} color="var(--border)" weight="bold" />
                        <FlowNode icon={<Storefront size={28} weight="fill" />} label="Pharmacy" />
                        <ArrowRight size={24} color="var(--border)" weight="bold" />
                        <FlowNode icon={<User size={28} weight="fill" />} label="Citizen" />
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer style={{ padding: '2rem 5%', backgroundColor: 'var(--secondary)', color: 'white', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Shield weight="fill" size={24} color="var(--primary-light)" />
                    <span style={{ fontWeight: 600 }}>MedGuard BD</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>© 2026 — Built for the national pharmaceutical infrastructure.</p>
            </footer>
        </div>
    );
};

export default Landing;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Pill, User, Bank, Storefront, Factory, Truck, Stethoscope, Flask, 
    ArrowRight, ShieldCheck, Shield, CheckCircle, Star, CaretRight, 
    Sparkle, QrCode, Robot, Lock, Heartbeat, CaretDown
} from '@phosphor-icons/react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const HERO_SLIDES = [
    {
        title: "National QR Serial Authentication",
        subtitle: "Instant counterfeit drug verification at every point of sale using GS1-standard matrix codes.",
        badge: "Anti-Counterfeit Protection",
        stat: "99.9% Detection Accuracy",
        imgUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&auto=format&fit=crop&q=80",
        overlay: "linear-gradient(90deg, rgba(6, 78, 59, 0.92) 0%, rgba(5, 150, 105, 0.85) 55%, rgba(15, 23, 42, 0.65) 100%)"
    },
    {
        title: "Smart Citizen Drug Passport & AI Assistant",
        subtitle: "Track digital prescriptions, receive dose alerts, and analyze drug interactions in real time.",
        badge: "Citizen Health Guardian",
        stat: "24/7 Intelligent AI Support",
        imgUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&auto=format&fit=crop&q=80",
        overlay: "linear-gradient(90deg, rgba(15, 118, 110, 0.92) 0%, rgba(13, 148, 136, 0.85) 55%, rgba(15, 23, 42, 0.65) 100%)"
    },
    {
        title: "DGDA Regulatory & Cold-Chain Oversight",
        subtitle: "End-to-end logistics monitoring, IoT temperature compliance, and rapid adverse reaction response.",
        badge: "Government Regulatory Portal",
        stat: "100% Supply Chain Auditability",
        imgUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80",
        overlay: "linear-gradient(90deg, rgba(22, 101, 52, 0.92) 0%, rgba(21, 128, 61, 0.85) 55%, rgba(15, 23, 42, 0.65) 100%)"
    }
];

const REVIEWS = [
    {
        name: "Dr. Mahfuzur Rahman",
        role: "Senior Cardiologist, BSMMU Dhaka",
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        text: "MedGuard BD's digital prescription and AI interaction checker prevent severe counter-reactions before drugs reach patients. It's a game-changer for medical practice in Bangladesh."
    },
    {
        name: "Nusrat Jahan",
        role: "Citizen & Patient",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        text: "I scan every medicine batch QR code before purchasing for my parents. Knowing it's authentic and verified directly by DGDA gives our family total peace of mind!"
    },
    {
        name: "Farhan Tanvir",
        role: "Head of Operations, Lazz Pharma",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        text: "Inventory management and batch verification take seconds now. Stock forecasting eliminated medicine shortages, and we can guarantee 100% genuine supplies."
    },
    {
        name: "Dr. Selim Chowdhury",
        role: "Deputy Director, DGDA Regulator",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        rating: 5,
        text: "Unified supply chain oversight has revolutionized drug safety enforcement across all 64 districts. Counterfeit drug reports are investigated within minutes."
    }
];

const FAQS = [
    {
        q: "How does MedGuard BD verify medicine authenticity?",
        a: "Every licensed manufacturer prints unique GS1-compliant 2D matrix QR codes on individual medicine packs. Scanning the code queries the national DGDA database to instantly confirm serial validity, batch expiration, and manufacturer legitimacy."
    },
    {
        q: "Is MedGuard BD free for citizens and patients?",
        a: "Yes! The Citizen Portal, Drug Passport, Medicine Reminder, and AI Medicine Assistant are 100% free for all citizens of Bangladesh."
    },
    {
        q: "How do pharmacies and manufacturers register on the portal?",
        a: "Pharmacies and manufacturers apply through the registration portal by submitting their official DGDA license number. Upon automated verification, portal access is granted."
    },
    {
        q: "What happens when an Adverse Drug Reaction (ADR) is reported?",
        a: "ADR reports are logged in real-time and flagged for DGDA regulatory teams. High-severity alerts trigger immediate batch holds and safety recalls across connected pharmacies."
    }
];

const Landing = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [openFaq, setOpenFaq] = useState(null);

    // Auto-advance hero carousel slider
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const CurrentSlideIcon = HERO_SLIDES[currentSlide].icon;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Top Navigation Bar - Shadcn Style */}
            <nav style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '0.9rem 6%', background: '#ffffff', 
                borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 8px rgba(5, 150, 105, 0.25)'
                    }}>
                        <Shield size={22} color="#ffffff" weight="fill" />
                    </div>
                    <div>
                        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1 }}>
                            MedGuard <span style={{ color: 'var(--primary)' }}>BD</span>
                        </span>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>Official DGDA National Infrastructure</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" size="sm" style={{ fontWeight: 600 }}>Sign In</Button>
                    </Link>
                    <Link to="/register" style={{ textDecoration: 'none' }}>
                        <Button variant="primary" size="sm" style={{ fontWeight: 700 }}>
                            <span>Get Started</span>
                            <CaretRight size={16} weight="bold" />
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main style={{ flex: 1 }}>
                <section style={{ 
                    padding: '5rem 6% 4rem 6%', 
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                        
                        <div style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
                            background: 'var(--primary-light)', color: 'var(--primary)', 
                            padding: '0.4rem 1rem', borderRadius: '20px', 
                            fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.75rem',
                            border: '1px solid #a7f3d0'
                        }}>
                            <ShieldCheck size={18} weight="fill" /> Official Directorate General of Drug Administration (DGDA) Platform
                        </div>

                        <h1 style={{ 
                            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 900, 
                            color: '#064e3b', lineHeight: 1.15, marginBottom: '1.25rem', 
                            letterSpacing: '-0.02em', maxWidth: '900px', margin: '0 auto 1.25rem auto'
                        }}>
                            Securing Every Medicine From <span style={{ color: 'var(--primary)' }}>Factory to Citizen</span>
                        </h1>

                        <p style={{ 
                            fontSize: '1.125rem', color: 'var(--text-muted)', 
                            marginBottom: '2.5rem', maxWidth: '720px', margin: '0 auto 2.5rem auto', 
                            lineHeight: 1.6, fontWeight: 500
                        }}>
                            Bangladesh's unified pharmaceutical security network combatting counterfeit drugs, enabling batch traceability, AI drug interaction checking, and real-time regulatory oversight.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
                            <Link to="/register" style={{ textDecoration: 'none' }}>
                                <Button variant="primary" size="lg" style={{ padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem' }}>
                                    <span>Register Account</span>
                                    <ArrowRight size={18} weight="bold" />
                                </Button>
                            </Link>
                            <Link to="/login" style={{ textDecoration: 'none' }}>
                                <Button variant="outline" size="lg" style={{ padding: '0.85rem 2rem', fontWeight: 600, fontSize: '1rem' }}>
                                    Sign In to Portal
                                </Button>
                            </Link>
                        </div>

                        {/* Interactive Banner Stats Cards - Shadcn Component */}
                        <div style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '1.25rem', background: '#ffffff', padding: '1.75rem', 
                            borderRadius: '16px', border: '1px solid var(--border)', 
                            boxShadow: 'var(--shadow-md)'
                        }}>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)' }}>100%</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Batch Serial Traceability</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)' }}>5,000+</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Pharmacies</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)' }}>DGDA</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Government Regulatory Portal</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)' }}>24/7</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI Medicine Safety Assistant</div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Interactive Slider Section */}
                <section style={{ padding: '4rem 6%', backgroundColor: '#ffffff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                Platform Capabilities Showcase
                            </div>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                National Pharmaceutical Security Core
                            </h2>
                        </div>

                        {/* Slider Card - Fixed Height */}
                        <div style={{ 
                            backgroundImage: `${HERO_SLIDES[currentSlide].overlay}, url(${HERO_SLIDES[currentSlide].imgUrl})`, 
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '20px', 
                            padding: '3.5rem 3.5rem', 
                            color: '#ffffff',
                            position: 'relative', 
                            overflow: 'hidden', 
                            boxShadow: '0 16px 36px rgba(5, 150, 105, 0.25)',
                            transition: 'all 0.6s ease-in-out',
                            height: '380px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            {/* Slide Content */}
                            <div style={{ maxWidth: '650px', zIndex: 2, position: 'relative' }}>
                                <div style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem', 
                                    background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
                                    padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.825rem', 
                                    fontWeight: 700, marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.25)' 
                                }}>
                                    <Sparkle size={16} color="#34d399" weight="fill" />
                                    {HERO_SLIDES[currentSlide].badge}
                                </div>

                                <h3 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: '#ffffff' }}>
                                    {HERO_SLIDES[currentSlide].title}
                                </h3>

                                <p style={{ fontSize: '1.05rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '2rem', opacity: 0.95, fontWeight: 500 }}>
                                    {HERO_SLIDES[currentSlide].subtitle}
                                </p>

                                <div style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '0.75rem', 
                                    background: '#ffffff', color: '#047857', padding: '0.65rem 1.25rem', 
                                    borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}>
                                    <CheckCircle size={20} color="#059669" weight="fill" />
                                    {HERO_SLIDES[currentSlide].stat}
                                </div>
                            </div>

                            {/* Slide Dots Indicator */}
                            <div style={{ display: 'flex', gap: '0.5rem', position: 'absolute', bottom: '2rem', right: '3rem', zIndex: 3 }}>
                                {HERO_SLIDES.map((_, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        style={{ 
                                            width: currentSlide === idx ? '32px' : '10px', 
                                            height: '10px', 
                                            borderRadius: '5px', 
                                            background: currentSlide === idx ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                            border: 'none', 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 7 Participant Portals Grid */}
                <section style={{ padding: '5rem 6%', backgroundColor: 'var(--bg-page)' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                                Tailored Portals for 7 Key Stakeholders
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0 }}>
                                Dedicated role-based interfaces connecting every participant in Bangladesh's healthcare network.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {[
                                { num: "01", icon: <User size={28} color="var(--primary)" weight="duotone" />, title: "Citizen / Patient", desc: "Scan medicines, track active doses, verify QR codes, and use AI health advisor." },
                                { num: "02", icon: <Stethoscope size={28} color="var(--primary)" weight="duotone" />, title: "Medical Doctor", desc: "Issue digital e-prescriptions, analyze drug interaction risks, and monitor patient adherence." },
                                { num: "03", icon: <Storefront size={28} color="var(--primary)" weight="duotone" />, title: "Licensed Pharmacy", desc: "Manage inventory, verify manufacturer batch serials, and log legal drug sales." },
                                { num: "04", icon: <Factory size={28} color="var(--primary)" weight="duotone" />, title: "Pharma Manufacturer", desc: "Register brand products, generate GS1 QR batches, and initiate safety recalls." },
                                { num: "05", icon: <Truck size={28} color="var(--primary)" weight="duotone" />, title: "Logistics Distributor", desc: "Monitor cold-chain temperature compliance, manage warehouses, and track dispatch." },
                                { num: "06", icon: <Flask size={28} color="var(--primary)" weight="duotone" />, title: "Clinical Researcher", desc: "Analyze anonymized national pharmacovigilance data for medical safety research." },
                                { num: "07", icon: <Bank size={28} color="var(--primary)" weight="duotone" />, title: "DGDA Government Regulator", desc: "Audit national supply chain, enforce drug compliance, and inspect ADR incidents." }
                            ].map((p, idx) => (
                                <Card key={idx} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '14px', transition: 'all 0.2s ease' }} className="hover-lift">
                                    <CardContent style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ background: 'var(--primary-light)', padding: '0.65rem', borderRadius: '10px', display: 'flex' }}>
                                                {p.icon}
                                            </div>
                                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--border)' }}>{p.num}</span>
                                        </div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>{p.title}</h3>
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Professional Reviews & Testimonials */}
                <section style={{ padding: '5rem 6%', backgroundColor: '#ffffff', borderTop: '1px solid var(--border)' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                Verified Community Feedback
                            </div>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                Trusted by Healthcare Leaders & Citizens
                            </h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                            {REVIEWS.map((rev, idx) => (
                                <div key={idx} style={{ 
                                    background: 'var(--bg-page)', 
                                    padding: '1.75rem', 
                                    borderRadius: '16px', 
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <div>
                                        {/* Stars */}
                                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', color: '#f59e0b' }}>
                                            {[...Array(rev.rating)].map((_, i) => (
                                                <Star key={i} size={18} weight="fill" color="#f59e0b" />
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.6, fontWeight: 500, marginBottom: '1.5rem' }}>
                                            "{rev.text}"
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                        <img 
                                            src={rev.avatar} 
                                            alt={rev.name} 
                                            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>{rev.name}</div>
                                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 600 }}>{rev.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Accordion FAQ Section */}
                <section style={{ padding: '5rem 6%', backgroundColor: 'var(--bg-page)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                Frequently Asked Questions
                            </h2>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
                                Clear answers about Bangladesh's pharmaceutical security infrastructure.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {FAQS.map((faq, idx) => {
                                const isOpen = openFaq === idx;
                                return (
                                    <div 
                                        key={idx}
                                        style={{ 
                                            background: '#ffffff', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div 
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            style={{ 
                                                padding: '1.25rem 1.5rem', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                cursor: 'pointer',
                                                fontWeight: 700,
                                                color: isOpen ? 'var(--primary)' : 'var(--text-main)',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            <span>{faq.q}</span>
                                            <CaretDown size={20} weight="bold" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                                        </div>

                                        {isOpen && (
                                            <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, borderTop: '1px solid #f1f5f9' }}>
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Call To Action Banner */}
                <section style={{ 
                    padding: '4rem 6%', 
                    background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)', 
                    color: '#ffffff', 
                    textAlign: 'center' 
                }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff' }}>
                            Ready to Connect to National Health Security?
                        </h2>
                        <p style={{ fontSize: '1.1rem', color: '#a7f3d0', marginBottom: '2rem', lineHeight: 1.5 }}>
                            Join thousands of registered citizens, doctors, pharmacies, and manufacturers today.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Link to="/register" style={{ textDecoration: 'none' }}>
                                <Button variant="secondary" size="lg" style={{ background: '#ffffff', color: '#047857', fontWeight: 800, padding: '0.85rem 2rem' }}>
                                    Register Now
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer - Fresh White & Greenish Healthcare Theme */}
            <footer style={{ 
                padding: '2.5rem 6%', 
                backgroundColor: '#ffffff', 
                color: 'var(--text-main)', 
                borderTop: '1px solid #d1fae5',
                backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 3px 8px rgba(5, 150, 105, 0.2)'
                        }}>
                            <Shield size={20} color="#ffffff" weight="fill" />
                        </div>
                        <div>
                            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.15rem' }}>
                                MedGuard <span style={{ color: 'var(--primary)' }}>BD</span>
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>National Health Security</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        © 2026 MedGuard BD — Official DGDA National Pharmaceutical Infrastructure
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default Landing;

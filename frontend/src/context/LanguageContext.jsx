import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const translations = {
    EN: {
        home: 'Home',
        qr_scan: 'QR Scan',
        my_medicines: 'My Medicines',
        adr_report: 'ADR Report',
        pharmacy: 'Pharmacy',
        ai_assistant: 'AI Assistant',
        notifications: 'Notifications',
        settings: 'Settings',
        logout: 'Logout',
        search_medicine: 'Search medicine...',
        menu: 'Menu',
        command_center: 'Command Center',
        monitoring: 'Monitoring',
        investigations: 'Investigations',
        recalls: 'Recalls',
        inspections: 'Inspections',
        entities: 'Entities',
        heatmaps: 'Heatmaps',
        risk_intel: 'Risk Intelligence',
        mfg_dashboard: 'Manufacturer Dashboard',
        mfg_register_medicine: 'Register New Medicine',
        mfg_create_batch: 'Create New Batch',
        mfg_verify_batch: 'Scan QR / Verify Batch',
        mfg_start_recall: 'Start a Recall',
        mfg_create_shipment: 'Create Shipment',
    },
    BN: {
        home: 'হোম',
        qr_scan: 'কিউআর স্ক্যান',
        my_medicines: 'আমার ওষুধ',
        adr_report: 'পার্শ্বপ্রতিক্রিয়া রিপোর্ট',
        pharmacy: 'ফার্মেসি',
        ai_assistant: 'এআই সহকারী',
        notifications: 'বিজ্ঞপ্তি',
        settings: 'সেটিংস',
        logout: 'লগআউট',
        search_medicine: 'ওষুধ অনুসন্ধান করুন...',
        menu: 'মেনু',
        command_center: 'কমান্ড সেন্টার',
        monitoring: 'নিরীক্ষণ',
        investigations: 'তদন্ত',
        recalls: 'প্রত্যাহার',
        inspections: 'পরিদর্শন',
        entities: 'সত্তা',
        heatmaps: 'হিটম্যাপ',
        risk_intel: 'ঝুঁকি বুদ্ধিমত্তা',
        mfg_dashboard: 'প্রস্তুতকারক ড্যাশবোর্ড',
        mfg_register_medicine: 'নতুন ওষুধ নিবন্ধন',
        mfg_create_batch: 'নতুন ব্যাচ তৈরি',
        mfg_verify_batch: 'কিউআর স্ক্যান / ব্যাচ যাচাই',
        mfg_start_recall: 'প্রত্যাহার শুরু করুন',
        mfg_create_shipment: 'চালান তৈরি',
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('language') || 'EN';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        
        // This is a hacky but effective way to attempt global translation 
        // if we wanted to hook into Google Translate, but we'll use our dictionary for UI elements.
    }, [language]);

    const t = (key) => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

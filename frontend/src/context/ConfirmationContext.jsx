import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        tone: 'success',
        details: null,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
        onCancel: null,
        autoCloseMs: null,
    });

    const showConfirmation = useCallback((options) => {
        setModalState({
            isOpen: true,
            title: options.title || '',
            message: options.message || '',
            tone: options.tone || 'success',
            details: options.details || null,
            confirmText: options.confirmText || 'OK',
            cancelText: options.cancelText || null,
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            autoCloseMs: options.autoCloseMs || null,
        });
    }, []);

    const hideConfirmation = useCallback(() => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <ConfirmationContext.Provider value={{ showConfirmation, hideConfirmation }}>
            {children}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={hideConfirmation}
                title={modalState.title}
                message={modalState.message}
                tone={modalState.tone}
                details={modalState.details}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                onConfirm={modalState.onConfirm}
                onCancel={modalState.onCancel}
                autoCloseMs={modalState.autoCloseMs}
            />
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        // Fallback safety if component is outside provider
        return {
            showConfirmation: (options) => console.log('Confirmation:', options),
            hideConfirmation: () => {},
        };
    }
    return context;
};

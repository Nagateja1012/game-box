import React from 'react';
import Button from './Button';
import './theme.css';

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--surface-dark)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                border: '1px solid var(--surface-light)',
                textAlign: 'center'
            }}>
                {title && <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{title}</h2>}
                {message && <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{message}</p>}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button variant="primary" onClick={onConfirm}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;

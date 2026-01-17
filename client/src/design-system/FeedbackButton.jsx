import React, { useState } from 'react';
import Button from './Button';
import SanitizedInput, { VALIDATION_TYPES } from './SanitizedInput';
import { URL } from '../socket.js';

export default function FeedbackButton({ me }) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        setIsSubmitting(true);
        setStatus(null);

        try {
            const response = await fetch(`${URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    description,
                    name: me?.name || 'Anonymous',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Feedback sent! Thank you.' });
                setTitle('');
                setDescription('');
                setTimeout(() => {
                    setIsOpen(false);
                    setStatus(null);
                }, 3000);
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to send feedback' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Connection error. Try again later.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s',
                    outline: 'none'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Send Feedback / Report Bug"
            >
                {isOpen ? '×' : '⚠︎'}
            </button>

            {/* Form Overlay */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '0',
                    width: '320px',
                    background: 'var(--card-bg)',
                    padding: '20px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: 'slideUp 0.3s ease'
                }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ margin: '0 0 15px 0', color: 'var(--secondary)' }}>Feedback / Bug</h3>

                    {status && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            fontSize: '0.85rem',
                            background: status.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: status.type === 'success' ? '#4ade80' : '#f43f5e',
                            border: `1px solid ${status.type === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                        }}>
                            {status.message}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '5px', opacity: 0.7 }}>Subject</label>
                            <SanitizedInput
                                value={title}
                                onChange={setTitle}
                                placeholder="Short summary..."
                                allowedType={VALIDATION_TYPES.ALPHANUMERIC}
                                maxLength={50}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '5px', opacity: 0.7 }}>Details</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What happened or what's your idea?"
                                rows="4"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title.trim() || !description.trim()}
                            style={{ padding: '10px', width: '100%', marginTop: '5px' }}
                        >
                            {isSubmitting ? 'SENDING...' : 'SUBMIT ISSUE'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

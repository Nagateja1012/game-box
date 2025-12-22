import React, { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
    "Warming up the game servers...",
    "Shuffling the virtual decks...",
    "Preparing the game lobby...",
    "Almost there! Initializing engine...",
    "Connecting to the game master..."
];

export default function LoadingOverlay({ isActive }) {
    const [progress, setProgress] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setProgress(0);
            setMessageIndex(0);
            return;
        }

        // Message rotation
        const messageInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 3000);

        // Simulated non-linear progress
        // Moves fast at first, then slows down near the end
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev < 30) return prev + 2; // Fast start
                if (prev < 60) return prev + 0.8; // Medium
                if (prev < 90) return prev + 0.3; // Slow
                if (prev < 98) return prev + 0.05; // Crawl
                return prev;
            });
        }, 100);

        return () => {
            clearInterval(messageInterval);
            clearInterval(progressInterval);
        };
    }, [isActive]);

    if (!isActive) return null;

    return (
        <div className="modal-overlay loading-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3000,
            color: '#fff'
        }}>
            <div className="loading-container" style={{
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                padding: '40px'
            }}>
                <div className="spinner-container" style={{ marginBottom: '30px' }}>
                    <div className="loading-spinner"></div>
                </div>

                <h3 className="loading-message" style={{
                    minHeight: '2em',
                    fontSize: '1.2rem',
                    fontWeight: '300',
                    letterSpacing: '1px',
                    transition: 'opacity 0.5s ease'
                }}>
                    {LOADING_MESSAGES[messageIndex]}
                </h3>

                <div className="progress-bar-container" style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    marginTop: '20px',
                    overflow: 'hidden'
                }}>
                    <div
                        className="progress-bar-fill"
                        style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
                            boxShadow: '0 0 10px var(--primary-color)',
                            transition: 'width 0.3s ease-out'
                        }}
                    ></div>
                </div>

                <p style={{ marginTop: '15px', fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>
                    First load might take up to 30 seconds due to server cold start
                </p>
            </div>
        </div>
    );
}

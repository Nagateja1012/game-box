import React, { useState, useEffect, useRef } from 'react';

/**
 * TurnTimer - A reusable component that displays a circular progress timer around player bubbles
 * 
 * @param {boolean} isActive - Whether this player's turn is currently active
 * @param {number} turnDuration - Total turn time in milliseconds
 * @param {number} warningThreshold - Time remaining (ms) to show warning color
 * @param {number} criticalThreshold - Time remaining (ms) to show critical color
 * @param {function} onTimeout - Callback when timer expires
 * @param {ReactNode} children - The PlayerBubble or content to wrap
 */
export default function TurnTimer({
    isActive = false,
    turnStartTime = null, // From server
    totalDuration = 20000, // From server
    warningThreshold = 12000,
    criticalThreshold = 5000,
    onTimeout = () => { },
    style = {},
    children
}) {
    const [timeRemaining, setTimeRemaining] = useState(totalDuration);
    const animationFrameRef = useRef(null);
    const endTimeRef = useRef(null);

    useEffect(() => {
        if (isActive && turnStartTime) {
            endTimeRef.current = turnStartTime + totalDuration;

            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, endTimeRef.current - now);
                setTimeRemaining(remaining);

                if (remaining > 0) {
                    animationFrameRef.current = requestAnimationFrame(updateTimer);
                } else {
                    onTimeout();
                }
            };

            // Start the animation frame loop
            animationFrameRef.current = requestAnimationFrame(updateTimer);
        } else {
            // Turn ended or not active
            setTimeRemaining(totalDuration);
            endTimeRef.current = null;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isActive, turnStartTime, totalDuration, onTimeout]);

    // Determine color based on thresholds
    let ringColor = '#4ade80'; // green
    if (timeRemaining <= criticalThreshold) {
        ringColor = '#ef4444'; // red
    } else if (timeRemaining <= warningThreshold) {
        ringColor = '#fbbf24'; // yellow/orange
    }

    return (
        <div style={{
            position: 'relative',
            display: 'inline-block',
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            ...style
        }}>
            {/* Background highlight/glow */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '-6px',
                    right: '-6px',
                    bottom: '-6px',
                    borderRadius: '16px',
                    border: `3px solid ${ringColor}`,
                    boxShadow: `0 0 15px ${ringColor}, inset 0 0 10px ${ringColor}`,
                    zIndex: 0,
                    animation: 'pulse-glow 1.5s infinite alternate',
                    pointerEvents: 'none'
                }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>

            <style>
                {`
                @keyframes pulse-glow {
                    from { opacity: 0.6; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1.02); }
                }
                `}
            </style>
        </div>
    );
}

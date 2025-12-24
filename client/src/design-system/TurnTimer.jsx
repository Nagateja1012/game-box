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
    turnDuration = 30000, // 30 seconds default
    warningThreshold = 10000, // 10 seconds
    criticalThreshold = 5000, // 5 seconds
    onTimeout = () => { },
    children
}) {
    const [timeRemaining, setTimeRemaining] = useState(turnDuration);
    const [isRunning, setIsRunning] = useState(false);
    const startTimeRef = useRef(null);
    const animationFrameRef = useRef(null);
    const timeoutRef = useRef(null);

    // Start/stop timer based on isActive
    useEffect(() => {
        if (isActive) {
            // Start timer
            startTimeRef.current = Date.now();
            setTimeRemaining(turnDuration);
            setIsRunning(true);

            // Set timeout for when time runs out
            timeoutRef.current = setTimeout(() => {
                setIsRunning(false);
                setTimeRemaining(0);
                onTimeout();
            }, turnDuration);

            // Start animation loop for smooth updates
            const updateTimer = () => {
                if (startTimeRef.current) {
                    const elapsed = Date.now() - startTimeRef.current;
                    const remaining = Math.max(0, turnDuration - elapsed);
                    setTimeRemaining(remaining);

                    if (remaining > 0) {
                        animationFrameRef.current = requestAnimationFrame(updateTimer);
                    }
                }
            };
            animationFrameRef.current = requestAnimationFrame(updateTimer);
        } else {
            // Stop timer
            setIsRunning(false);
            setTimeRemaining(turnDuration);
            startTimeRef.current = null;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isActive, turnDuration, onTimeout]);

    // Calculate progress (0 to 1)
    const progress = timeRemaining / turnDuration;

    // Determine color based on thresholds
    let ringColor = '#4ade80'; // green (default)
    if (timeRemaining <= criticalThreshold) {
        ringColor = '#ef4444'; // red (critical)
    } else if (timeRemaining <= warningThreshold) {
        ringColor = '#fbbf24'; // yellow/orange (warning)
    }

    // SVG circle parameters
    const size = 100; // Size of the SVG viewBox
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {children}

            {isActive && isRunning && (
                <svg
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'calc(100% + 16px)',
                        height: 'calc(100% + 16px)',
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        style={{
                            transition: 'stroke 0.3s ease, stroke-dashoffset 0.1s linear',
                            filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.5))'
                        }}
                    />
                </svg>
            )}
        </div>
    );
}

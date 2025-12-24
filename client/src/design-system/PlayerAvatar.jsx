import React from 'react';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Violet (Theme)
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', // Blue to Teal
    'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)', // Rose to Orange
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', // Violet to Pink
    'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', // Sky to Indigo
    'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', // Emerald to Blue
    'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', // Orange to Crimson
    'linear-gradient(135deg, #6366f1 0%, #4338ca 50%, #312e81 100%)', // Tri-Indigo
    'linear-gradient(135deg, #d946ef 0%, #8b5cf6 100%)', // Fuchsia to Violet
    'linear-gradient(135deg, #22c55e 0%, #10b981 100%)', // Green to Emerald
    'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', // Amber to Orange
    'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)', // Teal to Cyan
    'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)', // Indigo to Sky
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink to Rose
    'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)'  // Deep Purple to Blue
];

const getAvatarGradient = (name) => {
    if (!name) return AVATAR_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const SIZES = {
    sm: { size: '24px', fontSize: '0.7rem' },
    md: { size: '36px', fontSize: '0.8rem' },
    lg: { size: '60px', fontSize: '1.25rem' }
};

export default function PlayerAvatar({
    name,
    size = 'md',
    image = null,
    className = ''
}) {
    const dimensions = SIZES[size] || SIZES.md;
    const backgroundGradient = getAvatarGradient(name);

    return (
        <div
            className={`player-avatar-container ${className}`}
            style={{
                width: dimensions.size,
                height: dimensions.size,
                position: 'relative'
            }}
        >
            <div
                className="player-avatar-main"
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: backgroundGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: dimensions.fontSize,
                    fontWeight: 'bold',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    overflow: 'hidden'
                }}
            >
                {image ? (
                    <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    name ? name.charAt(0).toUpperCase() : '?'
                )}
            </div>
        </div>
    );
}

import { useState } from 'react';

export default function Home({ onJoin, onCreate, onSetName, playerName }) {
    const [joinCode, setJoinCode] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Check for room code in URL
    useState(() => {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            setJoinCode(roomParam);
            setIsLocked(true);
        }
    }, []);

    const handleJoin = () => {
        if (!joinCode.trim()) {
            setErrorMsg('Please enter a Room Code or Create a Room');
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }
        onJoin(joinCode);
    };

    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleCreateClick = () => {
        if (isLocked && joinCode) {
            setShowConfirmation(true);
        } else {
            onCreate();
        }
    };

    return (
        <div className="screen-container home-screen">
            <h1 className="logo">GAMEBOX</h1>

            <p className="subtitle">Multiplayer Team Bonding</p>
            <div className="card login-card">
                <div className="input-group">
                    <label>YOUR NICKNAME</label>
                    <input
                        type="text"
                        placeholder="Enter your name..."
                        value={playerName}
                        onChange={(e) => onSetName(e.target.value)}
                    />
                </div>

                <div className="actions">
                    <div className="input-group">
                        <label>ROOM CODE</label>
                        <input
                            type="text"
                            placeholder="ABCD"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            readOnly={isLocked}
                            style={{
                                textAlign: 'center',
                                letterSpacing: '2px',
                                fontSize: '1.2rem',
                                opacity: isLocked ? 0.7 : 1,
                                cursor: isLocked ? 'not-allowed' : 'text'
                            }}
                        />
                    </div>

                    {errorMsg && (
                        <div style={{ color: '#ff5555', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {errorMsg}
                        </div>
                    )}

                    <button className="btn btn-secondary" onClick={handleJoin}>
                        JOIN ROOM
                    </button>


                    <div className="divider">OR</div>

                    <div className="join-section">
                        <button className="btn btn-primary" onClick={handleCreateClick}>
                            CREATE ROOM
                        </button>
                    </div>
                </div>
            </div>

            {showConfirmation && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: '#2a2a2a',
                        padding: '30px',
                        borderRadius: '15px',
                        maxWidth: '400px',
                        textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Create New Room?</h3>
                        <p>Looks like you already have a room code ({joinCode}). Do you want to create a new room anyway?</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)}>
                                No
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                setShowConfirmation(false);
                                onCreate();
                            }}>
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

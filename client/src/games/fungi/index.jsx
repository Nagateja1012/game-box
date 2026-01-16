import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameWrapper from '../../screens/GameWrapper';
import { socket } from '../../socket';
import { soundManager } from '../../utils/soundManager';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import './Fungi.css';

const TILE_SIZE = 24;

export default function Fungi({ room, me }) {
    const canvasRef = useRef(null);
    const renderRef = useRef({ lastState: null, players: {}, lastUpdate: Date.now() });
    const { gameState } = room;
    const { players = [], map = [], powerUps = [], gameStatus, winner } = gameState || {};

    const sendGameAction = useCallback((action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    }, [room.id]);

    // Input Handling with Local Prediction
    useEffect(() => {
        const handleKeyDown = (e) => {
            let direction = null;
            if (e.key === 'ArrowUp' || e.key === 'w') direction = 'UP';
            if (e.key === 'ArrowDown' || e.key === 's') direction = 'DOWN';
            if (e.key === 'ArrowLeft' || e.key === 'a') direction = 'LEFT';
            if (e.key === 'ArrowRight' || e.key === 'd') direction = 'RIGHT';

            if (direction) {
                // Local prediction: store nextDir locally for immediate visual intent
                const myPlayer = renderRef.current.players[me.id];
                if (myPlayer) myPlayer.nextDir = direction;

                sendGameAction({ type: 'CHANGE_DIRECTION', direction });
                soundManager.playClick();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sendGameAction, me.id]);

    // Smooth Interpolation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !map.length) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const loop = () => {
            const now = Date.now();
            const tickDuration = 100; // Match server tick

            // Clear
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Map (Static)
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    if (map[y][x] === 1) {
                        ctx.fillStyle = '#0a192f';
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    }
                }
            }

            // Draw PowerUps
            powerUps.forEach(pu => {
                ctx.font = `${TILE_SIZE * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const emoji = pu.type === 'TROJAN' ? '🔱' : pu.type === 'CLONE' ? '🧬' : pu.type === 'INVERT' ? '🌀' : pu.type === 'GHOST' ? '🌌' : '⏱️';
                ctx.fillText(emoji, pu.x * TILE_SIZE + TILE_SIZE / 2, pu.y * TILE_SIZE + TILE_SIZE / 2);
            });

            // Draw Players with Interpolation
            players.forEach(p => {
                let renderData = renderRef.current.players[p.id];
                if (!renderData || renderData.userId !== p.userId) {
                    renderData = { x: p.x, y: p.y, targetX: p.x, targetY: p.y, prevX: p.x, prevY: p.y, lastUpdate: now, nextDir: null };
                    renderRef.current.players[p.id] = renderData;
                }

                // Update target position if server state changed
                if (renderData.targetX !== p.x || renderData.targetY !== p.y) {
                    renderData.prevX = renderData.x; // Start interpolation from current render position
                    renderData.prevY = renderData.y;
                    renderData.targetX = p.x;
                    renderData.targetY = p.y;
                    renderData.lastUpdate = now;
                    renderData.nextDir = null; // Clear local prediction once server confirms move
                }

                // Interpolate
                const elapsed = now - renderData.lastUpdate;
                const t = Math.min(1, elapsed / tickDuration);
                renderData.x = renderData.prevX + (renderData.targetX - renderData.prevX) * t;
                renderData.y = renderData.prevY + (renderData.targetY - renderData.prevY) * t;

                // Handle teleportation jumps (e.g., due to power-ups or initial spawn)
                if (Math.abs(renderData.targetX - renderData.prevX) > 1 || Math.abs(renderData.targetY - renderData.prevY) > 1) {
                    renderData.x = p.x;
                    renderData.y = p.y;
                }

                // Local prediction for player's next move
                if (p.id === me.id && renderData.nextDir && t >= 0.9) { // If close to target and a local prediction exists
                    let predictedX = renderData.targetX;
                    let predictedY = renderData.targetY;
                    switch (renderData.nextDir) {
                        case 'UP': predictedY--; break;
                        case 'DOWN': predictedY++; break;
                        case 'LEFT': predictedX--; break;
                        case 'RIGHT': predictedX++; break;
                    }
                    // Only predict if the predicted move is valid (e.g., not into a wall)
                    if (predictedY >= 0 && predictedY < map.length && predictedX >= 0 && predictedX < map[0].length && map[predictedY][predictedX] !== 1) {
                        renderData.x = predictedX;
                        renderData.y = predictedY;
                        renderData.prevX = predictedX;
                        renderData.prevY = predictedY;
                        renderData.targetX = predictedX; // Set target to predicted for next frame
                        renderData.targetY = predictedY;
                        renderData.lastUpdate = now;
                        renderData.nextDir = null; // Clear prediction after applying
                    }
                }


                // Render Player
                const color = p.team === 'FUNGI' ? '#00ffcc' : '#ff00ff';
                ctx.save();
                ctx.translate(renderData.x * TILE_SIZE + TILE_SIZE / 2, renderData.y * TILE_SIZE + TILE_SIZE / 2);

                // Glow Pulse
                const pulse = 1 + Math.sin(now / 200) * 0.1;
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, (TILE_SIZE / 3) * pulse, 0, Math.PI * 2);
                ctx.fill();

                // Draw Effect Icons above player
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                let offset = -20;
                if (p.invertExpires > now) { ctx.fillText('😵', 0, offset); offset -= 15; }
                if (p.ghostExpires > now) { ctx.fillText('👻', 0, offset); offset -= 15; }
                if (p.slowExpires > now) { ctx.fillText('🐌', 0, offset); offset -= 15; }

                ctx.restore();

                // Render Clones for this player
                if (p.clones > 0 && p.powerExpires > now) {
                    for (let i = 0; i < p.clones; i++) {
                        const cx = renderData.x + Math.sin(now / 500 + i) * 0.5;
                        const cy = renderData.y + Math.cos(now / 500 + i) * 0.5;
                        ctx.save();
                        ctx.globalAlpha = 0.4;
                        ctx.translate(cx * TILE_SIZE + TILE_SIZE / 2, cy * TILE_SIZE + TILE_SIZE / 2);
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, TILE_SIZE / 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        const width = map[0].length;
        const height = map.length;
        canvas.width = width * TILE_SIZE;
        canvas.height = height * TILE_SIZE;

        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [map, players, powerUps, me.id]);

    return (
        <GameWrapper
            room={room}
            me={me}
            title="FUNGI"
            playScreen={
                <div className="fungi-container">
                    <div className="fungi-board-wrapper">
                        <canvas ref={canvasRef} className="fungi-canvas" />
                    </div>
                </div>
            }
            overlay={
                gameStatus === 'ENDED' && (
                    <GameOverOverlay
                        room={room}
                        me={me}
                        winner={winner === 'FUNGI' ? 'FUNGI' : 'ANTIBIOTICS'}
                    />
                )
            }
        />
    );
}

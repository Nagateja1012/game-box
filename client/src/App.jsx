import { useState, useEffect } from 'react';
import { socket } from './socket';
import { GAME_METADATA } from './games/registry';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import GameContainer from './screens/GameContainer';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentScreen, setCurrentScreen] = useState(() => {
    const savedRoomId = localStorage.getItem('room_id');
    return savedRoomId ? 'RESTORING' : 'HOME';
  });
  const [playerData, setPlayerData] = useState(() => {
    const savedName = localStorage.getItem('player_name') || '';
    const savedUserId = localStorage.getItem('user_id') || `user_${Math.random().toString(36).substr(2, 9)}`;
    if (!localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', savedUserId);
    }
    return { name: savedName, id: '', userId: savedUserId };
  });
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setPlayerData(prev => ({ ...prev, id: socket.id }));
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated(roomId) {
      // Room ID received, we might still be loading state so keeping isCreatingRoom true
      // until onRoomUpdated is called
    }

    function onRoomUpdated(room) {
      // Add null check to prevent errors
      if (!room) {
        console.warn('Received null/undefined room in room_updated event');
        return;
      }

      setRoomData(room);
      setIsCreatingRoom(false); // Done loading
      // Save room ID for reconnection
      localStorage.setItem('room_id', room.id);

      if (room.status === 'PLAYING') {
        // Check if I am playing or waiting
        const me = room.players.find(p => p.id === socket.id);
        if (me && me.status === 'WAITING') {
          setCurrentScreen('LOBBY');
        } else {
          setCurrentScreen('GAME');
        }
      } else {
        setCurrentScreen('LOBBY');
      }
      setError('');
    }

    function onLeftRoom() {
      setRoomData(null);
      setCurrentScreen('HOME');
      localStorage.removeItem('room_id');

      // Clear room code from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + url.search);

      setError('');
    }

    function onError(msg) {
      console.error("Socket Error:", msg);
      setError(typeof msg === 'string' ? msg : 'An error occurred');
      setIsCreatingRoom(false); // Reset on error
      setTimeout(() => setError(''), 5000);
    }

    function onConnectError(err) {
      console.error("Connection Error:", err);
      setError("Connection to server failed. Retrying...");
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_created', onRoomCreated);
    socket.on('room_updated', onRoomUpdated);
    socket.on('left_room', onLeftRoom);
    socket.on('error', onError);
    socket.on('connect_error', onConnectError);

    // Connect immediately
    socket.connect();

    // Attempt reconnection if room_id exists
    const savedRoomId = localStorage.getItem('room_id');
    if (savedRoomId && playerData.name) {
      console.log("Attempting to reconnect to room:", savedRoomId);
      socket.emit('join_room', { roomId: savedRoomId, playerName: playerData.name, userId: playerData.userId });

      // Safety fallback: if no room_updated after 5 seconds, go home
      const timer = setTimeout(() => {
        setCurrentScreen(prev => prev === 'RESTORING' ? 'HOME' : prev);
      }, 5000);
      return () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('room_created', onRoomCreated);
        socket.off('room_updated', onRoomUpdated);
        socket.off('left_room', onLeftRoom);
        socket.on('error', onError);
        socket.off('connect_error', onConnectError);
        socket.disconnect();
      };
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_created', onRoomCreated);
      socket.off('room_updated', onRoomUpdated);
      socket.off('left_room', onLeftRoom);
      socket.off('error', onError);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentScreen === 'HOME') {
      document.title = 'Gamebox';
    } else if (currentScreen === 'LOBBY' && roomData) {
      document.title = `Lobby - ${roomData.id}`;
    } else if (currentScreen === 'GAME' && roomData && roomData.game) {
      const gameName = GAME_METADATA[roomData.game.id]?.name || 'Game';
      document.title = `${gameName} - ${roomData.id}`;
    }
  }, [currentScreen, roomData]);

  const handleLogin = (name) => {
    setPlayerData(prev => ({ ...prev, name }));
    localStorage.setItem('player_name', name);
  };

  const createRoom = () => {
    if (!playerData.name) return setError('Please enter a nickname');
    setIsCreatingRoom(true); // Start loading
    socket.emit('create_room', { playerName: playerData.name, userId: playerData.userId });
  };

  const joinRoom = (roomId) => {
    if (!playerData.name) return setError('Please enter a nickname');
    socket.emit('join_room', { roomId, playerName: playerData.name, userId: playerData.userId });
  };

  return (
    <ErrorBoundary>
      <div className={`app-container ${currentScreen !== 'GAME' ? 'standard-layout' : ''}`}>
        {error && <div className="error-banner">{error}</div>}

        {currentScreen === 'RESTORING' && (
          <div className="screen-container restoring-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="loader" style={{ marginBottom: '20px' }}></div>
            <h2>Restoring Session...</h2>
            <p style={{ opacity: 0.7 }}>Reconnecting you to your game room.</p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '30px', fontSize: '0.8rem' }}
              onClick={() => setCurrentScreen('HOME')}
            >
              Back to Home
            </button>
          </div>
        )}

        {currentScreen === 'HOME' && (
          <Home
            onJoin={joinRoom}
            onCreate={createRoom}
            onSetName={handleLogin}
            playerName={playerData.name}
            isCreatingRoom={isCreatingRoom}
          />
        )}

        {currentScreen === 'LOBBY' && roomData && (
          <Lobby
            room={roomData}
            me={playerData}
          />
        )}

        {currentScreen === 'GAME' && roomData && (
          <GameContainer
            room={roomData}
            me={playerData}
          />
        )}
        {currentScreen === 'HOME' && (<p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '-20px', marginBottom: '20px' }}>
          Developed by Teja Dasari using google Antigravity & Gemini
        </p>)}
      </div>
    </ErrorBoundary>
  );
}

export default App;

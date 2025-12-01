import { useState, useEffect } from 'react';
import { socket } from './socket';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import GameContainer from './screens/GameContainer';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentScreen, setCurrentScreen] = useState('HOME'); // HOME, LOBBY, GAME
  const [playerData, setPlayerData] = useState({ name: '', id: '' });
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setPlayerData(prev => ({ ...prev, id: socket.id }));
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated(roomId) {
      // Wait for room_updated to actually enter
    }

    function onRoomUpdated(room) {
      setRoomData(room);
      if (room.status === 'PLAYING') {
        setCurrentScreen('GAME');
      } else {
        setCurrentScreen('LOBBY');
      }
      setError('');
    }

    function onError(msg) {
      setError(msg);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_created', onRoomCreated);
    socket.on('room_updated', onRoomUpdated);
    socket.on('error', onError);

    // Connect immediately
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_created', onRoomCreated);
      socket.off('room_updated', onRoomUpdated);
      socket.off('error', onError);
      socket.disconnect();
    };
  }, []);

  const handleLogin = (name) => {
    setPlayerData(prev => ({ ...prev, name }));
  };

  const createRoom = () => {
    if (!playerData.name) return setError('Please enter a nickname');
    socket.emit('create_room', { playerName: playerData.name });
  };

  const joinRoom = (roomId) => {
    if (!playerData.name) return setError('Please enter a nickname');
    socket.emit('join_room', { roomId, playerName: playerData.name });
  };

  return (
    <div className="app-container">
      {error && <div className="error-banner">{error}</div>}

      {currentScreen === 'HOME' && (
        <Home
          onJoin={joinRoom}
          onCreate={createRoom}
          onSetName={handleLogin}
          playerName={playerData.name}
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
    </div>
  );
}

export default App;

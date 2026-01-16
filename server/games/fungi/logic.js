const logger = require('../../utils/logger');

class FungiGame {
    constructor() {
        this.id = 'FUNGI';
        this.players = [];
        this.gameStatus = 'WAITING';
        this.onStateChange = null;
        this.map = null;
        this.width = 28;
        this.height = 30;
        this.ticks = 0;
        this.powerUps = [];
        this.timer = null;

        // Map Tiles: 1: Wall, 0: Path, 2-4: Gates, 5-9: Power Slots, 15: AA, 16: BB
        this.initMap();
    }

    initMap() {
        const layout = [
            "1111111111111111111111111111", // 0
            "1000000000000AA0000000000002", // 1
            "1011111111110110110111101101", // 2
            "1017000000110110110000101101", // 3
            "1011110111110110111110001101", // 4
            "1000000000000060000000000071", // 5
            "1011110110111111110110111101", // 6
            "1011110110111111110110111101", // 7
            "2000000110000110000110000061", // 8
            "1111110111110110111110111111", // 9
            "1810000111110110111110110001", // 10
            "1010110110000000000110110101", // 11
            "1000110110111111110110000181", // 12
            "1111110110100000010110111111", // 13
            "4000000000100050010000000004", // 14
            "1111110110100000010110111111", // 15
            "1000010110111001110110000191", // 16
            "1910000110000000000110100001", // 17
            "1111110111011111101110111111", // 18
            "3000000000000110000700000061", // 19
            "1011110111110110111110111101", // 20
            "1011110111110110111110111101", // 21
            "1000110000000060000000110001", // 22
            "1110110110111111110110110111", // 23
            "1110110110111111110110110111", // 24
            "1700000110000110000110000001", // 25
            "1011111111110110111111111101", // 26
            "1011111111110110111111111101", // 27
            "1000000000000BB0000000000003", // 28
            "1111111111111111111111111111"  // 29
        ];

        this.map = layout.map((row, y) => {
            const tiles = [];
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (char === 'A') {
                    if (row[x + 1] === 'A') { tiles.push(15); tiles.push(15); x++; }
                } else if (char === 'B') {
                    if (row[x + 1] === 'B') { tiles.push(16); tiles.push(16); x++; }
                } else {
                    tiles.push(isNaN(char) ? 0 : parseInt(char));
                }
            }
            return tiles;
        });

        this.powerUpSpots = [];
        this.map.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile >= 5 && tile <= 9) {
                    this.powerUpSpots.push({ x, y, originalTile: tile });
                }
            });
        });
    }

    init(players) {
        const teams = ['FUNGI', 'ANTIBIOTICS'];
        this.players = players.map((p, index) => {
            const team = teams[index % 2];
            let x, y;
            if (team === 'FUNGI') {
                x = 13 + (index % 2); // AA at 13, 14
                y = 1;
            } else {
                x = 13 + (index % 2); // BB at 13, 14
                y = 28;
            }
            return {
                id: p.id,
                userId: p.userId,
                name: p.name,
                team,
                originalTeam: team,
                x, y,
                currentDir: team === 'FUNGI' ? 'DOWN' : 'UP',
                nextDir: null,
                power: null,
                powerExpires: 0,
                invertExpires: 0,
                ghostExpires: 0,
                slowExpires: 0,
                clones: 0,
                lastMove: 0,
                score: 0,
                connected: true
            };
        });
        this.gameStatus = 'PLAYING';
        this.spawnPowerUps();

        // Start Game Loop
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), 100);
    }

    tick() {
        if (this.gameStatus !== 'PLAYING') return;

        let changed = false;
        this.players.forEach(p => {
            const now = Date.now();
            const delay = p.slowExpires > now ? 250 : 100;
            if (now - p.lastMove < delay) return;

            // Try to change to nextDir if possible
            if (p.nextDir && this.canMove(p, p.nextDir)) {
                p.currentDir = p.nextDir;
                p.nextDir = null;
            }

            // Move in currentDir
            if (this.handleMove(p, p.currentDir)) {
                p.lastMove = now;
                changed = true;
            } else {
                // If hit wall, stop or try to turn? 
                // Pacman stops if it hits a wall and has no nextDir.
                p.currentDir = null;
            }
        });

        if (changed && this.onStateChange) this.onStateChange();
    }

    canMove(p, direction) {
        let nextX = p.x;
        let nextY = p.y;
        if (direction === 'UP') nextY--;
        if (direction === 'DOWN') nextY++;
        if (direction === 'LEFT') nextX--;
        if (direction === 'RIGHT') nextX++;

        // Gates allow OOB movement
        if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
            return this.map[p.y][p.x] >= 2 && this.map[p.y][p.x] <= 4;
        }

        return this.map[nextY][nextX] !== 1;
    }

    spawnPowerUps() {
        const otherPowerTypes = ['CLONE', 'INVERT', 'GHOST', 'SLOW'];
        const pool = [];
        otherPowerTypes.forEach(type => {
            pool.push(type, type); // 2 of each
        });

        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        this.powerUps = [];
        const randomSpots = this.powerUpSpots.filter(s => s.originalTile !== 5);

        randomSpots.forEach((spot, index) => {
            if (pool.length > 0) {
                const type = pool.pop();
                this.powerUps.push({ x: spot.x, y: spot.y, type });
            }
        });

        const trojanSpot = this.powerUpSpots.find(s => s.originalTile === 5);
        if (trojanSpot) {
            this.powerUps.push({ x: trojanSpot.x, y: trojanSpot.y, type: 'TROJAN' });
        }
    }

    handleAction(action, player) {
        if (this.gameStatus !== 'PLAYING') return false;

        const p = this.players.find(pl => pl.id === player.id);
        if (!p) return false;

        if (action.type === 'CHANGE_DIRECTION') {
            p.nextDir = action.direction;
            // If currently stopped, immediately try to move
            if (!p.currentDir && this.canMove(p, p.nextDir)) {
                p.currentDir = p.nextDir;
                p.nextDir = null;
            }
            return true;
        }

        return false;
    }

    handleMove(p, direction) {
        if (!direction) return false;

        let nextX = p.x;
        let nextY = p.y;

        const invert = p.invertExpires > Date.now();
        const dir = invert ? this.getOppositeDirection(direction) : direction;

        if (dir === 'UP') nextY--;
        if (dir === 'DOWN') nextY++;
        if (dir === 'LEFT') nextX--;
        if (dir === 'RIGHT') nextX++;

        // Gate Teleportation Logic (Two-Way)
        if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
            const currentTile = this.map[p.y][p.x];
            if (currentTile >= 2 && currentTile <= 4) {
                // Find matching gate
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        if (this.map[y][x] === currentTile && (x !== p.x || y !== p.y)) {
                            p.x = x;
                            p.y = y;
                            this.checkPowerUpCollection(p);
                            this.checkConversion();
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        const tile = this.map[nextY][nextX];
        if (tile === 1) return false; // Wall

        p.x = nextX;
        p.y = nextY;

        this.checkPowerUpCollection(p);
        this.checkConversion();
        return true;
    }

    getOppositeDirection(dir) {
        const ops = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
        return ops[dir] || dir;
    }

    checkPowerUpCollection(p) {
        const puIndex = this.powerUps.findIndex(pu => pu.x === p.x && pu.y === p.y);
        if (puIndex !== -1) {
            const pu = this.powerUps.splice(puIndex, 1)[0];
            this.applyPower(p, pu.type);
            // Respawn after 15s
            setTimeout(() => {
                if (this.gameStatus === 'PLAYING') {
                    this.powerUps.push(pu);
                    if (this.onStateChange) this.onStateChange();
                }
            }, 15000);
        }
    }

    applyPower(p, type) {
        const duration = 10000; // 10s
        if (type === 'INVERT') {
            // Picked by player, affects NEARBY enemies
            this.players.forEach(other => {
                if (other.team !== p.team && this.getDist(p, other) < 8) {
                    other.invertExpires = Date.now() + duration;
                    other.slowExpires = Date.now() + duration; // Invert also slows
                }
            });
        } else if (type === 'CLONE') {
            p.clones = 3;
            p.powerExpires = Date.now() + duration;
        } else if (type === 'GHOST') {
            p.ghostExpires = Date.now() + duration;
        } else if (type === 'TROJAN') {
            p.team = p.originalTeam;
            p.loopProgress = 0;
        }
    }

    checkTrojanLoop(p, tile) {
        if (tile === 2) {
            p.loopProgress += 0.1; // Increment as they stay in loop path
        }
        if (tile === 7 && p.loopProgress >= 2.0) {
            this.applyPower(p, 'TROJAN');
        }
    }

    checkConversion() {
        // Effective players = player + clones
        const effectivePlayers = [];
        this.players.forEach(p => {
            effectivePlayers.push(p);
            if (p.clones > 0 && p.powerExpires > Date.now()) {
                for (let i = 0; i < p.clones; i++) {
                    effectivePlayers.push({ ...p, isClone: true, id: `${p.id}-clone-${i}` });
                }
            }
        });

        this.players.forEach(p => {
            if (p.ghostExpires > Date.now()) return;

            const nearbyEnemies = effectivePlayers.filter(other =>
                other.team !== p.team &&
                (other.ghostExpires ? other.ghostExpires < Date.now() : true) &&
                this.getDist(p, other) <= 2
            );

            // "higher the number of player compare to enemy team will convert them"
            // "two player radius had one enemy player that player is converted to this team"
            if (nearbyEnemies.length >= 2) {
                // Convert p to the team of the majority of nearbyEnemies
                const fungiCount = nearbyEnemies.filter(e => e.team === 'FUNGI').length;
                const antibioCount = nearbyEnemies.filter(e => e.team === 'ANTIBIOTICS').length;
                p.team = fungiCount > antibioCount ? 'FUNGI' : 'ANTIBIOTICS';

                // Check win condition
                this.checkWinCondition();
            }
        });
    }

    checkWinCondition() {
        const firstTeam = this.players[0].team;
        const allSame = this.players.every(p => p.team === firstTeam);
        if (allSame && this.players.length > 1) {
            this.gameStatus = 'ENDED';
            this.winner = firstTeam;
        }
    }

    getDist(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    getState() {
        return {
            gameStatus: this.gameStatus,
            players: this.players,
            map: this.map,
            powerUps: this.powerUps,
            winner: this.winner
        };
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
        }
        if (this.players.length < 2) {
            this.gameStatus = 'ENDED';
            return true;
        }
        return false;
    }

    updatePlayerStatus(userId, status) {
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            if (status.id) player.id = status.id;
            player.connected = status.connected;
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

module.exports = FungiGame;

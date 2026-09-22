const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// ========================================
// SOCKET.IO
// ========================================

const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});

// ========================================
// STATIC WEBSITE
// ========================================

app.use(express.static(path.join(__dirname, "..")));

app.get("/api/status", (req, res) => {
    res.json({
        name: "D.M.I.T Slap War Server",
        status: "online",
        rooms: rooms.size,
        time: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ========================================
// GAME CONSTANTS
// ========================================

const MAX_PLAYERS = 4;
const HAND_SIZE = 13;
const TURN_TIME = 30;
const SLAP_TIME = 2000;

// ========================================
// DATA
// ========================================

const rooms = new Map();

// ========================================
// CARD DATA
// ========================================

const SUITS = [
    {
        id: "C",
        name: "Clubs",
        symbol: "♣"
    },
    {
        id: "D",
        name: "Diamonds",
        symbol: "♦"
    },
    {
        id: "H",
        name: "Hearts",
        symbol: "♥"
    },
    {
        id: "S",
        name: "Spades",
        symbol: "♠"
    }
];

const RANKS = [
    {
        value: 3,
        label: "3"
    },
    {
        value: 4,
        label: "4"
    },
    {
        value: 5,
        label: "5"
    },
    {
        value: 6,
        label: "6"
    },
    {
        value: 7,
        label: "7"
    },
    {
        value: 8,
        label: "8"
    },
    {
        value: 9,
        label: "9"
    },
    {
        value: 10,
        label: "10"
    },
    {
        value: 11,
        label: "J"
    },
    {
        value: 12,
        label: "Q"
    },
    {
        value: 13,
        label: "K"
    },
    {
        value: 14,
        label: "A"
    },
    {
        value: 15,
        label: "2"
    }
];

// ========================================
// CREATE DECK
// ========================================

function createDeck() {

    const deck = [];

    for (const rank of RANKS) {

        for (const suit of SUITS) {

            deck.push({
                id: `${rank.label}${suit.id}`,
                rank: rank.value,
                label: rank.label,
                suit: suit.id,
                suitSymbol: suit.symbol
            });

        }

    }

    return deck;
}

// ========================================
// SHUFFLE
// ========================================

function shuffle(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}

// ========================================
// ROOM CODE
// ========================================

function generateRoomCode() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {

        code = "";

        for (let i = 0; i < 5; i++) {

            code += chars[
                Math.floor(Math.random() * chars.length)
            ];

        }

    } while (rooms.has(code));

    return code;
}

// ========================================
// PLAYER ID
// ========================================

function createPlayer(socket, name) {

    return {
        id: socket.id,
        name: cleanName(name),
        ready: false,
        hand: [],
        connected: true
    };
}

// ========================================
// CLEAN NAME
// ========================================

function cleanName(name) {

    if (!name) {
        return "Player";
    }

    return String(name)
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, 16) || "Player";
}

// ========================================
// FIND ROOM
// ========================================

function getPlayerRoom(socketId) {

    for (const [code, room] of rooms.entries()) {

        if (room.players.some(player => player.id === socketId)) {

            return {
                code,
                room
            };
        }
    }

    return null;
}

// ========================================
// ROOM STATE FOR CLIENT
// ========================================

function publicRoom(room) {

    return {
        code: room.code,

        players: room.players.map((player, index) => ({
            id: player.id,
            name: player.name,
            ready: player.ready,
            position: index
        })),

        maxPlayers: MAX_PLAYERS,

        started: room.started
    };
}

// ========================================
// GAME STATE FOR CLIENT
// ========================================

function publicGame(room, socketId) {

    const me = room.players.find(
        player => player.id === socketId
    );

    return {

        roomCode: room.code,

        started: room.started,

        turnPlayerId: room.turnPlayerId,

        lastPlayerId: room.lastPlayerId,

        pile: room.pile,

        pileCount: room.pile.length,

        passCount: room.passCount,

        turnTime: TURN_TIME,

        slapAvailable: room.slapAvailable,

        slapDeadline: room.slapDeadline,

        players: room.players.map(player => ({

            id: player.id,

            name: player.name,

            ready: player.ready,

            cardCount: player.hand.length,

            isTurn: player.id === room.turnPlayerId

        })),

        hand: me ? me.hand : []

    };
}

// ========================================
// BROADCAST ROOM
// ========================================

function broadcastRoom(room) {

    for (const player of room.players) {

        io.to(player.id).emit(
            "room:update",
            publicRoom(room)
        );
    }
}

// ========================================
// BROADCAST GAME
// ========================================

function broadcastGame(room) {

    for (const player of room.players) {

        io.to(player.id).emit(
            "game:state",
            publicGame(room, player.id)
        );
    }
}

// ========================================
// TURN TIMER
// ========================================

function clearTurnTimer(room) {

    if (room.turnTimer) {

        clearTimeout(room.turnTimer);

        room.turnTimer = null;
    }
}

// ========================================
// START TURN TIMER
// ========================================

function startTurnTimer(room) {

    clearTurnTimer(room);

    room.turnStartedAt = Date.now();

    io.to(room.code).emit(
        "game:timer",
        {
            playerId: room.turnPlayerId,
            seconds: TURN_TIME
        }
    );

    room.turnTimer = setTimeout(() => {

        if (!room.started) {
            return;
        }

        const player = room.players.find(
            p => p.id === room.turnPlayerId
        );

        if (!player) {
            return;
        }

        // Auto pass if possible
        if (room.pile.length > 0) {

            passTurn(room, player.id);

        } else {

            // ถ้าเป็นคนเริ่มกองใหม่
            // ให้ข้ามเทิร์นไม่ได้
            // แต่เริ่มใหม่ด้วยไพ่ใบแรก
            io.to(player.id).emit(
                "game:message",
                "ถึงเวลาของคุณแล้ว กรุณาเล่นไพ่"
            );

            startTurnTimer(room);
        }

    }, TURN_TIME * 1000);
}

// ========================================
// NEXT PLAYER
// ========================================

function nextPlayer(room, playerId) {

    const index = room.players.findIndex(
        player => player.id === playerId
    );

    if (index === -1) {
        return null;
    }

    return room.players[
        (index + 1) % room.players.length
    ];
}

// ========================================
// FIND 3 CLUBS
// ========================================

function findThreeClubs(room) {

    for (const player of room.players) {

        const card = player.hand.find(
            card => card.id === "3C"
        );

        if (card) {
            return player;
        }
    }

    return null;
}

// ========================================
// START GAME
// ========================================

function startGame(room) {

    if (room.players.length !== MAX_PLAYERS) {
        return false;
    }

    if (room.started) {
        return false;
    }

    const deck = shuffle(createDeck());

    // แจก 13 ใบให้แต่ละคน
    for (const player of room.players) {

        player.hand = [];

        for (let i = 0; i < HAND_SIZE; i++) {

            player.hand.push(
                deck.pop()
            );
        }

        sortHand(player.hand);
    }

    const starter = findThreeClubs(room);

    if (!starter) {

        // ถ้าไม่มี 3C จากเหตุผิดพลาด
        // แจกใหม่
        return startGame(room);
    }

    room.started = true;

    room.pile = [];

    room.lastPlayerId = null;

    room.turnPlayerId = starter.id;

    room.passCount = 0;

    room.slapAvailable = false;

    room.slapDeadline = 0;

    room.winner = null;

    clearTurnTimer(room);

    io.to(room.code).emit(
        "game:started",
        {
            message: `${starter.name} มี 3♣ และเริ่มเกม!`,
            starterId: starter.id
        }
    );

    broadcastGame(room);

    startTurnTimer(room);

    return true;
}

// ========================================
// SORT HAND
// ========================================

function sortHand(hand) {

    hand.sort((a, b) => {

        if (a.rank !== b.rank) {
            return a.rank - b.rank;
        }

        const suitOrder = {
            C: 1,
            D: 2,
            H: 3,
            S: 4
        };

        return suitOrder[a.suit] - suitOrder[b.suit];
    });
}

// ========================================
// CHECK PLAY
// ========================================

function isLegalPlay(room, player, cards) {

    if (!cards || cards.length === 0) {

        return {
            ok: false,
            reason: "ต้องเลือกไพ่ก่อน"
        };
    }

    // ห้ามเล่นไพ่ซ้ำ
    const unique = new Set(
        cards.map(card => card.id)
    );

    if (unique.size !== cards.length) {

        return {
            ok: false,
            reason: "ไพ่ซ้ำ"
        };
    }

    // ตรวจว่าไพ่เป็นของผู้เล่นจริง
    for (const selected of cards) {

        const exists = player.hand.some(
            card => card.id === selected.id
        );

        if (!exists) {

            return {
                ok: false,
                reason: "ไพ่ใบนี้ไม่อยู่ในมือ"
            };
        }
    }

    // รูปแบบที่รองรับ
    const count = cards.length;

    if (
        count !== 1 &&
        count !== 2 &&
        count !== 3 &&
        count !== 4
    ) {

        return {
            ok: false,
            reason: "รองรับไพ่เดี่ยว / คู่ / ตอง / สี่ใบ"
        };
    }

    // ต้องเป็น rank เดียวกัน
    const firstRank = cards[0].rank;

    const sameRank = cards.every(
        card => card.rank === firstRank
    );

    if (!sameRank) {

        return {
            ok: false,
            reason: "ไพ่ชุดนี้ต้องมีแต้มเดียวกัน"
        };
    }

    // ถ้าเป็นการเล่นครั้งแรก
    if (room.pile.length === 0) {

        // เกมแรกต้องมี 3C
        if (!room.lastPlayerId) {

            const hasThreeClubs = cards.some(
                card => card.id === "3C"
            );

            if (!hasThreeClubs) {

                return {
                    ok: false,
                    reason: "ตาแรกต้องมี 3♣"
                };
            }
        }

        return {
            ok: true
        };
    }

    // ต้องลงจำนวนเท่ากับกองล่าสุด
    if (count !== room.pile.length) {

        return {
            ok: false,
            reason: `ต้องลง ${room.pile.length} ใบ`
        };
    }

    // เปรียบเทียบ rank
    const previousRank = room.pile[0].rank;

    if (firstRank <= previousRank) {

        return {
            ok: false,
            reason: "ต้องลงไพ่ที่สูงกว่า"
        };
    }

    return {
        ok: true
    };
}

// ========================================
// PLAY CARDS
// ========================================

function playCards(room, playerId, cardIds) {

    const player = room.players.find(
        p => p.id === playerId
    );

    if (!player) {
        return;
    }

    if (room.turnPlayerId !== playerId) {

        io.to(playerId).emit(
            "game:error",
            "ยังไม่ถึงตาของคุณ"
        );

        return;
    }

    const cards = cardIds
        .map(id => player.hand.find(card => card.id === id))
        .filter(Boolean);

    const result = isLegalPlay(
        room,
        player,
        cards
    );

    if (!result.ok) {

        io.to(playerId).emit(
            "game:error",
            result.reason
        );

        return;
    }

    // Remove cards
    player.hand = player.hand.filter(
        card => !cardIds.includes(card.id)
    );

    room.pile = cards;

    room.lastPlayerId = player.id;

    room.passCount = 0;

    room.slapAvailable = true;

    room.slapDeadline = Date.now() + SLAP_TIME;

    clearTurnTimer(room);

    // Check winner
    if (player.hand.length === 0) {

        finishGame(
            room,
            player.id
        );

        return;
    }

    const next = nextPlayer(
        room,
        player.id
    );

    room.turnPlayerId = next.id;

    io.to(room.code).emit(
        "game:play",
        {
            playerId: player.id,
            playerName: player.name,
            cards: cards
        }
    );

    broadcastGame(room);

    // Slap window
    setTimeout(() => {

        if (
            room.slapDeadline <= Date.now()
        ) {

            room.slapAvailable = false;

            broadcastGame(room);
        }

    }, SLAP_TIME + 50);

    startTurnTimer(room);
}

// ========================================
// PASS
// ========================================

function passTurn(room, playerId) {

    if (room.turnPlayerId !== playerId) {

        io.to(playerId).emit(
            "game:error",
            "ยังไม่ถึงตาของคุณ"
        );

        return;
    }

    if (room.pile.length === 0) {

        io.to(playerId).emit(
            "game:error",
            "ตอนเริ่มกองใหม่ Pass ไม่ได้"
        );

        return;
    }

    room.passCount++;

    const player = room.players.find(
        p => p.id === playerId
    );

    io.to(room.code).emit(
        "game:pass",
        {
            playerId,
            playerName: player ? player.name : "Player"
        }
    );

    // ทุกคนยกเว้นคนที่ลงไพ่ล่าสุด pass
    if (
        room.passCount >= room.players.length - 1
    ) {

        const lastPlayer = room.players.find(
            p => p.id === room.lastPlayerId
        );

        room.pile = [];

        room.passCount = 0;

        room.slapAvailable = false;

        room.slapDeadline = 0;

        if (lastPlayer) {

            room.turnPlayerId = lastPlayer.id;

        } else {

            room.turnPlayerId = room.players[0].id;
        }

        broadcastGame(room);

        startTurnTimer(room);

        return;
    }

    const next = nextPlayer(
        room,
        playerId
    );

    room.turnPlayerId = next.id;

    broadcastGame(room);

    startTurnTimer(room);
}

// ========================================
// SLAP
// ========================================

function slap(room, playerId) {

    if (!room.started) {
        return;
    }

    if (!room.slapAvailable) {

        io.to(playerId).emit(
            "game:error",
            "หมดเวลาตบแล้ว"
        );

        return;
    }

    if (Date.now() > room.slapDeadline) {

        room.slapAvailable = false;

        io.to(playerId).emit(
            "game:error",
            "ช้าไป! หมดเวลาตบแล้ว"
        );

        return;
    }

    if (playerId === room.lastPlayerId) {

        io.to(playerId).emit(
            "game:error",
            "คนลงไพ่ตบตัวเองไม่ได้"
        );

        return;
    }

    const slapper = room.players.find(
        p => p.id === playerId
    );

    const lastPlayer = room.players.find(
        p => p.id === room.lastPlayerId
    );

    if (!slapper || !lastPlayer) {
        return;
    }

    // เอาไพ่ที่อยู่บนกองกลับเข้ามือคนลงล่าสุด
    const returnedCards = [...room.pile];

    lastPlayer.hand.push(
        ...returnedCards
    );

    sortHand(lastPlayer.hand);

    room.pile = [];

    room.lastPlayerId = null;

    room.passCount = 0;

    room.slapAvailable = false;

    room.slapDeadline = 0;

    // คนตบได้เริ่มรอบใหม่
    room.turnPlayerId = slapper.id;

    clearTurnTimer(room);

    io.to(room.code).emit(
        "game:slap",
        {
            slapperId: slapper.id,
            slapperName: slapper.name,
            punishedId: lastPlayer.id,
            punishedName: lastPlayer.name,
            cardsReturned: returnedCards
        }
    );

    broadcastGame(room);

    startTurnTimer(room);
}

// ========================================
// EMOTE
// ========================================

function sendEmote(room, playerId, emoji) {

    const player = room.players.find(
        p => p.id === playerId
    );

    if (!player) {
        return;
    }

    const allowed = [
        "😂",
        "😎",
        "😭",
        "😡",
        "😱",
        "🤡",
        "🔥",
        "💀",
        "👏",
        "👋"
    ];

    if (!allowed.includes(emoji)) {
        return;
    }

    io.to(room.code).emit(
        "game:emote",
        {
            playerId,
            playerName: player.name,
            emoji
        }
    );
}

// ========================================
// FINISH GAME
// ========================================

function finishGame(room, winnerId) {

    clearTurnTimer(room);

    room.started = false;

    room.slapAvailable = false;

    room.slapDeadline = 0;

    const winner = room.players.find(
        p => p.id === winnerId
    );

    room.winner = winnerId;

    io.to(room.code).emit(
        "game:result",
        {
            winnerId,
            winnerName: winner
                ? winner.name
                : "Player"
        }
    );

    for (const player of room.players) {

        player.ready = false;
    }

    broadcastRoom(room);
}

// ========================================
// CREATE ROOM
// ========================================

function createRoom(socket, name) {

    const code = generateRoomCode();

    const room = {

        code,

        players: [],

        started: false,

        pile: [],

        turnPlayerId: null,

        lastPlayerId: null,

        passCount: 0,

        slapAvailable: false,

        slapDeadline: 0,

        turnTimer: null,

        turnStartedAt: 0,

        winner: null
    };

    const player = createPlayer(
        socket,
        name
    );

    room.players.push(player);

    rooms.set(code, room);

    socket.join(code);

    socket.data.roomCode = code;

    socket.data.playerId = socket.id;

    broadcastRoom(room);

    socket.emit(
        "room:created",
        {
            code
        }
    );
}

// ========================================
// JOIN ROOM
// ========================================

function joinRoom(socket, name, code) {

    const roomCode = String(code || "")
        .trim()
        .toUpperCase();

    const room = rooms.get(roomCode);

    if (!room) {

        socket.emit(
            "room:error",
            "ไม่พบห้องนี้"
        );

        return;
    }

    if (room.started) {

        socket.emit(
            "room:error",
            "เกมเริ่มไปแล้ว"
        );

        return;
    }

    if (room.players.length >= MAX_PLAYERS) {

        socket.emit(
            "room:error",
            "ห้องเต็มแล้ว"
        );

        return;
    }

    const player = createPlayer(
        socket,
        name
    );

    room.players.push(player);

    socket.join(room.code);

    socket.data.roomCode = room.code;

    socket.data.playerId = socket.id;

    broadcastRoom(room);

    socket.emit(
        "room:joined",
        {
            code: room.code
        }
    );
}

// ========================================
// LEAVE ROOM
// ========================================

function leaveRoom(socket) {

    const result = getPlayerRoom(
        socket.id
    );

    if (!result) {
        return;
    }

    const {
        code,
        room
    } = result;

    room.players = room.players.filter(
        player => player.id !== socket.id
    );

    socket.leave(code);

    socket.data.roomCode = null;

    socket.data.playerId = null;

    clearTurnTimer(room);

    if (room.players.length === 0) {

        rooms.delete(code);

        return;
    }

    if (room.started) {

        room.started = false;

        room.pile = [];

        room.turnPlayerId = null;

        room.lastPlayerId = null;

        room.passCount = 0;

        room.slapAvailable = false;

        room.slapDeadline = 0;

        for (const player of room.players) {

            player.hand = [];

            player.ready = false;
        }

        io.to(code).emit(
            "game:message",
            "ผู้เล่นออกจากห้อง เกมถูกยกเลิก"
        );
    }

    broadcastRoom(room);
}

// ========================================
// SOCKET CONNECTION
// ========================================

io.on("connection", socket => {

    console.log(
        "Connected:",
        socket.id
    );

    socket.emit(
        "server:online",
        {
            message: "D.M.I.T Slap War Server Online"
        }
    );

    // ------------------------------
    // CREATE ROOM
    // ------------------------------

    socket.on(
        "room:create",
        ({ name }) => {

            createRoom(
                socket,
                name
            );
        }
    );

    // ------------------------------
    // JOIN ROOM
    // ------------------------------

    socket.on(
        "room:join",
        ({ name, code }) => {

            joinRoom(
                socket,
                name,
                code
            );
        }
    );

    // ------------------------------
    // READY
    // ------------------------------

    socket.on(
        "room:ready",
        () => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            const player =
                result.room.players.find(
                    p => p.id === socket.id
                );

            if (!player) {
                return;
            }

            player.ready = !player.ready;

            broadcastRoom(result.room);
        }
    );

    // ------------------------------
    // START GAME
    // ------------------------------

    socket.on(
        "game:start",
        () => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            const room = result.room;

            if (room.players.length !== MAX_PLAYERS) {

                socket.emit(
                    "room:error",
                    "ต้องมีผู้เล่น 4 คนก่อนเริ่มเกม"
                );

                return;
            }

            const allReady =
                room.players.every(
                    player => player.ready
                );

            if (!allReady) {

                socket.emit(
                    "room:error",
                    "ผู้เล่นทุกคนต้องกด READY"
                );

                return;
            }

            startGame(room);
        }
    );

    // ------------------------------
    // PLAY
    // ------------------------------

    socket.on(
        "game:play",
        ({ cards }) => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            if (!Array.isArray(cards)) {
                return;
            }

            playCards(
                result.room,
                socket.id,
                cards
            );
        }
    );

    // ------------------------------
    // PASS
    // ------------------------------

    socket.on(
        "game:pass",
        () => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            passTurn(
                result.room,
                socket.id
            );
        }
    );

    // ------------------------------
    // SLAP
    // ------------------------------

    socket.on(
        "game:slap",
        () => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            slap(
                result.room,
                socket.id
            );
        }
    );

    // ------------------------------
    // EMOTE
    // ------------------------------

    socket.on(
        "game:emote",
        emoji => {

            const result =
                getPlayerRoom(socket.id);

            if (!result) {
                return;
            }

            sendEmote(
                result.room,
                socket.id,
                emoji
            );
        }
    );

    // ------------------------------
    // LEAVE
    // ------------------------------

    socket.on(
        "room:leave",
        () => {

            leaveRoom(socket);

            socket.emit(
                "room:left"
            );
        }
    );

    // ------------------------------
    // DISCONNECT
    // ------------------------------

    socket.on(
        "disconnect",
        () => {

            console.log(
                "Disconnected:",
                socket.id
            );

            leaveRoom(socket);
        }
    );
});

// ========================================
// SERVER
// ========================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `D.M.I.T Slap War server running on port ${PORT}`
        );
    }
);
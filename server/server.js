const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const rooms = new Map();


// ========================================
// TEST SERVER
// ========================================

app.get("/", (req, res) => {

    res.json({
        name: "D.M.I.T Slap War Server",
        status: "online",
        rooms: rooms.size
    });

});


// ========================================
// CREATE ROOM CODE
// ========================================

function createRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (let i = 0; i < 4; i++) {

            code +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }

    } while (rooms.has(code));

    return code;
}


// ========================================
// ROOM DATA
// ========================================

function publicRoom(room) {

    return {

        code: room.code,

        hostId: room.hostId,

        players: room.players.map(player => ({

            id: player.id,

            name: player.name,

            ready: player.ready

        }))

    };

}


// ========================================
// SOCKET.IO
// ========================================

io.on("connection", socket => {

    console.log(
        "Player connected:",
        socket.id
    );


    // ====================================
    // CREATE ROOM
    // ====================================

    socket.on("room:create", data => {

        const name =
            String(
                data?.name ||
                "Player"
            ).slice(0, 14);


        const code =
            createRoomCode();


        const room = {

            code: code,

            hostId: socket.id,

            players: [

                {

                    id: socket.id,

                    name: name,

                    ready: false

                }

            ]

        };


        rooms.set(
            code,
            room
        );


        socket.join(code);

        socket.roomCode = code;


        socket.emit(
            "room:update",
            {
                ...publicRoom(room),

                isHost:
                    room.hostId ===
                    socket.id
            }
        );


        console.log(
            `Room ${code} created by ${name}`
        );

    });


    // ====================================
    // JOIN ROOM
    // ====================================

    socket.on("room:join", data => {

        const code =
            String(
                data?.code || ""
            )
            .trim()
            .toUpperCase();


        const name =
            String(
                data?.name ||
                "Player"
            ).slice(0, 14);


        const room =
            rooms.get(code);


        if (!room) {

            socket.emit(
                "errorMessage",
                "ไม่พบห้องนี้"
            );

            return;

        }


        if (
            room.players.length >= 4
        ) {

            socket.emit(
                "errorMessage",
                "ห้องเต็มแล้ว"
            );

            return;

        }


        room.players.push({

            id: socket.id,

            name: name,

            ready: false

        });


        socket.join(code);

        socket.roomCode = code;


        io.to(code).emit(
            "room:update",
            publicRoom(room)
        );


        console.log(
            `${name} joined room ${code}`
        );

    });


    // ====================================
    // READY
    // ====================================

    socket.on("room:ready", () => {

        const room =
            rooms.get(
                socket.roomCode
            );


        if (!room)
            return;


        const player =
            room.players.find(
                p =>
                    p.id ===
                    socket.id
            );


        if (!player)
            return;


        player.ready =
            !player.ready;


        io.to(
            room.code
        ).emit(
            "room:update",
            publicRoom(room)
        );

    });


    // ====================================
    // LEAVE ROOM
    // ====================================

    socket.on("room:leave", () => {

        leaveRoom(socket);

    });


    // ====================================
    // DISCONNECT
    // ====================================

    socket.on("disconnect", () => {

        console.log(
            "Player disconnected:",
            socket.id
        );

        leaveRoom(socket);

    });

});


// ========================================
// LEAVE FUNCTION
// ========================================

function leaveRoom(socket) {

    const code =
        socket.roomCode;


    if (!code)
        return;


    const room =
        rooms.get(code);


    if (!room)
        return;


    room.players =
        room.players.filter(
            player =>
                player.id !==
                socket.id
        );


    socket.leave(code);

    socket.roomCode = null;


    if (room.players.length === 0) {

        rooms.delete(code);

        console.log(
            `Room ${code} deleted`
        );

        return;

    }


    // เปลี่ยน Host ถ้า Host ออก

    if (
        room.hostId ===
        socket.id
    ) {

        room.hostId =
            room.players[0].id;

    }


    io.to(
        room.code
    ).emit(
        "room:update",
        publicRoom(room)
    );

}


// ========================================
// START SERVER
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
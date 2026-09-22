const socket = io(SERVER_URL, {
    transports: ["websocket", "polling"]
});


/* =====================================
   GAME STATE
===================================== */

const state = {

    room: null,

    me: null,

    game: null,

    selected: new Set(),

    timer: null,

    localSeconds: 20

};


/* =====================================
   HELPER
===================================== */

const $ = id => document.getElementById(id);


const suits = {

    C: "♣",
    D: "♦",
    H: "♥",
    S: "♠"

};


/* =====================================
   CONNECTION
===================================== */

socket.on("connect", () => {

    $("connectionText").textContent =
        "เชื่อมต่อ Server แล้ว";

});


socket.on("disconnect", () => {

    $("connectionText").textContent =
        "หลุดจาก Server — กำลังเชื่อมต่อใหม่...";

});


socket.on("errorMessage", message => {

    toast(message);

});


/* =====================================
   ROOM UPDATE
===================================== */

socket.on("room:update", room => {

    state.room = room;

    $("roomCode").textContent =
        room.code;

    renderRoom();

});


/* =====================================
   LEAVE ROOM
===================================== */

socket.on("room:left", () => {

    showLobby();

});


/* =====================================
   GAME STATE
===================================== */

socket.on("game:state", game => {

    state.game = game;

    state.selected.clear();

    showGame();

    renderGame();

});


/* =====================================
   GAME START
===================================== */

socket.on("game:started", game => {

    state.game = game;

    $("resultModal")
        .classList
        .add("hidden");

    showGame();

    renderGame();

});


/* =====================================
   TIMER
===================================== */

socket.on("game:timer", data => {

    state.localSeconds =
        data.seconds;

    $("timer").textContent =
        data.seconds;

});


/* =====================================
   EMOTE
===================================== */

socket.on("game:emote", data => {

    const element =
        document.createElement("div");

    element.className =
        "pop-emote";

    element.textContent =
        data.emote;

    element.style.left =
        `${20 + Math.random() * 60}%`;

    element.style.top =
        `${20 + Math.random() * 45}%`;

    $("effectLayer")
        .appendChild(element);

    setTimeout(() => {

        element.remove();

    }, 1300);

});


/* =====================================
   SLAP EFFECT
===================================== */

socket.on("game:slap", data => {

    toast(data.message);

    const arena =
        document.querySelector(".arena");

    if (!arena)
        return;

    arena.classList.add("shake");

    setTimeout(() => {

        arena.classList.remove("shake");

    }, 350);

});


/* =====================================
   RESULT
===================================== */

socket.on("game:result", result => {

    $("resultTitle").textContent =
        result.winner === state.me?.id
            ? "YOU WIN!"
            : `${result.winnerName} WIN!`;

    $("resultText").textContent =
        result.message || "จบเกมแล้ว";

    $("resultModal")
        .classList
        .remove("hidden");

});


/* =====================================
   GET PLAYER NAME
===================================== */

function getName() {

    return (
        $("nameInput")
            .value
            .trim() ||
        "Player"
    ).slice(0, 14);

}


/* =====================================
   CREATE ROOM
===================================== */

function createRoom() {

    state.me = {

        name: getName()

    };

    socket.emit(
        "room:create",
        {
            name: state.me.name
        }
    );

}


/* =====================================
   JOIN ROOM
===================================== */

function joinRoom() {

    state.me = {

        name: getName()

    };

    const code =
        $("roomInput")
            .value
            .trim()
            .toUpperCase();

    if (!code) {

        toast("ใส่รหัสห้องก่อน");

        return;

    }

    socket.emit(
        "room:join",
        {
            code: code,
            name: state.me.name
        }
    );

}


/* =====================================
   CREATE / JOIN BUTTON
===================================== */

$("createBtn").onclick =
    createRoom;

$("joinBtn").onclick =
    joinRoom;


$("roomInput").onkeydown = e => {

    if (e.key === "Enter") {

        joinRoom();

    }

};


/* =====================================
   COPY ROOM
===================================== */

$("copyBtn").onclick =
    async () => {

        const code =
            state.room?.code ||
            $("roomInput").value;

        if (!code)
            return;

        try {

            await navigator
                .clipboard
                .writeText(code);

            toast(
                "คัดลอกรหัสห้องแล้ว"
            );

        } catch {

            toast(code);

        }

    };


/* =====================================
   READY
===================================== */

$("readyBtn").onclick =
    () => {

        socket.emit(
            "room:ready"
        );

    };


/* =====================================
   START
===================================== */

$("startBtn").onclick =
    () => {

        socket.emit(
            "game:start"
        );

    };


/* =====================================
   LEAVE ROOM
===================================== */

$("leaveRoomBtn").onclick =
    () => {

        socket.emit(
            "room:leave"
        );

    };


$("gameLeaveBtn").onclick =
    () => {

        if (
            confirm(
                "ออกจากเกมและห้องนี้?"
            )
        ) {

            socket.emit(
                "room:leave"
            );

        }

    };


/* =====================================
   RESULT → LOBBY
===================================== */

$("backLobbyBtn").onclick =
    () => {

        $("resultModal")
            .classList
            .add("hidden");

        showLobby();

    };


/* =====================================
   PLAY
===================================== */

$("playBtn").onclick =
    () => {

        if (!state.game)
            return;

        socket.emit(
            "game:play",
            {
                cards:
                    [...state.selected]
            }
        );

    };


/* =====================================
   PASS
===================================== */

$("passBtn").onclick =
    () => {

        socket.emit(
            "game:pass"
        );

    };


/* =====================================
   SLAP
===================================== */

$("slapBtn").onclick =
    () => {

        socket.emit(
            "game:slap"
        );

    };


/* =====================================
   EMOTE
===================================== */

document
    .querySelectorAll(
        ".emotes button"
    )
    .forEach(button => {

        button.onclick = () => {

            socket.emit(
                "game:emote",
                {
                    emote:
                        button.dataset.emote
                }
            );

        };

    });


/* =====================================
   SHOW LOBBY
===================================== */

function showLobby() {

    $("lobbyScreen")
        .classList
        .remove("hidden");

    $("roomScreen")
        .classList
        .add("hidden");

    $("gameScreen")
        .classList
        .add("hidden");

    state.room = null;

    state.game = null;

}


/* =====================================
   SHOW ROOM
===================================== */

function showRoom() {

    $("lobbyScreen")
        .classList
        .add("hidden");

    $("roomScreen")
        .classList
        .remove("hidden");

    $("gameScreen")
        .classList
        .add("hidden");

}


/* =====================================
   SHOW GAME
===================================== */

function showGame() {

    $("lobbyScreen")
        .classList
        .add("hidden");

    $("roomScreen")
        .classList
        .add("hidden");

    $("gameScreen")
        .classList
        .remove("hidden");

}


/* =====================================
   RENDER ROOM
===================================== */

function renderRoom() {

    showRoom();

    const room =
        state.room;

    $("playerList")
        .innerHTML = "";

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const player =
            room.players[i];

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "slot";

        if (!player) {

            div.innerHTML = `

                <div class="avatar">
                    ❔
                </div>

                <h3>
                    รอผู้เล่น...
                </h3>

            `;

        } else {

            const avatars = [
                "😎",
                "🤡",
                "🐱",
                "👾"
            ];

            div.innerHTML = `

                <div class="avatarline">

                    <div class="avatar">
                        ${avatars[i]}
                    </div>

                    <div>

                        <div class="pname">

                            ${esc(player.name)}

                            ${
                                player.id ===
                                state.me?.id
                                    ? "(คุณ)"
                                    : ""
                            }

                        </div>

                        <div class="${
                            player.ready
                                ? "ready"
                                : "notready"
                        }">

                            ${
                                player.ready
                                    ? "● พร้อม"
                                    : "○ ยังไม่พร้อม"
                            }

                        </div>

                    </div>

                </div>

            `;

        }

        $("playerList")
            .appendChild(div);

    }


    const me =
        room.players.find(
            p =>
                p.id ===
                state.me?.id
        );


    $("readyBtn").textContent =
        me?.ready
            ? "ยกเลิกพร้อม"
            : "พร้อม";


    $("readyBtn")
        .classList
        .toggle(
            "primary",
            !me?.ready
        );


    $("startBtn")
        .classList
        .toggle(
            "hidden",
            !(
                room.isHost &&
                room.players.length === 4 &&
                room.players.every(
                    p => p.ready
                )
            )
        );

}


/* =====================================
   RENDER GAME
===================================== */

function renderGame() {

    const game =
        state.game;

    if (!game)
        return;


    const currentPlayer =
        game.players[
            game.turn
        ];


    $("turnText").textContent =

        currentPlayer?.id ===
        state.me?.id

            ? "ตาของคุณ!"

            : `ตา ${
                currentPlayer?.name ||
                "-"
              }`;


    $("trickText")
        .textContent =

        game.currentPlay?.length

            ? `ต้องตาม ${
                game.currentPlay.length
              } ใบ`

            : "เปิดชุดใหม่ได้";


    $("pileCount")
        .textContent =
        `กอง ${game.pile.length}`;


    $("handCount")
        .textContent =
        game.myHand.length;


    $("hint")
        .textContent =

        currentPlayer?.id ===
        state.me?.id

            ? "เลือกไพ่แล้วกด PLAY"

            : "";


    /* PLAYERS */

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const player =
            game.players[i];

        const element =
            $(`player${i}`);


        if (!player) {

            element.innerHTML = "";

            continue;

        }


        element.classList.toggle(
            "active",
            i === game.turn
        );


        element.classList.toggle(
            "dead",
            player.finished
        );


        const avatars = [
            "😎",
            "🤡",
            "🐱",
            "👾"
        ];


        element.innerHTML = `

            <div class="avatarline">

                <div class="avatar">
                    ${avatars[i]}
                </div>

                <div>

                    <div class="pname">

                        ${esc(player.name)}

                        ${
                            player.id ===
                            state.me?.id

                                ? `<span class="badge">
                                     YOU
                                   </span>`

                                : ""
                        }

                    </div>

                    <div class="count">

                        ${player.handCount}
                        ใบ

                        ${
                            player.finished
                                ? " 🏆"
                                : ""
                        }

                    </div>

                </div>

            </div>

        `;

    }


    renderHand(
        game.myHand
    );


    renderPile(
        game.pile.slice(-8)
    );


    const myTurn =
        currentPlayer?.id ===
        state.me?.id;


    $("playBtn").disabled =
        !myTurn;


    $("passBtn").disabled =
        !myTurn ||
        !game.currentPlay;


    $("slapBtn").disabled =
        !game.canSlap;

}


/* =====================================
   RENDER HAND
===================================== */

function renderHand(hand) {

    const box =
        $("hand");

    box.innerHTML = "";


    hand.forEach(card => {

        const element =
            cardElement(card);


        element.classList.toggle(
            "selected",
            state.selected.has(
                card.id
            )
        );


        element.onclick = () => {

            const game =
                state.game;

            if (
                game.players[
                    game.turn
                ]?.id !==
                state.me?.id
            ) {

                return;

            }


            if (
                state.selected.has(
                    card.id
                )
            ) {

                state.selected.delete(
                    card.id
                );

            } else {

                state.selected.add(
                    card.id
                );

            }


            renderHand(hand);

        };


        box.appendChild(element);

    });

}


/* =====================================
   RENDER PLAYED CARDS
===================================== */

function renderPile(pile) {

    const box =
        $("playedCards");

    box.innerHTML = "";


    pile.forEach(card => {

        box.appendChild(
            cardElement(card)
        );

    });

}


/* =====================================
   CREATE CARD ELEMENT
===================================== */

function cardElement(card) {

    const element =
        document.createElement(
            "div"
        );


    const red =
        card.suit === "H" ||
        card.suit === "D";


    element.className =
        "card" +
        (red ? " red" : "");


    element.innerHTML = `

        <span class="rank">
            ${card.rank}
        </span>

        <span class="suit">
            ${suits[card.suit]}
        </span>

    `;


    return element;

}


/* =====================================
   TOAST
===================================== */

function toast(message) {

    const element =
        $("toast");


    if (!element)
        return;


    element.textContent =
        message;


    element.classList.add(
        "show"
    );


    clearTimeout(
        toast.timer
    );


    toast.timer =
        setTimeout(() => {

            element.classList.remove(
                "show"
            );

        }, 2200);

}


/* =====================================
   HTML ESCAPE
===================================== */

function esc(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            char => {

                return {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                }[char];

            }
        );

}
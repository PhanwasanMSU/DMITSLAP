// ========================================
// D.M.I.T SLAP WAR
// CLIENT
// ========================================

const socket = io(SERVER_URL, {
    transports: [
        "websocket",
        "polling"
    ]
});


// ========================================
// STATE
// ========================================

let myId = null;

let myName = "";

let currentRoom = "";

let currentGame = null;

let selectedCards = [];

let timerInterval = null;


// ========================================
// DOM
// ========================================

const lobby =
    document.getElementById("lobby");

const roomScreen =
    document.getElementById("roomScreen");

const gameScreen =
    document.getElementById("gameScreen");

const playerName =
    document.getElementById("playerName");

const roomCode =
    document.getElementById("roomCode");

const connectionStatus =
    document.getElementById(
        "connectionStatus"
    );

const currentRoomCode =
    document.getElementById(
        "currentRoomCode"
    );

const gameRoomCode =
    document.getElementById(
        "gameRoomCode"
    );

const playerList =
    document.getElementById(
        "playerList"
    );

const hand =
    document.getElementById(
        "hand"
    );

const pile =
    document.getElementById(
        "pile"
    );

const pileInfo =
    document.getElementById(
        "pileInfo"
    );

const gameMessage =
    document.getElementById(
        "gameMessage"
    );

const toast =
    document.getElementById(
        "toast"
    );

const turnTimer =
    document.getElementById(
        "turnTimer"
    );


// ========================================
// BUTTONS
// ========================================

document
    .getElementById("createRoomBtn")
    .addEventListener(
        "click",
        createRoom
    );

document
    .getElementById("joinRoomBtn")
    .addEventListener(
        "click",
        joinRoom
    );

document
    .getElementById("copyRoomBtn")
    .addEventListener(
        "click",
        copyRoomCode
    );

document
    .getElementById("readyBtn")
    .addEventListener(
        "click",
        toggleReady
    );

document
    .getElementById("startGameBtn")
    .addEventListener(
        "click",
        startGame
    );

document
    .getElementById("leaveRoomBtn")
    .addEventListener(
        "click",
        leaveRoom
    );

document
    .getElementById("playBtn")
    .addEventListener(
        "click",
        playSelected
    );

document
    .getElementById("passBtn")
    .addEventListener(
        "click",
        passTurn
    );

document
    .getElementById("slapBtn")
    .addEventListener(
        "click",
        slap
    );

document
    .getElementById("backRoomBtn")
    .addEventListener(
        "click",
        backToRoom
    );


// ========================================
// EMOTES
// ========================================

document
    .querySelectorAll(
        ".emotes button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const emoji =
                    button.dataset.emoji;

                socket.emit(
                    "game:emote",
                    emoji
                );
            }
        );

    });


// ========================================
// SOCKET CONNECT
// ========================================

socket.on(
    "connect",
    () => {

        myId = socket.id;

        connectionStatus.textContent =
            "เชื่อมต่อ Server แล้ว ✓";

        connectionStatus.style.color =
            "#31d17c";

        showToast(
            "เชื่อมต่อ Server สำเร็จ"
        );
    }
);


// ========================================
// DISCONNECT
// ========================================

socket.on(
    "disconnect",
    () => {

        connectionStatus.textContent =
            "หลุดจาก Server";

        connectionStatus.style.color =
            "#ff4168";

        showToast(
            "การเชื่อมต่อหลุด"
        );
    }
);


// ========================================
// SERVER ONLINE
// ========================================

socket.on(
    "server:online",
    data => {

        console.log(
            data.message
        );
    }
);


// ========================================
// CREATE ROOM
// ========================================

function createRoom() {

    const name =
        getPlayerName();

    if (!name) {
        return;
    }

    myName = name;

    socket.emit(
        "room:create",
        {
            name
        }
    );
}


// ========================================
// JOIN ROOM
// ========================================

function joinRoom() {

    const name =
        getPlayerName();

    const code =
        roomCode.value
            .trim()
            .toUpperCase();

    if (!name) {
        return;
    }

    if (code.length !== 5) {

        showToast(
            "ใส่รหัสห้อง 5 ตัว"
        );

        return;
    }

    myName = name;

    socket.emit(
        "room:join",
        {
            name,
            code
        }
    );
}


// ========================================
// GET NAME
// ========================================

function getPlayerName() {

    const name =
        playerName.value
            .trim();

    if (!name) {

        showToast(
            "กรุณาใส่ชื่อผู้เล่น"
        );

        playerName.focus();

        return null;
    }

    return name.slice(
        0,
        16
    );
}


// ========================================
// ROOM CREATED
// ========================================

socket.on(
    "room:created",
    data => {

        currentRoom =
            data.code;

        roomCode.value =
            data.code;

        showRoom();
    }
);


// ========================================
// ROOM JOINED
// ========================================

socket.on(
    "room:joined",
    data => {

        currentRoom =
            data.code;

        roomCode.value =
            data.code;

        showRoom();
    }
);


// ========================================
// ROOM ERROR
// ========================================

socket.on(
    "room:error",
    message => {

        showToast(
            message
        );
    }
);


// ========================================
// ROOM UPDATE
// ========================================

socket.on(
    "room:update",
    room => {

        currentRoom =
            room.code;

        renderRoom(
            room
        );

        if (
            room.started &&
            gameScreen.classList.contains(
                "active"
            )
        ) {
            return;
        }

    }
);


// ========================================
// SHOW ROOM
// ========================================

function showRoom() {

    lobby.classList.remove(
        "active"
    );

    gameScreen.classList.remove(
        "active"
    );

    roomScreen.classList.add(
        "active"
    );

    currentRoomCode.textContent =
        currentRoom;

    roomMessage.textContent =
        "รอผู้เล่น 4 คน...";
}


// ========================================
// RENDER ROOM
// ========================================

function renderRoom(room) {

    currentRoomCode.textContent =
        room.code;

    playerList.innerHTML = "";

    room.players.forEach(
        (player, index) => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "room-player";

            div.innerHTML = `
                <div class="room-avatar">
                    P${index + 1}
                </div>

                <div class="room-player-info">
                    <span class="room-player-name">
                        ${escapeHTML(player.name)}
                    </span>

                    <span class="ready-status ${player.ready ? "ready" : ""}">
                        ${player.ready ? "✓ READY" : "รอ READY"}
                    </span>
                </div>
            `;

            playerList.appendChild(
                div
            );
        }
    );

    while (
        playerList.children.length <
        4
    ) {

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "room-player";

        div.innerHTML = `
            <div class="room-avatar">
                ?
            </div>

            <div class="room-player-info">
                <span class="room-player-name">
                    รอผู้เล่น...
                </span>

                <span class="ready-status">
                    Empty
                </span>
            </div>
        `;

        playerList.appendChild(
            div
        );
    }

    const allReady =
        room.players.length === 4 &&
        room.players.every(
            player => player.ready
        );

    document
        .getElementById("startGameBtn")
        .disabled =
            !allReady;

    if (
        room.players.length < 4
    ) {

        roomMessage.textContent =
            `มีผู้เล่น ${room.players.length}/4`;

    } else if (!allReady) {

        roomMessage.textContent =
            "ผู้เล่นทุกคนกด READY ก่อน";

    } else {

        roomMessage.textContent =
            "พร้อมแล้ว! กด START GAME";
    }
}


// ========================================
// READY
// ========================================

function toggleReady() {

    socket.emit(
        "room:ready"
    );
}


// ========================================
// START
// ========================================

function startGame() {

    socket.emit(
        "game:start"
    );
}


// ========================================
// GAME STARTED
// ========================================

socket.on(
    "game:started",
    data => {

        showGame();

        showToast(
            data.message
        );
    }
);


// ========================================
// SHOW GAME
// ========================================

function showGame() {

    lobby.classList.remove(
        "active"
    );

    roomScreen.classList.remove(
        "active"
    );

    gameScreen.classList.add(
        "active"
    );

    gameRoomCode.textContent =
        currentRoom;
}


// ========================================
// GAME STATE
// ========================================

socket.on(
    "game:state",
    state => {

        currentGame =
            state;

        selectedCards = [];

        showGame();

        renderPlayers(
            state
        );

        renderHand(
            state.hand
        );

        renderPile(
            state.pile
        );

        updateButtons(
            state
        );

        updateMyInfo(
            state
        );
    }
);


// ========================================
// RENDER PLAYERS
// ========================================

function renderPlayers(
    state
) {

    const players =
        state.players;

    const positions = [
        "playerTop",
        "playerLeft",
        "playerRight"
    ];

    // My player
    const me =
        players.find(
            player =>
                player.id === myId
        );

    document
        .getElementById(
            "myName"
        )
        .textContent =
            me
                ? me.name
                : myName;

    const others =
        players.filter(
            player =>
                player.id !== myId
        );

    positions.forEach(
        (id, index) => {

            const element =
                document.getElementById(
                    id
                );

            const player =
                others[index];

            if (!player) {

                element.style.opacity =
                    ".3";

                element.querySelector(
                    ".player-name"
                ).textContent =
                    "Waiting...";

                element.querySelector(
                    ".card-count"
                ).textContent =
                    "0 ใบ";

                element.classList.remove(
                    "active-turn"
                );

                return;
            }

            element.style.opacity =
                "1";

            element.querySelector(
                ".player-name"
            ).textContent =
                player.name;

            element.querySelector(
                ".card-count"
            ).textContent =
                `${player.cardCount} ใบ`;

            element.classList.toggle(
                "active-turn",
                player.id ===
                state.turnPlayerId
            );
        }
    );
}


// ========================================
// UPDATE MY INFO
// ========================================

function updateMyInfo(
    state
) {

    const me =
        state.players.find(
            player =>
                player.id === myId
        );

    if (!me) {
        return;
    }

    document
        .getElementById(
            "myName"
        )
        .textContent =
            me.name;

    document
        .getElementById(
            "myCardCount"
        )
        .textContent =
            `${me.cardCount} ใบ`;
}


// ========================================
// RENDER HAND
// ========================================

function renderHand(
    cards
) {

    hand.innerHTML = "";

    if (!cards) {
        return;
    }

    cards.forEach(
        card => {

            const element =
                createCard(
                    card,
                    true
                );

            element.addEventListener(
                "click",
                () => {

                    toggleCard(
                        card.id,
                        element
                    );
                }
            );

            hand.appendChild(
                element
            );
        }
    );
}


// ========================================
// CREATE CARD
// ========================================

function createCard(
    card,
    interactive = false
) {

    const element =
        document.createElement(
            "div"
        );

    const red =
        card.suit === "D" ||
        card.suit === "H";

    element.className =
        `card ${red ? "red" : "black"}`;

    if (interactive) {

        element.dataset.id =
            card.id;
    }

    element.innerHTML = `
        <div class="card-rank">
            ${card.label}
        </div>

        <div class="card-suit">
            ${card.suitSymbol}
        </div>
    `;

    return element;
}


// ========================================
// SELECT CARD
// ========================================

function toggleCard(
    cardId,
    element
) {

    const index =
        selectedCards.indexOf(
            cardId
        );

    if (index >= 0) {

        selectedCards.splice(
            index,
            1
        );

        element.classList.remove(
            "selected"
        );

    } else {

        if (
            selectedCards.length >= 4
        ) {

            showToast(
                "เลือกได้สูงสุด 4 ใบ"
            );

            return;
        }

        selectedCards.push(
            cardId
        );

        element.classList.add(
            "selected"
        );
    }
}


// ========================================
// PLAY
// ========================================

function playSelected() {

    if (
        selectedCards.length === 0
    ) {

        showToast(
            "เลือกไพ่ก่อน"
        );

        return;
    }

    if (
        !currentGame ||
        currentGame.turnPlayerId !== myId
    ) {

        showToast(
            "ยังไม่ถึงตาของคุณ"
        );

        return;
    }

    socket.emit(
        "game:play",
        {
            cards:
                selectedCards
        }
    );
}


// ========================================
// PLAY EVENT
// ========================================

socket.on(
    "game:play",
    data => {

        showGameMessage(
            `${data.playerName} ลงไพ่`
        );
    }
);


// ========================================
// PASS
// ========================================

function passTurn() {

    socket.emit(
        "game:pass"
    );
}


// ========================================
// PASS EVENT
// ========================================

socket.on(
    "game:pass",
    data => {

        showGameMessage(
            `${data.playerName} PASS`
        );
    }
);


// ========================================
// SLAP
// ========================================

function slap() {

    socket.emit(
        "game:slap"
    );
}


// ========================================
// SLAP EVENT
// ========================================

socket.on(
    "game:slap",
    data => {

        showGameMessage(
            `${data.slapperName} SLAP! ${data.punishedName} โดนเอาไพ่คืน`
        );

        gameScreen.classList.add(
            "slap-effect"
        );

        setTimeout(
            () => {

                gameScreen.classList.remove(
                    "slap-effect"
                );

            },
            600
        );

        showToast(
            `${data.slapperName} ตบสำเร็จ!`
        );
    }
);


// ========================================
// RENDER PILE
// ========================================

function renderPile(
    cards
) {

    pile.innerHTML = "";

    if (
        !cards ||
        cards.length === 0
    ) {

        pileInfo.textContent =
            "เริ่มกองใหม่";

        return;
    }

    cards.forEach(
        card => {

            pile.appendChild(
                createCard(
                    card,
                    false
                )
            );
        }
    );

    pileInfo.textContent =
        `${cards.length} ใบ`;
}


// ========================================
// UPDATE BUTTONS
// ========================================

function updateButtons(
    state
) {

    const myTurn =
        state.turnPlayerId === myId;

    document
        .getElementById(
            "playBtn"
        )
        .disabled =
            !myTurn;

    document
        .getElementById(
            "passBtn"
        )
        .disabled =
            !myTurn ||
            state.pile.length === 0;

    document
        .getElementById(
            "slapBtn"
        )
        .disabled =
            !state.slapAvailable;

    if (myTurn) {

        showGameMessage(
            "ถึงตาคุณ!"
        );

    } else {

        const player =
            state.players.find(
                p =>
                    p.id ===
                    state.turnPlayerId
            );

        if (player) {

            showGameMessage(
                `รอ ${player.name} เล่น`
            );
        }
    }
}


// ========================================
// TIMER
// ========================================

socket.on(
    "game:timer",
    data => {

        clearInterval(
            timerInterval
        );

        let seconds =
            data.seconds;

        turnTimer.textContent =
            seconds;

        timerInterval =
            setInterval(
                () => {

                    seconds--;

                    if (
                        seconds < 0
                    ) {

                        clearInterval(
                            timerInterval
                        );

                        return;
                    }

                    turnTimer.textContent =
                        seconds;

                },
                1000
            );
    }
);


// ========================================
// EMOTE EVENT
// ========================================

socket.on(
    "game:emote",
    data => {

        showFloatingEmote(
            data.emoji
        );
    }
);


// ========================================
// GAME MESSAGE
// ========================================

socket.on(
    "game:message",
    message => {

        showGameMessage(
            message
        );

        showToast(
            message
        );
    }
);


// ========================================
// ERROR
// ========================================

socket.on(
    "game:error",
    message => {

        showToast(
            message
        );
    }
);


// ========================================
// RESULT
// ========================================

socket.on(
    "game:result",
    data => {

        document
            .getElementById(
                "winnerText"
            )
            .textContent =
                `${data.winnerName} ชนะ!`;

        document
            .getElementById(
                "resultModal"
            )
            .classList.add(
                "show"
            );
    }
);


// ========================================
// BACK ROOM
// ========================================

function backToRoom() {

    document
        .getElementById(
            "resultModal"
        )
        .classList.remove(
            "show"
        );

    showRoom();
}


// ========================================
// LEAVE
// ========================================

function leaveRoom() {

    socket.emit(
        "room:leave"
    );

    currentRoom = "";

    currentGame = null;

    selectedCards = [];

    gameScreen.classList.remove(
        "active"
    );

    roomScreen.classList.remove(
        "active"
    );

    lobby.classList.add(
        "active"
    );
}


// ========================================
// ROOM LEFT
// ========================================

socket.on(
    "room:left",
    () => {

        showToast(
            "ออกจากห้องแล้ว"
        );
    }
);


// ========================================
// COPY ROOM
// ========================================

async function copyRoomCode() {

    const code =
        currentRoom ||
        roomCode.value;

    if (!code) {
        return;
    }

    try {

        await navigator.clipboard.writeText(
            code
        );

        showToast(
            "คัดลอกรหัสห้องแล้ว"
        );

    } catch {

        showToast(
            `รหัสห้อง: ${code}`
        );
    }
}


// ========================================
// GAME MESSAGE
// ========================================

function showGameMessage(
    message
) {

    gameMessage.textContent =
        message;
}


// ========================================
// TOAST
// ========================================

let toastTimer = null;

function showToast(
    message
) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );
}


// ========================================
// FLOATING EMOTE
// ========================================

function showFloatingEmote(
    emoji
) {

    const element =
        document.createElement(
            "div"
        );

    element.className =
        "floating-emote";

    element.textContent =
        emoji;

    element.style.left =
        `${35 + Math.random() * 30}%`;

    element.style.top =
        `${35 + Math.random() * 25}%`;

    document.body.appendChild(
        element
    );

    setTimeout(
        () => {

            element.remove();

        },
        1300
    );
}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(
    text
) {

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ========================================
// ENTER KEY
// ========================================

playerName.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            createRoom();
        }
    }
);

roomCode.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            joinRoom();
        }
    }
);
// ============================================================
// D.M.I.T SLAP WAR
// CLIENT APP
// Online 1v1v1v1 + Solo BOT
// ============================================================

const socket = io(SERVER_URL, {
    transports: ["websocket", "polling"]
});

// ============================================================
// STATE
// ============================================================

let myId = null;
let myName = "";
let currentRoom = "";
let currentGame = null;
let selectedCards = [];

let timerInterval = null;
let soloTurnTimer = null;

let isSoloMode = false;
let soloState = null;

const TURN_TIME_LIMIT = 20;

// ============================================================
// DOM
// ============================================================

const lobby = document.getElementById("lobby");
const roomScreen = document.getElementById("roomScreen");
const gameScreen = document.getElementById("gameScreen");

const playerName = document.getElementById("playerName");
const roomCode = document.getElementById("roomCode");

const connectionStatus = document.getElementById("connectionStatus");

const currentRoomCode = document.getElementById("currentRoomCode");
const gameRoomCode = document.getElementById("gameRoomCode");

const playerList = document.getElementById("playerList");

const hand = document.getElementById("hand");
const pile = document.getElementById("pile");
const pileInfo = document.getElementById("pileInfo");

const gameMessage = document.getElementById("gameMessage");
const toast = document.getElementById("toast");
const turnTimer = document.getElementById("turnTimer");

const roomMessage = document.getElementById("roomMessage");


// ============================================================
// BUTTON EVENTS
// ============================================================

document.getElementById("createRoomBtn")
    ?.addEventListener("click", createRoom);

document.getElementById("copyRoomBtn")
    ?.addEventListener("click", copyRoomCode);

document.getElementById("readyBtn")
    ?.addEventListener("click", toggleReady);

document.getElementById("startGameBtn")
    ?.addEventListener("click", startGame);

document.getElementById("leaveRoomBtn")
    ?.addEventListener("click", leaveRoom);

document.getElementById("playBtn")
    ?.addEventListener("click", playSelected);

document.getElementById("passBtn")
    ?.addEventListener("click", passTurn);

document.getElementById("slapBtn")
    ?.addEventListener("click", slap);

document.getElementById("backRoomBtn")
    ?.addEventListener("click", backToRoom);


// ============================================================
// EMOTES
// ============================================================

document.querySelectorAll(".emotes button").forEach(button => {

    button.addEventListener("click", () => {

        const emoji = button.dataset.emoji;

        if (!emoji) return;

        if (isSoloMode) {
            showFloatingEmote(emoji);
        } else {
            socket.emit("game:emote", {
                emoji: emoji
            });
        }

    });

});


// ============================================================
// SOCKET CONNECTION
// ============================================================

socket.on("connect", () => {

    myId = socket.id;

    if (connectionStatus) {
        connectionStatus.textContent = "● เชื่อมต่อ Server แล้ว ✓";
        connectionStatus.style.color = "#31d17c";
    }

    showToast("เชื่อมต่อ Server สำเร็จ");

});


socket.on("disconnect", () => {

    if (isSoloMode) return;

    if (connectionStatus) {
        connectionStatus.textContent = "● หลุดจาก Server";
        connectionStatus.style.color = "#ff4168";
    }

    showToast("การเชื่อมต่อ Server หลุด");

});


// ============================================================
// PLAYER
// ============================================================

function getPlayerAvatar() {

    if (
        typeof selectedCharacter !== "undefined" &&
        selectedCharacter &&
        selectedCharacter.emoji
    ) {
        return selectedCharacter.emoji;
    }

    return "😎";
}


function getPlayerName() {

    if (!playerName) return "Player";

    const name = playerName.value.trim();

    if (!name) {

        showToast("กรุณาใส่ชื่อผู้เล่น");

        playerName.focus();

        return null;
    }

    return name.slice(0, 16);
}


// ============================================================
// CREATE ROOM
// ============================================================

function createRoom() {

    isSoloMode = false;

    const name = getPlayerName();

    if (!name) return;

    myName = name;

    socket.emit("room:create", {

        name: name,

        avatar: getPlayerAvatar()

    });

}


// ============================================================
// JOIN ROOM
// ============================================================

function joinRoom() {

    isSoloMode = false;

    const name = getPlayerName();

    if (!name) return;

    const code = roomCode.value
        .trim()
        .toUpperCase();

    if (code.length !== 5) {

        showToast("รหัสห้องต้องมี 5 ตัว");

        return;
    }

    myName = name;

    socket.emit("room:join", {

        name: name,

        code: code,

        avatar: getPlayerAvatar()

    });

}


// ============================================================
// ROOM CREATED
// ============================================================

socket.on("room:created", data => {

    if (isSoloMode) return;

    currentRoom = data.code;

    roomCode.value = data.code;

    showRoom();

    showToast(`สร้างห้อง ${data.code} แล้ว`);

});


// ============================================================
// ROOM JOINED
// ============================================================

socket.on("room:joined", data => {

    if (isSoloMode) return;

    currentRoom = data.code;

    roomCode.value = data.code;

    showRoom();

    showToast(`เข้าห้อง ${data.code} แล้ว`);

});


// ============================================================
// ROOM ERROR
// ============================================================

socket.on("room:error", message => {

    if (!isSoloMode) {
        showToast(message);
    }

});


// ============================================================
// ROOM UPDATE
// ============================================================

socket.on("room:update", room => {

    if (isSoloMode) return;

    currentRoom = room.code;

    renderRoom(room);

});


// ============================================================
// SHOW ROOM
// ============================================================

function showRoom() {

    lobby.classList.remove("active");
    gameScreen.classList.remove("active");

    roomScreen.classList.add("active");

    currentRoomCode.textContent = currentRoom;

    if (gameRoomCode) {
        gameRoomCode.textContent = currentRoom;
    }

    if (roomMessage) {
        roomMessage.textContent = "รอผู้เล่น 4 คน...";
    }

}


// ============================================================
// RENDER ROOM
// ============================================================

function renderRoom(room) {

    currentRoomCode.textContent = room.code;

    playerList.innerHTML = "";

    room.players.forEach((player, index) => {

        const div = document.createElement("div");

        div.className = "room-player";

        div.innerHTML = `

            <div class="room-avatar">
                ${player.avatar || "P" + (index + 1)}
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

        playerList.appendChild(div);

    });


    // Empty slots

    while (playerList.children.length < 4) {

        const div = document.createElement("div");

        div.className = "room-player";

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

        playerList.appendChild(div);

    }


    const allReady =
        room.players.length === 4 &&
        room.players.every(player => player.ready);


    const startButton =
        document.getElementById("startGameBtn");

    if (startButton) {

        startButton.disabled = !allReady;

        startButton.style.opacity =
            allReady ? "1" : ".5";

    }


    if (roomMessage) {

        if (room.players.length < 4) {

            roomMessage.textContent =
                `รอผู้เล่น... ${room.players.length}/4`;

        } else if (!allReady) {

            roomMessage.textContent =
                "ผู้เล่นครบแล้ว กรุณา READY";

        } else {

            roomMessage.textContent =
                "พร้อมเริ่มเกม!";

        }

    }

}


// ============================================================
// READY
// ============================================================

function toggleReady() {

    if (isSoloMode) return;

    socket.emit("room:ready");

}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    if (isSoloMode) return;

    socket.emit("game:start");

}


// ============================================================
// GAME START
// ============================================================

socket.on("game:started", data => {

    if (isSoloMode) return;

    showGame();

    if (data?.message) {
        showToast(data.message);
    }

});


// ============================================================
// SHOW GAME
// ============================================================

function showGame() {

    lobby.classList.remove("active");
    roomScreen.classList.remove("active");

    gameScreen.classList.add("active");

    if (gameRoomCode) {
        gameRoomCode.textContent =
            currentRoom || "-----";
    }

}


// ============================================================
// ONLINE GAME STATE
// ============================================================

socket.on("game:state", state => {

    if (isSoloMode) return;

    currentGame = state;

    selectedCards = [];

    showGame();

    renderPlayers(state);

    renderHand(state.hand || []);

    renderPile(state.pile || []);

    updateButtons(state);

    updateMyInfo(state);

});


// ============================================================
// SOLO GAME
// ============================================================

function startSingleplayer(name, avatar) {

    isSoloMode = true;

    myName = name;

    currentRoom = "BOT01";

    const suits = ["S", "C", "D", "H"];

    const suitSymbols = {

        S: "♠",
        C: "♣",
        D: "♦",
        H: "♥"

    };


    const ranks = [

        { val: 3, label: "3" },
        { val: 4, label: "4" },
        { val: 5, label: "5" },
        { val: 6, label: "6" },
        { val: 7, label: "7" },
        { val: 8, label: "8" },
        { val: 9, label: "9" },
        { val: 10, label: "10" },
        { val: 11, label: "J" },
        { val: 12, label: "Q" },
        { val: 13, label: "K" },
        { val: 14, label: "A" },
        { val: 15, label: "2" }

    ];


    let deck = [];

    let cardIdCounter = 1;


    suits.forEach(suit => {

        ranks.forEach(rank => {

            deck.push({

                id: "c_" + cardIdCounter++,

                val: rank.val,

                label: rank.label,

                suit: suit,

                suitSymbol: suitSymbols[suit]

            });

        });

    });


    deck.sort(() => Math.random() - 0.5);


    const players = [

        {
            id: "p_me",
            name: name,
            avatar: avatar,
            hand: deck.slice(0, 13),
            isBot: false
        },

        {
            id: "p_bot1",
            name: "Akarinn",
            avatar: "🤡",
            hand: deck.slice(13, 26),
            isBot: true
        },

        {
            id: "p_bot2",
            name: "Gotcha Boy",
            avatar: "🤖",
            hand: deck.slice(26, 39),
            isBot: true
        },

        {
            id: "p_bot3",
            name: "Milli",
            avatar: "🤓",
            hand: deck.slice(39, 52),
            isBot: true
        }

    ];


    players.forEach(player => {

        player.hand.sort((a, b) =>
            a.val - b.val
        );

    });


    soloState = {

        players: players,

        turnIndex: 0,

        pile: [],

        lastPlayerId: null,

        slapAvailable: true

    };


    showGame();

    updateSoloUI();

    runSoloTurn();

    showToast("เริ่มเกม D.M.I.T Slap War!");

}


// ============================================================
// SOLO UI
// ============================================================

function updateSoloUI() {

    if (!isSoloMode || !soloState) return;


    const currentPlayer =
        soloState.players[soloState.turnIndex];


    currentGame = {

        turnPlayerId: currentPlayer.id,

        pile: soloState.pile,

        slapAvailable: soloState.slapAvailable,

        players: soloState.players.map(player => ({

            id: player.id,

            name: player.name,

            avatar: player.avatar,

            cardCount: player.hand.length

        }))

    };


    const me =
        soloState.players.find(
            player => player.id === "p_me"
        );


    renderPlayers(currentGame);

    renderHand(me ? me.hand : []);

    renderPile(soloState.pile);

    updateButtons(currentGame);

    updateMyInfo(currentGame);

}


// ============================================================
// SOLO TURN TIMER
// ============================================================

function runSoloTurn() {

    if (!isSoloMode || !soloState) return;


    updateSoloUI();


    const currentPlayer =
        soloState.players[soloState.turnIndex];


    clearInterval(soloTurnTimer);


    let seconds = TURN_TIME_LIMIT;

    turnTimer.textContent = seconds;


    soloTurnTimer = setInterval(() => {

        seconds--;

        turnTimer.textContent =
            Math.max(seconds, 0);


        if (seconds <= 0) {

            clearInterval(soloTurnTimer);


            if (!currentPlayer.isBot) {

                showToast(
                    "หมดเวลา! PASS อัตโนมัติ"
                );

                passTurnSolo();

            }

        }

    }, 1000);


    if (currentPlayer.isBot) {

        showGameMessage(
            `รอ ${currentPlayer.name} กำลังคิด...`
        );


        setTimeout(() => {

            if (!isSoloMode || !soloState) return;

            executeBotAction(currentPlayer);

        }, 1200);

    }

}


// ============================================================
// BOT
// ============================================================

function executeBotAction(bot) {

    if (!soloState) return;

    if (
        soloState.players[soloState.turnIndex].id
        !== bot.id
    ) {
        return;
    }


    let validCards = [];


    if (soloState.pile.length === 0) {

        if (bot.hand.length > 0) {

            validCards = [bot.hand[0]];

        }

    } else {

        const topCard =
            soloState.pile[
                soloState.pile.length - 1
            ];


        const higherCards =
            bot.hand.filter(
                card => card.val > topCard.val
            );


        if (
            higherCards.length > 0 &&
            Math.random() > 0.3
        ) {

            validCards = [higherCards[0]];

        }

    }


    if (validCards.length > 0) {

        bot.hand =
            bot.hand.filter(
                card => !validCards.includes(card)
            );


        soloState.pile = validCards;

        soloState.lastPlayerId = bot.id;


        showGameMessage(
            `${bot.name} ลงไพ่ ${validCards[0].label}${validCards[0].suitSymbol}`
        );


        if (bot.hand.length === 0) {

            triggerSoloWin(bot);

            return;

        }

    } else {

        showGameMessage(
            `${bot.name} PASS!`
        );

    }


    nextSoloTurn();

}


// ============================================================
// NEXT SOLO TURN
// ============================================================

function nextSoloTurn() {

    clearInterval(soloTurnTimer);

    soloState.turnIndex =
        (soloState.turnIndex + 1)
        % soloState.players.length;


    runSoloTurn();

}


// ============================================================
// PLAYER PLAY SOLO
// ============================================================

function playSelectedSolo() {

    if (!soloState) return;


    const me =
        soloState.players.find(
            player => player.id === "p_me"
        );


    if (
        soloState.players[soloState.turnIndex].id
        !== me.id
    ) {

        showToast("ยังไม่ถึงตาของคุณ");

        return;

    }


    if (selectedCards.length === 0) {

        showToast("เลือกไพ่ก่อน");

        return;

    }


    const chosenCards =
        me.hand.filter(
            card => selectedCards.includes(card.id)
        );


    if (chosenCards.length === 0) return;


    // ตรวจสอบไพ่ใบแรก
    if (soloState.pile.length > 0) {

        const topCard =
            soloState.pile[
                soloState.pile.length - 1
            ];


        if (chosenCards[0].val <= topCard.val) {

            showToast(
                "ต้องใช้ไพ่ที่สูงกว่าตบ!"
            );

            return;

        }

    }


    me.hand =
        me.hand.filter(
            card => !selectedCards.includes(card.id)
        );


    soloState.pile = chosenCards;

    soloState.lastPlayerId = me.id;

    selectedCards = [];


    showGameMessage(
        "คุณลงไพ่สำเร็จ!"
    );


    if (me.hand.length === 0) {

        triggerSoloWin(me);

        return;

    }


    nextSoloTurn();

}


// ============================================================
// PASS SOLO
// ============================================================

function passTurnSolo() {

    if (!soloState) return;


    const me =
        soloState.players.find(
            player => player.id === "p_me"
        );


    if (
        soloState.players[soloState.turnIndex].id
        !== me.id
    ) {
        return;
    }


    if (soloState.pile.length === 0) {

        showToast(
            "คุณต้องเป็นคนเปิดกอง ห้าม PASS"
        );

        return;

    }


    selectedCards = [];

    showGameMessage(
        "คุณ PASS ตานี้"
    );


    nextSoloTurn();

}


// ============================================================
// SLAP
// ============================================================

function slapSolo() {

    if (!soloState) return;


    showToast(
        "SLAP! ล้างโต๊ะ!"
    );


    soloState.pile = [];

    soloState.slapAvailable = true;


    gameScreen.classList.add(
        "slap-effect"
    );


    setTimeout(() => {

        gameScreen.classList.remove(
            "slap-effect"
        );

    }, 600);


    updateSoloUI();

}


// ============================================================
// SOLO WIN
// ============================================================

function triggerSoloWin(winner) {

    clearInterval(soloTurnTimer);

    document.getElementById(
        "winnerText"
    ).textContent =
        `${winner.name} ชนะเลิศ! 🎉`;


    document.getElementById(
        "resultModal"
    ).classList.add("show");

}


// ============================================================
// RENDER PLAYERS
// ============================================================

function renderPlayers(state) {

    const players = state.players || [];


    const positions = [

        "playerTop",
        "playerRight",
        "playerLeft"

    ];


    const me =
        players.find(
            player =>
                player.id === myId ||
                player.id === "p_me"
        );


    const myElement =
        document.getElementById("myPlayerInfo");


    if (me) {

        const myNameElement =
            document.getElementById("myName");

        const myAvatarElement =
            document.getElementById("myAvatar");

        if (myNameElement) {
            myNameElement.textContent =
                me.name;
        }

        if (
            myAvatarElement &&
            me.avatar
        ) {
            myAvatarElement.textContent =
                me.avatar;
        }

    }


    const others =
        players.filter(
            player =>
                player.id !==
                (me ? me.id : myId)
        );


    positions.forEach((elementId, index) => {

        const element =
            document.getElementById(elementId);


        if (!element) return;


        const player = others[index];


        // ไม่มีผู้เล่น
        if (!player) {

            element.style.opacity = ".3";

            const name =
                element.querySelector(".anime-name");

            const count =
                element.querySelector(".card-count");

            if (name) {
                name.textContent =
                    "Waiting...";
            }

            if (count) {
                count.textContent =
                    "0 ใบ";
            }

            element.classList.remove(
                "active-turn"
            );

            return;

        }


        element.style.opacity = "1";


        const avatar =
            element.querySelector(".avatar");

        const name =
            element.querySelector(".anime-name");

        const count =
            element.querySelector(".card-count");


        if (avatar) {

            avatar.textContent =
                player.avatar ||
                "P" + (index + 1);

        }


        if (name) {

            name.textContent =
                player.name;

        }


        if (count) {

            count.textContent =
                `${player.cardCount} ใบ`;

        }


        element.classList.toggle(
            "active-turn",
            player.id === state.turnPlayerId
        );

    });

}


// ============================================================
// MY INFO
// ============================================================

function updateMyInfo(state) {

    const me =
        state.players?.find(
            player =>
                player.id === myId ||
                player.id === "p_me"
        );


    if (!me) return;


    const name =
        document.getElementById("myName");

    const count =
        document.getElementById("myCardCount");

    const avatar =
        document.getElementById("myAvatar");


    if (name) {
        name.textContent =
            me.name;
    }


    if (count) {
        count.textContent =
            `${me.cardCount} ใบ`;
    }


    if (avatar && me.avatar) {
        avatar.textContent =
            me.avatar;
    }

}


// ============================================================
// HAND
// ============================================================

function renderHand(cards) {

    hand.innerHTML = "";

    if (!cards) return;


    cards.forEach(card => {

        const element =
            createCard(card, true);


        element.addEventListener(
            "click",
            () =>
                toggleCard(
                    card.id,
                    element
                )
        );


        hand.appendChild(element);

    });

}


// ============================================================
// CREATE CARD
// ============================================================

function createCard(card, interactive = false) {

    const element =
        document.createElement("div");


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


// ============================================================
// SELECT CARD
// ============================================================

function toggleCard(cardId, element) {

    const index =
        selectedCards.indexOf(cardId);


    if (index >= 0) {

        selectedCards.splice(
            index,
            1
        );

        element.classList.remove(
            "selected"
        );

        return;

    }


    if (selectedCards.length >= 4) {

        showToast(
            "เลือกได้สูงสุด 4 ใบ"
        );

        return;

    }


    selectedCards.push(cardId);

    element.classList.add(
        "selected"
    );

}


// ============================================================
// PLAY
// ============================================================

function playSelected() {

    if (isSoloMode) {

        playSelectedSolo();

        return;

    }


    if (selectedCards.length === 0) {

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
            cards: selectedCards
        }
    );

}


// ============================================================
// SERVER PLAY EVENT
// ============================================================

socket.on("game:play", data => {

    if (!data) return;

    showGameMessage(
        `${data.playerName || "Player"} ลงไพ่`
    );

});


// ============================================================
// PASS
// ============================================================

function passTurn() {

    if (isSoloMode) {

        passTurnSolo();

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
        "game:pass"
    );

}


socket.on("game:pass", data => {

    showGameMessage(
        `${data.playerName} PASS`
    );

});


// ============================================================
// SLAP
// ============================================================

function slap() {

    if (isSoloMode) {

        slapSolo();

        return;

    }


    socket.emit(
        "game:slap"
    );

}


socket.on("game:slap", data => {

    showGameMessage(
        `${data.slapperName} SLAP!`
    );


    gameScreen.classList.add(
        "slap-effect"
    );


    setTimeout(() => {

        gameScreen.classList.remove(
            "slap-effect"
        );

    }, 600);


    showToast(
        `${data.slapperName} ตบสำเร็จ!`
    );

});


// ============================================================
// PILE
// ============================================================

function renderPile(cards) {

    pile.innerHTML = "";


    if (!cards || cards.length === 0) {

        pileInfo.textContent =
            "กองกลาง";

        return;

    }


    cards.forEach(card => {

        pile.appendChild(
            createCard(card, false)
        );

    });


    pileInfo.textContent =
        `${cards.length} ใบ`;

}


// ============================================================
// BUTTON STATE
// ============================================================

function updateButtons(state) {

    if (!state) return;


    const myTurn =
        state.turnPlayerId === myId ||
        state.turnPlayerId === "p_me";


    const playBtn =
        document.getElementById("playBtn");

    const passBtn =
        document.getElementById("passBtn");

    const slapBtn =
        document.getElementById("slapBtn");


    if (playBtn) {

        playBtn.disabled =
            !myTurn;

        playBtn.style.opacity =
            myTurn ? "1" : ".45";

    }


    if (passBtn) {

        passBtn.disabled =
            !myTurn ||
            !state.pile ||
            state.pile.length === 0;

        passBtn.style.opacity =
            passBtn.disabled ? ".45" : "1";

    }


    if (slapBtn) {

        slapBtn.disabled =
            !state.slapAvailable;

        slapBtn.style.opacity =
            slapBtn.disabled ? ".45" : "1";

    }


    if (myTurn) {

        showGameMessage(
            "ถึงตาคุณแล้ว!"
        );

    } else {

        const player =
            state.players?.find(
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


// ============================================================
// TIMER FROM SERVER
// ============================================================

socket.on("game:timer", data => {

    if (isSoloMode) return;


    clearInterval(timerInterval);


    let seconds =
        Number(data.seconds) || 0;


    turnTimer.textContent =
        seconds;


    timerInterval =
        setInterval(() => {

            seconds--;

            turnTimer.textContent =
                Math.max(seconds, 0);


            if (seconds <= 0) {

                clearInterval(
                    timerInterval
                );

            }

        }, 1000);

});


// ============================================================
// EMOTE FROM SERVER
// ============================================================

socket.on("game:emote", data => {

    if (!data) return;

    showFloatingEmote(
        data.emoji
    );

});


// ============================================================
// GAME MESSAGE
// ============================================================

socket.on("game:message", message => {

    showGameMessage(message);

    showToast(message);

});


socket.on("game:error", message => {

    showToast(message);

});


// ============================================================
// GAME RESULT
// ============================================================

socket.on("game:result", data => {

    if (isSoloMode) return;


    document.getElementById(
        "winnerText"
    ).textContent =
        `${data.winnerName} ชนะ!`;


    document.getElementById(
        "resultModal"
    ).classList.add("show");

});


// ============================================================
// BACK TO ROOM
// ============================================================

function backToRoom() {

    document.getElementById(
        "resultModal"
    ).classList.remove("show");


    if (isSoloMode) {

        leaveRoom();

    } else {

        showRoom();

    }

}


// ============================================================
// LEAVE ROOM
// ============================================================

function leaveRoom() {

    if (!isSoloMode) {

        socket.emit(
            "room:leave"
        );

    }


    isSoloMode = false;

    clearInterval(
        soloTurnTimer
    );

    clearInterval(
        timerInterval
    );


    currentRoom = "";

    currentGame = null;

    soloState = null;

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


socket.on("room:left", () => {

    showToast(
        "ออกจากห้องแล้ว"
    );

});


// ============================================================
// COPY ROOM
// ============================================================

async function copyRoomCode() {

    const code =
        currentRoom ||
        roomCode.value;


    if (!code) return;


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


// ============================================================
// GAME MESSAGE
// ============================================================

function showGameMessage(message) {

    if (gameMessage) {

        gameMessage.textContent =
            message;

    }

}


// ============================================================
// TOAST
// ============================================================

let toastTimer = null;


function showToast(message) {

    if (!toast) return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);

}


// ============================================================
// FLOATING EMOTE
// ============================================================

function showFloatingEmote(emoji) {

    if (!emoji) return;


    const element =
        document.createElement("div");


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


    setTimeout(() => {

        element.remove();

    }, 1300);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(text) {

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


// ============================================================
// SORT CARDS
// ============================================================

function sortHandCards() {

    if (!isSoloMode || !soloState) {

        showToast(
            "ระบบเรียงไพ่จะเพิ่มในเกมออนไลน์"
        );

        return;

    }


    const me =
        soloState.players.find(
            player =>
                player.id === "p_me"
        );


    if (!me) return;


    me.hand.sort(
        (a, b) =>
            a.val - b.val
    );


    selectedCards = [];

    renderHand(
        me.hand
    );


    showToast(
        "เรียงไพ่ในมือแล้ว"
    );

}


// ============================================================
// PLAYER NAME
// ============================================================

playerName?.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            createRoom();

        }

    }
);


// ============================================================
// ROOM CODE
// ============================================================

roomCode?.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            joinRoom();

        }

    }
);


// ============================================================
// EXPORT FOR HTML
// ============================================================

// ทำให้ HTML ที่ใช้ onclick เรียกได้
window.startSingleplayer =
    startSingleplayer;

window.createRoom =
    createRoom;

window.joinRoom =
    joinRoom;

window.sortHandCards =
    sortHandCards;
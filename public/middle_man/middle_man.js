import { auth, ensureSignedIn, getGame, saveGameState, watchGame } from "../js/firebase.js";
import { GameState } from "../actual_game/js/gameState.js";

const params = new URLSearchParams(location.search);
const gameCode = params.get("game_code");
const heading = document.querySelector(".container_1_h");
const codeLabel = document.querySelector(".container_2_h");
const playerList = document.querySelector(".strump");
const startButton = document.querySelector(".startGameBtn");
const leaveButton = document.querySelector(".leaveBtn");
let latestRoom = null;

if (!gameCode) {
  heading.textContent = "No game code was provided.";
  startButton.hidden = true;
} else {
  codeLabel.textContent = `Game Code: ${gameCode}`;
  await ensureSignedIn();
  watchGame(gameCode, onRoomChanged);
}

function onRoomChanged(room) {
  latestRoom = room;
  if (!room) {
    heading.textContent = "This game no longer exists.";
    startButton.hidden = true;
    return;
  }
  if (room.game_running && room.state) {
    location.replace(`/actual_game/game.html?game_code=${encodeURIComponent(gameCode)}`);
    return;
  }

  const players = Array.isArray(room.players) ? room.players.filter(Boolean) : [];
  const minimumMet = players.length >= 2;
  const isOwner = room.owner?.uid === auth.currentUser?.uid;
  heading.textContent = minimumMet
    ? "Players are ready. Waiting for the host to start the game."
    : "Waiting for at least one more player to join…";
  playerList.replaceChildren(...players.map((player) => playerRow(player.name || "Player")));
  startButton.hidden = !isOwner;
  startButton.disabled = !minimumMet;
  startButton.textContent = minimumMet ? "START GAME!" : `WAITING (${players.length}/2)`;
}

function playerRow(name) {
  const row = document.createElement("div");
  row.className = "spoof";
  const label = document.createElement("span");
  label.className = "player-name";
  label.textContent = `Player: ${name}`;
  row.append(label);
  return row;
}

startButton.addEventListener("click", async () => {
  const room = await getGame(gameCode);
  const players = Array.isArray(room?.players) ? room.players.filter(Boolean) : [];
  if (!room || room.owner?.uid !== auth.currentUser?.uid || players.length < 2) return;
  const names = players.map((player) => player.name || "Player");
  const state = new GameState(names.length, names).snapshot();
  state.players.forEach((player, index) => { player.uid = players[index].uid; });
  startButton.disabled = true;
  startButton.textContent = "STARTING…";
  await saveGameState(gameCode, state);
});

leaveButton.addEventListener("click", async () => {
  const room = await getGame(gameCode);
  if (room && !room.game_running) {
    const players = (room.players || []).filter((player) => player?.uid !== auth.currentUser?.uid);
    const owner = players[0] || null;
    const { database } = await import("../js/firebase.js");
    const { ref, update } = await import("https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js");
    await update(ref(database, `games/${gameCode}`), { players, owner });
  }
  location.assign("/sign_in_page/sign_in.html");
});

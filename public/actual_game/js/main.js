import { GameState, emit } from "./gameState.js";
import { UIController } from "./ui.js";
import * as Cards from "./cards.js";
import * as Config from "./config.js";
import { auth, ensureSignedIn, getGame, saveGameState, watchGame } from "../../js/firebase.js";

window.NationsCards = Cards;
const gameCode = new URLSearchParams(location.search).get("game_code");
const message = document.getElementById("mapHint");
let game, ui, suppressSave = false, unsubscribe;

if (!gameCode) {
  message.textContent = "No game code was provided.";
} else {
  await ensureSignedIn();
  const room = await getGame(gameCode);
  if (!room) {
    message.textContent = "This game code does not exist.";
  } else if (!room.state) {
    location.replace(`/middle_man/middle_man.html?game_code=${encodeURIComponent(gameCode)}`);
  } else {
    start(room.state, room.players || []);
    unsubscribe = watchGame(gameCode, (nextRoom) => {
      if (nextRoom?.state) start(nextRoom.state, nextRoom.players || []);
    });
  }
}

function start(state, playerRecords) {
  const players = playerRecords.filter(Boolean);
  const names = players.map((player) => typeof player === "string" ? player : player.name);
  if (!game) {
    game = new GameState(names.length, names);
    game.applyState(state);
    ui = new UIController(game);
    connectionalive();
  } else {
    suppressSave = true;
    game.applyState(state);
    suppressSave = false;
  }
  game.players.forEach((player, index) => { player.uid ||= players[index]?.uid; });
  game.localUid = auth.currentUser?.uid;
  ui.render();
}

function connectionalive() {
  const events = ["playerDidSpin", "playerDidBuild", "playerDidAttack", "playerDidDraft", "playerDidEndTurn", "turnDidChange", "gameDidEnd", "gameDidReset"];
  events.forEach((event) => document.addEventListener(event, async () => {
    if (!suppressSave && game) await saveGameState(gameCode, game.snapshot());
  }));
}

window.Nations = {
  get game() { return game; }, get ui() { return ui; }, config: Config, cards: Cards, emit,
  getGameState: () => game?.snapshot()
};
window.addEventListener("beforeunload", () => unsubscribe?.());

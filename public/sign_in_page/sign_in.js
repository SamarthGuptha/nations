import { createGame, joinGame } from "../js/firebase.js";

const error = document.getElementById("error");
const gop = (code) => location.assign(`/actual_game/game.html?game_code=${encodeURIComponent(code)}`);

document.getElementById("create").onclick = async () => {
  try {
    const playerName = document.getElementById("createName").value.trim();
    if (!playerName) alert("NAMEEEEEEE BRO");
    const code = await createGame(playerName, Number(6));
    window.location.href = '../middle_man/middle_man.html?game_code=' + encodeURIComponent(code) + '&name=' + playerName;
  } catch (e) { alert("GONE WRONG, ");  error.textContent = e.message; }
};
document.getElementById("join").onclick = async () => {
  try { 
    const playerName = document.getElementById("joinName").value.trim(), code = document.getElementById("gameCode").value.trim();
        await joinGame(code, playerName);     
        window.location.href = '../middle_man/middle_man.html?game_code=' + encodeURIComponent(code) + '&name=' + playerName;

  } catch (e) { error.textContent = e.message; }
};


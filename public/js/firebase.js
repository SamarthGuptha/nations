import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, get, onValue, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh88CQZqyMwOdxV3AfFjUAetAUh_i66LY",
  authDomain: "nations-58f78.firebaseapp.com",
  databaseURL: "https://nations-58f78-default-rtdb.firebaseio.com",
  projectId: "nations-58f78",
  storageBucket: "nations-58f78.firebasestorage.app",
  messagingSenderId: "721143536543",
  appId: "1:721143536543:web:57b24b41d459bb29e9fbaa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const gameRef = (code) => ref(database, `games/${code}`);
export const getGame = async (code) => (await get(ref(database, `games/${code}`))).val();
export const watchGame = (code, callback) => onValue(ref(database, `games/${code}`), (snapshot) => callback(snapshot.val()));
export const ensureSignedIn = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      if (error.code === "auth/operation-not-allowed") {
        throw new Error("Firebase Anonymous Authentication is not enabled.");
      }
      throw error;
    }
  }
  return auth.currentUser;
};

export async function createGame(ownerName, playerCount) {
  const user = await ensureSignedIn();
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (await get(gameRef(code)).then((s) => s.exists()));
  const owner = { name: ownerName, uid: user.uid };
  await update(ref(database), {
    [`games/${code}`]: {
      owner,
      game_running: false,
      maxPlayers: Math.max(2, Math.min(6, Number(playerCount) || 6)),
      players: [owner],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  });
  return code;
}

export async function joinGame(code, playerName) {
  const user = await ensureSignedIn();
  const existingGame = await getGame(code);
  if (!existingGame) throw new Error("TYPING ERRROR");
  if (existingGame.game_running) throw new Error("U joined too late");
  const players = Array.isArray(existingGame.players) ? existingGame.players.filter(Boolean) : [];
  if (players.some((player) => player.uid === user.uid)) return existingGame;
  if (players.length >= (existingGame.maxPlayers || 6)) throw new Error("This game is already fulll.");

  const updatedPlayers = [...players, { name: playerName, uid: user.uid }];
  await update(ref(database, `games/${code}`), { players: updatedPlayers, updatedAt: serverTimestamp() });
  return { ...existingGame, players: updatedPlayers };
}

export async function saveGameState(code, state) {
  await update(ref(database, `games/${code}`), { state, game_running: true, updatedAt: serverTimestamp() });
}

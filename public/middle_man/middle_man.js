import { getDatabase, ref, onValue, update, push, set } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, updateEmail, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh88CQZqyMwOdxV3AfFjUAetAUh_i66LY",
  authDomain: "nations-58f78.firebaseapp.com",
  databaseURL: "https://nations-58f78-default-rtdb.firebaseio.com",
  projectId: "nations-58f78",
  storageBucket: "nations-58f78.firebasestorage.app",
  messagingSenderId: "721143536543",
  appId: "1:721143536543:web:57b24b41d459bb29e9fbaa",
  measurementId: "G-L7P40BGYHG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app); 

// Selectors
const container_1_h = document.querySelector(".container_1_h");
const container_2_h = document.querySelector(".container_2_h");
const strump = document.querySelector(".strump");
const leaveBtn = document.querySelector(".leaveBtn");

// URL Params
const urlParams = new URLSearchParams(window.location.search);
const game_code = urlParams.get('game_code');
const name = urlParams.get('name');

// Set headers safely using textContent
container_1_h.textContent = `Welcome, ${name.slice(0, -3)}, to Nations \n\n ! Waiting for other players to join... \n\n`;
container_2_h.textContent = `Game Code: ${game_code}`; 

const reff = ref(rtdb, `games/${game_code}`);

// UX UPGRADE: Real-time listener for players so it updates instantly
onValue(reff, (snapshot) => {
    if (snapshot.exists()) {
        const gameData = snapshot.val();
        
        // Clear the container first so we don't duplicate the list every time it updates
        strump.innerHTML = ''; 
        
        if (gameData.players) {
            gameData.players.forEach(player => {
                // Dynamically build the row with the player name AND the red delete button
                strump.innerHTML += `
                    <div class="spoof">
                        <span class="player-name">Player: ${player.name.slice(0, -3)}</span>
                        <button class="deleteBtn">X</button>
                    </div>
                `;
            });
        }
    }
});

// Leave Button Redirect
leaveBtn.addEventListener("click", () => {
    window.location.href = "../sign_in_page/sign_in.html";
});
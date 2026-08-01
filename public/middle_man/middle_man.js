import { getDatabase, ref, get , update, push, set} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
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
const container_1 = document.querySelectorAll(".container_1");
setTimeout(() => {
container_1[0].style.marginTop = "13vw";
}, 500);
const container_1_h = document.querySelector(".container_1_h");
const urlParams = new URLSearchParams(window.location.search);
const game_code = urlParams.get('game_code');
const name = urlParams.get('name');
const container_2_h = document.querySelector(".container_2_h");
container_1_h.innerHTML = "Welcome " + name.slice(0, -3) + " to Nations \n" +  "\n ! Waiting for other players to join... \n" +  "\n" 
container_2_h.innerHTML =   "Game Code: " + game_code; 


const strump = document.querySelector(".strump");

// container_h_3.innerHTML =   "Game Code: " + game_code; 


const reff = ref(rtdb, `games/${game_code}`);
let snapshot = await get(reff);
if (snapshot.exists()) {

    for (let i = 0; i < snapshot.val().players.length; i++) {
        const player = snapshot.val().players[i];
        strump.innerHTML += `<h1 class="spoof">` + "Player: " +  player.name.slice(0, -3) + `</h1>`;
    }
}

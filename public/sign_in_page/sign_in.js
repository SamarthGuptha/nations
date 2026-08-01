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
const create_game = document.querySelector(".thing_rom");
const name_2 = document.querySelector(".name_2");
const join_game = document.querySelector(".join_game");
const name = document.querySelector(".name");
const game_code = document.querySelector(".game_code");
setTimeout(() => {
container_1[0].style.marginTop = "13vw";
}, 500);
create_game.addEventListener("click", async () => {
    let rep = false;
    let thingp;

while (!rep) {
    thingp = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit code (1000-9999)
    
    const reff = ref(rtdb, `games/${thingp}`);
    const snapshot = await get(reff);
    if (!snapshot.exists()) {
      rep = true;
      console.log("WORKED")
    }
  }
 const reaper = Math.floor(Math.random() * 1000)
 await set(ref(rtdb, 'games/' + thingp), {
    players: [{name: name_2.value + reaper , potatoes: 0, bronze: 1000, silver: 0, potato_factory: 1, silver_factory: 0, bronze_factory: 0, uranium: 0, uranium_factory: 0,}],
    game_running: false,    
    owner: name_2.value + reaper,
 })


container_1[0].style.marginLeft = "-100vw";
const thurl = "../middle_man/middle_man.html?game_code=" + thingp + "&name=" + name_2.value + reaper;
    window.location.href = thurl;
}
);



join_game.addEventListener("click", async () => {
const reff = ref(rtdb, `games/${game_code.value}`);
const snapshot = await get(reff);
 const reaper = Math.floor(Math.random() * 1000)


if (snapshot.exists()) {
    if (!(snapshot.val().players.length  < 6)){
        console.log(snapshot.val().players.length)
        alert("More than 6 players are not allowed in a game");
    }else if (snapshot.val().game_running == true){ 
        alert("Game is already running, :(((")
    }
    else{
        update(ref(rtdb, 'games/' + game_code.value), {
            players: [...snapshot.val().players, {name: name.value + reaper, potatoes: 0, bronze: 1000, silver: 0, potato_factory: 1, silver_factory: 0, bronze_factory: 0, uranium: 0, uranium_factory: 0,}],

        });
    container_1[0].style.marginLeft = "-100vw";
    const thurl =  "../middle_man/middle_man.html?game_code=" + game_code.value + "&name=" + name.value + reaper ;
    window.location.href = thurl  
    }
}else {
    alert("WRONG GAME CODE!")
}
})










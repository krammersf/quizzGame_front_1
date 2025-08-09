import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkhUnWFDUio5ebqfxal2TR-fI5wFmgBqc",
  authDomain: "quizzgamefb.firebaseapp.com",
  databaseURL: "https://quizzgamefb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quizzgamefb",
  storageBucket: "quizzgamefb.firebasestorage.app",
  messagingSenderId: "282180005873",
  appId: "1:282180005873:web:e941f64e2660a60cf99e50",
  measurementId: "G-RQZQXT0EYP"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const gameId = sessionStorage.getItem("gameId");

if (!gameId) {
  alert("ID do jogo não encontrado!");
  window.location.href = "index.html";
}

const playersRef = ref(db, `games/${gameId}/players`);

onValue(playersRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    const playersArray = Object.keys(data).map(name => ({
      name,
      score: data[name].score || 0
    }));

    playersArray.sort((a, b) => b.score - a.score);

    const tbody = document.querySelector("#scoreTable tbody");
    tbody.innerHTML = "";

    playersArray.forEach((player, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${player.score}</td>
      `;
      tbody.appendChild(tr);
    });
  }
});
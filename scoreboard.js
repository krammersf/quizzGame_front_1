import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

// Mostrar loading inicial
if (window.scoreboardUI) {
  window.scoreboardUI.showLoading();
}

const gameId = sessionStorage.getItem("gameId");
console.log("GameId recuperado do sessionStorage:", gameId);

if (!gameId) {
  console.error("ID do jogo não encontrado no sessionStorage!");
  alert("ID do jogo não encontrado!");
  window.location.href = "index.html";
} else {
  console.log("GameId válido, continuando...");
}

const playersRef = ref(db, `games/${gameId}/players`);
console.log("Tentando carregar jogadores do path:", `games/${gameId}/players`);

onValue(playersRef, (snapshot) => {
  console.log("Firebase onValue chamado");
  console.log("Snapshot exists:", snapshot.exists());
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    console.log("Dados dos jogadores:", data);
    
    const playersArray = Object.keys(data).map(name => ({
      name,
      score: data[name].score || 0
    }));

    console.log("Array de jogadores:", playersArray);
    playersArray.sort((a, b) => b.score - a.score);
    console.log("Array ordenado:", playersArray);

    // Mostrar tabela se houver dados
    if (window.scoreboardUI) {
      window.scoreboardUI.showScoreTable();
    }

    const tbody = document.querySelector("#scoreTable tbody");
    console.log("Tbody encontrado:", tbody);
    
    if (tbody) {
      tbody.innerHTML = "";

      playersArray.forEach((player, index) => {
        const tr = document.createElement("tr");
        
        // Aplicar classes especiais para as primeiras posições
        if (index === 0) tr.classList.add('position-1');
        else if (index === 1) tr.classList.add('position-2');
        else if (index === 2) tr.classList.add('position-3');
        
        // Adicionar emojis para as primeiras posições
        let positionText = index + 1;
        if (index === 0) positionText = "🥇 1º";
        else if (index === 1) positionText = "🥈 2º";
        else if (index === 2) positionText = "🥉 3º";
        else positionText = `${index + 1}º`;
        
        tr.innerHTML = `
          <td>${positionText}</td>
          <td>${player.name}</td>
          <td>${player.score}</td>
        `;
        tbody.appendChild(tr);
      });
      
      console.log(`Tabela preenchida com ${playersArray.length} jogadores`);
    } else {
      console.error("Elemento tbody não encontrado!");
    }
  } else {
    console.log("Nenhum dado encontrado no Firebase");
    // Mostrar estado vazio se não houver dados
    if (window.scoreboardUI) {
      window.scoreboardUI.showEmptyState();
    }
  }
});
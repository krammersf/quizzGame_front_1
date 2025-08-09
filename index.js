import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

document.getElementById("startGameBtn").addEventListener("click", () => {
  console.log("Botão Criar Jogo clicado");

  const playerName = document.getElementById("playerName").value.trim();
  const totalPlayers = parseInt(document.getElementById("totalPlayers").value);
  const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
  const pointsCorrect = parseInt(document.getElementById("pointsCorrect").value);
  const pointsWrong = parseInt(document.getElementById("pointsWrong").value);

  if (!playerName) {
    alert("Por favor insere o teu nome!");
    return;
  }

  if (isNaN(totalPlayers) || totalPlayers < 1) {
    alert("O número de jogadores deve ser pelo menos 1.");
    return;
  }

  if (isNaN(maxQuestions) || maxQuestions < 1) {
    alert("O número máximo de perguntas deve ser pelo menos 1.");
    return;
  }

  if (isNaN(pointsCorrect)) {
    alert("Por favor insere os pontos por resposta certa.");
    return;
  }

  if (isNaN(pointsWrong)) {
    alert("Por favor insere os pontos por resposta errada.");
    return;
  }

  let players = {};
  players[playerName] = { score: 0 };
  for (let i = 2; i <= totalPlayers; i++) {
    players[`Jogador_${i}`] = { score: 0 };
  }

  const gameRef = push(ref(db, "games"));
  const gameId = gameRef.key;

  set(gameRef, {
    config: {
      totalPlayers,
      maxQuestions,
      pointsCorrect,
      pointsWrong
    },
    players
  })
    .then(() => {
      console.log("Jogo criado com ID:", gameId);

      sessionStorage.setItem("gameId", gameId);
      sessionStorage.setItem("playerName", playerName);

      const link = `${window.location.origin}/quiz.html?gameId=${gameId}`;
      document.getElementById("shareLink").style.display = "block";
      const gameLinkInput = document.getElementById("gameLink");
      gameLinkInput.value = link;

      // Remove redirecionamento automático (opcional)
      // setTimeout(() => {
      //   window.location.href = `quiz.html?gameId=${gameId}`;
      // }, 3000);
    })
    .catch((error) => {
      console.error("Erro ao criar o jogo:", error);
      alert("Erro ao criar o jogo. Verifique a consola para mais detalhes.");
    });
});

// Botão copiar
document.getElementById("copyBtn").addEventListener("click", () => {
  const gameLinkInput = document.getElementById("gameLink");
  gameLinkInput.select();
  gameLinkInput.setSelectionRange(0, 99999); // Para dispositivos móveis

  try {
    const sucesso = document.execCommand("copy");
    if (sucesso) {
      const copyMsg = document.getElementById("copyMsg");
      copyMsg.style.display = "inline";
      setTimeout(() => (copyMsg.style.display = "none"), 2000);
    } else {
      alert("Não foi possível copiar o link.");
    }
  } catch (err) {
    alert("Erro ao tentar copiar o link.");
  }

  // Deselecionar texto
  window.getSelection().removeAllRanges();
});
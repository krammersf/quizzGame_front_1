import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {

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

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("gameId");

  let playerName = sessionStorage.getItem("playerName");

  let gameConfig = null;
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let timer;
  let timeLeft = 10;
  let answered = false; // controla se o jogador já respondeu à pergunta atual

  const enterNameBox = document.getElementById("enterNameBox");
  const waitingBox = document.getElementById("waitingBox");
  const playerNameDisplay = document.getElementById("playerNameDisplay");

  if (!gameId) {
    alert("Link inválido: falta o gameId");
    window.location.href = "index.html";
  }

  // Mostrar input para nome se não existir playerName na sessão
  if (!playerName) {
    enterNameBox.style.display = "block";
    waitingBox.style.display = "none";
  } else {
    enterNameBox.style.display = "none";
    waitingBox.style.display = "block";
    playerNameDisplay.textContent = `Jogador: ${playerName}`;
    registerPlayerAndWait();
  }

  document.getElementById("enterGameBtn").addEventListener("click", () => {
    const inputName = document.getElementById("playerNameInput").value.trim();
    if (!inputName) {
      alert("Por favor, insere um nome válido!");
      return;
    }
    playerName = inputName;
    sessionStorage.setItem("playerName", playerName);

    enterNameBox.style.display = "none";
    waitingBox.style.display = "block";
    playerNameDisplay.textContent = `Jogador: ${playerName}`;

    registerPlayerAndWait();
  });

  document.getElementById("testRankingBtn")?.addEventListener("click", showFinalRanking);

  function registerPlayerAndWait() {
    const playerRef = ref(db, `games/${gameId}/players/${playerName}`);
    update(playerRef, { score: 0 });

    waitForGameStart();
  }

  function waitForGameStart() {
    const gameRef = ref(db, `games/${gameId}`);

    onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      gameConfig = data.config;
      const players = data.players || {};
      const totalPlayers = gameConfig?.totalPlayers || 0;
      const connectedPlayers = Object.keys(players).length;

      playerNameDisplay.textContent = `Jogador: ${playerName} (${connectedPlayers}/${totalPlayers} jogadores)`;

      if (data.gameStarted) {
        waitingBox.style.display = "none";
        startGame();
      } else {
        waitingBox.style.display = "block";
      }
    });
  }

  async function loadQuestions() {
    const files = ["cards/card_1.json"];
    let allQuestions = [];

    for (let file of files) {
      const res = await fetch(file);
      const data = await res.json();
      allQuestions = allQuestions.concat(data.perguntas);
    }

    allQuestions.sort(() => Math.random() - 0.5);
    questions = allQuestions.slice(0, gameConfig.maxQuestions);
  }

  function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
      alert("Fim do jogo!");
      showFinalRanking();
      return;
    }

    const q = questions[currentQuestionIndex];
    document.getElementById("questionBox").style.display = "block";

    if (q.imagem) {
      document.getElementById("questionImage").src = q.imagem;
      document.getElementById("questionImage").style.display = "block";
    } else {
      document.getElementById("questionImage").style.display = "none";
    }

    document.getElementById("questionText").textContent = q.pergunta;

    const answersBox = document.getElementById("answersBox");

    // Antes de limpar, desativa os botões para evitar cliques extras durante transição
    Array.from(answersBox.children).forEach(btn => btn.disabled = true);

    answersBox.innerHTML = "";

    q.hipoteses_resposta.forEach(option => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.onclick = () => checkAnswer(option, q.resposta);
      btn.disabled = false;  // ativa botões para nova pergunta
      btn.style.backgroundColor = ""; // limpa cor de fundo
      answersBox.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    timeLeft = 10;
    answered = false;
    document.getElementById("timerDisplay").textContent = `Tempo: ${timeLeft}s`;

    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      document.getElementById("timerDisplay").textContent = `Tempo: ${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(timer);
        nextQuestion();  // Só avança aqui
      }
    }, 1000);
  }

  function checkAnswer(selected, correct) {
    if (answered) return;  // Já respondeu? Ignora
    answered = true;

    // Calcula pontuação
    if (Array.isArray(correct)) {
      if (correct.includes(selected)) {
        score += gameConfig.pointsCorrect;
      } else {
        score += gameConfig.pointsWrong;
      }
    } else {
      if (selected === correct) {
        score += gameConfig.pointsCorrect;
      } else {
        score += gameConfig.pointsWrong;
      }
    }

    document.getElementById("scoreDisplay").textContent = `Pontuação: ${score}`;
    update(ref(db, `games/${gameId}/players/${playerName}`), { score });

    // Desativa todos os botões para impedir mais cliques
    const answersBox = document.getElementById("answersBox");
    Array.from(answersBox.children).forEach(btn => btn.disabled = true);

    // Mostra feedback visual da resposta selecionada
    Array.from(answersBox.children).forEach(btn => {
      if (btn.textContent === selected) {
        if (selected === correct || (Array.isArray(correct) && correct.includes(selected))) {
          btn.style.backgroundColor = "#4CAF50"; // Verde para correto
        } else {
          btn.style.backgroundColor = "#f44336"; // Vermelho para incorreto
        }
      }
      if (btn.textContent === correct || (Array.isArray(correct) && correct.includes(btn.textContent))) {
        btn.style.backgroundColor = "#4CAF50"; // Verde para a resposta correta
      }
    });

    // O timer continua a correr até chegar a 0, só então avança para a próxima pergunta
  }

  function nextQuestion() {
    currentQuestionIndex++;
    showQuestion();
  }

  function showFinalRanking() {
    // Esconder quiz
    document.getElementById("quizSection")?.style.setProperty("display", "none");

    // Mostrar tabela
    const scoreSection = document.getElementById("scoreSection");
    if (scoreSection) scoreSection.style.display = "block";

    const playersRef = ref(db, `games/${gameId}/players`);

    onValue(playersRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      const playersArray = Object.keys(data).map(name => ({
        name,
        score: data[name].score || 0
      }));

      playersArray.sort((a, b) => b.score - a.score);

      const tbody = document.querySelector("#scoreTable tbody");
      if (!tbody) return;
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
    });
  }

  async function startGame() {
    await loadQuestions();
    showQuestion();
  }

});
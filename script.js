// ===================
// CONFIGURAÇÃO FIREBASE
// ===================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ⚠️ SUBSTITUI PELOS TEUS DADOS FIREBASE
const firebaseConfig = {
	apiKey: "A_TUA_API_KEY",
	authDomain: "O_TEUDO.firebaseapp.com",
	databaseURL: "https://O_TEUDO.firebaseio.com",
	projectId: "O_TEUDO",
	storageBucket: "O_TEUDO.appspot.com",
	messagingSenderId: "ID_REMETENTE",
	appId: "APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===================
// ELEMENTOS HTML
// ===================
const playerNameInput = document.getElementById("playerName");
const maxQuestionsInput = document.getElementById("maxQuestions");
const pointsWinInput = document.getElementById("pointsWin");
const pointsLoseInput = document.getElementById("pointsLose");
const startBtn = document.getElementById("startBtn");

// ===================
// EVENTO BOTÃO ENTRAR
// ===================
startBtn.addEventListener("click", async () => {
	const playerName = playerNameInput.value.trim();
	if (!playerName) {
		alert("Por favor, escreve o teu nome!");
		return;
	}

	// ID da sala (fixo para todos ou gerado pelo jogador 1)
	let gameId = localStorage.getItem("gameId");
	if (!gameId) {
		// Se não existe sala, jogador 1 cria
		gameId = "game_" + Date.now();
		localStorage.setItem("gameId", gameId);

		// Guardar configurações iniciais
		await set(ref(db, `games/${gameId}/config`), {
			maxQuestions: parseInt(maxQuestionsInput.value),
			pointsWin: parseInt(pointsWinInput.value),
			pointsLose: parseInt(pointsLoseInput.value),
			status: "waiting" // waiting | in_progress | finished
		});
	}

	// Adicionar jogador à sala
	await set(ref(db, `games/${gameId}/players/${playerName}`), {
		name: playerName,
		score: 0
	});

	// Guardar info no sessionStorage para usar no quiz.html
	sessionStorage.setItem("playerName", playerName);
	sessionStorage.setItem("gameId", gameId);

	// Redirecionar para quiz.html
	window.location.href = "quiz.html";
});
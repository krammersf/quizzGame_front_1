import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, get, onValue, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ⚠️ Coloca as tuas credenciais Firebase
const firebaseConfig = {
	apiKey: "A_TUA_API_KEY",
	authDomain: "O_TEUDO.firebaseapp.com",
	databaseURL: "https://O_TEUDO.firebaseio.com",
	projectId: "O_TEUDO",
	storageBucket: "O_TEUDO.appspot.com",
	messagingSenderId: "ID_REMETENTE",
	appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Ler gameId e playerName ---
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId") || sessionStorage.getItem("gameId");
const playerName = sessionStorage.getItem("playerName");

document.getElementById("playerNameDisplay").textContent = `Jogador: ${playerName}`;

let gameConfig = {};
let score = 0;
let currentQuestionIndex = 0;
let timer;
let questions = [];

// --- Espera até todos os jogadores entrarem ---
async function waitForPlayers() {
	const gameRef = ref(db, `games/${gameId}`);

	onValue(gameRef, (snapshot) => {
		const data = snapshot.val();
		if (!data) return;

		gameConfig = data.config;
		const players = data.players;
		const totalPlayers = gameConfig.totalPlayers;
		const connectedPlayers = Object.keys(players).length;

		// Jogador entra oficialmente no jogo se não existir
		if (!players[playerName]) {
			update(ref(db, `games/${gameId}/players/${playerName}`), { score: 0 });
		}

		if (connectedPlayers >= totalPlayers) {
			document.getElementById("waitingBox").style.display = "none";
			startGame();
		}
	});
}

// --- Carregar perguntas ---
async function loadQuestions() {
	// Aqui podes carregar múltiplos ficheiros card_X.json
	const files = ["cards/card_1.json", "cards/card_2.json"];
	let allQuestions = [];

	for (let file of files) {
		const res = await fetch(file);
		const data = await res.json();
		allQuestions = allQuestions.concat(data.perguntas);
	}

	// Misturar aleatoriamente
	allQuestions.sort(() => Math.random() - 0.5);

	// Limitar ao máximo definido
	questions = allQuestions.slice(0, gameConfig.maxQuestions);
}

// --- Mostrar pergunta ---
function showQuestion() {
	if (currentQuestionIndex >= questions.length) {
		alert("Fim do jogo!");
		window.location.href = `scoreboard.html?gameId=${gameId}`;
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
	answersBox.innerHTML = "";
	q.hipoteses_resposta.forEach(option => {
		const btn = document.createElement("button");
		btn.textContent = option;
		btn.onclick = () => checkAnswer(option, q.resposta);
		answersBox.appendChild(btn);
	});

	startTimer();
}

// --- Temporizador ---
function startTimer() {
	let timeLeft = 10;
	document.getElementById("timerDisplay").textContent = `Tempo: ${timeLeft}s`;

	clearInterval(timer);
	timer = setInterval(() => {
		timeLeft--;
		document.getElementById("timerDisplay").textContent = `Tempo: ${timeLeft}s`;

		if (timeLeft <= 0) {
			clearInterval(timer);
			nextQuestion();
		}
	}, 1000);
}

// --- Verificar resposta ---
function checkAnswer(selected, correct) {
	clearInterval(timer);

	if (Array.isArray(correct)) {
		// Caso de múltiplas respostas
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

	setTimeout(nextQuestion, 500);
}

// --- Próxima pergunta ---
function nextQuestion() {
	currentQuestionIndex++;
	showQuestion();
}

// --- Início ---
async function startGame() {
	await loadQuestions();
	showQuestion();
}

waitForPlayers();
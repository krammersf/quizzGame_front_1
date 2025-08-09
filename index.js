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
	const playerName = document.getElementById("playerName").value.trim();
	const totalPlayers = parseInt(document.getElementById("totalPlayers").value);
	const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
	const pointsCorrect = parseInt(document.getElementById("pointsCorrect").value);
	const pointsWrong = parseInt(document.getElementById("pointsWrong").value);

	if (!playerName) {
		alert("Por favor insere o teu nome!");
		return;
	}

	if (totalPlayers < 1) {
		alert("O número de jogadores deve ser pelo menos 1.");
		return;
	}

	// Criar estrutura de jogadores
	let players = {};
	players[playerName] = { score: 0 }; // Jogador 1

	// Adiciona espaços reservados para os outros jogadores
	for (let i = 2; i <= totalPlayers; i++) {
		players[`Jogador_${i}`] = { score: 0 };
	}

	// Criar novo jogo no Firebase
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
	}).then(() => {
		// Guardar dados na sessão
		sessionStorage.setItem("gameId", gameId);
		sessionStorage.setItem("playerName", playerName);

		// Mostrar link para partilhar
		const link = `${window.location.origin}/quiz.html?gameId=${gameId}`;
		document.getElementById("shareLink").style.display = "block";
		document.getElementById("gameLink").value = link;

		// Redirecionar jogador 1 para quiz.html
		setTimeout(() => {
			window.location.href = `quiz.html?gameId=${gameId}`;
		}, 3000);
	});
});
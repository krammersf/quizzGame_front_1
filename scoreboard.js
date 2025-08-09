import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ⚠️ Substituir pelo teu config Firebase
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

// Ler gameId da sessão
const gameId = sessionStorage.getItem("gameId");

if (!gameId) {
	alert("ID do jogo não encontrado!");
	window.location.href = "index.html";
}

// Atualizar tabela em tempo real
const playersRef = ref(db, `games/${gameId}/players`);

onValue(playersRef, snapshot => {
	if (snapshot.exists()) {
		const data = snapshot.val();
		let playersArray = Object.keys(data).map(name => ({
			name,
			score: data[name].score || 0
		}));

		// Ordenar por pontuação (descendente)
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
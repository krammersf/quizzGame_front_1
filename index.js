import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, push, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

window.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById("startGameBtn");
  const beginGameBtn = document.getElementById("beginGameBtn");

  let createdGameId = null;
  let creatorName = null;

  startGameBtn.addEventListener("click", () => {
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

    const gameRef = push(ref(db, "games"));
    createdGameId = gameRef.key;
    creatorName = playerName;

    set(gameRef, {
      config: {
        totalPlayers,
        maxQuestions,
        pointsCorrect,
        pointsWrong
      },
      players,
      gameStarted: false
    }).then(() => {
      sessionStorage.setItem("gameId", createdGameId);
      sessionStorage.setItem("playerName", creatorName);

      document.getElementById("shareLink").style.display = "block";
      document.getElementById("gameLink").value = `${window.location.origin}/quizzGame_front_1/quiz.html?gameId=${createdGameId}`;

      // Mostrar botão iniciar só para criador
      beginGameBtn.style.display = "inline-block";
    }).catch((error) => {
      console.error("Erro ao criar o jogo:", error);
      alert("Erro ao criar o jogo. Veja a consola.");
    });
  });

  beginGameBtn.addEventListener("click", async () => {
    if (!createdGameId) {
      alert("Cria um jogo antes de iniciar!");
      return;
    }
    
    try {
      // Gerar as perguntas para o jogo
      console.log("Host gerando perguntas para o jogo...");
      const questions = await generateQuestionsForGame();
      
      // Atualizar o Firebase com as perguntas, gameStarted e estado inicial
      await update(ref(db, `games/${createdGameId}`), { 
        gameStarted: true,
        questions: questions,
        gameState: {
          currentQuestionIndex: 0,
          timeLeft: 10,
          questionStartTime: Date.now(),
          totalQuestions: questions.length
        }
      });
      
      alert("Jogo iniciado!");
      
      // Iniciar controlador do jogo (apenas para o host)
      startGameController();
    } catch (error) {
      console.error("Erro ao iniciar o jogo:", error);
      alert("Erro ao iniciar o jogo.");
    }
  });

  // Função para gerar perguntas (similar ao quiz.js)
  async function generateQuestionsForGame() {
    const files = ["cards/card_1.json"];
    let allQuestions = [];

    for (let file of files) {
      try {
        const res = await fetch(file);
        const data = await res.json();
        allQuestions = allQuestions.concat(data.perguntas);
      } catch (error) {
        console.warn(`Erro ao carregar ${file}:`, error);
      }
    }

    // Baralhar e selecionar o número correto de perguntas
    allQuestions.sort(() => Math.random() - 0.5);
    const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
    return allQuestions.slice(0, maxQuestions);
  }

  // Função para controlar o jogo (apenas para o host)
  function startGameController() {
    if (!createdGameId) return;
    
    let currentQuestion = 0;
    const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
    
    console.log(`Host: Iniciando controlador do jogo com ${maxQuestions} perguntas`);
    
    function nextQuestion() {
      if (currentQuestion >= maxQuestions) {
        // Fim do jogo
        console.log("Host: Jogo terminado");
        update(ref(db, `games/${createdGameId}/gameState`), {
          gameEnded: true,
          currentQuestionIndex: currentQuestion
        });
        return;
      }
      
      const questionStartTime = Date.now();
      
      // Avançar para próxima pergunta
      update(ref(db, `games/${createdGameId}/gameState`), {
        currentQuestionIndex: currentQuestion,
        timeLeft: 10,
        questionStartTime: questionStartTime
      });
      
      console.log(`Host: Pergunta ${currentQuestion + 1}/${maxQuestions} iniciada às ${new Date(questionStartTime).toLocaleTimeString()}`);
      
      // Timer de 10 segundos para próxima pergunta
      setTimeout(() => {
        currentQuestion++;
        nextQuestion();
      }, 10000);
    }
    
    // Iniciar primeira pergunta após um pequeno delay para todos se conectarem
    setTimeout(() => {
      console.log("Host: Iniciando primeira pergunta...");
      nextQuestion();
    }, 3000); // Aumentar para 3 segundos
  }

  const openPlayer1Btn = document.getElementById("openPlayer1Btn");

	openPlayer1Btn.addEventListener("click", () => {
	if (!createdGameId) {
		alert("Cria um jogo primeiro!");
		return;
	}
	// Abre nova aba com o link do quiz para jogador 1 (já com nome guardado)
	const url = `${window.location.origin}/quizzGame_front_1/quiz.html?gameId=${createdGameId}`;
	
	// Guardar o playerName na sessão da nova aba pode ser feito usando URL ou localStorage no quiz.js
	// Aqui vamos usar URL com parâmetro playerName para facilitar:
	const playerName = creatorName;
	const fullUrl = `${url}&playerName=${encodeURIComponent(playerName)}`;

	window.open(fullUrl, '_blank');
	});

  document.getElementById("copyBtn").addEventListener("click", () => {
    const gameLinkInput = document.getElementById("gameLink");
    gameLinkInput.select();
    gameLinkInput.setSelectionRange(0, 99999);
    document.execCommand("copy");
    const copyMsg = document.getElementById("copyMsg");
    copyMsg.style.display = "inline";
    setTimeout(() => (copyMsg.style.display = "none"), 2000);
    window.getSelection().removeAllRanges();
  });
});
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
  let gameStarted = false; // controla se o jogo já foi iniciado para evitar reiniciar
  let listeningForGameStart = false; // controla se já está a ouvir mudanças do Firebase
  let listeningForGameState = false; // controla se já está a ouvir o estado do jogo
  let timerInterval = null; // controla o interval do timer para evitar múltiplos
  let playerAnswer = null; // guarda a resposta do jogador para mostrar depois

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
  
  document.getElementById("backToGameBtn")?.addEventListener("click", () => {
    // Voltar ao menu inicial
    document.getElementById("scoreSection").style.display = "none";
    document.getElementById("gameEndBox").style.display = "none";
    document.getElementById("waitingBox").style.display = "block";
  });

  function registerPlayerAndWait() {
    console.log("registerPlayerAndWait() chamado");
    const playerRef = ref(db, `games/${gameId}/players/${playerName}`);
    update(playerRef, { score: 0 });

    if (!listeningForGameStart) {
      console.log("Começando a ouvir mudanças do Firebase pela primeira vez");
      listeningForGameStart = true;
      waitForGameStart();
    } else {
      console.log("Já está a ouvir mudanças do Firebase, ignorando");
    }
  }

  function waitForGameStart() {
    console.log("waitForGameStart() chamado");
    const gameRef = ref(db, `games/${gameId}`);

    onValue(gameRef, (snapshot) => {
      console.log("onValue Firebase chamado - gameStarted flag:", gameStarted);
      const data = snapshot.val();
      if (!data) return;

      gameConfig = data.config;
      const players = data.players || {};
      const totalPlayers = gameConfig?.totalPlayers || 0;
      const connectedPlayers = Object.keys(players).length;

      playerNameDisplay.textContent = `Jogador: ${playerName} (${connectedPlayers}/${totalPlayers} jogadores)`;

      console.log("data.gameStarted:", data.gameStarted, "gameStarted flag:", gameStarted);
      if (data.gameStarted && !gameStarted) {
        waitingBox.style.display = "none";
        gameStarted = true; // marca que o jogo já foi iniciado
        console.log("Iniciando jogo pela primeira vez");
        startGame();
      } else if (data.gameStarted && gameStarted) {
        console.log("Jogo já estava iniciado, ignorando nova chamada do Firebase");
        waitingBox.style.display = "none";
      } else {
        waitingBox.style.display = "block";
      }
    });
  }

  // Funções para mostrar/esconder tela de contador regressivo
  function showCountdownScreen(countdownTime) {
    // Esconder outras telas
    waitingBox.style.display = "none";
    document.getElementById("questionBox").style.display = "none";
    
    // Criar ou atualizar tela de countdown
    let countdownScreen = document.getElementById("countdownScreen");
    if (!countdownScreen) {
      countdownScreen = document.createElement("div");
      countdownScreen.id = "countdownScreen";
      countdownScreen.style.cssText = `
        text-align: center;
        margin-top: 50px;
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      `;
      
      countdownScreen.innerHTML = `
        <h2 style="margin-bottom: 20px; font-size: 24px;">🎮 O jogo vai começar!</h2>
        <div id="countdownNumber" style="font-size: 72px; font-weight: bold; margin: 30px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${countdownTime}</div>
        <p style="font-size: 18px; margin-top: 20px;">Prepara-te para a primeira pergunta...</p>
      `;
      
      document.querySelector(".container").appendChild(countdownScreen);
    } else {
      // Atualizar apenas o número
      document.getElementById("countdownNumber").textContent = countdownTime;
      countdownScreen.style.display = "block";
    }
  }
  
  function hideCountdownScreen() {
    const countdownScreen = document.getElementById("countdownScreen");
    if (countdownScreen) {
      countdownScreen.style.display = "none";
    }
  }

  // Nova função para sincronizar com o estado do jogo
  function listenToGameState() {
    if (listeningForGameState) return;
    listeningForGameState = true;
    
    const gameStateRef = ref(db, `games/${gameId}/gameState`);
    
    onValue(gameStateRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const gameState = snapshot.val();
      console.log("Estado do jogo atualizado:", gameState);
      
      // Verificar se está em contador regressivo
      if (gameState.countdown && gameState.countdownTime > 0) {
        console.log(`⏰ Contador regressivo: ${gameState.countdownTime}`);
        showCountdownScreen(gameState.countdownTime);
        return;
      }
      
      // Se saiu do countdown, esconder tela de countdown
      if (!gameState.countdown && document.getElementById("countdownScreen")) {
        hideCountdownScreen();
      }
      
      // Verificar se o jogo terminou
      if (gameState.gameEnded) {
        console.log("Jogo terminou - mostrando tela de fim");
        showGameEndScreen();
        return;
      }
      
      // Verificar se está a mostrar resultados
      if (gameState.showingResults) {
        console.log("Fase de resultados ativada");
        if (playerAnswer) {
          showAnswerResults();
        } else {
          console.log("Jogador não respondeu, mostrando resposta correta...");
          showCorrectAnswerOnly();
        }
        return;
      }
      
      // Sincronizar pergunta atual (nova pergunta) - MAS SÓ SE NÃO ESTIVER EM COUNTDOWN
      if (!gameState.countdown && (gameState.currentQuestionIndex !== currentQuestionIndex || !gameState.showingResults)) {
        currentQuestionIndex = gameState.currentQuestionIndex;
        playerAnswer = null; // Reset da resposta para nova pergunta
        console.log(`Jogador: Nova pergunta ${currentQuestionIndex + 1}/${questions.length}`);
        
        // Limpar timer anterior
        if (timerInterval) {
          clearTimeout(timerInterval);
          timerInterval = null;
        }
        
        if (currentQuestionIndex < questions.length) {
          showQuestion();
        } else {
          console.log("Todas as perguntas foram respondidas");
          showFinalRanking();
          return;
        }
      }
      
      // SEMPRE atualizar timer - mesmo se a pergunta não mudou - MAS SÓ SE NÃO ESTIVER EM COUNTDOWN
      if (!gameState.countdown && gameState.questionStartTime && !gameState.gameEnded) {
        console.log("Jogador: Atualizando timer sincronizado para pergunta", currentQuestionIndex + 1);
        updateTimerDisplay(gameState.questionStartTime);
      }
    });
  }

  // Função para atualizar o display do timer baseado no tempo do servidor
  function updateTimerDisplay(questionStartTime) {
    // Limpar timer anterior se existir
    if (timerInterval) {
      clearTimeout(timerInterval);
      timerInterval = null;
    }
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      timeLeft = Math.max(0, 10 - elapsed);
      document.getElementById("timerDisplay").textContent = `Tempo: ${timeLeft}s`;
      
      console.log(`Timer atualizado: ${timeLeft}s (elapsed: ${elapsed}s)`);
      
      if (timeLeft > 0) {
        timerInterval = setTimeout(updateTimer, 200); // Atualizar a cada 200ms
      } else {
        timerInterval = null;
        console.log("Timer chegou a 0");
      }
    };
    
    // Iniciar imediatamente
    updateTimer();
  }

  // Função para mostrar os resultados da resposta
  function showAnswerResults() {
    if (!playerAnswer) {
      console.log("Nenhuma resposta para mostrar resultados");
      return;
    }
    
    console.log("=== MOSTRANDO RESULTADOS ===");
    console.log("Resposta do jogador:", playerAnswer.selected);
    console.log("Resposta correta:", playerAnswer.correct);
    console.log("Está correto:", playerAnswer.isCorrect);
    
    const answersBox = document.getElementById("answersBox");
    Array.from(answersBox.children).forEach(btn => {
      // Limpar estilos de seleção anterior
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.border = "";
      
      // Mostrar resultado da resposta do jogador
      if (btn.textContent === playerAnswer.selected) {
        if (playerAnswer.isCorrect) {
          btn.style.backgroundColor = "#4CAF50"; // Verde para correto
          btn.style.color = "white";
          btn.style.border = "3px solid #2E7D32";
          console.log("✅ Resposta do jogador CORRETA:", playerAnswer.selected);
        } else {
          btn.style.backgroundColor = "#f44336"; // Vermelho para incorreto
          btn.style.color = "white";
          btn.style.border = "3px solid #c62828";
          console.log("❌ Resposta do jogador INCORRETA:", playerAnswer.selected);
        }
      }
      
      // Sempre destacar a resposta correta (se for diferente da selecionada)
      const correct = playerAnswer.correct;
      if ((btn.textContent === correct || (Array.isArray(correct) && correct.includes(btn.textContent))) 
          && btn.textContent !== playerAnswer.selected) {
        btn.style.backgroundColor = "#4CAF50"; // Verde para a resposta correta
        btn.style.color = "white";
        btn.style.border = "3px solid #2E7D32";
        btn.style.boxShadow = "0 0 10px #4CAF50"; // Brilho extra
        console.log("✅ Resposta correta destacada:", btn.textContent);
      }
    });
    
    // Mostrar feedback no timer
    const resultText = playerAnswer.isCorrect ? "✅ CORRETO!" : "❌ INCORRETO!";
    document.getElementById("timerDisplay").textContent = resultText;
    document.getElementById("timerDisplay").style.fontSize = "18px";
    document.getElementById("timerDisplay").style.fontWeight = "bold";
    document.getElementById("timerDisplay").style.color = playerAnswer.isCorrect ? "#4CAF50" : "#f44336";
    
    console.log("=== FIM DOS RESULTADOS ===");
  }

  // Nova função para mostrar apenas a resposta correta quando o jogador não respondeu
  function showCorrectAnswerOnly() {
    console.log("=== MOSTRANDO APENAS RESPOSTA CORRETA ===");
    
    if (!questions[currentQuestionIndex]) {
      console.log("Pergunta atual não encontrada");
      return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.resposta;
    
    console.log("Resposta correta:", correctAnswer);
    
    // Guardar registo de que o jogador não respondeu
    const roundData = {
      questionIndex: currentQuestionIndex,
      questionText: currentQuestion.pergunta,
      selectedAnswer: null, // Nenhuma resposta selecionada
      correctAnswer: correctAnswer,
      isCorrect: false,
      pointsEarned: gameConfig.pointsWrong, // Pontos por não responder
      timestamp: Date.now(),
      timeExpired: true // Flag para indicar que o tempo expirou
    };
    
    // Atualizar pontuação por não responder
    score += gameConfig.pointsWrong;
    
    // Nova estrutura: Guardar na pergunta com todas as respostas dos jogadores
    const questionData = {
      question: currentQuestion.pergunta,
      options: currentQuestion.hipoteses_resposta,
      correctAnswer: correctAnswer,
      questionIndex: currentQuestionIndex
    };
    
    // Dados da resposta do jogador (tempo esgotado)
    const playerAnswerData = {
      answer: null,
      points: gameConfig.pointsWrong,
      isCorrect: false,
      timestamp: Date.now(),
      timeExpired: true
    };
    
    // Atualizar ambas as estruturas no Firebase
    const updates = {};
    updates[`games/${gameId}/players/${playerName}/score`] = score;
    updates[`games/${gameId}/players/${playerName}/rounds/${currentQuestionIndex}`] = roundData;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/question`] = questionData.question;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/options`] = questionData.options;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/correctAnswer`] = questionData.correctAnswer;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/questionIndex`] = questionData.questionIndex;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/playerAnswers/${playerName}`] = playerAnswerData;
    
    update(ref(db), updates)
      .then(() => console.log("Registo de tempo esgotado e resultado da pergunta guardados no Firebase"))
      .catch(err => console.error("Erro ao guardar registo:", err));
    
    const answersBox = document.getElementById("answersBox");
    Array.from(answersBox.children).forEach(btn => {
      // Limpar estilos anteriores
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.border = "";
      btn.style.boxShadow = "";
      
      // Destacar apenas a resposta correta em verde
      if (btn.textContent === correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.includes(btn.textContent))) {
        btn.style.backgroundColor = "#4CAF50"; // Verde para a resposta correta
        btn.style.color = "white";
        btn.style.border = "3px solid #2E7D32";
        btn.style.boxShadow = "0 0 10px #4CAF50"; // Brilho extra
        console.log("✅ Resposta correta destacada:", btn.textContent);
      }
    });
    
    // Mostrar feedback no timer
    document.getElementById("timerDisplay").textContent = "⏰ Tempo esgotado!";
    document.getElementById("timerDisplay").style.fontSize = "18px";
    document.getElementById("timerDisplay").style.fontWeight = "bold";
    document.getElementById("timerDisplay").style.color = "#FF9800"; // Laranja para tempo esgotado
    
    console.log("=== FIM - RESPOSTA CORRETA DESTACADA ===");
  }

  async function loadQuestions() {
    console.log("loadQuestions chamado - carregando do Firebase");
    
    // Carregar perguntas do Firebase (geradas pelo host)
    const gameQuestionsRef = ref(db, `games/${gameId}/questions`);
    
    try {
      const snapshot = await new Promise((resolve, reject) => {
        onValue(gameQuestionsRef, (snap) => {
          resolve(snap);
        }, { once: true });
      });
      
      if (snapshot.exists()) {
        questions = snapshot.val();
        console.log("Perguntas carregadas do Firebase:", questions.length);
        return;
      } else {
        throw new Error("Perguntas não encontradas no Firebase");
      }
    } catch (error) {
      console.error("Erro ao carregar perguntas do Firebase:", error);
      alert("Erro ao carregar perguntas do jogo. O host pode não ter iniciado o jogo corretamente.");
    }
  }

  function showQuestion() {
    console.log("showQuestion chamada - currentQuestionIndex:", currentQuestionIndex, "total questions:", questions.length);
    
    if (currentQuestionIndex >= questions.length) {
      console.log("Fim do jogo - todas as perguntas respondidas");
      alert("Fim do jogo!");
      showFinalRanking();
      return;
    }

    const q = questions[currentQuestionIndex];
    console.log("Mostrando pergunta:", q.pergunta);
    
    // Atualizar contador de perguntas
    const questionNumber = currentQuestionIndex + 1;
    const totalQuestions = questions.length;
    document.getElementById("questionCounter").textContent = `Pergunta ${questionNumber} / ${totalQuestions}`;
    
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
      
      // Limpar TODOS os estilos possíveis
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.border = "";
      btn.style.boxShadow = "";
      btn.style.fontSize = "";
      btn.style.fontWeight = "";
      
      answersBox.appendChild(btn);
    });

    // Limpar também o timer display
    document.getElementById("timerDisplay").style.fontSize = "";
    document.getElementById("timerDisplay").style.fontWeight = "";
    document.getElementById("timerDisplay").style.color = "";

    console.log("Botões criados e limpos - nova pergunta iniciada");
    // Reset da resposta para nova pergunta
    playerAnswer = null;
    console.log("playerAnswer resetado para nova pergunta");
    // startTimer() removido - timer é sincronizado via Firebase
  }

  function startTimer() {
    // Timer agora é controlado pelo Firebase
    // Esta função apenas atualiza o display local baseado no estado sincronizado
    console.log("Timer local desativado - usando sincronização Firebase");
  }

  function checkAnswer(selected, correct) {
    console.log("checkAnswer chamada - selected:", selected, "correct:", correct);
    
    // Verificar se já respondeu a esta pergunta
    if (playerAnswer !== null) {
      console.log("Jogador já respondeu a esta pergunta, ignorando clique");
      return;
    }
    
    // Guardar resposta para mostrar resultado depois (SEM calcular se está certa ainda)
    playerAnswer = {
      selected: selected,
      correct: correct
    };
    
    console.log("Resposta guardada para análise posterior:", playerAnswer);
    
    // Calcula pontuação mas não mostra resultado visual ainda
    let isCorrect = false;
    if (Array.isArray(correct)) {
      if (correct.includes(selected)) {
        score += gameConfig.pointsCorrect;
        isCorrect = true;
        console.log("Resposta correta (array) - pontos adicionados:", gameConfig.pointsCorrect);
      } else {
        score += gameConfig.pointsWrong;
        console.log("Resposta incorreta (array) - pontos adicionados:", gameConfig.pointsWrong);
      }
    } else {
      if (selected === correct) {
        score += gameConfig.pointsCorrect;
        isCorrect = true;
        console.log("Resposta correta - pontos adicionados:", gameConfig.pointsCorrect);
      } else {
        score += gameConfig.pointsWrong;
        console.log("Resposta incorreta - pontos adicionados:", gameConfig.pointsWrong);
      }
    }
    
    // Adicionar informação se está correta ao objeto playerAnswer
    playerAnswer.isCorrect = isCorrect;

    console.log("Score atual:", score);
    
    // Calcular pontos ganhos nesta ronda
    const pointsThisRound = isCorrect ? gameConfig.pointsCorrect : gameConfig.pointsWrong;
    
    // Guardar resposta detalhada desta ronda na base de dados (estrutura antiga - mantida para compatibilidade)
    const roundData = {
      questionIndex: currentQuestionIndex,
      questionText: questions[currentQuestionIndex].pergunta,
      selectedAnswer: selected,
      correctAnswer: correct,
      isCorrect: isCorrect,
      pointsEarned: pointsThisRound,
      timestamp: Date.now()
    };
    
    // Nova estrutura: Guardar na pergunta com todas as respostas dos jogadores
    const questionResultRef = ref(db, `games/${gameId}/questionResults/${currentQuestionIndex}`);
    const currentQuestion = questions[currentQuestionIndex];
    
    // Primeiro, garantir que a pergunta existe na estrutura
    const questionData = {
      question: currentQuestion.pergunta,
      options: currentQuestion.hipoteses_resposta,
      correctAnswer: currentQuestion.resposta,
      questionIndex: currentQuestionIndex
    };
    
    // Dados da resposta do jogador
    const playerAnswerData = {
      answer: selected,
      points: pointsThisRound,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };
    
    // Atualizar ambas as estruturas no Firebase
    const updates = {};
    updates[`games/${gameId}/players/${playerName}/score`] = score;
    updates[`games/${gameId}/players/${playerName}/rounds/${currentQuestionIndex}`] = roundData;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/question`] = questionData.question;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/options`] = questionData.options;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/correctAnswer`] = questionData.correctAnswer;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/questionIndex`] = questionData.questionIndex;
    updates[`games/${gameId}/questionResults/${currentQuestionIndex}/playerAnswers/${playerName}`] = playerAnswerData;
    
    update(ref(db), updates)
      .then(() => console.log("Score, resposta da ronda e resultado da pergunta atualizados no Firebase"))
      .catch(err => console.error("Erro ao atualizar dados no Firebase:", err));

    // APENAS desativar botões e marcar seleção (SEM cores de resultado)
    const answersBox = document.getElementById("answersBox");
    Array.from(answersBox.children).forEach(btn => {
      btn.disabled = true; // Desativar todos os botões
      
      if (btn.textContent === selected) {
        // Apenas marcar como selecionado (cinzento neutro)
        btn.style.backgroundColor = "#E0E0E0"; // Cinzento claro
        btn.style.color = "#424242"; // Texto cinzento escuro
        btn.style.border = "2px solid #9E9E9E"; // Borda cinzenta
        console.log("Botão marcado como selecionado (aguardando resultado)");
      }
    });
    
    console.log("Resposta registada - aguardando período de resultados");
  }

  // Função para mostrar a tela de fim de jogo
  function showGameEndScreen() {
    console.log("Mostrando tela de fim de jogo");
    
    // Esconder todas as outras seções
    document.getElementById("waitingBox").style.display = "none";
    document.getElementById("questionBox").style.display = "none";
    document.getElementById("scoreSection").style.display = "none";
    
    // Mostrar tela de fim
    document.getElementById("gameEndBox").style.display = "block";
    document.getElementById("finalScoreDisplay").textContent = `Pontuação Final: ${score}`;
    
    // Adicionar event listener ao botão Ver Classificação aqui
    const showRankingButton = document.getElementById("showRankingBtn");
    console.log("Botão showRankingBtn encontrado na tela final:", showRankingButton);
    
    if (showRankingButton) {
      // Remover event listeners antigos para evitar duplicação
      showRankingButton.replaceWith(showRankingButton.cloneNode(true));
      const newButton = document.getElementById("showRankingBtn");
      
      newButton.addEventListener("click", () => {
        console.log("Botão Ver Classificação clicado na tela final");
        console.log("GameId atual:", gameId);
        
        // Garantir que gameId está no sessionStorage
        if (gameId) {
          sessionStorage.setItem("gameId", gameId);
          console.log("GameId guardado no sessionStorage:", gameId);
          console.log("Redirecionando para scoreboard.html");
          window.location.href = "scoreboard.html";
        } else {
          console.error("GameId não encontrado!");
          alert("Erro: ID do jogo não encontrado!");
        }
      });
      console.log("Event listener adicionado ao botão Ver Classificação");
    } else {
      console.error("Botão showRankingBtn não encontrado na tela final!");
    }
    
    console.log(`Jogo terminado! Pontuação final: ${score}`);
  }

  function nextQuestion() {
    // Esta função não é mais necessária localmente
    // O avanço de perguntas é controlado pelo host via Firebase
    console.log("nextQuestion chamada - mas controlado pelo Firebase agora");
  }

  function showFinalRanking() {
    console.log("Mostrando classificação final");
    
    // Esconder tela de fim
    document.getElementById("gameEndBox").style.display = "none";
    document.getElementById("waitingBox").style.display = "none";
    document.getElementById("questionBox").style.display = "none";

    // Mostrar tabela de classificação
    const scoreSection = document.getElementById("scoreSection");
    if (scoreSection) scoreSection.style.display = "block";

    const playersRef = ref(db, `games/${gameId}/players`);

    onValue(playersRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("Nenhum jogador encontrado");
        return;
      }

      const data = snapshot.val();
      const playersArray = Object.keys(data).map(name => ({
        name,
        score: data[name].score || 0
      }));

      // Ordenar por pontuação (maior primeiro)
      playersArray.sort((a, b) => b.score - a.score);

      const tbody = document.querySelector("#scoreTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      playersArray.forEach((player, index) => {
        const tr = document.createElement("tr");
        
        // Destacar o jogador atual
        if (player.name === playerName) {
          tr.style.backgroundColor = "#e3f2fd";
          tr.style.fontWeight = "bold";
        }
        
        // Adicionar emojis para as primeiras posições
        let positionText = index + 1;
        if (index === 0) positionText = "🥇 1º";
        else if (index === 1) positionText = "🥈 2º";
        else if (index === 2) positionText = "🥉 3º";
        else positionText = `${index + 1}º`;
        
        tr.innerHTML = `
          <td style="text-align: center; padding: 8px;">${positionText}</td>
          <td style="padding: 8px;">${player.name}</td>
          <td style="text-align: center; padding: 8px;">${player.score}</td>
        `;
        tbody.appendChild(tr);
      });
      
      console.log(`Classificação carregada com ${playersArray.length} jogadores`);
    });
  }

  async function startGame() {
    console.log("startGame() chamado - gameStarted flag:", gameStarted);
    await loadQuestions();
    listenToGameState(); // Começar a ouvir mudanças no estado do jogo
    
    // Iniciar controlo automático se for o primeiro jogador (backup do host)
    initializeGameController();
    
    // NÃO mostrar pergunta aqui - aguardar que o estado do jogo indique quando mostrar
    console.log("🎮 Aguardando estado do jogo para mostrar perguntas...");
  }

  // Função para controlo automático do jogo (backup se o host sair)
  function initializeGameController() {
    const gameStateRef = ref(db, `games/${gameId}/gameState`);
    
    onValue(gameStateRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const gameState = snapshot.val();
      
      // Se não há questionStartTime ou o jogo está parado há muito tempo, assumir controlo
      if (gameState.autoController && gameState.questionStartTime) {
        const timeSinceStart = Date.now() - gameState.questionStartTime;
        
        // Se passou mais de 8 segundos desde o início da pergunta e não está a mostrar resultados
        if (timeSinceStart > 8000 && !gameState.showingResults && !gameState.gameEnded) {
          console.log("Controlo automático: Forçando resultados após 8s (backup ativo)");
          
          // Forçar mostrar resultados
          update(ref(db, `games/${gameId}/gameState`), {
            ...gameState,
            showingResults: true,
            timeLeft: 0,
            resultsStartTime: Date.now()
          });
          
          // Avançar para próxima pergunta após 5 segundos
          setTimeout(() => {
            const nextQuestionIndex = gameState.currentQuestionIndex + 1;
            if (nextQuestionIndex >= questions.length) {
              // Fim do jogo
              update(ref(db, `games/${gameId}/gameState`), {
                gameEnded: true,
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: 0,
                questionStartTime: null,
                showingResults: false
              });
            } else {
              // Próxima pergunta
              update(ref(db, `games/${gameId}/gameState`), {
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: 10,
                questionStartTime: Date.now(),
                gameEnded: false,
                showingResults: false
              });
            }
          }, 5000);
        }
        
        // Se está a mostrar resultados há mais de 6 segundos, avançar
        if (gameState.showingResults && gameState.resultsStartTime) {
          const timeSinceResults = Date.now() - gameState.resultsStartTime;
          if (timeSinceResults > 6000) {
            console.log("Controlo automático: Avançando após 6s de resultados (backup ativo)");
            
            const nextQuestionIndex = gameState.currentQuestionIndex + 1;
            if (nextQuestionIndex >= questions.length) {
              // Fim do jogo
              update(ref(db, `games/${gameId}/gameState`), {
                gameEnded: true,
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: 0,
                questionStartTime: null,
                showingResults: false
              });
            } else {
              // Próxima pergunta
              update(ref(db, `games/${gameId}/gameState`), {
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: 10,
                questionStartTime: Date.now(),
                gameEnded: false,
                showingResults: false
              });
            }
          }
        }
      }
    });
  }

});
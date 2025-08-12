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

  // Limpar sessionStorage para garantir que sempre pede nome novo
  sessionStorage.removeItem("playerName");
  let playerName = null;

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
  let resultsProcessed = false; // controla se os resultados já foram processados

  const enterNameBox = document.getElementById("enterNameBox");
  const waitingBox = document.getElementById("waitingBox");
  const playerNameDisplay = document.getElementById("playerNameDisplay");

  if (!gameId) {
    alert("Link inválido: falta o gameId");
    window.location.href = "index.html";
  }

  // SEMPRE mostrar input para nome (não usar sessionStorage)
  console.log("Iniciando com tela de entrada de nome");
  enterNameBox.classList.remove("hidden");
  waitingBox.style.display = "none";

  document.getElementById("enterGameBtn").addEventListener("click", () => {
    const inputName = document.getElementById("playerNameInput").value.trim();
    if (!inputName) {
      alert("Por favor, insere um nome válido!");
      return;
    }
    playerName = inputName;
    sessionStorage.setItem("playerName", playerName);

    enterNameBox.classList.add("hidden");
    waitingBox.style.display = "block";
    playerNameDisplay.textContent = `Jogador: ${playerName}`;

    registerPlayerAndWait();
  });

  document.getElementById("testRankingBtn")?.addEventListener("click", showFinalRanking);
  
  document.getElementById("backToGameBtn")?.addEventListener("click", () => {
    // Voltar ao menu inicial
    document.getElementById("scoreSection").classList.add("hidden");
    document.getElementById("gameEndBox").classList.add("hidden");
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
      
      // Atualizar timeLeft com a configuração do jogo
      if (gameConfig?.timePerQuestion) {
        timeLeft = gameConfig.timePerQuestion;
        console.log(`⏰ TimeLeft atualizado para: ${timeLeft}s (das configurações do jogo)`);
      }
      
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
        // GARANTIR que está a ouvir o estado do jogo (para jogadores que entram depois)
        if (!listeningForGameState) {
          console.log("🎯 Iniciando listener para jogador que entrou depois do jogo começar");
          listenToGameState();
        }
      } else {
        waitingBox.style.display = "block";
      }
    });
  }

  // Funções para mostrar/esconder tela de contador regressivo
  function showCountdownScreen(countdownTime) {
    // Esconder outras telas
    waitingBox.style.display = "none";
    document.getElementById("questionBox").classList.add("hidden");
    
    // Mostrar e atualizar card de countdown
    const countdownCard = document.getElementById("countdownCard");
    const countdownNumber = document.getElementById("countdownNumber");
    
    countdownNumber.textContent = countdownTime;
    countdownCard.classList.remove("hidden");
    countdownCard.classList.add("pulse");
    
    // Atualizar texto baseado no tempo
    const countdownText = countdownCard.querySelector(".countdown-text");
    if (countdownTime > 1) {
      countdownText.textContent = "Preparar...";
    } else {
      countdownText.textContent = "COMEÇAR!";
    } 
  }
  
  function hideCountdownScreen() {
    const countdownCard = document.getElementById("countdownCard");
    if (countdownCard) {
      countdownCard.classList.add("hidden");
      countdownCard.classList.remove("pulse");
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
      console.log("🔥 Estado do jogo atualizado:", gameState);
      console.log("🔍 showingStatistics:", gameState.showingStatistics);
      console.log("🔍 countdown:", gameState.countdown);
      console.log("🔍 currentQuestionIndex:", gameState.currentQuestionIndex);
      console.log("🔍 local currentQuestionIndex:", currentQuestionIndex);
      
      // Verificar se deve mostrar estatísticas
      if (gameState.showingStatistics && gameState.statistics) {
        console.log("📊 Mostrando estatísticas da pergunta:", gameState.statistics);
        showStatistics(gameState.statistics);
        // NÃO fazer return aqui para permitir outras verificações
      } else {
        // Se não está mostrando estatísticas, esconder display de estatísticas
        const statsDisplay = document.getElementById("statisticsDisplay");
        if (statsDisplay) {
          statsDisplay.style.display = "none";
          console.log("📊 Estatísticas escondidas");
        }
      }
      
      // Se está mostrando estatísticas, não processar mais nada
      if (gameState.showingStatistics) {
        return;
      }
      
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
      console.log("🔍 Verificando nova pergunta...");
      console.log("🔍 !gameState.countdown:", !gameState.countdown);
      console.log("🔍 gameState.currentQuestionIndex !== currentQuestionIndex:", gameState.currentQuestionIndex !== currentQuestionIndex);
      console.log("🔍 !gameState.showingResults:", !gameState.showingResults);
      
      if (!gameState.countdown && (gameState.currentQuestionIndex !== currentQuestionIndex || !gameState.showingResults)) {
        console.log("✅ CONDIÇÕES ATENDIDAS - Mostrando nova pergunta!");
        currentQuestionIndex = gameState.currentQuestionIndex;
        playerAnswer = null; // Reset da resposta para nova pergunta
        resultsProcessed = false; // Reset para nova pergunta
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
        updateTimerDisplay(gameState.questionStartTime, gameState.timePerQuestion || 10);
      }
    });
  }

  // Função para atualizar o display do timer baseado no tempo do servidor
  function updateTimerDisplay(questionStartTime, maxTime = 10) {
    // Limpar timer anterior se existir
    if (timerInterval) {
      clearTimeout(timerInterval);
      timerInterval = null;
    }
    
    const timerElement = document.getElementById("timerDisplay");
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      timeLeft = Math.max(0, maxTime - elapsed);
      timerElement.textContent = `⏱️ ${timeLeft}s`;
      
      // Adicionar classe warning quando tempo < 5s
      if (timeLeft <= 5) {
        timerElement.classList.add("warning");
      } else {
        timerElement.classList.remove("warning");
      }
      
      console.log(`Timer atualizado: ${timeLeft}s (elapsed: ${elapsed}s)`);
      
      if (timeLeft > 0) {
        timerInterval = setTimeout(updateTimer, 200); // Atualizar a cada 200ms
      } else {
        timerInterval = null;
        console.log("⏰ Timer chegou a 0 - BLOQUEANDO botões");
        
        // Bloquear todos os botões quando o tempo acaba
        const answersBox = document.getElementById("answersBox");
        if (answersBox) {
          Array.from(answersBox.children).forEach(btn => {
            btn.disabled = true;
            console.log(`🚫 Botão "${btn.textContent}" bloqueado`);
          });
        }
      }
    };
    
    // Iniciar imediatamente
    updateTimer();
  }

  // Função para mostrar estatísticas da pergunta
  function showStatistics(statistics) {
    console.log("📊 Mostrando estatísticas:", statistics);
    
    // Esconder pergunta atual
    const questionBox = document.getElementById("questionBox");
    if (questionBox) {
      questionBox.style.display = "none";
      console.log("✅ QuestionBox escondido");
    }
    
    // Criar ou atualizar a exibição de estatísticas
    let statsDisplay = document.getElementById("statisticsDisplay");
    if (!statsDisplay) {
      console.log("🔧 Criando novo elemento de estatísticas");
      statsDisplay = document.createElement("div");
      statsDisplay.id = "statisticsDisplay";
      statsDisplay.className = "statistics-display";
      const container = document.querySelector(".quiz-container") || document.body;
      container.appendChild(statsDisplay);
      console.log("✅ Elemento de estatísticas criado e adicionado");
    }
    
    statsDisplay.style.display = "block";
    
    // Criar seção de velocidade se houver dados
    let fastestPlayerHtml = '';
    if (statistics.fastestPlayer) {
      const fastest = statistics.fastestPlayer;
      const correctEmoji = fastest.isCorrect ? "✅" : "❌";
      fastestPlayerHtml = `
        <div class="fastest-player-section">
          <h4>🏃‍♂️ Jogador Mais Rápido</h4>
          <div class="fastest-player-info">
            <span class="fastest-name">${fastest.playerName}</span>
            <span class="fastest-result">${correctEmoji}</span>
            <span class="fastest-answer">"${fastest.selectedAnswer}"</span>
          </div>
        </div>
      `;
    }
    
    statsDisplay.innerHTML = `
      <div class="statistics-header">
        <h3>📊 Estatísticas da Pergunta ${statistics.questionNumber}</h3>
      </div>
      <div class="statistics-content compact">
        <div class="stat-item correct compact">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.correctAnswers}</div>
            <div class="stat-label">Certas</div>
            <div class="stat-percentage">${statistics.correctPercentage}%</div>
          </div>
        </div>
        <div class="stat-item wrong compact">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.wrongAnswers}</div>
            <div class="stat-label">Erradas</div>
            <div class="stat-percentage">${Math.round((statistics.wrongAnswers / statistics.totalPlayers) * 100)}%</div>
          </div>
        </div>
        <div class="stat-item no-answer compact">
          <div class="stat-icon">⏰</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.noAnswers}</div>
            <div class="stat-label">Sem Resposta</div>
            <div class="stat-percentage">${Math.round((statistics.noAnswers / statistics.totalPlayers) * 100)}%</div>
          </div>
        </div>
      </div>
      ${fastestPlayerHtml}
      <div class="statistics-footer">
        <p>Total de jogadores: <strong>${statistics.totalPlayers}</strong></p>
      </div>
    `;
    
    console.log("📊 Estatísticas exibidas com sucesso!");
  }

  // Função para mostrar os resultados da resposta
  function showAnswerResults() {
    // Verificar se já foi processado para evitar duplicação
    if (resultsProcessed) {
      console.log("⚠️ Resultados já processados, ignorando chamada duplicada");
      return;
    }
    
    if (!playerAnswer) {
      console.log("Nenhuma resposta para mostrar resultados");
      return;
    }
    
    resultsProcessed = true; // Marcar como processado
    console.log("=== MOSTRANDO RESULTADOS ===");
    console.log("Resposta do jogador:", playerAnswer.selected);
    console.log("Resposta correta:", playerAnswer.correct);
    console.log("Está correto:", playerAnswer.isCorrect);
    
    const answersBox = document.getElementById("answersBox");
    Array.from(answersBox.children).forEach(btn => {
      // Limpar todas as classes anteriores
      btn.classList.remove('selected', 'correct', 'incorrect');
      
      // Mostrar resultado da resposta do jogador
      if (btn.textContent === playerAnswer.selected) {
        if (playerAnswer.isCorrect) {
          btn.classList.add('correct');
          console.log("✅ Resposta do jogador CORRETA:", playerAnswer.selected);
        } else {
          btn.classList.add('incorrect');
          console.log("❌ Resposta do jogador INCORRETA:", playerAnswer.selected);
        }
      }
      
      // Sempre destacar a resposta correta (se for diferente da selecionada)
      const correct = playerAnswer.correct;
      if ((btn.textContent === correct || (Array.isArray(correct) && correct.includes(btn.textContent))) 
          && btn.textContent !== playerAnswer.selected) {
        btn.classList.add('correct');
        console.log("✅ Resposta correta destacada:", btn.textContent);
      }
    });
    
    // Mostrar feedback no timer - manter texto branco sempre
    const resultText = playerAnswer.isCorrect ? "✅ CORRETO!" : "❌ INCORRETO!";
    const timerDisplay = document.getElementById("timerDisplay");
    timerDisplay.textContent = resultText;
    // Timer sempre mantém cor branca conforme especificado
    
    console.log("=== FIM DOS RESULTADOS ===");
  }

  // Nova função para mostrar apenas a resposta correta quando o jogador não respondeu
  function showCorrectAnswerOnly() {
    // Verificar se já foi processado para evitar duplicação
    if (resultsProcessed) {
      console.log("⚠️ Resultados já processados, ignorando chamada duplicada");
      return;
    }
    
    resultsProcessed = true; // Marcar como processado
    console.log("=== MOSTRANDO APENAS RESPOSTA CORRETA ===");
    console.log("🚫 Jogador não respondeu - aplicando 0 pontos");
    
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
      pointsEarned: 0, // Ausência de resposta = 0 pontos (não usar pointsWrong)
      timestamp: Date.now(),
      responseTimestamp: Date.now(), // Timestamp quando tempo expirou
      timeExpired: true // Flag para indicar que o tempo expirou
    };
    
    // Atualizar pontuação por não responder (0 pontos)
    score += 0; // Ausência de resposta = 0 pontos
    console.log(`⏰ SEM RESPOSTA: +0 pontos | Total: ${score}`);
    
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
      points: 0, // Usar 0 pontos em vez de gameConfig.pointsWrong
      isCorrect: false,
      timestamp: Date.now(),
      responseTimestamp: Date.now(), // Timestamp específico da resposta
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
    
    // Esconder countdown e waiting screen
    hideCountdownScreen();
    waitingBox.style.display = "none";
    
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
    const questionCode = q.numero || '';
    document.getElementById("questionCounter").innerHTML = `<span style="color: #ccc; font-size: 0.85rem;">${questionNumber}/${totalQuestions} [${questionCode}]</span>`;
    
    // Mostrar question box com nova classe
    const questionBox = document.getElementById("questionBox");
    questionBox.classList.remove("hidden");
    questionBox.style.display = "block"; // Garantir que está visível

    // Configurar imagem
    const questionImage = document.getElementById("questionImage");
    if (q.imagem) {
      questionImage.src = q.imagem;
      questionImage.classList.remove("hidden");
    } else {
      questionImage.classList.add("hidden");
    }

    document.getElementById("questionText").textContent = q.pergunta;

    const answersBox = document.getElementById("answersBox");

    // Antes de limpar, desativa os botões para evitar cliques extras durante transição
    Array.from(answersBox.children).forEach(btn => btn.disabled = true);

    answersBox.innerHTML = "";

    // Criar botões de resposta estilo Kahoot
    q.hipoteses_resposta.forEach(option => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.className = "answer-btn";
      btn.onclick = () => checkAnswer(option, q.resposta);
      btn.disabled = false;
      
      // Garantir que todas as classes de estado são removidas
      btn.classList.remove('selected', 'correct', 'incorrect');
      
      answersBox.appendChild(btn);
    });

    console.log("Botões criados - nova pergunta iniciada");
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
    
    // Marcar visualmente a resposta selecionada imediatamente
    const answerButtons = document.getElementById("answersBox");
    Array.from(answerButtons.children).forEach(btn => {
      if (btn.textContent === selected) {
        btn.classList.add('selected');
        console.log("Botão marcado como selecionado:", selected);
      }
      // Desabilitar todos os botões para evitar múltiplas seleções
      btn.disabled = true;
    });
    
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
        console.log(`✅ Resposta CERTA (array): +${gameConfig.pointsCorrect} pontos | Total: ${score}`);
      } else {
        score += gameConfig.pointsWrong;
        console.log(`❌ Resposta ERRADA (array): ${gameConfig.pointsWrong} pontos | Total: ${score}`);
      }
    } else {
      if (selected === correct) {
        score += gameConfig.pointsCorrect;
        isCorrect = true;
        console.log(`✅ Resposta CERTA: +${gameConfig.pointsCorrect} pontos | Total: ${score}`);
      } else {
        score += gameConfig.pointsWrong;
        console.log(`❌ Resposta ERRADA: ${gameConfig.pointsWrong} pontos | Total: ${score}`);
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
      timestamp: Date.now(),
      responseTimestamp: Date.now() // Timestamp específico da resposta para calcular velocidade
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
      timestamp: Date.now(),
      responseTimestamp: Date.now() // Timestamp específico da resposta
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
    waitingBox.style.display = "none";
    document.getElementById("questionBox").classList.add("hidden");
    document.getElementById("scoreSection").classList.add("hidden");
    
    // Mostrar tela de fim
    const gameEndBox = document.getElementById("gameEndBox");
    gameEndBox.classList.remove("hidden");
    document.getElementById("finalScoreDisplay").textContent = score;
    
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
    document.getElementById("gameEndBox").classList.add("hidden");
    waitingBox.style.display = "none";
    document.getElementById("questionBox").classList.add("hidden");

    // Mostrar tabela de classificação
    const scoreSection = document.getElementById("scoreSection");
    if (scoreSection) scoreSection.classList.remove("hidden");

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
              // Próxima pergunta (controlo automático)
              update(ref(db, `games/${gameId}/gameState`), {
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: gameState.timePerQuestion || 10,
                timePerQuestion: gameState.timePerQuestion || 10,
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
              // Próxima pergunta (sistema backup)
              update(ref(db, `games/${gameId}/gameState`), {
                currentQuestionIndex: nextQuestionIndex,
                timeLeft: gameState.timePerQuestion || 10,
                timePerQuestion: gameState.timePerQuestion || 10,
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

  // Função auxiliar para countdown animado de pergunta
  function startQuestionCountdown(duration = 3) {
    return new Promise((resolve) => {
      showCountdownScreen(duration);
      
      let timeRemaining = duration;
      const countdownInterval = setInterval(() => {
        timeRemaining--;
        
        if (timeRemaining > 0) {
          showCountdownScreen(timeRemaining);
        } else {
          clearInterval(countdownInterval);
          hideCountdownScreen();
          resolve();
        }
      }, 1000);
    });
  }

});
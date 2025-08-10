import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, push, update, get, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

    // Verificar cards selecionados
    const cardSelect = document.getElementById("cardSelection");
    const selectedCards = Array.from(cardSelect.selectedOptions).map(option => `cards/${option.value}.json`);

    if (!playerName) {
      alert("Por favor insere o teu nome!");
      return;
    }
    if (selectedCards.length === 0) {
      alert("Por favor seleciona pelo menos um card de perguntas!");
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
        pointsWrong,
        selectedCards
      },
      players,
      gameStarted: false
    }).then(() => {
      sessionStorage.setItem("gameId", createdGameId);
      sessionStorage.setItem("playerName", creatorName);

      // Esconder botão "Criar Jogo" e mostrar botão "Abrir como Jogador 1"
      document.getElementById("startGameBtn").style.display = "none";
      document.getElementById("openPlayer1Btn").style.display = "inline-block";

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
          totalQuestions: questions.length,
          autoController: true // Ativar controlo automático
        }
      });
      
      // Mostrar aviso visual
      showControlWarning();
      
      // Iniciar controlador automático
      startGameController();
    } catch (error) {
      console.error("Erro ao iniciar o jogo:", error);
      alert("Erro ao iniciar o jogo. Veja a consola.");
    }
  });

  // Função para gerar perguntas (similar ao quiz.js)
  async function generateQuestionsForGame() {
    // Obter os cards selecionados
    const cardSelect = document.getElementById("cardSelection");
    const selectedCards = Array.from(cardSelect.selectedOptions).map(option => `cards/${option.value}.json`);

    let allQuestions = [];

    for (let file of selectedCards) {
      try {
        const res = await fetch(file);
        const data = await res.json();
        allQuestions = allQuestions.concat(data.perguntas);
        console.log(`Carregadas ${data.perguntas.length} perguntas de ${file}`);
      } catch (error) {
        console.warn(`Erro ao carregar ${file}:`, error);
      }
    }

    console.log(`Total de perguntas disponíveis: ${allQuestions.length}`);

    // Baralhar e selecionar o número correto de perguntas
    allQuestions.sort(() => Math.random() - 0.5);
    const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
    const selectedQuestions = allQuestions.slice(0, maxQuestions);
    
    console.log(`Selecionadas ${selectedQuestions.length} perguntas para o jogo`);
    return selectedQuestions;
  }

  // Função para mostrar aviso de controlo
  function showControlWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'controlWarning';
    warningDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: #ff9800;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 1000;
      font-size: 14px;
    `;
    warningDiv.innerHTML = '🎮 CONTROLO ATIVO - NÃO MUDES DE ABA! Jogo em progresso...';
    document.body.appendChild(warningDiv);
    
    // Piscar o aviso a cada 5 segundos (mais frequente)
    setInterval(() => {
      warningDiv.style.backgroundColor = warningDiv.style.backgroundColor === 'rgb(255, 87, 34)' ? '#ff9800' : '#ff5722';
    }, 5000);
  }

  // Função para controlar o jogo (apenas para o host) com sistema anti-bloqueio AGRESSIVO
  function startGameController() {
    if (!createdGameId) return;
    
    let currentQuestion = 0;
    const maxQuestions = parseInt(document.getElementById("maxQuestions").value);
    let gameActive = true;
    
    console.log(`Host: Iniciando controlador do jogo com ${maxQuestions} perguntas`);
    
    // SISTEMA ANTI-BLOQUEIO AGRESSIVO
    let animationId;
    let keepAliveInterval;
    
    function keepPageActive() {
      // Força a página a permanecer ativa
      animationId = requestAnimationFrame(keepPageActive);
      
      // Pequenas mudanças no DOM para manter atividade
      const timestamp = Date.now();
      document.body.setAttribute('data-timestamp', timestamp);
    }
    
    // Iniciar loop de manter ativo
    keepPageActive();
    
    // Sistema de heartbeat MUITO frequente
    keepAliveInterval = setInterval(() => {
      if (!gameActive) return;
      
      console.log("Host: Heartbeat ATIVO - ", new Date().toLocaleTimeString());
      document.title = `🎮 CONTROLO ATIVO ${new Date().toLocaleTimeString()}`;
      
      // Audio silencioso para manter aba ativa (se necessário)
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Volume zero
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.01);
      } catch (e) {
        // Ignora erro de audio
      }
    }, 5000); // A cada 5 segundos
    
    // Detectar quando a aba fica inativa e forçar reativação
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        console.warn("Host: Aba ficou inativa! REATIVANDO...");
        // Tentar reativar imediatamente
        setTimeout(() => {
          window.focus();
          console.log("Host: Tentando refocar aba");
        }, 100);
      } else {
        console.log("Host: Aba reativada!");
      }
    });
    
    // Detectar perda de foco e tentar recuperar
    window.addEventListener('blur', function() {
      console.warn("Host: Janela perdeu foco, tentando recuperar...");
      setTimeout(() => {
        window.focus();
      }, 500);
    });
    
    // Sistema de recuperação automática
    setInterval(() => {
      if (gameActive && document.hidden) {
        console.warn("Host: Aba ainda está oculta, forçando ativação");
        window.focus();
        // Criar evento de mouse para "simular" atividade
        const event = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      }
    }, 10000);
    
    function nextQuestion() {
      console.log(`Host: nextQuestion chamada - currentQuestion: ${currentQuestion}, maxQuestions: ${maxQuestions}`);
      
      if (currentQuestion >= maxQuestions) {
        // Fim do jogo
        console.log("Host: Jogo terminado - limpando sistema anti-bloqueio");
        gameActive = false;
        
        // Parar sistema anti-bloqueio
        if (animationId) cancelAnimationFrame(animationId);
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        
        update(ref(db, `games/${createdGameId}/gameState`), {
          gameEnded: true,
          currentQuestionIndex: currentQuestion,
          timeLeft: 0,
          questionStartTime: null,
          showingResults: false
        });
        
        document.title = "Quiz Terminado";
        return;
      }
      
      const questionStartTime = Date.now();
      
      // Avançar para próxima pergunta
      update(ref(db, `games/${createdGameId}/gameState`), {
        currentQuestionIndex: currentQuestion,
        timeLeft: 10,
        questionStartTime: questionStartTime,
        gameEnded: false,
        showingResults: false
      }).then(() => {
        console.log(`Host: Pergunta ${currentQuestion + 1} iniciada`);
      }).catch(err => {
        console.error("Erro ao atualizar estado:", err);
      });
      
      console.log(`Host: Pergunta ${currentQuestion + 1}/${maxQuestions} iniciada às ${new Date(questionStartTime).toLocaleTimeString()}`);
      
      // Timer de 10 segundos para a pergunta
      setTimeout(() => {
        // Mostrar resultados por 5 segundos
        console.log(`Host: Timer acabou para pergunta ${currentQuestion + 1}. Mostrando resultados...`);
        update(ref(db, `games/${createdGameId}/gameState`), {
          currentQuestionIndex: currentQuestion,
          timeLeft: 0,
          questionStartTime: questionStartTime,
          gameEnded: false,
          showingResults: true,
          resultsStartTime: Date.now()
        });
        
        // Aguardar 5 segundos e avançar para próxima pergunta
        setTimeout(() => {
          console.log(`Host: Avançando da pergunta ${currentQuestion + 1} para ${currentQuestion + 2}`);
          currentQuestion++;
          nextQuestion();
        }, 5000);
      }, 10000);
    }
    
    // Iniciar primeira pergunta após um pequeno delay para todos se conectarem
    setTimeout(() => {
      console.log("Host: Iniciando primeira pergunta...");
      nextQuestion();
    }, 3000);
  }

  const openPlayer1Btn = document.getElementById("openPlayer1Btn");

  openPlayer1Btn.addEventListener("click", () => {
    if (!createdGameId) {
      alert("Cria um jogo primeiro!");
      return;
    }
    
    // Em vez de abrir nova aba, mostrar interface integrada
    console.log("🎮 Ativando painel integrado do Jogador 1");
    activateIntegratedPlayer1Panel();
  });

  // Função para ativar o painel integrado do Jogador 1
  function activateIntegratedPlayer1Panel() {
    // Mostrar a secção de quiz integrada
    document.getElementById("integratedQuizSection").style.display = "block";
    
    // Ocultar o botão "Abrir Jogador 1" 
    document.getElementById("openPlayer1Btn").style.display = "none";
    
    // Inicializar como jogador 1 integrado
    initializeIntegratedPlayer1();
  }

  // Variáveis para o jogo integrado
  let integratedQuestions = [];
  let integratedCurrentQuestion = 0;
  let integratedPlayerScore = 0;
  let integratedPlayerAnswer = null;
  let integratedGameActive = false;

  // Função para inicializar o Jogador 1 integrado
  async function initializeIntegratedPlayer1() {
    console.log("🎯 Inicializando Jogador 1 integrado");
    
    // Adicionar jogador à base de dados
    await update(ref(db, `games/${createdGameId}/players/${creatorName}`), {
      name: creatorName,
      score: 0,
      isHost: true,
      joinedAt: Date.now()
    });

    // Atualizar status
    document.getElementById("statusText").textContent = "✅ Conectado como Jogador 1 (Host)";
    
    // Carregar perguntas
    await loadIntegratedQuestions();
    
    // Escutar estado do jogo
    listenToIntegratedGameState();
    
    // Ativar controlos manuais para o host
    document.getElementById("manualControls").style.display = "block";
    setupManualControls();
    
    // Tentar carregar perguntas a cada 3 segundos se ainda não existirem
    const questionsInterval = setInterval(async () => {
      if (integratedQuestions.length === 0) {
        console.log("🔄 Tentando carregar perguntas novamente...");
        await loadIntegratedQuestions();
      } else {
        clearInterval(questionsInterval);
      }
    }, 3000);
  }

  // Função para carregar perguntas para o jogo integrado
  async function loadIntegratedQuestions() {
    try {
      const questionsRef = ref(db, `games/${createdGameId}/questions`);
      const snapshot = await new Promise((resolve) => {
        get(questionsRef).then(resolve);
      });
      
      if (snapshot.exists()) {
        integratedQuestions = snapshot.val();
        console.log("📚 Perguntas carregadas:", integratedQuestions.length);
        document.getElementById("statusText").textContent = `📚 ${integratedQuestions.length} perguntas carregadas - Clica "▶️ Iniciar Jogo" para começar!`;
        
        // Mostrar primeira pergunta logo que carregue
        if (integratedQuestions.length > 0) {
          showIntegratedQuestion();
        }
      } else {
        document.getElementById("statusText").textContent = "⚠️ Inicia o jogo primeiro para carregar as perguntas";
      }
    } catch (error) {
      console.error("❌ Erro ao carregar perguntas:", error);
      document.getElementById("statusText").textContent = "❌ Erro ao carregar perguntas";
    }
  }

  // Função para escutar mudanças no estado do jogo integrado
  function listenToIntegratedGameState() {
    const gameStateRef = ref(db, `games/${createdGameId}/gameState`);
    
    onValue(gameStateRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Se não há gameState ainda, aguardar
        document.getElementById("statusText").textContent = "⏳ Aguardando início do jogo...";
        return;
      }
      
      const gameState = snapshot.val();
      console.log("🔄 Estado atualizado:", gameState);
      
      // Se o jogo começou, mostrar que está ativo
      if (gameState.questionStartTime) {
        document.getElementById("statusText").textContent = "🎮 Jogo ativo!";
      }
      
      if (gameState.gameEnded) {
        showIntegratedFinalResults();
        return;
      }
      
      if (gameState.showingResults) {
        showIntegratedAnswerResults();
        return;
      }
      
      // Nova pergunta
      if (gameState.currentQuestionIndex !== integratedCurrentQuestion) {
        integratedCurrentQuestion = gameState.currentQuestionIndex;
        integratedPlayerAnswer = null;
        
        // Recarregar perguntas se necessário
        if (integratedQuestions.length === 0) {
          loadIntegratedQuestions();
        } else {
          showIntegratedQuestion();
        }
      }
      
      // Atualizar timer
      if (gameState.questionStartTime && !gameState.gameEnded) {
        updateIntegratedTimer(gameState.questionStartTime);
      }
    });
  }

  // Função para mostrar pergunta no painel integrado
  function showIntegratedQuestion() {
    if (integratedCurrentQuestion >= integratedQuestions.length) {
      document.getElementById("statusText").textContent = "🏁 Todas as perguntas foram respondidas";
      return;
    }
    
    const question = integratedQuestions[integratedCurrentQuestion];
    console.log("🎯 Mostrando pergunta:", question);
    
    // Atualizar título
    document.getElementById("questionTitle").textContent = 
      `Pergunta ${integratedCurrentQuestion + 1} de ${integratedQuestions.length}`;
    
    // Mostrar pergunta (usar 'pergunta' em vez de 'question')
    document.getElementById("questionText").textContent = question.pergunta;
    
    // Mostrar imagem se existir (usar 'imagem' em vez de 'image')
    const imgElement = document.getElementById("questionImage");
    if (question.imagem) {
      imgElement.src = question.imagem;
      imgElement.style.display = "block";
    } else {
      imgElement.style.display = "none";
    }
    
    // Atualizar botões com o texto das respostas (sem mostrar A), B), C), D))
    const options = question.hipoteses_resposta;
    if (options && options.length >= 4) {
      const answerButtons = document.querySelectorAll(".player1-answer-btn");
      answerButtons[0].textContent = options[0]; // Só o texto
      answerButtons[1].textContent = options[1];
      answerButtons[2].textContent = options[2];
      answerButtons[3].textContent = options[3];
    } else {
      console.error("❌ Opções de resposta não encontradas:", question);
    }
    
    // Mostrar secções relevantes
    document.getElementById("currentQuestionDisplay").style.display = "block";
    document.getElementById("player1AnswerSection").style.display = "block";
    
    // Reset da resposta
    document.getElementById("player1Answer").textContent = "";
    resetIntegratedAnswerButtons();
    
    // Atualizar status
    document.getElementById("statusText").textContent = 
      `🎯 Pergunta ${integratedCurrentQuestion + 1}: Responde!`;
  }

  // Função para reset dos botões de resposta
  function resetIntegratedAnswerButtons() {
    const buttons = document.querySelectorAll(".player1-answer-btn");
    buttons.forEach(btn => {
      btn.style.backgroundColor = "white";
      btn.style.color = "black";
      btn.style.borderColor = "#ddd";
    });
  }

  // Função para atualizar timer integrado
  function updateIntegratedTimer(questionStartTime) {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const timeLeft = Math.max(0, 10 - elapsed);
      
      document.getElementById("timerDisplay").textContent = `⏰ ${timeLeft}s`;
      
      if (timeLeft > 0) {
        setTimeout(updateTimer, 200);
      } else {
        document.getElementById("timerDisplay").textContent = "⏰ Tempo Esgotado!";
      }
    };
    
    updateTimer();
  }

  // Função para mostrar resultados da resposta integrada
  function showIntegratedAnswerResults() {
    const question = integratedQuestions[integratedCurrentQuestion];
    const correctAnswer = question.resposta;
    const answerButtons = document.querySelectorAll(".player1-answer-btn");
    
    // Encontrar qual é a resposta correta (índice)
    let correctIndex = -1;
    for (let i = 0; i < question.hipoteses_resposta.length; i++) {
      if (question.hipoteses_resposta[i] === correctAnswer) {
        correctIndex = i;
        break;
      }
    }
    
    // Destacar resposta correta em VERDE
    if (correctIndex >= 0) {
      answerButtons[correctIndex].style.backgroundColor = "#4CAF50";
      answerButtons[correctIndex].style.color = "white";
      answerButtons[correctIndex].style.borderColor = "#4CAF50";
    }
    
    if (!integratedPlayerAnswer) {
      document.getElementById("statusText").textContent = "⏸️ Não respondeste a tempo!";
      
      // Guardar registo de que o jogador 1 não respondeu
      const pointsWrong = parseInt(document.getElementById("pointsWrong").value);
      integratedPlayerScore += pointsWrong;
      
      const roundData = {
        questionIndex: integratedCurrentQuestionIndex,
        questionText: question.pergunta,
        selectedAnswer: null, // Nenhuma resposta selecionada
        correctAnswer: correctAnswer,
        isCorrect: false,
        pointsEarned: pointsWrong,
        timestamp: Date.now(),
        timeExpired: true // Flag para indicar que o tempo expirou
      };
      
      // Nova estrutura: Guardar na pergunta com todas as respostas dos jogadores
      const questionData = {
        question: question.pergunta,
        options: question.hipoteses_resposta,
        correctAnswer: correctAnswer,
        questionIndex: integratedCurrentQuestionIndex
      };
      
      // Dados da resposta do jogador 1 (tempo esgotado)
      const playerAnswerData = {
        answer: null,
        points: pointsWrong,
        isCorrect: false,
        timestamp: Date.now(),
        timeExpired: true
      };
      
      // Atualizar ambas as estruturas no Firebase
      const updates = {};
      updates[`games/${createdGameId}/players/${creatorName}/score`] = integratedPlayerScore;
      updates[`games/${createdGameId}/players/${creatorName}/rounds/${integratedCurrentQuestionIndex}`] = roundData;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/question`] = questionData.question;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/options`] = questionData.options;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/correctAnswer`] = questionData.correctAnswer;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/questionIndex`] = questionData.questionIndex;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/playerAnswers/${creatorName}`] = playerAnswerData;
      
      update(ref(db), updates)
        .then(() => console.log("Registo de tempo esgotado e resultado da pergunta do jogador 1 guardados"))
        .catch(err => console.error("Erro ao guardar registo do jogador 1:", err));
      
      return;
    }
    
    // Converter letra para índice (A=0, B=1, C=2, D=3)
    const answerIndex = integratedPlayerAnswer.charCodeAt(0) - 65; // A=65 em ASCII
    const selectedAnswer = question.hipoteses_resposta[answerIndex];
    
    const isCorrect = selectedAnswer === correctAnswer;
    console.log(`🔍 Resposta: ${selectedAnswer}, Correta: ${correctAnswer}, Está certo: ${isCorrect}`);
    
    // Se resposta errada, destacar em VERMELHO
    if (!isCorrect && answerIndex >= 0) {
      answerButtons[answerIndex].style.backgroundColor = "#f44336";
      answerButtons[answerIndex].style.color = "white";
      answerButtons[answerIndex].style.borderColor = "#f44336";
    }
    
    if (isCorrect) {
      const pointsCorrect = parseInt(document.getElementById("pointsCorrect").value);
      integratedPlayerScore += pointsCorrect;
      document.getElementById("statusText").textContent = `✅ Correto! +${pointsCorrect} pontos`;
    } else {
      const pointsWrong = parseInt(document.getElementById("pointsWrong").value);
      integratedPlayerScore += pointsWrong;
      document.getElementById("statusText").textContent = `❌ Errado! ${pointsWrong} pontos (Correto: ${correctAnswer})`;
    }
    
    // Calcular pontos ganhos nesta ronda
    const pointsThisRound = isCorrect ? 
      parseInt(document.getElementById("pointsCorrect").value) : 
      parseInt(document.getElementById("pointsWrong").value);
    
    // Guardar resposta detalhada desta ronda na base de dados (estrutura antiga - mantida para compatibilidade)
    const roundData = {
      questionIndex: integratedCurrentQuestionIndex,
      questionText: question.pergunta,
      selectedAnswer: selectedAnswer,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect,
      pointsEarned: pointsThisRound,
      timestamp: Date.now()
    };
    
    // Nova estrutura: Guardar na pergunta com todas as respostas dos jogadores
    const questionData = {
      question: question.pergunta,
      options: question.hipoteses_resposta,
      correctAnswer: correctAnswer,
      questionIndex: integratedCurrentQuestionIndex
    };
    
    // Dados da resposta do jogador 1
    const playerAnswerData = {
      answer: selectedAnswer,
      points: pointsThisRound,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };
    
    // Atualizar ambas as estruturas no Firebase
    const updates = {};
    updates[`games/${createdGameId}/players/${creatorName}/score`] = integratedPlayerScore;
    updates[`games/${createdGameId}/players/${creatorName}/rounds/${integratedCurrentQuestionIndex}`] = roundData;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/question`] = questionData.question;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/options`] = questionData.options;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/correctAnswer`] = questionData.correctAnswer;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/questionIndex`] = questionData.questionIndex;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestionIndex}/playerAnswers/${creatorName}`] = playerAnswerData;
    
    update(ref(db), updates)
      .then(() => console.log("Score, resposta da ronda e resultado da pergunta do jogador 1 atualizados"))
      .catch(err => console.error("Erro ao atualizar dados do jogador 1:", err));
  }

  // Função para mostrar resultados finais integrados
  function showIntegratedFinalResults() {
    document.getElementById("statusText").textContent = "🏁 Jogo Terminado!";
    document.getElementById("currentQuestionDisplay").style.display = "none";
    document.getElementById("player1AnswerSection").style.display = "none";
    document.getElementById("timerDisplay").textContent = "🎉 Fim do Jogo!";
  }

  // Configurar controlos manuais
  function setupManualControls() {
    // Botões de resposta do Jogador 1
    document.querySelectorAll(".player1-answer-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const answer = e.target.dataset.answer;
        integratedPlayerAnswer = answer;
        
        // Visual feedback - destacar seleção
        resetIntegratedAnswerButtons();
        e.target.style.backgroundColor = "#2196F3";
        e.target.style.color = "white";
        e.target.style.borderColor = "#2196F3";
        
        // Mostrar resposta selecionada
        const selectedText = e.target.textContent;
        document.getElementById("player1Answer").textContent = `✅ Selecionaste: ${selectedText}`;
        
        console.log(`✅ Jogador 1 respondeu: ${answer} (${selectedText})`);
      });
    });
    
    // Controlo manual próxima pergunta
    document.getElementById("manualNextBtn").addEventListener("click", () => {
      if (integratedCurrentQuestion < integratedQuestions.length - 1) {
        console.log("⏭️ Avançar manualmente para próxima pergunta");
        const nextIndex = integratedCurrentQuestion + 1;
        
        update(ref(db, `games/${createdGameId}/gameState`), {
          currentQuestionIndex: nextIndex,
          timeLeft: 10,
          questionStartTime: Date.now(),
          gameEnded: false,
          showingResults: false
        });
      }
    });
    
    // Controlo manual terminar jogo
    document.getElementById("manualEndBtn").addEventListener("click", () => {
      if (confirm("Tens certeza que queres terminar o jogo?")) {
        console.log("🏁 Terminar jogo manualmente");
        
        update(ref(db, `games/${createdGameId}/gameState`), {
          gameEnded: true,
          currentQuestionIndex: integratedCurrentQuestion,
          timeLeft: 0,
          questionStartTime: null,
          showingResults: false
        });
      }
    });
  }

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

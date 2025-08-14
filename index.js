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
    const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value);
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
    if (isNaN(timePerQuestion) || timePerQuestion < 10 || timePerQuestion > 20) {
      alert("⚠️ Erro: O tempo por pergunta deve estar entre 10 e 20 segundos!");
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
        timePerQuestion,
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
      document.getElementById("permanentScoreboardBtn").style.display = "inline-block";

      document.getElementById("shareLink").style.display = "block";
      document.getElementById("gameLink").value = `${window.location.origin}/quizzGame_front_1/quiz.html?gameId=${createdGameId}`;

      // Botão "Iniciar Jogo" só aparece após ativar painel do jogador 1
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
      // Ler tempo por pergunta da configuração
      const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value);
      
      // Validar tempo por pergunta (deve estar entre 10 e 20 segundos)
      if (isNaN(timePerQuestion) || timePerQuestion < 10 || timePerQuestion > 20) {
        alert("⚠️ Erro: O tempo por pergunta deve estar entre 10 e 20 segundos!");
        return;
      }
      
      // Gerar as perguntas para o jogo
      console.log("Host gerando perguntas para o jogo...");
      const questions = await generateQuestionsForGame();
      
      // Marcar o jogo como iniciado mas ainda sem começar perguntas
      await update(ref(db, `games/${createdGameId}`), { 
        gameStarted: true,
        questions: questions,
        gameState: {
          currentQuestionIndex: -1, // -1 indica contador regressivo
          timeLeft: timePerQuestion,
          timePerQuestion: timePerQuestion, // Tempo total configurado para cada pergunta
          questionStartTime: null,
          totalQuestions: questions.length,
          autoController: true,
          hostId: creatorName, // Identificar quem é o host oficial
          countdown: true, // Flag para indicar contador regressivo
          countdownTime: timePerQuestion // Contador inicial usando tempo configurado
        }
      });
      
      // Mostrar aviso visual
      showControlWarning();
      
      // Colapsar seções de configuração e mostrar toggle
      collapseGameSetup();
      
      // Iniciar contador regressivo
      startCountdown();
    } catch (error) {
      console.error("Erro ao iniciar o jogo:", error);
      alert("Erro ao iniciar o jogo. Veja a consola.");
    }
  });

  // Função para iniciar contador regressivo
  function startCountdown() {
    countdownActive = true; // Marcar countdown como ativo
    const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value);
    let countdownTime = timePerQuestion || 10; // Usar tempo configurado ou 10 como fallback
    
    console.log(`🚀 Iniciando countdown de ${countdownTime} segundos`);
    
    // Modo simplificado - controle apenas via Firebase
    const countdownInterval = setInterval(() => {
      countdownTime--;
      
      if (countdownTime > 0) {
        // Atualizar contador no Firebase para outros jogadores
        update(ref(db, `games/${createdGameId}/gameState`), {
          countdownTime: countdownTime
        });
        console.log(`⏰ Contador: ${countdownTime}`);
      } else {
        // Acabou o contador - iniciar primeira pergunta
        clearInterval(countdownInterval);
        console.log("🏁 Contador terminado - iniciando primeira pergunta!");
        countdownActive = false; // Marcar countdown como terminado
        
        // Atualizar Firebase para iniciar primeira pergunta
        update(ref(db, `games/${createdGameId}/gameState`), {
          currentQuestionIndex: 0,
          timeLeft: timePerQuestion,
          timePerQuestion: timePerQuestion,
          questionStartTime: Date.now(),
          countdown: false,
          countdownTime: 0
        });
        
        // Iniciar controlador automático
        startGameController();
      }
    }, 1000);
  }

  // Função para gerar perguntas (similar ao quiz.js)
  // Função para criar um random com seed (para consistência entre jogadores)
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Função para embaralhar array com seed
  function shuffleArrayWithSeed(array, seed) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Função para embaralhar hipóteses de uma pergunta
  function shuffleQuestionOptions(question, gameId) {
    // Criar uma seed única baseada no gameId e no número da pergunta
    const seed = gameId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + 
                 question.numero.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Embaralhar as hipóteses mantendo a referência da resposta correta
    const shuffledOptions = shuffleArrayWithSeed(question.hipoteses_resposta, seed);
    
    // Atualizar a pergunta com as hipóteses embaralhadas
    return {
      ...question,
      hipoteses_resposta: shuffledOptions
    };
  }

  async function generateQuestionsForGame() {
    // Obter os cards selecionados
    const cardSelect = document.getElementById("cardSelection");
    const selectedCards = Array.from(cardSelect.selectedOptions).map(option => `cards/${option.value}.json`);
    const maxQuestions = parseInt(document.getElementById("maxQuestions").value);

    if (selectedCards.length === 0) {
      console.error("Nenhum card selecionado");
      return [];
    }

    console.log(`Cards selecionados: ${selectedCards.length}`);
    console.log(`Máximo de perguntas solicitado: ${maxQuestions}`);

    let cardQuestions = []; // Array para armazenar perguntas por card

    // Carregar perguntas de cada card separadamente
    for (let file of selectedCards) {
      try {
        const res = await fetch(file);
        const data = await res.json();
        cardQuestions.push({
          file: file,
          cardName: data.card || file,
          questions: data.perguntas || []
        });
        console.log(`Carregadas ${data.perguntas.length} perguntas de ${file}`);
      } catch (error) {
        console.warn(`Erro ao carregar ${file}:`, error);
        // Adicionar card vazio em caso de erro para manter a contagem
        cardQuestions.push({
          file: file,
          cardName: file,
          questions: []
        });
      }
    }

    // Filtrar cards que realmente têm perguntas
    cardQuestions = cardQuestions.filter(card => card.questions.length > 0);
    const numCardsWithQuestions = cardQuestions.length;

    if (numCardsWithQuestions === 0) {
      console.error("Nenhum card tem perguntas válidas");
      return [];
    }

    console.log(`Cards com perguntas válidas: ${numCardsWithQuestions}`);

    let selectedQuestions = [];

    if (numCardsWithQuestions === 1) {
      // Se só há 1 card, usar todas as perguntas dele
      const card = cardQuestions[0];
      card.questions.sort(() => Math.random() - 0.5); // Embaralhar
      selectedQuestions = card.questions.slice(0, maxQuestions);
      console.log(`1 card selecionado: ${selectedQuestions.length} perguntas de ${card.cardName}`);
    } else {
      // Múltiplos cards: distribuir perguntas de forma equilibrada
      
      // Calcular quantas perguntas por card (garantindo pelo menos 1 por card)
      const questionsPerCard = Math.floor(maxQuestions / numCardsWithQuestions);
      const remainingQuestions = maxQuestions % numCardsWithQuestions;
      
      console.log(`Distribuição: ${questionsPerCard} perguntas por card, ${remainingQuestions} perguntas extras`);

      // Garantir que cada card contribui com pelo menos 1 pergunta
      for (let i = 0; i < cardQuestions.length; i++) {
        const card = cardQuestions[i];
        card.questions.sort(() => Math.random() - 0.5); // Embaralhar perguntas do card
        
        let questionsToTake = Math.max(1, questionsPerCard); // Pelo menos 1 pergunta
        
        // Distribuir perguntas extras aos primeiros cards
        if (i < remainingQuestions) {
          questionsToTake += 1;
        }
        
        // Não exceder o número de perguntas disponíveis no card
        questionsToTake = Math.min(questionsToTake, card.questions.length);
        
        const cardSelectedQuestions = card.questions.slice(0, questionsToTake);
        selectedQuestions = selectedQuestions.concat(cardSelectedQuestions);
        
        console.log(`Card ${card.cardName}: selecionadas ${cardSelectedQuestions.length} perguntas`);
      }

      // Se ainda não temos perguntas suficientes, pegar mais aleatoriamente
      if (selectedQuestions.length < maxQuestions) {
        const remainingNeeded = maxQuestions - selectedQuestions.length;
        const usedQuestionNumbers = new Set(selectedQuestions.map(q => q.numero));
        
        // Coletar todas as perguntas restantes não utilizadas
        let availableQuestions = [];
        cardQuestions.forEach(card => {
          card.questions.forEach(question => {
            if (!usedQuestionNumbers.has(question.numero)) {
              availableQuestions.push(question);
            }
          });
        });
        
        // Embaralhar e pegar as que faltam
        availableQuestions.sort(() => Math.random() - 0.5);
        const additionalQuestions = availableQuestions.slice(0, remainingNeeded);
        selectedQuestions = selectedQuestions.concat(additionalQuestions);
        
        console.log(`Adicionadas ${additionalQuestions.length} perguntas extras para completar ${maxQuestions}`);
      }

      // Embaralhar a ordem final das perguntas selecionadas
      selectedQuestions.sort(() => Math.random() - 0.5);
    }

    console.log(`Total de perguntas selecionadas: ${selectedQuestions.length}`);

    // Embaralhar as hipóteses de cada pergunta usando o gameId como seed
    if (createdGameId) {
      selectedQuestions = selectedQuestions.map(question => {
        const originalOptions = [...question.hipoteses_resposta];
        const shuffledQuestion = shuffleQuestionOptions(question, createdGameId);
        console.log(`Pergunta ${question.numero}:`);
        console.log(`  Original: ${originalOptions.join(', ')}`);
        console.log(`  Embaralhada: ${shuffledQuestion.hipoteses_resposta.join(', ')}`);
        return shuffledQuestion;
      });
      console.log("Hipóteses embaralhadas para consistência entre jogadores");
    }
    
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
    warningDiv.innerHTML = '🎮 NÃO MUDES DE ABA! Jogo em progresso...';
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
    const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value);
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
      
      // Atualizar heartbeat no Firebase para informar jogadores que host está ativo
      update(ref(db, `games/${createdGameId}/gameState`), {
        hostLastSeen: Date.now(),
        hostActive: true,
        backupController: null // Limpar backup quando host está ativo
      }).catch(err => {
        console.log("Erro no heartbeat:", err);
      });
      document.title = `🎮 NÃO MUDES DE ABA! ${new Date().toLocaleTimeString()}`;
      
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
    
    // Função para analisar velocidade de resposta
    async function analyzeResponseSpeed(questionIndex) {
      try {
        const playersRef = ref(db, `games/${createdGameId}/players`);
        const playersSnapshot = await get(playersRef);
        
        if (!playersSnapshot.exists()) {
          console.log("⚠️ Nenhum jogador encontrado para análise de velocidade");
          return;
        }
        
        const playersData = playersSnapshot.val();
        const responseSpeedData = [];
        
        // Coletar timestamps de resposta de todos os jogadores (apenas corretas)
        for (const [playerName, player] of Object.entries(playersData)) {
          if (player.rounds && player.rounds[questionIndex]) {
            const roundData = player.rounds[questionIndex];
            if (roundData.responseTimestamp && !roundData.timeExpired && roundData.isCorrect) {
              responseSpeedData.push({
                playerName: playerName,
                responseTimestamp: roundData.responseTimestamp,
                isCorrect: roundData.isCorrect,
                selectedAnswer: roundData.selectedAnswer
              });
            }
          }
        }
        
        // Ordenar por velocidade (timestamp mais baixo = mais rápido)
        responseSpeedData.sort((a, b) => a.responseTimestamp - b.responseTimestamp);
        
        if (responseSpeedData.length > 0) {
          console.log("🏃‍♂️ Velocidade de Resposta CORRETAS (mais rápido primeiro):");
          responseSpeedData.forEach((data, index) => {
            const position = index + 1;
            const correctEmoji = data.isCorrect ? "✅" : "❌";
            console.log(`${position}º lugar: ${data.playerName} ${correctEmoji} (${data.selectedAnswer})`);
          });
          
          const fastest = responseSpeedData[0];
          console.log(`🥇 Jogador mais rápido: ${fastest.playerName} ${fastest.isCorrect ? "✅" : "❌"}`);
          
          // Registrar na base de dados que este jogador foi o mais rápido
          await updateFastestPlayerCounter(fastest.playerName);
        }
        
        return responseSpeedData;
        
      } catch (error) {
        console.error("❌ Erro ao analisar velocidade de resposta:", error);
      }
    }
    
    // Função para atualizar contador de jogador mais rápido
    async function updateFastestPlayerCounter(playerName) {
      try {
        const playerRef = ref(db, `games/${createdGameId}/players/${playerName}`);
        const playerSnapshot = await get(playerRef);
        
        if (playerSnapshot.exists()) {
          const playerData = playerSnapshot.val();
          const currentFastestCount = playerData.fastestCount || 0;
          
          await update(playerRef, {
            fastestCount: currentFastestCount + 1
          });
          
          console.log(`🏃‍♂️ ${playerName} foi o mais rápido ${currentFastestCount + 1} vez(es)`);
        }
      } catch (error) {
        console.error("❌ Erro ao atualizar contador de mais rápido:", error);
      }
    }
    
    // Função para mostrar estatísticas da pergunta
    async function showQuestionStatistics(questionIndex) {
      try {
        console.log(`📊 Mostrando estatísticas da pergunta ${questionIndex + 1}`);
        
        // Obter dados dos jogadores da pergunta atual
        const playersRef = ref(db, `games/${createdGameId}/players`);
        const playersSnapshot = await get(playersRef);
        
        if (!playersSnapshot.exists()) {
          console.log("⚠️ Nenhum jogador encontrado para estatísticas");
          return;
        }
        
        const playersData = playersSnapshot.val();
        const currentQuestion = integratedQuestions[questionIndex];
        const correctAnswer = currentQuestion.resposta;
        
        console.log(`🎯 Analisando pergunta ${questionIndex}: "${currentQuestion.pergunta}"`);
        console.log(`✅ Resposta correta: "${correctAnswer}"`);
        
        let correctCount = 0;
        let wrongCount = 0;
        let noAnswerCount = 0;
        let totalPlayers = 0;
        
        // Contar respostas de cada jogador
        Object.entries(playersData).forEach(([playerName, player]) => {
          totalPlayers++;
          
          console.log(`🔍 Verificando jogador ${playerName} para pergunta ${questionIndex}`);
          
          let playerAnswer = null;
          let selectedAnswer = null;
          let timeExpired = false;
          
          // Verificar se o jogador tem resposta para esta pergunta
          // Todos os jogadores (incluindo host) usam agora a estrutura "rounds"
          if (player.rounds && player.rounds[questionIndex]) {
            playerAnswer = player.rounds[questionIndex].answer;
            selectedAnswer = player.rounds[questionIndex].selectedAnswer;
            timeExpired = player.rounds[questionIndex].timeExpired;
          }
          
          console.log(`📝 Jogador ${playerName} - answer: "${playerAnswer}" | selectedAnswer: "${selectedAnswer}" | timeExpired: ${timeExpired} | Correta: "${correctAnswer}"`);
          
          // Verificar se realmente respondeu algo (não é null ou undefined)
          if (!playerAnswer && !selectedAnswer) {
            // Não respondeu - contabilizar como sem resposta
            noAnswerCount++;
            console.log(`⏰ ${playerName}: SEM RESPOSTA (answer e selectedAnswer são null)`);
          } else {
            // Tem uma resposta - verificar se está correta
            let playerAnswerText;
            if (selectedAnswer) {
              playerAnswerText = selectedAnswer;
            } else if (playerAnswer) {
              // Converter letra (A, B, C, D) para texto
              const answerIndex = playerAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
              if (answerIndex >= 0 && answerIndex < currentQuestion.hipoteses_resposta.length) {
                playerAnswerText = currentQuestion.hipoteses_resposta[answerIndex];
              } else {
                playerAnswerText = playerAnswer; // fallback
              }
            }
            
            console.log(`🔄 Resposta convertida: "${playerAnswerText}"`);
            
            if (playerAnswerText === correctAnswer) {
              correctCount++;
              console.log(`✅ ${playerName}: Resposta CERTA`);
            } else {
              wrongCount++;
              console.log(`❌ ${playerName}: Resposta ERRADA`);
            }
          }
        });
        
        console.log(`📊 Estatísticas: ${correctCount} certas, ${wrongCount} erradas, ${noAnswerCount} sem resposta`);
        
        // Obter dados de velocidade de resposta
        const speedData = await analyzeResponseSpeed(questionIndex);
        let fastestPlayer = null;
        if (speedData && speedData.length > 0) {
          fastestPlayer = speedData[0]; // O primeiro é o mais rápido
        }
        
        // Atualizar estado do jogo para mostrar estatísticas com dados de velocidade
        await update(ref(db, `games/${createdGameId}/gameState`), {
          showingStatistics: true,
          statistics: {
            questionNumber: questionIndex + 1,
            totalPlayers: totalPlayers,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            noAnswers: noAnswerCount,
            correctPercentage: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0,
            fastestPlayer: fastestPlayer // Adicionar dados do jogador mais rápido
          }
        });
        
      } catch (error) {
        console.error("❌ Erro ao mostrar estatísticas:", error);
      }
    }
    
    function nextQuestion() {
      console.log(`Host: nextQuestion chamada - currentQuestion: ${currentQuestion}, maxQuestions: ${maxQuestions}`);
      
      // Limpar estado de estatísticas da pergunta anterior
      update(ref(db, `games/${createdGameId}/gameState`), {
        showingStatistics: false,
        statistics: null
      });
      
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
        timeLeft: timePerQuestion,
        timePerQuestion: timePerQuestion,
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
        
        // Aguardar o tempo configurado por pergunta, mostrar estatísticas, e depois mais 5 segundos antes da próxima pergunta
        setTimeout(async () => {
          // Mostrar estatísticas da pergunta que acabou de terminar
          await showQuestionStatistics(currentQuestion);
          
          // Aguardar mais 5 segundos e avançar para próxima pergunta
          setTimeout(() => {
            console.log(`Host: Avançando da pergunta ${currentQuestion + 1} para ${currentQuestion + 2}`);
            currentQuestion++;
            nextQuestion();
          }, 5000);
        }, 5000);
      }, timePerQuestion * 1000);
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
    
    // Mostrar o botão "Iniciar Jogo"
    document.getElementById("beginGameBtn").style.display = "inline-block";
    
    // Inicializar perguntas integradas
    loadIntegratedQuestions();
    
    // Começar a escutar mudanças no estado do jogo
    listenToIntegratedGameState();
    
    // Configurar botões de resposta do Jogador 1
    setupIntegratedPlayer1Answers();
    
    // Verificar se o jogo já está ativo e forçar atualização
    setTimeout(() => {
      const gameStateRef = ref(db, `games/${createdGameId}/gameState`);
      get(gameStateRef).then((snapshot) => {
        if (snapshot.exists()) {
          const gameState = snapshot.val();
          console.log("🔍 Verificando estado atual do jogo:", gameState);
          
          // Se o jogo já está ativo e há uma pergunta atual, forçar mostrar
          if (!gameState.countdown && gameState.currentQuestionIndex >= 0) {
            console.log("🔄 Jogo já ativo - forçando exibição da pergunta atual");
            integratedCurrentQuestion = gameState.currentQuestionIndex;
            if (integratedQuestions.length > 0) {
              showIntegratedQuestion();
            }
          }
        }
      });
    }, 1000); // Dar tempo para as perguntas carregarem
    
    // Host agora participa como jogador e controla o jogo
    console.log("🎮 Host configurado como controlador E jogador");
  }

  // Host apenas controla o jogo - variáveis de jogador removidas
  // Variáveis para controle de fluxo do jogo apenas
  let gameControllerActive = false;
  let countdownActive = false; // Controla se countdown está ativo
  
  // Variáveis mínimas necessárias para compatibilidade (sem lógica de jogador)
  let integratedQuestions = [];
  let integratedCurrentQuestion = -1;
  let integratedPlayerAnswer = null;
  let integratedAnswerProcessed = false;
  let integratedPlayerResponseTimestamp = null;

  // Host apenas controla o jogo - todas as funções de jogador removidas
  console.log("🎮 Host configurado como controlador apenas");

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
        // document.getElementById("statusText").textContent = `📚 ${integratedQuestions.length} perguntas carregadas - Clica "▶️ Iniciar Jogo" para começar!`;
        
        // NÃO mostrar pergunta aqui - só quando o jogo começar e countdown terminar
        console.log("✅ Perguntas prontas - aguardando início do jogo");
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
      
      // Verificar se está em countdown
      if (gameState.countdown && gameState.countdownTime > 0) {
        console.log(`⏰ Contador regressivo: ${gameState.countdownTime}`);
        countdownActive = true; // Marcar countdown como ativo
        
        // Para o jogador 1, não precisamos fazer nada especial aqui
        // porque o countdown é controlado localmente no startCountdown()
        // Só vamos atualizar o status se necessário
        const statusText = document.getElementById("statusText");
        if (statusText) {
          statusText.textContent = `⏰ Iniciando em ${gameState.countdownTime}s...`;
        }
        return;
      }
      
      // Se saiu do countdown
      if (!gameState.countdown && countdownActive) {
        console.log("✅ Countdown terminado - perguntas podem aparecer");
        countdownActive = false;
      }
      
      // Se o jogo começou (saiu do countdown), mostrar que está ativo
      if (gameState.questionStartTime && !gameState.countdown) {
        // Resetar estilo do contador se estava em countdown - remover elemento temporário
        const tempCountdown = document.getElementById("tempCountdown");
        const statusText = document.getElementById("statusText");
        
        if (tempCountdown) {
          tempCountdown.remove();
        }
        
        // Mostrar pergunta atual em vez de "Jogo ativo"
        if (statusText && integratedCurrentQuestion >= 0 && integratedQuestions.length > 0) {
          statusText.textContent = `� Pergunta ${integratedCurrentQuestion + 1}: Responde!`;
        } else if (statusText) {
          statusText.textContent = "🎯 Pergunta: Responde!";
        }
      }
      
      if (gameState.gameEnded) {
        showIntegratedFinalResults();
        return;
      }
      
      // Verificar se deve mostrar estatísticas
      if (gameState.showingStatistics && gameState.statistics) {
        showIntegratedStatistics(gameState.statistics);
        return;
      }
      
      if (gameState.showingResults) {
        showIntegratedAnswerResults();
        return;
      }
      
      // Nova pergunta (apenas se não estiver em countdown)
      if (!gameState.countdown && gameState.currentQuestionIndex !== integratedCurrentQuestion) {
        console.log(`🎯 Nova pergunta detectada: ${gameState.currentQuestionIndex} (anterior: ${integratedCurrentQuestion})`);
        console.log(`🔍 Countdown ativo: ${gameState.countdown}`);
        
        integratedCurrentQuestion = gameState.currentQuestionIndex;
        integratedPlayerAnswer = null;
        integratedPlayerResponseTimestamp = null; // Reset do timestamp
        integratedAnswerProcessed = false; // Reset para nova pergunta
        
        // Recarregar perguntas se necessário
        if (integratedQuestions.length === 0) {
          console.log("📚 Recarregando perguntas...");
          loadIntegratedQuestions().then(() => {
            // Após carregar, mostrar a pergunta se ainda estamos na mesma pergunta
            if (integratedQuestions.length > 0 && gameState.currentQuestionIndex === integratedCurrentQuestion) {
              console.log("📋 Mostrando pergunta integrada após carregar...");
              showIntegratedQuestion();
            }
          });
        } else {
          console.log("📋 Mostrando pergunta integrada...");
          showIntegratedQuestion();
        }
      }
      
      // Atualizar timer (apenas se não estiver em countdown)
      if (!gameState.countdown && gameState.questionStartTime && !gameState.gameEnded) {
        updateIntegratedTimer(gameState.questionStartTime);
      }
    });
  }

  // Função para mostrar pergunta no painel integrado
  function showIntegratedQuestion() {
    console.log("🔍 showIntegratedQuestion() chamada");
    console.log("🔍 countdownActive:", countdownActive);
    console.log("🔍 integratedCurrentQuestion:", integratedCurrentQuestion);
    console.log("🔍 integratedQuestions.length:", integratedQuestions.length);
    
    // PROTEÇÃO EXTRA: Não mostrar se countdown ainda estiver ativo
    if (countdownActive) {
      console.log("🚫 Tentativa de mostrar pergunta durante countdown - bloqueada");
      return;
    }
    
    // Limpar feedback visual da pergunta anterior
    clearHostAnswerStyles();
    
    // Esconder estatísticas se estiverem visíveis
    const statsDisplay = document.getElementById("statisticsDisplay");
    if (statsDisplay) {
      statsDisplay.style.display = "none";
    }
    
    if (integratedCurrentQuestion >= integratedQuestions.length) {
      const statusText = document.getElementById("statusText");
      if (statusText) statusText.textContent = "🏁 Todas as perguntas foram respondidas";
      return;
    }
    
    const question = integratedQuestions[integratedCurrentQuestion];
    console.log("🎯 Mostrando pergunta:", question);
    
    // Verificar se elementos existem antes de usar
    const questionTitle = document.getElementById("questionTitle");
    const questionText = document.getElementById("questionText");
    const imgElement = document.getElementById("questionImage");
    const currentQuestionDisplay = document.getElementById("currentQuestionDisplay");
    
    // Atualizar título com formato: "X/Y [numero_original]" onde [numero_original] é do card
    if (questionTitle) {
      questionTitle.innerHTML = 
        `<span style="color: #ccc; font-size: 0.85rem;">${integratedCurrentQuestion + 1}/${integratedQuestions.length} [${question.numero}]</span>`;
    }
    
    // Mostrar pergunta (usar 'pergunta' em vez de 'question')
    if (questionText) questionText.textContent = question.pergunta;
    
    // Mostrar imagem se existir (usar 'imagem' em vez de 'image')
    if (imgElement) {
      if (question.imagem) {
        imgElement.src = question.imagem;
        imgElement.style.display = "block";
      } else {
        imgElement.style.display = "none";
      }
    }
    
    // Atualizar botões com o texto das respostas (apenas hipóteses, sem letras)
    const options = question.hipoteses_resposta;
    if (options && options.length >= 4) {
      const answerButtons = document.querySelectorAll(".player1-answer-btn");
      if (answerButtons.length >= 4) {
        answerButtons[0].textContent = options[0]; // Apenas "Kamakura"
        answerButtons[1].textContent = options[1]; // Apenas "Yamato"
        answerButtons[2].textContent = options[2]; // Apenas "Fujiwara" 
        answerButtons[3].textContent = options[3]; // Apenas "Heian"
        
        // DESBLOQUEAR todos os botões para nova pergunta e resetar classes CSS
        resetIntegratedAnswerButtons();
        
        answerButtons.forEach((btn, index) => {
          btn.disabled = false;
          btn.style.cursor = "pointer";
          btn.style.opacity = "1";
          btn.style.backgroundColor = "";
          btn.style.color = "";
          btn.style.borderColor = "";
          btn.style.fontWeight = "";
          btn.dataset.answer = String.fromCharCode(65 + index); // A, B, C, D
        });
        
        console.log("🔓 Botões do jogador 1 desbloqueados para nova pergunta");
      }
    } else {
      console.error("❌ Opções de resposta não encontradas:", question);
    }
    
    // Mostrar secções relevantes
    if (currentQuestionDisplay) currentQuestionDisplay.style.display = "block";
    
    // Host pode participar como jogador - mostrar botões de resposta
    document.getElementById("player1AnswerSection").style.display = "grid";
    
    // Reset da resposta para nova pergunta
    integratedPlayerAnswer = null; // Reset da variável de resposta
    integratedPlayerResponseTimestamp = null; // Reset do timestamp
    
    // Verificar se elemento existe antes de tentar usar
    const player1AnswerElement = document.getElementById("player1Answer");
    if (player1AnswerElement) {
      player1AnswerElement.textContent = "";
      player1AnswerElement.style.display = "none";
    }
    
    resetIntegratedAnswerButtons();
    
    console.log("🔄 Resposta do jogador 1 resetada para nova pergunta");
    
    // Atualizar status
    document.getElementById("statusText").textContent = 
      `🎯 Pergunta ${integratedCurrentQuestion + 1}: Responde!`;
    
    // Inicializar timer com o tempo configurado
    const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value) || 10;
    const timerDisplay = document.getElementById("timerDisplay");
    if (timerDisplay) {
      timerDisplay.textContent = `⏰ ${timePerQuestion}s`;
    }
  }

  // Função para reset dos botões de resposta
  function resetIntegratedAnswerButtons() {
    const buttons = document.querySelectorAll(".player1-answer-btn");
    buttons.forEach(btn => {
      btn.style.backgroundColor = "white";
      btn.style.color = "black";
      btn.style.borderColor = "#ddd";
      btn.style.fontWeight = "";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.disabled = false;
    });
  }

  // Função para atualizar timer integrado
  function updateIntegratedTimer(questionStartTime) {
    const timePerQuestion = parseInt(document.getElementById("timePerQuestion").value);
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const timeLeft = Math.max(0, timePerQuestion - elapsed);
      
      const timerDisplay = document.getElementById("timerDisplay");
      if (timerDisplay) {
        timerDisplay.textContent = `⏰ ${timeLeft}s`;
      }
      
      if (timeLeft > 0) {
        setTimeout(updateTimer, 200);
      } else {
        if (timerDisplay) timerDisplay.textContent = "⏰ Tempo Esgotado!";
        
        // Bloquear todos os botões do jogador 1 quando o tempo acaba
        const player1Buttons = document.querySelectorAll(".player1-answer-btn");
        player1Buttons.forEach(btn => {
          btn.disabled = true;
          console.log(`🚫 Botão jogador 1 "${btn.textContent}" bloqueado`);
        });
        console.log("⏰ Timer chegou a 0 - BLOQUEANDO botões do jogador 1");
      }
    };
    
    updateTimer();
  }

  // Função para mostrar estatísticas integradas
  function showIntegratedStatistics(statistics) {
    console.log("📊 Mostrando estatísticas integradas:", statistics);
    
    // Esconder pergunta atual
    const questionDisplay = document.getElementById("currentQuestionDisplay");
    const player1Section = document.getElementById("player1AnswerSection");
    
    if (questionDisplay) questionDisplay.style.display = "none";
    if (player1Section) player1Section.style.display = "none";
    
    // Criar ou atualizar a exibição de estatísticas
    let statsDisplay = document.getElementById("statisticsDisplay");
    if (!statsDisplay) {
      statsDisplay = document.createElement("div");
      statsDisplay.id = "statisticsDisplay";
      statsDisplay.className = "statistics-display";
      document.querySelector(".game-panel").appendChild(statsDisplay);
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
  }

  // Função para mostrar resultados da resposta integrada
  async function showIntegratedAnswerResults() {
    // Verificar se já foi processado para evitar duplicação
    if (integratedAnswerProcessed) {
      console.log("⚠️ Resposta já processada, ignorando chamada duplicada");
      return;
    }
    
    integratedAnswerProcessed = true; // Marcar como processado
    console.log("=== PROCESSANDO RESPOSTA HOST ===");
    
    const question = integratedQuestions[integratedCurrentQuestion];
    const correctAnswer = question.resposta;
    
    if (!integratedPlayerAnswer) {
      console.log("🚫 Host não respondeu - aplicando 0 pontos");
      
      // Mostrar apenas resposta correta em verde quando não há resposta
      showHostCorrectAnswerOnly(correctAnswer);
      
      // Calcular e salvar pontuação para o host
      await saveIntegratedPlayerScore(question, false, 0, null);
      
      return;
    }
    
    // Calcular se a resposta está correta
    // integratedPlayerAnswer contém a letra (A, B, C, D)
    // Precisamos de verificar se essa letra corresponde à posição da resposta correta
    let correctIndex = -1;
    for (let i = 0; i < question.hipoteses_resposta.length; i++) {
      if (question.hipoteses_resposta[i] === correctAnswer) {
        correctIndex = i;
        break;
      }
    }
    
    const correctAnswerLetter = String.fromCharCode(65 + correctIndex); // A, B, C, D
    const isCorrect = integratedPlayerAnswer === correctAnswerLetter;
    
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = parseInt(document.getElementById("pointsCorrect").value) || 10;
      console.log(`✅ Host respondeu CORRETAMENTE: +${pointsEarned} pontos`);
    } else {
      pointsEarned = parseInt(document.getElementById("pointsWrong").value) || 0;
      console.log(`❌ Host respondeu INCORRETAMENTE: ${pointsEarned} pontos`);
    }
    
    // Calcular tempo de resposta  
    let responseTime = null;
    if (integratedPlayerResponseTimestamp) {
      const gameStateRef = ref(db, `games/${createdGameId}/gameState`);
      const gameStateSnapshot = await get(gameStateRef);
      
      if (gameStateSnapshot.exists()) {
        const gameState = gameStateSnapshot.val();
        if (gameState.questionStartTime) {
          responseTime = integratedPlayerResponseTimestamp - gameState.questionStartTime;
          console.log(`⏰ Host tempo de resposta: ${responseTime}ms`);
          
          // Verificar se o tempo é válido (positivo)
          if (responseTime < 0) {
            console.warn(`⚠️ Tempo de resposta negativo detectado: ${responseTime}ms - definindo como null`);
            responseTime = null;
          }
        }
      }
    }
    
    // Mostrar feedback visual igual aos outros jogadores
    showHostAnswerFeedback(correctAnswer, integratedPlayerAnswer, isCorrect);
    
    // Salvar pontuação no Firebase
    await saveIntegratedPlayerScore(question, isCorrect, pointsEarned, responseTime);
  }
  
  // Função para salvar pontuação do host integrado no Firebase
  async function saveIntegratedPlayerScore(question, isCorrect, pointsEarned, responseTime) {
    try {
      const updates = {};
      
      // Salvar dados da pergunta usando a mesma estrutura dos outros jogadores
      updates[`games/${createdGameId}/players/${creatorName}/rounds/${integratedCurrentQuestion}`] = {
        answer: integratedPlayerAnswer || "SEM_RESPOSTA",
        selectedAnswer: integratedPlayerAnswer ? question.hipoteses_resposta[integratedPlayerAnswer.charCodeAt(0) - 65] : null,
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        responseTime: responseTime,
        timeLimit: parseInt(document.getElementById("timePerQuestion").value) * 1000,
        responseTimestamp: integratedPlayerResponseTimestamp,
        timeExpired: !integratedPlayerAnswer // Se não há resposta, tempo expirou
      };
      
      // Atualizar score total
      const playerRef = ref(db, `games/${createdGameId}/players/${creatorName}`);
      const playerSnapshot = await get(playerRef);
      const currentScore = playerSnapshot.exists() ? (playerSnapshot.val().score || 0) : 0;
      const newScore = currentScore + pointsEarned;
      updates[`games/${createdGameId}/players/${creatorName}/score`] = newScore;
      
      await update(ref(db), updates);
      console.log(`💾 Host dados salvos: ${pointsEarned} pontos | Total: ${newScore}`);
      
    } catch (error) {
      console.error("❌ Erro ao salvar pontuação do host:", error);
    }
  }

  // Função para mostrar resultados finais integrados
  function showIntegratedFinalResults() {
    // Esconder pergunta e respostas imediatamente
    document.getElementById("currentQuestionDisplay").style.display = "none";
    document.getElementById("player1AnswerSection").style.display = "none";
    document.getElementById("timerDisplay").textContent = "🎉 Fim do Jogo!";
    
    // Verificar se há estatísticas visíveis
    const statsDisplay = document.getElementById("statisticsDisplay");
    const hasVisibleStats = statsDisplay && statsDisplay.style.display !== "none";
    
    if (hasVisibleStats) {
      // Se há estatísticas, aguardar 5 segundos antes de mostrar o resultado final
      setTimeout(() => {
        // Esconder estatísticas
        statsDisplay.style.display = "none";
        
        // Mostrar texto final e botões
        document.getElementById("statusText").textContent = "🏁 Jogo Terminado!";
        document.getElementById("finalButtons").style.display = "block";
      }, 5000);
    } else {
      // Se não há estatísticas, mostrar imediatamente
      document.getElementById("statusText").textContent = "🏁 Jogo Terminado!";
      document.getElementById("finalButtons").style.display = "block";
    }
  }

  // Configurar botões de resposta do Jogador 1 integrado
  function setupIntegratedPlayer1Answers() {
    document.querySelectorAll(".player1-answer-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        // Verificar se já respondeu - BLOQUEAR mudanças
        if (integratedPlayerAnswer) {
          console.log("🚫 Jogador 1 já respondeu - não pode mudar a resposta");
          return;
        }
        
        const answer = e.target.dataset.answer;
        integratedPlayerAnswer = answer;
        
        // CAPTURAR TIMESTAMP IMEDIATAMENTE quando jogador 1 responde
        integratedPlayerResponseTimestamp = Date.now();
        console.log(`⏰ Jogador 1 respondeu às ${new Date(integratedPlayerResponseTimestamp).toLocaleTimeString()}`);
        
        // Visual feedback - resetar todos os botões primeiro
        resetIntegratedAnswerButtons();
        
        // Marcar a opção selecionada com classe CSS
        e.target.classList.add('selected');
        
        // BLOQUEAR TODOS OS BOTÕES após primeira resposta
        document.querySelectorAll(".player1-answer-btn").forEach(button => {
          button.disabled = true;
          button.style.cursor = "not-allowed";
        });
        
        // Remover a mensagem "Selecionaste" - apenas log interno
        document.getElementById("player1Answer").textContent = "";
        
        console.log(`✅ Jogador 1 respondeu: ${answer} (${e.target.textContent}) - BLOQUEADO`);
      });
    });
  }

  // Função para resetar os botões de resposta
  function resetIntegratedAnswerButtons() {
    document.querySelectorAll(".player1-answer-btn").forEach(button => {
      // Remover todas as classes de feedback
      button.classList.remove('selected', 'correct', 'incorrect', 'correct-border-only');
      // Restaurar estado original
      button.disabled = false;
      button.style.cursor = "pointer";
      button.style.opacity = "1";
      button.style.fontWeight = "bold";
    });
  }

  // Função para mostrar feedback final (quando tempo acaba)
  // Função para mostrar feedback visual quando host responde
  function showHostAnswerFeedback(correctAnswer, selectedAnswer, isCorrect) {
    const question = integratedQuestions[integratedCurrentQuestion];
    const buttons = document.querySelectorAll(".player1-answer-btn");
    
    console.log("=== MOSTRANDO RESULTADOS HOST ===");
    console.log("Resposta do host:", selectedAnswer);
    console.log("Resposta correta:", correctAnswer);
    console.log("Está correto:", isCorrect);
    
    buttons.forEach(button => {
      const buttonAnswer = button.dataset.answer; // A, B, C, ou D
      const buttonText = button.textContent;
      
      // Limpar todas as classes anteriores
      button.classList.remove('selected', 'correct', 'incorrect');
      
      // Mostrar resultado da resposta do host
      if (buttonAnswer === selectedAnswer) {
        if (isCorrect) {
          button.classList.add('correct');
          console.log("✅ Resposta do host CORRETA:", selectedAnswer);
        } else {
          button.classList.add('incorrect');
          console.log("❌ Resposta do host INCORRETA:", selectedAnswer);
        }
      }
      
      // Sempre destacar a resposta correta (se for diferente da selecionada)
      if (buttonText === correctAnswer && buttonAnswer !== selectedAnswer) {
        button.classList.add('correct');
        console.log("✅ Resposta correta destacada:", buttonText);
      }
    });
  }
  
  // Função para mostrar apenas resposta correta quando host não responde
  function showHostCorrectAnswerOnly(correctAnswer) {
    console.log("=== MOSTRANDO APENAS RESPOSTA CORRETA HOST ===");
    console.log("🚫 Host não respondeu - aplicando 0 pontos");
    
    const question = integratedQuestions[integratedCurrentQuestion];
    const buttons = document.querySelectorAll(".player1-answer-btn");
    
    console.log("Resposta correta:", correctAnswer);
    
    buttons.forEach(button => {
      const buttonText = button.textContent;
      
      // Limpar todas as classes anteriores
      button.classList.remove('selected', 'correct', 'incorrect');
      
      // Destacar apenas a resposta correta em verde
      if (buttonText === correctAnswer) {
        button.classList.add('correct');
        console.log("✅ Resposta correta destacada:", buttonText);
      }
    });
  }
  
  // Função para limpar estilos dos botões de resposta do host
  function clearHostAnswerStyles() {
    const buttons = document.querySelectorAll(".player1-answer-btn");
    buttons.forEach(button => {
      // Limpar tanto classes CSS quanto estilos inline (para garantir)
      button.classList.remove('selected', 'correct', 'incorrect');
      button.style.backgroundColor = "";
      button.style.color = "";
      button.style.border = "";
      button.style.boxShadow = "";
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

  // Event listener para o botão de ver classificação
  const viewScoreboardBtn = document.getElementById("viewScoreboardBtn");
  if (viewScoreboardBtn) {
    viewScoreboardBtn.addEventListener("click", () => {
      if (createdGameId) {
        // Abrir classificação em nova aba
        window.open(`scoreboard.html?gameId=${createdGameId}`, '_blank');
      } else {
        alert("ID do jogo não encontrado!");
      }
    });
  }

  // Funcionalidade de toggle das configurações
  const toggleBtn = document.getElementById('toggleConfigBtn');
  const configContent = document.getElementById('configContent');
  const shareLink = document.getElementById('shareLink');
  
  function hideConfigurationsAfterGameCreation() {
    // Esconder configurações
    configContent.classList.add('hidden');
    
    // Mostrar botão toggle
    toggleBtn.style.display = 'block';
    toggleBtn.textContent = '+';
    toggleBtn.title = 'Mostrar configurações';
  }
  
  // Toggle das configurações
  toggleBtn.addEventListener('click', function() {
    const isHidden = configContent.classList.contains('hidden');
    
    if (isHidden) {
      // Mostrar configurações
      configContent.classList.remove('hidden');
      toggleBtn.textContent = '−';
      toggleBtn.title = 'Esconder configurações';
    } else {
      // Esconder configurações
      configContent.classList.add('hidden');
      toggleBtn.textContent = '+';
      toggleBtn.title = 'Mostrar configurações';
    }
  });
  
  // Observer para detectar quando o link de partilha aparece
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        if (shareLink.style.display !== 'none' && !shareLink.style.display.includes('none')) {
          hideConfigurationsAfterGameCreation();
          observer.disconnect(); // Parar de observar após esconder
        }
      }
    });
  });
  
  // Começar a observar mudanças no elemento shareLink
  observer.observe(shareLink, {
    attributes: true,
    attributeFilter: ['style']
  });

  // Event listeners para botões finais
  document.getElementById("restartBtn").addEventListener("click", () => {
    // Reset completo da aplicação
    window.location.reload();
  });

  document.getElementById("scoreboardBtn").addEventListener("click", () => {
    // Abrir scoreboard em nova aba
    const gameId = createdGameId || document.getElementById("gameLink").value.split('=')[1];
    if (gameId) {
      window.open(`scoreboard.html?gameId=${gameId}`, '_blank');
    } else {
      alert("Erro: ID do jogo não encontrado");
    }
  });

  // Event listener para botão permanente de classificação
  document.getElementById("permanentScoreboardBtn").addEventListener("click", () => {
    // Abrir scoreboard em nova aba
    const gameId = createdGameId || document.getElementById("gameLink").value.split('=')[1];
    if (gameId) {
      window.open(`scoreboard.html?gameId=${gameId}`, '_blank');
    } else {
      alert("Erro: ID do jogo não encontrado");
    }
  });

  // Função para colapsar configurações quando o jogo inicia
  function collapseGameSetup() {
    const setupSection = document.getElementById("gameSetupSection");
    const toggleSection = document.getElementById("gameToggleSection");
    
    // Colapsar seção de configurações
    setupSection.classList.add("collapsed");
    
    // Mostrar botão de toggle
    toggleSection.style.display = "block";
    
    console.log("🎮 Configurações colapsadas - jogo iniciado");
  }

  // Event listener para toggle das configurações durante o jogo
  document.getElementById("setupToggleBtn").addEventListener("click", () => {
    const setupSection = document.getElementById("gameSetupSection");
    const toggleIcon = document.getElementById("toggleIcon");
    
    if (setupSection.classList.contains("collapsed")) {
      // Expandir (estava colapsado com "+", agora vai expandir e mostrar "−")
      setupSection.classList.remove("collapsed");
      toggleIcon.textContent = "−";
      console.log("📋 Configurações expandidas");
    } else {
      // Colapsar (estava expandido com "−", agora vai colapsar e mostrar "+")
      setupSection.classList.add("collapsed");
      toggleIcon.textContent = "+";
      console.log("📁 Configurações colapsadas");
    }
  });
});

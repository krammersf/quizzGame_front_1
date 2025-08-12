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
      // Gerar as perguntas para o jogo
      console.log("Host gerando perguntas para o jogo...");
      const questions = await generateQuestionsForGame();
      
      // Marcar o jogo como iniciado mas ainda sem começar perguntas
      await update(ref(db, `games/${createdGameId}`), { 
        gameStarted: true,
        questions: questions,
        gameState: {
          currentQuestionIndex: -1, // -1 indica contador regressivo
          timeLeft: 10,
          questionStartTime: null,
          totalQuestions: questions.length,
          autoController: true,
          countdown: true, // Flag para indicar contador regressivo
          countdownTime: 10 // Contador inicial
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
    console.log("🚀 Iniciando contador regressivo...");
    countdownActive = true; // Marcar countdown como ativo
    let countdownTime = 10;
    
    // Verificar se os elementos existem antes de tentar usá-los
    const integratedQuizSection = document.getElementById("integratedQuizSection");
    const currentQuestionDisplay = document.getElementById("currentQuestionDisplay");
    const player1AnswerSection = document.getElementById("player1AnswerSection");
    const questionText = document.getElementById("questionText");
    
    if (!integratedQuizSection || !currentQuestionDisplay || !questionText) {
      console.warn("⚠️ Alguns elementos HTML não encontrados para countdown do jogador 1 - usando modo simplificado");
      
      // Modo simplificado - só mostrar o countdown no Firebase para outros jogadores
      const countdownInterval = setInterval(() => {
        countdownTime--;
        
        if (countdownTime > 0) {
          // Atualizar contador no Firebase para outros jogadores
          update(ref(db, `games/${createdGameId}/gameState`), {
            countdownTime: countdownTime
          });
          console.log(`⏰ Contador simplificado: ${countdownTime}`);
        } else {
          // Acabou o contador - iniciar primeira pergunta
          clearInterval(countdownInterval);
          console.log("🏁 Contador terminado - iniciando primeira pergunta!");
          countdownActive = false; // Marcar countdown como terminado
          
          // Atualizar Firebase para iniciar primeira pergunta
          update(ref(db, `games/${createdGameId}/gameState`), {
            currentQuestionIndex: 0,
            timeLeft: 10,
            questionStartTime: Date.now(),
            countdown: false,
            countdownTime: 0
          });
          
          // Iniciar controlador automático
          startGameController();
        }
      }, 1000);
      return;
    }
    
    // Mostrar contador no painel integrado do jogador 1
    integratedQuizSection.style.display = "block";
    currentQuestionDisplay.style.display = "block";
    if (player1AnswerSection) player1AnswerSection.style.display = "none";
    
    // Mostrar contador - criar elemento temporário para o countdown
    questionText.textContent = "🎮 O jogo vai começar em...";
    
    // Criar elemento temporário para o número do countdown
    const countdownElement = document.createElement("div");
    countdownElement.id = "tempCountdown";
    countdownElement.style.fontSize = "48px";
    countdownElement.style.color = "#FF6B35";
    countdownElement.style.textAlign = "center";
    countdownElement.style.fontWeight = "bold";
    countdownElement.style.marginTop = "20px";
    countdownElement.textContent = countdownTime;
    
    // Adicionar o elemento depois do questionText
    questionText.parentNode.appendChild(countdownElement);
    
    const countdownInterval = setInterval(() => {
      countdownTime--;
      
      if (countdownTime > 0) {
        // Atualizar contador no Firebase para outros jogadores
        update(ref(db, `games/${createdGameId}/gameState`), {
          countdownTime: countdownTime
        });
        
        // Atualizar display do jogador 1 (com verificação)
        const tempCountdown = document.getElementById("tempCountdown");
        if (tempCountdown) {
          tempCountdown.textContent = countdownTime;
        }
        console.log(`⏰ Contador: ${countdownTime}`);
      } else {
        // Acabou o contador - iniciar primeira pergunta
        clearInterval(countdownInterval);
        console.log("🏁 Contador terminado - iniciando primeira pergunta!");
        countdownActive = false; // Marcar countdown como terminado
        
        // Resetar estilo do contador (com verificações) - remover elemento temporário
        const tempCountdown = document.getElementById("tempCountdown");
        if (tempCountdown) {
          tempCountdown.remove();
        }
        
        // Atualizar Firebase para iniciar primeira pergunta
        update(ref(db, `games/${createdGameId}/gameState`), {
          currentQuestionIndex: 0,
          timeLeft: 10,
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
          
          // Verificar se o jogador tem resposta para esta pergunta
          if (player.rounds && player.rounds[questionIndex]) {
            const playerAnswer = player.rounds[questionIndex].answer;
            const selectedAnswer = player.rounds[questionIndex].selectedAnswer;
            const timeExpired = player.rounds[questionIndex].timeExpired;
            
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
          } else {
            // Jogador não tem registro para esta pergunta
            noAnswerCount++;
            console.log(`⏰ ${playerName}: SEM RESPOSTA (sem registro da ronda)`);
          }
        });
        
        // Atualizar estado do jogo para mostrar estatísticas
        await update(ref(db, `games/${createdGameId}/gameState`), {
          showingStatistics: true,
          statistics: {
            questionNumber: questionIndex + 1,
            totalPlayers: totalPlayers,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            noAnswers: noAnswerCount,
            correctPercentage: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0
          }
        });
        
        console.log(`📊 Estatísticas: ${correctCount} certas, ${wrongCount} erradas, ${noAnswerCount} sem resposta`);
        
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
        
        // Aguardar 5 segundos, mostrar estatísticas, e depois mais 5 segundos antes da próxima pergunta
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
    
    // Mostrar o botão "Iniciar Jogo"
    document.getElementById("beginGameBtn").style.display = "inline-block";
    
    // Inicializar como jogador 1 integrado
    initializeIntegratedPlayer1();
  }

  // Variáveis para o jogo integrado
  let integratedQuestions = [];
  let integratedCurrentQuestion = -1; // Começar em -1 para detectar a primeira pergunta corretamente
  let integratedPlayerScore = 0;
  let integratedPlayerAnswer = null;
  let integratedGameActive = false;
  let integratedAnswerProcessed = false; // Controla se a resposta já foi processada
  let countdownActive = false; // Nova variável para rastrear countdown

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
    
    // Configurar botões de resposta do Jogador 1
    setupIntegratedPlayer1Answers();
    
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
        
        if (statusText) statusText.textContent = "🎮 Jogo ativo!";
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
        integratedAnswerProcessed = false; // Reset para nova pergunta
        
        // Recarregar perguntas se necessário
        if (integratedQuestions.length === 0) {
          console.log("📚 Recarregando perguntas...");
          loadIntegratedQuestions();
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
    // PROTEÇÃO EXTRA: Não mostrar se countdown ainda estiver ativo
    if (countdownActive) {
      console.log("🚫 Tentativa de mostrar pergunta durante countdown - bloqueada");
      return;
    }
    
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
    
    // Atualizar título com formato: "Pergunta X de 10 [numero_original]" onde [numero_original] é do card
    if (questionTitle) {
      questionTitle.innerHTML = 
        `Pergunta ${integratedCurrentQuestion + 1} de ${integratedQuestions.length} <span style="font-size: 0.7em; color: #2d3748; font-weight: 600;">[${question.numero}]</span>`;
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
    
    // Atualizar botões com o texto das respostas (sem mostrar A), B), C), D))
    const options = question.hipoteses_resposta;
    if (options && options.length >= 4) {
      const answerButtons = document.querySelectorAll(".player1-answer-btn");
      if (answerButtons.length >= 4) {
        answerButtons[0].textContent = options[0]; // Só o texto
        answerButtons[1].textContent = options[1];
        answerButtons[2].textContent = options[2];
        answerButtons[3].textContent = options[3];
        
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
    document.getElementById("player1AnswerSection").style.display = "block";
    
    // Reset da resposta para nova pergunta
    integratedPlayerAnswer = null; // Reset da variável de resposta
    document.getElementById("player1Answer").textContent = "";
    resetIntegratedAnswerButtons();
    
    console.log("🔄 Resposta do jogador 1 resetada para nova pergunta");
    
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
      btn.style.fontWeight = "";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.disabled = false;
    });
  }

  // Função para atualizar timer integrado
  function updateIntegratedTimer(questionStartTime) {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const timeLeft = Math.max(0, 10 - elapsed);
      
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
    statsDisplay.innerHTML = `
      <div class="statistics-header">
        <h3>📊 Estatísticas da Pergunta ${statistics.questionNumber}</h3>
      </div>
      <div class="statistics-content">
        <div class="stat-item correct">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.correctAnswers}</div>
            <div class="stat-label">Respostas Certas</div>
            <div class="stat-percentage">${statistics.correctPercentage}%</div>
          </div>
        </div>
        <div class="stat-item wrong">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.wrongAnswers}</div>
            <div class="stat-label">Respostas Erradas</div>
            <div class="stat-percentage">${Math.round((statistics.wrongAnswers / statistics.totalPlayers) * 100)}%</div>
          </div>
        </div>
        <div class="stat-item no-answer">
          <div class="stat-icon">⏰</div>
          <div class="stat-info">
            <div class="stat-number">${statistics.noAnswers}</div>
            <div class="stat-label">Sem Resposta</div>
            <div class="stat-percentage">${Math.round((statistics.noAnswers / statistics.totalPlayers) * 100)}%</div>
          </div>
        </div>
      </div>
      <div class="statistics-footer">
        <p>Total de jogadores: <strong>${statistics.totalPlayers}</strong></p>
      </div>
    `;
  }

  // Função para mostrar resultados da resposta integrada
  function showIntegratedAnswerResults() {
    // Verificar se já foi processado para evitar duplicação
    if (integratedAnswerProcessed) {
      console.log("⚠️ Resposta já processada, ignorando chamada duplicada");
      return;
    }
    
    const question = integratedQuestions[integratedCurrentQuestion];
    const correctAnswer = question.resposta;
    
    // Usar a nova função para mostrar feedback visual (sem resposta = só borda)
    applyIntegratedAnswerFeedback(correctAnswer, false); // false = sem resposta
    
    // Encontrar qual é a resposta correta (índice)
    let correctIndex = -1;
    for (let i = 0; i < question.hipoteses_resposta.length; i++) {
      if (question.hipoteses_resposta[i] === correctAnswer) {
        correctIndex = i;
        break;
      }
    }
    
    if (!integratedPlayerAnswer) {
      console.log("🚫 Jogador 1 não respondeu - aplicando 0 pontos");
      // Não mostrar mensagem ao jogador 1
      
      // Ausência de resposta = 0 pontos (não usar pointsWrong)
      const pointsForNoAnswer = 0;
      integratedPlayerScore += pointsForNoAnswer;
      console.log(`⏰ SEM RESPOSTA: +${pointsForNoAnswer} pontos | Total: ${integratedPlayerScore}`);
      
      const roundData = {
        questionIndex: integratedCurrentQuestion,
        questionText: question.pergunta,
        selectedAnswer: null, // Nenhuma resposta selecionada
        correctAnswer: correctAnswer,
        isCorrect: false,
        pointsEarned: pointsForNoAnswer, // 0 pontos para ausência de resposta
        timestamp: Date.now(),
        timeExpired: true // Flag para indicar que o tempo expirou
      };
      
      // Nova estrutura: Guardar na pergunta com todas as respostas dos jogadores
      const questionData = {
        question: question.pergunta,
        options: question.hipoteses_resposta,
        correctAnswer: correctAnswer,
        questionIndex: integratedCurrentQuestion
      };
      
      // Dados da resposta do jogador 1 (tempo esgotado)
      const playerAnswerData = {
        answer: null,
        points: pointsForNoAnswer, // Usar 0 pontos em vez de pointsWrong
        isCorrect: false,
        timestamp: Date.now(),
        timeExpired: true
      };
      
      // Atualizar ambas as estruturas no Firebase
      const updates = {};
      updates[`games/${createdGameId}/players/${creatorName}/score`] = integratedPlayerScore;
      updates[`games/${createdGameId}/players/${creatorName}/rounds/${integratedCurrentQuestion}`] = roundData;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/question`] = questionData.question;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/options`] = questionData.options;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/correctAnswer`] = questionData.correctAnswer;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/questionIndex`] = questionData.questionIndex;
      updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/playerAnswers/${creatorName}`] = playerAnswerData;
      
      update(ref(db), updates)
        .then(() => console.log("✅ Registo de tempo esgotado e resultado da pergunta do jogador 1 guardados"))
        .catch(err => console.error("❌ Erro ao guardar registo do jogador 1:", err));
      
      return;
    }
    
    // Converter letra para índice (A=0, B=1, C=2, D=3)
    const answerIndex = integratedPlayerAnswer.charCodeAt(0) - 65; // A=65 em ASCII
    const selectedAnswer = question.hipoteses_resposta[answerIndex];
    
    const isCorrect = selectedAnswer === correctAnswer;
    console.log(`🔍 Resposta: ${selectedAnswer}, Correta: ${correctAnswer}, Está certo: ${isCorrect}`);
    
    // Aplicar feedback visual (com resposta = cores completas)
    applyIntegratedAnswerFeedback(correctAnswer, true); // true = com resposta
    
    if (isCorrect) {
      const pointsCorrect = parseInt(document.getElementById("pointsCorrect").value);
      integratedPlayerScore += pointsCorrect;
      console.log(`✅ Resposta CERTA: +${pointsCorrect} pontos | Total: ${integratedPlayerScore}`);
      // Não mostrar mensagem ao jogador 1
    } else {
      const pointsWrong = parseInt(document.getElementById("pointsWrong").value);
      integratedPlayerScore += pointsWrong;
      console.log(`❌ Resposta ERRADA: ${pointsWrong} pontos | Total: ${integratedPlayerScore}`);
      // Não mostrar mensagem ao jogador 1
    }
    
    // Calcular pontos ganhos nesta ronda
    const pointsThisRound = isCorrect ? 
      parseInt(document.getElementById("pointsCorrect").value) : 
      parseInt(document.getElementById("pointsWrong").value);
    
    // Guardar resposta detalhada desta ronda na base de dados (estrutura antiga - mantida para compatibilidade)
    const roundData = {
      questionIndex: integratedCurrentQuestion,
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
      questionIndex: integratedCurrentQuestion
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
    updates[`games/${createdGameId}/players/${creatorName}/rounds/${integratedCurrentQuestion}`] = roundData;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/question`] = questionData.question;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/options`] = questionData.options;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/correctAnswer`] = questionData.correctAnswer;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/questionIndex`] = questionData.questionIndex;
    updates[`games/${createdGameId}/questionResults/${integratedCurrentQuestion}/playerAnswers/${creatorName}`] = playerAnswerData;
    
    update(ref(db), updates)
      .then(() => {
        console.log("✅ Score, resposta da ronda e resultado da pergunta do jogador 1 atualizados");
        integratedAnswerProcessed = true; // Marcar como processado
      })
      .catch(err => console.error("❌ Erro ao atualizar dados do jogador 1:", err));
  }

  // Função para mostrar resultados finais integrados
  function showIntegratedFinalResults() {
    document.getElementById("statusText").textContent = "🏁 Jogo Terminado!";
    document.getElementById("currentQuestionDisplay").style.display = "none";
    document.getElementById("player1AnswerSection").style.display = "none";
    document.getElementById("timerDisplay").textContent = "🎉 Fim do Jogo!";
    
    // Mostrar botões finais
    document.getElementById("finalButtons").style.display = "block";
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
  function applyIntegratedAnswerFeedback(correctAnswer, hasAnswer = true) {
    const question = integratedQuestions[integratedCurrentQuestion];
    const buttons = document.querySelectorAll(".player1-answer-btn");
    
    // Encontrar qual letra (A, B, C, D) corresponde à resposta correta
    let correctAnswerLetter = null;
    for (let i = 0; i < question.hipoteses_resposta.length; i++) {
      if (question.hipoteses_resposta[i] === correctAnswer) {
        correctAnswerLetter = String.fromCharCode(65 + i); // A=65, B=66, C=67, D=68
        break;
      }
    }
    
    console.log(`🎯 Resposta correta: "${correctAnswer}" = Letra: ${correctAnswerLetter}`);
    console.log(`👤 Jogador escolheu: ${integratedPlayerAnswer}`);
    console.log(`📝 Tem resposta: ${hasAnswer}`);
    
    buttons.forEach(button => {
      const buttonAnswer = button.dataset.answer; // A, B, C, ou D
      
      // Remover todas as classes de feedback primeiro
      button.classList.remove('selected', 'correct', 'incorrect', 'correct-border-only');
      
      if (buttonAnswer === correctAnswerLetter) {
        if (hasAnswer) {
          // Com resposta: mostrar cor verde completa
          button.classList.add('correct');
          console.log(`✅ Botão ${buttonAnswer} marcado como correto (verde completo)`);
        } else {
          // Sem resposta: apenas destacar borda (adicionar classe especial)
          button.classList.add('correct-border-only');
          console.log(`🔲 Botão ${buttonAnswer} marcado com borda correta apenas`);
        }
      } else if (hasAnswer && buttonAnswer === integratedPlayerAnswer && integratedPlayerAnswer !== correctAnswerLetter) {
        // Só mostrar vermelho se houve resposta e foi errada
        button.classList.add('incorrect');
        console.log(`❌ Botão ${buttonAnswer} marcado como incorreto (vermelho)`);
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

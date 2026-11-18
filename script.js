// ============================================================
// NÚCLEO — A Jornada do Dado
// script.js — Lógica, Estado, Cenas 3D, Cruzadinha e Acessibilidade
// ============================================================

(function () {
  'use strict';

  // --- 1. ESTADO GLOBAL DO JOGO ---
  var estado = {
    telaAtual: 'tela-inicio',
    somAtivado: false,
    reduzirMovimento: false,
    tempoInicio: Date.now(),
    tempoTotalSegundos: 0,
    
    // Progresso da Jornada
    jornada: {
      faseAtual: 1,
      termoAtualId: null,
      filaTermos: [],
      descobertos: {}, // id -> { estrelas: 3, erros: 0, dicasUsadas: [] }
      estrelasTotais: 0
    },

    // Estado da Cruzadinha
    cruzadinha: {
      modoEntrada: 'digitar', // 'digitar' ou 'arrastar'
      grade: {}, // "r,c" -> letra digitada
      palavraAtivaId: null,
      direcaoAtiva: 'H', // 'H' ou 'V'
      celulaAtiva: { r: -1, c: -1 },
      palavrasConferidas: {}, // id -> 'certa' | 'errada' | 'pendente'
      acertos: 0
    }
  };

  // Áudio com Web Audio API (sem dependência de arquivos externos)
  var audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      try {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
      } catch (e) {
        console.warn('Web Audio API não suportada ou bloqueada.');
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function tocarSom(tipo) {
    if (!estado.somAtivado) return;
    initAudio();
    if (!audioCtx) return;

    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var agora = audioCtx.currentTime;

      if (tipo === 'acerto') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, agora); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, agora + 0.15); // G5
        gain.gain.setValueAtTime(0.18, agora);
        gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.3);
        osc.start(agora);
        osc.stop(agora + 0.3);
      } else if (tipo === 'erro') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, agora); // A3
        osc.frequency.linearRampToValueAtTime(146.83, agora + 0.18); // D3
        gain.gain.setValueAtTime(0.15, agora);
        gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.25);
        osc.start(agora);
        osc.stop(agora + 0.25);
      } else if (tipo === 'clique') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, agora);
        gain.gain.setValueAtTime(0.06, agora);
        gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.05);
        osc.start(agora);
        osc.stop(agora + 0.05);
      } else if (tipo === 'vitoria') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, agora);
        osc.frequency.setValueAtTime(554.37, agora + 0.1);
        osc.frequency.setValueAtTime(659.25, agora + 0.2);
        osc.frequency.setValueAtTime(880, agora + 0.3);
        gain.gain.setValueAtTime(0.2, agora);
        gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.6);
        osc.start(agora);
        osc.stop(agora + 0.6);
      }
    } catch (e) {
      // Ignora falha de áudio
    }
  }

  // --- 2. PERSISTÊNCIA EM LOCALSTORAGE ---
  var CHAVE_STORAGE = 'nucleo_jogo_arqcomp_v1';

  function salvarEstado() {
    try {
      var dadosSalvar = {
        somAtivado: estado.somAtivado,
        reduzirMovimento: estado.reduzirMovimento,
        tempoTotalSegundos: estado.tempoTotalSegundos + Math.floor((Date.now() - estado.tempoInicio) / 1000),
        jornada: estado.jornada,
        cruzadinha: {
          grade: estado.cruzadinha.grade,
          palavrasConferidas: estado.cruzadinha.palavrasConferidas,
          acertos: estado.cruzadinha.acertos
        }
      };
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dadosSalvar));
    } catch (e) {
      console.warn('Não foi possível salvar no localStorage:', e);
    }
  }

  function carregarEstado() {
    try {
      var salvo = localStorage.getItem(CHAVE_STORAGE);
      if (!salvo) return false;
      var obj = JSON.parse(salvo);
      if (obj.jornada) {
        estado.jornada = obj.jornada;
        // Migração suave de versões anteriores:
        // Garante que termos já registrados ou com estrelas sejam reconhecidos com acertou: true
        if (estado.jornada.descobertos) {
          for (var tid in estado.jornada.descobertos) {
            if (estado.jornada.descobertos.hasOwnProperty(tid)) {
              var reg = estado.jornada.descobertos[tid];
              if (reg && reg.acertou === undefined) {
                reg.acertou = true;
              }
            }
          }
        }
        sincronizarProgressoFases();
      }
      if (obj.somAtivado !== undefined) estado.somAtivado = obj.somAtivado;
      if (obj.reduzirMovimento !== undefined) estado.reduzirMovimento = obj.reduzirMovimento;
      if (obj.tempoTotalSegundos) estado.tempoTotalSegundos = obj.tempoTotalSegundos;
      if (obj.cruzadinha) {
        if (obj.cruzadinha.grade) estado.cruzadinha.grade = obj.cruzadinha.grade;
        if (obj.cruzadinha.palavrasConferidas) estado.cruzadinha.palavrasConferidas = obj.cruzadinha.palavrasConferidas;
        if (obj.cruzadinha.acertos !== undefined) estado.cruzadinha.acertos = obj.cruzadinha.acertos;
      }
      return true;
    } catch (e) {
      console.warn('Erro ao carregar do localStorage:', e);
      return false;
    }
  }

  function limparProgresso() {
    try {
      localStorage.removeItem(CHAVE_STORAGE);
    } catch (e) {}
    estado.jornada = {
      faseAtual: 1,
      termoAtualId: null,
      filaTermos: [],
      descobertos: {},
      estrelasTotais: 0
    };
    estado.cruzadinha.grade = {};
    estado.cruzadinha.palavrasConferidas = {};
    estado.cruzadinha.acertos = 0;
    salvarEstado();
  }

  // --- HELPERS DE PROGRESSO DA JORNADA ---
  function termoEstaDescoberto(id) {
    return !!(estado.jornada &&
              estado.jornada.descobertos &&
              estado.jornada.descobertos[id] &&
              estado.jornada.descobertos[id].acertou);
  }

  function contarTermosDescobertos() {
    var cont = 0;
    for (var i = 0; i < TERMOS.length; i++) {
      if (termoEstaDescoberto(TERMOS[i].id)) cont++;
    }
    return cont;
  }

  function faseEstaConcluida(faseId) {
    var fase = null;
    for (var i = 0; i < FASES.length; i++) {
      if (FASES[i].id === faseId) { fase = FASES[i]; break; }
    }
    if (!fase) return false;
    for (var t = 0; t < fase.termos.length; t++) {
      if (!termoEstaDescoberto(fase.termos[t])) return false;
    }
    return true;
  }

  function faseEstaDisponivel(faseId) {
    if (faseId === 1) return true;
    if (faseEstaConcluida(faseId - 1)) return true;
    if (estado.jornada.faseAtual >= faseId) return true;
    return false;
  }

  function sincronizarProgressoFases() {
    var maxFaseLiberada = 1;
    for (var f = 1; f <= 5; f++) {
      if (faseEstaConcluida(f)) {
        maxFaseLiberada = Math.min(5, f + 1);
      }
    }
    if (maxFaseLiberada > estado.jornada.faseAtual) {
      estado.jornada.faseAtual = maxFaseLiberada;
    }
  }

  // --- 3. NAVEGAÇÃO ENTRE TELAS ---
  var controleCenaAtiva = { cancelada: false };

  function irPara(idTela) {
    try {
      tocarSom('clique');
    } catch (e) {}

    // Se estava na cena e saiu, cancela coroutines
    if (estado.telaAtual === 'tela-cena' && idTela !== 'tela-cena') {
      controleCenaAtiva.cancelada = true;
    }

    var telas = document.querySelectorAll('[data-tela]');
    for (var i = 0; i < telas.length; i++) {
      telas[i].classList.remove('ativa');
    }

    var destino = document.querySelector('[data-tela="' + idTela + '"]');
    if (destino) {
      destino.classList.add('ativa');
      estado.telaAtual = idTela;
    }

    // Gerencia o menu superior
    var menu = document.getElementById('menu-topo');
    if (menu) {
      if (idTela === 'tela-inicio') {
        menu.classList.add('oculto');
      } else {
        menu.classList.remove('oculto');
        var btnsMenu = menu.querySelectorAll('.menu-btn');
        for (var b = 0; b < btnsMenu.length; b++) {
          btnsMenu[b].classList.remove('ativo');
          if (btnsMenu[b].getAttribute('data-ir') === idTela) {
            btnsMenu[b].classList.add('ativo');
          }
        }
      }
    }

    // Ações ao entrar em telas específicas
    try {
      if (idTela === 'tela-mapa') {
        renderizarMapa();
      } else if (idTela === 'tela-cruzadinha') {
        sincronizarGradeCruzadinha();
      } else if (idTela === 'tela-final') {
        renderizarTelaFinal();
      }
    } catch (err) {
      console.warn('Erro ao atualizar tela:', err);
    }

    salvarEstado();
  }

  // --- 4. PRÓLOGO ---
  function iniciarPrologo() {
    irPara('tela-prologo');
    var l1 = document.getElementById('prologo-linha1');
    var l2 = document.getElementById('prologo-linha2');
    var l3 = document.getElementById('prologo-linha3');
    if (!l1 || !l2 || !l3) return;

    l1.textContent = '';
    l2.textContent = '';
    l3.textContent = '';

    var frases = [
      'Você é um dado.',
      'Dentro de cada computador existe uma estrada fascinante.',
      'Descubra cada parada do caminho para acordar o Núcleo.'
    ];

    if (estado.reduzirMovimento) {
      l1.textContent = frases[0];
      l2.textContent = frases[1];
      l3.textContent = frases[2];
      setTimeout(function () {
        if (estado.telaAtual === 'tela-prologo') irPara('tela-mapa');
      }, 1500);
      return;
    }

    function digitarFrase(el, texto, cb) {
      var i = 0;
      var timer = setInterval(function () {
        el.textContent += texto.charAt(i);
        i++;
        if (i >= texto.length) {
          clearInterval(timer);
          if (cb) setTimeout(cb, 500);
        }
      }, 30);
    }

    digitarFrase(l1, frases[0], function () {
      digitarFrase(l2, frases[1], function () {
        digitarFrase(l3, frases[2], function () {
          setTimeout(function () {
            if (estado.telaAtual === 'tela-prologo') {
              irPara('tela-mapa');
            }
          }, 1200);
        });
      });
    });
  }

  // --- 5. MAPA DE FASES ---
  function renderizarMapa() {
    sincronizarProgressoFases();
    var container = document.getElementById('mapa-container');
    var progressoTxt = document.getElementById('mapa-progresso-texto');
    if (!container) return;

    container.innerHTML = '';
    var totalDescobertos = contarTermosDescobertos();
    if (progressoTxt) progressoTxt.textContent = totalDescobertos + ' / 16 termos descobertos';

    for (var f = 0; f < FASES.length; f++) {
      var fase = FASES[f];
      var descobertosFase = 0;
      var estrelasFase = 0;

      for (var t = 0; t < fase.termos.length; t++) {
        var tid = fase.termos[t];
        if (termoEstaDescoberto(tid)) {
          descobertosFase++;
          estrelasFase += ((estado.jornada.descobertos[tid] && estado.jornada.descobertos[tid].estrelas) || 3);
        }
      }

      var disponivel = faseEstaDisponivel(fase.id);
      var concluida = (descobertosFase === fase.termos.length);

      var no = document.createElement('div');
      no.className = 'mapa-no painel-vidro ' + (concluida ? 'concluido' : (disponivel ? 'disponivel' : 'bloqueado'));
      no.setAttribute('role', 'listitem');
      no.setAttribute('data-fase-id', fase.id);

      var html = '<div class="no-info">' +
        '<div class="no-titulo">FASE ' + fase.id + ' — ' + fase.nome + '</div>' +
        '<div class="no-termos">' + descobertosFase + ' de ' + fase.termos.length + ' termos</div>' +
        '</div>' +
        '<div class="no-status">' +
        (concluida ? '<span class="no-estrelas">⭐ ' + estrelasFase + '</span>' : (disponivel ? '<span style="color:var(--cyan)">DISPONÍVEL</span>' : '<span style="color:var(--muted)">BLOQUEADA</span>')) +
        '</div>';

      no.innerHTML = html;

      (function (faseId, estaDisponivel) {
        no.addEventListener('click', function () {
          if (estaDisponivel) {
            iniciarFase(faseId);
          } else {
            tocarSom('erro');
          }
        });
      })(fase.id, disponivel);

      container.appendChild(no);
    }
  }

  function iniciarFase(faseId) {
    var fase = null;
    for (var i = 0; i < FASES.length; i++) {
      if (FASES[i].id === faseId) { fase = FASES[i]; break; }
    }
    if (!fase) return;

    // Constrói a fila com termos da fase que ainda não foram descobertos
    var fila = [];
    for (var t = 0; t < fase.termos.length; t++) {
      var tid = fase.termos[t];
      if (!termoEstaDescoberto(tid)) {
        fila.push(tid);
      }
    }
    // Se todos já foram descobertos, permite navegar por todos eles
    if (fila.length === 0) {
      fila = fase.termos.slice();
    }

    estado.jornada.filaTermos = fila;
    carregarTermoCena(fila[0]);
    irPara('tela-cena');
  }

  // --- 6. MOTOR DA CENA 3D (JORNADA) ---
  var cenaAnimacaoId = null;

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, estado.reduzirMovimento ? 10 : ms);
    });
  }

  function focarCamera(x, y, z, rotX, rotZ) {
    var raiz = document.documentElement;
    raiz.style.setProperty('--cam-x', (x || 0) + 'px');
    raiz.style.setProperty('--cam-y', (y || 0) + 'px');
    raiz.style.setProperty('--cam-z', (z || 0) + 'px');
    if (rotX !== undefined) raiz.style.setProperty('--cam-rot-x', rotX + 'deg');
    if (rotZ !== undefined) raiz.style.setProperty('--cam-rot-z', rotZ + 'deg');
  }

  function obterTermo(id) {
    for (var i = 0; i < TERMOS.length; i++) {
      if (TERMOS[i].id === id) return TERMOS[i];
    }
    return null;
  }

  function carregarTermoCena(termoId) {
    var termo = obterTermo(termoId);
    if (!termo) return;
    estado.jornada.termoAtualId = termoId;
    controleCenaAtiva.cancelada = true;
    controleCenaAtiva = { cancelada: false };

    // Atualiza HUD
    var hudFase = document.getElementById('cena-fase-nome');
    if (hudFase) hudFase.textContent = 'Fase ' + termo.fase;

    var estrelasHUD = document.getElementById('cena-estrelas');
    if (estrelasHUD) estrelasHUD.textContent = '⭐ ' + estado.jornada.estrelasTotais;

    var barraPreench = document.querySelector('.cena-progresso-preench');
    var txtProg = document.getElementById('cena-progresso-texto');
    var faseObj = FASES[termo.fase - 1];
    if (faseObj) {
      var descobertosFase = 0;
      for (var k = 0; k < faseObj.termos.length; k++) {
        if (termoEstaDescoberto(faseObj.termos[k])) descobertosFase++;
      }
      var perc = Math.round((descobertosFase / faseObj.termos.length) * 100);
      if (barraPreench) barraPreench.style.width = perc + '%';
      if (txtProg) txtProg.textContent = descobertosFase + '/' + faseObj.termos.length;
    }

    // Pista e dados
    var pNum = document.getElementById('pista-numero');
    var pFam = document.getElementById('pista-familia');
    var pTxt = document.getElementById('pista-texto');
    var card = document.getElementById('pista-card');
    
    // NUNCA expõe o ID ou o nome do termo no cabeçalho da pista!
    var indiceTermo = 1;
    for (var ti = 0; ti < TERMOS.length; ti++) {
      if (TERMOS[ti].id === termo.id) { indiceTermo = ti + 1; break; }
    }
    if (pNum) pNum.textContent = 'PARADA ' + (indiceTermo < 10 ? '0' : '') + indiceTermo + ' DE 16';
    if (pFam) {
      pFam.textContent = termo.familia;
      pFam.style.color = 'var(' + (FAMILIAS[termo.familia] || '--cyan') + ')';
    }
    if (pTxt) pTxt.textContent = termo.pista;
    if (card) card.setAttribute('data-familia', termo.familia);

    // Verifica se o termo já foi concluído anteriormente
    var jaDescoberto = termoEstaDescoberto(termo.id);

    var toggleContainer = document.getElementById('resposta-toggle-container');
    var areaDig = document.getElementById('resposta-digitar');
    var areaArr = document.getElementById('resposta-arrastar');
    var areaConc = document.getElementById('resposta-concluido');
    var estrelasConc = document.getElementById('concluido-estrelas');
    var btnProxConc = document.getElementById('btn-proximo-concluido');

    if (jaDescoberto) {
      // Termo já respondido: mostra badge e botões de ação em vez de forçar re-digitação
      if (toggleContainer) toggleContainer.classList.add('oculto');
      if (areaDig) areaDig.classList.add('oculto');
      if (areaArr) areaArr.classList.add('oculto');
      if (areaConc) areaConc.classList.remove('oculto');

      var estNum = (estado.jornada.descobertos[termo.id] && estado.jornada.descobertos[termo.id].estrelas) || 3;
      var strE = '';
      for (var s = 0; s < estNum; s++) strE += '⭐';
      if (estrelasConc) estrelasConc.textContent = strE;

      var proxPendente = null;
      if (faseObj) {
        for (var p = 0; p < faseObj.termos.length; p++) {
          var pId = faseObj.termos[p];
          if (!termoEstaDescoberto(pId)) {
            proxPendente = pId;
            break;
          }
        }
      }

      if (btnProxConc) {
        if (proxPendente) {
          btnProxConc.textContent = '▶ Próximo Pendente';
        } else if (faseEstaConcluida(termo.fase)) {
          btnProxConc.textContent = '🗺 Voltar ao Mapa';
        } else {
          btnProxConc.textContent = '▶ Próximo Termo';
        }
      }
    } else {
      // Termo pendente: exibe campo de resposta / arrasto
      if (toggleContainer) toggleContainer.classList.remove('oculto');
      if (areaConc) areaConc.classList.add('oculto');

      var btnModoArr = document.getElementById('btn-modo-arrastar');
      var ehArrastar = btnModoArr && btnModoArr.classList.contains('ativo');

      if (ehArrastar) {
        if (areaArr) areaArr.classList.remove('oculto');
        if (areaDig) areaDig.classList.add('oculto');
      } else {
        if (areaDig) areaDig.classList.remove('oculto');
        if (areaArr) areaArr.classList.add('oculto');
      }

      var inputResp = document.getElementById('input-resposta');
      if (inputResp) {
        inputResp.value = '';
        inputResp.focus();
      }
    }

    // Monta placa e componentes
    montarPlaca3D(termo);

    // Banco de palavras para modo arrastar
    montarBancoPalavrasCena(termo);

    // Inicia a cena animada sincronizada
    executarCenaAnimada(termo, controleCenaAtiva);
  }

  function avancarTermoConcluido() {
    var termoAtualId = estado.jornada.termoAtualId;
    var termo = obterTermo(termoAtualId);
    if (!termo) {
      irPara('tela-mapa');
      return;
    }

    var faseObj = FASES[termo.fase - 1];
    if (!faseObj) {
      irPara('tela-mapa');
      return;
    }

    // Procura próximo termo não descoberto na fase
    var proxId = null;
    for (var i = 0; i < faseObj.termos.length; i++) {
      var tid = faseObj.termos[i];
      if (!termoEstaDescoberto(tid)) {
        proxId = tid;
        break;
      }
    }

    if (proxId) {
      carregarTermoCena(proxId);
    } else {
      sincronizarProgressoFases();
      var totalDesc = contarTermosDescobertos();
      if (totalDesc >= 16) {
        irPara('tela-final');
      } else {
        irPara('tela-mapa');
      }
    }
  }

  // Componentes estruturais físicos da placa-mãe (700x480) — Visão Completa e Estática
  var COMPONENTES_PLACA = [
    // LINHA SUPERIOR: MEMÓRIAS PERMANENTES & BOOT (Âmbar)
    { id: 'rom',     x: 25,  y: 25,  w: 90,  h: 52,  fam: 'permanente', icone: '💾', tipo: 'dip' },
    { id: 'eeprom',  x: 130, y: 25,  w: 90,  h: 52,  fam: 'permanente', icone: '⚡', tipo: 'soic' },
    { id: 'flash',   x: 235, y: 25,  w: 95,  h: 52,  fam: 'permanente', icone: '📦', tipo: 'nand' },
    { id: 'massa',   x: 545, y: 25,  w: 130, h: 80,  fam: 'permanente', icone: '💿', tipo: 'disco' },
    
    // LINHA MÉDIA-ALTA: DMA & RAM
    { id: 'dma',     x: 390, y: 110, w: 90,  h: 50,  fam: 'barramento', icone: '🔄', tipo: 'dma' },
    { id: 'ram',     x: 25,  y: 110, w: 260, h: 55,  fam: 'volatil',   icone: '📶', tipo: 'dimm' },
    
    // LINHA MÉDIA: BARRAMENTOS (Trilhas entre CPU e RAM)
    { id: 'addrbus', x: 70,  y: 190, w: 230, h: 32,  fam: 'barramento', icone: '➡️', tipo: 'bus-h' },
    { id: 'databus', x: 70,  y: 235, w: 230, h: 32,  fam: 'barramento', icone: '↔️', tipo: 'bus-h' },
    
    // LINHA MÉDIA-DIREITA: MICROCONTROLADOR
    { id: 'micro',   x: 545, y: 135, w: 130, h: 90,  fam: 'chip',       icone: '🤖', tipo: 'qfp' },
    
    // LINHA INFERIOR-ESQUERDA: CACHE
    { id: 'cache',   x: 40,  y: 310, w: 95,  h: 75,  fam: 'cerebro',    icone: '⚡', tipo: 'cache' },
    
    // LINHA INFERIOR-CENTRO: O CÉREBRO (CPU) E SEUS BLOCOS
    { id: 'cpu',     x: 170, y: 295, w: 280, h: 165, fam: 'cerebro',    icone: '🧠', tipo: 'cpu' },
    { id: 'uc',      x: 185, y: 340, w: 80,  h: 50,  fam: 'cerebro',    icone: '🎛️', tipo: 'bloco-interno' },
    { id: 'ula',     x: 275, y: 340, w: 80,  h: 50,  fam: 'cerebro',    icone: '➕', tipo: 'bloco-interno' },
    { id: 'reg',     x: 365, y: 340, w: 75,  h: 50,  fam: 'cerebro',    icone: '📑', tipo: 'bloco-interno' },
    
    // LINHA INFERIOR-DIREITA: PROCESSADORES MULTI-CORE
    { id: 'dual',    x: 480, y: 320, w: 95,  h: 95,  fam: 'chip',       icone: '👥', tipo: 'multi-core' },
    { id: 'quad',    x: 590, y: 320, w: 95,  h: 95,  fam: 'chip',       icone: '👥', tipo: 'multi-core' }
  ];

  function obterConfigComponente(id) {
    for (var i = 0; i < COMPONENTES_PLACA.length; i++) {
      if (COMPONENTES_PLACA[i].id === id) return COMPONENTES_PLACA[i];
    }
    return COMPONENTES_PLACA[0];
  }

  // Animação de decodificação de letras (letras embaralhadas -> nome real)
  function decodificarTexto(elemento, textoFinal, duracaoMs) {
    if (!elemento) return;
    if (estado.reduzirMovimento) {
      elemento.textContent = textoFinal;
      return;
    }
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*!?';
    var duracao = duracaoMs || 400;
    var passos = Math.floor(duracao / 30);
    var cont = 0;
    var timer = setInterval(function () {
      cont++;
      var str = '';
      for (var i = 0; i < textoFinal.length; i++) {
        if (i < Math.floor((cont / passos) * textoFinal.length)) {
          str += textoFinal.charAt(i);
        } else {
          str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }
      elemento.textContent = str;
      if (cont >= passos) {
        clearInterval(timer);
        elemento.textContent = textoFinal;
      }
    }, 30);
  }

  // Componentes na placa-mãe (visao estatica)
  function montarPlaca3D(termoAtual) {
    var container = document.getElementById('container-componentes');
    if (!container) return;
    container.innerHTML = '';

    for (var i = 0; i < COMPONENTES_PLACA.length; i++) {
      var c = COMPONENTES_PLACA[i];
      var div = document.createElement('div');
      div.className = 'comp-3d tipo-' + c.tipo + ' ' + (c.id === termoAtual.id ? 'focado' : '');
      div.id = 'comp-' + c.id;
      div.style.left = c.x + 'px';
      div.style.top = c.y + 'px';
      div.style.width = c.w + 'px';
      div.style.height = c.h + 'px';
      div.setAttribute('data-id', c.id);

      var descoberto = termoEstaDescoberto(c.id);
      
      // REGRA INEGOCIÁVEL: NUNCA expõe o nome antes de o usuário acertar!
      var textoRotulo = descoberto ? obterTermo(c.id).nome : '???';
      var textoFace = descoberto ? obterTermo(c.id).resposta : '???';

      var corpo = document.createElement('div');
      corpo.className = 'comp-corpo';

      var topo = document.createElement('div');
      topo.className = 'comp-topo';
      topo.style.borderColor = 'var(' + (FAMILIAS[c.fam] || '--cyan') + ')';

      var iconeSpan = document.createElement('span');
      iconeSpan.className = 'comp-topo-icone';
      iconeSpan.textContent = c.icone;

      var textoSpan = document.createElement('span');
      textoSpan.className = 'comp-topo-texto ' + (descoberto ? 'revelado' : 'misterio');
      textoSpan.textContent = textoFace;

      topo.appendChild(iconeSpan);
      topo.appendChild(textoSpan);

      // Adiciona pinos metálicos decorativos nos chips
      if (c.tipo === 'dip' || c.tipo === 'soic' || c.tipo === 'nand') {
        var pTop = document.createElement('div');
        pTop.className = 'comp-pinos pinos-top';
        var pBottom = document.createElement('div');
        pBottom.className = 'comp-pinos pinos-bottom';
        topo.appendChild(pTop);
        topo.appendChild(pBottom);
      }

      // Rótulo nítido posicionado acima do componente
      var rotulo = document.createElement('div');
      rotulo.className = 'comp-rotulo ' + (descoberto ? 'revelado' : 'desconhecido');
      rotulo.id = 'rotulo-' + c.id;
      rotulo.textContent = textoRotulo;

      div.appendChild(corpo);
      div.appendChild(topo);
      div.appendChild(rotulo);
      container.appendChild(div);
    }

    // Mantém a placa centralizada e estática (visão completa de toda a estrutura)
    focarCameraComponente(obterConfigComponente(termoAtual.id));
  }

  function focarCameraComponente(c) {
    // Placa totalmente estática e nítida no centro
    focarCamera(0, 0, 0, 0, 0);
  }

  // Terminal de Narração com Typewriter
  function limparTerminal() {
    var corpo = document.getElementById('terminal-corpo');
    if (corpo) corpo.innerHTML = '';
  }

  function adicionarLinhaTerminal(texto, controle) {
    return new Promise(function (resolve) {
      if (controle && controle.cancelada) return resolve();
      var corpo = document.getElementById('terminal-corpo');
      if (!corpo) return resolve();

      var linha = document.createElement('div');
      linha.className = 'terminal-linha cursor';
      corpo.appendChild(linha);
      corpo.scrollTop = corpo.scrollHeight;

      if (estado.reduzirMovimento) {
        linha.textContent = texto;
        linha.classList.remove('cursor');
        return resolve();
      }

      var i = 0;
      var timer = setInterval(function () {
        if (controle && controle.cancelada) {
          clearInterval(timer);
          return resolve();
        }
        linha.textContent += texto.charAt(i);
        i++;
        corpo.scrollTop = corpo.scrollHeight;
        if (i >= texto.length) {
          clearInterval(timer);
          linha.classList.remove('cursor');
          resolve();
        }
      }, 25);
    });
  }

  // Pacote de dados animado via SVG e requestAnimationFrame
  function animarPacoteTrilha(caminhoD, duracaoMs, controle) {
    return new Promise(function (resolve) {
      var pacote = document.getElementById('pacote-dados');
      var svg = document.getElementById('trilhas-svg');
      if (!pacote || !svg || (controle && controle.cancelada)) return resolve();

      svg.innerHTML = '';
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', caminhoD);
      path.setAttribute('class', 'trilha-path ativa');
      svg.appendChild(path);

      var totalLen = path.getTotalLength();
      pacote.classList.remove('oculto');

      var inicio = null;
      function passo(timestamp) {
        if (controle && controle.cancelada) {
          pacote.classList.add('oculto');
          return resolve();
        }
        if (!inicio) inicio = timestamp;
        var decorrido = timestamp - inicio;
        var prog = Math.min(decorrido / duracaoMs, 1);
        var pt = path.getPointAtLength(prog * totalLen);

        pacote.style.left = pt.x + 'px';
        pacote.style.top = pt.y + 'px';

        if (prog < 1) {
          requestAnimationFrame(passo);
        } else {
          setTimeout(function () {
            pacote.classList.add('oculto');
            resolve();
          }, 150);
        }
      }

      requestAnimationFrame(passo);
    });
  }

  // Execução de cena com a placa estática e trilhas animadas
  async function executarCenaAnimada(termo, controle) {
    limparTerminal();

    var conf = obterConfigComponente(termo.id);
    focarCameraComponente(conf);

    if (termo.id === 'rom') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 15 50 L 70 50', 800, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'eeprom') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 100 50 L 175 50', 700, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
      await adicionarLinhaTerminal(termo.narracao[5], controle);
    } else if (termo.id === 'flash') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 205 50 L 280 50', 600, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'massa') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 520 65 L 610 65', 900, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'dma') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 545 65 L 435 135 L 285 135', 1200, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'ram') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 25 135 L 155 135 L 285 135', 800, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'addrbus') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 250 295 L 185 206 L 155 165', 1000, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'databus') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 270 295 L 185 251 L 155 165', 800, controle);
      await animarPacoteTrilha('M 155 165 L 185 251 L 270 295', 800, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'cpu') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 310 295 L 310 340 L 310 410', 700, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'uc') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 225 340 L 225 315 L 315 315 L 315 340', 900, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'ula') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 225 365 L 275 365 L 315 365', 700, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'reg') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 315 365 L 365 365', 600, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
      await adicionarLinhaTerminal(termo.narracao[5], controle);
    } else if (termo.id === 'cache') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 170 345 L 90 345', 600, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'micro') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 530 180 L 610 180', 800, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'dual') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 465 365 L 525 365', 700, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    } else if (termo.id === 'quad') {
      await adicionarLinhaTerminal(termo.narracao[0], controle);
      await animarPacoteTrilha('M 575 365 L 635 365', 700, controle);
      await adicionarLinhaTerminal(termo.narracao[1], controle);
      await adicionarLinhaTerminal(termo.narracao[2], controle);
      await adicionarLinhaTerminal(termo.narracao[3], controle);
      await adicionarLinhaTerminal(termo.narracao[4], controle);
    }
  }

  // Normalização de strings (remove acentos, espaços, hífens, pontuações)
  function normalizar(str) {
    if (!str) return '';
    return str
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');
  }

  // Verificação de Resposta na Cena
  function validarRespostaCena(respostaDigitada) {
    var termo = obterTermo(estado.jornada.termoAtualId);
    if (!termo) return;

    var inputNorm = normalizar(respostaDigitada);
    var gabaritoNorm = normalizar(termo.resposta);

    if (!estado.jornada.descobertos[termo.id]) {
      estado.jornada.descobertos[termo.id] = {
        estrelas: 3,
        erros: 0,
        dicasUsadas: [],
        acertou: false
      };
    }
    var regTermo = estado.jornada.descobertos[termo.id];

    if (inputNorm === gabaritoNorm) {
      // ACERTO
      var eraNovoAcerto = !regTermo.acertou;
      regTermo.acertou = true;
      if (eraNovoAcerto) {
        estado.jornada.estrelasTotais += (regTermo.estrelas || 3);
      }
      sincronizarProgressoFases();
      salvarEstado();

      tocarSom('acerto');
      
      // Decodifica e revela o rótulo com animação de letras embaralhadas
      var rotulo = document.getElementById('rotulo-' + termo.id);
      if (rotulo) {
        rotulo.classList.remove('desconhecido');
        rotulo.classList.add('revelado', 'snap-acerto');
        decodificarTexto(rotulo, termo.nome);
      }

      // Revela o nome na face do componente 3D (apenas agora após acertar!)
      var compEl = document.getElementById('comp-' + termo.id);
      if (compEl) {
        var textoSpan = compEl.querySelector('.comp-topo-texto');
        if (textoSpan) {
          textoSpan.classList.remove('misterio');
          textoSpan.classList.add('revelado');
          decodificarTexto(textoSpan, termo.resposta);
        }
      }

      // Preenche automaticamente na cruzadinha
      preencherPalavraNaCruzadinha(termo.id, termo.resposta);

      // Abre cartão de revelação após breve animação
      setTimeout(function () {
        abrirCartaoRevelacao(termo, regTermo.estrelas);
      }, 700);
    } else {
      // ERRO
      tocarSom('erro');
      regTermo.erros++;
      if (regTermo.erros >= 3 && regTermo.estrelas > 2) regTermo.estrelas = 2;
      if (regTermo.erros >= 5 && regTermo.estrelas > 1) regTermo.estrelas = 1;

      var input = document.getElementById('input-resposta');
      if (input) {
        input.classList.add('shake');
        setTimeout(function () { input.classList.remove('shake'); }, 400);
      }
      adicionarLinhaTerminal('> Sinal não reconhecido. Tente de novo.');
    }
  }

  // Preenche uma palavra na grade da cruzadinha com marcação de descoberta
  function preencherPalavraNaCruzadinha(termoId, resposta) {
    var itemLayout = null;
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].id === termoId) { itemLayout = LAYOUT[i]; break; }
    }
    if (!itemLayout) return;

    for (var k = 0; k < resposta.length; k++) {
      var r = itemLayout.direcao === 'H' ? itemLayout.linha : itemLayout.linha + k;
      var c = itemLayout.direcao === 'H' ? itemLayout.coluna + k : itemLayout.coluna;
      estado.cruzadinha.grade[r + ',' + c] = resposta.charAt(k);

      var input = document.querySelector('input[data-linha="' + r + '"][data-coluna="' + c + '"]');
      if (input) {
        input.value = resposta.charAt(k);
        input.parentElement.classList.add('jornada-revelada');
      }
    }
  }

  // Cartão de Revelação
  function abrirCartaoRevelacao(termo, estrelas) {
    var faixa = document.getElementById('cartao-familia-faixa');
    var nome = document.getElementById('cartao-nome');
    var def = document.getElementById('cartao-definicao');
    var vr = document.getElementById('cartao-vida-real-texto');
    var est = document.getElementById('cartao-estrelas');

    if (faixa) faixa.style.backgroundColor = 'var(' + (FAMILIAS[termo.familia] || '--cyan') + ')';
    if (nome) nome.textContent = termo.nome;
    if (def) def.textContent = termo.definicao;
    if (vr) vr.textContent = termo.vidaReal;

    var estrelasStr = '';
    for (var s = 0; s < estrelas; s++) estrelasStr += '⭐';
    if (est) est.textContent = estrelasStr;

    salvarEstado();
    irPara('tela-cartao');
  }

  function continuarAposCartao() {
    var termoAtualId = estado.jornada.termoAtualId;
    var fila = estado.jornada.filaTermos;
    var idx = fila.indexOf(termoAtualId);
    if (idx !== -1) {
      fila.splice(idx, 1);
    }

    sincronizarProgressoFases();

    if (fila.length > 0) {
      carregarTermoCena(fila[0]);
      irPara('tela-cena');
    } else {
      // Fase concluída! Libera próxima fase
      var termo = obterTermo(termoAtualId);
      if (termo && faseEstaConcluida(termo.fase) && estado.jornada.faseAtual <= termo.fase) {
        estado.jornada.faseAtual = Math.min(5, termo.fase + 1);
      }

      sincronizarProgressoFases();
      salvarEstado();

      var totalDescobertos = contarTermosDescobertos();
      if (totalDescobertos >= 16) {
        irPara('tela-final');
      } else {
        irPara('tela-mapa');
      }
    }
  }

  // Dicas na Cena
  function aplicarDica(nivel) {
    var termo = obterTermo(estado.jornada.termoAtualId);
    if (!termo) return;
    var menuDicas = document.getElementById('menu-dicas');
    if (menuDicas) menuDicas.classList.add('oculto');

    if (!estado.jornada.descobertos[termo.id]) {
      estado.jornada.descobertos[termo.id] = { estrelas: 3, erros: 0, dicasUsadas: [], acertou: false };
    }
    var reg = estado.jornada.descobertos[termo.id];

    if (nivel === 0) {
      adicionarLinhaTerminal('> [Dica 0] ' + termo.pista);
    } else if (nivel === 1) {
      reg.dicasUsadas.push(1);
      if (reg.estrelas > 2) reg.estrelas = 2;
      adicionarLinhaTerminal('> [Dica 1] ' + termo.dica1);
    } else if (nivel === 2) {
      reg.dicasUsadas.push(2);
      if (reg.estrelas > 1) reg.estrelas = 1;
      adicionarLinhaTerminal('> [Dica 2] Começa com a letra: ' + termo.resposta.charAt(0));
    }
  }

  function pularTermoCena() {
    var termoAtualId = estado.jornada.termoAtualId;
    var fila = estado.jornada.filaTermos;
    var idx = fila.indexOf(termoAtualId);
    if (idx !== -1) {
      fila.splice(idx, 1);
      fila.push(termoAtualId); // Manda para o fim da fila
    }
    if (fila.length > 0) {
      carregarTermoCena(fila[0]);
    }
  }

  // Banco de palavras para arrastar na cena
  function montarBancoPalavrasCena(termoAtual) {
    var banco = document.getElementById('banco-palavras-cena');
    if (!banco) return;
    banco.innerHTML = '';

    // Palavras da fase atual + distratores
    var faseObj = FASES[termoAtual.fase - 1];
    var listaIds = faseObj.termos.slice();

    // Adiciona até 3 distratores de outras fases
    var outros = TERMOS.filter(function (t) { return t.fase !== termoAtual.fase; });
    outros.sort(function () { return 0.5 - Math.random(); });
    for (var d = 0; d < Math.min(3, outros.length); d++) {
      listaIds.push(outros[d].id);
    }
    listaIds.sort(function () { return 0.5 - Math.random(); });

    for (var i = 0; i < listaIds.length; i++) {
      var tObj = obterTermo(listaIds[i]);
      if (!tObj) continue;

      var chip = document.createElement('div');
      chip.className = 'chip-palavra';
      chip.style.color = 'var(' + (FAMILIAS[tObj.familia] || '--cyan') + ')';
      chip.textContent = tObj.resposta;
      chip.setAttribute('data-termo-id', tObj.id);

      // Eventos de arrastar com Pointer Events
      configurarArrastoChipCena(chip);

      banco.appendChild(chip);
    }
  }

  // Drag and drop do chip na cena
  function configurarArrastoChipCena(chip) {
    var chipClone = null;
    var clicadoPrimeiro = null;

    chip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var idAlvo = chip.getAttribute('data-termo-id');

      // Fallback de clique acessível: seleciona e clica no alvo
      if (clicadoPrimeiro === chip) {
        clicadoPrimeiro = null;
        chip.style.boxShadow = '';
      } else {
        clicadoPrimeiro = chip;
        chip.style.boxShadow = '0 0 14px var(--cyan)';
      }

      chip.setPointerCapture(e.pointerId);
      chip.classList.add('arrastando');

      function onMove(ev) {
        chip.style.transform = 'translate(' + (ev.clientX - e.clientX) + 'px, ' + (ev.clientY - e.clientY) + 'px)';
        // Destaca alvo sob o cursor
        var elemAbaixo = document.elementFromPoint(ev.clientX, ev.clientY);
        var alvo = elemAbaixo ? elemAbaixo.closest('.comp-3d') : null;
        var todosRotulos = document.querySelectorAll('.comp-rotulo');
        for (var r = 0; r < todosRotulos.length; r++) todosRotulos[r].classList.remove('hover-alvo');
        if (alvo) {
          var rot = alvo.querySelector('.comp-rotulo');
          if (rot) rot.classList.add('hover-alvo');
        }
      }

      function onUp(ev) {
        chip.releasePointerCapture(ev.pointerId);
        chip.classList.remove('arrastando');
        chip.style.transform = '';
        chip.removeEventListener('pointermove', onMove);
        chip.removeEventListener('pointerup', onUp);

        var elemAbaixo = document.elementFromPoint(ev.clientX, ev.clientY);
        var alvoComp = elemAbaixo ? elemAbaixo.closest('.comp-3d') : null;
        var todosRotulos = document.querySelectorAll('.comp-rotulo');
        for (var r = 0; r < todosRotulos.length; r++) todosRotulos[r].classList.remove('hover-alvo');

        if (alvoComp) {
          var alvoId = alvoComp.getAttribute('data-id');
          if (alvoId === idAlvo && alvoId === estado.jornada.termoAtualId) {
            validarRespostaCena(chip.textContent);
          } else {
            tocarSom('erro');
            chip.classList.add('shake');
            setTimeout(function () { chip.classList.remove('shake'); }, 400);
          }
        }
      }

      chip.addEventListener('pointermove', onMove);
      chip.addEventListener('pointerup', onUp);
    });

    // Clique no rótulo como fallback
    var rotulos = document.querySelectorAll('.comp-rotulo');
    for (var k = 0; k < rotulos.length; k++) {
      rotulos[k].addEventListener('click', function () {
        if (clicadoPrimeiro) {
          var idAlvo = clicadoPrimeiro.getAttribute('data-termo-id');
          var compPai = this.closest('.comp-3d');
          if (compPai && compPai.getAttribute('data-id') === idAlvo) {
            validarRespostaCena(clicadoPrimeiro.textContent);
          } else {
            tocarSom('erro');
          }
          clicadoPrimeiro.style.boxShadow = '';
          clicadoPrimeiro = null;
        }
      });
    }
  }

  // --- 7. A CRUZADINHA (INDEPENDENTE E COMPLETA) ---
  var mapaCasas = {}; // "r,c" -> { letter, words: [{ id, dir, pos }] }

  function construirMapaCasas() {
    mapaCasas = {};
    for (var i = 0; i < LAYOUT.length; i++) {
      var item = LAYOUT[i];
      var termo = obterTermo(item.id);
      if (!termo) continue;
      var resp = termo.resposta;

      for (var k = 0; k < resp.length; k++) {
        var r = item.direcao === 'H' ? item.linha : item.linha + k;
        var c = item.direcao === 'H' ? item.coluna + k : item.coluna;
        var chave = r + ',' + c;

        if (!mapaCasas[chave]) {
          mapaCasas[chave] = {
            r: r,
            c: c,
            letraGabarito: resp.charAt(k),
            numero: (k === 0) ? item.numero : null,
            palavras: []
          };
        } else if (k === 0 && !mapaCasas[chave].numero) {
          mapaCasas[chave].numero = item.numero;
        }

        mapaCasas[chave].palavras.push({
          id: item.id,
          dir: item.direcao,
          pos: k,
          numero: item.numero
        });
      }
    }
  }

  // Validador de Layout em runtime
  function validarLayout() {
    var erros = [];
    if (LAYOUT.length < 12) erros.push('Layout possui menos de 12 palavras (' + LAYOUT.length + ')');

    var contH = 0, contV = 0;
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].direcao === 'H') contH++;
      if (LAYOUT[i].direcao === 'V') contV++;
    }
    if (contH < 3) erros.push('Menos de 3 palavras horizontais (' + contH + ')');
    if (contV < 3) erros.push('Menos de 3 palavras verticais (' + contV + ')');

    // Valida consistência de letras em cruzamentos
    for (var chave in mapaCasas) {
      var c = mapaCasas[chave];
      if (c.palavras.length > 1) {
        var l1 = c.letraGabarito;
        for (var p = 1; p < c.palavras.length; p++) {
          var t = obterTermo(c.palavras[p].id);
          if (t.resposta.charAt(c.palavras[p].pos) !== l1) {
            erros.push('Conflito de letra na célula ' + chave);
          }
        }
      }
    }

    if (erros.length > 0) {
      console.error('Erros no validarLayout():', erros);
    } else {
      console.log('validarLayout(): PASS! Grade 20x20 conectada com ' + LAYOUT.length + ' palavras (' + contH + 'H/' + contV + 'V).');
    }
  }

  // Renderização da grade da cruzadinha
  function renderizarGradeCruzadinha() {
    var container = document.getElementById('grade-container');
    if (!container) return;
    container.innerHTML = '';
    construirMapaCasas();

    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var chave = r + ',' + c;
        var info = mapaCasas[chave];

        var div = document.createElement('div');
        div.className = 'casa-cruzadinha' + (info ? '' : ' vazia');
        div.setAttribute('data-linha', r);
        div.setAttribute('data-coluna', c);

        if (info) {
          if (info.numero) {
            var spanNum = document.createElement('span');
            spanNum.className = 'casa-num';
            spanNum.textContent = info.numero;
            div.appendChild(spanNum);
          }

          var input = document.createElement('input');
          input.type = 'text';
          input.maxLength = 1;
          input.autocomplete = 'off';
          input.autocapitalize = 'characters';
          input.setAttribute('inputmode', 'text');
          input.setAttribute('data-linha', r);
          input.setAttribute('data-coluna', c);

          // Rótulo descritivo para leitores de tela
          var descPalavras = info.palavras.map(function (p) {
            return p.numero + ' ' + (p.dir === 'H' ? 'horizontal' : 'vertical');
          }).join(' e ');
          input.setAttribute('aria-label', 'Linha ' + (r + 1) + ', coluna ' + (c + 1) + ', ' + descPalavras);

          // Restaura letra digitada salva
          if (estado.cruzadinha.grade[chave]) {
            input.value = estado.cruzadinha.grade[chave];
          }

          configurarEventosCasa(input, r, c);
          div.appendChild(input);
        }

        container.appendChild(div);
      }
    }

    renderizarPistasCruzadinha();
    renderizarBancoPalavrasCruzadinha();
    atualizarContadorAcertos();
  }

  // Eventos de teclado e navegação na grade
  function configurarEventosCasa(input, r, c) {
    input.addEventListener('focus', function () {
      focarCasa(r, c);
    });

    input.addEventListener('click', function () {
      // Se clicou na casa já ativa que é cruzamento, alterna H/V
      var chave = r + ',' + c;
      var info = mapaCasas[chave];
      if (info && info.palavras.length > 1) {
        if (estado.cruzadinha.celulaAtiva.r === r && estado.cruzadinha.celulaAtiva.c === c) {
          estado.cruzadinha.direcaoAtiva = (estado.cruzadinha.direcaoAtiva === 'H') ? 'V' : 'H';
          focarCasa(r, c);
        }
      }
    });

    input.addEventListener('keydown', function (e) {
      var dir = estado.cruzadinha.direcaoAtiva;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        moverParaVizinho(r, c + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moverParaVizinho(r, c - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moverParaVizinho(r + 1, c);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moverParaVizinho(r - 1, c);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (input.value !== '') {
          input.value = '';
          delete estado.cruzadinha.grade[r + ',' + c];
          removerMarcacoesCasa(r, c);
        } else {
          var prevR = (dir === 'H') ? r : r - 1;
          var prevC = (dir === 'H') ? c - 1 : c;
          var prevInput = obterInputCasa(prevR, prevC);
          if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
            delete estado.cruzadinha.grade[prevR + ',' + prevC];
            removerMarcacoesCasa(prevR, prevC);
          }
        }
        salvarEstado();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        alternarPalavraProxima(e.shiftKey ? -1 : 1);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        estado.cruzadinha.direcaoAtiva = (dir === 'H') ? 'V' : 'H';
        focarCasa(r, c);
      } else if (e.key === 'Home') {
        e.preventDefault();
        irParaInicioFimPalavra('inicio');
      } else if (e.key === 'End') {
        e.preventDefault();
        irParaInicioFimPalavra('fim');
      }
    });

    input.addEventListener('input', function (e) {
      var val = normalizar(input.value);
      if (val.length > 0) {
        var letra = val.charAt(val.length - 1);
        input.value = letra;
        estado.cruzadinha.grade[r + ',' + c] = letra;
        removerMarcacoesCasa(r, c);
        salvarEstado();

        // Avança para a próxima casa da palavra
        var dir = estado.cruzadinha.direcaoAtiva;
        var proxR = (dir === 'H') ? r : r + 1;
        var proxC = (dir === 'H') ? c + 1 : c;
        var proxInput = obterInputCasa(proxR, proxC);
        if (proxInput) {
          proxInput.focus();
        }
      } else {
        input.value = '';
        delete estado.cruzadinha.grade[r + ',' + c];
      }
    });
  }

  function obterInputCasa(r, c) {
    return document.querySelector('input[data-linha="' + r + '"][data-coluna="' + c + '"]');
  }

  function moverParaVizinho(r, c) {
    var prox = obterInputCasa(r, c);
    if (prox) prox.focus();
  }

  function removerMarcacoesCasa(r, c) {
    var chave = r + ',' + c;
    var info = mapaCasas[chave];
    if (!info) return;

    for (var i = 0; i < info.palavras.length; i++) {
      var pid = info.palavras[i].id;
      delete estado.cruzadinha.palavrasConferidas[pid];
      var pistaEl = document.querySelector('.pista-item[data-termo-id="' + pid + '"]');
      if (pistaEl) {
        var icone = pistaEl.querySelector('.pista-status-icon');
        if (icone) {
          icone.className = 'pista-status-icon pendente';
          icone.textContent = '○';
        }
      }
    }

    var inp = obterInputCasa(r, c);
    if (inp && inp.parentElement) {
      inp.parentElement.classList.remove('correta', 'errada');
    }
  }

  function focarCasa(r, c) {
    estado.cruzadinha.celulaAtiva = { r: r, c: c };
    var chave = r + ',' + c;
    var info = mapaCasas[chave];
    if (!info) return;

    // Determina qual palavra focar
    var palavraObj = null;
    for (var i = 0; i < info.palavras.length; i++) {
      if (info.palavras[i].dir === estado.cruzadinha.direcaoAtiva) {
        palavraObj = info.palavras[i];
        break;
      }
    }
    if (!palavraObj && info.palavras.length > 0) {
      palavraObj = info.palavras[0];
      estado.cruzadinha.direcaoAtiva = palavraObj.dir;
    }

    if (palavraObj) {
      destacarPalavra(palavraObj.id, r, c);
    }
  }

  function destacarPalavra(termoId, rFoco, cFoco) {
    estado.cruzadinha.palavraAtivaId = termoId;
    var itemLayout = null;
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].id === termoId) { itemLayout = LAYOUT[i]; break; }
    }
    if (!itemLayout) return;

    var termo = obterTermo(termoId);

    // Remove destaque anterior
    var casas = document.querySelectorAll('.casa-cruzadinha');
    for (var k = 0; k < casas.length; k++) {
      casas[k].classList.remove('palavra-ativa', 'casa-foco');
    }

    // Destaca casas da palavra atual
    for (var p = 0; p < termo.resposta.length; p++) {
      var r = itemLayout.direcao === 'H' ? itemLayout.linha : itemLayout.linha + p;
      var c = itemLayout.direcao === 'H' ? itemLayout.coluna + p : itemLayout.coluna;
      var inp = obterInputCasa(r, c);
      if (inp && inp.parentElement) {
        inp.parentElement.classList.add('palavra-ativa');
        if (r === rFoco && c === cFoco) {
          inp.parentElement.classList.add('casa-foco');
        }
      }
    }

    // Atualiza barra de exibição da pista ativa
    var dNum = document.getElementById('pista-ativa-num');
    var dTxt = document.getElementById('pista-ativa-texto');
    if (dNum) dNum.textContent = itemLayout.numero + ' ' + (itemLayout.direcao === 'H' ? 'HOR.' : 'VERT.');
    if (dTxt) dTxt.textContent = termo.pista;

    // Destaca na lista de pistas
    var pistasEls = document.querySelectorAll('.pista-item');
    for (var j = 0; j < pistasEls.length; j++) {
      pistasEls[j].classList.remove('ativa');
    }
    var pistaAtivaEl = document.querySelector('.pista-item[data-termo-id="' + termoId + '"]');
    if (pistaAtivaEl) {
      pistaAtivaEl.classList.add('ativa');
      pistaAtivaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function alternarPalavraProxima(delta) {
    var idxAtual = 0;
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].id === estado.cruzadinha.palavraAtivaId) {
        idxAtual = i;
        break;
      }
    }
    var novoIdx = (idxAtual + delta + LAYOUT.length) % LAYOUT.length;
    var proxLayout = LAYOUT[novoIdx];
    estado.cruzadinha.direcaoAtiva = proxLayout.direcao;
    var primInp = obterInputCasa(proxLayout.linha, proxLayout.coluna);
    if (primInp) primInp.focus();
  }

  function irParaInicioFimPalavra(onde) {
    var termoId = estado.cruzadinha.palavraAtivaId;
    if (!termoId) return;
    var itemLayout = null;
    for (var i = 0; i < LAYOUT.length; i++) {
      if (LAYOUT[i].id === termoId) { itemLayout = LAYOUT[i]; break; }
    }
    if (!itemLayout) return;
    var termo = obterTermo(termoId);

    var idx = (onde === 'inicio') ? 0 : termo.resposta.length - 1;
    var r = itemLayout.direcao === 'H' ? itemLayout.linha : itemLayout.linha + idx;
    var c = itemLayout.direcao === 'H' ? itemLayout.coluna + idx : itemLayout.coluna;
    var inp = obterInputCasa(r, c);
    if (inp) inp.focus();
  }

  // Renderização das listas de pistas
  function renderizarPistasCruzadinha() {
    var listaH = document.getElementById('pistas-h');
    var listaV = document.getElementById('pistas-v');
    if (!listaH || !listaV) return;

    listaH.innerHTML = '';
    listaV.innerHTML = '';

    var horizontais = LAYOUT.filter(function (p) { return p.direcao === 'H'; })
      .sort(function (a, b) { return a.numero - b.numero; });
    var verticais = LAYOUT.filter(function (p) { return p.direcao === 'V'; })
      .sort(function (a, b) { return a.numero - b.numero; });

    function criarItemPista(item) {
      var termo = obterTermo(item.id);
      var li = document.createElement('li');
      li.className = 'pista-item';
      li.setAttribute('data-termo-id', item.id);
      li.setAttribute('data-direcao', item.direcao);

      var status = estado.cruzadinha.palavrasConferidas[item.id] || 'pendente';
      var iconeStr = (status === 'certa') ? '✓' : (status === 'errada' ? '✗' : '○');

      li.innerHTML = '<span class="pista-item-num">' + item.numero + '.</span>' +
        '<span class="pista-item-texto">' + termo.pista + '</span>' +
        '<span class="pista-status-icon ' + status + '">' + iconeStr + '</span>';

      li.addEventListener('click', function () {
        estado.cruzadinha.direcaoAtiva = item.direcao;
        var inp = obterInputCasa(item.linha, item.coluna);
        if (inp) inp.focus();
      });

      return li;
    }

    for (var h = 0; h < horizontais.length; h++) {
      listaH.appendChild(criarItemPista(horizontais[h]));
    }
    for (var v = 0; v < verticais.length; v++) {
      listaV.appendChild(criarItemPista(verticais[v]));
    }
  }

  // Conferir a cruzadinha (R4 & R5)
  function conferirCruzadinha() {
    var acertos = 0;
    var total = LAYOUT.length;
    var palavrasCertas = {};

    // 1ª passada: identifica palavras totalmente certas
    for (var i = 0; i < LAYOUT.length; i++) {
      var item = LAYOUT[i];
      var termo = obterTermo(item.id);
      var resp = termo.resposta;
      var palavraDigitada = '';

      for (var k = 0; k < resp.length; k++) {
        var r = item.direcao === 'H' ? item.linha : item.linha + k;
        var c = item.direcao === 'H' ? item.coluna + k : item.coluna;
        palavraDigitada += (estado.cruzadinha.grade[r + ',' + c] || ' ');
      }

      if (palavraDigitada.trim() === '') {
        estado.cruzadinha.palavrasConferidas[item.id] = 'pendente';
      } else if (palavraDigitada === resp) {
        estado.cruzadinha.palavrasConferidas[item.id] = 'certa';
        palavrasCertas[item.id] = true;
        acertos++;
      } else {
        estado.cruzadinha.palavrasConferidas[item.id] = 'errada';
      }
    }

    estado.cruzadinha.acertos = acertos;
    atualizarContadorAcertos();

    // 2ª passada: pinta as células na grade
    for (var j = 0; j < LAYOUT.length; j++) {
      var lay = LAYOUT[j];
      var tObj = obterTermo(lay.id);
      var st = estado.cruzadinha.palavrasConferidas[lay.id];

      for (var p = 0; p < tObj.resposta.length; p++) {
        var lin = lay.direcao === 'H' ? lay.linha : lay.linha + p;
        var col = lay.direcao === 'H' ? lay.coluna + p : lay.coluna;
        var inpEl = obterInputCasa(lin, col);
        if (!inpEl || !inpEl.parentElement) continue;

        // Se pertence a qualquer palavra certa, fica verde
        var chave = lin + ',' + col;
        var info = mapaCasas[chave];
        var pertenceACerta = false;
        if (info) {
          for (var w = 0; w < info.palavras.length; w++) {
            if (palavrasCertas[info.palavras[w].id]) {
              pertenceACerta = true;
              break;
            }
          }
        }

        if (pertenceACerta) {
          inpEl.parentElement.classList.remove('errada');
          inpEl.parentElement.classList.add('correta');
        } else if (st === 'errada' && inpEl.value.trim() !== '') {
          inpEl.parentElement.classList.remove('correta');
          inpEl.parentElement.classList.add('errada');
        }
      }
    }

    // Atualiza ícones nas pistas
    for (var m = 0; m < LAYOUT.length; m++) {
      var pId = LAYOUT[m].id;
      var statusTermo = estado.cruzadinha.palavrasConferidas[pId] || 'pendente';
      var pEl = document.querySelector('.pista-item[data-termo-id="' + pId + '"]');
      if (pEl) {
        var ic = pEl.querySelector('.pista-status-icon');
        if (ic) {
          ic.className = 'pista-status-icon ' + statusTermo;
          ic.textContent = (statusTermo === 'certa') ? '✓' : (statusTermo === 'errada' ? '✗' : '○');
        }
      }
    }

    // Anúncio em aria-live
    var regiaoAria = document.getElementById('aria-resultado');
    var msgAria = 'Conferência finalizada: ' + acertos + ' de ' + total + ' palavras corretas.';
    if (regiaoAria) regiaoAria.textContent = msgAria;

    if (acertos === total) {
      tocarSom('vitoria');
      setTimeout(function () {
        alert('PARABÉNS! Você completou 100% da cruzadinha com as 16 palavras!');
        irPara('tela-final');
      }, 500);
    } else if (acertos > 0) {
      tocarSom('acerto');
    } else {
      tocarSom('erro');
    }

    salvarEstado();
  }

  function atualizarContadorAcertos() {
    var cont = document.getElementById('contador-acertos');
    if (cont) {
      cont.textContent = estado.cruzadinha.acertos + ' de 16 palavras';
    }
  }

  // Reiniciar a cruzadinha (R6)
  function abrirModalReiniciar() {
    var modal = document.getElementById('modal-reiniciar');
    if (modal) modal.classList.remove('oculto');
  }

  function fecharModalReiniciar() {
    var modal = document.getElementById('modal-reiniciar');
    if (modal) modal.classList.add('oculto');
  }

  function executarReiniciarCruzadinha() {
    fecharModalReiniciar();
    estado.cruzadinha.grade = {};
    estado.cruzadinha.palavrasConferidas = {};
    estado.cruzadinha.acertos = 0;

    var inputs = document.querySelectorAll('.grade-container input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].value = '';
      if (inputs[i].parentElement) {
        inputs[i].parentElement.classList.remove('correta', 'errada', 'palavra-ativa', 'casa-foco', 'jornada-revelada');
      }
    }

    var icones = document.querySelectorAll('.pista-status-icon');
    for (var k = 0; k < icones.length; k++) {
      icones[k].className = 'pista-status-icon pendente';
      icones[k].textContent = '○';
    }

    atualizarContadorAcertos();
    salvarEstado();
  }

  // Modo Arrastar na Cruzadinha
  function renderizarBancoPalavrasCruzadinha() {
    var banco = document.getElementById('banco-palavras-cruz');
    if (!banco) return;
    banco.innerHTML = '';

    var palavrasEmbaralhadas = TERMOS.slice().sort(function () { return 0.5 - Math.random(); });

    for (var i = 0; i < palavrasEmbaralhadas.length; i++) {
      var t = palavrasEmbaralhadas[i];
      var chip = document.createElement('div');
      chip.className = 'chip-palavra';
      chip.style.color = 'var(' + (FAMILIAS[t.familia] || '--cyan') + ')';
      chip.textContent = t.resposta;
      chip.setAttribute('data-termo-id', t.id);

      configurarArrastoChipCruzadinha(chip);
      banco.appendChild(chip);
    }
  }

  function configurarArrastoChipCruzadinha(chip) {
    var clicadoPrimeiro = null;

    chip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var idPalavra = chip.getAttribute('data-termo-id');

      if (clicadoPrimeiro === chip) {
        clicadoPrimeiro = null;
        chip.style.boxShadow = '';
      } else {
        clicadoPrimeiro = chip;
        chip.style.boxShadow = '0 0 14px var(--cyan)';
      }

      chip.setPointerCapture(e.pointerId);
      chip.classList.add('arrastando');

      function onMove(ev) {
        chip.style.transform = 'translate(' + (ev.clientX - e.clientX) + 'px, ' + (ev.clientY - e.clientY) + 'px)';
      }

      function onUp(ev) {
        chip.releasePointerCapture(ev.pointerId);
        chip.classList.remove('arrastando');
        chip.style.transform = '';
        chip.removeEventListener('pointermove', onMove);
        chip.removeEventListener('pointerup', onUp);

        var elemAbaixo = document.elementFromPoint(ev.clientX, ev.clientY);
        // Soltou sobre uma casa da grade ou sobre uma pista
        var casa = elemAbaixo ? elemAbaixo.closest('.casa-cruzadinha') : null;
        var pista = elemAbaixo ? elemAbaixo.closest('.pista-item') : null;

        var termoPreencher = null;
        if (casa) {
          var r = parseInt(casa.getAttribute('data-linha'), 10);
          var c = parseInt(casa.getAttribute('data-coluna'), 10);
          var info = mapaCasas[r + ',' + c];
          if (info) {
            for (var w = 0; w < info.palavras.length; w++) {
              if (info.palavras[w].id === idPalavra) {
                termoPreencher = idPalavra;
                break;
              }
            }
          }
        } else if (pista) {
          if (pista.getAttribute('data-termo-id') === idPalavra) {
            termoPreencher = idPalavra;
          }
        }

        if (termoPreencher) {
          var tObj = obterTermo(termoPreencher);
          preencherPalavraNaCruzadinha(termoPreencher, tObj.resposta);
          tocarSom('acerto');
          chip.classList.add('usado');
          salvarEstado();
        } else if (casa || pista) {
          tocarSom('erro');
          chip.classList.add('shake');
          setTimeout(function () { chip.classList.remove('shake'); }, 400);
        }
      }

      chip.addEventListener('pointermove', onMove);
      chip.addEventListener('pointerup', onUp);
    });
  }

  function sincronizarGradeCruzadinha() {
    renderizarGradeCruzadinha();
  }

  // --- 8. TELA FINAL & GLOSSÁRIO ---
  function renderizarTelaFinal() {
    var estEl = document.getElementById('final-estrelas');
    var tempEl = document.getElementById('final-tempo');
    var glossario = document.getElementById('final-glossario');

    if (estEl) estEl.textContent = estado.jornada.estrelasTotais;

    var segundos = estado.tempoTotalSegundos + Math.floor((Date.now() - estado.tempoInicio) / 1000);
    var mins = Math.floor(segundos / 60);
    var segs = segundos % 60;
    if (tempEl) tempEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (segs < 10 ? '0' : '') + segs;

    if (glossario) {
      glossario.innerHTML = '';
      for (var i = 0; i < TERMOS.length; i++) {
        var t = TERMOS[i];
        var chip = document.createElement('div');
        chip.className = 'glossario-chip';
        chip.style.borderColor = 'var(' + (FAMILIAS[t.familia] || '--cyan') + ')';
        chip.textContent = t.nome;
        (function (termo) {
          chip.addEventListener('click', function () {
            abrirCartaoRevelacao(termo, 3);
          });
        })(t);
        glossario.appendChild(chip);
      }
    }
  }

  // --- 9. CONFIGURAÇÃO DE EVENTOS GLOBAIS ---
  function inicializarEventos() {
    // Menu superior
    var botoesMenu = document.querySelectorAll('.menu-btn');
    for (var b = 0; b < botoesMenu.length; b++) {
      botoesMenu[b].addEventListener('click', function () {
        var alvo = this.getAttribute('data-ir');
        irPara(alvo);
      });
    }

    // Início
    var btnIniciar = document.getElementById('btn-iniciar');
    if (btnIniciar) {
      btnIniciar.addEventListener('click', function () {
        initAudio();
        var totalDesc = contarTermosDescobertos();
        if (totalDesc > 0) {
          irPara('tela-mapa');
        } else {
          iniciarPrologo();
        }
      });
    }

    var btnCruzDireto = document.getElementById('btn-cruzadinha-direto');
    if (btnCruzDireto) {
      btnCruzDireto.addEventListener('click', function () {
        initAudio();
        irPara('tela-cruzadinha');
      });
    }

    var btnComoJogarInicio = document.getElementById('btn-como-jogar-inicio');
    if (btnComoJogarInicio) {
      btnComoJogarInicio.addEventListener('click', function () {
        irPara('tela-como-jogar');
      });
    }

    var linkRecomecar = document.getElementById('link-recomecar');
    if (linkRecomecar) {
      linkRecomecar.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Recomeçar todo o progresso do zero?')) {
          limparProgresso();
          window.location.reload();
        }
      });
    }

    // Prólogo
    var btnPularPrologo = document.getElementById('btn-pular-prologo');
    if (btnPularPrologo) {
      btnPularPrologo.addEventListener('click', function () {
        irPara('tela-mapa');
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && estado.telaAtual === 'tela-prologo') {
        irPara('tela-mapa');
      }
    });

    // Cena: Confirmação de resposta
    var btnConfirma = document.getElementById('btn-confirmar-resposta');
    var inputResp = document.getElementById('input-resposta');
    if (btnConfirma && inputResp) {
      btnConfirma.addEventListener('click', function () {
        validarRespostaCena(inputResp.value);
      });
      inputResp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          validarRespostaCena(inputResp.value);
        }
      });
    }

    // Cena: Ações quando termo já está concluído
    var btnVerCartaoConc = document.getElementById('btn-ver-cartao-concluido');
    if (btnVerCartaoConc) {
      btnVerCartaoConc.addEventListener('click', function () {
        var termo = obterTermo(estado.jornada.termoAtualId);
        if (termo) {
          var reg = estado.jornada.descobertos[termo.id];
          var est = (reg && reg.estrelas) || 3;
          abrirCartaoRevelacao(termo, est);
        }
      });
    }

    var btnProxConc = document.getElementById('btn-proximo-concluido');
    if (btnProxConc) {
      btnProxConc.addEventListener('click', function () {
        avancarTermoConcluido();
      });
    }

    // Toggles de modo na cena (Digitar / Arrastar)
    var btnModoDig = document.getElementById('btn-modo-digitar');
    var btnModoArr = document.getElementById('btn-modo-arrastar');
    var areaDig = document.getElementById('resposta-digitar');
    var areaArr = document.getElementById('resposta-arrastar');

    if (btnModoDig && btnModoArr) {
      btnModoDig.addEventListener('click', function () {
        btnModoDig.classList.add('ativo');
        btnModoArr.classList.remove('ativo');
        if (areaDig) areaDig.classList.remove('oculto');
        if (areaArr) areaArr.classList.add('oculto');
        if (inputResp) inputResp.focus();
      });
      btnModoArr.addEventListener('click', function () {
        btnModoArr.classList.add('ativo');
        btnModoDig.classList.remove('ativo');
        if (areaArr) areaArr.classList.remove('oculto');
        if (areaDig) areaDig.classList.add('oculto');
      });
    }

    // Dicas
    var btnDica = document.getElementById('btn-dica');
    var menuDicas = document.getElementById('menu-dicas');
    if (btnDica && menuDicas) {
      btnDica.addEventListener('click', function () {
        menuDicas.classList.toggle('oculto');
      });
      var opcoes = menuDicas.querySelectorAll('.dica-opcao');
      for (var d = 0; d < opcoes.length; d++) {
        opcoes[d].addEventListener('click', function () {
          var nivel = parseInt(this.getAttribute('data-nivel'), 10);
          aplicarDica(nivel);
        });
      }
      var btnFecharDica = menuDicas.querySelector('.dica-fechar');
      if (btnFecharDica) {
        btnFecharDica.addEventListener('click', function () {
          menuDicas.classList.add('oculto');
        });
      }
    }

    // Rever animação
    var btnRever = document.getElementById('btn-rever');
    if (btnRever) {
      btnRever.addEventListener('click', function () {
        var termo = obterTermo(estado.jornada.termoAtualId);
        if (termo) {
          controleCenaAtiva.cancelada = true;
          controleCenaAtiva = { cancelada: false };
          executarCenaAnimada(termo, controleCenaAtiva);
        }
      });
    }

    // Pular termo
    var btnPular = document.getElementById('btn-pular-termo');
    if (btnPular) {
      btnPular.addEventListener('click', function () {
        pularTermoCena();
      });
    }

    // Cartão de Revelação: Continuar
    var btnCartaoCont = document.getElementById('btn-cartao-continuar');
    if (btnCartaoCont) {
      btnCartaoCont.addEventListener('click', function () {
        continuarAposCartao();
      });
    }

    // Cruzadinha: Conferir e Reiniciar
    var btnConferir = document.getElementById('btn-conferir');
    if (btnConferir) {
      btnConferir.addEventListener('click', function () {
        conferirCruzadinha();
      });
    }

    var btnReiniciar = document.getElementById('btn-reiniciar');
    if (btnReiniciar) {
      btnReiniciar.addEventListener('click', function () {
        abrirModalReiniciar();
      });
    }

    var btnConfReiniciar = document.getElementById('btn-confirmar-reiniciar');
    if (btnConfReiniciar) {
      btnConfReiniciar.addEventListener('click', function () {
        executarReiniciarCruzadinha();
      });
    }

    var btnCancReiniciar = document.getElementById('btn-cancelar-reiniciar');
    if (btnCancReiniciar) {
      btnCancReiniciar.addEventListener('click', function () {
        fecharModalReiniciar();
      });
    }

    // Toggle de modo na cruzadinha (Digitar / Arrastar)
    var btnCruzDig = document.getElementById('btn-cruz-digitar');
    var btnCruzArr = document.getElementById('btn-cruz-arrastar');
    var bancoCruz = document.getElementById('banco-palavras-cruz');

    if (btnCruzDig && btnCruzArr) {
      btnCruzDig.addEventListener('click', function () {
        btnCruzDig.classList.add('ativo');
        btnCruzArr.classList.remove('ativo');
        estado.cruzadinha.modoEntrada = 'digitar';
        if (bancoCruz) bancoCruz.classList.add('oculto');
      });
      btnCruzArr.addEventListener('click', function () {
        btnCruzArr.classList.add('ativo');
        btnCruzDig.classList.remove('ativo');
        estado.cruzadinha.modoEntrada = 'arrastar';
        if (bancoCruz) bancoCruz.classList.remove('oculto');
      });
    }

    // Final
    var btnJogarDeNovo = document.getElementById('btn-jogar-de-novo');
    if (btnJogarDeNovo) {
      btnJogarDeNovo.addEventListener('click', function () {
        if (confirm('Deseja reiniciar a jornada e a cruzadinha?')) {
          limparProgresso();
          window.location.reload();
        }
      });
    }

    var btnIrCruzFinal = document.getElementById('btn-ir-cruzadinha-final');
    if (btnIrCruzFinal) {
      btnIrCruzFinal.addEventListener('click', function () {
        irPara('tela-cruzadinha');
      });
    }

    // Como jogar: fechar
    var btnFecharComoJogar = document.getElementById('btn-fechar-como-jogar');
    if (btnFecharComoJogar) {
      btnFecharComoJogar.addEventListener('click', function () {
        irPara('tela-inicio');
      });
    }

    // Configurações & Som
    var btnSom = document.getElementById('btn-som');
    var chkSom = document.getElementById('chk-som');
    if (btnSom && chkSom) {
      function atualizarIconeSom() {
        btnSom.textContent = estado.somAtivado ? '🔊' : '🔇';
        chkSom.checked = estado.somAtivado;
      }
      btnSom.addEventListener('click', function () {
        estado.somAtivado = !estado.somAtivado;
        if (estado.somAtivado) initAudio();
        atualizarIconeSom();
        salvarEstado();
      });
      chkSom.addEventListener('change', function () {
        estado.somAtivado = chkSom.checked;
        if (estado.somAtivado) initAudio();
        atualizarIconeSom();
        salvarEstado();
      });
    }

    var btnConfig = document.getElementById('btn-config');
    var painelConfig = document.getElementById('painel-config');
    var btnFecharConfig = document.getElementById('btn-fechar-config');
    var chkReduzirMov = document.getElementById('chk-reduzir-mov');

    if (btnConfig && painelConfig) {
      btnConfig.addEventListener('click', function () {
        painelConfig.classList.remove('oculto');
      });
      if (btnFecharConfig) {
        btnFecharConfig.addEventListener('click', function () {
          painelConfig.classList.add('oculto');
        });
      }
      if (chkReduzirMov) {
        chkReduzirMov.checked = estado.reduzirMovimento;
        chkReduzirMov.addEventListener('change', function () {
          estado.reduzirMovimento = chkReduzirMov.checked;
          if (estado.reduzirMovimento) {
            document.body.classList.add('reduzir-animacoes');
          } else {
            document.body.classList.remove('reduzir-animacoes');
          }
          salvarEstado();
        });
      }
    }
  }

  // --- 10. INICIALIZAÇÃO ROBUSTA DO JOGO ---
  function iniciarJogo() {
    try {
      construirMapaCasas();
      carregarEstado();
      validarLayout();
      inicializarEventos();

      // Aplica configurações salvas
      if (estado.reduzirMovimento) {
        document.body.classList.add('reduzir-animacoes');
        var chkM = document.getElementById('chk-reduzir-mov');
        if (chkM) chkM.checked = true;
      }
      var btnS = document.getElementById('btn-som');
      var chkS = document.getElementById('chk-som');
      if (btnS) btnS.textContent = estado.somAtivado ? '🔊' : '🔇';
      if (chkS) chkS.checked = estado.somAtivado;

      // Se houver progresso salvo, ajusta botão inicial
      var totalDescobertos = contarTermosDescobertos();
      var btnIniciar = document.getElementById('btn-iniciar');
      var linkRec = document.getElementById('link-recomecar');
      if (totalDescobertos > 0) {
        if (btnIniciar) btnIniciar.textContent = '▶ CONTINUAR JORNADA';
        if (linkRec) linkRec.classList.remove('oculto');
      }

      // Inicia com segurança na tela inicial
      irPara('tela-inicio');
    } catch (e) {
      console.error('Erro na inicialização do jogo:', e);
      irPara('tela-inicio');
    }
  }

  // Executa imediatamente se o DOM já carregou, ou aguarda DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarJogo);
  } else {
    iniciarJogo();
  }

})();

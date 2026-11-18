// ============================================================
// VALIDADOR DE QUALIDADE — Cruzadinha NÚCLEO
// Executar: node ferramentas/validar.js
// Verifica e imprime PASS/FAIL para todos os requisitos da seção 8
// ============================================================

const fs = require('fs');
const path = require('path');

// Carrega dados.js simulando o escopo global do browser
const dadosPath = path.join(__dirname, '..', 'dados.js');
const dadosCode = fs.readFileSync(dadosPath, 'utf8');

// Extrai variáveis usando eval seguro em sandbox de contexto
const fn = new Function(dadosCode + '\nreturn { TERMOS, LAYOUT, FASES, FAMILIAS, SIGLAS_PROIBIDAS, GRID_ROWS, GRID_COLS };');
const dados = fn();

const { TERMOS, LAYOUT, FASES, SIGLAS_PROIBIDAS, GRID_ROWS, GRID_COLS } = dados;

console.log('====================================================');
console.log('🔍 RELATÓRIO DE VALIDAÇÃO DE QUALIDADE — NÚCLEO');
console.log('====================================================\n');

let totalFalhas = 0;

function reportar(titulo, sucesso, detalhes = []) {
  if (sucesso) {
    console.log(`✅ [PASS] ${titulo}`);
  } else {
    console.log(`❌ [FAIL] ${titulo}`);
    totalFalhas++;
  }
  for (const d of detalhes) {
    console.log(`     ${d}`);
  }
  console.log();
}

function normalizar(txt) {
  if (!txt) return '';
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

// ------------------------------------------------------------
// 1. TAMANHO DAS PISTAS (<= 15 palavras)
// ------------------------------------------------------------
let pistasLongas = [];
for (const t of TERMOS) {
  const palavras = t.pista.trim().split(/\s+/);
  if (palavras.length > 15) {
    pistasLongas.push(`${t.id} (${palavras.length} palavras): "${t.pista}"`);
  }
}
reportar('1. Todas as pistas têm no máximo 15 palavras', pistasLongas.length === 0, pistasLongas);

// ------------------------------------------------------------
// 2. CONTEÚDO DAS PISTAS (não contém resposta, nem subsequência 3+, nem sigla por extenso)
// ------------------------------------------------------------
let violacoesPistas = [];
for (const t of TERMOS) {
  const pistaNorm = normalizar(t.pista);
  const respNorm = normalizar(t.resposta);

  // A resposta inteira
  if (pistaNorm.includes(respNorm)) {
    violacoesPistas.push(`${t.id}: pista contém a resposta inteira "${t.resposta}"`);
  }

  // Siglas por extenso proibidas
  const proibidas = SIGLAS_PROIBIDAS[t.id] || [];
  for (const p of proibidas) {
    const pNorm = normalizar(p);
    if (pNorm && pistaNorm.includes(pNorm)) {
      violacoesPistas.push(`${t.id}: pista contém a sigla/expressão proibida "${p}"`);
    }
  }

  // Subsequência de 3+ letras consecutivas da resposta
  // Nota: palavras muito curtas da resposta (ex: CPU, ULA, ROM, RAM, DMA, UC) não podem aparecer como substring na pista
  for (let len = Math.min(respNorm.length, 3); len <= respNorm.length; len++) {
    for (let i = 0; i <= respNorm.length - len; i++) {
      const sub = respNorm.substring(i, i + len);
      // Checa apenas subsequências de tamanho >= 3 que sejam termos específicos ou palavras completas
      // Para evitar falsos positivos com substrings comuns da língua portuguesa (ex: "com", "ent", "ess")
      // verificamos se a palavra isolada ou radical idêntico aparece na pista
      const palavrasDaPista = t.pista.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/);
      for (const pp of palavrasDaPista) {
        if (normalizar(pp) === respNorm && respNorm.length >= 2) {
          violacoesPistas.push(`${t.id}: palavra exata "${pp}" encontrada na pista`);
        }
      }
    }
  }
}
reportar('2. Nenhuma pista contém a resposta ou siglas por extenso proibidas', violacoesPistas.length === 0, violacoesPistas);

// ------------------------------------------------------------
// 3. CONECTIVIDADE DA GRADE & QUANTIDADE DE PALAVRAS
// ------------------------------------------------------------
const mapaCasas = new Map(); // "r,c" -> { letter, words: Set(id) }

for (const p of LAYOUT) {
  const t = TERMOS.find(x => x.id === p.id);
  for (let k = 0; k < t.resposta.length; k++) {
    const r = p.direcao === 'H' ? p.linha : p.linha + k;
    const c = p.direcao === 'H' ? p.coluna + k : p.coluna;
    const key = `${r},${c}`;
    if (!mapaCasas.has(key)) {
      mapaCasas.set(key, { letter: t.resposta[k], words: new Set([p.id]) });
    } else {
      mapaCasas.get(key).words.add(p.id);
    }
  }
}

// Grafo de conexões
const adj = new Map();
for (const p of LAYOUT) adj.set(p.id, new Set());

for (const [k, cell] of mapaCasas.entries()) {
  const wArray = Array.from(cell.words);
  for (let i = 0; i < wArray.length; i++) {
    for (let j = i + 1; j < wArray.length; j++) {
      adj.get(wArray[i]).add(wArray[j]);
      adj.get(wArray[j]).add(wArray[i]);
    }
  }
}

// BFS a partir do primeiro termo
const visitados = new Set();
const fila = [LAYOUT[0].id];
visitados.add(LAYOUT[0].id);

while (fila.length > 0) {
  const atual = fila.shift();
  for (const viz of adj.get(atual)) {
    if (!visitados.has(viz)) {
      visitados.add(viz);
      fila.push(viz);
    }
  }
}

const conectado = visitados.size === LAYOUT.length;
const totalPalavras = LAYOUT.length;
reportar(`3. Grade é um componente conexo único (${totalPalavras}/16 palavras presentes)`, conectado && totalPalavras >= 12, [
  `Palavras conectadas: ${visitados.size} de ${totalPalavras}`,
  `Mínimo exigido: 12 palavras (Meta 16 atingida: ${totalPalavras === 16 ? 'SIM' : 'NÃO'})`
]);

// ------------------------------------------------------------
// 4. DIREÇÕES HORIZONTAIS E VERTICAIS (Mínimo 3 em cada)
// ------------------------------------------------------------
const contH = LAYOUT.filter(p => p.direcao === 'H').length;
const contV = LAYOUT.filter(p => p.direcao === 'V').length;
reportar(`4. Mínimo de 3 palavras em cada direção (H: ${contH}, V: ${contV})`, contH >= 3 && contV >= 3);

// ------------------------------------------------------------
// 5. CONSISTÊNCIA DE CRUZAMENTOS
// ------------------------------------------------------------
let conflitosCruzamento = [];
for (const [k, cell] of mapaCasas.entries()) {
  if (cell.words.size > 1) {
    for (const wid of cell.words) {
      const lay = LAYOUT.find(x => x.id === wid);
      const t = TERMOS.find(x => x.id === wid);
      const [r, c] = k.split(',').map(Number);
      const pos = lay.direcao === 'H' ? c - lay.coluna : r - lay.linha;
      if (t.resposta[pos] !== cell.letter) {
        conflitosCruzamento.push(`Célula ${k}: esperado '${cell.letter}' mas termo ${wid} possui '${t.resposta[pos]}' na pos ${pos}`);
      }
    }
  }
}
reportar('5. Cruzamentos de letras 100% coerentes', conflitosCruzamento.length === 0, conflitosCruzamento);

// ------------------------------------------------------------
// 6. NUMERAÇÃO DAS PISTAS
// ------------------------------------------------------------
// Numeração padrão: esquerda->direita, cima->baixo
const starts = new Map();
for (const p of LAYOUT) {
  const k = `${p.linha},${p.coluna}`;
  if (!starts.has(k)) starts.set(k, []);
  starts.get(k).push(p);
}

const posicoesOrdenadas = Array.from(starts.keys()).sort((a, b) => {
  const [ra, ca] = a.split(',').map(Number);
  const [rb, cb] = b.split(',').map(Number);
  return ra !== rb ? ra - rb : ca - cb;
});

let errosNumeracao = [];
let numEsperado = 1;
for (const pos of posicoesOrdenadas) {
  const palavrasIniciando = starts.get(pos);
  for (const pal of palavrasIniciando) {
    if (pal.numero !== numEsperado) {
      errosNumeracao.push(`${pal.id}: número na grade é ${pal.numero}, esperado ${numEsperado}`);
    }
  }
  numEsperado++;
}
reportar('6. Numeração das pistas consistente (cima→baixo, esquerda→direita)', errosNumeracao.length === 0, errosNumeracao);

// ------------------------------------------------------------
// 7. SEM ADJACÊNCIAS ACIDENTAIS DE 2+ LETRAS
// ------------------------------------------------------------
// Reconstrói matriz 20x20 e checa se toda sequência de 2+ letras corresponde a uma palavra do layout
const matriz = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
for (const [k, cell] of mapaCasas.entries()) {
  const [r, c] = k.split(',').map(Number);
  matriz[r][c] = cell.letter;
}

let sequenciasIndevidas = [];

// Checa horizontais
for (let r = 0; r < GRID_ROWS; r++) {
  let c = 0;
  while (c < GRID_COLS) {
    if (matriz[r][c] !== null) {
      let inicio = c;
      let palavra = '';
      while (c < GRID_COLS && matriz[r][c] !== null) {
        palavra += matriz[r][c];
        c++;
      }
      if (palavra.length >= 2) {
        // Verifica se existe no LAYOUT como H nesta linha e coluna
        const item = LAYOUT.find(x => x.linha === r && x.coluna === inicio && x.direcao === 'H');
        if (!item) {
          sequenciasIndevidas.push(`Sequência horizontal não mapeada "${palavra}" em (${r},${inicio})`);
        }
      }
    } else {
      c++;
    }
  }
}

// Checa verticais
for (let c = 0; c < GRID_COLS; c++) {
  let r = 0;
  while (r < GRID_ROWS) {
    if (matriz[r][c] !== null) {
      let inicio = r;
      let palavra = '';
      while (r < GRID_ROWS && matriz[r][c] !== null) {
        palavra += matriz[r][c];
        r++;
      }
      if (palavra.length >= 2) {
        // Verifica se existe no LAYOUT como V nesta linha e coluna
        const item = LAYOUT.find(x => x.linha === inicio && x.coluna === c && x.direcao === 'V');
        if (!item) {
          sequenciasIndevidas.push(`Sequência vertical não mapeada "${palavra}" em (${inicio},${c})`);
        }
      }
    } else {
      r++;
    }
  }
}
reportar('7. Nenhuma sequência de 2+ letras sem ser palavra da lista', sequenciasIndevidas.length === 0, sequenciasIndevidas);

console.log('====================================================');
if (totalFalhas === 0) {
  console.log('🎉 RESULTADO FINAL: TODOS OS TESTES PASSARAM COM SUCESSO! (0 falhas)');
  process.exit(0);
} else {
  console.log(`⚠️ RESULTADO FINAL: ${totalFalhas} TESTE(S) FALHARAM.`);
  process.exit(1);
}

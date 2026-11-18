// ============================================================
// GERADOR DE LAYOUT DE CRUZADINHA — Backtracking
// Busca um layout válido para as 16 palavras do jogo NÚCLEO.
// Executar: node ferramentas/gerar-grade.js
// ============================================================

const PALAVRAS = [
  { id: 'micro', word: 'MICROCONTROLADOR' },
  { id: 'massa', word: 'MEMORIADEMASSA' },
  { id: 'reg',   word: 'REGISTRADORES' },
  { id: 'addrbus', word: 'ADDRESSBUS' },
  { id: 'dual',  word: 'DUALCORE' },
  { id: 'quad',  word: 'QUADCORE' },
  { id: 'databus', word: 'DATABUS' },
  { id: 'eeprom', word: 'EEPROM' },
  { id: 'flash', word: 'FLASH' },
  { id: 'cache', word: 'CACHE' },
  { id: 'rom',   word: 'ROM' },
  { id: 'ram',   word: 'RAM' },
  { id: 'dma',   word: 'DMA' },
  { id: 'cpu',   word: 'CPU' },
  { id: 'ula',   word: 'ULA' },
  { id: 'uc',    word: 'UC' },
];

// Ordena por tamanho (decrescente) — coloca as mais difíceis primeiro
PALAVRAS.sort((a, b) => b.word.length - a.word.length);

// --- Grade esparsa ----------------------------------------------------------
// Mapeia "r,c" → { letter, words: Set<id> }
const grid = new Map();
const placements = []; // { id, word, row, col, dir:'H'|'V' }

function key(r, c) { return `${r},${c}`; }

function getCell(r, c) {
  return grid.get(key(r, c)) || null;
}

function setCell(r, c, letter, wordId) {
  const k = key(r, c);
  if (grid.has(k)) {
    grid.get(k).words.add(wordId);
  } else {
    grid.set(k, { letter, words: new Set([wordId]) });
  }
}

function clearCell(r, c, wordId) {
  const k = key(r, c);
  const cell = grid.get(k);
  if (!cell) return;
  cell.words.delete(wordId);
  if (cell.words.size === 0) grid.delete(k);
}

// --- Validação de posicionamento -------------------------------------------
function canPlace(word, id, row, col, dir) {
  const len = word.length;
  let crossings = 0;

  for (let i = 0; i < len; i++) {
    const r = dir === 'H' ? row : row + i;
    const c = dir === 'H' ? col + i : col;
    const cell = getCell(r, c);

    if (cell) {
      // Letra deve coincidir
      if (cell.letter !== word[i]) return null;
      // Deve ser de palavra perpendicular (não pode sobrepor mesma direção)
      let sameDirFound = false;
      for (const wid of cell.words) {
        const p = placements.find(p => p.id === wid);
        if (p && p.dir === dir) { sameDirFound = true; break; }
      }
      if (sameDirFound) return null;
      crossings++;
    } else {
      // Célula vazia — vizinhos perpendiculares devem estar vazios
      if (dir === 'H') {
        if (getCell(r - 1, c) || getCell(r + 1, c)) return null;
      } else {
        if (getCell(r, c - 1) || getCell(r, c + 1)) return null;
      }
    }
  }

  // Célula antes do início e depois do fim devem estar vazias
  if (dir === 'H') {
    if (getCell(row, col - 1) || getCell(row, col + len)) return null;
  } else {
    if (getCell(row - 1, col) || getCell(row + len, col)) return null;
  }

  // Primeira palavra não precisa de cruzamento; demais sim
  if (placements.length > 0 && crossings === 0) return null;

  return crossings;
}

function place(id, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row : row + i;
    const c = dir === 'H' ? col + i : col;
    setCell(r, c, word[i], id);
  }
  placements.push({ id, word, row, col, dir });
}

function unplace(id, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'H' ? row : row + i;
    const c = dir === 'H' ? col + i : col;
    clearCell(r, c, id);
  }
  placements.pop();
}

// --- Encontrar candidatos para uma palavra ---------------------------------
function findCandidates(word, id) {
  if (placements.length === 0) {
    // Primeira palavra: colocar horizontalmente no centro
    return [{ row: 20, col: 2, dir: 'H', score: 0 }];
  }

  const seen = new Set();
  const candidates = [];

  for (const p of placements) {
    for (let j = 0; j < p.word.length; j++) {
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== p.word[j]) continue;

        // Posição do cruzamento na grade
        const crossR = p.dir === 'H' ? p.row : p.row + j;
        const crossC = p.dir === 'H' ? p.col + j : p.col;

        // Direção perpendicular
        const newDir = p.dir === 'H' ? 'V' : 'H';

        let startR, startC;
        if (newDir === 'H') {
          startR = crossR;
          startC = crossC - i;
        } else {
          startR = crossR - i;
          startC = crossC;
        }

        const ck = `${startR},${startC},${newDir}`;
        if (seen.has(ck)) continue;
        seen.add(ck);

        const crossings = canPlace(word, id, startR, startC, newDir);
        if (crossings !== null) {
          candidates.push({ row: startR, col: startC, dir: newDir, score: crossings });
        }
      }
    }
  }

  // Ordenar por número de cruzamentos (mais cruzamentos = melhor)
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// --- Solver com backtracking -----------------------------------------------
let bestSolution = null;
let bestCount = 0;
const startTime = Date.now();
const TIMEOUT = 60000; // 60 segundos
let attempts = 0;

function solve(index, skipped) {
  if (Date.now() - startTime > TIMEOUT) return false;
  attempts++;

  // Salvar melhor solução parcial
  if (placements.length > bestCount) {
    bestCount = placements.length;
    bestSolution = placements.map(p => ({ ...p }));
    console.log(`  Melhor até agora: ${bestCount}/${PALAVRAS.length} palavras`);
  }

  if (index >= PALAVRAS.length) {
    return placements.length >= 12; // sucesso se ≥12
  }

  if (placements.length === PALAVRAS.length) return true;

  const { id, word } = PALAVRAS[index];
  const candidates = findCandidates(word, id);

  for (const { row, col, dir } of candidates) {
    place(id, word, row, col, dir);
    if (solve(index + 1, skipped)) return true;
    unplace(id, word, row, col, dir);
    if (Date.now() - startTime > TIMEOUT) return false;
  }

  // Permitir pular esta palavra (se já temos o mínimo ou se faltam poucas)
  if (skipped < 4) { // Máximo de 4 palavras puladas (mínimo 12)
    if (solve(index + 1, skipped + 1)) return true;
  }

  return false;
}

// --- Verificar conectividade -----------------------------------------------
function isConnected() {
  if (placements.length <= 1) return true;

  const wordCells = new Map(); // id -> Set<"r,c">
  for (const p of placements) {
    const cells = new Set();
    for (let i = 0; i < p.word.length; i++) {
      const r = p.dir === 'H' ? p.row : p.row + i;
      const c = p.dir === 'H' ? p.col + i : p.col;
      cells.add(key(r, c));
    }
    wordCells.set(p.id, cells);
  }

  // Grafo de adjacência de palavras (compartilham célula)
  const adj = new Map();
  const ids = placements.map(p => p.id);
  for (const id of ids) adj.set(id, new Set());

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = wordCells.get(ids[i]);
      const b = wordCells.get(ids[j]);
      for (const cell of a) {
        if (b.has(cell)) {
          adj.get(ids[i]).add(ids[j]);
          adj.get(ids[j]).add(ids[i]);
          break;
        }
      }
    }
  }

  // BFS
  const visited = new Set([ids[0]]);
  const queue = [ids[0]];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const neighbor of adj.get(cur)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === ids.length;
}

// --- Normalizar coordenadas (mover tudo para começar em 0,0) ---------------
function normalize(solution) {
  let minR = Infinity, minC = Infinity;
  for (const p of solution) {
    minR = Math.min(minR, p.row);
    minC = Math.min(minC, p.col);
    if (p.dir === 'H') {
      // nada extra
    } else {
      // nada extra
    }
  }
  return solution.map(p => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC
  }));
}

// --- Imprimir grade --------------------------------------------------------
function printGrid(solution) {
  // Reconstruir a grade a partir da solução
  const g = new Map();
  for (const p of solution) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.dir === 'H' ? p.row : p.row + i;
      const c = p.dir === 'H' ? p.col + i : p.col;
      g.set(key(r, c), p.word[i]);
    }
  }

  let maxR = 0, maxC = 0;
  for (const p of solution) {
    if (p.dir === 'H') {
      maxR = Math.max(maxR, p.row);
      maxC = Math.max(maxC, p.col + p.word.length - 1);
    } else {
      maxR = Math.max(maxR, p.row + p.word.length - 1);
      maxC = Math.max(maxC, p.col);
    }
  }

  console.log(`\nGrade ${maxR + 1} x ${maxC + 1}:\n`);
  for (let r = 0; r <= maxR; r++) {
    let line = '';
    for (let c = 0; c <= maxC; c++) {
      const letter = g.get(key(r, c));
      line += letter ? letter : '.';
    }
    console.log(`  ${String(r).padStart(2)} | ${line}`);
  }
  console.log();
}

// --- Numerar pistas --------------------------------------------------------
function numberClues(solution) {
  // Coletar todas as "primeiras casas" de palavras
  const starts = new Map(); // "r,c" -> { H: id, V: id }
  for (const p of solution) {
    const k = key(p.row, p.col);
    if (!starts.has(k)) starts.set(k, {});
    starts.get(k)[p.dir] = p.id;
  }

  // Ordenar por posição (cima→baixo, esquerda→direita)
  const sortedKeys = [...starts.keys()].sort((a, b) => {
    const [ra, ca] = a.split(',').map(Number);
    const [rb, cb] = b.split(',').map(Number);
    return ra !== rb ? ra - rb : ca - cb;
  });

  let num = 1;
  const clueNumbers = new Map(); // id -> número
  const numberedPositions = []; // { num, row, col, directions }

  for (const k of sortedKeys) {
    const dirs = starts.get(k);
    const [r, c] = k.split(',').map(Number);

    if (dirs.H) clueNumbers.set(dirs.H, num);
    if (dirs.V) clueNumbers.set(dirs.V, num);

    numberedPositions.push({ num, row: r, col: c, H: dirs.H || null, V: dirs.V || null });
    num++;
  }

  return { clueNumbers, numberedPositions };
}

// --- Gerar saída para dados.js ---------------------------------------------
function generateOutput(solution) {
  const normalized = normalize(solution);
  const { clueNumbers, numberedPositions } = numberClues(normalized);

  console.log('// --- Layout para dados.js ---');
  console.log('const LAYOUT = [');
  for (const p of normalized) {
    const num = clueNumbers.get(p.id);
    console.log(`  { id: '${p.id}', linha: ${p.row}, coluna: ${p.col}, direcao: '${p.dir}', numero: ${num} },`);
  }
  console.log('];');

  console.log('\n// --- Pistas numeradas ---');
  console.log('Horizontais:');
  for (const p of normalized.filter(p => p.dir === 'H').sort((a, b) => clueNumbers.get(a.id) - clueNumbers.get(b.id))) {
    console.log(`  ${clueNumbers.get(p.id)}. ${p.id} (${p.word})`);
  }
  console.log('Verticais:');
  for (const p of normalized.filter(p => p.dir === 'V').sort((a, b) => clueNumbers.get(a.id) - clueNumbers.get(b.id))) {
    console.log(`  ${clueNumbers.get(p.id)}. ${p.id} (${p.word})`);
  }

  // Contar H e V
  const hCount = normalized.filter(p => p.dir === 'H').length;
  const vCount = normalized.filter(p => p.dir === 'V').length;
  console.log(`\nHorizontais: ${hCount}, Verticais: ${vCount}`);
  console.log(`Total: ${normalized.length} palavras`);

  return { layout: normalized, clueNumbers };
}

// --- Executar --------------------------------------------------------------
console.log('=== Gerador de Cruzadinha — NÚCLEO ===');
console.log(`Palavras: ${PALAVRAS.length}`);
console.log(`Palavras: ${PALAVRAS.map(p => p.word).join(', ')}`);
console.log(`\nIniciando busca por backtracking...\n`);

const found = solve(0, 0);

console.log(`\nTentativas: ${attempts}`);
console.log(`Tempo: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

if (bestSolution && bestSolution.length >= 12) {
  const normalized = normalize(bestSolution);

  // Verificar conectividade com a solução salva
  // Reconstruir placements para verificar
  grid.clear();
  placements.length = 0;
  for (const p of normalized) {
    place(p.id, p.word, p.row, p.col, p.dir);
  }

  const connected = isConnected();
  console.log(`\nConectividade: ${connected ? 'OK' : 'FALHA'}`);

  printGrid(normalized);
  generateOutput(normalized);

  // Palavras que ficaram de fora
  const placedIds = new Set(normalized.map(p => p.id));
  const missing = PALAVRAS.filter(p => !placedIds.has(p.id));
  if (missing.length > 0) {
    console.log(`\nPalavras de fora (${missing.length}):`);
    for (const m of missing) {
      console.log(`  - ${m.id}: ${m.word}`);
    }
  } else {
    console.log('\nTodas as 16 palavras colocadas!');
  }
} else {
  console.log('\nNão foi possível encontrar solução com ≥12 palavras.');
  if (bestSolution) {
    console.log(`Melhor resultado: ${bestSolution.length} palavras`);
  }
}

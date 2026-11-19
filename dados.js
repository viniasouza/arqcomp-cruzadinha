// ============================================================
// dados.js — Dados do jogo Arq Game - A Jornada do Dado
// Contém: termos, layout da cruzadinha, fases e constantes
// ============================================================

// --- Dimensões da grade ---
var GRID_ROWS = 20;
var GRID_COLS = 20;

// --- Mapeamento família → variável CSS de cor ---
var FAMILIAS = {
  permanente: '--amber',
  volatil: '--magenta',
  barramento: '--lime',
  cerebro: '--cyan',
  chip: '--violet'
};

// --- Layout fixo da cruzadinha (gerado por backtracking) ---
var LAYOUT = [
  { id: 'micro',   linha: 6,  coluna: 4,  direcao: 'H', numero: 8  },
  { id: 'massa',   linha: 6,  coluna: 4,  direcao: 'V', numero: 8  },
  { id: 'reg',     linha: 6,  coluna: 7,  direcao: 'V', numero: 9  },
  { id: 'addrbus', linha: 10, coluna: 1,  direcao: 'H', numero: 11 },
  { id: 'dual',    linha: 1,  coluna: 10, direcao: 'V', numero: 2  },
  { id: 'quad',    linha: 0,  coluna: 13, direcao: 'V', numero: 1  },
  { id: 'databus', linha: 13, coluna: 4,  direcao: 'H', numero: 13 },
  { id: 'eeprom',  linha: 2,  coluna: 18, direcao: 'V', numero: 4  },
  { id: 'flash',   linha: 5,  coluna: 15, direcao: 'V', numero: 7  },
  { id: 'cache',   linha: 7,  coluna: 0,  direcao: 'H', numero: 10 },
  { id: 'rom',     linha: 15, coluna: 2,  direcao: 'H', numero: 14 },
  { id: 'ram',     linha: 19, coluna: 3,  direcao: 'H', numero: 15 },
  { id: 'dma',     linha: 12, coluna: 2,  direcao: 'H', numero: 12 },
  { id: 'cpu',     linha: 2,  coluna: 8,  direcao: 'H', numero: 3  },
  { id: 'ula',     linha: 4,  coluna: 9,  direcao: 'H', numero: 5  },
  { id: 'uc',      linha: 5,  coluna: 6,  direcao: 'V', numero: 6  }
];

// --- Fases da jornada ---
var FASES = [
  { id: 1, nome: 'Partida',             termos: ['rom', 'eeprom', 'flash'] },
  { id: 2, nome: 'Carregando o programa', termos: ['massa', 'dma', 'ram'] },
  { id: 3, nome: 'As estradas',          termos: ['addrbus', 'databus'] },
  { id: 4, nome: 'O cérebro',            termos: ['cpu', 'uc', 'ula', 'reg', 'cache'] },
  { id: 5, nome: 'Chips completos',      termos: ['micro', 'dual', 'quad'] }
];

// --- Os 16 termos do jogo ---
var TERMOS = [
  {
    id: 'rom',
    resposta: 'ROM',
    nome: 'ROM',
    familia: 'permanente',
    fase: 1,
    pista: 'Gravada na fábrica, inicia o aparelho sem depender de energia contínua.',
    dica1: 'Memória permanente · 3 letras',
    definicao: 'Memória só de leitura, gravada na fabricação. Guarda o programa mínimo executado ao ligar e não perde o conteúdo sem energia.',
    vidaReal: 'Firmware de boot de computadores e controles.',
    cena: 'rom',
    narracao: [
      '> Energia ligada.',
      '> A memória volátil está vazia.',
      '> Quem diz o que fazer primeiro?',
      '> Um chip que nunca esquece...',
      '> O programa de inicialização desperta.'
    ]
  },
  {
    id: 'eeprom',
    resposta: 'EEPROM',
    nome: 'EEPROM',
    familia: 'permanente',
    fase: 1,
    pista: 'Chip que regrava configurações um byte por vez, sem perder dados ao desligar.',
    dica1: 'Memória permanente · 6 letras',
    definicao: 'Memória não volátil que pode ser apagada e regravada eletricamente, byte a byte. Guarda pequenas configurações que precisam sobreviver ao desligamento.',
    vidaReal: 'Arduino, chaves de carro, monitores.',
    cena: 'eeprom',
    narracao: [
      '> Olhe esta grade de bytes.',
      '> Apenas um único byte brilha.',
      '> Valor antigo: 0x1F.',
      '> Valor novo: 0x2A.',
      '> O restante permanece intacto.',
      '> Regravação byte a byte.'
    ]
  },
  {
    id: 'flash',
    resposta: 'FLASH',
    nome: 'Flash',
    familia: 'permanente',
    fase: 1,
    pista: 'Evolução que apaga e grava em blocos, presente em pendrives e cartões.',
    dica1: 'Memória permanente · 5 letras',
    definicao: 'Evolução da EEPROM que apaga e grava em blocos, o que a torna mais densa e barata.',
    vidaReal: 'Pendrives, cartões SD, SSDs, celulares.',
    cena: 'flash',
    narracao: [
      '> Agora veja esta grade de blocos.',
      '> Para regravar, o bloco inteiro apaga.',
      '> Um clarão de luz!',
      '> Todo o bloco reescrito de uma vez.',
      '> Diferente de byte a byte: em blocos.'
    ]
  },
  {
    id: 'massa',
    resposta: 'MEMORIADEMASSA',
    nome: 'Memória de massa (armazenamento)',
    familia: 'permanente',
    fase: 2,
    pista: 'Guarda arquivos por muito tempo, com grande capacidade, como HD ou SSD.',
    dica1: 'Memória permanente · 14 letras',
    definicao: 'Armazenamento de grande capacidade e baixo custo por byte. É não volátil, porém bem mais lenta que a RAM.',
    vidaReal: 'HDs e SSDs.',
    cena: 'massa',
    narracao: [
      '> O pacote nasce dentro do disco.',
      '> Capacidade enorme disponível.',
      '> Mas observe o relógio...',
      '> O acesso é bem mais lento.',
      '> Grande espaço, menor velocidade.'
    ]
  },
  {
    id: 'dma',
    resposta: 'DMA',
    nome: 'DMA',
    familia: 'barramento',
    fase: 2,
    pista: 'Permite que periféricos movam blocos de dados sem ocupar o processador.',
    dica1: 'Comunicação entre componentes · 3 letras',
    definicao: 'Controlador que move blocos de dados entre dispositivos e a memória sem passar pela CPU, deixando-a livre para outras tarefas.',
    vidaReal: 'Placa de som, disco, rede.',
    cena: 'dma',
    narracao: [
      '> Duas rotas visíveis na placa.',
      '> O pacote vai do disco à memória...',
      '> ...por uma trilha própria!',
      '> Enquanto isso, o processador descansa.',
      '> Transferência sem ocupar o cérebro.'
    ]
  },
  {
    id: 'ram',
    resposta: 'RAM',
    nome: 'RAM',
    familia: 'volatil',
    fase: 2,
    pista: 'Volátil e veloz, mantém temporariamente aplicativos e dados em execução no dispositivo.',
    dica1: 'Memória volátil · 3 letras',
    definicao: 'Memória principal de acesso aleatório. É rápida e volátil e guarda programas e dados em uso.',
    vidaReal: 'Os "8 GB" ou "16 GB" de um computador.',
    cena: 'ram',
    narracao: [
      '> Células de memória se acendem.',
      '> O programa está carregado.',
      '> Rápida, acessível, essencial.',
      '> Mas corte a energia...',
      '> Tudo desaparece. Volátil.'
    ]
  },
  {
    id: 'addrbus',
    resposta: 'ADDRESSBUS',
    nome: 'Address bus (barramento de endereço)',
    familia: 'barramento',
    fase: 3,
    pista: 'Caminho de sentido único que informa qual posição acessar na memória.',
    dica1: 'Comunicação entre componentes · 10 letras',
    definicao: 'Barramento unidirecional (CPU → memória/dispositivos) que carrega o endereço da posição acessada. Com n linhas, endereça 2ⁿ posições.',
    vidaReal: 'Ligações internas entre processador e memória.',
    cena: 'addrbus',
    narracao: [
      '> Um feixe de linhas sai do processador.',
      '> Destino: a memória.',
      '> Carregando o endereço 0x2F.',
      '> Setas em uma só direção.',
      '> Com n linhas, 2ⁿ posições possíveis.'
    ]
  },
  {
    id: 'databus',
    resposta: 'DATABUS',
    nome: 'Data bus (barramento de dados)',
    familia: 'barramento',
    fase: 3,
    pista: 'Via bidirecional que transporta valores lidos e escritos entre chip e memória.',
    dica1: 'Comunicação entre componentes · 7 letras',
    definicao: 'Barramento bidirecional que transporta os dados lidos e escritos. Sua largura (8, 16, 32, 64 bits) define quanto dado trafega por vez.',
    vidaReal: 'Trilhas na placa-mãe ligando componentes.',
    cena: 'databus',
    narracao: [
      '> O valor percorre a trilha.',
      '> Ida: leitura da memória.',
      '> Volta: escrita na memória.',
      '> Mão dupla!',
      '> Largura em bits define a vazão.'
    ]
  },
  {
    id: 'cpu',
    resposta: 'CPU',
    nome: 'CPU',
    familia: 'cerebro',
    fase: 4,
    pista: 'Chip que busca, decodifica e executa cada instrução do programa.',
    dica1: 'Parte do processador · 3 letras',
    definicao: 'Executa o ciclo busca → decodificação → execução. Reúne UC, ULA e registradores.',
    vidaReal: 'O "cérebro" de qualquer computador ou celular.',
    cena: 'cpu',
    narracao: [
      '> Câmera sobe ao chip principal.',
      '> O cérebro do computador.',
      '> Vista explodida: três blocos internos.',
      '> Ciclo: busca → decodifica → executa.',
      '> Tudo começa e termina aqui.'
    ]
  },
  {
    id: 'uc',
    resposta: 'UC',
    nome: 'UC (Unidade de Controle)',
    familia: 'cerebro',
    fase: 4,
    pista: 'Coordena o processador, gerando sinais que dizem a cada parte o que fazer.',
    dica1: 'Parte do processador · 2 letras',
    definicao: 'Busca e decodifica instruções e gera os sinais de controle que coordenam as demais partes.',
    vidaReal: 'Dentro de todo processador moderno.',
    cena: 'uc',
    narracao: [
      '> Linhas finas saem deste bloco.',
      '> Sinais de controle se propagam.',
      '> Cada parte recebe sua ordem.',
      '> Na sequência certa, no tempo certo.',
      '> O maestro da orquestra digital.'
    ]
  },
  {
    id: 'ula',
    resposta: 'ULA',
    nome: 'ULA',
    familia: 'cerebro',
    fase: 4,
    pista: 'Bloco interno que soma, subtrai e compara dentro do processador.',
    dica1: 'Parte do processador · 3 letras',
    definicao: 'Unidade Lógica e Aritmética. Soma, subtrai, compara e executa operações lógicas (AND, OR, NOT).',
    vidaReal: 'Em todo processador, faz os cálculos.',
    cena: 'ula',
    narracao: [
      '> Dois valores entram: 5 e 3.',
      '> Soma: 5 + 3 = 8.',
      '> Comparação: 5 > 3? Verdadeiro!',
      '> Operação lógica: AND, OR, NOT.',
      '> Todas as contas passam por aqui.'
    ]
  },
  {
    id: 'reg',
    resposta: 'REGISTRADORES',
    nome: 'Registradores',
    familia: 'cerebro',
    fase: 4,
    pista: 'Posições de memória dentro do processador, as mais velozes do sistema.',
    dica1: 'Memória interna ao caminho do processador · 13 letras',
    definicao: 'Memórias minúsculas dentro da CPU. Guardam operandos, resultados e o endereço da próxima instrução. São as mais rápidas do sistema.',
    vidaReal: 'Invisíveis ao usuário, essenciais ao processador.',
    cena: 'reg',
    narracao: [
      '> Slots minúsculos dentro do chip.',
      '> Guardando 5 no primeiro slot.',
      '> Guardando 3 no segundo.',
      '> Resultado 8 entra no terceiro.',
      '> Tempo de acesso: quase instantâneo!',
      '> Muito mais rápido que a memória principal.'
    ]
  },
  {
    id: 'cache',
    resposta: 'CACHE',
    nome: 'Cache',
    familia: 'cerebro',
    fase: 4,
    pista: 'Minúscula e ultrarrápida, guarda cópias dos dados mais requisitados.',
    dica1: 'Memória interna ao caminho do processador · 5 letras',
    definicao: 'Memória pequena e muito rápida entre CPU e RAM. Aproveita que dados usados há pouco tendem a ser usados de novo.',
    vidaReal: 'Níveis L1, L2, L3 dentro do processador.',
    cena: 'cache',
    narracao: [
      '> Primeira busca: dado vai até a memória principal.',
      '> Caminho longo, acesso lento.',
      '> Segunda busca do mesmo dado...',
      '> Encontrado aqui, bem mais perto!',
      '> Acerto! Contador de hits sobe.'
    ]
  },
  {
    id: 'micro',
    resposta: 'MICROCONTROLADOR',
    nome: 'Microcontrolador',
    familia: 'chip',
    fase: 5,
    pista: 'Chip compacto com processador, memória e portas integrados para tarefas dedicadas.',
    dica1: 'Tipo de chip · 16 letras',
    definicao: 'CPU, memória e portas de entrada e saída em um único chip, para tarefas dedicadas.',
    vidaReal: 'Micro-ondas, máquina de lavar, Arduino.',
    cena: 'micro',
    narracao: [
      '> Zoom out: tudo o que você viu...',
      '> Processador, memória, portas...',
      '> Tudo cabe num único chip pequeno!',
      '> Um LED pisca, um sensor responde.',
      '> Um computador completo em miniatura.'
    ]
  },
  {
    id: 'dual',
    resposta: 'DUALCORE',
    nome: 'Dual core',
    familia: 'chip',
    fase: 5,
    pista: 'Processador com par de unidades independentes que executam instruções simultaneamente.',
    dica1: 'Tipo de chip · 8 letras',
    definicao: 'Dois núcleos completos no mesmo chip, executando duas tarefas realmente ao mesmo tempo.',
    vidaReal: 'Celulares e notebooks com dois núcleos.',
    cena: 'dual',
    narracao: [
      '> O processador se divide em dois.',
      '> Cada metade é um núcleo completo.',
      '> Tarefa A no núcleo 1.',
      '> Tarefa B no núcleo 2.',
      '> Ambas avançam ao mesmo tempo!'
    ]
  },
  {
    id: 'quad',
    resposta: 'QUADCORE',
    nome: 'Quad core',
    familia: 'chip',
    fase: 5,
    pista: 'Processador com quarteto de unidades independentes de execução para elevado paralelismo.',
    dica1: 'Tipo de chip · 8 letras',
    definicao: 'Quatro núcleos no mesmo chip. Mais paralelismo, mas o ganho depende de o programa conseguir dividir o trabalho.',
    vidaReal: 'Desktops, servidores e celulares topo de linha.',
    cena: 'quad',
    narracao: [
      '> Agora são quatro núcleos.',
      '> Quatro tarefas simultâneas.',
      '> A barra de progresso acelera!',
      '> Mas atenção: o ganho depende...',
      '> ...de o programa saber dividir o trabalho.'
    ]
  }
];

// --- Siglas proibidas (para validação das pistas) ---
var SIGLAS_PROIBIDAS = {
  rom:     ['somente leitura', 'apenas leitura', 'read only'],
  eeprom:  ['apagável eletricamente', 'electrically erasable', 'programável apagável'],
  flash:   [],
  massa:   ['armazenamento de massa'],
  dma:     ['acesso direto', 'direct memory', 'acesso direto à memória'],
  ram:     ['acesso aleatório', 'random access'],
  addrbus: ['barramento de endereço', 'address bus'],
  databus: ['barramento de dados', 'data bus'],
  cpu:     ['unidade central', 'central processing'],
  uc:      ['unidade de controle'],
  ula:     ['unidade lógica', 'lógica e aritmética', 'arithmetic logic'],
  reg:     [],
  cache:   [],
  micro:   [],
  dual:    ['dual core', 'dois núcleos'],
  quad:    ['quad core', 'quatro núcleos']
};

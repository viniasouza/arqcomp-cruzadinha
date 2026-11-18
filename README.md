# Arq Game - A Jornada do Dado

Jogo web educativo interativo sobre **Arquitetura Computacional**,  O projeto combina duas camadas complementares que compartilham o mesmo estado: uma **Jornada 3D guiada** por dentro do computador e uma **Cruzadinha técnica completa e independente**

---

## 🚀 Como Jogar

### 1. A Jornada 3D
- Acompanhe a viagem de um **pacote de dados luminoso** percorrendo trilhas e componentes de uma placa-mãe 3D através de 5 fases temáticas:
  1. **Partida**: Memórias de boot e inicialização (ROM, EEPROM, Flash)
  2. **Carregando o programa**: Armazenamento e tráfego principal (Memória de massa, DMA, RAM)
  3. **As estradas**: Barramentos do sistema (Address bus, Data bus)
  4. **O cérebro**: Unidade Central de Processamento e memórias internas (CPU, UC, ULA, Registradores, Cache)
  5. **Chips completos**: Unidades integradas e paralelismo (Microcontrolador, Dual core, Quad core)
- O **Terminal Sci-Fi** narra passo a passo o funcionamento elétrico e lógico de cada parada.
- Ao responder corretamente, o termo é revelado com um **Cartão Técnico** detalhado e é **automaticamente preenchido na cruzadinha**.

### 2. A Cruzadinha (Totalmente Independente)
- O jogador pode acessar a cruzadinha diretamente pelo menu a qualquer momento, sem necessidade de realizar a jornada prévia.
- **Grade 20×20** gerada e validada matematicamente por script de backtracking, contendo todas as **16 palavras** conectadas entre si.
- **Navegação completa por teclado**:
  - `Setas`: navegam entre casas ativas.
  - `Digitação`: preenche a letra e avança para a próxima casa.
  - `Backspace`: apaga e retorna à casa anterior.
  - `Espaço` ou `Clique`: alterna o sentido entre Horizontal e Vertical em interseções.
  - `Tab` / `Shift+Tab`: salta para a próxima ou anterior palavra.
  - `Home` / `End`: move para o início ou final da palavra em foco.
- **Botão Conferir**: valida o tabuleiro, destacando palavras certas em verde (com ícone ✓ na lista) e erradas em vermelho (com ícone ✗), atualizando o contador no formato exato `X de 16 palavras`.
- **Botão Reiniciar**: abre modal próprio de confirmação para limpar as letras do tabuleiro e o resultado da conferência, sem apagar o progresso da jornada.

### 3. Modo Arrastar (Drag & Drop)
- Tanto na jornada quanto na cruzadinha, há um seletor **Digitar | Arrastar**.
- No modo arrastar, são exibidos chips luminosos com as palavras:
  - Arraste com o mouse ou toque até o rótulo do componente ou a primeira casa da grade.
  - Possui fallback de acessibilidade por clique duplo (clique no chip e depois no alvo).

### 4. Sistema de Dicas
- **Nível 0 (Grátis)**: o terminal reexplica em linguagem simples o que acontece na cena.
- **Nível 1**: revela a categoria do componente e a quantidade de letras.
- **Nível 2**: revela a primeira letra da palavra (penalidade de −1 estrela).

---

## 📋 Lista Oficial de Termos e Pistas

A grade possui 16 termos (9 horizontais e 7 verticais):

### Horizontais
- **3. CPU** — Chip que busca, decodifica e executa cada instrução do programa.
- **5. ULA** — Bloco interno que soma, subtrai e compara dentro do processador.
- **8. MICROCONTROLADOR** — Chip compacto com processador, memória e portas integrados para tarefas dedicadas.
- **10. CACHE** — Minúscula e ultrarrápida, guarda cópias dos dados mais requisitados.
- **11. ADDRESSBUS** — Caminho de sentido único que informa qual posição acessar na memória.
- **12. DMA** — Permite que periféricos movam blocos de dados sem ocupar o processador.
- **13. DATABUS** — Via bidirecional que transporta valores lidos e escritos entre chip e memória.
- **14. ROM** — Gravada na fábrica, inicia o aparelho sem depender de energia contínua.
- **15. RAM** — Volátil e veloz, mantém temporariamente aplicativos e dados em execução no dispositivo.

### Verticais
- **1. QUADCORE** — Processador com quarteto de unidades independentes de execução para elevado paralelismo.
- **2. DUALCORE** — Processador com par de unidades independentes que executam instruções simultaneamente.
- **4. EEPROM** — Chip que regrava configurações um byte por vez, sem perder dados ao desligar.
- **6. UC** — Coordena o processador, dizendo a cada parte o que fazer e quando.
- **7. FLASH** — Evolução que apaga e grava em blocos, presente em pendrives e cartões.
- **8. MEMORIADEMASSA** — Guarda arquivos por muito tempo, com grande capacidade, como HD ou SSD.
- **9. REGISTRADORES** — Posições de memória dentro do processador, as mais velozes do sistema.

---

## 🛠️ Tecnologias e Arquitetura

- **HTML5 Semântico**: marcação limpa com atributos de acessibilidade WAI-ARIA (`role="grid"`, `aria-live`, `aria-label`).
- **CSS3 Puro**:
  - CSS 3D Transforms (`perspective`, `transform-style: preserve-3d`, `rotateX/Y/Z`, `translate3d`).
  - CSS Grid para renderização da matriz 20×20 da cruzadinha.
  - CSS Custom Properties (`:root`) para temas de cores dinâmicas por família de componentes.
  - Suporte completo a `prefers-reduced-motion: reduce`.
- **JavaScript Vanilla (ES5/ES6 puro)**:
  - Scripts clássicos sem módulos (`<script src="...">`), funcionando direto do disco (`file:///`).
  - Pointer Events API para drag & drop fluido com suporte touch e mouse.
  - Web Audio API para síntese nativa de efeitos sonoros (sem arquivos de áudio externos).
  - `localStorage` encapsulado com `try/catch` para persistência robusta.
  - Animação de pacote em trilha vetorial via `SVGPathElement.getPointAtLength`.

---

## 📁 Estrutura de Arquivos

```
arq-game/
├── index.html               # Ponto de entrada obrigatório na raiz
├── style.css                # Design system completo sci-fi e responsividade
├── dados.js                 # Constantes, 16 termos, layout da grade e narrações
├── script.js                # Lógica de jogo, 3D, áudio, eventos e cruzadinha
├── README.md                # Documentação técnica e instruções
└── ferramentas/
    ├── gerar-grade.js       # Script de desenvolvimento (backtracking para gerar o layout)
    └── validar.js           # Suíte de validação de qualidade e regras acadêmicas
```

---

## 🧪 Validação Automatizada de Qualidade

Para auditar e validar todos os requisitos obrigatórios, execute:

```bash
node ferramentas/validar.js
```

O validador verifica:
1. Pistas com no máximo 15 palavras.
2. Ausência de respostas ou siglas por extenso proibidas nas pistas.
3. Conectividade da grade (componente conexo único com 16 palavras).
4. Mínimo de 3 palavras em cada direção (H: 9, V: 7).
5. Coerência total dos cruzamentos de caracteres.
6. Numeração sequencial canônica de pistas (esquerda→direita, cima→baixo).
7. Ausência de sequências acidentais de 2 ou mais letras.

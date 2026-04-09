/**
 * Assistente Digital D4630 — WhatsApp Bot com Menu Interativo
 * Funciona em PRIVADO e em GRUPOS (como a Segunda-Feira do Telegram)
 *
 * Provedores de IA (gratis):
 *   - OpenRouter (Nemotron 120B, Gemma, etc.) — R$ 0
 *   - Cache local (FAQ) — R$ 0
 *
 * Dados SEMPRE frescos:
 *   - Recarrega conhecimento-rotary-d4630.txt a cada mensagem
 *   - Admin pode adicionar eventos/FAQs via WhatsApp
 *
 * Como rodar:
 *   1. Preencha .env com OPENROUTER_API_KEY
 *   2. node index.js
 *   3. Escaneie o QR Code
 *   4. Funciona em conversas privadas E grupos!
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// --- Config ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const ADMIN_NUMBERS = (process.env.ADMIN_NUMBERS || '').split(',').filter(Boolean);

// Nome do bot (para detectar mencoes em grupos)
const BOT_NAMES = ['d4630', 'bot', 'assistente', 'rotary bot', 'robô', 'robo'];

// Procura conhecimento no mesmo dir (cloud) ou no pai (local)
const CONHECIMENTO_PATH = fs.existsSync(path.join(__dirname, 'conhecimento-rotary-d4630.txt'))
  ? path.join(__dirname, 'conhecimento-rotary-d4630.txt')
  : path.join(__dirname, '..', 'conhecimento-rotary-d4630.txt');
let CONHECIMENTO = fs.readFileSync(CONHECIMENTO_PATH, 'utf-8');
let lastKnowledgeLoad = Date.now();

// Recarrega conhecimento automaticamente (max 1x por minuto)
function recarregarConhecimento() {
  const agora = Date.now();
  if (agora - lastKnowledgeLoad < 60_000) return; // max 1x por minuto
  try {
    const novo = fs.readFileSync(CONHECIMENTO_PATH, 'utf-8');
    if (novo !== CONHECIMENTO) {
      CONHECIMENTO = novo;
      console.log(`🔄 Base atualizada automaticamente (${(CONHECIMENTO.length/1024).toFixed(1)}KB)`);
    }
    lastKnowledgeLoad = agora;
  } catch { /* arquivo nao mudou */ }
}

// Metricas
const metricas = { cache: 0, ia: 0, total: 0, erros: 0 };
let reconnectAttempts = 0;

// Rate limit
const RATE_LIMIT = 15;
const RATE_WINDOW = 60 * 60 * 1000;
const rates = new Map();
function checkRate(n) {
  const now = Date.now(), r = rates.get(n);
  if (!r) { rates.set(n, { c: 1, t: now }); return true; }
  if (now - r.t > RATE_WINDOW) { rates.set(n, { c: 1, t: now }); return true; }
  if (r.c >= RATE_LIMIT) return false;
  r.c++; return true;
}

// Fila de processamento
const MAX_CONCURRENT = 5;
let processing = 0;
const queue = [];
function enqueue(fn) {
  return new Promise(resolve => {
    queue.push({ fn, resolve });
    drain();
  });
}
function drain() {
  while (processing < MAX_CONCURRENT && queue.length) {
    const { fn, resolve } = queue.shift();
    processing++;
    fn().then(r => { processing--; resolve(r); drain(); })
        .catch(() => { processing--; resolve(null); drain(); });
  }
}

// ============================================================
// MENU INTERATIVO (estilo banco)
// ============================================================

const MENU_PRINCIPAL = `🤖 *Assistente Digital D4630*
━━━━━━━━━━━━━━━━━━━━━

Escolha uma opcao digitando o *numero*:

1️⃣  📅  *Calendario* — Proximos eventos
2️⃣  🌐  *My Rotary* — Como usar o portal
3️⃣  🏆  *Metas* — Rotary Club Central
4️⃣  📋  *Marca* — Uso do logo e cores
5️⃣  💰  *Fundacao* — Contribuicoes
6️⃣  📱  *UnyClub* — Plataforma de gestao
7️⃣  🤝  *Ser Rotariano* — Como participar
8️⃣  👔  *Lideranca* — Governador e equipe
9️⃣  📞  *Contatos* — Falar com o distrito
0️⃣  💬  *Pergunta livre* — Fale com a IA

━━━━━━━━━━━━━━━━━━━━━
_Digite o numero ou escreva sua duvida_`;

const RESPOSTAS_MENU = {
  '1': `📅 *Proximos Eventos do D4630*
━━━━━━━━━━━━━━━━━━━━━

📌 *11/04/2026* — Seminario PELS 2026-27
    _OBRIGATORIO para presidentes eleitos_
    Todos os 112 clubes confirmados

📌 *25/04/2026* — Assembleia Distrital Interact
    _OBRIGATORIO_

📌 *26/04/2026* — ADIRC - Assembleia Distrital Rotaract
    _OBRIGATORIO para Rotaract_

📌 *22/05/2026* — Conferencia Distrital Sol Nascente
    _OBRIGATORIO_

📌 *27/06/2026* — Transmissao de Cargo / Posse
    _OBRIGATORIO_

📌 *01/07/2026* — Inicio Ano Rotario 2026-2027

📌 *27/08/2026* — Instituto Rotary do Brasil

━━━━━━━━━━━━━━━━━━━━━
🔗 Inscricoes: rotary4630.org.br > Calendario
📲 Digite *menu* para voltar`,

  '2': `🌐 *My Rotary — Como Usar*
━━━━━━━━━━━━━━━━━━━━━

🔗 Acesse: *my.rotary.org/pt*

*Como criar sua conta:*
1️⃣ Acesse my.rotary.org
2️⃣ Clique em "Registrar"
3️⃣ Informe email + numero de socio
4️⃣ Crie senha e pergunta de seguranca
5️⃣ Ative pelo email de confirmacao

*O que voce encontra:*
📊 *Rotary Club Central* — metas do clube
📚 *Central de Aprendizagem* — cursos gratis
🔍 *Pesquisa de Clubes* — por cidade
📋 *Gestao de Clube* — secretaria/financeiro

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '3': `🏆 *Metas 2026-2027 — Rotary Club Central*
━━━━━━━━━━━━━━━━━━━━━

📍 Acesse: my.rotary.org > *Rotary Club Central*

*4 abas de metas:*
👥 *Quadro Social* — novos socios, retencao
🤲 *Servico* — projetos por area de enfoque
💰 *Fundacao Rotaria* — contribuicoes
📢 *Imagem Publica* — eventos, campanhas

✨ *NOVIDADE 2026-2027:*
A meta eh que cada clube supere *seu proprio melhor*!
Nao eh competicao com outros clubes.

🎖️ Premiacao na Conferencia 2027 para TODOS
que superarem seu historico.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '4': `📋 *Uso da Marca Rotary*
━━━━━━━━━━━━━━━━━━━━━

🔗 Diretrizes: *brandcenter.rotary.org*

*Regras basicas:*
✅ Usar logo oficial (roda dentada + "Rotary")
❌ NAO alterar cores ou proporcoes
✅ Manter area de protecao ao redor
✅ Nome do clube separado do logo

*Cores oficiais:*
🔵 Azul Royal: *#005DAA*
🟡 Dourado: *#F7A81B*

*Templates prontas:* Brand Center
*Duvidas:* Comissao de Imagem Publica

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '5': `💰 *Fundacao Rotaria*
━━━━━━━━━━━━━━━━━━━━━

A Fundacao eh o braco filantropico do Rotary.

*Tipos de contribuicao:*
📗 *Fundo Anual* — subsidios distritais e globais
💉 *PolioPlus* — erradicacao da polio
🏦 *Doacao Permanente* — sustentabilidade
🆘 *Resposta a Desastres*

🎯 Meta: *US$100/ano* por rotariano (EREY)

*Subsidios:*
🔹 Distritais — aprovados pelo distrito
🔹 Globais — parceria internacional

🔗 Contribuir: my.rotary.org > Doacao

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '6': `📱 *UnyClub — Plataforma de Gestao*
━━━━━━━━━━━━━━━━━━━━━

🔗 *www.unyclub.com.br*
📲 App disponivel: iOS e Android

*Funcionalidades:*
📅 Gestao de eventos e inscricoes
✅ Frequencia de associados (tempo real)
💳 Sistema financeiro com pagamento
📰 Noticias do distrito e clubes
📋 Calendario de atividades
🎫 Credenciais para eventos

*Acesso:* login e senha do clube/distrito
*Contato:* contato@unyclub.com.br

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '7': `🤝 *Como Se Tornar Rotariano*
━━━━━━━━━━━━━━━━━━━━━

*Passo a passo:*
1️⃣ Encontre um clube: rotary4630.org.br/clubes
2️⃣ Visite uma reuniao (qualquer pessoa pode!)
3️⃣ Conheca os membros
4️⃣ O clube avalia e aprova
5️⃣ Cerimonia de posse 🎉

*Para jovens:*
🔵 *Interact* — 12 a 18 anos
🟢 *Rotaract* — a partir de 18 anos (SEM limite de idade!)

*Requisitos:*
✅ Maior de idade
✅ Boa reputacao na comunidade
✅ Interesse em servir

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '8': `👔 *Lideranca do Distrito 4630*
━━━━━━━━━━━━━━━━━━━━━

*Governador 2025-2026:*
🏛️ Celso Yoshiaki Miyamoto
   Conjuge: Luciana Murara Miyamoto

*Governador Eleito 2026-2027:*
🏛️ Ricardo de Oliveira

*Lema 2026-2027:*
✨ *"Crie Impacto Duradouro"*
(Create Lasting Impact)

A ideia central: cada clube busca ser
*melhor do que ele mesmo ja foi*.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,

  '9': `📞 *Contatos do Distrito 4630*
━━━━━━━━━━━━━━━━━━━━━

🌐 *Site:* rotary4630.org.br
📧 *Contato:* Menu > Contato no site

*Areas especificas:*
📢 Imagem Publica → Comissao de Imagem
💰 Fundacao Rotaria → Comissao de Fundacao
💳 Financeiro/Anuidades → Tesouraria
👥 Cadastro de socios → Secretaria
💻 Tecnologia/UnyClub → Comissao de TI

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`,
};

// ============================================================
// IA (OpenRouter gratis)
// ============================================================

function getSystemPrompt() {
  return `Voce eh o Assistente Digital do Distrito 4630 do Rotary International.
Voce funciona em conversas privadas e em GRUPOS de WhatsApp.

REGRAS ABSOLUTAS:
1. Responda APENAS com base no CONTEXTO abaixo.
2. NUNCA invente datas, valores, nomes, locais ou regras.
3. Seja cordial e objetivo. Maximo 200 palavras.
4. Formate para WhatsApp: *negrito* para destaques, quebras de linha, max 2-3 emojis.
5. Trate todos por "companheiro(a)" ou pelo nome.
6. Se for pergunta FINANCEIRA: "Questoes financeiras precisam ser tratadas com a tesouraria. Contato: rotary4630.org.br/fale-conosco"
7. No final, diga: "Digite *menu* para ver as opcoes."
8. NUNCA responda sobre assuntos fora do Rotary/Distrito 4630.
9. Em grupos, seja CONCISO — max 150 palavras.
10. Se a informacao PARCIAL estiver no contexto (ex: data existe mas local nao), responda o que sabe e diga claramente o que NAO tem. Exemplo: "A ADIRC sera dia 26/04/2026. O local ainda nao esta na minha base. Consulte: rotary4630.org.br/agenda-distrital"
11. Se NAO encontrar NADA, diga: "Nao encontrei essa informacao. Consulte rotary4630.org.br/fale-conosco ou pergunte ao seu Governador Assistente."
12. Links uteis por assunto:
   - Eventos: rotary4630.org.br/agenda-distrital
   - Clubes: rotary4630.org.br/clubes
   - Contato: rotary4630.org.br/fale-conosco
   - Equipe/GAs: rotary4630.org.br/equipe-distrital
   - My Rotary: my.rotary.org/pt
   - Marca: brandcenter.rotary.org

CONTEXTO:
${CONHECIMENTO}`;
}

let openrouter = null;
if (OPENROUTER_API_KEY) {
  const OpenAI = require('openai');
  openrouter = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: OPENROUTER_API_KEY });
}

let claude = null;
if (CLAUDE_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  claude = new Anthropic({ apiKey: CLAUDE_API_KEY });
}

const MODELOS_FREE = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
];

async function responderIA(mensagem, nome) {
  const userMsg = `[Nome: ${nome}] ${mensagem}`;

  // OpenRouter (gratis)
  if (openrouter) {
    for (const modelo of MODELOS_FREE) {
      try {
        const r = await openrouter.chat.completions.create({
          model: modelo, max_tokens: 600,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: userMsg }
          ]
        });
        const txt = r.choices?.[0]?.message?.content;
        if (txt) {
          metricas.ia++;
          console.log(`  🧠 [${modelo.split('/')[1].split(':')[0]}]`);
          return txt;
        }
      } catch { /* proximo modelo */ }
    }
  }

  // Claude (fallback pago)
  if (claude) {
    try {
      const r = await claude.messages.create({
        model: 'claude-haiku-4-5-20241022', max_tokens: 600, system: getSystemPrompt(),
        messages: [{ role: 'user', content: userMsg }]
      });
      metricas.ia++;
      return r.content[0].text;
    } catch { /* falhou */ }
  }

  metricas.erros++;
  return `Desculpe, nao consegui processar sua pergunta neste momento.

Por favor, tente novamente ou entre em contato:
📞 rotary4630.org.br > Contato

Digite *menu* para ver as opcoes.`;
}

// ============================================================
// PROCESSAR MENSAGEM
// ============================================================

async function processarMensagem(texto, nome) {
  const msg = texto.trim().toLowerCase();

  // Saudacoes → menu
  if (['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'fala', 'salve', 'boa', 'hi', 'hello'].includes(msg)) {
    metricas.cache++;
    const saudacao = nome !== 'Companheiro(a)' ? `Ola, ${nome}! 👋\n\n` : 'Ola, companheiro(a)! 👋\n\n';
    return saudacao + MENU_PRINCIPAL;
  }

  // Menu
  if (['menu', 'voltar', 'inicio', 'opcoes', 'ajuda', 'help'].includes(msg)) {
    metricas.cache++;
    return MENU_PRINCIPAL;
  }

  // Opcoes numericas
  if (RESPOSTAS_MENU[msg]) {
    metricas.cache++;
    return RESPOSTAS_MENU[msg];
  }

  // Financeiro (direto pra tesouraria)
  if (/anuidade|pagamento|valor|quanto custa|pagar|boleto|tesourar/i.test(msg)) {
    metricas.cache++;
    return `💳 *Questoes Financeiras*
━━━━━━━━━━━━━━━━━━━━━

Questoes sobre anuidade, pagamentos e valores precisam ser tratadas diretamente com a *Tesouraria do Distrito*.

📞 Contato: rotary4630.org.br > Contato
📧 Selecione "Tesouraria" no formulario

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Prova quadrupla (pergunta frequente)
  if (/prova quadrupla|4 perguntas|quatro perguntas|teste etico/i.test(msg)) {
    metricas.cache++;
    return `⚖️ *A Prova Quadrupla*
━━━━━━━━━━━━━━━━━━━━━

Teste etico que rotarianos aplicam:

1️⃣ Eh a *VERDADE*?
2️⃣ Eh *JUSTO* para todos os interessados?
3️⃣ Criara *BOA VONTADE* e *MELHORES AMIZADES*?
4️⃣ Sera *BENEFICO* para todos os interessados?

Criada por Herbert J. Taylor em 1932.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Areas de enfoque
  if (/area.*enfoque|7 area|sete area|enfoque/i.test(msg)) {
    metricas.cache++;
    return `🎯 *7 Areas de Enfoque do Rotary*
━━━━━━━━━━━━━━━━━━━━━

1️⃣ Consolidacao da Paz
2️⃣ Prevencao de Doencas
3️⃣ Agua e Saneamento
4️⃣ Saude Materno-Infantil
5️⃣ Educacao Basica
6️⃣ Desenvolvimento Economico
7️⃣ Meio Ambiente 🌿

Todo projeto Rotary deve estar alinhado
a pelo menos uma dessas areas.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // DQA / PETS / SETS
  if (/dqa|quadro associativo/i.test(msg)) {
    metricas.cache++;
    return `👥 *DQA — Desenvolvimento do Quadro Associativo*
━━━━━━━━━━━━━━━━━━━━━

Responsavel por atrair e reter socios.

*Dicas:*
✅ Convidar profissionais da comunidade
✅ Engajar novos membros desde o inicio
✅ Criar comite de acolhimento
✅ Reunioes atrativas e produtivas
✅ Valorizar cada contribuicao

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  if (/pets|sets|pels|treinamento|seminario/i.test(msg)) {
    metricas.cache++;
    return `📚 *Seminarios de Treinamento*
━━━━━━━━━━━━━━━━━━━━━

*PETS* — Presidentes Eleitos
*SETS* — Secretarios Eleitos
*PELS* — Todos os Lideres Eleitos

📌 Proximo: *PELS em 11/04/2026*
   (OBRIGATORIO — 112 clubes confirmados)

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Busca por clube especifico
  if (/dia.*reuni|reuni.*clube|contato.*clube|presidente.*clube|clube.*campo|clube.*maring|clube.*cianorte|clube.*umuarama|clube.*loanda|clube.*goioer/i.test(msg)) {
    metricas.cache++;
    return `🔍 *Buscar Informacoes de Clubes*
━━━━━━━━━━━━━━━━━━━━━

Para encontrar dia de reuniao, contato do presidente e endereco de qualquer clube:

1️⃣ *Site:* rotary4630.org.br/clubes
   Busque pelo nome da cidade

2️⃣ *UnyClub:* www.unyclub.com.br
   App com todos os clubes (iOS/Android)

3️⃣ *My Rotary:* my.rotary.org
   Pesquisa de Clubes > por cidade

O D4630 possui *112 clubes* em cidades do norte/noroeste do Parana.

📞 Duvida? Pergunte ao GA da sua regiao.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Verificacao de artes / marca
  if (/arte|banner|camiseta|convite|logo.*clube|verificar.*marca|padrao.*visual|imagem.*publica/i.test(msg)) {
    metricas.cache++;
    return `🎨 *Verificacao de Artes e Marca*
━━━━━━━━━━━━━━━━━━━━━

Antes de publicar ou imprimir, verifique:

✅ Logo na versao oficial (roda dentada + "Rotary")
✅ Cores corretas: Azul *#005DAA* e Dourado *#F7A81B*
✅ Area de protecao ao redor do logo respeitada
✅ Nome do clube separado do logo

❌ NAO esticar, distorcer ou adicionar efeitos
❌ NAO usar logos antigos ou nao-oficiais
❌ NAO alterar as cores

🔗 Templates oficiais: *brandcenter.rotary.org*

📩 Em duvida? Envie a arte para a *Comissao de Imagem Publica* do distrito antes de imprimir!

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // ADIRC
  if (/adirc|assembleia.*rotaract/i.test(msg)) {
    metricas.cache++;
    return `📋 *ADIRC — Assembleia Distrital do Rotaract*
━━━━━━━━━━━━━━━━━━━━━

📌 *26/04/2026* — ADIRC
   OBRIGATORIO para todos os Rotaract

O Rotaract agora eh a partir de *18 anos*,
sem limite de idade superior!

🔗 Inscricoes: rotary4630.org.br > Calendario

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Contatos uteis (governador, secretaria, GAs)
  if (/contato.*governa|secretaria.*governa|ga .*distrito|governador.*assistente/i.test(msg)) {
    metricas.cache++;
    return `📞 *Contatos Uteis do Distrito*
━━━━━━━━━━━━━━━━━━━━━

👔 *Governador 2025-26:* Celso Yoshiaki Miyamoto
👔 *Governador Eleito 26-27:* Ricardo de Oliveira

📋 *Secretaria da Governadoria:*
   rotary4630.org.br > Contato > Secretaria

👥 *Governadores Assistentes (GAs):*
   Cada regiao tem seu GA.
   Consulte: rotary4630.org.br > Equipe

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  if (/empresa cidada|patrocin/i.test(msg)) {
    metricas.cache++;
    return `🏢 *Programa Empresa Cidada*
━━━━━━━━━━━━━━━━━━━━━

Permite empresas apoiarem projetos Rotary.

*Beneficios:*
🎖️ Selo "Empresa Cidada Rotary"
🤝 Networking com lideres empresariais
📢 Visibilidade em materiais do Rotary
🎉 Participacao em eventos

*Como aderir:* Contate o clube mais proximo
ou a secretaria do distrito.

━━━━━━━━━━━━━━━━━━━━━
📲 Digite *menu* para voltar`;
  }

  // Tudo que nao eh cache → IA
  return responderIA(texto, nome);
}

// ============================================================
// ADMIN COMMANDS
// ============================================================

function isAdmin(n) { return ADMIN_NUMBERS.length > 0 && ADMIN_NUMBERS.includes(n); }

async function handleAdmin(cmd) {
  if (cmd === '!admin status' || cmd === '!status') {
    const { cache, ia, total, erros } = metricas;
    const pct = total > 0 ? ((cache / total) * 100).toFixed(0) : 0;
    return `📊 *Status Bot D4630*\nTotal: ${total}\nCache: ${cache} (${pct}%)\nIA: ${ia}\nErros: ${erros}\nProcessando: ${processing}/${MAX_CONCURRENT}\nBase: ${(CONHECIMENTO.length/1024).toFixed(1)}KB`;
  }
  if (cmd.startsWith('!admin add evento ')) {
    const ev = cmd.replace('!admin add evento ', '').trim();
    CONHECIMENTO = CONHECIMENTO.replace('Para inscricoes e detalhes:', `${ev}\n${'Para inscricoes e detalhes:'}`);
    fs.writeFileSync(CONHECIMENTO_PATH, CONHECIMENTO, 'utf-8');
    return `✅ Evento adicionado: "${ev}"`;
  }
  if (cmd.startsWith('!admin add faq ')) {
    const c = cmd.replace('!admin add faq ', '').trim().split('|').map(s => s.trim());
    if (c.length < 2) return '❌ Formato: !admin add faq pergunta | resposta';
    CONHECIMENTO = CONHECIMENTO.replace('FIM DA BASE', `P: ${c[0]}\nR: ${c[1]}\n\nFIM DA BASE`);
    fs.writeFileSync(CONHECIMENTO_PATH, CONHECIMENTO, 'utf-8');
    return `✅ FAQ: ${c[0]}`;
  }
  if (cmd === '!admin reload') {
    CONHECIMENTO = fs.readFileSync(CONHECIMENTO_PATH, 'utf-8');
    return `🔄 Base recarregada (${(CONHECIMENTO.length/1024).toFixed(1)}KB)`;
  }
  if (cmd === '!admin' || cmd === '!admin help') {
    return `🔧 *Comandos:*\n!admin status\n!admin add evento [texto]\n!admin add faq [P] | [R]\n!admin reload`;
  }
  return null;
}

// ============================================================
// BOT WHATSAPP
// ============================================================

async function iniciarBot() {
  if (!OPENROUTER_API_KEY && !CLAUDE_API_KEY) {
    console.error('\n❌ Configure OPENROUTER_API_KEY no .env');
    console.error('   Obtenha gratis em: https://openrouter.ai/keys\n');
    process.exit(1);
  }

  console.log('\n🤖 Assistente Digital D4630 — WhatsApp');
  console.log('========================================');
  console.log(`📚 Base: ${(CONHECIMENTO.length / 1024).toFixed(1)}KB (auto-reload)`);
  console.log(`🧠 IA: OpenRouter (GRATIS) + ${MODELOS_FREE.length} modelos`);
  console.log(`📦 Menu interativo: 9 opcoes + cache`);
  console.log(`👥 GRUPOS: ATIVADO (responde por mencao/palavra-chave)`);
  console.log(`💬 PRIVADO: responde TUDO`);
  console.log(`🔄 Dados: recarrega automaticamente a cada minuto`);
  console.log(`⚡ Concorrencia: ${MAX_CONCURRENT} msgs simultaneas`);
  console.log(`🔒 Rate limit: ${RATE_LIMIT} msgs/hora`);
  console.log('\n⏳ Abrindo navegador...\n');

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, 'wwebjs_auth') }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    }
  });

  client.on('qr', (qr) => {
    console.log('\n📱 ESCANEIE O QR CODE ABAIXO:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n👆 WhatsApp > 3 pontos > Aparelhos conectados > Conectar\n');
  });

  client.on('ready', () => {
    reconnectAttempts = 0;
    console.log('✅ CONECTADO! Bot ativo e aguardando mensagens.\n');
  });

  client.on('auth_failure', () => {
    console.error('❌ Auth falhou. Delete wwebjs_auth/ e reinicie.');
  });

  client.on('disconnected', (reason) => {
    console.log(`⚠️ Desconectado: ${reason}`);
    reconnectAttempts++;
    if (reconnectAttempts <= 5) {
      setTimeout(() => client.initialize(), 5000 * reconnectAttempts);
    } else {
      console.log('❌ Limite de reconexoes. Reinicie: node index.js');
      process.exit(1);
    }
  });

  // ============================================================
  // LOGICA DE GRUPOS: quando responder?
  // ============================================================
  // Em PRIVADO: responde TUDO
  // Em GRUPO: responde quando:
  //   - Mencionam o bot (@bot, "d4630", "assistente", "bot")
  //   - Digitam numero do menu (1-9, 0)
  //   - Digitam palavras-chave (menu, rotary, evento, etc.)
  //   - Mensagem comeca com "!" (comando)
  //   - Bot eh mencionado com @

  function deveResponderNoGrupo(texto, mentions, botNumber) {
    const msg = texto.toLowerCase().trim();

    // Mencionaram o bot via @
    if (mentions && mentions.length > 0) {
      if (mentions.some(m => m.id && m.id._serialized === botNumber)) return true;
    }

    // Comeca com comando
    if (msg.startsWith('!') || msg.startsWith('/')) return true;

    // Digitou numero do menu
    if (/^[0-9]$/.test(msg)) return true;

    // Palavras-chave que ativam o bot
    const gatilhos = [
      'menu', 'ajuda', 'help', 'opcoes',
      ...BOT_NAMES,
      'evento', 'calendario', 'my rotary', 'fundacao', 'unyclub',
      'prova quadrupla', 'area de enfoque', 'como ser rotariano',
      'pets', 'sets', 'pels', 'seminario', 'conferencia',
      'governador', 'lideranca', 'contato distrito',
    ];
    if (gatilhos.some(g => msg.includes(g))) return true;

    // Saudacao direta ao bot (ex: "oi bot", "ola assistente")
    if (/^(oi|ola|hey|fala|salve).*(bot|d4630|assistente|robo)/i.test(msg)) return true;

    return false;
  }

  client.on('message', async (msg) => {
    if (msg.fromMe) return;
    if (!msg.body || !msg.body.trim()) return;

    const isGrupo = msg.from.includes('@g.us');
    const numero = isGrupo ? msg.author : msg.from;
    const texto = msg.body.trim();

    // Em grupo: so responde se for relevante
    if (isGrupo) {
      const botNumber = client.info?.wid?._serialized || '';
      const mentions = await msg.getMentions().catch(() => []);
      if (!deveResponderNoGrupo(texto, mentions, botNumber)) return;
    }

    // Recarrega conhecimento automaticamente
    recarregarConhecimento();

    const contact = await msg.getContact();
    const nome = contact.pushname || contact.name || 'Companheiro(a)';

    // Admin?
    if (texto.startsWith('!admin') && isAdmin(numero)) {
      const r = await handleAdmin(texto);
      if (r) { await msg.reply(r); return; }
    }

    const local = isGrupo ? '(GRUPO)' : '(PV)';
    console.log(`📩 ${local} ${nome}: ${texto}`);
    metricas.total++;

    if (!checkRate(numero)) {
      await msg.reply('⏳ Voce atingiu o limite de mensagens. Tente em alguns minutos.\n\nDigite *menu* para ver as opcoes.');
      return;
    }

    const chat = await msg.getChat();
    chat.sendStateTyping();

    enqueue(async () => {
      // Limpa mencao do bot no texto antes de processar
      let textoLimpo = texto;
      for (const bn of BOT_NAMES) {
        textoLimpo = textoLimpo.replace(new RegExp(bn, 'gi'), '').trim();
      }
      // Remove @mentions
      textoLimpo = textoLimpo.replace(/@\d+/g, '').trim();
      if (!textoLimpo) textoLimpo = 'menu'; // se so mencionou o bot, mostra menu

      const resposta = await processarMensagem(textoLimpo, nome);
      await msg.reply(resposta);

      const tipo = metricas.cache > 0 ? 'CACHE' : 'IA';
      console.log(`  ✅ ${local} [${tipo}] → ${nome} (${resposta.length} chars)`);
      logMetricas();
    });
  });

  client.initialize();
}

function logMetricas() {
  const { cache, ia, total } = metricas;
  const pct = total > 0 ? ((cache / total) * 100).toFixed(0) : 0;
  console.log(`  📊 ${total} msgs | Cache ${pct}% | IA: ${ia} | Fila: ${queue.length}\n`);
}

iniciarBot();

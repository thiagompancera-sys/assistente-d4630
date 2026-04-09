/**
 * Assistente Digital D4630 — WhatsApp Cloud API (Meta Official)
 *
 * Bot oficial via Meta WhatsApp Business API.
 * - 1.000 conversas/mes GRATIS
 * - Numero exclusivo do bot (sem usar pessoal)
 * - 24/7 sem PC ligado (roda em servidor)
 * - Igual bancos fazem
 *
 * Como configurar:
 *   1. Crie app em developers.facebook.com
 *   2. Ative WhatsApp Business
 *   3. Configure webhook apontando pra este servidor
 *   4. Preencha .env com os tokens
 *   5. node whatsapp-cloud.js
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Meta WhatsApp Config ---
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'rotary_d4630_verify';

// --- IA Config ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';

// Base de conhecimento
const CONHECIMENTO_PATH = path.join(__dirname, '..', 'conhecimento-rotary-d4630.txt');
let CONHECIMENTO = fs.readFileSync(CONHECIMENTO_PATH, 'utf-8');

// Metricas
const metricas = { cache: 0, ia: 0, total: 0, erros: 0 };

// Rate limit
const rates = new Map();
function checkRate(n) {
  const now = Date.now(), r = rates.get(n);
  if (!r) { rates.set(n, { c: 1, t: now }); return true; }
  if (now - r.t > 3600000) { rates.set(n, { c: 1, t: now }); return true; }
  if (r.c >= 15) return false;
  r.c++; return true;
}

// Fila
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
// ENVIAR MENSAGEM VIA WHATSAPP CLOUD API
// ============================================================

async function enviarMensagem(para, texto) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: para,
        type: 'text',
        text: { body: texto }
      })
    });
    const data = await res.json();
    if (data.error) console.error('[META ERRO]', data.error.message);
    return data;
  } catch (e) {
    console.error('[ENVIO ERRO]', e.message);
  }
}

// Enviar menu com botoes interativos (Meta suporta nativamente!)
async function enviarMenuInterativo(para, nome) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: para,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: '🤖 Assistente D4630' },
          body: { text: `Ola${nome !== 'Companheiro(a)' ? ', ' + nome : ''}! 👋\n\nSou o Assistente Digital do *Distrito 4630*.\nEscolha uma opcao ou escreva sua duvida:` },
          footer: { text: 'Distrito 4630 — Rotary International' },
          action: {
            button: '📋 Ver opcoes',
            sections: [
              {
                title: 'Informacoes',
                rows: [
                  { id: 'menu_calendario', title: '📅 Calendario', description: 'Proximos eventos e prazos' },
                  { id: 'menu_myrotary', title: '🌐 My Rotary', description: 'Como usar o portal' },
                  { id: 'menu_metas', title: '🏆 Metas 2026-2027', description: 'Rotary Club Central' },
                  { id: 'menu_marca', title: '📋 Uso da Marca', description: 'Logo, cores, templates' },
                  { id: 'menu_fundacao', title: '💰 Fundacao Rotaria', description: 'Contribuicoes e subsidios' },
                ]
              },
              {
                title: 'Servicos',
                rows: [
                  { id: 'menu_unyclub', title: '📱 UnyClub', description: 'Plataforma de gestao' },
                  { id: 'menu_rotariano', title: '🤝 Ser Rotariano', description: 'Como participar' },
                  { id: 'menu_lideranca', title: '👔 Lideranca', description: 'Governador e equipe' },
                  { id: 'menu_contatos', title: '📞 Contatos', description: 'Falar com o distrito' },
                  { id: 'menu_pergunta', title: '💬 Pergunta livre', description: 'Fale com a IA' },
                ]
              }
            ]
          }
        }
      })
    });
  } catch (e) {
    // Fallback pra texto simples se interactive falhar
    await enviarMensagem(para, MENU_TEXTO(nome));
  }
}

// Menu em texto (fallback)
function MENU_TEXTO(nome) {
  return `Ola${nome !== 'Companheiro(a)' ? ', ' + nome : ''}! 👋

🤖 *Assistente Digital D4630*
━━━━━━━━━━━━━━━━━━━━━

Escolha digitando o *numero*:

1️⃣  📅  Calendario
2️⃣  🌐  My Rotary
3️⃣  🏆  Metas
4️⃣  📋  Marca
5️⃣  💰  Fundacao
6️⃣  📱  UnyClub
7️⃣  🤝  Ser Rotariano
8️⃣  👔  Lideranca
9️⃣  📞  Contatos
0️⃣  💬  Pergunta livre

_Digite o numero ou escreva sua duvida_`;
}

// ============================================================
// RESPOSTAS DO MENU
// ============================================================

const RESPOSTAS = {
  'menu_calendario': `📅 *Proximos Eventos do D4630*
━━━━━━━━━━━━━━━━━━━━━

📌 *11/04/2026* — Seminario PELS 2026-27
    _OBRIGATORIO para presidentes eleitos_

📌 *25/04/2026* — Assembleia Distrital Interact

📌 *22/05/2026* — Conferencia Distrital Sol Nascente

📌 *27/06/2026* — Transmissao de Cargo / Posse

📌 *01/07/2026* — Inicio Ano Rotario 2026-2027

📌 *27/08/2026* — Instituto Rotary do Brasil

🔗 Inscricoes: rotary4630.org.br > Calendario
📲 Digite *menu* para voltar`,

  'menu_myrotary': `🌐 *My Rotary — Como Usar*
━━━━━━━━━━━━━━━━━━━━━

🔗 Acesse: *my.rotary.org/pt*

*Como criar conta:*
1️⃣ Acesse my.rotary.org
2️⃣ Clique em "Registrar"
3️⃣ Informe email + numero de socio
4️⃣ Crie senha
5️⃣ Ative pelo email

*Funcionalidades:*
📊 Rotary Club Central — metas
📚 Central de Aprendizagem — cursos gratis
🔍 Pesquisa de Clubes
📋 Gestao de Clube

📲 Digite *menu* para voltar`,

  'menu_metas': `🏆 *Metas 2026-2027*
━━━━━━━━━━━━━━━━━━━━━

📍 my.rotary.org > *Rotary Club Central*

*4 abas:*
👥 Quadro Social — socios
🤲 Servico — projetos
💰 Fundacao — contribuicoes
📢 Imagem Publica — campanhas

✨ *NOVIDADE:* Cada clube supera *seu proprio melhor*!
🎖️ Premiacao para TODOS que superarem historico.

📲 Digite *menu* para voltar`,

  'menu_marca': `📋 *Uso da Marca Rotary*
━━━━━━━━━━━━━━━━━━━━━

🔗 *brandcenter.rotary.org*

✅ Logo oficial (roda dentada + "Rotary")
❌ NAO alterar cores/proporcoes
🔵 Azul Royal: #005DAA
🟡 Dourado: #F7A81B

Duvidas: Comissao de Imagem Publica

📲 Digite *menu* para voltar`,

  'menu_fundacao': `💰 *Fundacao Rotaria*
━━━━━━━━━━━━━━━━━━━━━

📗 Fundo Anual — subsidios
💉 PolioPlus — erradicacao
🏦 Doacao Permanente
🆘 Resposta a Desastres

🎯 Meta: *US$100/ano* por rotariano
🔗 my.rotary.org > Doacao

📲 Digite *menu* para voltar`,

  'menu_unyclub': `📱 *UnyClub*
━━━━━━━━━━━━━━━━━━━━━

🔗 *www.unyclub.com.br*
📲 App: iOS e Android

📅 Eventos e inscricoes
✅ Frequencia em tempo real
💳 Sistema financeiro
📰 Noticias do distrito

📲 Digite *menu* para voltar`,

  'menu_rotariano': `🤝 *Como Ser Rotariano*
━━━━━━━━━━━━━━━━━━━━━

1️⃣ Encontre clube: rotary4630.org.br/clubes
2️⃣ Visite uma reuniao
3️⃣ Manifeste interesse
4️⃣ Clube avalia e aprova
5️⃣ Posse 🎉

🔵 *Interact* — 12 a 18 anos
🟢 *Rotaract* — 18 a 30 anos

📲 Digite *menu* para voltar`,

  'menu_lideranca': `👔 *Lideranca D4630*
━━━━━━━━━━━━━━━━━━━━━

🏛️ *Governador 2025-26:* Celso Miyamoto
🏛️ *Gov. Eleito 2026-27:* Ricardo de Oliveira

✨ Lema: *"Crie Impacto Duradouro"*

📲 Digite *menu* para voltar`,

  'menu_contatos': `📞 *Contatos D4630*
━━━━━━━━━━━━━━━━━━━━━

🌐 rotary4630.org.br
📢 Imagem → Comissao de Imagem
💰 Fundacao → Comissao de Fundacao
💳 Financeiro → Tesouraria
👥 Socios → Secretaria
💻 TI → Comissao de TI

📲 Digite *menu* para voltar`,

  'menu_pergunta': `💬 *Pergunta Livre*
━━━━━━━━━━━━━━━━━━━━━

Pode escrever sua duvida que a IA vai responder com base nas informacoes oficiais do Distrito 4630.

Exemplos:
• "O que eh DQA?"
• "Como funciona o PETS?"
• "O que eh a Prova Quadrupla?"

_Escreva sua pergunta:_`,
};

// Mapeamento de numeros para IDs do menu
const NUM_TO_MENU = {
  '1': 'menu_calendario', '2': 'menu_myrotary', '3': 'menu_metas',
  '4': 'menu_marca', '5': 'menu_fundacao', '6': 'menu_unyclub',
  '7': 'menu_rotariano', '8': 'menu_lideranca', '9': 'menu_contatos',
  '0': 'menu_pergunta',
};

// ============================================================
// IA (OpenRouter gratis)
// ============================================================

const SYSTEM_PROMPT = `Voce eh o Assistente Digital do Distrito 4630 do Rotary International.

REGRAS:
1. Responda APENAS com base no CONTEXTO. Se nao encontrar, diga: "Nao encontrei essa informacao. Vou encaminhar para a equipe do distrito."
2. NUNCA invente dados.
3. Max 200 palavras. Formate com *negrito* e emojis (max 3).
4. Trate por "companheiro(a)" ou pelo nome.
5. Se pergunta FINANCEIRA: "Questoes financeiras: Tesouraria do distrito."
6. Final: "Digite *menu* para ver opcoes."
7. NUNCA fale de assuntos fora do Rotary.

CONTEXTO:
${CONHECIMENTO}`;

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

const MODELOS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m2.5:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
];

async function responderIA(msg, nome) {
  const user = `[Nome: ${nome}] ${msg}`;
  if (openrouter) {
    for (const m of MODELOS) {
      try {
        const r = await openrouter.chat.completions.create({
          model: m, max_tokens: 600,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: user }]
        });
        const t = r.choices?.[0]?.message?.content;
        if (t) { metricas.ia++; console.log(`  🧠 ${m.split('/')[1].split(':')[0]}`); return t; }
      } catch { /* next */ }
    }
  }
  if (claude) {
    try {
      const r = await claude.messages.create({
        model: 'claude-haiku-4-5-20241022', max_tokens: 600, system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: user }]
      });
      metricas.ia++; return r.content[0].text;
    } catch { /* fail */ }
  }
  metricas.erros++;
  return 'Desculpe, nao consegui processar agora. Tente novamente ou acesse rotary4630.org.br\n\nDigite *menu* para opcoes.';
}

// ============================================================
// PROCESSAR MENSAGEM
// ============================================================

async function processar(texto, numero, nome) {
  const msg = texto.trim().toLowerCase();

  // Saudacao → menu interativo
  if (['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'fala', 'salve', 'boa', 'hi', 'hello', 'inicio'].includes(msg)) {
    metricas.cache++;
    await enviarMenuInterativo(numero, nome);
    return;
  }

  // Menu
  if (['menu', 'voltar', 'opcoes', 'ajuda', 'help'].includes(msg)) {
    metricas.cache++;
    await enviarMenuInterativo(numero, nome);
    return;
  }

  // Numero → resposta do menu
  if (NUM_TO_MENU[msg]) {
    metricas.cache++;
    await enviarMensagem(numero, RESPOSTAS[NUM_TO_MENU[msg]]);
    return;
  }

  // ID do botao interativo (vem do list reply)
  if (RESPOSTAS[msg]) {
    metricas.cache++;
    await enviarMensagem(numero, RESPOSTAS[msg]);
    return;
  }

  // Financeiro
  if (/anuidade|pagamento|valor|quanto custa|pagar|boleto|tesourar/i.test(msg)) {
    metricas.cache++;
    await enviarMensagem(numero, '💳 Questoes financeiras precisam ser tratadas com a *Tesouraria do Distrito*.\n\n📞 rotary4630.org.br > Contato\n\nDigite *menu* para opcoes.');
    return;
  }

  // IA pra todo o resto
  const resposta = await responderIA(texto, nome);
  await enviarMensagem(numero, resposta);
}

// ============================================================
// WEBHOOK (Meta envia mensagens pra ca)
// ============================================================

// Verificacao do webhook (Meta faz GET pra validar)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado pela Meta!');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receber mensagens (Meta faz POST)
app.post('/webhook', async (req, res) => {
  // Responder 200 imediatamente (Meta exige resposta rapida)
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) return;

    for (const message of value.messages) {
      const numero = message.from;
      const nome = value.contacts?.[0]?.profile?.name || 'Companheiro(a)';

      // Extrair texto (mensagem normal ou resposta de lista)
      let texto = '';
      if (message.type === 'text') {
        texto = message.text.body;
      } else if (message.type === 'interactive') {
        // Resposta de lista/botao
        texto = message.interactive?.list_reply?.id
             || message.interactive?.button_reply?.id
             || '';
      }

      if (!texto.trim()) continue;

      console.log(`📩 ${nome} (${numero}): ${texto}`);
      metricas.total++;

      if (!checkRate(numero)) {
        await enviarMensagem(numero, '⏳ Limite de mensagens atingido. Tente em alguns minutos.');
        continue;
      }

      // Processar na fila
      enqueue(() => processar(texto, numero, nome));
    }
  } catch (e) {
    console.error('[WEBHOOK ERRO]', e.message);
  }
});

// Status / health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: 'Assistente Digital D4630',
    ...metricas,
    provedor: openrouter ? 'OpenRouter (gratis)' : claude ? 'Claude' : 'nenhum'
  });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', ...metricas });
});

// ============================================================
// INICIAR
// ============================================================

if (!OPENROUTER_API_KEY && !CLAUDE_API_KEY) {
  console.error('❌ Configure OPENROUTER_API_KEY no .env');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`\n🤖 Assistente Digital D4630 — WhatsApp Cloud API`);
  console.log(`===================================================`);
  console.log(`📚 Base: ${(CONHECIMENTO.length / 1024).toFixed(1)}KB`);
  console.log(`🧠 IA: OpenRouter (GRATIS)`);
  console.log(`📦 Menu interativo: 10 opcoes com botoes`);
  console.log(`⚡ Concorrencia: ${MAX_CONCURRENT} msgs simultaneas`);
  console.log(`\n🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🔑 Verify Token: ${WEBHOOK_VERIFY_TOKEN}`);

  if (!WHATSAPP_TOKEN) {
    console.log(`\n⚠️  WHATSAPP_TOKEN nao configurado!`);
    console.log(`   Siga o guia abaixo para configurar:\n`);
  } else {
    console.log(`\n✅ Token configurado — pronto para receber mensagens!\n`);
  }
});

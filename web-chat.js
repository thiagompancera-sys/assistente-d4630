/**
 * Assistente Digital D4630 — Web Chat (sem numero de WhatsApp)
 *
 * Roda um servidor web com chat embutido.
 * Qualquer pessoa acessa pelo navegador.
 * Perfeito para demo e testes.
 *
 * Como rodar:
 *   1. Preencha .env com GEMINI_API_KEY
 *   2. node web-chat.js
 *   3. Acesse http://localhost:3000
 */

require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

// Base de conhecimento
// Procura conhecimento no mesmo dir (cloud) ou no pai (local)
const CONHECIMENTO_PATH = fs.existsSync(path.join(__dirname, 'conhecimento-rotary-d4630.txt'))
  ? path.join(__dirname, 'conhecimento-rotary-d4630.txt')
  : path.join(__dirname, '..', 'conhecimento-rotary-d4630.txt');
const CONHECIMENTO = fs.readFileSync(CONHECIMENTO_PATH, 'utf-8');

// Metricas
const metricas = { cache: 0, gemini: 0, claude: 0, total: 0, erros: 0 };

// Rate limit simples por IP
const rateLimits = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 60 * 1000;

function checarRate(ip) {
  const agora = Date.now();
  const r = rateLimits.get(ip);
  if (!r) { rateLimits.set(ip, { count: 1, inicio: agora }); return true; }
  if (agora - r.inicio > RATE_WINDOW) { rateLimits.set(ip, { count: 1, inicio: agora }); return true; }
  if (r.count >= RATE_LIMIT) return false;
  r.count++;
  return true;
}

// ============================================================
// CACHE FAQ
// ============================================================

const FAQ_CACHE = [
  {
    palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'eai', 'fala', 'salve'],
    tipo: 'saudacao',
    resposta: `Olá, companheiro(a)! 👋\n\nSou o *Assistente Digital do Distrito 4630*.\n\nPosso te ajudar com:\n📅 *Calendário* — próximos eventos e prazos\n📋 *Protocolos* — regras, marca, procedimentos\n🌐 *My Rotary* — como usar o portal\n🏆 *Metas* — Rotary Club Central\n❓ *Dúvidas gerais* — sobre o Rotary e o distrito\n\nComo posso te ajudar hoje?`
  },
  {
    palavras: ['proximo evento', 'proximos eventos', 'calendario', 'quando', 'data', 'pels', 'assembleia', 'conferencia', 'transmissao', 'posse'],
    resposta: `📅 *Próximos eventos do D4630:*\n\n• *11/04/2026* — Seminário PELS 2026-27 (OBRIGATÓRIO)\n• *25/04/2026* — Assembleia Distrital Interact (OBRIGATÓRIO)\n• *26/04/2026* — ADIRC - Assembleia Distrital Rotaract (OBRIGATÓRIO)\n• *22/05/2026* — Conferência Distrital Sol Nascente (OBRIGATÓRIO)\n• *27/06/2026* — Transmissão de Cargo / Posse Distrital (OBRIGATÓRIO)\n• *01/07/2026* — Início do Ano Rotário 2026-2027\n• *27/08/2026* — Instituto Rotary do Brasil\n\nPara inscrições: rotary4630.org.br > Calendário`
  },
  {
    palavras: ['prova quadrupla', 'teste etico', '4 perguntas'],
    resposta: `A *Prova Quádrupla* é um teste ético que rotarianos aplicam:\n\n1️⃣ É a *VERDADE*?\n2️⃣ É *JUSTO* para todos os interessados?\n3️⃣ Criará *BOA VONTADE* e *MELHORES AMIZADES*?\n4️⃣ Será *BENÉFICO* para todos os interessados?\n\nCriada pelo rotariano Herbert J. Taylor em 1932.`
  },
  {
    palavras: ['area de enfoque', 'areas de enfoque', '7 areas', 'enfoque'],
    resposta: `As *7 Áreas de Enfoque do Rotary*:\n\n1. Consolidação da Paz e Prevenção de Conflitos\n2. Prevenção e Tratamento de Doenças\n3. Água, Saneamento e Higiene\n4. Saúde Materno-Infantil\n5. Educação Básica e Alfabetização\n6. Desenvolvimento Econômico Comunitário\n7. Meio Ambiente 🌿\n\nTodo projeto Rotary deve estar alinhado a pelo menos uma dessas áreas.`
  },
  {
    palavras: ['my rotary', 'myrotary', 'criar conta', 'registrar', 'portal'],
    resposta: `🌐 *My Rotary* — my.rotary.org/pt\n\nComo criar conta:\n1. Acesse my.rotary.org\n2. Clique em "Registrar"\n3. Informe seu email e número de sócio\n4. Crie senha e pergunta de segurança\n5. Ative a conta pelo email\n\nFuncionalidades:\n• *Rotary Club Central* — metas do clube\n• *Central de Aprendizagem* — cursos online gratuitos\n• *Pesquisa de Clubes* — encontrar clubes por cidade`
  },
  {
    palavras: ['governador', 'ricardo', 'celso'],
    resposta: `👔 *Liderança do Distrito 4630:*\n\n• *Governador 2025-2026:* Celso Yoshiaki Miyamoto\n• *Governador Eleito 2026-2027:* Ricardo de Oliveira\n\nLema 2026-2027: *"Crie Impacto Duradouro"*\nA ideia central: cada clube busca ser melhor do que ele mesmo já foi.`
  },
  {
    palavras: ['anuidade', 'pagamento', 'valor', 'quanto custa', 'pagar', 'financeiro'],
    tipo: 'financeiro',
    resposta: `💳 Questões financeiras (anuidade, pagamentos, valores) precisam ser tratadas diretamente com a *Tesouraria do Distrito*.\n\nEntre em contato pelo site: rotary4630.org.br > Contato`
  },
  {
    palavras: ['como ser', 'tornar rotariano', 'entrar', 'participar', 'interact', 'rotaract'],
    resposta: `🤝 *Como se tornar Rotariano:*\n\n1. Encontre um clube: rotary4630.org.br/clubes\n2. Visite uma reunião (qualquer pessoa pode!)\n3. Conheça os membros e manifeste interesse\n4. O clube avalia e aprova\n5. Cerimônia de posse\n\n*Para jovens:*\n• *Interact* — 12 a 18 anos\n• *Rotaract* — a partir de 18 anos (SEM limite de idade!)`
  },
  {
    palavras: ['adirc', 'assembleia rotaract'],
    resposta: `📋 *ADIRC — Assembleia Distrital do Rotaract*\n\n📌 *26/04/2026* — ADIRC\nOBRIGATÓRIO para todos os Rotaract\n\nO Rotaract agora é a partir de *18 anos*, sem limite de idade superior!\n\n🔗 Inscrições: rotary4630.org.br > Calendário`
  },
  {
    palavras: ['dia reuniao', 'reuniao clube', 'contato clube', 'presidente clube', 'buscar clube'],
    resposta: `🔍 *Buscar Informações de Clubes*\n\nPara encontrar dia de reunião, contato do presidente e endereço:\n\n1. *Site:* rotary4630.org.br/clubes\n2. *UnyClub:* www.unyclub.com.br (app iOS/Android)\n3. *My Rotary:* my.rotary.org > Pesquisa de Clubes\n\nO D4630 possui *112 clubes* no norte/noroeste do Paraná.`
  },
  {
    palavras: ['arte', 'banner', 'camiseta', 'logo clube', 'verificar marca', 'imagem publica'],
    resposta: `🎨 *Verificação de Artes e Marca*\n\nAntes de publicar ou imprimir, verifique:\n✅ Logo oficial (roda dentada + "Rotary")\n✅ Cores: Azul *#005DAA* e Dourado *#F7A81B*\n✅ Área de proteção ao redor do logo\n❌ NÃO esticar, distorcer ou alterar cores\n\n🔗 Templates: *brandcenter.rotary.org*\n📩 Dúvida? Envie a arte para a Comissão de Imagem Pública.`
  },
  {
    palavras: ['contato governador', 'secretaria governadoria', 'governador assistente', 'ga distrito'],
    resposta: `📞 *Contatos Úteis do Distrito*\n\n👔 *Governador 2025-26:* Celso Yoshiaki Miyamoto\n👔 *Governador Eleito 26-27:* Ricardo de Oliveira\n📋 *Secretaria:* rotary4630.org.br > Contato\n👥 *GAs (Gov. Assistentes):* rotary4630.org.br > Equipe`
  }
];

function buscarNoCache(mensagem) {
  const msg = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  let melhor = null, melhorScore = 0;
  for (const faq of FAQ_CACHE) {
    let score = 0;
    for (const p of faq.palavras) {
      if (msg.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) score += p.length;
    }
    if (score > melhorScore) { melhorScore = score; melhor = faq; }
  }
  return melhorScore >= 3 ? melhor : null;
}

// ============================================================
// IA (Gemini gratis + Claude fallback)
// ============================================================

const SYSTEM_PROMPT = `Voce eh o Assistente Digital do Distrito 4630 do Rotary International.

REGRAS:
1. Responda APENAS com base no CONTEXTO abaixo. Se nao encontrar, diga: "Nao encontrei essa informacao. Vou encaminhar para a equipe do distrito."
2. NUNCA invente datas, valores, nomes ou regras.
3. Seja cordial e objetivo. Maximo 200 palavras.
4. Use negrito com * para destaques, quebras de linha, max 2-3 emojis.
5. Trate todos por "companheiro(a)" ou pelo nome.
6. Se for pergunta FINANCEIRA: "Questoes financeiras precisam ser tratadas com a tesouraria."
7. NUNCA responda sobre assuntos fora do Rotary/Distrito 4630.

CONTEXTO:
${CONHECIMENTO}`;

let geminiModel = null;
if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: SYSTEM_PROMPT });
}

let claude = null;
if (CLAUDE_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  claude = new Anthropic({ apiKey: CLAUDE_API_KEY });
}

// OpenRouter (gratis com modelos como google/gemini-2.0-flash-exp:free)
let openrouter = null;
if (OPENROUTER_API_KEY) {
  const OpenAI = require('openai');
  openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
  });
}

async function responderIA(mensagem, nome) {
  const userMsg = `[Nome: ${nome}] ${mensagem}`;

  // Gemini direto (gratis)
  if (geminiModel) {
    try {
      const r = await geminiModel.generateContent(userMsg);
      metricas.gemini++;
      return r.response.text();
    } catch (e) { console.error('[GEMINI]', e.message.substring(0, 100)); }
  }

  // OpenRouter (gratis — tenta modelos em ordem de qualidade)
  if (openrouter) {
    const modelos = [
      'google/gemma-4-31b-it:free',
      'minimax/minimax-m2.5:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'liquid/lfm-2.5-1.2b-instruct:free',
    ];
    for (const modelo of modelos) {
      try {
        const r = await openrouter.chat.completions.create({
          model: modelo,
          max_tokens: 800,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg }
          ]
        });
        const texto = r.choices?.[0]?.message?.content;
        if (texto) {
          metricas.gemini++;
          console.log(`✅ [OPENROUTER/${modelo.split('/')[1]}]`);
          return texto;
        }
      } catch (e) { console.log(`[${modelo.split('/')[1]}] falhou, tentando proximo...`); }
    }
  }

  // Claude (fallback pago)
  if (claude) {
    try {
      const r = await claude.messages.create({
        model: 'claude-haiku-4-5-20241022', max_tokens: 800, system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }]
      });
      metricas.claude++;
      return r.content[0].text;
    } catch (e) { console.error('[CLAUDE]', e.message?.substring(0, 100)); }
  }

  metricas.erros++;
  return 'Desculpe, não consegui processar sua pergunta. Tente novamente ou acesse rotary4630.org.br';
}

async function responder(mensagem, nome) {
  const cache = buscarNoCache(mensagem);
  if (cache) {
    metricas.cache++;
    if (cache.tipo === 'saudacao' && nome) {
      return cache.resposta.replace('companheiro(a)!', `${nome}!`);
    }
    return cache.resposta;
  }
  return responderIA(mensagem, nome || 'Companheiro(a)');
}

// ============================================================
// API ENDPOINT
// ============================================================

app.post('/api/chat', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checarRate(ip)) {
    return res.status(429).json({ error: 'Limite de mensagens atingido. Tente novamente em 1 hora.' });
  }

  const { mensagem, nome } = req.body;
  if (!mensagem || !mensagem.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }

  metricas.total++;
  const resposta = await responder(mensagem.trim(), nome);
  res.json({ resposta, metricas: { total: metricas.total, cache: metricas.cache } });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', ...metricas, provedor: geminiModel ? 'Gemini (gratis)' : claude ? 'Claude' : 'nenhum' });
});

// ============================================================
// PAGINA HTML (chat bonito estilo WhatsApp)
// ============================================================

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Assistente Digital D4630 — Distrito 4630 do Rotary</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b141a; color: #e9edef; height: 100vh; display: flex; flex-direction: column; }

  /* Header */
  .header { background: #1f2c34; padding: 12px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #2a3942; }
  .header .avatar { width: 42px; height: 42px; background: #005daa; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .header .info h2 { font-size: 16px; font-weight: 500; }
  .header .info p { font-size: 12px; color: #8696a0; }
  .header .status { width: 8px; height: 8px; background: #00a884; border-radius: 50%; margin-left: auto; }

  /* Chat area */
  .chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; background: #0b141a url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.03"><text y="50" font-size="50">⚙️</text></svg>') repeat; }

  .msg { max-width: 75%; padding: 8px 12px; border-radius: 8px; font-size: 14.5px; line-height: 1.45; word-wrap: break-word; white-space: pre-wrap; position: relative; }
  .msg.bot { background: #1f2c34; align-self: flex-start; border-top-left-radius: 0; }
  .msg.user { background: #005c4b; align-self: flex-end; border-top-right-radius: 0; }
  .msg .time { font-size: 11px; color: #8696a0; text-align: right; margin-top: 4px; }
  .msg b, .msg strong { color: #e9edef; }

  .typing { align-self: flex-start; background: #1f2c34; padding: 12px 16px; border-radius: 8px; border-top-left-radius: 0; }
  .typing span { display: inline-block; width: 8px; height: 8px; background: #8696a0; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

  /* Input area */
  .input-area { background: #1f2c34; padding: 10px 16px; display: flex; gap: 10px; align-items: center; border-top: 1px solid #2a3942; }
  .input-area input { flex: 1; background: #2a3942; border: none; border-radius: 8px; padding: 10px 14px; color: #e9edef; font-size: 15px; outline: none; }
  .input-area input::placeholder { color: #8696a0; }
  .input-area button { background: #00a884; border: none; border-radius: 50%; width: 42px; height: 42px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
  .input-area button:hover { background: #06cf9c; }
  .input-area button:disabled { background: #2a3942; cursor: not-allowed; }
  .input-area button svg { fill: #1f2c34; width: 20px; height: 20px; }

  /* Quick buttons */
  .quick { padding: 8px 16px; display: flex; gap: 8px; overflow-x: auto; background: #111b21; }
  .quick button { background: #1f2c34; color: #00a884; border: 1px solid #2a3942; border-radius: 16px; padding: 6px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
  .quick button:hover { background: #2a3942; }

  /* Banner */
  .banner { text-align: center; padding: 20px; }
  .banner .logo { font-size: 48px; margin-bottom: 8px; }
  .banner h3 { color: #f7a81b; font-size: 14px; }
  .banner p { color: #8696a0; font-size: 12px; margin-top: 4px; }

  @media (max-width: 600px) {
    .msg { max-width: 88%; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="avatar">⚙️</div>
  <div class="info">
    <h2>Assistente D4630</h2>
    <p>Distrito 4630 — Rotary International</p>
  </div>
  <div class="status" id="statusDot"></div>
</div>

<div class="chat" id="chat">
  <div class="banner">
    <div class="logo">⚙️</div>
    <h3>Assistente Digital do Distrito 4630</h3>
    <p>Pergunte sobre eventos, protocolos, My Rotary, metas e mais</p>
  </div>
</div>

<div class="quick">
  <button onclick="enviarRapido('Olá')">👋 Olá</button>
  <button onclick="enviarRapido('Próximos eventos')">📅 Eventos</button>
  <button onclick="enviarRapido('Como usar o My Rotary?')">🌐 My Rotary</button>
  <button onclick="enviarRapido('Quais as metas 2026-2027?')">🏆 Metas</button>
  <button onclick="enviarRapido('Como me tornar rotariano?')">🤝 Ser Rotariano</button>
  <button onclick="enviarRapido('Áreas de enfoque')">🎯 Enfoque</button>
</div>

<div class="input-area">
  <input type="text" id="input" placeholder="Digite sua dúvida..." autocomplete="off">
  <button id="sendBtn" onclick="enviar()">
    <svg viewBox="0 0 24 24"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
  </button>
</div>

<script>
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
let nome = '';

// Prompt nome
setTimeout(() => {
  addMsg('bot', 'Olá! Antes de começarmos, qual é o seu nome? (ou digite qualquer coisa para continuar como "Companheiro(a)")');
  const handler = () => {
    nome = input.value.trim() || 'Companheiro(a)';
    input.removeEventListener('keydown', handler);
    enviarRapido('Olá');
  };
  const originalEnviar = window.enviar;
  window.enviar = () => {
    nome = input.value.trim() || 'Companheiro(a)';
    input.value = '';
    window.enviar = originalEnviar;
    enviarRapido('Olá');
  };
}, 500);

function addMsg(tipo, texto) {
  const div = document.createElement('div');
  div.className = 'msg ' + tipo;
  // Formatar *negrito*
  let html = texto.replace(/\\*([^*]+)\\*/g, '<b>$1</b>');
  html = html.replace(/\\n/g, '<br>');
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = html + '<div class="time">' + hora + '</div>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function enviar() {
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  addMsg('user', texto);
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: texto, nome })
    });
    const data = await res.json();
    hideTyping();
    if (data.resposta) {
      addMsg('bot', data.resposta);
    } else {
      addMsg('bot', data.error || 'Erro ao processar mensagem.');
    }
  } catch (e) {
    hideTyping();
    addMsg('bot', 'Erro de conexão. Verifique se o servidor está rodando.');
  }
  sendBtn.disabled = false;
  input.focus();
}

function enviarRapido(texto) {
  input.value = texto;
  enviar();
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviar();
});

// Status check
setInterval(async () => {
  try {
    const r = await fetch('/api/status');
    document.getElementById('statusDot').style.background = r.ok ? '#00a884' : '#ea4335';
  } catch { document.getElementById('statusDot').style.background = '#ea4335'; }
}, 30000);
</script>
</body>
</html>`);
});

// ============================================================
// INICIAR
// ============================================================

if (!GEMINI_API_KEY && !CLAUDE_API_KEY && !OPENROUTER_API_KEY) {
  console.error('❌ Configure pelo menos UMA key no .env:');
  console.error('   OPENROUTER_API_KEY  (gratis — openrouter.ai/keys)');
  console.error('   GEMINI_API_KEY      (gratis — aistudio.google.com/apikey)');
  console.error('   CLAUDE_API_KEY      (pago)');
  process.exit(1);
}

app.listen(PORT, () => {
  const provedor = geminiModel ? 'Gemini direto (GRATIS)' : openrouter ? 'OpenRouter/Gemini (GRATIS)' : 'Claude Haiku (pago)';
  console.log(`\n🤖 Assistente Digital D4630 — Web Chat`);
  console.log(`==========================================`);
  console.log(`📚 Base: ${(CONHECIMENTO.length / 1024).toFixed(1)}KB`);
  console.log(`🧠 Provedor: ${provedor}`);
  console.log(`📦 FAQ cache: ${FAQ_CACHE.length} respostas`);
  console.log(`🔒 Rate limit: ${RATE_LIMIT} msgs/hora por IP`);
  console.log(`\n🌐 Acesse: http://localhost:${PORT}\n`);
});

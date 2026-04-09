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
app.use(express.json({ limit: '10mb' }));

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

// ============================================================
// VERIFICACAO DE ARTE / MARCA (upload de imagem)
// ============================================================

const BRAND_CHECK_PROMPT = `Voce eh um especialista em identidade visual do Rotary International.
Analise esta imagem enviada por um clube do Distrito 4630 e verifique se segue as diretrizes da marca Rotary.

DIRETRIZES OFICIAIS DO ROTARY:
- Logo oficial: Roda dentada dourada com "Rotary" ao lado (Masterbrand Signature)
- Cores oficiais: Azul Royal (Pantone 286, #005DAA), Dourado/Amarelo (Pantone 129, #F7A81B)
- O logo NAO pode ser esticado, distorcido, rotacionado ou ter efeitos adicionados
- Area de protecao: deve haver espaco limpo ao redor do logo (minimo = altura da letra "R")
- Nome do clube pode aparecer junto, mas SEPARADO do logo (nunca dentro do logo)
- NAO usar versoes antigas do logo (ex: logo com engrenagem sem "Rotary")
- NAO adicionar sombras, brilhos, contornos ou 3D ao logo
- NAO alterar proporcoes ou cores do logo
- Fundo: preferencialmente branco ou azul escuro para contraste
- Tipografia: fontes limpas e legiveis

ANALISE E RESPONDA EM PORTUGUES com este formato:

✅ **APROVADO** ou ⚠️ **AJUSTES NECESSARIOS** ou ❌ **REPROVADO**

Depois liste:
1. O que esta CORRETO na arte
2. O que precisa ser CORRIGIDO (se houver)
3. SUGESTOES de melhoria

Seja especifico e pratico. Maximo 250 palavras.`;

app.post('/api/verificar-arte', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checarRate(ip)) {
    return res.status(429).json({ error: 'Limite de verificacoes atingido. Tente em 1 hora.' });
  }

  const { imagem } = req.body; // base64 data URL
  if (!imagem) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }

  metricas.total++;

  // Extrair base64 puro (remover "data:image/xxx;base64,")
  const base64Match = imagem.match(/^data:image\/(.*?);base64,(.*)$/);
  if (!base64Match) {
    return res.status(400).json({ error: 'Formato de imagem invalido' });
  }
  const mimeType = 'image/' + base64Match[1];
  const base64Data = base64Match[2];

  try {
    let resultado = null;

    // OpenRouter com modelo de visao
    if (openrouter) {
      const modelosVisao = [
        'google/gemma-4-31b-it:free',
        'meta-llama/llama-4-maverick:free',
      ];
      for (const modelo of modelosVisao) {
        try {
          const r = await openrouter.chat.completions.create({
            model: modelo,
            max_tokens: 800,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: BRAND_CHECK_PROMPT },
                { type: 'image_url', image_url: { url: imagem } }
              ]
            }]
          });
          const txt = r.choices?.[0]?.message?.content;
          if (txt) {
            resultado = txt;
            console.log('[ARTE] Verificado com', modelo);
            break;
          }
        } catch (e) { console.log('[ARTE]', modelo, 'falhou:', e.message?.substring(0, 80)); }
      }
    }

    // Gemini fallback (suporta visao nativo)
    if (!resultado && GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const r = await model.generateContent([
          BRAND_CHECK_PROMPT,
          { inlineData: { mimeType, data: base64Data } }
        ]);
        resultado = r.response.text();
        console.log('[ARTE] Verificado com Gemini');
      } catch (e) { console.log('[ARTE] Gemini falhou:', e.message?.substring(0, 80)); }
    }

    if (resultado) {
      res.json({ resultado });
    } else {
      res.json({ resultado: '⚠️ Nao consegui analisar a imagem neste momento. Envie a arte para a Comissao de Imagem Publica do distrito para verificacao manual.\n\nContato: rotary4630.org.br > Contato' });
    }
  } catch (e) {
    console.error('[ARTE] Erro:', e.message);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
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
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Assistente Digital D4630 — Rotary</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚙️</text></svg>">
<style>
  :root {
    --azul: #005DAA;
    --azul-escuro: #003d73;
    --dourado: #F7A81B;
    --dourado-claro: #ffc94d;
    --bg: #f5f6fa;
    --card: #ffffff;
    --texto: #1a1a2e;
    --texto-soft: #555770;
    --bot-bg: #ffffff;
    --user-bg: #005DAA;
    --sombra: 0 2px 12px rgba(0,0,0,0.08);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--texto); height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }

  /* Header */
  .header { background: linear-gradient(135deg, var(--azul) 0%, var(--azul-escuro) 100%); padding: 14px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,93,170,0.3); position: relative; z-index: 10; }
  .header .logo-wrap { width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
  .header .info { flex: 1; }
  .header .info h1 { font-size: 17px; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
  .header .info p { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 1px; }
  .header .status-badge { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 20px; font-size: 11px; color: #fff; }
  .header .status-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; }

  /* Chat area */
  .chat-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }

  /* Welcome screen */
  .welcome { text-align: center; padding: 24px 16px 8px; }
  .welcome .rotary-icon { width: 72px; height: 72px; background: linear-gradient(135deg, var(--azul), var(--azul-escuro)); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 16px; box-shadow: 0 4px 16px rgba(0,93,170,0.3); }
  .welcome h2 { font-size: 20px; color: var(--texto); margin-bottom: 6px; }
  .welcome p { font-size: 14px; color: var(--texto-soft); line-height: 1.5; max-width: 320px; margin: 0 auto; }

  /* Category grid */
  .categories { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 8px 16px 12px; }
  .cat-card { background: var(--card); border-radius: 14px; padding: 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--sombra); border: 1.5px solid transparent; display: flex; flex-direction: column; gap: 6px; }
  .cat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-color: var(--azul); }
  .cat-card:active { transform: scale(0.97); }
  .cat-card .icon { font-size: 24px; }
  .cat-card .title { font-size: 13px; font-weight: 600; color: var(--texto); line-height: 1.3; }
  .cat-card .desc { font-size: 11px; color: var(--texto-soft); line-height: 1.3; }

  /* Subcategory pills */
  .sub-section { padding: 4px 16px 8px; }
  .sub-section .label { font-size: 11px; font-weight: 600; color: var(--texto-soft); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .sub-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .sub-pill { background: var(--card); border: 1px solid #e2e4ea; border-radius: 20px; padding: 6px 14px; font-size: 12px; color: var(--azul); cursor: pointer; transition: all 0.2s; font-weight: 500; }
  .sub-pill:hover { background: var(--azul); color: #fff; border-color: var(--azul); }

  /* Messages */
  .msg { max-width: 82%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; animation: fadeIn 0.25s ease; }
  .msg.bot { background: var(--bot-bg); align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: var(--sombra); color: var(--texto); }
  .msg.user { background: var(--user-bg); align-self: flex-end; border-bottom-right-radius: 4px; color: #fff; box-shadow: 0 2px 8px rgba(0,93,170,0.25); }
  .msg b, .msg strong { font-weight: 600; }
  .msg.bot b, .msg.bot strong { color: var(--azul); }
  .msg .time { font-size: 10px; color: #999; text-align: right; margin-top: 4px; }
  .msg.user .time { color: rgba(255,255,255,0.6); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* Typing */
  .typing { align-self: flex-start; background: var(--card); padding: 12px 18px; border-radius: 16px; border-bottom-left-radius: 4px; box-shadow: var(--sombra); }
  .typing span { display: inline-block; width: 8px; height: 8px; background: #bbb; border-radius: 50%; margin: 0 2px; animation: bounce 1.3s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.15s; }
  .typing span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }

  /* Back button */
  .back-btn { align-self: flex-start; background: none; border: 1.5px solid #e2e4ea; border-radius: 20px; padding: 6px 16px; font-size: 12px; color: var(--azul); cursor: pointer; margin-bottom: 4px; font-weight: 500; transition: all 0.2s; }
  .back-btn:hover { background: var(--azul); color: #fff; border-color: var(--azul); }

  /* Input */
  .input-area { background: #fff; padding: 12px 16px; display: flex; gap: 10px; align-items: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); border-top: 1px solid #eee; }
  .input-area input { flex: 1; background: var(--bg); border: 1.5px solid #e2e4ea; border-radius: 24px; padding: 11px 18px; color: var(--texto); font-size: 14px; outline: none; transition: border-color 0.2s; }
  .input-area input:focus { border-color: var(--azul); }
  .input-area input::placeholder { color: #aaa; }
  .input-area button { background: var(--azul); border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
  .input-area button:hover { background: var(--azul-escuro); transform: scale(1.05); }
  .input-area button:disabled { background: #ccc; cursor: not-allowed; transform: none; }
  .input-area button svg { fill: #fff; width: 18px; height: 18px; }

  /* Footer */
  .footer { text-align: center; padding: 6px; font-size: 10px; color: #bbb; background: #fff; }
  .footer a { color: var(--azul); text-decoration: none; }

  /* Upload modal */
  .upload-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; justify-content: center; align-items: center; padding: 20px; }
  .upload-overlay.active { display: flex; }
  .upload-box { background: #fff; border-radius: 20px; padding: 28px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
  .upload-box h3 { color: var(--azul); font-size: 18px; margin-bottom: 6px; }
  .upload-box p { color: var(--texto-soft); font-size: 13px; margin-bottom: 20px; line-height: 1.4; }
  .upload-drop { border: 2px dashed #ccc; border-radius: 14px; padding: 30px 20px; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
  .upload-drop:hover, .upload-drop.dragover { border-color: var(--azul); background: #f0f6ff; }
  .upload-drop .drop-icon { font-size: 36px; margin-bottom: 8px; }
  .upload-drop .drop-text { font-size: 13px; color: var(--texto-soft); }
  .upload-drop .drop-text b { color: var(--azul); }
  .upload-preview { max-width: 100%; max-height: 200px; border-radius: 10px; margin: 10px 0; display: none; }
  .upload-actions { display: flex; gap: 10px; justify-content: center; }
  .upload-actions button { padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
  .btn-analisar { background: var(--azul); color: #fff; display: none; }
  .btn-analisar:hover { background: var(--azul-escuro); }
  .btn-analisar:disabled { background: #ccc; cursor: not-allowed; }
  .btn-cancelar { background: #f0f0f0; color: #555; }
  .btn-cancelar:hover { background: #e0e0e0; }
  .upload-result { text-align: left; margin-top: 16px; padding: 14px; background: #f8f9fc; border-radius: 12px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; display: none; }
  .upload-result b, .upload-result strong { color: var(--azul); }

  /* Hide welcome when chatting */
  .chatting .welcome, .chatting .categories, .chatting .sub-section { display: none; }

  @media (max-width: 400px) {
    .categories { grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 12px; }
    .cat-card { padding: 12px 10px; }
    .msg { max-width: 90%; }
  }
  @media (min-width: 600px) {
    .categories { max-width: 500px; margin: 0 auto; }
    .welcome { max-width: 500px; margin: 0 auto; }
    .sub-section { max-width: 500px; margin: 0 auto; }
    .chat-area { max-width: 600px; width: 100%; margin: 0 auto; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo-wrap">⚙️</div>
  <div class="info">
    <h1>Assistente D4630</h1>
    <p>Distrito 4630 — Rotary International</p>
  </div>
  <div class="status-badge">
    <div class="status-dot" id="statusDot"></div>
    Online
  </div>
</div>

<div class="chat-area" id="chatArea">

  <div class="welcome" id="welcome">
    <div class="rotary-icon">⚙️</div>
    <h2>Como posso ajudar?</h2>
    <p>Escolha um tema abaixo ou digite sua d&uacute;vida sobre o Distrito 4630</p>
  </div>

  <div class="categories" id="categories">
    <div class="cat-card" onclick="enviarRapido('Pr&oacute;ximos eventos do distrito')">
      <span class="icon">📅</span>
      <span class="title">Calend&aacute;rio</span>
      <span class="desc">Eventos, PELS, ADIRC, Confer&ecirc;ncia</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('Como usar o My Rotary?')">
      <span class="icon">🌐</span>
      <span class="title">My Rotary</span>
      <span class="desc">Portal, conta, cursos online</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('Quais as metas 2026-2027?')">
      <span class="icon">🏆</span>
      <span class="title">Metas 26-27</span>
      <span class="desc">Rotary Club Central, premia&ccedil;&atilde;o</span>
    </div>
    <div class="cat-card" onclick="abrirUploadArte()">
      <span class="icon">🎨</span>
      <span class="title">Verificar Arte</span>
      <span class="desc">Envie a imagem e a IA analisa</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('Buscar informa&ccedil;&otilde;es de clubes')">
      <span class="icon">🔍</span>
      <span class="title">Buscar Clubes</span>
      <span class="desc">Reuni&otilde;es, contatos, presidentes</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('Contatos &uacute;teis do distrito')">
      <span class="icon">📞</span>
      <span class="title">Contatos</span>
      <span class="desc">Governador, Secretaria, GAs</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('Como me tornar rotariano?')">
      <span class="icon">🤝</span>
      <span class="title">Ser Rotariano</span>
      <span class="desc">Rotary, Rotaract, Interact</span>
    </div>
    <div class="cat-card" onclick="enviarRapido('O que &eacute; a Funda&ccedil;&atilde;o Rot&aacute;ria?')">
      <span class="icon">💰</span>
      <span class="title">Funda&ccedil;&atilde;o</span>
      <span class="desc">Contribui&ccedil;&otilde;es, subs&iacute;dios, EREY</span>
    </div>
  </div>

  <div class="sub-section" id="subSection">
    <div class="label">Perguntas populares</div>
    <div class="sub-pills">
      <div class="sub-pill" onclick="enviarRapido('O que &eacute; a Prova Qu&aacute;drupla?')">Prova Qu&aacute;drupla</div>
      <div class="sub-pill" onclick="enviarRapido('&Aacute;reas de enfoque do Rotary')">7 &Aacute;reas de Enfoque</div>
      <div class="sub-pill" onclick="enviarRapido('O que &eacute; o UnyClub?')">UnyClub</div>
      <div class="sub-pill" onclick="enviarRapido('Quando &eacute; a ADIRC?')">ADIRC</div>
      <div class="sub-pill" onclick="enviarRapido('Lideran&ccedil;a do distrito')">Lideran&ccedil;a</div>
      <div class="sub-pill" onclick="enviarRapido('O que &eacute; Empresa Cidad&atilde;?')">Empresa Cidad&atilde;</div>
    </div>
  </div>

  <div id="messages"></div>
</div>

<div class="input-area">
  <input type="text" id="input" placeholder="Pergunte sobre o Distrito 4630..." enterkeyhint="send" autocomplete="off">
  <button id="sendBtn" onclick="enviar()">
    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  </button>
</div>

<input type="file" id="fileInput" accept="image/*" style="display:none">

<div class="upload-overlay" id="uploadOverlay">
  <div class="upload-box">
    <h3>🎨 Verificar Arte</h3>
    <p>Envie a arte do seu clube e a IA verifica se segue as diretrizes da marca Rotary.</p>
    <div class="upload-drop" id="uploadDrop" onclick="document.getElementById('fileInput').click()">
      <div class="drop-icon">📤</div>
      <div class="drop-text">Clique aqui ou <b>arraste a imagem</b></div>
    </div>
    <img class="upload-preview" id="uploadPreview">
    <div class="upload-actions">
      <button class="btn-cancelar" onclick="fecharUpload()">Cancelar</button>
      <button class="btn-analisar" id="btnAnalisar" onclick="analisarArte()">Analisar Arte</button>
    </div>
    <div class="upload-result" id="uploadResult"></div>
  </div>
</div>

<div class="footer">
  Assistente Digital do <a href="https://rotary4630.org.br" target="_blank">Distrito 4630</a> — Rotary International
</div>

<script>
const chatArea = document.getElementById('chatArea');
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
let chatStarted = false;

function startChat() {
  if (chatStarted) return;
  chatStarted = true;
  chatArea.classList.add('chatting');
}

function addMsg(tipo, texto) {
  startChat();
  const div = document.createElement('div');
  div.className = 'msg ' + tipo;
  let html = texto.replace(/\\*([^*]+)\\*/g, '<b>\$1</b>');
  html = html.replace(/\\n/g, '<br>');
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = html + '<div class="time">' + hora + '</div>';
  messages.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function addBackBtn() {
  const btn = document.createElement('button');
  btn.className = 'back-btn';
  btn.textContent = '← Voltar ao menu';
  btn.onclick = () => {
    chatStarted = false;
    chatArea.classList.remove('chatting');
    messages.innerHTML = '';
    chatArea.scrollTop = 0;
  };
  messages.appendChild(btn);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  messages.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
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
      body: JSON.stringify({ mensagem: texto, nome: 'Companheiro(a)' })
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
    addMsg('bot', 'Erro de conexao. Tente novamente em alguns segundos.');
  }
  addBackBtn();
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
async function checkStatus() {
  try {
    const r = await fetch('/api/status');
    const dot = document.getElementById('statusDot');
    dot.style.background = r.ok ? '#4ade80' : '#ef4444';
  } catch { document.getElementById('statusDot').style.background = '#ef4444'; }
}
checkStatus();
setInterval(checkStatus, 30000);

// ===== UPLOAD DE ARTE =====
let arteBase64 = null;
const fileInput = document.getElementById('fileInput');
const uploadDrop = document.getElementById('uploadDrop');
const uploadPreview = document.getElementById('uploadPreview');
const btnAnalisar = document.getElementById('btnAnalisar');
const uploadResult = document.getElementById('uploadResult');

function abrirUploadArte() {
  document.getElementById('uploadOverlay').classList.add('active');
  arteBase64 = null;
  uploadPreview.style.display = 'none';
  btnAnalisar.style.display = 'none';
  uploadResult.style.display = 'none';
  uploadDrop.style.display = 'block';
}

function fecharUpload() {
  document.getElementById('uploadOverlay').classList.remove('active');
  arteBase64 = null;
}

function processarImagem(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 8 * 1024 * 1024) {
    alert('Imagem muito grande. Maximo 8MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    arteBase64 = e.target.result;
    uploadPreview.src = arteBase64;
    uploadPreview.style.display = 'block';
    uploadDrop.style.display = 'none';
    btnAnalisar.style.display = 'inline-block';
    uploadResult.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) processarImagem(e.target.files[0]);
});

// Drag and drop
uploadDrop.addEventListener('dragover', (e) => { e.preventDefault(); uploadDrop.classList.add('dragover'); });
uploadDrop.addEventListener('dragleave', () => { uploadDrop.classList.remove('dragover'); });
uploadDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadDrop.classList.remove('dragover');
  if (e.dataTransfer.files[0]) processarImagem(e.dataTransfer.files[0]);
});

async function analisarArte() {
  if (!arteBase64) return;
  btnAnalisar.disabled = true;
  btnAnalisar.textContent = 'Analisando...';
  uploadResult.style.display = 'block';
  uploadResult.innerHTML = '<span class="typing"><span></span><span></span><span></span></span> Analisando a arte com IA...';

  try {
    const res = await fetch('/api/verificar-arte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem: arteBase64 })
    });
    const data = await res.json();
    let html = (data.resultado || data.error || 'Erro desconhecido');
    html = html.replace(/\\*([^*]+)\\*/g, '<b>\$1</b>');
    html = html.replace(/\\n/g, '<br>');
    uploadResult.innerHTML = html;
  } catch (e) {
    uploadResult.innerHTML = 'Erro de conexao. Tente novamente.';
  }
  btnAnalisar.disabled = false;
  btnAnalisar.textContent = 'Analisar Novamente';
}
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

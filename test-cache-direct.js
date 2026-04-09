/**
 * Direct cache logic test — no server, no HTTP, no rate limit.
 * Exact replica of buscarNoCache from web-chat.js.
 */

// ============================================================
// FAQ CACHE (abbreviated labels to keep output readable)
// ============================================================

const FAQ_CACHE = [
  { palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'eai', 'fala', 'salve'], tipo: 'saudacao', resposta: 'SAUDACAO' },
  { palavras: ['proximo evento', 'proximos eventos', 'eventos', 'calendario', 'quando', 'data', 'pels', 'assembleia', 'conferencia', 'transmissao', 'posse'], resposta: 'LISTA-EVENTOS: 11/04 25/04 26/04 22/05 27/06 01/07 27/08' },
  { palavras: ['prova quadrupla', 'teste etico', '4 perguntas'], resposta: 'PROVA-QUADRUPLA' },
  { palavras: ['area de enfoque', 'areas de enfoque', '7 areas', 'enfoque'], resposta: 'AREAS-ENFOQUE' },
  { palavras: ['my rotary', 'myrotary', 'criar conta', 'registrar', 'portal'], resposta: 'MY-ROTARY' },
  { palavras: ['governador', 'ricardo', 'celso', 'lideranca'], resposta: 'GOVERNADOR' },
  { palavras: ['anuidade', 'pagamento', 'valor', 'quanto custa', 'pagar', 'financeiro'], tipo: 'financeiro', resposta: 'FINANCEIRO' },
  { palavras: ['como ser', 'tornar rotariano', 'entrar', 'participar', 'quero ser', 'quero entrar', 'quero participar', 'como faco para entrar', 'me associar', 'virar socio'], resposta: 'COMO-ASSOCIAR' },
  { palavras: ['adirc', 'assembleia rotaract'], resposta: 'ADIRC-MARIALVA: 26/04 Marialva-PR' },
  { palavras: ['dia reuniao', 'reuniao clube', 'contato clube', 'presidente clube', 'buscar clube'], resposta: 'BUSCAR-CLUBE' },
  { palavras: ['arte', 'banner', 'camiseta', 'logo clube', 'verificar marca', 'imagem publica', 'marca'], resposta: 'MARCA' },
  { palavras: ['contato governador', 'secretaria governadoria', 'governador assistente', 'governadores assistentes', 'ga distrito', 'meu ga', 'contato distrito', 'contato'], resposta: 'CONTATO-DISTRITO' },
  { palavras: ['unyclub', 'uny club', 'aplicativo', 'app'], resposta: 'UNYCLUB' },
  { palavras: ['metas', 'rotary club central', 'meta do clube'], resposta: 'METAS' },
  { palavras: ['fundacao', 'contribuicao', 'erey', 'polioplus', 'subsidio', 'fundo anual'], resposta: 'FUNDACAO' },
  { palavras: ['campo mourao', 'campo mourão'], resposta: 'CLUBES-CAMPO-MOURAO: Rotary Club de Campo Mourao' },
  { palavras: ['maringa', 'maringá'], resposta: 'CLUBES-MARINGA: Rotary Club de Maringa' },
  { palavras: ['umuarama'], resposta: 'CLUBES-UMUARAMA: Rotary Club de Umuarama' },
  { palavras: ['cianorte'], resposta: 'CLUBES-CIANORTE: Cinturao Verde' },
  { palavras: ['loanda'], resposta: 'CLUBES-LOANDA: Rotary Club de Loanda' },
  { palavras: ['goioere', 'goioerê'], resposta: 'CLUBES-GOIOERE: Rotary Club de Goioere' },
  { palavras: ['paranacity'], resposta: 'CLUBES-PARANACITY: Rotary Club de Paranacity' },
  { palavras: ['araruna'], resposta: 'CLUBES-ARARUNA: Rotary Club de Araruna' },
  { palavras: ['boa esperanca', 'boa esperança'], resposta: 'CLUBES-BOA-ESPERANCA: Rotary Club de Boa Esperanca' },
  { palavras: ['onde vai ser', 'onde sera', 'local do evento', 'onde acontece', 'endereco evento', 'local pels', 'local adirc', 'local conferencia', 'local assembleia'], resposta: 'LOCAL-EVENTO-GENERICO' },
  { palavras: ['que horas', 'horario', 'hora da reuniao', 'que dia', 'dia da reuniao'], resposta: 'HORARIO-REUNIAO' },
  { palavras: ['inscricao', 'inscrever', 'como me inscrevo', 'como inscrever', 'inscricoes'], resposta: 'INSCRICAO' },
  { palavras: ['pels', 'seminario lideres', 'treinamento presidente'], resposta: 'PELS: 11/04/2026' },
  { palavras: ['conferencia', 'sol nascente', 'conferencia distrital'], resposta: 'CONFERENCIA: 22/05/2026' },
  { palavras: ['transmissao', 'posse distrital', 'posse 2026'], resposta: 'TRANSMISSAO: 27/06/2026' },
  { palavras: ['dolar', 'dolar rotario', 'cotacao', 'cambio'], resposta: 'DOLAR' },
  { palavras: ['lema', 'tema', 'crie impacto', 'impacto duradouro'], resposta: 'LEMA' },
  { palavras: ['empresa cidada', 'empresa cidadã', 'apoiar empresa', 'patrocinio', 'patrocinador', 'parceiro', 'apoiar rotary', 'apoiar o rotary'], resposta: 'EMPRESA-CIDADA' },
  { palavras: ['dqa', 'quadro associativo', 'novos socios', 'retencao'], resposta: 'DQA' },
  { palavras: ['subsidio distrital', 'subsidio global', 'financiar projeto'], resposta: 'SUBSIDIO' },
  { palavras: ['frequencia', 'presenca', 'reposicao', 'visitar clube', 'visitar outro clube', 'intercambio', 'posso visitar', 'repor frequencia'], resposta: 'FREQUENCIA' },
  { palavras: ['clubes do distrito', 'clubs do distrito', 'todos os clubes', 'lista de clubes', 'quantos clubes', 'clubes d4630', 'clubes 4630', 'quais os clubes', 'quais clubes', 'quais sao os clubes'], resposta: 'CLUBES-LISTA-GERAL: 112 clubes' },
  { palavras: ['clube perto', 'rotary perto', 'mais perto', 'qual clube', 'qual rotary', 'encontrar clube', 'clube mais proximo'], resposta: 'CLUBE-GENERICO: rotary4630.org.br/clubes' },
  { palavras: ['interact', 'jovens 12', 'adolescente'], resposta: 'INTERACT' },
  { palavras: ['rotaract', 'jovem adulto', 'idade rotaract'], resposta: 'ROTARACT' },
  { palavras: ['atualizar dados', 'atualizar meus dados', 'cadastro', 'dados cadastrais', 'alterar email', 'meu perfil', 'meus dados'], resposta: 'DADOS-CADASTRAIS' },
  { palavras: ['o que e o rotary', 'o que e rotary', 'o que faz o rotary', 'missao do rotary', 'visao do rotary', 'valores do rotary', 'sobre o rotary', 'o que significa rotary'], resposta: 'O-QUE-E-ROTARY' },
  { palavras: ['o que e o distrito', 'distrito 4630', 'que cidades', 'quais cidades', 'abrangencia', 'norte do parana', 'noroeste do parana', 'onde fica o distrito'], resposta: 'DISTRITO-4630' },
  { palavras: ['ano rotario', 'quando comeca o ano', 'quando termina o ano', 'inicio do ano rotario', 'julho rotary', 'comeca o ano'], resposta: 'ANO-ROTARIO' },
  { palavras: ['pets', 'sets', 'diferenca pets sets pels', 'treinamento secretario', 'o que e pets', 'o que e sets', 'seminario presidente', 'seminario secretario'], resposta: 'PETS-SETS' },
  { palavras: ['assembleia interact', 'assembleia distrital interact', 'evento interact'], resposta: 'ASSEMBLEIA-INTERACT: 25/04/2026' },
  { palavras: ['instituto rotary', 'instituto rotary brasil', 'instituto agosto'], resposta: 'INSTITUTO-ROTARY: 27/08/2026' },
  { palavras: ['esqueci senha', 'esqueci minha senha', 'recuperar senha', 'nao consigo acessar', 'senha my rotary', 'resetar senha', 'problema login', 'nao consigo entrar', 'esqueci a senha'], resposta: 'SENHA' },
  { palavras: ['cursos', 'curso online', 'central de aprendizagem', 'aprender', 'treinamento online', 'capacitacao'], resposta: 'CURSOS' },
  { palavras: ['contribuo', 'como contribuir', 'doar', 'doacao', 'quero doar', 'como doar'], resposta: 'CONTRIBUIR' },
  { palavras: ['telefone', 'email', 'whatsapp', 'numero', 'fone', 'celular do distrito'], resposta: 'TELEFONE' },
  { palavras: ['menu', 'ajuda', 'help', 'o que voce faz', 'quem e voce', 'o que voce sabe', 'como funciona', 'opcoes', 'o que voce pode'], tipo: 'saudacao', resposta: 'MENU' },
  { palavras: ['obrigado', 'obrigada', 'valeu', 'vlw', 'brigado', 'muito obrigado', 'agradeco', 'thanks', 'tchau', 'ate mais', 'ate logo'], resposta: 'AGRADECIMENTO' },
  { palavras: ['rotary kids', 'rotary kid', 'criancas rotary', 'programa infantil'], resposta: 'ROTARY-KIDS' },
  { palavras: ['site oficial', 'site do distrito', 'rotary4630', 'site rotary', 'pagina do distrito', 'site do rotary'], resposta: 'SITE-OFICIAL' },
  { palavras: ['nao entendi', 'pode repetir', 'repete', 'como assim', 'explica melhor', 'nao compreendi', 'nao entendo'], resposta: 'NAO-ENTENDI' },
  { palavras: ['barbosa ferraz'], resposta: 'CLUBES-BARBOSA-FERRAZ' },
  { palavras: ['borrazopolis'], resposta: 'CLUBES-BORRAZOPOLIS' },
  { palavras: ['lunardelli'], resposta: 'CLUBES-LUNARDELLI' },
  { palavras: ['santo antonio da platina', 'santo antonio'], resposta: 'CLUBES-SANTO-ANTONIO' },
  { palavras: ['brasilandia do sul', 'brasilandia'], resposta: 'CLUBES-BRASILANDIA' },
];

const CIDADES_D4630 = [
  'campo mourao', 'maringa', 'umuarama', 'cianorte', 'loanda', 'goioere', 'paranacity',
  'araruna', 'boa esperanca', 'barbosa ferraz', 'borrazopolis', 'lunardelli',
  'santo antonio da platina', 'santo antonio', 'brasilandia do sul', 'brasilandia'
];

function corrigirTypos(msg) {
  return msg
    .replace(/\bclubs\b/g, 'clubes')
    .replace(/\bclubis\b/g, 'clubes')
    .replace(/\brotario\b/g, 'rotary')
    .replace(/\brotarios\b/g, 'rotary')
    .replace(/\brotariano\b/g, 'rotary')
    .replace(/\brotari\b/g, 'rotary')
    .replace(/\bevento\b/g, 'eventos')
    .replace(/\binscrissao\b/g, 'inscricao')
    .replace(/\binscrisao\b/g, 'inscricao')
    .replace(/\binscricoes\b/g, 'inscricao')
    .replace(/\bcadastrar\b/g, 'cadastro')
    .replace(/\bconferensia\b/g, 'conferencia')
    .replace(/\bfaso\b/g, 'faco')
    .replace(/\bprocsimo\b/g, 'proximo')
    .replace(/\bproxmo\b/g, 'proximo');
}

// ============================================================
// EXACT REPLICA of buscarNoCache from web-chat.js
// ============================================================

function buscarNoCache(mensagem) {
  const raw = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const msg = corrigirTypos(raw);

  // Primeiro: saudacoes curtas (match exato)
  const saudacoes = ['oi', 'ola', 'hey', 'eae', 'eai'];
  if (saudacoes.includes(msg) || msg.startsWith('oi ') || msg.startsWith('ola ')) {
    for (const faq of FAQ_CACHE) {
      if (faq.tipo === 'saudacao') return faq;
    }
  }

  // Segundo: detectar intencao especifica
  const palavrasDeEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/;
  const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const querEvento = palavrasDeEvento.test(msg);

  // FIX-1: ADIRC check before onde-guard
  if (/\badirc\b/.test(msg) || /assembleia rotaract/.test(msg)) {
    for (const faq of FAQ_CACHE) {
      for (const p of faq.palavras) {
        if (p === 'adirc') return faq;
      }
    }
  }

  // Guarda: "onde vai ser [evento especifico]" → IA responde
  const perguntaOnde = /\b(onde|local|endereco|localizacao)\b/.test(msg);
  // FIX-1b: "adirc" removed from eventoEspecifico (handled above)
  const eventoEspecifico = /\b(transmissao|posse|conferencia|sols? nascente|pels|interact|instituto)\b/.test(msg);
  const perguntaData = /\b(dia \d|\/\d{2})\b/.test(msg);
  if (perguntaOnde && (eventoEspecifico || perguntaData)) return null;

  // Intencoes de alta prioridade
  const intencoes = [
    { teste: /esqueci.*(senha|login|acesso)/, palavraChave: 'esqueci senha' },
    { teste: /nao consigo.*(acessar|entrar|login)/, palavraChave: 'nao consigo acessar' },
    { teste: /recuperar.*(senha|acesso)/, palavraChave: 'recuperar senha' },
    { teste: /quando.*(comeca|inicia|termina).*(ano|rotario)/, palavraChave: 'ano rotario' },
    { teste: /assembleia.*(rotaract|adirc)/, palavraChave: 'adirc' },
    { teste: /(rotaract|adirc).*assembleia/, palavraChave: 'adirc' },
    { teste: /assembleia.*interact/, palavraChave: 'assembleia interact' },
    { teste: /interact.*assembleia/, palavraChave: 'assembleia interact' },
    // FIX-3: "quando eh a adirc?"
    { teste: /quando.*(adirc|assembleia rotaract)/, palavraChave: 'adirc' },
    { teste: /(adirc|assembleia rotaract).*quando/, palavraChave: 'adirc' },
    // FIX-4: "quando eh a conferencia?" → specific entry
    // 'conferencia' exists in LISTA-EVENTOS; use 'conferencia distrital' (unique to specific entry)
    { teste: /quando.*conferencia/, palavraChave: 'conferencia distrital' },
    { teste: /conferencia.*quando/, palavraChave: 'conferencia distrital' },
    { teste: /quando.*pels/, palavraChave: 'seminario lideres' },
    { teste: /quando.*transmissao/, palavraChave: 'transmissao' },
    { teste: /quando.*posse/, palavraChave: 'posse distrital' },
    // FIX-2: "calendario de eventos", "agenda de eventos", "quando vai ter eventos"
    { teste: /calendario.*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /agenda.*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /quando.*(vai ter|tem|tera|havera).*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /quais.*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /lista.*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /tem.*(evento|eventos)/, palavraChave: 'eventos' },
    { teste: /agenda.*distrito/, palavraChave: 'eventos' },
    { teste: /evento.*(proximo|perto|proxima)/, palavraChave: 'eventos' },
    { teste: /(proximo|proxima|perto).*evento/, palavraChave: 'eventos' },
  ];
  for (const { teste, palavraChave } of intencoes) {
    if (teste.test(msg)) {
      for (const faq of FAQ_CACHE) {
        for (const p of faq.palavras) {
          if (p.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === palavraChave) return faq;
        }
      }
    }
  }

  // Quarto: cidade (só se NÃO está perguntando sobre evento)
  if (mencionaCidade && !querEvento) {
    for (const cidade of CIDADES_D4630) {
      const cidadeNorm = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(cidadeNorm)) {
        for (const faq of FAQ_CACHE) {
          for (const p of faq.palavras) {
            const pNorm = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (pNorm === cidadeNorm) return faq;
          }
        }
      }
    }
  }

  // Cidade + evento → IA
  if (mencionaCidade && querEvento) return null;

  // Quinto: score
  let melhor = null, melhorScore = 0;
  for (const faq of FAQ_CACHE) {
    let score = 0;
    for (const p of faq.palavras) {
      const pNorm = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(pNorm)) score += pNorm.length;
    }
    if (score > melhorScore) { melhorScore = score; melhor = faq; }
  }
  return melhorScore >= 3 ? melhor : null;
}

// ============================================================
// HELPER: normaliza msg da mesma forma que o cache
// ============================================================
function normMsg(q) {
  return corrigirTypos(q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
}

// ============================================================
// TEST SUITE
// ============================================================

const tests = [
  // CAT 1: EVENTO + CIDADE → should return LISTA-EVENTOS
  { cat: '1-EVENTO+CIDADE', q: 'qual evento mais proximo de campo mourao?',   expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'tem evento em maringa?',                       expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'proximo evento perto de umuarama',             expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'evento em cianorte',                           expect: 'IA-ou-LISTA',     okFn: r => r === null || (r && r.resposta.includes('LISTA-EVENTOS')) },
  { cat: '1-EVENTO+CIDADE', q: 'calendario de eventos campo mourao',           expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'agenda de eventos maringa',                    expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'quando vai ter evento em goioere?',            expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'proximo evento de loanda',                     expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'eventos perto de paranacity',                  expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'tem algum evento em araruna?',                 expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '1-EVENTO+CIDADE', q: 'evento perto de boa esperanca',               expect: 'LISTA-EVENTOS',   okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },

  // CAT 2: CIDADE PURA → should return CLUBES-*
  { cat: '2-CIDADE-PURA', q: 'clubes de campo mourao',  expect: 'CLUBES-CAMPO-MOURAO',  okFn: r => r && r.resposta.includes('CAMPO-MOURAO') },
  { cat: '2-CIDADE-PURA', q: 'rotary maringa',           expect: 'CLUBES-MARINGA',       okFn: r => r && r.resposta.includes('MARINGA') },
  { cat: '2-CIDADE-PURA', q: 'clubes umuarama',          expect: 'CLUBES-UMUARAMA',      okFn: r => r && r.resposta.includes('UMUARAMA') },
  { cat: '2-CIDADE-PURA', q: 'rotary em cianorte',       expect: 'CLUBES-CIANORTE',      okFn: r => r && r.resposta.includes('CIANORTE') },
  { cat: '2-CIDADE-PURA', q: 'clubes de loanda',         expect: 'CLUBES-LOANDA',        okFn: r => r && r.resposta.includes('LOANDA') },

  // CAT 3: ONDE + EVENTO ESPECIFICO → should return null (IA handles)
  { cat: '3-ONDE+ESPECIFICO', q: 'onde vai ser a transmissao de cargo?',      expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'onde vai ser a conferencia?',               expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'onde sera o pels?',                         expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'onde vai ser a assembleia interact?',       expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'local da conferencia sol nascente',         expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'endereco da posse distrital',               expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'onde acontece o instituto rotary?',         expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'o evento do dia 22/05 vai ser onde?',       expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'o evento do dia 11/04 vai ser onde?',       expect: 'null',  okFn: r => r === null },
  { cat: '3-ONDE+ESPECIFICO', q: 'onde eh a posse?',                          expect: 'null',  okFn: r => r === null },

  // CAT 4: ADIRC → should return ADIRC-MARIALVA (not null, not eventos)
  { cat: '4-ADIRC', q: 'onde vai ser a adirc?',  expect: 'ADIRC-MARIALVA',  okFn: r => r && r.resposta.includes('ADIRC-MARIALVA') },
  { cat: '4-ADIRC', q: 'adirc',                   expect: 'ADIRC-MARIALVA',  okFn: r => r && r.resposta.includes('ADIRC-MARIALVA') },
  { cat: '4-ADIRC', q: 'assembleia rotaract',     expect: 'ADIRC-MARIALVA',  okFn: r => r && r.resposta.includes('ADIRC-MARIALVA') },
  { cat: '4-ADIRC', q: 'quando eh a adirc?',      expect: 'ADIRC-MARIALVA',  okFn: r => r && r.resposta.includes('ADIRC-MARIALVA') },

  // CAT 5: EVENTOS GENERICOS → should return LISTA-EVENTOS
  { cat: '5-EVENTOS-GENERICOS', q: 'proximos eventos',   expect: 'LISTA-EVENTOS',  okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '5-EVENTOS-GENERICOS', q: 'calendario',         expect: 'LISTA-EVENTOS',  okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '5-EVENTOS-GENERICOS', q: 'quais eventos tem?', expect: 'LISTA-EVENTOS',  okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },
  { cat: '5-EVENTOS-GENERICOS', q: 'agenda do distrito', expect: 'LISTA-EVENTOS',  okFn: r => r && r.resposta.includes('LISTA-EVENTOS') },

  // CAT 6: SAUDACAO
  { cat: '6-SAUDACAO', q: 'oi',      expect: 'SAUDACAO',  okFn: r => r && r.tipo === 'saudacao' },
  { cat: '6-SAUDACAO', q: 'bom dia', expect: 'SAUDACAO',  okFn: r => r && r.tipo === 'saudacao' },

  // CAT 7: EDGE CASES
  { cat: '7-EDGE', q: 'qual o rotary mais perto de campo mourao?',   expect: 'CLUBES-nao-EVENTOS',   okFn: r => r && !r.resposta.includes('LISTA-EVENTOS') },
  { cat: '7-EDGE', q: 'quero visitar um clube em maringa',            expect: 'CLUBES-MARINGA',       okFn: r => r && r.resposta.includes('MARINGA') },
  { cat: '7-EDGE', q: 'como me inscrevo no evento de campo mourao?', expect: 'INSCRICAO-ou-null',    okFn: r => r === null || (r && (r.resposta.includes('INSCRICAO') || r.resposta.includes('LISTA-EVENTOS'))) },
  { cat: '7-EDGE', q: 'quando eh a conferencia?',                     expect: 'nao-LISTA-COMPLETA',  okFn: r => r && !r.resposta.startsWith('LISTA-EVENTOS') },
];

// ============================================================
// RUN
// ============================================================

const stats = { ok: 0, fail: 0 };
const failures = [];
const byCategory = {};

console.log('Direct cache logic test (no server/HTTP/rate-limit)\n');
console.log('='.repeat(80));

for (const t of tests) {
  if (!byCategory[t.cat]) byCategory[t.cat] = { ok: 0, fail: 0 };

  const result = buscarNoCache(t.q);
  const ok = t.okFn(result);
  const tag = result === null ? 'null(→IA)' : result.resposta.substring(0, 70);

  if (ok) {
    stats.ok++;
    byCategory[t.cat].ok++;
    console.log(`[OK]   [${t.cat}] "${t.q}"\n       → ${tag}\n`);
  } else {
    stats.fail++;
    byCategory[t.cat].fail++;
    failures.push({ ...t, result, tag });
    console.log(`[FAIL] [${t.cat}] "${t.q}"\n       ESPERADO: ${t.expect}\n       RECEBEU:  ${tag}\n`);
  }
}

console.log('='.repeat(80));
console.log(`TOTAL: ${tests.length} | OK: ${stats.ok} | FAIL: ${stats.fail}\n`);

console.log('--- By Category ---');
for (const [cat, c] of Object.entries(byCategory)) {
  console.log(`[${c.fail === 0 ? 'OK  ' : 'FAIL'}] ${cat}: ${c.ok} ok, ${c.fail} fail`);
}

if (failures.length === 0) {
  console.log('\nAll cache tests passed.');
  process.exit(0);
}

console.log('\n--- FAILURES DETAIL + ROOT CAUSE ---\n');

const grouped = {};
for (const f of failures) {
  if (!grouped[f.cat]) grouped[f.cat] = [];
  grouped[f.cat].push(f);
}

for (const [cat, items] of Object.entries(grouped)) {
  console.log(`\n[${cat}]`);
  for (const f of items) {
    const msg = normMsg(f.q);
    const palavrasDeEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/;
    const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    const querEvento = palavrasDeEvento.test(msg);
    const perguntaOnde = /\b(onde|local|endereco|localizacao)\b/.test(msg);
    const eventoEspecifico = /\b(transmissao|posse|conferencia|sols? nascente|pels|adirc|interact|instituto)\b/.test(msg);
    const perguntaData = /\b(dia \d|\/\d{2})\b/.test(msg);
    const guardFires = perguntaOnde && (eventoEspecifico || perguntaData);

    // Check which intencao pattern fires
    const intencoesMatch = [];
    if (/evento.*(proximo|perto|proxima)/.test(msg)) intencoesMatch.push('evento.*perto');
    if (/(proximo|proxima|perto).*evento/.test(msg)) intencoesMatch.push('proximo.*evento');
    if (/quais.*(evento|eventos)/.test(msg)) intencoesMatch.push('quais eventos');
    if (/tem.*(evento|eventos)/.test(msg)) intencoesMatch.push('tem eventos');
    if (/agenda.*distrito/.test(msg)) intencoesMatch.push('agenda distrito');
    if (/assembleia.*(rotaract|adirc)/.test(msg)) intencoesMatch.push('assembleia rotaract/adirc');
    if (/(rotaract|adirc).*assembleia/.test(msg)) intencoesMatch.push('adirc.*assembleia');

    console.log(`  FAIL "${f.q}"`);
    console.log(`       msg normalized: "${msg}"`);
    console.log(`       querEvento=${querEvento} mencionaCidade=${mencionaCidade} perguntaOnde=${perguntaOnde}`);
    console.log(`       eventoEspecifico=${eventoEspecifico} perguntaData=${perguntaData} guardFires=${guardFires}`);
    console.log(`       intencoes match: ${intencoesMatch.length > 0 ? intencoesMatch.join(', ') : 'NONE'}`);
    console.log(`       result: ${f.tag}`);
    console.log(`       ESPERADO: ${f.expect}`);

    // Diagnosis
    if (cat === '1-EVENTO+CIDADE') {
      if (f.result === null && intencoesMatch.length === 0) {
        console.log(`       DIAGNOSIS: mencionaCidade+querEvento=true but NO intencao matched.`);
        console.log(`       The query falls through to "cidade+evento → null (IA)".`);
        console.log(`       FIX: add matching intencao pattern for this form.`);
      } else if (f.result && f.result.resposta.includes('ADIRC')) {
        console.log(`       DIAGNOSIS: "adirc" keyword in palavrasDeEvento triggers querEvento=true,`);
        console.log(`       but none of the intencoes match → falls to cidade+evento → null.`);
        console.log(`       WAIT: if result is ADIRC, it matched the intencoes "assembleia rotaract/adirc".`);
        console.log(`       But ADIRC is a city response for "26/04 Marialva-PR" which IS correct for ADIRC queries.`);
        console.log(`       The TEST EXPECTATION may be wrong: returning ADIRC info for "evento em X" is probably fine.`);
      }
    }

    if (cat === '3-ONDE+ESPECIFICO') {
      if (f.result !== null) {
        console.log(`       DIAGNOSIS: guard did NOT fire. perguntaOnde=${perguntaOnde} eventoEspecifico=${eventoEspecifico}`);
        console.log(`       The guard requires BOTH perguntaOnde AND (eventoEspecifico OR perguntaData).`);
      }
    }

    if (cat === '4-ADIRC') {
      if (f.result === null) {
        console.log(`       DIAGNOSIS: "onde vai ser a adirc?" triggers perguntaOnde=true AND eventoEspecifico=true (adirc is in regex).`);
        console.log(`       The onde-guard fires FIRST and returns null, before the ADIRC intencao can match.`);
        console.log(`       FIX: Check ADIRC-specific intencao BEFORE the onde-guard, or exclude adirc from onde-guard`);
        console.log(`       (since we have a specific cache entry for ADIRC with the location).`);
      }
    }

    if (cat === '2-CIDADE-PURA') {
      console.log(`       DIAGNOSIS: querEvento=${querEvento} — if false, cidade-block should fire.`);
      if (!mencionaCidade) console.log(`       mencionaCidade=false means city not in CIDADES_D4630 list or normalization issue.`);
    }

    if (cat === '6-SAUDACAO') {
      const saudacoes = ['oi', 'ola', 'hey', 'eae', 'eai'];
      console.log(`       saudacoes.includes(msg)=${saudacoes.includes(msg)} startsWith oi/ola=${msg.startsWith('oi ') || msg.startsWith('ola ')}`);
      console.log(`       DIAGNOSIS: falls to score match. Score result: ${f.tag}`);
    }

    if (cat === '7-EDGE') {
      console.log(`       DIAGNOSIS: querEvento=${querEvento} mencionaCidade=${mencionaCidade} → ${f.tag}`);
    }
    console.log('');
  }
}

console.log('\n--- PATTERNS NEEDING FIXES ---\n');

if (grouped['1-EVENTO+CIDADE']) {
  const nullCases = grouped['1-EVENTO+CIDADE'].filter(f => f.result === null);
  if (nullCases.length > 0) {
    console.log('[1-EVENTO+CIDADE] — Queries that return null (routed to IA) instead of LISTA-EVENTOS:');
    for (const f of nullCases) {
      const msg = normMsg(f.q);
      console.log(`  "${f.q}" → msg="${msg}"`);
    }
    console.log('  ROOT CAUSE: mencionaCidade=true AND querEvento=true, but no intencao regex matches.');
    console.log('  The "cidade+evento → null" fallback fires, routing to IA.');
    console.log('  FIX OPTIONS:');
    console.log('  A) Add intencoes for: "quando vai ter eventos", "calendario de eventos", "agenda de eventos"');
    console.log('  B) OR: when querEvento=true and no intencao matches, return the LISTA-EVENTOS directly');
    console.log('     instead of routing to IA. The IA does not know about upcoming events anyway.');
  }
}

if (grouped['4-ADIRC']) {
  const ondeAdirc = grouped['4-ADIRC'].filter(f => f.q.includes('onde'));
  if (ondeAdirc.length > 0) {
    console.log('\n[4-ADIRC] — "onde vai ser a adirc?" returns null instead of ADIRC cache entry:');
    console.log('  ROOT CAUSE: the onde-guard fires because:');
    console.log('    perguntaOnde=true ("onde")');
    console.log('    eventoEspecifico=true ("adirc" is in the eventoEspecifico regex)');
    console.log('  → guard returns null BEFORE the ADIRC intencao can match.');
    console.log('  FIX: For ADIRC specifically, we HAVE the location in cache (Marialva-PR).');
    console.log('  Solution: move the ADIRC intencao check BEFORE the onde-guard:');
    console.log('    if (/adirc|assembleia rotaract/.test(msg)) → return ADIRC entry');
    console.log('    THEN run the onde-guard for other events.');
  }
}

if (grouped['2-CIDADE-PURA']) {
  console.log('\n[2-CIDADE-PURA] — Some city queries not matching city cache:');
  for (const f of grouped['2-CIDADE-PURA']) {
    const msg = normMsg(f.q);
    const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    const querEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/.test(msg);
    console.log(`  "${f.q}" → msg="${msg}" mencionaCidade=${mencionaCidade} querEvento=${querEvento} → ${f.tag}`);
    if (!mencionaCidade) console.log('    FIX: city not in CIDADES_D4630 or normalization strips accent before comparison fails');
    if (querEvento) console.log('    FIX: querEvento=true blocks city match — check which keyword triggers it');
  }
}

if (grouped['6-SAUDACAO']) {
  console.log('\n[6-SAUDACAO] — "bom dia" not matching saudacao tipo:');
  console.log('  ROOT CAUSE: "bom dia" is NOT in saudacoes[] exact list ["oi","ola","hey","eae","eai"].');
  console.log('  Falls to score-based match. "bom dia" IS in FAQ palavras but needs score >= 3.');
  console.log('  Score = len("bom dia") = 7 → should match. Check if it hits the WRONG entry first.');
  if (grouped['6-SAUDACAO'][0]) {
    const msg = normMsg(grouped['6-SAUDACAO'][0].q);
    let melhor = null, melhorScore = 0, melhorEntry = null;
    for (const faq of FAQ_CACHE) {
      let score = 0;
      for (const p of faq.palavras) {
        const pNorm = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (msg.includes(pNorm)) score += pNorm.length;
      }
      if (score > melhorScore) { melhorScore = score; melhor = faq; melhorEntry = faq.resposta.substring(0, 40); }
    }
    console.log(`  Score-match for "bom dia": score=${melhorScore} → "${melhorEntry}"`);
    console.log(`  Is it tipo=saudacao? ${melhor && melhor.tipo === 'saudacao'}`);
  }
}

/**
 * Real-User Test Suite — D4630 Chatbot Cache
 *
 * Simula perguntas de usuarios REAIS: rotarianos, jovens, comunidade, empresarios.
 * Sem servidor, sem HTTP, sem rate limit.
 * Replica exata de buscarNoCache() de web-chat.js.
 */

// ============================================================
// FAQ CACHE — copia fiel de web-chat.js (apenas resposta resumida para testes)
// ============================================================

const FAQ_CACHE = [
  { palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'eai'], tipo: 'saudacao', _id: 'SAUDACAO' },
  { palavras: ['proximo evento', 'proximos eventos', 'eventos', 'calendario', 'quando', 'data', 'pels', 'assembleia', 'conferencia', 'transmissao', 'posse'], _id: 'LISTA-EVENTOS' },
  { palavras: ['prova quadrupla', 'teste etico', '4 perguntas'], _id: 'PROVA-QUADRUPLA' },
  { palavras: ['area de enfoque', 'areas de enfoque', '7 areas', 'enfoque'], _id: 'AREAS-ENFOQUE' },
  { palavras: ['my rotary', 'myrotary', 'criar conta', 'registrar', 'portal'], _id: 'MY-ROTARY' },
  { palavras: ['governador', 'ricardo', 'celso', 'lideranca'], _id: 'GOVERNADOR' },
  { palavras: ['anuidade', 'pagamento', 'valor', 'quanto custa', 'pagar', 'financeiro'], tipo: 'financeiro', _id: 'FINANCEIRO' },
  { palavras: ['como ser', 'tornar rotariano', 'entrar', 'participar', 'quero ser', 'quero entrar', 'quero participar', 'como faco para entrar', 'me associar', 'virar socio'], _id: 'COMO-ASSOCIAR' },
  { palavras: ['adirc', 'assembleia rotaract'], _id: 'ADIRC' },
  { palavras: ['dia reuniao', 'reuniao clube', 'contato clube', 'presidente clube', 'buscar clube'], _id: 'BUSCAR-CLUBE' },
  { palavras: ['arte', 'banner', 'camiseta', 'logo clube', 'verificar marca', 'imagem publica', 'marca'], _id: 'MARCA' },
  { palavras: ['contato governador', 'secretaria governadoria', 'governador assistente', 'governadores assistentes', 'ga distrito', 'meu ga', 'contato distrito', 'contato'], _id: 'CONTATO-DISTRITO' },
  { palavras: ['unyclub', 'uny club', 'aplicativo', 'app'], _id: 'UNYCLUB' },
  { palavras: ['metas', 'rotary club central', 'meta do clube'], _id: 'METAS' },
  { palavras: ['fundacao', 'contribuicao', 'erey', 'polioplus', 'subsidio', 'fundo anual'], _id: 'FUNDACAO' },
  { palavras: ['campo mourao', 'campo mourão'], _id: 'CLUBES-CAMPO-MOURAO' },
  { palavras: ['maringa', 'maringá'], _id: 'CLUBES-MARINGA' },
  { palavras: ['umuarama'], _id: 'CLUBES-UMUARAMA' },
  { palavras: ['cianorte'], _id: 'CLUBES-CIANORTE' },
  { palavras: ['loanda'], _id: 'CLUBES-LOANDA' },
  { palavras: ['goioere', 'goioerê'], _id: 'CLUBES-GOIOERE' },
  { palavras: ['paranacity'], _id: 'CLUBES-PARANACITY' },
  { palavras: ['araruna'], _id: 'CLUBES-ARARUNA' },
  { palavras: ['boa esperanca', 'boa esperança'], _id: 'CLUBES-BOA-ESPERANCA' },
  { palavras: ['onde vai ser', 'onde sera', 'local do evento', 'onde acontece', 'endereco evento', 'local pels', 'local adirc', 'local conferencia', 'local assembleia'], _id: 'LOCAL-EVENTO-GENERICO' },
  { palavras: ['que horas', 'horario', 'hora da reuniao', 'que dia', 'dia da reuniao'], _id: 'HORARIO-REUNIAO' },
  { palavras: ['inscricao', 'inscrever', 'como me inscrevo', 'como inscrever', 'inscricoes'], _id: 'INSCRICAO' },
  { palavras: ['pels', 'seminario lideres', 'treinamento presidente'], _id: 'PELS' },
  { palavras: ['conferencia', 'sol nascente', 'conferencia distrital'], _id: 'CONFERENCIA' },
  { palavras: ['transmissao', 'posse distrital', 'posse 2026'], _id: 'TRANSMISSAO' },
  { palavras: ['dolar', 'dolar rotario', 'cotacao', 'cambio'], _id: 'DOLAR' },
  { palavras: ['lema', 'tema', 'crie impacto', 'impacto duradouro'], _id: 'LEMA' },
  { palavras: ['empresa cidada', 'empresa cidadã', 'apoiar empresa', 'patrocinio', 'patrocinador', 'parceiro', 'apoiar rotary', 'apoiar o rotary'], _id: 'EMPRESA-CIDADA' },
  { palavras: ['dqa', 'quadro associativo', 'novos socios', 'retencao'], _id: 'DQA' },
  { palavras: ['subsidio distrital', 'subsidio global', 'financiar projeto'], _id: 'SUBSIDIO' },
  { palavras: ['frequencia', 'presenca', 'reposicao', 'visitar clube', 'visitar outro clube', 'intercambio', 'posso visitar', 'repor frequencia'], _id: 'FREQUENCIA' },
  { palavras: ['clubes do distrito', 'clubs do distrito', 'todos os clubes', 'lista de clubes', 'quantos clubes', 'clubes d4630', 'clubes 4630', 'quais os clubes', 'quais clubes', 'quais sao os clubes'], _id: 'CLUBES-LISTA-GERAL' },
  { palavras: ['clube perto', 'rotary perto', 'mais perto', 'qual clube', 'qual rotary', 'encontrar clube', 'clube mais proximo'], _id: 'CLUBE-GENERICO' },
  { palavras: ['interact', 'jovens 12', 'adolescente'], _id: 'INTERACT' },
  { palavras: ['rotaract', 'jovem adulto', 'idade rotaract'], _id: 'ROTARACT' },
  { palavras: ['atualizar dados', 'atualizar meus dados', 'cadastro', 'dados cadastrais', 'alterar email', 'meu perfil', 'meus dados'], _id: 'DADOS-CADASTRAIS' },
  { palavras: ['o que e o rotary', 'o que e rotary', 'o que faz o rotary', 'missao do rotary', 'visao do rotary', 'valores do rotary', 'sobre o rotary', 'o que significa rotary'], _id: 'O-QUE-E-ROTARY' },
  { palavras: ['o que e o distrito', 'distrito 4630', 'que cidades', 'quais cidades', 'abrangencia', 'norte do parana', 'noroeste do parana', 'onde fica o distrito'], _id: 'DISTRITO-4630' },
  { palavras: ['ano rotario', 'quando comeca o ano', 'quando termina o ano', 'inicio do ano rotario', 'julho rotary', 'comeca o ano'], _id: 'ANO-ROTARIO' },
  { palavras: ['pets', 'sets', 'diferenca pets sets pels', 'treinamento secretario', 'o que e pets', 'o que e sets', 'seminario presidente', 'seminario secretario'], _id: 'PETS-SETS' },
  { palavras: ['assembleia interact', 'assembleia distrital interact', 'evento interact'], _id: 'ASSEMBLEIA-INTERACT' },
  { palavras: ['instituto rotary', 'instituto rotary brasil', 'instituto agosto'], _id: 'INSTITUTO-ROTARY' },
  { palavras: ['esqueci senha', 'esqueci minha senha', 'recuperar senha', 'nao consigo acessar', 'senha my rotary', 'resetar senha', 'problema login', 'nao consigo entrar', 'esqueci a senha'], _id: 'SENHA' },
  { palavras: ['cursos', 'curso online', 'central de aprendizagem', 'aprender', 'treinamento online', 'capacitacao'], _id: 'CURSOS' },
  { palavras: ['contribuo', 'como contribuir', 'doar', 'doacao', 'quero doar', 'como doar'], _id: 'CONTRIBUIR' },
  { palavras: ['telefone', 'email', 'whatsapp', 'numero', 'fone', 'celular do distrito'], _id: 'TELEFONE' },
  { palavras: ['menu', 'ajuda', 'help', 'o que voce faz', 'quem e voce', 'o que voce sabe', 'como funciona', 'opcoes', 'o que voce pode'], tipo: 'saudacao', _id: 'MENU' },
  { palavras: ['obrigado', 'obrigada', 'valeu', 'vlw', 'brigado', 'muito obrigado', 'agradeco', 'thanks', 'tchau', 'ate mais', 'ate logo'], _id: 'AGRADECIMENTO' },
  { palavras: ['rotary kids', 'rotary kid', 'criancas rotary', 'programa infantil'], _id: 'ROTARY-KIDS' },
  { palavras: ['site oficial', 'site do distrito', 'rotary4630', 'site rotary', 'pagina do distrito', 'site do rotary'], _id: 'SITE-OFICIAL' },
  { palavras: ['nao entendi', 'pode repetir', 'repete', 'como assim', 'explica melhor', 'nao compreendi', 'nao entendo'], _id: 'NAO-ENTENDI' },
  { palavras: ['barbosa ferraz'], _id: 'CLUBES-BARBOSA-FERRAZ' },
  { palavras: ['borrazopolis'], _id: 'CLUBES-BORRAZOPOLIS' },
  { palavras: ['lunardelli'], _id: 'CLUBES-LUNARDELLI' },
  { palavras: ['santo antonio da platina', 'santo antonio'], _id: 'CLUBES-SANTO-ANTONIO' },
  { palavras: ['brasilandia do sul', 'brasilandia'], _id: 'CLUBES-BRASILANDIA' },
];

// atribui resposta = _id para os testes poderem checar facilmente
for (const f of FAQ_CACHE) { f.resposta = f._id; }

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
    .replace(/\bevetos\b/g, 'eventos')
    .replace(/\beveto\b/g, 'eventos')
    .replace(/\binscrissao\b/g, 'inscricao')
    .replace(/\binscrisao\b/g, 'inscricao')
    .replace(/\binscricoes\b/g, 'inscricao')
    .replace(/\bcadastrar\b/g, 'cadastro')
    .replace(/\bconferensia\b/g, 'conferencia')
    .replace(/\bfaso\b/g, 'faco')
    .replace(/\bfasso\b/g, 'faco')
    .replace(/\bprocsimo\b/g, 'proximo')
    .replace(/\bproxmo\b/g, 'proximo')
    .replace(/\bprximo\b/g, 'proximo')
    .replace(/\bmarinaga\b/g, 'maringa')
    .replace(/\bmaringua\b/g, 'maringa')
    .replace(/\bentra\b/g, 'entrar')
    .replace(/\bentr\b/g, 'entrar')
    .replace(/\bclub central\b/g, 'rotary club central');
}

// ============================================================
// REPLICA EXATA de buscarNoCache() de web-chat.js
// ============================================================

function buscarNoCache(mensagem) {
  const msg = corrigirTypos(mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  // Primeiro: saudacoes curtas (match exato ou prefixo reconhecido)
  const msgSemPontuacao = msg.replace(/[?!.,;]+$/, '').trim();
  const saudacoes = ['oi', 'ola', 'hey', 'eae', 'eai', 'opa', 'alguem ai', 'alguem', 'ola tudo bem', 'oi tudo bem'];
  const isSaudacaoCurta = saudacoes.includes(msg) || saudacoes.includes(msgSemPontuacao);
  const isSaudacaoPrefixo = msg.startsWith('oi ') || msg.startsWith('ola ') || msg.startsWith('opa ');
  const isFalaSimples = msg === 'fala' || /^fala [a-z]{0,15}$/.test(msg);
  const isSalve = msg === 'salve' || msg === 'bom dia' || msg === 'boa tarde' || msg === 'boa noite';
  if (isSaudacaoCurta || isSaudacaoPrefixo || isFalaSimples || isSalve) {
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
  const eventoEspecifico = /\b(transmissao|posse|conferencia|sols? nascente|pels|interact|instituto)\b/.test(msg);
  const perguntaData = /\b(dia \d|\/\d{2})\b/.test(msg);
  if (perguntaOnde && (eventoEspecifico || perguntaData)) return null;

  // Intencoes de alta prioridade
  const intencoes = [
    { teste: /esqueci.*(senha|login|acesso)/, palavraChave: 'esqueci senha' },
    { teste: /nao consigo.*(acessar|entrar|login)/, palavraChave: 'nao consigo acessar' },
    { teste: /recuperar.*(senha|acesso)/, palavraChave: 'recuperar senha' },
    { teste: /quando.*(vence|comeca|inicia|termina|acaba|encerra).*(ano|rotary)/, palavraChave: 'ano rotario' },
    { teste: /quando.*(ano|rotary).*(comeca|inicia|termina|vence|acaba)/, palavraChave: 'ano rotario' },
    { teste: /vence.*ano rotary/, palavraChave: 'ano rotario' },
    { teste: /assembleia.*(rotaract|adirc)/, palavraChave: 'adirc' },
    { teste: /(rotaract|adirc).*assembleia/, palavraChave: 'adirc' },
    { teste: /assembleia.*interact/, palavraChave: 'assembleia interact' },
    { teste: /interact.*assembleia/, palavraChave: 'assembleia interact' },
    { teste: /quando.*(adirc|assembleia rotaract)/, palavraChave: 'adirc' },
    { teste: /(adirc|assembleia rotaract).*quando/, palavraChave: 'adirc' },
    { teste: /quando.*conferencia/, palavraChave: 'conferencia distrital' },
    { teste: /conferencia.*quando/, palavraChave: 'conferencia distrital' },
    { teste: /\b(preciso|devo|tenho que|vou).*(conferencia)\b/, palavraChave: 'conferencia distrital' },
    { teste: /\b(conferencia).*(obrigatorio|preciso|devo|tenho que)\b/, palavraChave: 'conferencia distrital' },
    { teste: /quando.*pels/, palavraChave: 'seminario lideres' },
    { teste: /\bpels\b.*(obrigatorio|preciso|devo|tenho que|obrig)/, palavraChave: 'seminario lideres' },
    { teste: /\b(obrigatorio|preciso|devo|tenho que)\b.*\bpels\b/, palavraChave: 'seminario lideres' },
    { teste: /quando.*transmissao/, palavraChave: 'transmissao' },
    { teste: /quando.*posse/, palavraChave: 'posse distrital' },
    { teste: /\b(meta|metas)\b.*(clube|club central|rotary club central)/, palavraChave: 'rotary club central' },
    { teste: /\b(club central|rotary club central)\b/, palavraChave: 'rotary club central' },
    { teste: /\b(ir|visitar|comparecer)\b.*(outro clube|clube diferente|outro rotary|outro club)/, palavraChave: 'visitar clube' },
    { teste: /\b(posso ir)\b.*\bclube\b/, palavraChave: 'visitar clube' },
    { teste: /\b(reportar|lancar|registrar)\b.*\bpresenca\b/, palavraChave: 'frequencia' },
    { teste: /\bpresenca\b.*\b(my rotary|unyclub)\b/, palavraChave: 'frequencia' },
    { teste: /o que.*(o rotary|rotary).*(faz|fez|fara)/, palavraChave: 'o que faz o rotary' },
    { teste: /rotary.*(ajuda|serve|faz|significa)/, palavraChave: 'o que faz o rotary' },
    { teste: /como.*(rotary).*(ajuda)/, palavraChave: 'o que faz o rotary' },
    { teste: /\b(app|aplicativo)\b.*(nao funciona|problema|nao abre|nao carrega|nao consigo|erro)/, palavraChave: 'unyclub' },
    { teste: /\b(app|aplicativo)\b.*(rotary|unyclub)/, palavraChave: 'unyclub' },
    { teste: /\b(cor|cores)\b.*(rotary|oficial)/, palavraChave: 'marca' },
    { teste: /\b(logo|logotipo|logomarca)\b.*(rotary|pegar|baixar|usar)/, palavraChave: 'marca' },
    { teste: /\b(pegar|baixar|onde pego)\b.*(logo|logotipo)/, palavraChave: 'marca' },
    { teste: /\b(25|26|27|28|29|30|31|32|33|35|40)\b.*(anos?).*(qual|programa|rotary|entrar)/, palavraChave: 'rotaract' },
    { teste: /\b(adulto|jovem adulto)\b.*(rotary|programa|entrar)/, palavraChave: 'rotaract' },
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

function id(r) { return r ? r._id : 'null(→IA)'; }

// ============================================================
// TESTS — usuarios reais, linguagem real
// ============================================================

const tests = [

  // ── ROTARIANO VETERANO ─────────────────────────────────────
  { cat: 'VET', q: 'quanto ta o dolar rotario?',           expect: 'DOLAR',          ok: r => id(r) === 'DOLAR' },
  { cat: 'VET', q: 'quando vence o ano rotario?',          expect: 'ANO-ROTARIO',    ok: r => id(r) === 'ANO-ROTARIO' },
  { cat: 'VET', q: 'qual o lema do proximo ano?',          expect: 'LEMA',           ok: r => id(r) === 'LEMA' },
  { cat: 'VET', q: 'quem eh o governador eleito?',         expect: 'GOVERNADOR',     ok: r => id(r) === 'GOVERNADOR' },
  { cat: 'VET', q: 'como lancar frequencia?',              expect: 'FREQUENCIA',     ok: r => id(r) === 'FREQUENCIA' },
  { cat: 'VET', q: 'como reportar presenca no my rotary?', expect: 'FREQUENCIA',     ok: r => id(r) === 'FREQUENCIA' },
  { cat: 'VET', q: 'meu clube precisa de meta no club central?', expect: 'METAS',   ok: r => id(r) === 'METAS' },
  { cat: 'VET', q: 'quais as metas pra 2026-2027?',        expect: 'METAS',          ok: r => id(r) === 'METAS' },
  { cat: 'VET', q: 'como solicitar subsidio global?',      expect: 'SUBSIDIO',       ok: r => id(r) === 'SUBSIDIO' },
  { cat: 'VET', q: 'qual a meta do erey?',                 expect: 'FUNDACAO',       ok: r => id(r) === 'FUNDACAO' },
  { cat: 'VET', q: 'como contribuir pro polioplus?',       expect: 'CONTRIBUIR',     ok: r => ['CONTRIBUIR','FUNDACAO'].includes(id(r)) },
  { cat: 'VET', q: 'tem curso online no rotary?',          expect: 'CURSOS',         ok: r => id(r) === 'CURSOS' },

  // ── PRESIDENTE ELEITO ──────────────────────────────────────
  { cat: 'PRES', q: 'o pels eh obrigatorio?',              expect: 'PELS',           ok: r => id(r) === 'PELS' },
  { cat: 'PRES', q: 'quando eh o pels?',                   expect: 'PELS',           ok: r => id(r) === 'PELS' },
  { cat: 'PRES', q: 'preciso ir na conferencia?',          expect: 'CONFERENCIA',    ok: r => id(r) === 'CONFERENCIA' },
  { cat: 'PRES', q: 'como definir metas do meu clube?',    expect: 'METAS',          ok: r => id(r) === 'METAS' },
  { cat: 'PRES', q: 'onde vejo as metas do clube?',        expect: 'METAS',          ok: r => id(r) === 'METAS' },
  { cat: 'PRES', q: 'como acessar o rotary club central?', expect: 'METAS',          ok: r => id(r) === 'METAS' },

  // ── JOVEM QUERENDO ENTRAR ──────────────────────────────────
  { cat: 'JOVEM', q: 'como faco pra entrar no rotary?',    expect: 'COMO-ASSOCIAR',  ok: r => id(r) === 'COMO-ASSOCIAR' },
  { cat: 'JOVEM', q: 'tenho 17 anos posso entrar?',        expect: 'INTERACT ou COMO-ASSOCIAR', ok: r => ['COMO-ASSOCIAR','INTERACT','ROTARACT'].includes(id(r)) },
  { cat: 'JOVEM', q: 'tenho 25 anos qual programa?',       expect: 'ROTARACT ou COMO-ASSOCIAR', ok: r => ['ROTARACT','COMO-ASSOCIAR'].includes(id(r)) },
  { cat: 'JOVEM', q: 'rotaract tem limite de idade?',      expect: 'ROTARACT',        ok: r => id(r) === 'ROTARACT' },
  { cat: 'JOVEM', q: 'diferenca entre interact e rotaract?',expect: 'INTERACT ou ROTARACT', ok: r => ['INTERACT','ROTARACT'].includes(id(r)) },
  { cat: 'JOVEM', q: 'precisa pagar pra ser rotariano?',   expect: 'FINANCEIRO ou COMO-ASSOCIAR', ok: r => ['FINANCEIRO','COMO-ASSOCIAR'].includes(id(r)) },
  { cat: 'JOVEM', q: 'posso visitar uma reuniao?',         expect: 'FREQUENCIA ou COMO-ASSOCIAR', ok: r => ['FREQUENCIA','COMO-ASSOCIAR','BUSCAR-CLUBE'].includes(id(r)) },

  // ── COMUNIDADE ─────────────────────────────────────────────
  { cat: 'COMU', q: 'o que o rotary faz?',                 expect: 'O-QUE-E-ROTARY', ok: r => id(r) === 'O-QUE-E-ROTARY' },
  { cat: 'COMU', q: 'rotary eh religiao?',                  expect: 'IA',             ok: r => r === null },
  { cat: 'COMU', q: 'rotary eh politica?',                  expect: 'IA',             ok: r => r === null },
  { cat: 'COMU', q: 'como o rotary ajuda a comunidade?',   expect: 'O-QUE-E-ROTARY', ok: r => id(r) === 'O-QUE-E-ROTARY' },
  { cat: 'COMU', q: 'minha empresa pode apoiar o rotary?', expect: 'EMPRESA-CIDADA',  ok: r => id(r) === 'EMPRESA-CIDADA' },
  { cat: 'COMU', q: 'como ser empresa cidada?',            expect: 'EMPRESA-CIDADA',  ok: r => id(r) === 'EMPRESA-CIDADA' },
  { cat: 'COMU', q: 'o rotary aceita mulheres?',           expect: 'IA',             ok: r => r === null },

  // ── CLUBES E REUNIOES ─────────────────────────────────────
  { cat: 'CLUBE', q: 'que dia o rotary de maringa se reune?',        expect: 'CLUBES-MARINGA',    ok: r => id(r) === 'CLUBES-MARINGA' },
  { cat: 'CLUBE', q: 'qual horario da reuniao do rotary campo mourao?', expect: 'CLUBES-CAMPO-MOURAO', ok: r => id(r) === 'CLUBES-CAMPO-MOURAO' },
  { cat: 'CLUBE', q: 'tem rotary em londrina?',            expect: 'IA',             ok: r => r === null },
  { cat: 'CLUBE', q: 'tem rotary em curitiba?',            expect: 'IA',             ok: r => r === null },
  { cat: 'CLUBE', q: 'quantos clubes tem no distrito?',    expect: 'CLUBES-LISTA-GERAL', ok: r => id(r) === 'CLUBES-LISTA-GERAL' },
  { cat: 'CLUBE', q: 'qual o maior clube do distrito?',    expect: 'IA ou CLUBES-LISTA-GERAL', ok: r => r === null || id(r) === 'CLUBES-LISTA-GERAL' },
  { cat: 'CLUBE', q: 'posso ir em outro clube?',           expect: 'FREQUENCIA',     ok: r => id(r) === 'FREQUENCIA' },

  // ── PROBLEMAS TECNICOS ────────────────────────────────────
  { cat: 'TECH', q: 'esqueci minha senha do my rotary',    expect: 'SENHA',          ok: r => id(r) === 'SENHA' },
  { cat: 'TECH', q: 'nao consigo entrar no my rotary',     expect: 'SENHA',          ok: r => id(r) === 'SENHA' },
  { cat: 'TECH', q: 'como baixar o unyclub?',              expect: 'UNYCLUB',        ok: r => id(r) === 'UNYCLUB' },
  { cat: 'TECH', q: 'o app do rotary nao funciona',        expect: 'UNYCLUB',        ok: r => id(r) === 'UNYCLUB' },
  { cat: 'TECH', q: 'como atualizar meu email no cadastro?', expect: 'DADOS-CADASTRAIS', ok: r => id(r) === 'DADOS-CADASTRAIS' },

  // ── MARCA / ARTE ──────────────────────────────────────────
  { cat: 'MARCA', q: 'posso usar o logo do rotary na camiseta do meu clube?', expect: 'MARCA', ok: r => id(r) === 'MARCA' },
  { cat: 'MARCA', q: 'qual a cor oficial do rotary?',      expect: 'MARCA',          ok: r => id(r) === 'MARCA' },
  { cat: 'MARCA', q: 'onde pego o logo do rotary?',        expect: 'MARCA',          ok: r => id(r) === 'MARCA' },
  { cat: 'MARCA', q: 'meu clube fez um banner ta certo?',  expect: 'MARCA',          ok: r => id(r) === 'MARCA' },
  { cat: 'MARCA', q: 'como verificar se a arte ta correta?', expect: 'MARCA',        ok: r => id(r) === 'MARCA' },

  // ── COLOQUIAL / VAGO ─────────────────────────────────────
  { cat: 'COLOQ', q: 'opa',                                expect: 'SAUDACAO',       ok: r => r && r.tipo === 'saudacao' },
  { cat: 'COLOQ', q: 'e ai',                               expect: 'SAUDACAO ou IA', ok: r => r === null || (r && r.tipo === 'saudacao') },
  { cat: 'COLOQ', q: 'fala',                               expect: 'SAUDACAO',       ok: r => r && r.tipo === 'saudacao' },
  { cat: 'COLOQ', q: 'blz',                                expect: 'IA',             ok: r => r === null },
  { cat: 'COLOQ', q: 'oi to perdido aqui',                 expect: 'SAUDACAO',       ok: r => r && r.tipo === 'saudacao' },
  { cat: 'COLOQ', q: 'preciso de ajuda',                   expect: 'MENU ou SAUDACAO', ok: r => r && (r._id === 'MENU' || r.tipo === 'saudacao') },
  { cat: 'COLOQ', q: 'alguem ai?',                         expect: 'SAUDACAO ou MENU', ok: r => r && (r.tipo === 'saudacao' || r._id === 'MENU') },
  { cat: 'COLOQ', q: 'quero saber sobre o rotary',         expect: 'O-QUE-E-ROTARY', ok: r => ['O-QUE-E-ROTARY','SAUDACAO'].includes(id(r)) },
  { cat: 'COLOQ', q: 'me explica isso aqui',               expect: 'IA',             ok: r => r === null },
  { cat: 'COLOQ', q: 'nao sei por onde comecar',           expect: 'MENU ou SAUDACAO', ok: r => r === null || (r && (r._id === 'MENU' || r.tipo === 'saudacao')) },

  // ── TYPOS REAIS ───────────────────────────────────────────
  { cat: 'TYPO', q: 'quado eh o prximo eveto?',            expect: 'LISTA-EVENTOS',  ok: r => id(r) === 'LISTA-EVENTOS' },
  { cat: 'TYPO', q: 'como fasso pra entra no rotari?',     expect: 'COMO-ASSOCIAR',  ok: r => id(r) === 'COMO-ASSOCIAR' },
  { cat: 'TYPO', q: 'onde fica o rotary de marinaga?',     expect: 'CLUBES-MARINGA', ok: r => id(r) === 'CLUBES-MARINGA' },
  { cat: 'TYPO', q: 'quero me inscrevr no pels',           expect: 'PELS ou INSCRICAO', ok: r => ['PELS','INSCRICAO','LISTA-EVENTOS'].includes(id(r)) },

  // ── FORA DO ESCOPO ────────────────────────────────────────
  { cat: 'FORA', q: 'qual o resultado do jogo de ontem?',  expect: 'IA',             ok: r => r === null },
  { cat: 'FORA', q: 'me fala uma receita de bolo',         expect: 'IA',             ok: r => r === null },
  { cat: 'FORA', q: 'quanto ta o bitcoin?',                expect: 'IA',             ok: r => r === null },

  // ── PROVA QUADRUPLA E VALORES ─────────────────────────────
  { cat: 'VALS', q: 'o que eh a prova quadrupla?',         expect: 'PROVA-QUADRUPLA', ok: r => id(r) === 'PROVA-QUADRUPLA' },
  { cat: 'VALS', q: 'quais os valores do rotary?',         expect: 'O-QUE-E-ROTARY', ok: r => id(r) === 'O-QUE-E-ROTARY' },
  { cat: 'VALS', q: 'qual a missao do rotary?',            expect: 'O-QUE-E-ROTARY', ok: r => id(r) === 'O-QUE-E-ROTARY' },
  { cat: 'VALS', q: 'quais as areas de enfoque?',          expect: 'AREAS-ENFOQUE',  ok: r => id(r) === 'AREAS-ENFOQUE' },

  // ── FUNDACAO ROTARIA ──────────────────────────────────────
  { cat: 'FUND', q: 'o que eh a fundacao rotaria?',        expect: 'FUNDACAO',       ok: r => id(r) === 'FUNDACAO' },
  { cat: 'FUND', q: 'como doar pro rotary?',               expect: 'CONTRIBUIR',     ok: r => ['CONTRIBUIR','FUNDACAO'].includes(id(r)) },
  { cat: 'FUND', q: 'quanto eh a contribuicao anual?',     expect: 'FINANCEIRO ou FUNDACAO', ok: r => ['FINANCEIRO','FUNDACAO','CONTRIBUIR'].includes(id(r)) },
  { cat: 'FUND', q: 'o que eh fundo anual?',               expect: 'FUNDACAO',       ok: r => id(r) === 'FUNDACAO' },
  { cat: 'FUND', q: 'como funciona subsidio distrital?',   expect: 'SUBSIDIO',       ok: r => id(r) === 'SUBSIDIO' },

  // ── CONTATO ───────────────────────────────────────────────
  { cat: 'CONT', q: 'como falo com o governador?',         expect: 'CONTATO-DISTRITO', ok: r => ['CONTATO-DISTRITO','GOVERNADOR'].includes(id(r)) },
  { cat: 'CONT', q: 'qual o telefone do distrito?',        expect: 'TELEFONE',       ok: r => id(r) === 'TELEFONE' },
  { cat: 'CONT', q: 'quem eh meu GA?',                     expect: 'CONTATO-DISTRITO', ok: r => id(r) === 'CONTATO-DISTRITO' },
  { cat: 'CONT', q: 'email da secretaria do distrito',     expect: 'TELEFONE ou CONTATO', ok: r => ['TELEFONE','CONTATO-DISTRITO'].includes(id(r)) },
  { cat: 'CONT', q: 'como entro em contato com o distrito?', expect: 'CONTATO-DISTRITO', ok: r => id(r) === 'CONTATO-DISTRITO' },

  // ── PERGUNTAS ADICIONAIS REAIS ────────────────────────────
  { cat: 'EXTRA', q: 'o que e pets e sets?',               expect: 'PETS-SETS',      ok: r => id(r) === 'PETS-SETS' },
  { cat: 'EXTRA', q: 'quando comeca o ano rotario?',       expect: 'ANO-ROTARIO',    ok: r => id(r) === 'ANO-ROTARIO' },
  { cat: 'EXTRA', q: 'londrina tem rotary?',               expect: 'IA',             ok: r => r === null },
  { cat: 'EXTRA', q: 'tem rotary em paranacity?',          expect: 'CLUBES-PARANACITY', ok: r => id(r) === 'CLUBES-PARANACITY' },
  { cat: 'EXTRA', q: 'obrigado pela ajuda',                expect: 'AGRADECIMENTO',  ok: r => id(r) === 'AGRADECIMENTO' },
  { cat: 'EXTRA', q: 'valeu!',                             expect: 'AGRADECIMENTO',  ok: r => id(r) === 'AGRADECIMENTO' },
  { cat: 'EXTRA', q: 'tchau',                              expect: 'AGRADECIMENTO',  ok: r => id(r) === 'AGRADECIMENTO' },
  { cat: 'EXTRA', q: 'site do distrito',                   expect: 'SITE-OFICIAL',   ok: r => id(r) === 'SITE-OFICIAL' },
  { cat: 'EXTRA', q: 'meu perfil no my rotary',            expect: 'DADOS-CADASTRAIS', ok: r => id(r) === 'DADOS-CADASTRAIS' },
  { cat: 'EXTRA', q: 'treinamento online',                 expect: 'CURSOS',         ok: r => id(r) === 'CURSOS' },
  { cat: 'EXTRA', q: 'como funciona a central de aprendizagem?', expect: 'CURSOS',  ok: r => id(r) === 'CURSOS' },
];

// ============================================================
// RUNNER
// ============================================================

const stats = { ok: 0, fail: 0 };
const failures = [];
const byCategory = {};

console.log('\nReal-User Cache Test Suite — D4630 Chatbot');
console.log('No server / no HTTP / no rate limit');
console.log('='.repeat(70));

for (const t of tests) {
  if (!byCategory[t.cat]) byCategory[t.cat] = { ok: 0, fail: 0 };
  const result = buscarNoCache(t.q);
  const got = id(result);
  const passed = t.ok(result);

  if (passed) {
    stats.ok++;
    byCategory[t.cat].ok++;
    console.log(`[OK]   [${t.cat}] "${t.q}"\n       → ${got}\n`);
  } else {
    stats.fail++;
    byCategory[t.cat].fail++;
    failures.push({ ...t, result, got });
    console.log(`[FAIL] [${t.cat}] "${t.q}"\n       ESPERADO: ${t.expect}\n       RECEBEU:  ${got}\n`);
  }
}

console.log('='.repeat(70));
console.log(`TOTAL: ${tests.length} | OK: ${stats.ok} | FAIL: ${stats.fail}`);
console.log(`PASS RATE: ${((stats.ok / tests.length) * 100).toFixed(1)}%\n`);

console.log('--- Por Categoria ---');
for (const [cat, c] of Object.entries(byCategory)) {
  const emoji = c.fail === 0 ? 'OK  ' : 'FAIL';
  console.log(`[${emoji}] ${cat.padEnd(6)}: ${c.ok} ok, ${c.fail} fail`);
}

if (failures.length === 0) {
  console.log('\nTodos os testes passaram!');
  process.exit(0);
}

console.log('\n' + '='.repeat(70));
console.log('FALHAS DETALHADAS + ROOT CAUSE\n');

// analise de root cause por cada falha
const grouped = {};
for (const f of failures) {
  if (!grouped[f.cat]) grouped[f.cat] = [];
  grouped[f.cat].push(f);
}

function diagnose(q) {
  const raw = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const msg = corrigirTypos(raw);
  const palavrasDeEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/;
  const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const querEvento = palavrasDeEvento.test(msg);
  const perguntaOnde = /\b(onde|local|endereco|localizacao)\b/.test(msg);
  const eventoEspecifico = /\b(transmissao|posse|conferencia|sols? nascente|pels|interact|instituto)\b/.test(msg);
  const guardFires = perguntaOnde && eventoEspecifico;

  // score de cada FAQ
  let scores = FAQ_CACHE.map(faq => {
    let score = 0;
    for (const p of faq.palavras) {
      const pNorm = p.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(pNorm)) score += pNorm.length;
    }
    return { id: faq._id, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  return {
    normalizado: msg,
    cidade: mencionaCidade,
    querEvento,
    guardFires,
    topScores: scores
  };
}

for (const [cat, items] of Object.entries(grouped)) {
  console.log(`[CATEGORIA: ${cat}]`);
  for (const f of items) {
    const d = diagnose(f.q);
    console.log(`  PERGUNTA: "${f.q}"`);
    console.log(`  ESPERADO: ${f.expect} | RECEBEU: ${f.got}`);
    console.log(`  NORMALIZADO: "${d.normalizado}"`);
    console.log(`  cidade=${d.cidade}, querEvento=${d.querEvento}, guardFires=${d.guardFires}`);
    if (d.topScores.length) {
      console.log(`  TOP SCORES: ${d.topScores.map(s => `${s.id}(${s.score})`).join(', ')}`);
    }
    console.log('');
  }
}

process.exit(failures.length > 0 ? 1 : 0);

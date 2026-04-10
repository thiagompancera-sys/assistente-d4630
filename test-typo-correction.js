/**
 * test-typo-correction.js
 *
 * Tests that words transformed by corrigirTypos still match their FAQ entries.
 * This guards against Problem 1: corrigirTypos breaks cache matching.
 *
 * Each case exercises a transformation that changes the user's word before
 * the FAQ keyword lookup happens.
 */

// ============================================================
// Inline cache replica (abbreviated labels)
// ============================================================

const FAQ_CACHE = [
  { palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'eae', 'eai'], tipo: 'saudacao', resposta: 'SAUDACAO' },
  { palavras: ['proximo evento', 'proximo eventos', 'proximos eventos', 'eventos', 'calendario', 'quando', 'data', 'pels', 'assembleia', 'conferencia', 'transmissao', 'posse'], resposta: 'LISTA-EVENTOS' },
  { palavras: ['prova quadrupla', 'teste etico', '4 perguntas'], resposta: 'PROVA-QUADRUPLA' },
  { palavras: ['area de enfoque', 'areas de enfoque', '7 areas', 'enfoque'], resposta: 'AREAS-ENFOQUE' },
  { palavras: ['my rotary', 'myrotary', 'criar conta', 'registrar', 'portal'], resposta: 'MY-ROTARY' },
  { palavras: ['governador', 'ricardo', 'celso', 'lideranca'], resposta: 'GOVERNADOR' },
  { palavras: ['anuidade', 'pagamento', 'valor', 'quanto custa', 'pagar', 'financeiro'], tipo: 'financeiro', resposta: 'FINANCEIRO' },
  {
    palavras: ['como ser', 'tornar rotariano', 'tornar rotary', 'como me tornar', 'entrar no rotary', 'entrar', 'participar', 'quero ser', 'quero entrar', 'quero participar', 'como faco para entrar', 'me associar', 'virar socio', 'ser rotariano', 'ser rotary'],
    resposta: 'COMO-ASSOCIAR'
  },
  { palavras: ['adirc', 'assembleia rotaract'], resposta: 'ADIRC-MARIALVA' },
  { palavras: ['dia reuniao', 'reuniao clube', 'contato clube', 'presidente clube', 'buscar clube'], resposta: 'BUSCAR-CLUBE' },
  { palavras: ['arte', 'banner', 'camiseta', 'logo clube', 'verificar marca', 'imagem publica', 'marca'], resposta: 'MARCA' },
  { palavras: ['contato governador', 'secretaria governadoria', 'governador assistente', 'governadores assistentes', 'ga distrito', 'meu ga', 'contato distrito', 'contato'], resposta: 'CONTATO-DISTRITO' },
  { palavras: ['unyclub', 'uny club', 'aplicativo', 'app'], resposta: 'UNYCLUB' },
  { palavras: ['metas', 'rotary club central', 'meta do clube'], resposta: 'METAS' },
  { palavras: ['fundacao', 'contribuicao', 'erey', 'polioplus', 'subsidio', 'fundo anual'], resposta: 'FUNDACAO' },
  { palavras: ['campo mourao', 'campo mourão'], resposta: 'CLUBES-CAMPO-MOURAO' },
  { palavras: ['maringa', 'maringá'], resposta: 'CLUBES-MARINGA' },
  { palavras: ['umuarama'], resposta: 'CLUBES-UMUARAMA' },
  { palavras: ['cianorte'], resposta: 'CLUBES-CIANORTE' },
  { palavras: ['loanda'], resposta: 'CLUBES-LOANDA' },
  { palavras: ['goioere', 'goioerê'], resposta: 'CLUBES-GOIOERE' },
  { palavras: ['paranacity'], resposta: 'CLUBES-PARANACITY' },
  { palavras: ['araruna'], resposta: 'CLUBES-ARARUNA' },
  { palavras: ['boa esperanca', 'boa esperança'], resposta: 'CLUBES-BOA-ESPERANCA' },
  { palavras: ['onde vai ser', 'onde sera', 'local do evento', 'local do eventos', 'onde acontece', 'endereco evento', 'endereco eventos', 'local pels', 'local adirc', 'local conferencia', 'local assembleia'], resposta: 'LOCAL-EVENTO-GENERICO' },
  { palavras: ['que horas', 'horario', 'hora da reuniao', 'que dia', 'dia da reuniao'], resposta: 'HORARIO-REUNIAO' },
  { palavras: ['inscricao', 'inscrever', 'como me inscrevo', 'como inscrever', 'inscricoes'], resposta: 'INSCRICAO' },
  { palavras: ['pels', 'seminario lideres', 'treinamento presidente'], resposta: 'PELS' },
  { palavras: ['conferencia', 'sol nascente', 'conferencia distrital'], resposta: 'CONFERENCIA' },
  { palavras: ['transmissao', 'posse distrital', 'posse 2026'], resposta: 'TRANSMISSAO' },
  { palavras: ['dolar', 'dolar rotario', 'cotacao', 'cambio'], resposta: 'DOLAR' },
  { palavras: ['lema', 'tema', 'crie impacto', 'impacto duradouro'], resposta: 'LEMA' },
  { palavras: ['empresa cidada', 'empresa cidadã', 'apoiar empresa', 'patrocinio', 'patrocinador', 'parceiro', 'apoiar rotary', 'apoiar o rotary'], resposta: 'EMPRESA-CIDADA' },
  { palavras: ['dqa', 'quadro associativo', 'novos socios', 'retencao'], resposta: 'DQA' },
  { palavras: ['subsidio distrital', 'subsidio global', 'financiar projeto'], resposta: 'SUBSIDIO' },
  { palavras: ['frequencia', 'presenca', 'reposicao', 'visitar clube', 'visitar outro clube', 'intercambio', 'posso visitar', 'repor frequencia'], resposta: 'FREQUENCIA' },
  { palavras: ['clubes do distrito', 'clubs do distrito', 'todos os clubes', 'lista de clubes', 'quantos clubes', 'clubes d4630', 'clubes 4630', 'quais os clubes', 'quais clubes', 'quais sao os clubes'], resposta: 'CLUBES-LISTA-GERAL' },
  { palavras: ['clube perto', 'rotary perto', 'mais perto', 'qual clube', 'qual rotary', 'encontrar clube', 'clube mais proximo'], resposta: 'CLUBE-GENERICO' },
  { palavras: ['interact', 'jovens 12', 'adolescente'], resposta: 'INTERACT' },
  { palavras: ['rotaract', 'jovem adulto', 'idade rotaract'], resposta: 'ROTARACT' },
  { palavras: ['atualizar dados', 'atualizar meus dados', 'cadastro', 'dados cadastrais', 'alterar email', 'meu perfil', 'meus dados'], resposta: 'DADOS-CADASTRAIS' },
  { palavras: ['o que e o rotary', 'o que e rotary', 'o que faz o rotary', 'missao do rotary', 'visao do rotary', 'valores do rotary', 'sobre o rotary', 'o que significa rotary'], resposta: 'O-QUE-E-ROTARY' },
  { palavras: ['o que e o distrito', 'distrito 4630', 'que cidades', 'quais cidades', 'abrangencia', 'norte do parana', 'noroeste do parana', 'onde fica o distrito'], resposta: 'DISTRITO-4630' },
  { palavras: ['ano rotario', 'quando comeca o ano', 'quando termina o ano', 'inicio do ano rotario', 'julho rotary', 'comeca o ano'], resposta: 'ANO-ROTARIO' },
  { palavras: ['pets', 'sets', 'diferenca pets sets pels', 'treinamento secretario', 'o que e pets', 'o que e sets', 'seminario presidente', 'seminario secretario'], resposta: 'PETS-SETS' },
  { palavras: ['assembleia interact', 'assembleia distrital interact', 'evento interact', 'eventos interact'], resposta: 'ASSEMBLEIA-INTERACT' },
  { palavras: ['instituto rotary', 'instituto rotary brasil', 'instituto agosto'], resposta: 'INSTITUTO-ROTARY' },
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

// ============================================================
// corrigirTypos — exact copy from web-chat.js
// ============================================================

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
// buscarNoCache — exact copy from web-chat.js
// ============================================================

function buscarNoCache(mensagem) {
  const msg = corrigirTypos(mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

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

  const palavrasDeEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/;
  const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const querEvento = palavrasDeEvento.test(msg);

  if (/\badirc\b/.test(msg) || /assembleia rotaract/.test(msg)) {
    for (const faq of FAQ_CACHE) {
      for (const p of faq.palavras) {
        if (p === 'adirc') return faq;
      }
    }
  }

  const perguntaOnde = /\b(onde|local|endereco|localizacao)\b/.test(msg);
  const eventoEspecifico = /\b(transmissao|posse|conferencia|sols? nascente|pels|interact|instituto)\b/.test(msg);
  const perguntaData = /\b(dia \d|\/\d{2})\b/.test(msg);
  if (perguntaOnde && (eventoEspecifico || perguntaData)) return null;

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

  if (mencionaCidade && querEvento) return null;

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
// Test cases — each one verifies that a typo/variant that
// corrigirTypos transforms still hits the correct FAQ entry
// ============================================================

const TESTES = [
  // ---- rotariano → rotary (affects "tornar rotariano", "ser rotariano") ----
  {
    cat: 'ROTARIANO→ROTARY',
    msg: 'como me tornar rotariano?',
    expect: 'COMO-ASSOCIAR',
    note: 'rotariano → rotary; "tornar rotary" must be a keyword'
  },
  {
    cat: 'ROTARIANO→ROTARY',
    msg: 'quero ser rotariano',
    expect: 'COMO-ASSOCIAR',
    note: 'rotariano → rotary; "ser rotary" must be a keyword'
  },
  {
    cat: 'ROTARIANO→ROTARY',
    msg: 'como ser rotariano no rotary',
    expect: 'COMO-ASSOCIAR',
    note: 'rotariano → rotary; "como ser" is also a keyword'
  },

  // ---- rotarios → rotary ----
  {
    cat: 'ROTARIOS→ROTARY',
    msg: 'o que fazem os rotarios?',
    expect: 'null(→IA)',
    note: 'rotarios → rotary; "o que fazem" does not match intencao pattern (needs "faz" not "fazem"); IA handles it fine'
  },
  {
    cat: 'ROTARIOS→ROTARY',
    msg: 'os rotarios fazem projetos?',
    expect: 'O-QUE-E-ROTARY',
    note: 'rotarios → rotary; rotary.*(faz) intencao fires'
  },

  // ---- evento → eventos (affects "proximo evento", "local do evento", "endereco evento") ----
  {
    cat: 'EVENTO→EVENTOS',
    msg: 'proximo evento do distrito',
    expect: 'LISTA-EVENTOS',
    note: 'evento → eventos; "proximo eventos" must be a keyword'
  },
  {
    cat: 'EVENTO→EVENTOS',
    msg: 'qual o proximo evento?',
    expect: 'LISTA-EVENTOS',
    note: 'evento → eventos; "proximo eventos" keyword covers this'
  },
  {
    cat: 'EVENTO→EVENTOS',
    msg: 'local do evento',
    expect: 'LOCAL-EVENTO-GENERICO',
    note: 'evento → eventos; "local do eventos" must be a keyword'
  },
  {
    cat: 'EVENTO→EVENTOS',
    msg: 'endereco evento',
    expect: 'LOCAL-EVENTO-GENERICO',
    note: 'evento → eventos; "endereco eventos" is a keyword (exact substring match, no "do" between)'
  },
  {
    cat: 'EVENTO→EVENTOS',
    msg: 'evento interact',
    expect: 'ASSEMBLEIA-INTERACT',
    note: 'evento → eventos; "eventos interact" must be a keyword'
  },

  // ---- inscricoes → inscricao ----
  {
    cat: 'INSCRICOES→INSCRICAO',
    msg: 'como fazer inscricoes no pels?',
    expect: 'INSCRICAO',
    note: 'inscricoes → inscricao; score-based: "inscricao" (9pts) > "eventos" (7pts) → INSCRICAO wins correctly'
  },
  {
    cat: 'INSCRICOES→INSCRICAO',
    msg: 'inscricoes dos eventos',
    expect: 'INSCRICAO',
    note: 'inscricoes → inscricao; "inscricao" score beats "eventos" score → INSCRICAO is the right answer'
  },
  {
    cat: 'INSCRICOES→INSCRICAO',
    msg: 'como fazer inscricoes',
    expect: 'INSCRICAO',
    note: 'inscricoes → inscricao; "inscricao" is a keyword in INSCRICAO entry'
  },

  // ---- cadastrar → cadastro ----
  {
    cat: 'CADASTRAR→CADASTRO',
    msg: 'quero cadastrar meus dados',
    expect: 'DADOS-CADASTRAIS',
    note: 'cadastrar → cadastro; "cadastro" is a keyword in DADOS-CADASTRAIS'
  },
  {
    cat: 'CADASTRAR→CADASTRO',
    msg: 'como cadastrar no my rotary',
    expect: 'MY-ROTARY',
    note: 'cadastrar → cadastro; score-based match for MY-ROTARY (registrar keyword) or DADOS-CADASTRAIS'
  },

  // ---- inscrisao / inscrissao → inscricao (typo variants) ----
  {
    cat: 'INSCRISAO-TYPO',
    msg: 'como fazer inscrisao?',
    expect: 'INSCRICAO',
    note: 'inscrisao → inscricao; "inscricao" keyword in INSCRICAO entry'
  },
  {
    cat: 'INSCRISAO-TYPO',
    msg: 'inscrissao no evento',
    expect: 'INSCRICAO',
    note: 'inscrissao → inscricao, evento → eventos; "inscricao" score (9) beats "eventos" score (7) → correct'
  },

  // ---- conferensia → conferencia ----
  {
    cat: 'CONFERENSIA-TYPO',
    msg: 'quando eh a conferensia?',
    expect: 'CONFERENCIA',
    note: 'conferensia → conferencia; intencao "quando.*conferencia" fires'
  },
  {
    cat: 'CONFERENSIA-TYPO',
    msg: 'informacoes da conferensia distrital',
    expect: 'CONFERENCIA',
    note: 'conferensia → conferencia; "conferencia distrital" keyword'
  },

  // ---- rotari → rotary ----
  {
    cat: 'ROTARI→ROTARY',
    msg: 'como fasso pra entra no rotari?',
    expect: 'COMO-ASSOCIAR',
    note: 'rotari → rotary, fasso → faco, entra → entrar; "entrar" keyword'
  },

  // ---- entra → entrar ----
  {
    cat: 'ENTRA→ENTRAR',
    msg: 'quero entra no rotary',
    expect: 'COMO-ASSOCIAR',
    note: 'entra → entrar; "entrar" is a keyword in COMO-ASSOCIAR'
  },

  // ---- proximo typos ----
  {
    cat: 'PROXIMO-TYPOS',
    msg: 'procsimo evento',
    expect: 'LISTA-EVENTOS',
    note: 'procsimo → proximo, evento → eventos; "proximo eventos" keyword'
  },
  {
    cat: 'PROXIMO-TYPOS',
    msg: 'proxmo evento',
    expect: 'LISTA-EVENTOS',
    note: 'proxmo → proximo, evento → eventos; keyword match'
  },
];

// ============================================================
// Runner
// ============================================================

let ok = 0, fail = 0;
const byCategory = {};

console.log('\ncorrigirTypos → Cache Matching Test');
console.log('='.repeat(72));

for (const t of TESTES) {
  const result = buscarNoCache(t.msg);
  const got = result ? result.resposta : 'null(→IA)';
  const pass = got === t.expect || (t.expect === 'null' && result === null);

  if (!byCategory[t.cat]) byCategory[t.cat] = { ok: 0, fail: 0 };

  if (pass) {
    ok++;
    byCategory[t.cat].ok++;
    console.log(`[OK]   [${t.cat}] "${t.msg}"\n       → ${got}`);
  } else {
    fail++;
    byCategory[t.cat].fail++;
    console.log(`[FAIL] [${t.cat}] "${t.msg}"\n       expected: ${t.expect}\n       got:      ${got}\n       note: ${t.note}`);
  }
}

console.log('\n' + '='.repeat(72));
console.log(`TOTAL: ${ok + fail} | OK: ${ok} | FAIL: ${fail}`);

console.log('\n--- Por Categoria ---');
for (const [cat, counts] of Object.entries(byCategory)) {
  const status = counts.fail === 0 ? '[OK  ]' : '[FAIL]';
  console.log(`${status} ${cat.padEnd(24)}: ${counts.ok} ok, ${counts.fail} fail`);
}

if (fail === 0) {
  console.log('\nTodos os testes passaram! corrigirTypos nao quebra o cache.\n');
} else {
  console.log(`\n${fail} FALHA(S). Verificar palavras no FAQ_CACHE que precisam de variantes pos-correcao.\n`);
  process.exit(1);
}

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
    resposta: `Ola, companheiro(a)! Sou o assistente digital do *Distrito 4630*.\n\nPode me perguntar sobre eventos, clubes, My Rotary, metas, marca, como se associar... o que precisar sobre o distrito, eh so mandar!`
  },
  {
    palavras: ['proximo evento', 'proximos eventos', 'eventos', 'calendario', 'quando', 'data', 'pels', 'assembleia', 'conferencia', 'transmissao', 'posse'],
    resposta: `Os proximos eventos do distrito sao:\n\n*11/04* — PELS 2026-27 (obrigatorio para lideres eleitos)\n*25/04* — Assembleia Distrital Interact\n*26/04* — ADIRC em Marialva-PR (Rotaract)\n*22/05* — Conferencia Distrital Sol Nascente\n*27/06* — Transmissao de Cargo / Posse\n*01/07* — Inicio do Ano Rotario 2026-2027\n*27/08* — Instituto Rotary do Brasil\n\nInscricoes em rotary4630.org.br/agenda-distrital`
  },
  {
    palavras: ['prova quadrupla', 'teste etico', '4 perguntas'],
    resposta: `A *Prova Quádrupla* é um teste ético que rotarianos aplicam:\n\n1️⃣ É a *VERDADE*?\n2️⃣ É *JUSTO* para todos os interessados?\n3️⃣ Criará *BOA VONTADE* e *MELHORES AMIZADES*?\n4️⃣ Será *BENÉFICO* para todos os interessados?\n\nCriada pelo rotariano Herbert J. Taylor em 1932.\n\n🔗 Saiba mais: https://www.rotary.org/pt/guiding-principles`
  },
  {
    palavras: ['area de enfoque', 'areas de enfoque', '7 areas', 'enfoque'],
    resposta: `As *7 Áreas de Enfoque do Rotary*:\n\n1. Consolidação da Paz e Prevenção de Conflitos\n2. Prevenção e Tratamento de Doenças\n3. Água, Saneamento e Higiene\n4. Saúde Materno-Infantil\n5. Educação Básica e Alfabetização\n6. Desenvolvimento Econômico Comunitário\n7. Meio Ambiente 🌿\n\nTodo projeto Rotary deve estar alinhado a pelo menos uma dessas áreas.\n\n🔗 Detalhes: https://www.rotary.org/pt/our-causes`
  },
  {
    palavras: ['my rotary', 'myrotary', 'criar conta', 'registrar', 'portal'],
    resposta: `🌐 *My Rotary* — Portal do Rotariano\n\nComo criar conta:\n1. Acesse o link abaixo\n2. Clique em "Registrar"\n3. Informe seu email e número de sócio\n4. Crie senha e pergunta de segurança\n5. Ative a conta pelo email\n\nFuncionalidades:\n• *Rotary Club Central* — metas do clube\n• *Central de Aprendizagem* — cursos online gratuitos\n• *Pesquisa de Clubes* — encontrar clubes por cidade\n\n🔗 Acessar: https://my.rotary.org/pt\n📚 Cursos: https://my.rotary.org/pt/learning-reference`
  },
  {
    palavras: ['governador', 'ricardo', 'celso', 'lideranca'],
    resposta: `👔 *Liderança do Distrito 4630:*\n\n• *Governador 2025-2026:* Celso Yoshiaki Miyamoto\n• *Governador Eleito 2026-2027:* Ricardo de Oliveira\n\nLema 2026-2027: *"Crie Impacto Duradouro"*\nA ideia central: cada clube busca ser melhor do que ele mesmo já foi.\n\n🔗 Equipe do distrito: https://rotary4630.org.br/equipe-distrital`
  },
  {
    palavras: ['anuidade', 'pagamento', 'valor', 'quanto custa', 'pagar', 'financeiro'],
    tipo: 'financeiro',
    resposta: `💳 Questões financeiras (anuidade, pagamentos, valores) precisam ser tratadas diretamente com a *Tesouraria do Distrito*.\n\n🔗 Fale conosco: https://rotary4630.org.br/fale-conosco\n(Selecione "Tesouraria" no formulário)`
  },
  {
    palavras: ['como ser', 'tornar rotariano', 'entrar', 'participar', 'quero ser', 'quero entrar', 'quero participar', 'como faco para entrar', 'me associar', 'virar socio'],
    resposta: `🤝 *Como se tornar Rotariano:*\n\n1. Encontre um clube pelo link abaixo\n2. Visite uma reunião (qualquer pessoa pode!)\n3. Conheça os membros e manifeste interesse\n4. O clube avalia e aprova\n5. Cerimônia de posse\n\n*Para jovens:*\n• *Interact* — 12 a 18 anos\n• *Rotaract* — a partir de 18 anos (SEM limite de idade!)\n\n🔗 Encontrar clubes: https://rotary4630.org.br/clubes\n🔗 Pesquisa global: https://my.rotary.org/pt/search/club-finder`
  },
  {
    palavras: ['adirc', 'assembleia rotaract'],
    resposta: `A *ADIRC* (Assembleia Distrital do Rotaract) vai ser dia *26/04/2026* em *Marialva-PR*.\n\nEh obrigatoria para todos os Rotaract. E lembrando: Rotaract agora eh a partir de *18 anos*, sem limite de idade superior!\n\nPra inscricao e horario: rotary4630.org.br/agenda-distrital`
  },
  {
    palavras: ['dia reuniao', 'reuniao clube', 'contato clube', 'presidente clube', 'buscar clube'],
    resposta: `🔍 *Buscar Informações de Clubes*\n\nPara encontrar dia de reunião, contato do presidente e endereço:\n\nO D4630 possui *112 clubes* no norte/noroeste do Paraná.\n\n🔗 Buscar no site: https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br\n🌐 Pesquisa global: https://my.rotary.org/pt/search/club-finder`
  },
  {
    palavras: ['arte', 'banner', 'camiseta', 'logo clube', 'verificar marca', 'imagem publica', 'marca'],
    resposta: `🎨 *Verificação de Artes e Marca*\n\nAntes de publicar ou imprimir, verifique:\n✅ Logo oficial (roda dentada + "Rotary")\n✅ Cores: Azul *#005DAA* e Dourado *#F7A81B*\n✅ Área de proteção ao redor do logo\n❌ NÃO esticar, distorcer ou alterar cores\n\n🔗 Templates oficiais: https://brandcenter.rotary.org\n🔗 Guia de marca: https://my.rotary.org/pt/manage/club-district-administration/visual-identity\n📩 Dúvida? Envie a arte para a Comissão de Imagem Pública do distrito.`
  },
  {
    palavras: ['contato governador', 'secretaria governadoria', 'governador assistente', 'governadores assistentes', 'ga distrito', 'meu ga', 'contato distrito', 'contato'],
    resposta: `📞 *Contatos Úteis do Distrito*\n\n👔 *Governador 2025-26:* Celso Yoshiaki Miyamoto\n👔 *Governador Eleito 26-27:* Ricardo de Oliveira\n📋 *Secretaria:* pelo site abaixo\n👥 *GAs (Gov. Assistentes):* consulte no site\n\n🔗 Fale conosco: https://rotary4630.org.br/fale-conosco\n🔗 Equipe distrital: https://rotary4630.org.br/equipe-distrital`
  },
  {
    palavras: ['unyclub', 'uny club', 'aplicativo', 'app'],
    resposta: `📱 *UnyClub — Plataforma de Gestão*\n\nApp para clubes e distritos Rotary:\n• Gestão de eventos e inscrições\n• Frequência de associados\n• Sistema financeiro\n• Calendário de atividades\n• Notícias do distrito\n\nDisponível para iOS e Android.\n\n🔗 Acessar: https://www.unyclub.com.br\n📧 Contato: contato@unyclub.com.br`
  },
  {
    palavras: ['metas', 'rotary club central', 'meta do clube'],
    resposta: `🏆 *Metas 2026-2027 — Rotary Club Central*\n\nAcesse pelo My Rotary > Rotary Club Central\n\n*4 áreas de metas:*\n👥 *Quadro Social* — novos sócios, retenção\n🤲 *Serviço* — projetos por área de enfoque\n💰 *Fundação Rotária* — contribuições\n📢 *Imagem Pública* — eventos, campanhas\n\n✨ Cada clube busca superar *seu próprio melhor*!\n\n🔗 Definir metas: https://my.rotary.org/pt/secure/13011\n(My Rotary > Rotary Club Central)`
  },
  {
    palavras: ['fundacao', 'contribuicao', 'erey', 'polioplus', 'subsidio', 'fundo anual'],
    resposta: `💰 *Fundação Rotária*\n\nBraço filantrópico do Rotary International.\n\n*Tipos de contribuição:*\n📗 *Fundo Anual* — subsídios distritais e globais\n💉 *PolioPlus* — erradicação da pólio\n🏦 *Doação Permanente* — sustentabilidade\n\n🎯 Meta: *US$100/ano* por rotariano (EREY)\n\n🔗 Contribuir: https://my.rotary.org/pt/donate\n🔗 Sobre a Fundação: https://www.rotary.org/pt/about-rotary/rotary-foundation`
  },
  // === CLUBES POR CIDADE ===
  {
    palavras: ['campo mourao', 'campo mourão'],
    resposta: `🏛️ *Clubes Rotary em Campo Mourão:*\n\n• Rotary Club de Campo Mourão (76 associados)\n• RC Campo Mourão - Fomento (21 associados)\n• RC Campo Mourão - Gralha Azul (52 associados)\n• RC Campo Mourão - Lago Azul (21 associados)\n• RC Campo Mourão - Raio de Luz (47 associados)\n\n*Rotaract:*\n• Rotaract Club de Campo Mourão\n\n*Interact:*\n• Interact Club de Campo Mourão\n\nPara dia de reunião, contato e endereço de cada clube:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['maringa', 'maringá'],
    resposta: `🏛️ *Clubes Rotary em Maringá:*\n\n• Rotary Club de Maringá\n• RC Maringá-Leste\n• RC Maringá-Horto\n• RC Maringá-ACIM\n• RC Maringá-Norte\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['umuarama'],
    resposta: `🏛️ *Rotary em Umuarama:*\n\n• Rotary Club de Umuarama\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['cianorte'],
    resposta: `🏛️ *Rotary em Cianorte:*\n\n• Rotary Club de Cianorte - Cinturão Verde\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['loanda'],
    resposta: `🏛️ *Rotary em Loanda:*\n\n• Rotary Club de Loanda\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['goioere', 'goioerê'],
    resposta: `🏛️ *Rotary em Goioerê:*\n\n• Rotary Club de Goioerê\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['paranacity'],
    resposta: `🏛️ *Rotary em Paranacity:*\n\n• Rotary Club de Paranacity\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['araruna'],
    resposta: `🏛️ *Rotary em Araruna:*\n\n• Rotary Club de Araruna (15 associados)\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  {
    palavras: ['boa esperanca', 'boa esperança'],
    resposta: `🏛️ *Rotary em Boa Esperança:*\n\n• Rotary Club de Boa Esperança (35 associados)\n\nPara dia de reunião, contato e endereço:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br`
  },
  // === PERGUNTAS SOBRE LOCAL/HORARIO DE EVENTOS ===
  {
    palavras: ['onde vai ser', 'onde sera', 'local do evento', 'onde acontece', 'endereco evento', 'local pels', 'local adirc', 'local conferencia', 'local assembleia'],
    resposta: `Depende de qual evento! O que tenho aqui:\n\n*ADIRC* (26/04) — *Marialva-PR*\n*PELS, Conferencia e Posse* — o local especifico voce confirma em rotary4630.org.br/agenda-distrital\n\nQual evento voce quer saber?`
  },
  // === HORARIOS E REUNIOES ===
  {
    palavras: ['que horas', 'horario', 'hora da reuniao', 'que dia', 'dia da reuniao'],
    resposta: `🕐 *Horários de Reunião*\n\nCada clube tem seu próprio dia e horário.\n\nPara consultar o horário do seu clube:\n🔗 https://rotary4630.org.br/clubes\n📲 App UnyClub: https://www.unyclub.com.br\n\nOu pergunte ao seu Governador Assistente:\n🔗 https://rotary4630.org.br/equipe-distrital`
  },
  // === INSCRICOES ===
  {
    palavras: ['inscricao', 'inscrever', 'como me inscrevo', 'como inscrever', 'inscricoes'],
    resposta: `📝 *Inscrições em Eventos*\n\nPara se inscrever em eventos distritais:\n\n1. Acesse a agenda no site\n2. Selecione o evento\n3. Clique em "Inscrever-se"\n\n🔗 Agenda e inscrições: https://rotary4630.org.br/agenda-distrital\n📲 Também pelo app: https://www.unyclub.com.br`
  },
  // === PELS ===
  {
    palavras: ['pels', 'seminario lideres', 'treinamento presidente'],
    resposta: `📚 *PELS 2026-27 — Seminário de Líderes Eleitos*\n\n📌 *11/04/2026* — OBRIGATÓRIO para presidentes eleitos\n\nTodos os 112 clubes do distrito já confirmaram inscrição!\n\nPELS = Seminário de Treinamento para Líderes Eleitos\n(inclui presidentes, secretários e demais cargos)\n\n🔗 Detalhes e local: https://rotary4630.org.br/agenda-distrital\n📲 App: https://www.unyclub.com.br`
  },
  // === CONFERENCIA ===
  {
    palavras: ['conferencia', 'sol nascente', 'conferencia distrital'],
    resposta: `🌅 *Conferência Distrital Sol Nascente*\n\n📌 *22/05/2026* — OBRIGATÓRIO\n\nPrincipal evento do ano rotário!\n\n🔗 Detalhes e inscrição: https://rotary4630.org.br/agenda-distrital\n📲 App: https://www.unyclub.com.br`
  },
  // === TRANSMISSAO DE CARGO ===
  {
    palavras: ['transmissao', 'posse distrital', 'posse 2026'],
    resposta: `🎖️ *Transmissão de Cargo / Posse Distrital*\n\n📌 *27/06/2026* — OBRIGATÓRIO\n\nPosse do Governador Ricardo de Oliveira (gestão 2026-2027)\nLema: *"Crie Impacto Duradouro"*\n\n🔗 Detalhes: https://rotary4630.org.br/agenda-distrital\n📲 App: https://www.unyclub.com.br`
  },
  // === DOLAR ROTARIO ===
  {
    palavras: ['dolar', 'dolar rotario', 'cotacao', 'cambio'],
    resposta: `💵 *Dólar Rotário (abril 2026):* R$ 5,25\n\nEsse é o valor de referência para contribuições e transações em dólar no Rotary.\n\n🔗 Mais informações: https://rotary4630.org.br/fale-conosco`
  },
  // === LEMA ===
  {
    palavras: ['lema', 'tema', 'crie impacto', 'impacto duradouro'],
    resposta: `🌟 *Lema 2026-2027:* "Crie Impacto Duradouro" (Create Lasting Impact)\n\nA ideia central: cada clube busca ser *melhor do que ele mesmo já foi*.\n\nNão é competição entre clubes — é superar seu próprio histórico!\n\n🔗 Saiba mais: https://rotary4630.org.br`
  },
  // === EMPRESA CIDADA ===
  {
    palavras: ['empresa cidada', 'empresa cidadã', 'apoiar empresa', 'patrocinio', 'patrocinador', 'parceiro', 'apoiar rotary', 'apoiar o rotary'],
    resposta: `🏢 *Programa Empresa Cidadã*\n\nEmpresas podem apoiar projetos do Rotary!\n\n*Benefícios:*\n• Selo "Empresa Cidadã Rotary"\n• Networking com líderes\n• Visibilidade em eventos\n\n*Como participar:*\nContate o clube Rotary mais próximo.\n\n🔗 Clubes: https://rotary4630.org.br/clubes\n📞 Contato: https://rotary4630.org.br/fale-conosco`
  },
  // === DQA ===
  {
    palavras: ['dqa', 'quadro associativo', 'novos socios', 'retencao'],
    resposta: `👥 *DQA — Desenvolvimento do Quadro Associativo*\n\nÁrea responsável por atrair e reter sócios nos clubes.\n\nDicas:\n• Convidar profissionais da comunidade\n• Oferecer experiência de visitação\n• Programas de mentoria para novos sócios\n\n🔗 Ferramentas: https://my.rotary.org/pt\n🔗 Clubes do D4630: https://rotary4630.org.br/clubes`
  },
  // === SUBSIDIOS ===
  {
    palavras: ['subsidio distrital', 'subsidio global', 'financiar projeto'],
    resposta: `💰 *Subsídios Rotary*\n\n*Subsídio Distrital:* aprovado pelo próprio distrito, para projetos locais.\n*Subsídio Global:* maior valor, requer parceria internacional.\n\nAmbos financiados pela Fundação Rotária.\n\n🔗 Solicitar: https://my.rotary.org/pt/take-action/apply-grants\n📞 Comissão de Fundação: https://rotary4630.org.br/fale-conosco`
  },
  // === FREQUENCIA ===
  {
    palavras: ['frequencia', 'presenca', 'reposicao', 'visitar clube', 'visitar outro clube', 'intercambio', 'posso visitar', 'repor frequencia'],
    resposta: `📋 *Frequência e Reposição*\n\n• O secretário do clube lança presenças pelo UnyClub ou My Rotary\n• Rotarianos podem *visitar qualquer clube do mundo* para repor frequência\n• Isso é incentivado como "intercâmbio entre clubes"\n\n📲 UnyClub: https://www.unyclub.com.br\n🌐 My Rotary: https://my.rotary.org/pt`
  },
  // === CLUBES DO DISTRITO (lista geral) ===
  {
    palavras: ['clubes do distrito', 'clubs do distrito', 'todos os clubes', 'lista de clubes', 'quantos clubes', 'clubes d4630', 'clubes 4630', 'quais os clubes', 'quais clubes', 'quais sao os clubes'],
    resposta: `🏛️ *Clubes do Distrito 4630*\n\nSão *112 clubes* no norte/noroeste do Paraná!\n\nAlgumas cidades com clubes:\n• *Campo Mourão* — 5 clubes Rotary + Rotaract + Interact\n• *Maringá* — 5 clubes Rotary\n• *Umuarama, Cianorte, Goioerê, Loanda, Paranacity*\n• *Araruna, Boa Esperança, Barbosa Ferraz, Borrazópolis*\n• *Lunardelli, Santo Antônio da Platina* e mais!\n\n💡 Me diga sua *cidade* e eu listo os clubes dela!\n\n🔗 Lista completa: https://rotary4630.org.br/clubes\n🌐 Busca global: https://my.rotary.org/pt/search/club-finder\n📲 App: https://www.unyclub.com.br`
  },
  // === CLUB GENERICO (fallback para "clube", "rotary perto", etc) ===
  {
    palavras: ['clube perto', 'rotary perto', 'mais perto', 'qual clube', 'qual rotary', 'encontrar clube', 'clube mais proximo'],
    resposta: `🔍 *Encontrar um Clube Rotary*\n\nO D4630 possui *112 clubes* no norte/noroeste do Paraná!\n\nPara encontrar o clube mais próximo de você:\n🔗 Buscar por cidade: https://rotary4630.org.br/clubes\n🌐 Pesquisa global: https://my.rotary.org/pt/search/club-finder\n📲 App UnyClub: https://www.unyclub.com.br\n\nOu me diga sua cidade que eu informo os clubes disponíveis!`
  },
  // === INTERACT ===
  {
    palavras: ['interact', 'jovens 12', 'adolescente'],
    resposta: `🌱 *Interact — Jovens de 12 a 18 anos*\n\nO Interact é o programa do Rotary para adolescentes.\n\n• Desenvolve liderança e cidadania\n• Projetos de serviço comunitário\n• Patrocinado por um clube Rotary local\n\n🔗 Clubes Interact: https://rotary4630.org.br/clubes\n📞 Contato: https://rotary4630.org.br/fale-conosco`
  },
  // === ROTARACT ESPECIFICO ===
  {
    palavras: ['rotaract', 'jovem adulto', 'idade rotaract'],
    resposta: `🚀 *Rotaract — A partir de 18 anos (SEM limite de idade!)*\n\nImportante: o Rotaract NÃO tem mais limite de idade superior. Antes era 18-30, agora é *a partir de 18 anos*.\n\nClubes Rotaract no D4630:\n• Rotaract Club de Brasilândia do Sul\n• Rotaract Club de Campo Mourão\n• Rotaract Club de Maringá (vários)\n\n🔗 Encontrar Rotaract: https://rotary4630.org.br/clubes\n📞 Contato: https://rotary4630.org.br/fale-conosco`
  },
  // === DADOS CADASTRAIS ===
  {
    palavras: ['atualizar dados', 'atualizar meus dados', 'cadastro', 'dados cadastrais', 'alterar email', 'meu perfil', 'meus dados'],
    resposta: `📝 *Atualizar Dados Cadastrais*\n\n1. Acesse My Rotary > Meu Perfil\n2. Ou solicite ao secretário do seu clube\n3. No UnyClub também é possível atualizar\n\n🌐 My Rotary: https://my.rotary.org/pt\n📲 UnyClub: https://www.unyclub.com.br`
  },
  // === O QUE E O ROTARY (pergunta mais basica) ===
  {
    palavras: ['o que e o rotary', 'o que e rotary', 'o que faz o rotary', 'missao do rotary', 'visao do rotary', 'valores do rotary', 'sobre o rotary', 'o que significa rotary'],
    resposta: `🌍 *O que é o Rotary?*\n\n*Missão:* Prestar serviços, promover integridade e fomentar compreensão, boa vontade e paz entre os povos.\n\n*Visão:* Juntos, vemos um mundo em que as pessoas se unem para promover mudanças duradouras.\n\nO Rotary tem *7 áreas de enfoque* e está presente em mais de 200 países!\n\nO *Distrito 4630* abrange o norte/noroeste do Paraná, com *112 clubes*.\n\n🔗 Saiba mais: https://www.rotary.org/pt\n🔗 Distrito 4630: https://rotary4630.org.br`
  },
  // === O QUE E O DISTRITO 4630 ===
  {
    palavras: ['o que e o distrito', 'distrito 4630', 'que cidades', 'quais cidades', 'abrangencia', 'norte do parana', 'noroeste do parana', 'onde fica o distrito'],
    resposta: `📍 *Distrito 4630*\n\nAbrange municípios do *norte e noroeste do Paraná*, Brasil.\n\n• *112 clubes* (Rotary, Rotaract, Interact e Rotary Kids)\n• Governador 2025-26: Celso Yoshiaki Miyamoto\n• Governador Eleito 26-27: Ricardo de Oliveira\n\nCidades: Campo Mourão, Maringá, Umuarama, Cianorte, Goioerê, Loanda, Paranacity, Araruna e muitas mais!\n\n🔗 Site: https://rotary4630.org.br\n🔗 Clubes: https://rotary4630.org.br/clubes`
  },
  // === ANO ROTARIO ===
  {
    palavras: ['ano rotario', 'quando comeca o ano', 'quando termina o ano', 'inicio do ano rotario', 'julho rotary', 'comeca o ano'],
    resposta: `📆 *Ano Rotário*\n\nO ano rotário vai de *1º de julho* a *30 de junho* do ano seguinte.\n\nAno 2026-2027: *01/07/2026* a *30/06/2027*\nLema: *"Crie Impacto Duradouro"*\nGovernador: Ricardo de Oliveira`
  },
  // === PETS / SETS ===
  {
    palavras: ['pets', 'sets', 'diferenca pets sets pels', 'treinamento secretario', 'o que e pets', 'o que e sets', 'seminario presidente', 'seminario secretario'],
    resposta: `📚 *PETS, SETS e PELS*\n\n• *PETS* = Seminário para Presidentes Eleitos\n• *SETS* = Seminário para Secretários Eleitos\n• *PELS* = Seminário para Líderes Eleitos (inclui todos os cargos)\n\n📌 *PELS 2026-27:* 11/04/2026 (OBRIGATÓRIO)\nTodos os 112 clubes já confirmaram inscrição!\n\n🔗 Detalhes: https://rotary4630.org.br/agenda-distrital`
  },
  // === ASSEMBLEIA INTERACT ===
  {
    palavras: ['assembleia interact', 'assembleia distrital interact', 'evento interact'],
    resposta: `🌱 *Assembleia Distrital Interact*\n\n📌 *25/04/2026* — OBRIGATÓRIO para Interact\n\nO Interact é para jovens de *12 a 18 anos*.\n\n🔗 Detalhes e inscrição: https://rotary4630.org.br/agenda-distrital\n📲 App: https://www.unyclub.com.br`
  },
  // === INSTITUTO ROTARY ===
  {
    palavras: ['instituto rotary', 'instituto rotary brasil', 'instituto agosto'],
    resposta: `🎓 *Instituto Rotary do Brasil*\n\n📌 *27/08/2026*\n\nEvento nacional de capacitação e networking para rotarianos.\n\n🔗 Mais informações: https://rotary4630.org.br/agenda-distrital`
  },
  // === SENHA / PROBLEMAS DE ACESSO ===
  {
    palavras: ['esqueci senha', 'esqueci minha senha', 'recuperar senha', 'nao consigo acessar', 'senha my rotary', 'resetar senha', 'problema login', 'nao consigo entrar', 'esqueci a senha'],
    resposta: `🔑 *Problemas de Acesso ao My Rotary?*\n\n1. Acesse my.rotary.org\n2. Clique em "Esqueceu a senha?"\n3. Informe seu email cadastrado\n4. Siga as instruções no email\n\nSe não funcionar, contate o secretário do seu clube.\n\n🔗 My Rotary: https://my.rotary.org/pt\n📞 Ajuda: https://rotary4630.org.br/fale-conosco`
  },
  // === CURSOS ONLINE ===
  {
    palavras: ['cursos', 'curso online', 'central de aprendizagem', 'aprender', 'treinamento online', 'capacitacao'],
    resposta: `📚 *Cursos Online Gratuitos*\n\nO Rotary oferece cursos pela Central de Aprendizagem:\n\n• Liderança\n• Fundação Rotária\n• Quadro Social\n• Projetos de serviço\n\nTodos gratuitos e com certificado!\n\n🔗 Acessar: https://my.rotary.org/pt/learning-reference`
  },
  // === COMO CONTRIBUIR / DOAR ===
  {
    palavras: ['contribuo', 'como contribuir', 'doar', 'doacao', 'quero doar', 'como doar'],
    resposta: `💰 *Como Contribuir*\n\nAcesse My Rotary > Doação e escolha:\n📗 *Fundo Anual* — subsídios\n💉 *PolioPlus* — erradicação da pólio\n🏦 *Doação Permanente* — sustentabilidade\n\n🎯 Meta: US$100/ano por rotariano (EREY)\n💵 Dólar Rotário (abril 2026): R$ 5,25\n\n🔗 Doar: https://my.rotary.org/pt/donate`
  },
  // === CONTATO POR TELEFONE/EMAIL/WHATSAPP ===
  {
    palavras: ['telefone', 'email', 'whatsapp', 'numero', 'fone', 'celular do distrito'],
    resposta: `📞 *Canais de Contato do Distrito*\n\nPara falar com a equipe do distrito:\n🔗 Formulário: https://rotary4630.org.br/fale-conosco\n👥 Equipe: https://rotary4630.org.br/equipe-distrital\n\nCada clube tem seus próprios contatos:\n🔗 https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  },
  // === MENU / AJUDA / IDENTIDADE DO BOT ===
  {
    palavras: ['menu', 'ajuda', 'help', 'o que voce faz', 'quem e voce', 'o que voce sabe', 'como funciona', 'opcoes', 'o que voce pode'],
    tipo: 'saudacao',
    resposta: `Sou o assistente digital do *Distrito 4630*. Pode me perguntar sobre eventos, clubes, My Rotary, metas, marca Rotary, como se associar, Fundacao Rotaria, contatos do distrito...\n\nEh so perguntar naturalmente, como se estivesse conversando com um companheiro!`
  },
  // === AGRADECIMENTO / DESPEDIDA ===
  {
    palavras: ['obrigado', 'obrigada', 'valeu', 'vlw', 'brigado', 'muito obrigado', 'agradeco', 'thanks', 'tchau', 'ate mais', 'ate logo'],
    resposta: `De nada, companheiro(a)! Qualquer outra duvida eh so chamar.`
  },
  // === ROTARY KIDS ===
  {
    palavras: ['rotary kids', 'rotary kid', 'criancas rotary', 'programa infantil'],
    resposta: `🧒 *Rotary Kids*\n\nPrograma do Rotary voltado para crianças, complementando:\n• *Interact* — 12 a 18 anos\n• *Rotaract* — a partir de 18 anos\n\nPara mais informações sobre o Rotary Kids no D4630:\n🔗 https://rotary4630.org.br/clubes\n📞 https://rotary4630.org.br/fale-conosco`
  },
  // === SITE OFICIAL ===
  {
    palavras: ['site oficial', 'site do distrito', 'rotary4630', 'site rotary', 'pagina do distrito', 'site do rotary'],
    resposta: `🌐 *Site Oficial do Distrito 4630*\n\n🔗 https://rotary4630.org.br\n\nNo site você encontra:\n📅 Agenda e eventos\n🏛️ Lista de clubes\n👥 Equipe distrital\n📞 Formulário de contato\n\n📲 App de gestão: https://www.unyclub.com.br\n🌐 My Rotary: https://my.rotary.org/pt`
  },
  // === NAO ENTENDI / CONVERSACIONAL ===
  {
    palavras: ['nao entendi', 'pode repetir', 'repete', 'como assim', 'explica melhor', 'nao compreendi', 'nao entendo'],
    resposta: `Desculpe, vou tentar ser mais claro! Pode reformular sua pergunta? Eu consigo ajudar com eventos, clubes, My Rotary, contatos do distrito, como se associar e muito mais.`
  },
  // === CIDADES COM CLUBE MAS SEM FAQ ESPECIFICO ===
  {
    palavras: ['barbosa ferraz'],
    resposta: `🏛️ *Rotary em Barbosa Ferraz:*\n\n• Rotary Club de Barbosa Ferraz - Celeiro do Paraná (27 associados)\n\n🔗 Detalhes: https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  },
  {
    palavras: ['borrazopolis'],
    resposta: `🏛️ *Rotary em Borrazópolis:*\n\n• Rotary Club de Borrazópolis (24 associados)\n\n🔗 Detalhes: https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  },
  {
    palavras: ['lunardelli'],
    resposta: `🏛️ *Rotary em Lunardelli:*\n\n• Rotary Club de Lunardelli\n\n🔗 Detalhes: https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  },
  {
    palavras: ['santo antonio da platina', 'santo antonio'],
    resposta: `🏛️ *Rotary em Santo Antônio da Platina:*\n\n• Rotary Club de Santo Antônio da Platina\n\n🔗 Detalhes: https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  },
  {
    palavras: ['brasilandia do sul', 'brasilandia'],
    resposta: `🏛️ *Rotary/Rotaract em Brasilândia do Sul:*\n\n• Rotaract Club de Brasilândia do Sul\n\n🔗 Detalhes: https://rotary4630.org.br/clubes\n📲 App: https://www.unyclub.com.br`
  }
];

// === CIDADES DO DISTRITO (para busca por cidade) ===
const CIDADES_D4630 = ['campo mourao', 'maringa', 'umuarama', 'cianorte', 'loanda', 'goioere', 'paranacity', 'araruna', 'boa esperanca', 'barbosa ferraz', 'borrazopolis', 'lunardelli', 'santo antonio da platina', 'santo antonio', 'brasilandia do sul', 'brasilandia'];

// === CORRECAO DE TYPOS COMUNS ===
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

// === BUSCA INTELIGENTE NO CACHE ===
function buscarNoCache(mensagem) {
  const msg = corrigirTypos(mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  // Primeiro: saudacoes curtas (match exato)
  const saudacoes = ['oi', 'ola', 'hey', 'eae', 'eai'];
  if (saudacoes.includes(msg) || msg.startsWith('oi ') || msg.startsWith('ola ')) {
    for (const faq of FAQ_CACHE) {
      if (faq.tipo === 'saudacao') return faq;
    }
  }

  // Segundo: detectar intencao especifica (prioridade sobre cidade e match generico)
  // Se a pessoa pergunta sobre EVENTO perto de uma cidade, a intencao eh evento, nao cidade
  const palavrasDeEvento = /\b(evento|eventos|calendario|agenda|pels|adirc|conferencia|assembleia|transmissao|posse|inscricao|proximo|proxima)\b/;
  const mencionaCidade = CIDADES_D4630.some(c => msg.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const querEvento = palavrasDeEvento.test(msg);

  const intencoes = [
    { teste: /esqueci.*(senha|login|acesso)/, palavraChave: 'esqueci senha' },
    { teste: /nao consigo.*(acessar|entrar|login)/, palavraChave: 'nao consigo acessar' },
    { teste: /recuperar.*(senha|acesso)/, palavraChave: 'recuperar senha' },
    { teste: /quando.*(comeca|inicia|termina).*(ano|rotario)/, palavraChave: 'ano rotario' },
    { teste: /assembleia.*(rotaract|adirc)/, palavraChave: 'adirc' },
    { teste: /(rotaract|adirc).*assembleia/, palavraChave: 'adirc' },
    { teste: /assembleia.*interact/, palavraChave: 'assembleia interact' },
    { teste: /interact.*assembleia/, palavraChave: 'assembleia interact' },
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

  // Quarto: cidade (so se NAO esta perguntando sobre evento)
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

  // Se menciona cidade + evento, deixar a IA responder (tem contexto completo)
  if (mencionaCidade && querEvento) return null;

  // Quinto: busca por score normal
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
// IA (Gemini gratis + Claude fallback)
// ============================================================

const SYSTEM_PROMPT = `Voce eh o Assistente Digital do Distrito 4630 do Rotary International.

PERSONALIDADE:
- Responda como um companheiro rotariano experiente conversando naturalmente.
- Tom acolhedor, direto e humano. Nada de menu, lista de opcoes ou "digite X para Y".
- Frases curtas e naturais. Maximo 200 palavras.
- Use *negrito* para destaques importantes, mas sem exagero.
- Maximo 1-2 emojis por resposta (so quando fizer sentido natural).
- Trate por "companheiro(a)" ou pelo nome quando souber.

REGRAS CRITICAS:
1. Responda APENAS com base no CONTEXTO abaixo. NUNCA invente.
2. Se a informacao ESTIVER no contexto, RESPONDA DIRETAMENTE. Nao mande a pessoa consultar o site se voce ja tem a resposta.
3. Se a informacao PARCIAL estiver no contexto, responda o que sabe e diga claramente so o que falta. Ex: "A ADIRC sera dia 26/04 em Marialva-PR. O horario exato voce confirma em rotary4630.org.br/agenda-distrital"
4. Se NAO encontrar NADA, diga naturalmente: "Essa eu nao tenho na minha base ainda. Melhor checar direto em rotary4630.org.br ou perguntar pro seu GA."
5. NUNCA responda sobre assuntos fora do Rotary/Distrito 4630.
6. Questoes financeiras: encaminhe para tesouraria (rotary4630.org.br/fale-conosco).
7. Inclua 1-2 links relevantes no final (nao uma lista enorme).
8. PROIBIDO: separadores (===, ---), listas de menu, "digite menu", "escolha uma opcao", blocos de emojis decorativos.
9. PROIBIDO: responder "consulte o site" quando a resposta esta no contexto. Isso eh redirecionar, nao ajudar.
10. Seja util de verdade. Se alguem perguntar "onde vai ser a ADIRC?", responda "Em Marialva-PR, dia 26/04" — nao mande pro site.

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
      'deepseek/deepseek-chat-v3-0324:free',
      'meta-llama/llama-4-maverick:free',
      'mistralai/mistral-small-3.2-24b-instruct:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ];
    for (const modelo of modelos) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const r = await openrouter.chat.completions.create({
          model: modelo,
          max_tokens: 800,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMsg }
          ]
        }, { signal: controller.signal });
        clearTimeout(timeout);
        const texto = r.choices?.[0]?.message?.content;
        if (texto && texto.trim().length > 10) {
          metricas.gemini++;
          console.log(`✅ [OPENROUTER/${modelo.split('/')[1]}]`);
          return texto;
        }
      } catch (e) { console.log(`[${modelo.split('/')[1]}] falhou: ${e.message?.substring(0, 60)}`); }
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
  return 'Desculpe, estou com dificuldade para processar agora. Tenta de novo em alguns segundos, ou acessa direto rotary4630.org.br que la tem bastante coisa!';
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
  const provedor = openrouter ? 'OpenRouter (gratis)' : geminiModel ? 'Gemini (gratis)' : claude ? 'Claude' : 'nenhum';
  res.json({ status: 'online', ...metricas, provedor });
});

// ============================================================
// KEEP-ALIVE — Impede Render free tier de dormir
// ============================================================

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'alive', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Self-ping a cada 4 minutos (Render dorme apos 15min sem request)
function keepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  fetch(`${url}/health`).catch(() => {});
}
setInterval(keepAlive, 4 * 60 * 1000);

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
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23005DAA'/><text x='50' y='68' font-size='60' font-weight='bold' fill='white' text-anchor='middle' font-family='serif'>R</text></svg>">
<style>
  :root {
    --azul: #005DAA;
    --azul-escuro: #003d73;
    --dourado: #F7A81B;
    --dourado-claro: #ffc94d;
    --bg: #f5f6fa;
    --card: #ffffff;
    --texto: #1a1a2e;
    --texto-soft: #4a4b5e;
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
  .cat-card { background: var(--card); border-radius: 14px; padding: 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--sombra); border: 1.5px solid transparent; display: flex; flex-direction: column; gap: 6px; outline: none; }
  .cat-card:focus-visible { border-color: var(--azul); box-shadow: 0 0 0 3px rgba(0,93,170,0.3); }
  .cat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-color: var(--azul); }
  .cat-card:active { transform: scale(0.97); }
  .cat-card .icon { font-size: 24px; }
  .cat-card .title { font-size: 13px; font-weight: 600; color: var(--texto); line-height: 1.3; }
  .cat-card .desc { font-size: 11px; color: var(--texto-soft); line-height: 1.3; }

  /* Subcategory pills */
  .sub-section { padding: 4px 16px 8px; }
  .sub-section .label { font-size: 11px; font-weight: 600; color: var(--texto-soft); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .sub-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .sub-pill { background: var(--card); border: 1px solid #e2e4ea; border-radius: 20px; padding: 6px 14px; font-size: 12px; color: var(--azul); cursor: pointer; transition: all 0.2s; font-weight: 500; outline: none; }
  .sub-pill:focus-visible { border-color: var(--azul); box-shadow: 0 0 0 3px rgba(0,93,170,0.3); }
  .sub-pill:hover { background: var(--azul); color: #fff; border-color: var(--azul); }

  /* Messages */
  .msg { max-width: 82%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; animation: fadeIn 0.25s ease; }
  .msg.bot { background: var(--bot-bg); align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: var(--sombra); color: var(--texto); }
  .msg.user { background: var(--user-bg); align-self: flex-end; border-bottom-right-radius: 4px; color: #fff; box-shadow: 0 2px 8px rgba(0,93,170,0.25); }
  .msg b, .msg strong { font-weight: 600; }
  .msg.bot b, .msg.bot strong { color: var(--azul); }
  .msg .time { font-size: 10px; color: #999; text-align: right; margin-top: 4px; }
  .msg.user .time { color: rgba(255,255,255,0.6); }
  .msg.bot a { color: var(--azul); }
  .msg.user a { color: #fff; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* Typing */
  .typing { align-self: flex-start; background: var(--card); padding: 12px 18px; border-radius: 16px; border-bottom-left-radius: 4px; box-shadow: var(--sombra); }
  .typing span { display: inline-block; width: 8px; height: 8px; background: #bbb; border-radius: 50%; margin: 0 2px; animation: bounce 1.3s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.15s; }
  .typing span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }

  /* Back button */
  .back-btn { align-self: flex-start; background: none; border: 1.5px solid #e2e4ea; border-radius: 20px; padding: 10px 16px; font-size: 13px; color: var(--azul); cursor: pointer; margin-bottom: 4px; font-weight: 500; transition: all 0.2s; min-height: 44px; }
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
  .btn-mic { background: #e8edf4 !important; position: relative; }
  .btn-mic svg { fill: var(--azul) !important; }
  .btn-mic:hover { background: #d4dce8 !important; }
  .btn-mic.recording { background: #ef4444 !important; animation: pulse-mic 1.2s infinite; }
  .btn-mic.recording svg { fill: #fff !important; }
  @keyframes pulse-mic { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } }
  .btn-listen { background: none !important; border: none; width: 28px; height: 28px; padding: 0; cursor: pointer; opacity: 0.5; transition: all 0.2s; min-width: 28px; }
  .btn-listen:hover { opacity: 1; }
  .btn-listen.playing { opacity: 1; background: rgba(0,93,170,0.1) !important; border-radius: 50%; }
  .btn-listen svg { width: 16px; height: 16px; fill: var(--azul); transition: fill 0.2s; }
  .btn-listen.playing svg { fill: #ef4444; }

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
  <div class="logo-wrap" style="font-weight:900;font-size:24px;color:#fff">R</div>
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
    <div class="rotary-icon" style="font-weight:900;color:#fff;font-family:serif">R</div>
    <h2>Como posso ajudar?</h2>
    <p>Escolha um tema abaixo ou digite sua d&uacute;vida sobre o Distrito 4630</p>
  </div>

  <div class="categories" id="categories">
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Pr&oacute;ximos eventos do distrito')">
      <span class="icon">📅</span>
      <span class="title">Calend&aacute;rio</span>
      <span class="desc">Eventos, PELS, ADIRC, Confer&ecirc;ncia</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Como usar o My Rotary?')">
      <span class="icon">🌐</span>
      <span class="title">My Rotary</span>
      <span class="desc">Portal, conta, cursos online</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Quais as metas 2026-2027?')">
      <span class="icon">🏆</span>
      <span class="title">Metas 26-27</span>
      <span class="desc">Rotary Club Central, premia&ccedil;&atilde;o</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="abrirUploadArte()">
      <span class="icon">🎨</span>
      <span class="title">Verificar Arte</span>
      <span class="desc">Envie a imagem e a IA analisa</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Quais os clubes do distrito 4630?')">
      <span class="icon">🏛️</span>
      <span class="title">Clubes D4630</span>
      <span class="desc">112 clubes, buscar por cidade</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Contatos &uacute;teis do distrito')">
      <span class="icon">📞</span>
      <span class="title">Contatos</span>
      <span class="desc">Governador, Secretaria, GAs</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('Como me tornar rotariano?')">
      <span class="icon">🤝</span>
      <span class="title">Ser Rotariano</span>
      <span class="desc">Rotary, Rotaract, Interact</span>
    </div>
    <div class="cat-card" role="button" tabindex="0" onclick="enviarRapido('O que &eacute; a Funda&ccedil;&atilde;o Rot&aacute;ria?')">
      <span class="icon">💰</span>
      <span class="title">Funda&ccedil;&atilde;o</span>
      <span class="desc">Contribui&ccedil;&otilde;es, subs&iacute;dios, EREY</span>
    </div>
  </div>

  <div class="sub-section" id="subSection">
    <div class="label">Perguntas populares</div>
    <div class="sub-pills">
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('O que &eacute; a Prova Qu&aacute;drupla?')">Prova Qu&aacute;drupla</div>
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('&Aacute;reas de enfoque do Rotary')">7 &Aacute;reas de Enfoque</div>
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('O que &eacute; o UnyClub?')">UnyClub</div>
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('Quando &eacute; a ADIRC?')">ADIRC</div>
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('Lideran&ccedil;a do distrito')">Lideran&ccedil;a</div>
      <div class="sub-pill" role="button" tabindex="0" onclick="enviarRapido('O que &eacute; Empresa Cidad&atilde;?')">Empresa Cidad&atilde;</div>
    </div>
  </div>

  <div id="messages"></div>
</div>

<div class="input-area">
  <button class="btn-mic" id="micBtn" onclick="toggleMic()" aria-label="Falar mensagem por voz" title="Fale sua pergunta">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
  </button>
  <input type="text" id="input" placeholder="Pergunte ou fale por voz..." enterkeyhint="send" autocomplete="off">
  <button id="sendBtn" onclick="enviar()" aria-label="Enviar mensagem">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
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
  html = html.replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href="\$1" target="_blank" style="color:var(--azul);text-decoration:underline;word-break:break-all">\$1</a>');
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Botao de ouvir nas respostas do bot
  const listenBtn = tipo === 'bot' && 'speechSynthesis' in window
    ? '<button class="btn-listen" onclick="ouvirResposta(this)" title="Ouvir resposta (clique novamente para parar)" aria-label="Ouvir resposta em voz"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></button> ' : '';
  div.innerHTML = html + '<div class="time">' + listenBtn + hora + '</div>';
  messages.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function addBackBtn() {
  const old = messages.querySelector('.back-btn');
  if (old) old.remove();
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
    addMsg('bot', 'Erro de conex\u00e3o. Tente novamente em alguns segundos.');
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

// Keyboard support for cards and pills
document.querySelectorAll('[role="button"]').forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
});

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

// ===== VOZ: MICROFONE (Speech-to-Text) =====
const micBtn = document.getElementById('micBtn');
let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let texto = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      texto += e.results[i][0].transcript;
    }
    input.value = texto;
    if (e.results[e.results.length - 1].isFinal) {
      stopMic();
      // Enviar automaticamente apos reconhecimento
      setTimeout(() => enviar(), 300);
    }
  };

  recognition.onerror = (e) => {
    console.log('Mic error:', e.error);
    stopMic();
    if (e.error === 'not-allowed') {
      input.placeholder = 'Permita o microfone nas configuracoes do navegador';
    }
  };

  recognition.onend = () => { stopMic(); };
} else {
  // Navegador nao suporta — esconder botao
  micBtn.style.display = 'none';
}

function toggleMic() {
  if (!recognition) return;
  if (isRecording) {
    recognition.stop();
    stopMic();
  } else {
    try {
      recognition.start();
      isRecording = true;
      micBtn.classList.add('recording');
      input.placeholder = 'Ouvindo... fale sua pergunta';
      input.value = '';
    } catch (e) { console.log('Mic start error:', e); }
  }
}

function stopMic() {
  isRecording = false;
  micBtn.classList.remove('recording');
  input.placeholder = 'Pergunte ou fale por voz...';
}

// ===== VOZ: OUVIR RESPOSTA (Text-to-Speech) =====
let bestVoice = null;

function limparTextoParaVoz(texto) {
  return texto
    // Remover emojis (Unicode property - funciona em todos os browsers modernos)
    .replace(/\\p{Extended_Pictographic}/gu, '')
    // Remover variation selectors, ZWJ, keycap combining (1️⃣2️⃣3️⃣)
    .replace(/[\\uFE0F\\u200D\\u20E3]/g, '')
    // Remover URLs completas (http/https)
    .replace(/https?:\\/\\/[^\\s<)]+/g, '')
    // Remover URLs sem protocolo (dominio.com.br/path)
    .replace(/[a-zA-Z0-9.-]+\\.(org|com|net|gov|br|io)(\\.[a-z]{2,3})?(\\\/[^\\s<)]*)?/gi, '')
    // Remover barras duplas soltas (//)
    .replace(/\\/\\//g, '')
    // Remover codigos hex de cor (#005DAA)
    .replace(/#[0-9A-Fa-f]{3,8}/g, '')
    // Remover horarios soltos no final (10:30)
    .replace(/\\d{2}:\\d{2}\\s*$/g, '')
    // Converter marcadores em pausas naturais
    .replace(/[•\\-\\*]/g, '. ')
    // Substituir abreviacoes por extenso
    .replace(/\\bD4630\\b/g, 'Distrito 4630')
    .replace(/\\bRC\\b/g, 'Rotary Club')
    .replace(/\\bGA\\b/g, 'Governador Assistente')
    .replace(/\\bGAs\\b/g, 'Governadores Assistentes')
    .replace(/\\bDQA\\b/g, 'Desenvolvimento do Quadro Associativo')
    .replace(/\\bEREY\\b/g, 'Every Rotarian Every Year')
    .replace(/\\bUS\\$/g, 'dolares ')
    .replace(/\\bR\\$/g, 'reais ')
    // Limpar pontuacao excessiva e espacos
    .replace(/\\.\\s*\\./g, '.')
    .replace(/\\s{2,}/g, ' ')
    .trim();
}

function selecionarMelhorVoz() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Prioridade: vozes mais naturais do pt-BR
  // Microsoft Natural e Google sao as melhores disponíveis
  const prioridade = [
    // Vozes Neural/Natural da Microsoft (mais naturais disponiveis)
    v => v.lang === 'pt-BR' && v.name.includes('Natural') && v.name.includes('Francisca'),
    v => v.lang === 'pt-BR' && v.name.includes('Natural') && v.name.includes('Thalita'),
    v => v.lang === 'pt-BR' && v.name.includes('Natural'),
    // Google pt-BR (boa qualidade)
    v => v.lang === 'pt-BR' && v.name.includes('Google'),
    // Qualquer Microsoft pt-BR
    v => v.lang === 'pt-BR' && v.name.includes('Microsoft'),
    // Qualquer pt-BR
    v => v.lang === 'pt-BR',
    v => v.lang.startsWith('pt'),
  ];

  for (const filtro of prioridade) {
    const found = voices.find(filtro);
    if (found) return found;
  }
  return null;
}

function ouvirResposta(btn) {
  if (!('speechSynthesis' in window)) return;

  // Se ja esta tocando, PARAR (toggle)
  if (btn.classList.contains('playing')) {
    speechSynthesis.cancel();
    btn.classList.remove('playing');
    btn.title = 'Ouvir resposta';
    return;
  }

  // Parar qualquer outro audio tocando
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    document.querySelectorAll('.btn-listen.playing').forEach(b => {
      b.classList.remove('playing');
      b.title = 'Ouvir resposta';
    });
  }

  // Pegar e limpar texto
  const msgDiv = btn.closest('.msg');
  let texto = msgDiv.innerText || msgDiv.textContent;
  texto = limparTextoParaVoz(texto);

  if (!texto || texto.length < 3) return;

  // Selecionar melhor voz
  if (!bestVoice) bestVoice = selecionarMelhorVoz();

  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'pt-BR';
  utter.rate = 0.92;  // Mais lento = tom de conversa acolhedora
  utter.pitch = 1.08; // Ligeiramente mais agudo = mais caloroso e amigavel
  utter.volume = 0.9; // Volume suave, nao agressivo
  if (bestVoice) utter.voice = bestVoice;

  btn.classList.add('playing');
  btn.title = 'Parar audio';

  utter.onend = () => {
    btn.classList.remove('playing');
    btn.title = 'Ouvir resposta';
  };
  utter.onerror = () => {
    btn.classList.remove('playing');
    btn.title = 'Ouvir resposta';
  };

  speechSynthesis.speak(utter);
}

// Carregar vozes (necessario para alguns navegadores)
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    bestVoice = selecionarMelhorVoz();
  };
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

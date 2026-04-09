# Como Ativar o Assistente Digital D4630

## OPCAO 1: WhatsApp (como Segunda-Feira do Telegram)

Funciona no seu WhatsApp pessoal ou de um numero dedicado.
Funciona em PRIVADO e em GRUPOS.

### Passo a passo:

1. Abra o arquivo `INICIAR-BOT.bat` (duplo clique)
2. Aguarde o QR Code aparecer (30-60 segundos)
3. No celular: WhatsApp > 3 pontos > Aparelhos conectados > Conectar
4. Escaneie o QR Code
5. Pronto! O bot esta ativo.

### Como funciona em GRUPOS:

O bot responde quando alguem:
- Menciona "bot", "d4630", "assistente"
- Digita um numero do menu (1-9, 0)
- Pergunta sobre eventos, rotary, my rotary, etc.
- Digita "menu" ou "ajuda"

Em conversa PRIVADA: responde TUDO.

### Dados sempre atualizados:

O bot recarrega o arquivo `conhecimento-rotary-d4630.txt` automaticamente a cada minuto.
Para atualizar os dados:

1. Edite o arquivo `conhecimento-rotary-d4630.txt` (Bloco de Notas serve)
2. Salve
3. O bot pega as mudancas automaticamente (max 1 minuto)

Ou via WhatsApp (admin):
- `!admin add evento 15/05 - Nome do Evento`
- `!admin add faq Pergunta | Resposta`
- `!admin reload` (recarrega agora)

### Limitacao:

- Precisa do PC ligado (o bot roda no seu computador)
- Para 24/7, veja OPCAO 3

---

## OPCAO 2: Chat Web (publico, qualquer pessoa acessa)

### Local (so voce):
1. Abra terminal na pasta bot
2. `node web-chat.js`
3. Acesse http://localhost:3000

### Publico (qualquer pessoa no mundo):

#### Deploy no Render (GRATIS):

1. Crie conta em https://render.com (login com GitHub)
2. Clique "New" > "Web Service"
3. Conecte este repositorio (ou upload)
4. Configure:
   - Name: assistente-d4630
   - Runtime: Node
   - Build Command: npm install
   - Start Command: node web-chat.js
5. Em "Environment Variables", adicione:
   - OPENROUTER_API_KEY = sua-chave
6. Clique "Deploy"
7. Em ~2 minutos voce tera uma URL publica tipo:
   https://assistente-d4630.onrender.com

Mande essa URL para qualquer pessoa e ela consegue conversar com o bot!

---

## OPCAO 3: WhatsApp 24/7 (sem precisar do PC ligado)

Requer um dos dois:
A) VPS (servidor na nuvem) ~R$32/mes — Oracle Cloud tem gratis
B) WhatsApp Cloud API (Meta) — gratis ate 1000 conversas/mes

### A) VPS com Oracle Cloud (GRATIS pra sempre):
1. Crie conta em https://cloud.oracle.com (precisa cartao, nao cobra)
2. Crie uma instancia "Always Free" (ARM, 4 GB RAM)
3. Instale Node.js
4. Copie a pasta bot para o servidor
5. Rode com PM2: `pm2 start index.js --name d4630`
6. Escaneie o QR Code uma vez (via terminal SSH)
7. Bot fica ativo 24/7

### B) WhatsApp Cloud API (Meta):
Veja o arquivo SETUP-WHATSAPP-API.md

---

## Resumo

| Opcao | Custo | 24/7 | Grupos | Dificuldade |
|-------|-------|------|--------|-------------|
| WhatsApp (seu PC) | R$0 | Nao (PC ligado) | Sim | Facil |
| Chat Web local | R$0 | Nao | N/A | Facil |
| Chat Web Render | R$0 | Sim | N/A | Medio |
| VPS Oracle | R$0 | Sim | Sim | Avancado |
| Cloud API Meta | R$0 | Sim | Sim | Avancado |

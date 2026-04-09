# Setup WhatsApp Cloud API — 5 Minutos

## PASSO 1: Abra este link (login com Facebook)
https://developers.facebook.com/apps/create/

- Tipo: **Outros** (ou Business)
- Nome: **Assistente D4630**
- Clique **Criar App**

## PASSO 2: Adicionar WhatsApp
- No painel, clique **Adicionar Produto**
- Encontre **WhatsApp** > **Configurar**

## PASSO 3: Copiar Token e Phone ID
Na tela do WhatsApp voce vera:

```
Token temporario: EAA..........  (copie tudo)
Phone number ID: 123456789012345 (copie)
Numero de teste: +1 555 XXX XXXX (a Meta te da gratis)
```

## PASSO 4: Configurar Webhook
Na mesma tela > **Configuracao** > **Webhook** > **Editar**

```
URL do callback:     https://untyrannically-turdine-shalanda.ngrok-free.dev/webhook
Token de verificacao: rotary_d4630_verify
```

Clique **Verificar e salvar**
Marque **messages** (subscribe)

## PASSO 5: Testar
Mande "Oi" pro numero de teste e o bot responde!

---

## Alternativa: Rodar no seu terminal (mais rapido)

Se quiser testar AGORA sem Meta:

```
cd "C:\Users\thiag\Projeto Claude\rotary-d4630\implementacao\v1-simples\bot"
node index.js
```

Escaneia o QR Code com seu WhatsApp e funciona.

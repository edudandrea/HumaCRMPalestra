# Deploy no Render

Este projeto esta pronto para subir no Render usando Docker.

## Passos

1. Envie o repositorio para o GitHub.
2. No Render, crie um novo **Web Service** apontando para o repositorio.
3. Escolha **Docker** como runtime. O Render vai usar o `Dockerfile` da raiz.
4. Configure as variaveis de ambiente:

| Variavel | Obrigatoria | Observacao |
| --- | --- | --- |
| `MERCADOPAGO_PUBLIC_KEY` | Sim | Public key da sua aplicacao Mercado Pago. |
| `MERCADOPAGO_ACCESS_TOKEN` | Sim | Access token da sua aplicacao Mercado Pago. |
| `MERCADOPAGO_STATEMENT_DESCRIPTOR` | Nao | Nome que aparece na fatura. Padrao: `HUMAN`. |
| `MERCADOPAGO_NOTIFICATION_URL` | Nao | URL de webhook, se voce for usar notificacoes do Mercado Pago. |
| `MERCADOPAGO_SUCCESS_URL` | Nao | URL customizada para pagamento aprovado. |
| `MERCADOPAGO_FAILURE_URL` | Nao | URL customizada para pagamento recusado. |
| `MERCADOPAGO_PENDING_URL` | Nao | URL customizada para pagamento pendente. |

Se as URLs de retorno nao forem configuradas, a API gera automaticamente URLs usando o dominio publico do Render.

## Blueprint

Tambem existe um `render.yaml`. Se preferir, no Render use **New > Blueprint** e selecione este repositorio.

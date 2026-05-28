
# RECEPTOR ISRAEL - Monitor de Sinais

Este projeto utiliza Next.js com Firebase Firestore para monitoramento de webhooks e códigos em tempo real.

## Configuração do Banco de Dados

Como o provisionamento automático falhou, siga estes passos:

1. **Acesse o Console**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Crie um Projeto**: Nomeie como "Receptor Israel".
3. **Crie o Firestore**: Vá em "Build > Firestore Database" e clique em "Criar banco de dados". Use o modo de teste para facilitar o início.
4. **Adicione um App Web**: No painel principal, clique no ícone `</>` para gerar as chaves de API.
5. **Configure o Código**: Abra o arquivo `src/firebase/config.ts` e cole as chaves geradas.

## Link Direto para o Banco
Substitua `SEU-PROJECT-ID` pelo ID que você criou no console:
`https://console.firebase.google.com/project/SEU-PROJECT-ID/firestore`

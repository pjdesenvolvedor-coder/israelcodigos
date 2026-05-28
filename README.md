
# RECEPTOR ISRAEL - Monitor de Sinais

Este projeto utiliza Next.js com Firebase Firestore para monitoramento de webhooks e códigos em tempo real.

## Configuração Manual (Caminho Alternativo)

Como você já criou o projeto no console, siga estes passos:

1. **Obter Configuração Web**:
   - No [Console do Firebase](https://console.firebase.google.com/), acesse seu projeto "Receptor Israel".
   - Na engrenagem (Configurações do Projeto) ou na Visão Geral, clique no ícone `</>` (Web).
   - Copie os valores do objeto `firebaseConfig`.
   - Abra o arquivo `src/firebase/config.ts` no editor e cole os valores lá.

2. **Ativar o Banco de Dados**:
   - No menu lateral do Firebase, vá em **Build > Firestore Database**.
   - Clique em **Criar banco de dados**.
   - Escolha o local (ex: `southamerica-east1`).
   - Selecione **Modo de Teste** para liberar o acesso inicial.

## Link Direto para o Banco
`https://console.firebase.google.com/project/${SUA_PROJECT_ID}/firestore`

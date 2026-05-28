
# RECEPTOR ISRAEL - Monitor de Sinais

## Guia de Configuração Manual (Pela sua imagem)

Como o sistema automático falhou, siga estes passos no seu Console Firebase:

### 1. Obter as Chaves de Acesso
1. No menu lateral esquerdo, clique em **Configurações** (ícone da engrenagem).
2. Selecione **Configurações do projeto**.
3. Role a página até encontrar a seção **"Seus apps"**.
4. Clique no ícone **`</>` (Web)**.
5. Digite um nome para o app e clique em **Registrar app**.
6. Copie os valores de `apiKey`, `authDomain`, etc.
7. Abra o arquivo `src/firebase/config.ts` no editor e cole os valores nos lugares indicados.

### 2. Ativar o Banco de Dados (Firestore)
1. No menu lateral esquerdo, clique em **Bancos de dados e ar...**.
2. Clique em **Cloud Firestore** ou **Firestore Database**.
3. Clique no botão **Criar banco de dados**.
4. Escolha a região (ex: `southamerica-east1`).
5. Selecione **Modo de Teste** (importante para funcionar de imediato).

---
PJ DEV - Sistema de Monitoramento Tático.

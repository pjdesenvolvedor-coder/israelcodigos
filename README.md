
# RECEPTOR ISRAEL - Monitor de Sinais

## 🚨 Status do Banco de Dados
O banco de dados foi criado no **Modo de Produção**. Você precisa liberar o acesso nas regras.

### Como liberar o acesso (PASSO OBRIGATÓRIO):
1. Acesse o [Console do Firebase - Regras](https://console.firebase.google.com/project/receptor-israel/firestore/rules).
2. Substitua as regras atuais por estas:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Clique em **PUBLICAR**.

---
### Como Testar:
1. Vá para a página `/adm`.
2. Senha: `Ae@1234Br`.
3. Clique em **GERAR NOVO ACESSO**.
4. Clique em **ENVIAR SINAL DE TESTE**.
5. Vá para a Home e entre com o código gerado.

Se o sinal aparecer, seu sistema está 100% ONLINE!

PJ DEV - Sistema de Monitoramento Tático.

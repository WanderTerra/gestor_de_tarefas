# 🔔 Como Habilitar Notificações do Windows

## ✅ Método Simples (Recomendado)

Para **localhost**, você pode habilitar notificações mesmo em **HTTP** usando o método do ícone de cadeado na barra de endereços. É mais simples e não requer HTTPS!

---

## ⚠️ Se você viu a mensagem "Permissão de notificações negada"

Siga os passos abaixo para o seu navegador:

---

## 🌐 Google Chrome / Microsoft Edge

### Método Rápido (Recomendado) ⭐

1. **Acesse o sistema:** `http://localhost:5173`
2. **Olhe na barra de endereços** (onde está o URL)
3. Clique no **ícone de informações** ⓘ ou **cadeado** 🔒 à esquerda do endereço
4. Uma janela pop-up aparecerá com as permissões do site
5. Encontre a opção **"Notificações"**
6. Altere de **"Bloquear"** para **"Permitir"**
7. **Recarregue a página** (F5)
8. Clique no **ícone de teste** (⚠️) na barra superior
9. Quando o navegador perguntar, clique em **"Permitir"**

✅ **Pronto!** As notificações estão habilitadas!

### Método Alternativo (Se o método rápido não funcionar)

⚠️ **Nota:** Este método pode não funcionar em HTTP. Use o método rápido acima primeiro!

1. Clique nos **três pontos** (⋮) no canto superior direito
2. Vá em **Configurações**
3. No menu lateral, clique em **Privacidade e segurança**
4. Clique em **Configurações do site**
5. Clique em **Notificações**
6. Procure por `localhost:5173` na lista
7. Se encontrar, altere para **"Permitir"**
8. **Recarregue a página** (F5)

---

## 🦊 Mozilla Firefox

1. Clique nos **três traços** (☰) no canto superior direito
2. Vá em **Configurações**
3. No menu lateral, clique em **Privacidade e Segurança**
4. Role até a seção **Permissões**
5. Clique em **Configurações...** ao lado de "Notificações"
6. Procure por `localhost:5173` ou `192.168.137.1:5173`
7. Se encontrar, altere para **"Permitir"**
8. Se **não encontrar**, adicione manualmente:
   - Digite: `http://localhost:5173`
   - Selecione **"Permitir"**
   - Clique em **Salvar alterações**
9. **Recarregue a página** (F5)

---

## 🍎 Safari (macOS)

1. Vá em **Safari** → **Preferências** (ou pressione `Cmd + ,`)
2. Clique na aba **Websites**
3. No menu lateral, selecione **Notificações**
4. Procure por `localhost:5173`
5. Altere para **"Permitir"**
6. **Recarregue a página** (F5)

---

## ✅ Depois de Habilitar

1. **Recarregue a página** (F5 ou Ctrl+R)
2. Clique novamente no **ícone de teste** (⚠️) na barra superior do sistema
3. O navegador solicitará permissão novamente
4. Clique em **"Permitir"** quando aparecer o pop-up
5. Uma notificação de teste será exibida! 🎉

---

## 🔍 Verificar se Funcionou

Após habilitar, o ícone de teste na barra superior deve ficar **verde** quando você passar o mouse sobre ele, indicando que as notificações estão ativas.

---

## ❓ Ainda não funciona?

1. **Verifique se o Windows permite notificações:**
   - Windows 10/11: Configurações → Sistema → Notificações
   - Certifique-se de que as notificações estão habilitadas

2. **Verifique o modo de navegação:**
   - Alguns navegadores bloqueiam notificações em modo anônimo/privado
   - Tente em uma janela normal (não privada)

3. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Selecione "Cookies e outros dados do site"
   - Clique em "Limpar dados"
   - Recarregue a página

4. **Teste em outro navegador:**
   - Se não funcionar em um, tente em outro

---

## 📸 Imagens de Referência

### Chrome/Edge - Ícone na Barra de Endereços
```
[ⓘ] http://localhost:5173
     ↓ Clique aqui
     ┌─────────────────────────┐
     │ Notificações            │
     │ [Bloquear] → [Permitir] │
     └─────────────────────────┘
```

**Passo a passo visual:**
1. Clique no **ⓘ** (ícone de informações) na barra de endereços
2. Uma janela pop-up aparecerá
3. Role até encontrar **"Notificações"**
4. Clique no dropdown e selecione **"Permitir"**
5. A janela fechará automaticamente
6. Recarregue a página (F5)

---

**Dica:** O método mais rápido é clicar no ícone de cadeado na barra de endereços e alterar diretamente de lá!

# Gestor de Tarefas

Sistema de gestão de tarefas desenvolvido com React, TypeScript e Tailwind CSS v4.

## 🚀 Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS v4** - Framework CSS utility-first
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones

## 📦 Instalação

1. Instale as dependências:
```bash
npm install
```

## 🏃 Executar o Projeto

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 🏗️ Build

Para criar uma build de produção:

```bash
npm run build
```

## 🖥️ Deploy (Debian 13)

Para colocar em produção num servidor Debian 13 (Nginx + Node + MariaDB), use os ficheiros na pasta `deploy/` e siga o guia:

- **[deploy/README-DEPLOY-DEBIAN.md](deploy/README-DEPLOY-DEBIAN.md)** – passo a passo completo
- Script auxiliar: `deploy/install-debian.sh`

## 📁 Estrutura do Projeto

```
gestor_de_tarefas/
├── src/
│   ├── components/
│   │   └── ui/          # Componentes UI reutilizáveis
│   ├── lib/
│   │   └── utils.ts     # Utilitários
│   ├── types/
│   │   └── task.ts      # Tipos TypeScript
│   ├── App.tsx          # Componente principal
│   ├── main.tsx         # Entry point
│   └── index.css        # Estilos globais Tailwind
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Status das Tarefas

- **Pendente** (pending): Amarelo
- **Em Progresso** (in-progress): Azul
- **Concluído** (completed): Verde
- **Bloqueado** (blocked): Vermelho

Cada card exibe um ícone circular colorido correspondente ao status da tarefa.

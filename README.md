# 🕐 Clockwise - Sistema de Controle de Ponto Digital

Um sistema moderno e intuitivo para controle de jornada de trabalho, desenvolvido com **Next.js 15**, **Firebase** e **PWA**.

## ✨ Funcionalidades

- 🕰️ **Controle de Ponto**: Sistema completo de entrada, saída e intervalos
- 📊 **Banco de Horas**: Cálculo automático com histórico detalhado
- 📱 **PWA**: Funciona offline e pode ser instalado como app
- 🔔 **Notificações Inteligentes**: Lembretes automáticos e alertas
- ⚙️ **Configurações Flexíveis**: Horários, dias úteis, formatos personalizáveis
- 📈 **Relatórios**: Histórico completo com edição de registros
- 🎯 **Previsão**: Horário estimado de término do expediente
- 🌙 **Tema Escuro**: Interface moderna e profissional

## 🚀 Tecnologias Utilizadas

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI/UX**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Backend**: Firebase (Auth + Firestore)
- **PWA**: Service Workers, Push Notifications
- **IA**: Google Genkit + Gemini 2.0
- **Testes**: Jest, React Testing Library
- **Validação**: React Hook Form + Zod

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Firebase

## ⚡ Instalação e Configuração

### 1. Clone e instale dependências

```bash
git clone <seu-repositorio>
cd clockwise
npm install
```

### 2. Configuração do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative **Authentication** (Email/Password)
4. Ative **Firestore Database**
5. Configure as regras do Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Configuração de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Google AI (Opcional - para funcionalidades de IA)
GOOGLE_GENAI_API_KEY=sua_google_ai_key
```

### 4. Primeira execução

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura de testes
npm run test:coverage
```

## 📖 Comandos Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (porta 9002)
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código
npm run typecheck    # Verificação de tipos TypeScript
npm test             # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Relatório de cobertura

# Comandos Genkit (IA)
npm run genkit:dev   # Servidor Genkit para desenvolvimento
npm run genkit:watch # Genkit em modo watch
```

## 🏗️ Estrutura do Projeto

```
src/
├── app/                 # App Router (Next.js 15)
│   ├── page.tsx        # Página principal
│   ├── login/          # Autenticação
│   ├── register/       # Registro
│   ├── settings/       # Configurações
│   └── reports/        # Relatórios
├── components/         # Componentes reutilizáveis
│   ├── Dashboard/      # Componentes do dashboard
│   │   ├── TimeCard.tsx
│   │   ├── StatusDisplay.tsx
│   │   └── QuickStats.tsx
│   └── ui/            # Componentes base (shadcn/ui)
├── hooks/             # Custom hooks
│   ├── useDashboardData.ts
│   ├── useTimeCalculations.ts
│   └── use-toast.ts
├── services/          # Lógica de negócio
│   ├── time-entry.service.ts
│   └── settings.service.ts
├── lib/               # Utilitários e configurações
│   └── firebase.ts
└── ai/                # Configuração Genkit
    ├── genkit.ts
    └── dev.ts
```

## 🔧 Configurações Personalizáveis

O sistema permite configurar:

- **Jornada de trabalho**: Horas semanais e dias úteis
- **Horários**: Início do expediente e duração do intervalo
- **Formatos**: 12h/24h, idioma
- **Notificações**: Lembretes automáticos
- **Banco de horas**: Ajustes manuais

## 📱 PWA (Progressive Web App)

O Clockwise funciona como um app nativo:

- ✅ Instalação no dispositivo
- ✅ Funcionamento offline
- ✅ Notificações push
- ✅ Sincronização automática

Para instalar: acesse pelo navegador e clique em "Instalar App"

## 🤖 Funcionalidades de IA

Com o Genkit integrado:

- Análise de padrões de trabalho
- Sugestões de otimização
- Relatórios inteligentes
- Detecção de anomalias

## 🚀 Deploy

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Vercel

```bash
npm install -g vercel
vercel --prod
```

## 📊 Métricas e Monitoramento

- **Performance**: First Contentful Paint < 1.5s
- **Cobertura de testes**: > 80%
- **TypeScript**: 100% tipado
- **Acessibilidade**: WCAG 2.1 AA

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Changelog

### v0.1.0 (Atual)
- ✅ Sistema básico de controle de ponto
- ✅ Banco de horas automático
- ✅ PWA com notificações
- ✅ Interface responsiva
- ✅ Testes automatizados

### Próximas versões
- 🔄 Sistema de relatórios avançado
- 🔄 Funcionalidades administrativas
- 🔄 Integrações externas
- 🔄 IA expandida

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 Email: suporte@clockwise.app
- 📖 Documentação: [docs.clockwise.app](https://docs.clockwise.app)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/clockwise/issues)

---

**Desenvolvido com ❤️ para modernizar o controle de ponto empresarial**

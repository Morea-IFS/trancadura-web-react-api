# 🔐 Trancadura 2.0 | Backend API (NestJS)

![NestJS](https://img.shields.io/badge/nestjs-%E2%88%92%2011.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

> Backend RESTful desenvolvido para gerenciar o ecossistema IoT de controle de acesso (Trancadura) do **Instituto Federal de Sergipe (IFS) - Campus Lagarto**, parte do Projeto MOREA.

Esta API atua como o cérebro do sistema, gerenciando a comunicação entre o painel web administrativo (React/Next.js) e os microcontroladores (ESP32) instalados nas portas dos laboratórios.

---

## ✨ Funcionalidades Principais

- **Autenticação e Autorização**: Sistema de login via JWT com controle de acesso baseado em funções (RBAC - *Superuser*, *Staff*, etc).
- **Chaves Digitais Temporais (Smart Tokens)**: Geração de tokens JWT com validação matemática de tempo de vida (`nbf` e `exp`), servindo como chave de acesso física para o hardware.
- **Gestão de Reservas Acadêmicas**: 
  - Criação de reservas de laboratórios.
  - Sincronização automática com a **Google Calendar API**.
  - Processamento em lote e extração de horários diretamente via upload de arquivo **PDF**.
- **Comunicação IoT**: Endpoints ultrarrápidos e seguros para validação de acesso em tempo real (`/validate-access`) solicitados pelos leitores RFID (MFRC522).
- **Segurança de Borda**: Proteção de rotas com Guards, Hash de senhas via `bcrypt`, cabeçalhos seguros com `Helmet` e proteção contra força bruta com `express-rate-limit`.

---

## 🛠️ Stack Tecnológica

- **Framework:** [NestJS](https://nestjs.com/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **ORM / Banco de Dados:** [Prisma](https://www.prisma.io/) (PostgreSQL/MySQL)
- **Segurança:** Passport.js, JWT, Bcrypt
- **Utilitários:** `pdf-extraction` (Leitura de PDFs), `googleapis` (Sincronização de agenda)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+ recomendado)
- **Banco de Dados** compatível configurado (PostgreSQL, MySQL, etc).

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/SEU_USUARIO/trancadura-web-react-api.git](https://github.com/SEU_USUARIO/trancadura-web-react-api.git)
   cd trancadura-web-react-api
   ```

2. **Instale as dependências:**
    ```bash
    npm install
    ```

3. **Configure as Variáveis de Ambiente:**
    Crie um arquivo .env na raiz do projeto baseado no .env.example (se houver) e preencha com suas configurações:
    ```bash
    # Configurações do Banco de Dados
    DATABASE_URL="postgresql://user:password@localhost:5432/trancadura_db?schema=public"

    # Segurança JWT
    JWT_SECRET="sua_chave_secreta_super_segura_aqui"
    JWT_EXPIRES_IN="1d"

    # Configurações do Google Calendar (Opcional para testes locais)
    GOOGLE_CALENDAR_ID="seu_calendar_id@group.calendar.google.com"
    ```
    Nota: Para a integração com o Google funcionar, o arquivo de credenciais google-credentials.json deve ser colocado na raiz do projeto.

4. **Prepare o Banco de Dados (Prisma)**
    ```bash
    # Gera os tipos do Prisma Client
    npx prisma generate

    # Roda as migrações no banco de dados (se aplicável ao ambiente local)
    npx prisma migrate dev
    ```

5. **Inicie o Servidor:**
    ```bash
    # Modo desenvolvimento
    npm run start:dev
    ```
    A API estará rodando em: http://localhost:8080

## 📡 Visão Geral da API (Endpoints Principais)
| Rota | Método | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Autentica um usuário e retorna o cookie/token JWT. | Pública |
| `/auth/signup` | `POST` | Cria um novo usuário/staff (requer ser superuser para criar admins). | Protegida |
| `/reservations` | `GET/POST` | Lista ou cria novas reservas de laboratórios. | Protegida |
| `/reservations/populate-calendar` | `POST` | Faz upload de um PDF para extrair horários e sincronizar. | Protegida |
| `/reservations/:id/token` | `POST` | Gera o Smart Token (Chave física temporária) para uma reserva. | Protegida |
| `/reservations/validate-access` | `POST` | Recebe um token do ESP32 e valida o acesso lógico/temporal. | IoT/Pública |
| `/devices` | `GET/POST` | Gerencia os Motes (ESP32) cadastrados no sistema. | Protegida |


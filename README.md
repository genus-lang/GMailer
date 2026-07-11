# Gmailer (Thin Client Architecture)

Gmailer is a scalable, cloud-powered Chrome Extension for sending mass emails natively through Gmail using an automated background queue.

## 🚀 Tech Stack

### Frontend (Chrome Extension - Thin Client)
* **Framework:** React 18 + Vite
* **State Management:** Zustand
* **Styling:** TailwindCSS
* **Routing:** React Router DOM (MemoryRouter)
* **Build Tool:** CRXJS Vite Plugin
* **Language:** TypeScript

### Backend (NestJS Monolith)
* **Framework:** NestJS
* **Database:** PostgreSQL (NeonDB)
* **ORM:** Prisma
* **Message Queue:** BullMQ + Valkey (Redis alternative via Aiven)
* **Authentication:** Google OAuth2 (Passport.js)
* **Email API:** Google APIs (`googleapis`)

---

## 🏗 Architecture & Flowchart

The system is designed as a **Thin Client** extension with a **Heavy Cloud Backend**, ensuring that queues don't die if the browser is closed, and preventing local storage bloat.

### System Flowchart

```mermaid
graph TD
    %% Users and Frontend
    User([👨‍💻 User]) --> |Clicks Start Campaign| Ext[Chrome Extension UI]
    Ext --> |POST /campaigns (JWT)| API[NestJS Backend API]

    %% Backend Services
    subgraph "NestJS Backend"
        API --> DB[(PostgreSQL)]
        API --> |Add Jobs| Queue[(Valkey Queue)]
        Worker[BullMQ Worker Processor]
    end

    %% Queue Processing
    Queue --> |Pulls Job| Worker
    Worker --> |Fetches Refresh Token| DB
    
    %% External APIs
    Worker --> |Sends Raw Email| GmailAPI[Gmail API]
    GmailAPI --> |Delivers Email| Recipient([📧 Recipient])
    
    %% Post-processing
    Worker --> |Updates Stats| DB
    Ext -.-> |Polls Status via GET /campaigns| API
```

### Module Breakdown
* **`campaigns`**: Handles CRUD for campaigns and orchestrates adding emails to the BullMQ queue.
* **`contacts`**: A mini CRM storing leads.
* **`queue`**: Manages BullMQ integration. The `EmailQueueProcessor` pulls from Valkey, handles simulated human delay (20s-45s), and delegates sending to the Gmail service.
* **`gmail`**: A pure abstraction over `googleapis` for constructing and sending raw MIME messages using the stored `googleRefreshToken`.
* **`auth`**: Handles OAuth2 flow securely using Passport.js to acquire and store Refresh Tokens.

---

## 🛠 How to Run Locally (For Cloners)

If you have cloned this repository, follow these steps to run the complete stack locally.

### 1. Prerequisites
- Node.js (v18+)
- `pnpm` installed globally (`npm install -g pnpm`)
- A PostgreSQL database (e.g., NeonDB or local)
- A Valkey or Redis instance (e.g., Aiven or local docker)
- Google Cloud Console project with OAuth credentials (Client ID, Client Secret)

### 2. Setup the Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file in the `server` directory and add your credentials:
   ```env
   DATABASE_URL="postgres://user:password@host/dbname"
   REDIS_URL="rediss://user:password@host:port"
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
   JWT_SECRET="super-secret-key"
   ```
4. Push the database schema:
   ```bash
   npx prisma db push
   ```
5. Start the backend:
   ```bash
   pnpm run start:dev
   ```

### 3. Setup the Chrome Extension
1. Open a new terminal and navigate to the root directory:
   ```bash
   cd Gmailer
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension in watch mode:
   ```bash
   pnpm run dev
   ```
4. Load into Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right.
   - Click **Load unpacked** and select the `Gmailer/dist` folder.
   
5. Pin the extension and open Gmail!

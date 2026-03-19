# Kanbi Kitchen

A minimalistic, AI‑powered meal‑planning app that uses a Kanban board to schedule recipes, lets a two‑person household vote on dishes, and auto‑generates shopping lists & prep timelines.

## Features

- **Kanban Board:** Drag-and-drop meal planning for the week (Mon-Fri).
- **Recipe Bank:** Search and add recipes with tags and dietary info.
- **AI Integration:** OpenAI GPT-4 powered recipe suggestions, shopping list generation, and prep timelines.
- **Voting:** Simple household voting system on meal cards.
- **Dark Mode:** Fully responsive UI with dark theme support.
- **Auth:** Supabase Authentication (Email/Password).

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (optional for containerized run)
- Supabase Account (for Auth & Database)
- OpenAI API Key

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/kanbi-kitchen.git
    cd kanbi-kitchen
    ```

2.  **Environment Variables:**
    Copy `.env.example` to `.env` and fill in your credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Supabase Setup:**
    - Create a new project in Supabase.
    - Go to Project Settings -> API to get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
    - Run the SQL scripts provided in `backend/database/schema.sql` (to be created) in the Supabase SQL Editor.

## Running the App

### Development Mode

**Backend:**
```bash
cd backend
npm install
npm run dev
```
Runs on `http://localhost:3000`.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` (proxies `/api` to backend).

### Docker
To run the backend and a local Postgres instance:
```bash
docker-compose up --build
```

## API Documentation

All endpoints are prefixed with `/api`. Protected routes require a valid Bearer token.

- `GET /recipes`: List/search recipes.
- `POST /recipes`: Create a recipe (Admin).
- `GET /plan`: Get current user's weekly plan.
- `POST /plan`: Update the plan.
- `POST /plan/vote`: Vote on a meal card.
- `POST /plan/shopping-list`: Generate shopping list (AI).
- `POST /plan/prep-timeline`: Generate prep timeline (AI).

## Testing

Run backend tests (AI service mock):
```bash
cd backend
npm test
```

## Analytics
Plausible Analytics snippet is included in `frontend/index.html`.

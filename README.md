# Stride

A habit and fitness tracker with an AI copilot that can act on your data, not just talk about it.

**Live:** https://stride-382x.vercel.app

## Features

- **Custom trackers.** Track anything with a unit and a daily target: water, sleep, protein, study hours. Each tracker shows today's progress and streaks.
- **Fitness by muscle group.** Pick the day's focus groups, log sets and reps per exercise, and see how balanced your training is over time.
- **Progress views.** Compare weeks, months or years per tracker.
- **Notes.** Daily notes with auto-save.
- **Libra, the copilot.** A chat assistant backed by Gemini with function calling. It reads your trackers, logs, notes and workouts as context, and can log entries, create new trackers, and generate meal or workout plans that render as cards in the chat.
- Onboarding flow, product tour and profile with avatars.

## Tech stack

- Next.js 16 (App Router), React 19
- Supabase (Postgres, Auth)
- Google Gemini API (`@google/genai`)
- Tailwind CSS 4, Framer Motion, Recharts, Three.js
- Deployed on Vercel

## How the copilot works

The client sends the message along with the user's Supabase access token. The API route verifies the token, builds a context summary of that user's data, and calls Gemini with a set of tool definitions (`src/lib/tools.js`). If the model calls a tool, the route runs it against Supabase (`src/lib/tool-executor.js`) and sends the result back to the model for the final reply.

## Screenshots

<!-- Add screenshots to docs/screenshots/ and reference them here -->

| Dashboard | Copilot | Fitness |
| --- | --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Copilot](docs/screenshots/copilot.png) | ![Fitness](docs/screenshots/fitness.png) |

## Running locally

Requires Node 20+ and a Supabase project.

```bash
git clone https://github.com/phanindraks2005/stride.git
cd stride
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key, used by the browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, used only in the API route. Never expose it to the client |
| `GEMINI_API_KEY` | Google AI Studio API key |

### Database

The app expects these tables, each with a `user_id` column tied to `auth.users`: `profiles`, `trackers`, `logs`, `notes`, `muscle_groups`, `exercises`, `exercise_logs`, `daily_selections`, `messages`.

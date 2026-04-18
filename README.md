_This project has been created as part of the 42 curriculum by ebelkadi, msennane, sennakhl, ysbai-jo._

# Cfit (UM6P\_FIT)

## Description

**Cfit** is the team's implementation of `ft_transcendence` — a multi-user fitness web application built as a full-stack platform rather than a game-focused product. It combines a **React** frontend, a **Go** backend, and a **PostgreSQL** database to deliver workout tracking, nutrition logging, AI-assisted coaching, and admin operations in a single cohesive platform.

The application exposes three main product surfaces:

- **Authentication & Onboarding** — sign-up, login, 2FA challenge, and a 3-step onboarding flow
- **User Application** — dashboard, workouts, nutrition, AI coach, notifications, progress tracking, and account settings
- **Admin Application** — user moderation, exercise management, nutrition management, workout programs, audit logs, and real-time dashboard metrics

### Key Features

- React 19 SPA with protected user and admin routes
- Go API served over HTTPS with OpenAPI documentation and health endpoints
- PostgreSQL data model covering users, workouts, nutrition, exports, notifications, and admin records
- WebSocket-powered real-time admin metrics
- Multilingual UI in English, French, and Arabic with RTL layout support
- Secure authentication: hashed passwords, refresh token rotation, session management, and 2FA
- AI coach chat with persistent conversation history and a separate Qdrant-backed RAG knowledge pipeline
- Privacy Policy page at `/privacy` and Terms of Service page at `/terms`

### Evaluation Snapshot

| Item | Value |
|---|---|
| Frontend / Backend / Database | React + Go + PostgreSQL |
| Single-command deployment | `make run` |
| Evaluation browser | Latest stable Google Chrome |
| HTTPS backend | `https://localhost:8082` |
| Legal pages | `/privacy` and `/terms` |
| Environment security | `.env` excluded by Git; `Backend/.env.example` provided |

---

## Instructions

### Prerequisites

Make sure the following tools are installed before starting:

| Tool | Version |
|---|---|
| Docker & Docker Compose | latest |
| Make | any |
| Node.js | 18+ |
| npm | bundled with Node.js |
| Go *(only if running the backend outside Docker)* | 1.25+ |

### Repository Layout

```
ft_transcendence/
├── Front-End/     # React/Vite client application
├── Backend/       # Go API, worker, exercise library, monitoring, RAG stack, and Compose files
└── Makefile       # Root orchestration entry point for the full local stack
```

### Getting Started

The repository is designed to be evaluated and demonstrated through the root `Makefile`.

**Step 1 — Create the local environment file:**

```bash
cp Backend/.env.example Backend/.env
```

**Step 2 — Fill in `Backend/.env` using `Backend/.env.example` as a reference:**

All keys and their example values are shown below. Copy the file and update any value that needs to match your local setup:

```env
# --- Core ---
JWT_SECRET=replace-with-a-long-random-secret
APP_ENV=development
GORM_LOG_LEVEL=warn

# --- LLM / AI ---
LLM_MODEL=google/gemini-3.1-flash-lite-preview
OPENROUTER_API_KEY=replace-with-your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-3-flash-preview
OPENROUTER_MAX_TOKENS=512
OPENAI_API_KEY=sk-proj-
HF_TOKEN=

# --- TLS ---
TLS_SELF_SIGNED_HOSTS=localhost,127.0.0.1,app,fitness-app
# Optional: provide real certs instead of the generated self-signed pair
# TLS_CERT_FILE=/run/secrets/fitness_api_cert.pem
# TLS_KEY_FILE=/run/secrets/fitness_api_key.pem

# --- Admin ---
PGADMIN_DEFAULT_PASSWORD=change-me

# --- Worker intervals ---
WORKER_EXPORT_POLL_INTERVAL=15s
WORKER_ADMIN_REFRESH_INTERVAL=1h
WORKER_NOTIFICATION_POLL_INTERVAL=1h

# --- Host ports (full stack and standalone compose) ---
API_HOST_PORT=8082
EXERCISE_LIB_HOST_PORT=8000
FRONTEND_HOST_PORT=5173
COACH_UI_HOST_PORT=8503
GRAFANA_HOST_PORT=3000
PROMETHEUS_HOST_PORT=9090
PGADMIN_HOST_PORT=8081
POSTGRES_HOST_PORT=5433
WORKER_METRICS_HOST_PORT=9091

# --- CPU / threading ---
APP_CPUS=2.0
EMBEDDING_THREADS=8
EMBEDDING_PARALLEL=4
EMBEDDING_BATCH_SIZE=64
OMP_NUM_THREADS=4
OPENBLAS_NUM_THREADS=4
MKL_NUM_THREADS=4
NUMEXPR_NUM_THREADS=4

# --- RAG / Qdrant ---
RAG_API_URL=http://localhost:8088
RAG_API_PORT=8088
RAG_UI_PORT=8502
RAG_QDRANT_PORT=6334
RAG_API_CPUS=1.5
RAG_INGEST_CPUS=2.0
RAG_QDRANT_CPUS=2.0
RAG_UI_CPUS=0.5
RAG_CPU_THREADS=2
QDRANT_COLLECTION=books
RAG_QUERY_MODE=default
RAG_SIMILARITY_TOP_K=8
RAG_CHUNK_SIZE=512
RAG_CHUNK_OVERLAP=64
RAG_EMBED_DIMENSION=1536
RAG_EMBED_BATCH_SIZE=64
QDRANT_HNSW_M=32
QDRANT_HNSW_EF_CONSTRUCT=200
QDRANT_MAX_INDEXING_THREADS=2
QDRANT_MAX_SEARCH_THREADS=2
QDRANT_MAX_OPTIMIZATION_THREADS=1
QDRANT_OPTIMIZER_CPU_BUDGET=1

# --- Frontend runtime ---
FRONTEND_PUBLIC_API_URL=/api
FRONTEND_PUBLIC_EXERCISE_IMAGE_BASE_URL=/exercise-lib
FRONTEND_PUBLIC_ADMIN_REALTIME_WS_AUTH_MODE=query
```

**Step 3 — Start the complete stack:**

```bash
make run
```

This single command builds and starts all services:

- PostgreSQL database
- Go API server and database migration job
- Seed job
- Background worker
- Exercise library service
- Frontend container
- Prometheus and Grafana
- AI coach UI
- Qdrant, RAG API, RAG UI, and the initial RAG ingest bootstrap

### Default Local Endpoints

| Service | URL |
|---|---|
| Frontend | `https://localhost:5173` |
| API | `https://localhost:8082` |
| Swagger UI | `https://localhost:8082/docs` |
| Exercise Library | `http://localhost:8000` |
| AI Coach UI | `http://localhost:8503` |
| RAG API | `http://localhost:8088` |
| RAG UI | `http://localhost:8502` |
| Qdrant | `http://localhost:6334` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |
| pgAdmin *(run `make admin` first)* | `http://localhost:8081` |

The frontend container now terminates TLS itself. By default it auto-generates a self-signed certificate on startup; to supply a custom local cert, place `frontend.crt` and `frontend.key` in `Front-End/docker/certs/`.

### Useful Commands

**Full stack management:**

```bash
make run       # Start all services
make down      # Stop all services
make restart   # Restart all services
make logs      # Tail logs from all services
make ps        # List running containers
make config    # Print the composed Docker config
```

**RAG operations:**

```bash
make rag-ingest     # Run the initial RAG ingest
make rag-reingest   # Clear and re-run the RAG ingest
make rag-shell      # Open a shell in the RAG container
```

**Testing:**

```bash
make test           # Run all tests
make test-frontend  # Run frontend tests only
```

**Optional split development (without Docker):**

```bash
npm --prefix Front-End install
npm --prefix Front-End run dev

cd Backend && go test ./...
cd Backend && GOCACHE=/tmp/go-cache go test -race ./...
```

### Environment Notes

- All services in the full stack read from `Backend/.env`.
- The API uses TLS locally and can generate a self-signed certificate using the `TLS_SELF_SIGNED_HOSTS` variable.
- Frontend runtime settings default to `/api`, `/exercise-lib`, and query-based WebSocket auth for admin real-time updates.
- The `.env` file is excluded from Git at the repository root; `Backend/.env.example` documents all required and optional keys.

---

## Team Information

| Login | Name | Role(s) |
|---|---|---|
| `ebelkadi` | El Mahdi Belkadi | Product Owner · Project Manager · Frontend Developer · UI/UX Lead |
| `msennane` | Mouad Sennane | Technical Lead · Backend Developer · DevOps |
| `sennakhl` | Soufiane Ennakhli | Backend Developer |
| `ysbai-jo` | Yassir Sbai Jouilil | Frontend Developer |

### El Mahdi Belkadi — `ebelkadi`

- **Role(s):** Product Owner, Project Manager, Frontend Developer, UI/UX Lead
- **Responsibilities:** Product vision, feature prioritization, coordination of frontend delivery, UX consistency, and evaluation/README alignment.

### Mouad Sennane — `msennane`

- **Role(s):** Technical Lead, Backend Developer, DevOps
- **Responsibilities:** Backend architecture, API design, infrastructure, container orchestration, monitoring, and AI/RAG integration decisions.

### Soufiane Ennakhli — `sennakhl`

- **Role(s):** Backend Developer
- **Responsibilities:** Service-layer implementation, business logic, data workflows, exports, and backend feature coverage.

### Yassir Sbai Jouilil — `ysbai-jo`

- **Role(s):** Frontend Developer
- **Responsibilities:** Screen implementation, integration of user/admin views, responsive UI delivery, and client-side feature polish.

---

## Project Management

### Work Organization

The team divided the work by product domain and synchronized during integration phases:

| Domain | Focus |
|---|---|
| Authentication & Onboarding | Shared app shell, sign-up/login, 2FA, onboarding flow |
| Workouts | Workout tracking, exercise library, programs |
| Nutrition & Progress | Meals, recipes, weight entries, nutrition history |
| Admin Tools | Moderation, dashboards, operational monitoring |
| AI & Automation | AI coach, RAG pipeline, background jobs |

### Coordination Approach

- Short planning discussions before each feature batch
- Regular integration passes when API contracts or route shapes changed
- Shared review of critical technical decisions (auth, monitoring, deployment)
- End-to-end testing during merge periods to catch frontend/backend drift

### Tools Used

| Tool | Purpose |
|---|---|
| Git and feature branches | Version control and team collaboration |
| OpenAPI / Swagger UI | API contract visibility during development |
| Postman collection files | Manual endpoint verification |
| DeepWiki & internal README files | Architecture documentation |
| Graphify outputs | Repository structure and dependency review |

### Communication Channels

- Direct team discussions
- Repository review feedback and pull request comments
- Shared planning notes stored in the repository

---

## Technical Stack

### Frontend Technologies

| Technology | Role |
|---|---|
| React 19 | UI framework |
| Vite | Build tool and dev server |
| React Router v7 | Client-side routing |
| TanStack Query | Server state and data-fetching cache |
| Zustand | Global client/auth state |
| Axios | HTTP client |
| Vitest | Unit test runner |
| React Testing Library | Component testing |
| MSW | API mocking for tests |
| Custom CSS design system | Component-level responsive styling |

### Backend Technologies

| Technology | Role |
|---|---|
| Go 1.25+ | Primary backend language |
| `net/http` + `http.ServeMux` | HTTP routing and middleware (no web framework) |
| GORM | ORM and database migrations |
| GORM PostgreSQL driver | Database connectivity |
| Gorilla WebSocket | Real-time WebSocket connections |
| Prometheus Go client | Metrics collection |

### Database System and Why It Was Chosen

The application uses **PostgreSQL** because the domain is strongly relational. Users, sessions, workouts, exercises, meals, recipes, notifications, exports, program assignments, and admin records all depend on well-defined foreign key relationships and transactional consistency. PostgreSQL provides the reliability and query power needed for this type of data model.

### Other Significant Technologies

| Technology | Role |
|---|---|
| Docker & Docker Compose | Local deployment and container orchestration |
| Prometheus & Grafana | Observability — metrics collection and dashboards |
| Qdrant | Vector storage for the RAG knowledge pipeline |
| Python exercise library service | Searchable exercise metadata and image access |
| OpenRouter (LLM integration) | Powers the AI fitness coach |
| OpenAPI / Swagger | Interactive API documentation |

### Major Technical Choices and Justification

#### React + Vite
Chosen for fast iteration, route-level code splitting, and a straightforward SPA workflow that supports both the user-facing app and the admin panel from a single codebase.

#### TanStack Query + Zustand
Chosen to separate remote server state from local UI and auth state. This keeps cache-heavy API work out of the global UI store, reducing complexity and improving performance.

#### Go + `net/http`
Chosen for explicit control over routing, middleware, and performance-sensitive backend logic without the overhead or opinions of a larger web framework.

#### PostgreSQL + GORM
Chosen to move quickly on relational modeling, migrations, and test coverage while keeping the schema maintainable and easy to inspect.

#### WebSockets for Admin Real-Time Metrics
Chosen to push live operational metrics to the admin dashboard without relying on constant polling, which would be wasteful and introduce latency.

#### RAG + Qdrant
Chosen to let the product answer book-backed knowledge questions (via the RAG pipeline) independently of the user-specific conversational AI coach flow, keeping both subsystems clean and separately controllable.

---

## Database Schema

### Structure Overview

The schema is centered around the `users` table and organized into five main groups:

| Group | Tables |
|---|---|
| Identity & Security | `users`, `user_sessions`, `refresh_tokens`, `two_factor_secrets`, `recovery_codes`, `deletion_requests` |
| Workout Domain | `workouts`, `workout_exercises`, `workout_sets`, `workout_cardio_entries`, `workout_templates`, `workout_template_exercises`, `workout_programs`, `program_weeks`, `program_sessions`, `program_assignments` |
| Nutrition Domain | `foods`, `nutrients`, `meals`, `meal_foods`, `recipes`, `recipe_items`, `favorite_foods`, `weight_entries` |
| AI & Engagement | `conversations`, `conversation_messages`, `notifications`, `export_jobs` |
| Admin & Auditing | `audit_logs`, `food_import_logs`, leaderboard and points-related records |

### Core Relationships

- A **user** owns many sessions, workouts, meals, weight entries, notifications, conversations, export jobs, and program assignments.
- A **workout** contains many workout exercises and cardio entries.
- A **workout exercise** contains many workout sets.
- A **meal** contains many meal–food join records.
- A **recipe** contains many recipe items linked to foods.
- A **workout program** contains many weeks, and each week contains many sessions.
- A **program assignment** links a program to a specific user and tracks its lifecycle status.
- A **conversation** belongs to a user and contains ordered conversation messages.

### Key Tables and Fields

#### `users`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | string | Unique |
| `password_hash` | string | Bcrypt-hashed password |
| `name` | string | Display name |
| `role` | string | `user` or `admin` |
| `goal`, `activity_level`, `weight`, `height`, `tdee` | mixed | Onboarding and profile fields |

#### `user_sessions`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users` |
| `user_agent` | string | Client identifier |
| `last_ip` | string | Last known IP address |
| `expires_at` | timestamp | Session expiry |

#### `workouts`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users` |
| `name` | string | Workout name |
| `type` | string | Workout type |
| `notes` | text | Optional notes |
| `started_at`, `completed_at` | timestamps | Session timing |

#### `meals`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users` |
| `meal_type` | string | e.g., breakfast, lunch |
| `date` | timestamp | Meal date |
| `notes` | text | Optional notes |
| `total_calories`, `total_protein`, `total_carbs`, `total_fat` | numeric | Aggregated macros |

#### `notifications`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users` |
| `type` | string | Notification category |
| `title` | string | Short title |
| `message` | text | Full message body |
| `read_at` | timestamp | Nullable; null means unread |

#### `export_jobs`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users` |
| `format` | string | `json` or `csv` |
| `status` | string | `pending`, `processing`, `completed`, or `failed` |
| `file_path` | string | Path to the generated artifact |

#### `conversations` and `conversation_messages`

| Field | Type | Notes |
|---|---|---|
| `conversation.id` | UUID | Primary key |
| `conversation.user_id` | UUID | Foreign key → `users` |
| `conversation_messages.role` | string | `user`, `assistant`, `system`, or `tool` |
| `conversation_messages.sequence` | integer | Ordered message position |
| `conversation_messages.content` | text | Message content |

---

## Features List

### Authentication and Secure Sessions

- **Worked on by:** `msennane`, `sennakhl`, `ebelkadi`
- **Functionality:** Email/password sign-up and login, bcrypt-hashed passwords, refresh token rotation, active session listing and revocation, logout, and full 2FA setup, challenge, and recovery flow.

### Onboarding and Personalized Targets

- **Worked on by:** `ebelkadi`, `ysbai-jo`
- **Functionality:** A 3-step onboarding wizard collecting personal data, fitness goals, and activity level, followed by automatic nutrition target calculation (TDEE).

### User Dashboard and Activity Analytics

- **Worked on by:** `ebelkadi`, `ysbai-jo`, `msennane`
- **Functionality:** Daily and weekly summaries, personalized recommendations, streaks, personal records, an activity calendar, and leaderboard-oriented progress signals.

### Workout Tracking and Programs

- **Worked on by:** `ebelkadi`, `ysbai-jo`, `msennane`, `sennakhl`
- **Functionality:** Workout creation, exercise and set logging, cardio entries, workout history, reusable templates, long-term programs, and per-session program application.

### Exercise Library

- **Worked on by:** `ebelkadi`, `ysbai-jo`, `msennane`
- **Functionality:** Searchable exercise catalog, metadata lookup, image proxying, library history, and program generation support.

### Nutrition and Progress Tracking

- **Worked on by:** `ebelkadi`, `ysbai-jo`, `msennane`, `sennakhl`
- **Functionality:** Food search, meal logging, recipes, favorite foods, nutrition history, weight entries, and target-aware nutrition workflows.

### AI Coach and Knowledge Retrieval

- **Worked on by:** `msennane`, `sennakhl`, `ebelkadi`
- **Functionality:** Conversational AI coach with persistent history, user feedback handling, coach summary generation, and a separate RAG-backed book query API for fitness knowledge questions.

### Notifications, Export, and Account Privacy Tools

- **Worked on by:** `msennane`, `sennakhl`, `ebelkadi`
- **Functionality:** Unread notification counts, mark-as-read flows, automated reminders, data export job requests, export file downloads, Privacy Policy page, Terms of Service page, and account deletion requests.

### Admin Dashboard and User Moderation

- **Worked on by:** `msennane`, `ebelkadi`, `ysbai-jo`
- **Functionality:** Dashboard summary and trend views, real-time WebSocket metrics, system health checks, audit log visibility, full user CRUD, role-based access control, ban/unban actions, and account deletion controls.

### Admin Content and Program Management

- **Worked on by:** `ebelkadi`, `msennane`, `sennakhl`, `ysbai-jo`
- **Functionality:** Exercise CRUD, USDA food import and nutrition management, workout program CRUD, week and session authoring, and user-to-program assignment management.

---

## Modules

### Chosen Modules and Point Calculation

| Module | Type | Points | Team Member(s) | Why It Was Chosen | How It Was Implemented |
|---|---|---:|---|---|---|
| Frontend + Backend Frameworks | Major | 2 | `ebelkadi`, `ysbai-jo`, `msennane`, `sennakhl` | The project needs a full user-facing platform with both a user app and an admin layer | React/Vite frontend + Go backend |
| Database + ORM | Major | 2 | `msennane`, `sennakhl` | The domain is relational and data-heavy, requiring structured queries and migrations | PostgreSQL + GORM models and migrations |
| REST API Design | Major | 2 | `msennane`, `sennakhl` | The frontend and admin panels depend on a stable, versioned service contract | `/v1/...` route family covering auth, workouts, nutrition, admin, and AI |
| Authentication & Security | Major | 2 | `msennane`, `sennakhl`, `ebelkadi` | The project stores private health-related user data that must be protected | JWT access/refresh flow, protected routes, bcrypt passwords, 2FA, and middleware |
| Internationalization | Major | 2 | `ebelkadi`, `ysbai-jo` | The platform targets multilingual users and requires full Arabic RTL support | English, French, and Arabic message catalogs with RTL layout switching |
| Responsive Frontend | Major | 2 | `ebelkadi`, `ysbai-jo` | The primary product target is mobile-first use | Custom CSS design system with mobile layouts and adaptive admin/user screens |
| WebSocket Real-Time | Major | 2 | `msennane`, `ebelkadi` | Admin metrics need live updates without relying on polling | `GET /v1/admin/dashboard/realtime` endpoint + frontend WebSocket hook |
| Monitoring | Major | 2 | `msennane` | The backend stack needs observability for performance and reliability | Prometheus metrics middleware + Grafana dashboards |
| Data Export | Major | 2 | `msennane`, `sennakhl`, `ebelkadi` | Users should be able to retrieve and own their personal data | Async export job endpoints + frontend export download flow |
| Notifications | Major | 2 | `msennane`, `sennakhl`, `ebelkadi` | Engagement and automated reminders are part of the core product loop | Notification service, read/unread endpoints, and frontend notification center |
| AI Integration | Major | 2 | `msennane`, `sennakhl`, `ebelkadi` | Coaching and fitness Q&A are central differentiators of the platform | `/v1/chat` endpoints, conversation history, feedback handling, coach summaries, and RAG pipeline |
| Testing | Minor | 1 | all | Validation is needed across both frontend and backend changes | Go unit tests, Vitest, React Testing Library, and MSW for API mocking |

### Total Points

| Category | Calculation | Points |
|---|---|---:|
| Major modules | 11 × 2 | 22 |
| Minor modules | 1 × 1 | 1 |
| **Total** | | **23** |

---

## Individual Contributions

### El Mahdi Belkadi — `ebelkadi`

- Led product direction and feature prioritization throughout the project.
- Coordinated frontend UX consistency across authentication, user, and admin surfaces.
- Contributed heavily to onboarding, dashboards, workout tracking, nutrition, and documentation quality.
- Helped align backend API contracts with frontend behavior during integration.

**Challenges:** Balancing product scope with integration stability while keeping the interface coherent across many screens and rapidly evolving backend contracts.

### Mouad Sennane — `msennane`

- Led backend architecture and infrastructure decisions. And making the AI features a real thing in the app.
- Implemented the core auth/session system, monitoring stack, admin real-time behavior, and AI/RAG integration plumbing.
- Dev-ops and Service monitoring ownership, including Docker orchestration, Prometheus metrics, and Grafana dashboards.
- Owned the single-command Docker-based stack used for local deployment and evaluation.

**Challenges:** Keeping a large API surface consistent while simultaneously managing observability tooling, background jobs, and multiple auxiliary services (RAG, exercise library, Qdrant).

### Soufiane Ennakhli — `sennakhl`

- Implemented and stabilized backend business logic across nutrition, data exports, workout programs, and AI-related flows.
- Contributed to route coverage, service-layer behavior, and data-processing logic.
- Helped extend test coverage on important backend paths.

**Challenges:** Coordinating changes across tightly related models and services without breaking existing API behavior or downstream frontend expectations.

### Yassir Sbai Jouilil — `ysbai-jo`

- Implemented and refined frontend screens across user and admin sections.
- Converted product flows into working, responsive UI components.
- Supported integration work for workout tracking, nutrition logging, and admin management views.

**Challenges:** Adapting fast-moving UI work to evolving backend contracts and shifting feature priorities while maintaining visual consistency.

---

## Resources

### Technical References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Go Documentation](https://go.dev/doc/)
- [GORM Documentation](https://gorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Gorilla WebSocket Documentation](https://pkg.go.dev/github.com/gorilla/websocket)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [DeepWiki Project Documentation](https://deepwiki.com/mouadse/ft_transcendence)

### How AI Was Used

AI was used as a support tool throughout the project, not as a substitute for implementation ownership. Specifically, it was used for:

- Exploring architecture options and comparing implementation approaches
- Debugging support and refactoring suggestions
- Wording and phrasing support for documentation and UI copy
- Review assistance on specific flows and edge-case handling in tests
- Organizing repository knowledge into clearer, more structured documentation

All AI-assisted output was reviewed, adapted, and tested against the real codebase by the team before being committed.

### Internal References

- [`Backend/README.md`](Backend/README.md)
- [`Front-End/README.md`](Front-End/README.md)
- [`Backend/api/openapi.yaml`](Backend/api/openapi.yaml)
- [`Backend/postman/`](Backend/postman/)

---

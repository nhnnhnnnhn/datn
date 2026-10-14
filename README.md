# datn

A learning platform for Vietnamese idioms, built on the VIVID dataset. It combines a web backend with AI modules for automatic answer grading and quiz/flashcard generation.

## Project Structure

```
├── backend/     # FastAPI application
├── ai/          # AI modules and research experiments
├── data/        # Dataset management
├── scripts/     # Utility scripts
├── docs/        # Project documentation
└── docker-compose.yml
```

### `backend/`
The web API serving the application. It is organized into layers: API routes, business logic services, database models, request/response schemas, and core configuration. Also contains database migrations, tests, and its Dockerfile.

### `ai/`
The AI side of the project. It includes the grading module (evaluating learner answers and producing feedback), the generation module (creating quizzes and flashcards), prompt templates, a shared LLM client, and experiments for evaluating these components.

### `data/`
Holds the datasets at different stages: raw VIVID data, processed idioms, human annotations, and train/dev/test splits.

### `scripts/`
Standalone scripts for preparing data, importing the dataset, generating questions, and seeding the database.

### `docs/`
Documentation covering the system architecture, database design, API, and experiments.

## Getting Started

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

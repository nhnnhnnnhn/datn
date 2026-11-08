# Build context is the repository root, so the image also gets the shared ai/ package
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY ai/ ./ai/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

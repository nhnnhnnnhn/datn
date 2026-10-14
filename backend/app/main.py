from fastapi import FastAPI

app = FastAPI(title="Vietnamese Idiom Learning API")


@app.get("/health")
def health():
    return {"status": "ok"}

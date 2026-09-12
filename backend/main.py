from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import CoreEngineRequest, CoreEngineResponse
from backend.unloop.policy import apply_policy
from backend.unloop.provider import ProviderError, generate_response

app = FastAPI(
    title="Unloop API",
    version="0.1.0",
)


# Allow the local frontend to communicate with the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "unloop",
    }


@app.post("/turn", response_model=CoreEngineResponse)
def turn(request: CoreEngineRequest) -> CoreEngineResponse:
    try:
        raw_response = generate_response(request)
    except ProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail="AI provider failed to return a valid response.",
        ) from exc

    return apply_policy(raw_response)
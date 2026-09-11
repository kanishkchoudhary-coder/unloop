from fastapi import FastAPI, HTTPException

from backend.schemas import CoreEngineRequest, CoreEngineResponse
from backend.unloop.policy import apply_policy
from backend.unloop.provider import ProviderError, generate_response

app = FastAPI(
    title="Unloop API",
    version="0.1.0",
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
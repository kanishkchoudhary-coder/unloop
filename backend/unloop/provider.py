import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from pydantic import ValidationError

from backend.schemas import CoreEngineRequest, CoreEngineResponse
from backend.unloop.prompt import SYSTEM_PROMPT

load_dotenv()


MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
REQUEST_TIMEOUT_SECONDS = 45.0


class ProviderError(RuntimeError):
    """Raised when the AI provider cannot return a valid Unloop response."""


def _get_credentials() -> tuple[str, str]:
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")

    if not account_id:
        raise ProviderError("CLOUDFLARE_ACCOUNT_ID is not configured.")

    if not api_token:
        raise ProviderError("CLOUDFLARE_API_TOKEN is not configured.")

    return account_id, api_token


def _build_messages(request: CoreEngineRequest) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    if request.rolling_summary:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Rolling summary of the conversation so far:\n"
                    f"{request.rolling_summary}"
                ),
            }
        )

    for turn in request.recent_turns:
        messages.append(
            {
                "role": turn.role,
                "content": turn.content,
            }
        )

    messages.append(
        {
            "role": "user",
            "content": request.message,
        }
    )

    return messages


def _extract_model_response(data: dict[str, Any]) -> Any:
    if not data.get("success"):
        raise ProviderError(
            f"Cloudflare returned an unsuccessful response: "
            f"{data.get('errors', [])}"
        )

    result = data.get("result")

    if not isinstance(result, dict):
        raise ProviderError("Cloudflare response is missing a valid result object.")

    raw_response = result.get("response")

    if raw_response is None:
        raise ProviderError("Cloudflare response is missing model output.")

    if isinstance(raw_response, str):
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError as exc:
            raise ProviderError(
                "Model returned text that was not valid JSON."
            ) from exc

    return raw_response


def generate_response(request: CoreEngineRequest) -> CoreEngineResponse:
    """
    Send a CoreEngineRequest to Cloudflare Workers AI and return
    validated structured model output.

    Deterministic Unloop policy rules are applied separately.
    """

    account_id, api_token = _get_credentials()

    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/ai/run/{MODEL}"
    )

    payload = {
        "messages": _build_messages(request),
        "response_format": {
            "type": "json_schema",
            "json_schema": CoreEngineResponse.model_json_schema(),
        },
        "temperature": 0.2,
        "max_tokens": 800,
    }

    try:
        response = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except httpx.RequestError as exc:
        raise ProviderError(
            f"Could not reach Cloudflare Workers AI: {exc}"
        ) from exc

    if response.status_code != 200:
        raise ProviderError(
            f"Cloudflare request failed with HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise ProviderError(
            "Cloudflare returned a response that was not valid JSON."
        ) from exc

    model_output = _extract_model_response(data)

    try:
        return CoreEngineResponse.model_validate(model_output)
    except ValidationError as exc:
        raise ProviderError(
            f"Model output failed Unloop schema validation: {exc}"
        ) from exc

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )


SchemaVersion = Literal["0.1"]

Role = Literal[
    "user",
    "assistant",
]

Strategy = Literal[
    "listen",
    "clarify",
    "perspective",
    "accountability",
    "uncertainty",
    "action",
    "practice",
    "close_loop",
    "human_support",
    "safety",
]

SafetyRoute = Literal[
    "normal",
    "boundary",
    "human_support",
    "urgent_support",
]


class ConversationTurn(StrictModel):
    role: Role
    content: str = Field(min_length=1)


class CoreEngineRequest(StrictModel):
    message: str = Field(min_length=1)
    rolling_summary: str = ""

    recent_turns: list[ConversationTurn] = Field(
        default_factory=list,
        max_length=4,
    )


class RealityMirror(StrictModel):
    reported: str = ""
    interpretation: str = ""
    unknown: str = ""


class CoreEngineResponse(StrictModel):
    schema_version: SchemaVersion

    reply: str = Field(min_length=1)

    strategy: Strategy

    mirror: RealityMirror
    mirror_ready: bool

    repetition_detected: bool
    seeking_certainty: bool
    new_information: bool

    close_ready: bool

    safety_route: SafetyRoute

    rolling_summary: str

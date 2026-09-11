from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    reported: str = Field(
        default="",
        description=(
            "A complete, concise statement of what the user directly reported "
            "happened, was said, observed, or experienced. Never end mid-thought."
        ),
    )

    interpretation: str = Field(
        default="",
        description=(
            "A complete, concise statement of the inference, assumption, "
            "generalization, prediction, or meaning the user may be drawing "
            "from the reported facts. Never truncate or end mid-thought."
        ),
    )

    unknown: str = Field(
        default="",
        description=(
            "A complete, concise statement of what cannot currently be known "
            "from the available evidence. Never truncate or end mid-thought."
        ),
    )


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

    @model_validator(mode="after")
    def validate_ready_mirror(self) -> "CoreEngineResponse":
        if not self.mirror_ready:
            return self

        mirror_fields = {
            "reported": self.mirror.reported,
            "interpretation": self.mirror.interpretation,
            "unknown": self.mirror.unknown,
        }

        for field_name, value in mirror_fields.items():
            if not value:
                raise ValueError(
                    f"mirror.{field_name} cannot be empty when "
                    "mirror_ready is true."
                )

            if not value.endswith((".", "!", "?")):
                raise ValueError(
                    f"mirror.{field_name} must end with sentence "
                    "punctuation when mirror_ready is true."
                )

        return self

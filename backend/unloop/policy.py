from backend.schemas import CoreEngineResponse

CLOSE_LOOP_REPLY = (
    "We've come back to the same underlying question, but there doesn't "
    "seem to be new information that could give us more certainty. "
    "Repeating reassurance is unlikely to resolve that uncertainty. "
    "It may be more useful to focus on what you actually know, decide "
    "whether there is anything useful to do, or leave this unanswered for now."
)

BOUNDARY_REPLY = (
    "I can't help with bypassing someone's boundaries, pressuring them, "
    "or continuing after a clear refusal. We can instead look at how to "
    "handle the situation respectfully or deal with the feelings around it."
)

HUMAN_SUPPORT_REPLY = (
    "This sounds like something where support from a real person may be "
    "more useful than continuing only with AI. If possible, consider reaching "
    "out to someone you trust or an appropriate qualified support resource."
)

URGENT_SUPPORT_REPLY = (
    "This may involve immediate or serious safety concerns, so ordinary "
    "Unloop reflection should stop here. Please seek immediate help from "
    "a trusted person or appropriate local emergency or professional support."
)


def apply_policy(response: CoreEngineResponse) -> CoreEngineResponse:
    """
    Apply deterministic Unloop policy rules to model output.

    Higher-priority safety and boundary rules override ordinary
    conversational behavior.
    """

    if response.safety_route == "urgent_support":
        return response.model_copy(
            update={
                "strategy": "safety",
                "reply": URGENT_SUPPORT_REPLY,
            }
        )

    if response.safety_route == "boundary":
        return response.model_copy(
            update={
                "strategy": "safety",
                "reply": BOUNDARY_REPLY,
            }
        )

    if response.safety_route == "human_support":
        return response.model_copy(
            update={
                "strategy": "human_support",
                "reply": HUMAN_SUPPORT_REPLY,
            }
        )

    if (
        response.repetition_detected
        and response.seeking_certainty
        and not response.new_information
    ):
        return response.model_copy(
            update={
                "strategy": "close_loop",
                "close_ready": True,
                "reply": CLOSE_LOOP_REPLY,
            }
        )

    return response
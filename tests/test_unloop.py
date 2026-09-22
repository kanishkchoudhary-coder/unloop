import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.schemas import (
    ConversationTurn,
    CoreEngineRequest,
)
from backend.unloop.policy import apply_policy
from backend.unloop.provider import ProviderError, generate_response

SCENARIOS_PATH = Path(__file__).with_name("scenarios.json")


def load_scenarios() -> list[dict]:
    with SCENARIOS_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_request(scenario: dict) -> CoreEngineRequest:
    recent_turns = [
        ConversationTurn(**turn)
        for turn in scenario.get("recent_turns", [])
    ]

    return CoreEngineRequest(
        message=scenario["message"],
        rolling_summary=scenario.get("rolling_summary", ""),
        recent_turns=recent_turns,
    )


def check_expected_value(
    failures: list[str],
    field_name: str,
    actual,
    expected,
) -> None:
    if actual != expected:
        failures.append(
            f"{field_name}: expected {expected!r}, got {actual!r}"
        )


def evaluate_scenario(
    scenario: dict,
    raw_response,
    final_response,
) -> list[str]:
    failures: list[str] = []
    expected = scenario["expected"]

    if "strategy" in expected:
        check_expected_value(
            failures,
            "strategy",
            raw_response.strategy,
            expected["strategy"],
        )

    if "strategy_any_of" in expected:
        allowed = expected["strategy_any_of"]

        if raw_response.strategy not in allowed:
            failures.append(
                "strategy: expected one of "
                f"{allowed!r}, got {raw_response.strategy!r}"
            )

    if "safety_route" in expected:
        check_expected_value(
            failures,
            "safety_route",
            raw_response.safety_route,
            expected["safety_route"],
        )

    for field_name in (
        "repetition_detected",
        "seeking_certainty",
        "new_information",
        "close_ready",
    ):
        if field_name in expected:
            check_expected_value(
                failures,
                field_name,
                getattr(raw_response, field_name),
                expected[field_name],
            )

    if "mirror_should_identify" in expected:
        if not raw_response.mirror_ready:
            failures.append(
                "mirror_ready: expected true because this scenario "
                "requires a Reality Mirror"
            )

        if not raw_response.mirror.reported:
            failures.append("mirror.reported is empty")

        if not raw_response.mirror.interpretation:
            failures.append("mirror.interpretation is empty")

        if not raw_response.mirror.unknown:
            failures.append("mirror.unknown is empty")

    if expected.get("must_not_blindly_reassure"):  # noqa: SIM102
        if raw_response.strategy != "accountability":
            failures.append(
                "accountability safeguard failed: model did not choose "
                "'accountability'"
            )

    if (
        raw_response.repetition_detected
        and raw_response.seeking_certainty
        and not raw_response.new_information
        and raw_response.safety_route == "normal"
    ):
        if final_response.strategy != "close_loop":
            failures.append(
                "policy override failed: reassurance loop did not become "
                "'close_loop'"
            )

        if not final_response.close_ready:
            failures.append(
                "policy override failed: close_ready was not set to true"
            )

    return failures


def print_mirror(response) -> None:
    print("  Reality Mirror:")
    print(f"    Reported:       {response.mirror.reported}")
    print(f"    Interpretation: {response.mirror.interpretation}")
    print(f"    Unknown:        {response.mirror.unknown}")


def main() -> None:
    scenarios = load_scenarios()

    total = len(scenarios)
    passed = 0

    print(f"Running {total} Unloop Core Engine scenarios...\n")

    for index, scenario in enumerate(scenarios, start=1):
        print("=" * 72)
        print(
            f"[{index}/{total}] "
            f"{scenario['id']} — {scenario['title']}"
        )

        request = build_request(scenario)

        try:
            raw_response = generate_response(request)
        except ProviderError as exc:
            print("FAIL")
            print(f"  Provider error: {exc}")
            print()
            continue

        final_response = apply_policy(raw_response)

        failures = evaluate_scenario(
            scenario,
            raw_response,
            final_response,
        )

        print(f"  Raw strategy:   {raw_response.strategy}")
        print(f"  Final strategy: {final_response.strategy}")
        print(f"  Safety route:   {raw_response.safety_route}")

        print(
            "  State: "
            f"repetition={raw_response.repetition_detected}, "
            f"certainty={raw_response.seeking_certainty}, "
            f"new_info={raw_response.new_information}, "
            f"close_ready={raw_response.close_ready}"
        )

        print_mirror(raw_response)

        print(f"  Raw reply:   {raw_response.reply}")
        print(f"  Final reply: {final_response.reply}")

        if failures:
            print("\n  RESULT: FAIL")

            for failure in failures:
                print(f"    - {failure}")
        else:
            passed += 1
            print("\n  RESULT: PASS")

        print()

    print("=" * 72)
    print(f"RESULT: {passed}/{total} scenarios passed")

    if passed != total:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
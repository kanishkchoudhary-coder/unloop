# Unloop

### From overthinking to agency.

Unloop is an AI-assisted conversational system that helps people move from repetitive uncertainty toward clearer perspective, useful action, or closure — instead of just producing another reassuring reply.

> **Not every thought needs another answer. Sometimes it needs a better perspective — or a reason to stop searching for certainty.**

Built by a 2-member team for **CODE FLUX 2026** at LPU.

---

## The Problem

> *"My professor said my explanation was unclear. Maybe I'm just bad at programming."*

The event was specific — *my explanation was unclear*. The interpretation isn't:

```text
My explanation was unclear
        ↓
I'm bad at programming
        ↓
Maybe I'm not capable
        ↓
Maybe I shouldn't be doing this
```

Most chatbots respond to whichever layer the user happens to type. Unloop tries to tell the layers apart — what actually happened, what it's being taken to mean, and what still isn't known — before deciding how to respond.

---

## What Unloop Does

**Understand.** The user talks naturally; Unloop reads the conversation and recent context rather than requiring a structured questionnaire.

**Reality Mirror.** Splits the situation into three layers — **Reported** (what happened), **Interpretation** (what the user thinks it means), and **Unknown** (what the available information can't actually establish). The Mirror is shown as *Unloop's current understanding*, not objective truth — the user can correct it.

**Conversation state.** Tracks structured signals across turns — `repetition_detected`, `seeking_certainty`, `new_information` — so the system reasons about how a conversation is progressing, not just the latest message in isolation.

**Strategy selection.** Depending on that state, Unloop moves between conversational modes: `listen`, `clarify`, `perspective`, `accountability`, `uncertainty`, `action`, `practice`, `close_loop`, `human_support`, `safety`.

**Close the Loop.** When the same uncertainty keeps returning with no new information, Unloop shifts away from repeating reassurance. Not *"stop talking"* — more *"we've reached the point where another identical answer won't add anything."* It surfaces what seems clear, what's still unknown, and what might actually be useful to do next.

---

## How It Works

A typical chatbot is `User → LLM → Answer`. Unloop inserts a policy layer between the model and the reply:

```text
User → Conversation Context → LLM → Structured State
     → Pydantic Validation → Unloop Policy Engine → Strategy → Response
```

Example: `repetition_detected = true`, `seeking_certainty = true`, `new_information = false` → policy engine → `close_loop`.

**The model provides language intelligence; Unloop controls conversational behavior.** The LLM interprets what's happening, but the application — not the model's raw output — decides how to respond. That distinction is the core engineering idea behind the project: a foundation model doesn't have to be the thing making the final decision.

### Architecture

```text
     USER
       │
       ▼
  Frontend (HTML / CSS / JS)
       │  POST /turn
       ▼
  FastAPI Backend
       │
       ▼
  Unloop Core Engine
       │
   ┌───┴────────────────┐
   ▼                    ▼
Cloudflare Workers AI   Policy / Safety
   │                    │
   └───────┬────────────┘
           ▼
   Structured Response → Pydantic Validation
           │
           ▼
   Frontend State Update → Reality Mirror + Close Loop
```

---

## Design Philosophy

Unloop is built to avoid the failure mode of pure-reassurance chatbots: agreeing with whatever conclusion the user has already drawn. It's designed to separate:

- the user drawing too broad a conclusion,
- the user having genuinely made a mistake,
- someone else having genuinely treated the user badly,
- there not being enough information to know, and
- there being something concrete to do next.

**Validate the emotion without automatically validating the conclusion.** If someone says *"I hurt my friend and I want you to tell me I did nothing wrong,"* Unloop can acknowledge how that feels without rubber-stamping the conclusion — leaning into an accountability-oriented response instead. Likewise, a clear interpersonal rejection is treated as a boundary to respect, not a puzzle to solve.

This same philosophy drives **reassurance-loop detection**: `repetition_detected + seeking_certainty + no new information → change strategy → potentially close the loop`. This isn't a diagnosis — it's a conversational signal the policy engine uses to distinguish productive reflection from repetitive certainty-seeking, rather than treating all repeated thinking as a problem.

---

## Safety & Privacy

Safety routing (`normal → boundary → human_support → urgent_support`) takes priority over ordinary conversational strategy at every turn.

The prototype is explicitly scoped: **18+**, **not therapy**, **not diagnosis**, **not emergency care**, **not clinically validated**. It's an experimental software project, not a substitute for professional or emergency support.

On privacy: the current build keeps active conversation state in the browser (`sessionStorage` — recent turns and rolling summary) rather than silently building a permanent server-side history. The longer-term direction is **user-controlled memory** — explicit opt-in, with remember/edit/delete/export as first-class actions — not collecting everything by default just because it's possible.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| AI | Cloudflare Workers AI |
| Communication | REST / JSON |
| Session state | Browser `sessionStorage` |
| Version control | Git + GitHub |

---

## Features & Testing

- Natural conversational interface with loading, error, and retry states
- Reality Mirror (Reported / Interpretation / Unknown), with user correction support
- Full conversation-policy engine (10 strategies) driven by structured, Pydantic-validated state
- Reassurance-loop detection and Close Loop
- Rolling context + recent-turn tracking across a session
- Dedicated safety routing, prioritized above normal conversation flow

Tested against core behavioral scenarios — overgeneralized interpretation → perspective response; repeated certainty-seeking with no new information → close-loop behavior; user in the wrong → accountability rather than blind validation; and re-engagement after closure → action-oriented response once real intent returns. The initial scenario suite passed **3/3** during development.

---

## Limitations

Unloop is still a prototype:

- conversational-state extraction is partly model-assisted, so it inherits some of the model's uncertainty
- broader reliability and adversarial/edge-case testing is still needed
- safety behavior needs deeper, ideally expert, evaluation
- not clinically validated; 18+ is self-attested, not verified
- production-grade privacy/security review is still outstanding
- no persistent long-term memory yet

---

## Roadmap

**v1.1 — Reliability:** broader scenario evaluation, adversarial testing, better correction handling, deployment hardening.

**v2 — User-controlled memory:** explicit opt-in, edit/delete/export, longer-term continuity.

**v3 — Real-world agency:** social-confidence practice, experience tracking, stronger action planning and personalization.

**Longer term:** larger evaluation datasets, expert-reviewed safety systems, stronger privacy/security controls, and a provider-independent model architecture.

---

## Project Structure

```text
unloop/
├── backend/
│   ├── main.py
│   ├── schemas.py
│   ├── requirements.txt
│   └── unloop/
│       ├── policy.py
│       ├── prompt.py
│       ├── provider.py
│       └── safety.py
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   ├── scenarios.json
│   └── test_unloop.py
├── docs/
│   └── CORE_ENGINE.md
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

## Run Locally

```bash
# 1. Clone
git clone https://github.com/kanishkchoudhary-coder/unloop.git
cd unloop

# 2. Install backend dependencies
cd backend
python -m pip install -r requirements.txt

# 3. Configure environment
# Create a local .env from .env.example — never commit .env

# 4. Start the backend (from project root)
python -m uvicorn backend.main:app --reload --port 8000
# → http://127.0.0.1:8000   (docs at /docs)
```

Serve `frontend/` with any local static server (e.g. VS Code Live Server).

---

## Team & Hackathon

Built for **CODE FLUX 2026** — Build • Break • Innovate, a 36-hour student hackathon at LPU, Punjab, under the Open Innovation track. The hackathon build focused on proving one idea end-to-end — conversation → structured state → policy → behavior change — rather than spreading effort across disconnected features.

- **Frontend prototype:** initial prototype built by a teammate.
- **Backend, refinement & integration:** the FastAPI backend, Pydantic validation, Unloop policy engine, and Cloudflare Workers AI integration, plus the reworked/refined frontend and the full frontend↔backend integration, were built by [Kanishk Amit Choudhary](https://github.com/kanishkchoudhary-coder).

---

## Status

| | |
|---|---|
| Hackathon MVP | Complete |
| Core Engine | Implemented |
| Frontend | Implemented |
| Frontend ↔ Backend | Working |
| Public deployment | To be added |

---

## Disclaimer

**18+ prototype. Not therapy, diagnosis, or emergency care.** Unloop is an experimental software project and should not be relied on for emergencies or professional medical care.

---

## License

MIT License
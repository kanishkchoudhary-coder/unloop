# Unloop

### From overthinking to agency.

Unloop is an AI-assisted conversational system that helps people move from repetitive uncertainty toward clearer perspective, useful action, or closure — instead of simply producing another reassuring reply.

> **Not every thought needs another answer. Sometimes it needs a better perspective — or a reason to stop searching for certainty.**

Built by a 2-member team for **CODE FLUX 2026** at LPU.

---

## The Problem

Consider:

> *"My professor said my explanation was unclear. Maybe I'm just bad at programming."*

The reported event is specific — *my explanation was unclear*. The conclusion is broader:

```text
My explanation was unclear
        ↓
I'm bad at programming
        ↓
Maybe I'm not capable
        ↓
Maybe I shouldn't be doing this
```

A conventional chatbot can respond directly to the user's latest phrasing. Unloop instead tries to separate these layers before determining how to respond:

- what the user reported
- what the user may be interpreting that event to mean
- what the available information cannot establish

The goal is not to automatically tell the user that their interpretation is wrong. It is to create enough structure to distinguish **what is reported, what is inferred, what is uncertain, and what may be useful to do next**.

---

## What Unloop Does

### Understand

The user talks naturally. Unloop uses the current message together with recent conversation context rather than requiring the user to complete a structured questionnaire.

### Reality Mirror

Unloop separates the current understanding of a situation into three layers:

- **Reported** — what the user reported happened
- **Interpretation** — what the user may be taking that event to mean
- **Unknown** — what the available information cannot establish

The Mirror represents **Unloop's current understanding**, not objective truth. The user can correct it when the interpretation does not match what they meant.

### Conversation State

Unloop tracks structured conversational signals across turns, including:

```text
repetition_detected
seeking_certainty
new_information
close_ready
safety_route
```

This allows the application to reason about **how a conversation is progressing**, rather than treating every message as an isolated prompt.

### Strategy Selection

The application supports ten conversational strategies:

```text
listen
clarify
perspective
accountability
uncertainty
action
practice
close_loop
human_support
safety
```

The selected strategy depends on the structured conversation state together with the application's policy and safety rules.

### Close the Loop

When the same uncertainty continues to return without meaningful new information, Unloop can shift away from simply repeating reassurance.

The idea is not:

> *"Stop talking."*

It is closer to:

> *"We've reached the point where another identical answer probably won't add anything useful."*

Close Loop can surface:

- what currently appears clear
- what remains unknown
- what may actually be useful now

The user can either close the conversation or request one useful next step.

Closure is not treated as proof that everything is fine. It means the conversation may have reached a point where **continued analysis is no longer adding useful information**.

---

## How It Works

A conventional chatbot can be represented as:

```text
User → LLM → Answer
```

Unloop adds an application-controlled state, validation, and policy layer:

```text
User → Conversation Context → LLM
     → Structured State → Pydantic Validation
     → Unloop Policy + Safety Rules
     → Strategy → Structured Response
     → Frontend
```

For example, when the conversation state contains:

```text
repetition_detected = true
seeking_certainty   = true
new_information     = false
```

and that pattern persists across the conversation, the policy layer can move the interaction toward:

```text
close_loop
```

The important distinction is that model output is **not treated as the application's final behavioral decision**. The model helps interpret the conversation and produce structured information; the backend validates that information and applies deterministic application rules before returning the final structured response.

> **The model provides language intelligence; Unloop controls conversational behavior.**

That separation is the core engineering idea behind the project: a foundation model can provide flexible language understanding without being solely responsible for the application's conversational policy.

---

## Architecture

```text
                         USER
                           │
                           ▼
                 Frontend (HTML / CSS / JS)
                           │
                        POST /turn
                           │
                           ▼
                    FastAPI Backend
                           │
                           ▼
                   Unloop Core Engine
                           │
                           ▼
              Cloudflare Workers AI
                           │
                           ▼
                  Structured Model Output
                           │
                           ▼
                  Pydantic Validation
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
        Policy Engine             Safety Rules
               │                       │
               └───────────┬───────────┘
                           ▼
                 Structured Response
                           │
                           ▼
                  Frontend State Update
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
          Reality Mirror        Close Loop
```

### Core Engine

The **Core Engine** is the backend reasoning and policy layer responsible for:

1. using model output to interpret conversational state
2. validating structured data with Pydantic
3. carrying relevant state across turns
4. applying deterministic policy rules
5. prioritizing safety handling
6. determining the conversational strategy
7. returning a structured response to the frontend

This keeps application behavior separate from unconstrained model output.

---

## Design Philosophy

Unloop is built around one central principle:

> **Validate the emotion without automatically validating the conclusion.**

A user may have:

- drawn a conclusion broader than the available evidence supports
- genuinely made a mistake
- genuinely been treated badly by another person
- insufficient information to determine what happened
- something concrete they can do next

The system should not assume that every uncomfortable thought is irrational, and it should not assume that every interpretation is correct.

For example:

> *"I hurt my friend and I want you to tell me I did nothing wrong."*

Unloop can acknowledge the emotional experience without automatically agreeing with the requested conclusion. In that situation, an **accountability-oriented** response may be more appropriate than blind reassurance.

Likewise, a clear interpersonal rejection is treated as a **boundary to respect**, rather than as an uncertainty that must endlessly be solved.

### Reassurance-Loop Detection

The same philosophy drives Unloop's handling of repeated certainty-seeking:

```text
repetition_detected
        +
seeking_certainty
        +
no meaningful new information
        ↓
change conversational strategy
        ↓
potentially move toward Close Loop
```

This is **not a diagnosis** and does not attempt to determine whether a person has a psychological condition.

It is an application-level conversational signal used to identify a repeated certainty-seeking pattern and determine whether continuing the same style of response is still useful.

---

## Safety & Privacy

### Safety

Safety handling takes precedence over ordinary conversational strategies.

The prototype distinguishes these safety routes:

```text
normal
boundary
human_support
urgent_support
```

The system is also designed not to assist coercive, manipulative, or boundary-crossing behavior.

### Scope

Unloop is intended for **18+ users**. Age is **self-attested, not verified**.

It is explicitly:

- **not therapy**
- **not diagnosis**
- **not emergency care**
- **not clinically validated**

Unloop is an experimental software project and is not intended to replace professional or emergency support.

### Privacy

The current prototype stores active session state in the browser using:

```text
sessionStorage
```

The client uses this for information such as recent turns, the rolling summary, and the current session/transcript state.

The current application does **not intentionally build a permanent server-side conversation history as part of its normal session model**. This should not be interpreted as a guarantee about retention or processing by third-party infrastructure or AI providers.

The longer-term direction is **user-controlled memory**:

```text
opt in
   ↓
remember
   ↓
edit / delete / export
```

The design goal is to give users meaningful control over what becomes long-term context rather than collecting everything by default.

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

### Current Features

- Natural conversational interface with loading, error, and retry states
- Reality Mirror with **Reported / Interpretation / Unknown**
- User correction support for the Reality Mirror
- Structured conversation state across turns
- Pydantic-validated backend responses
- Deterministic conversational policy layer
- Ten conversational strategies
- Reassurance-loop detection
- Close Loop behavior
- Rolling summary and recent-turn tracking
- Re-engagement after closure
- Safety routing with higher priority than ordinary conversational strategies
- Frontend ↔ backend integration through `POST /turn`

### Development Testing

Representative behavioral checks included:

```text
Overgeneralized interpretation
        ↓
Perspective-oriented response

Repeated certainty-seeking
+ no meaningful new information
        ↓
Close-loop behavior

User genuinely at fault
        ↓
Accountability-oriented response

New actionable intent after closure
        ↓
Action-oriented response
```

The **initial automated scenario suite passed 3/3 during development**.

Additional manual testing was performed through the actual frontend ↔ FastAPI pipeline, including repeated-turn behavior, response validation, retry handling, Reality Mirror interaction, closure, and re-engagement.

---

## Limitations

Unloop is still a prototype.

Current limitations include:

- conversational-state extraction is partly model-assisted and therefore inherits model uncertainty
- broader reliability and adversarial/edge-case testing is still needed
- safety behavior requires deeper evaluation, ideally involving relevant experts
- the system is not clinically validated
- 18+ eligibility is self-attested rather than verified
- production-grade privacy and security review is still outstanding
- there is no persistent long-term memory in the current build
- interpretation quality can be affected by the underlying model/provider

These limitations are intentionally documented rather than hidden behind product language.

---

## Roadmap

### v1.1 — Reliability

- broader scenario evaluation
- adversarial and edge-case testing
- improved Reality Mirror correction handling
- stronger recovery from conversational misunderstandings
- deployment hardening

### v2 — User-Controlled Memory

- explicit memory opt-in
- remember / edit / delete / export controls
- longer-term conversation continuity

### v3 — Real-World Agency

- social-confidence practice
- experience tracking
- stronger action planning
- user-controlled personalization

### Longer Term

- larger evaluation datasets
- expert-reviewed safety systems
- stronger privacy and security controls
- provider-independent model architecture

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

### 1. Clone

```bash
git clone https://github.com/kanishkchoudhary-coder/unloop.git
cd unloop
```

### 2. Install backend dependencies

```bash
python -m pip install -r backend/requirements.txt
```

### 3. Configure environment

Create a local `.env` file using `.env.example` as the template and add the required configuration.

**Never commit `.env` to Git.**

### 4. Start the backend

From the project root:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Serve the frontend

Serve the `frontend/` directory with any local static server, such as VS Code Live Server.

The frontend communicates with the backend through:

```text
POST /turn
```

The frontend also supports configuring the backend API base URL for deployment.

---

## Team & Hackathon

Built for **CODE FLUX 2026 — Build • Break • Innovate**, a 36-hour student hackathon at LPU, Punjab, under the **Open Innovation** track.

The hackathon build focused on proving one idea end-to-end:

```text
Conversation
     ↓
Structured State
     ↓
Policy
     ↓
Behavior Change
```

rather than spreading the available development time across disconnected features.

### Contributions

- **Frontend prototype:** initial interface and prototype work by a teammate
- **Backend, refinement & integration:** FastAPI backend, Pydantic validation, Core Engine/policy layer, Cloudflare Workers AI integration, frontend refinement, and full frontend ↔ backend integration by [Kanishk Amit Choudhary](https://github.com/kanishkchoudhary-coder)

The project was developed as a 2-member hackathon team and is now being continued as a portfolio project.

---

## Project Status

| Component | Status |
|---|---|
| Hackathon MVP | Complete |
| Core Engine | Implemented |
| Frontend | Implemented |
| Frontend ↔ Backend | Working |
| Scenario Testing | Initial suite complete |
| Public Deployment | To be added |
| Persistent User Memory | Future roadmap |

---

## Disclaimer

**18+ prototype. Not therapy, diagnosis, or emergency care.**

Unloop is an experimental software project. It should not be relied upon for emergencies or used as a substitute for professional or mental-health care.

---

## License

This project is licensed under the **MIT License**.

See [`LICENSE`](LICENSE) for the full license text.
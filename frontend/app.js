/* ======================================
   UNLOOP FRONTEND
   Core Engine API client
====================================== */


/* ======================================
   API CONFIGURATION
====================================== */

/*
    Local development backend.

    Later, for deployment, index.html can define:

    window.UNLOOP_API_BASE_URL =
        "https://your-render-backend.example.com";

    before loading app.js.
*/

const API_BASE_URL = (
    typeof window.UNLOOP_API_BASE_URL === "string" &&
    window.UNLOOP_API_BASE_URL.trim()
        ? window.UNLOOP_API_BASE_URL.trim()
        : "http://127.0.0.1:8000"
).replace(/\/+$/, "");


const API_TIMEOUT_MS = 100000;

const MAX_RECENT_TURNS = 4;

const SESSION_STORAGE_KEY =
    "unloop-session-v1";


/* ======================================
   ELEMENT HELPERS
====================================== */

function getRequiredElement(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        throw new Error(
            `Required UI element #${id} was not found.`
        );
    }

    return element;
}


/* ======================================
   ELEMENT REFERENCES
====================================== */

const form =
    getRequiredElement("message-form");

const input =
    getRequiredElement("message-input");

const sendButton =
    getRequiredElement("send-button");

const messages =
    getRequiredElement("messages");

const typingIndicator =
    getRequiredElement("typing-indicator");

const errorBox =
    getRequiredElement("error-box");

const retryButton =
    getRequiredElement("retry-button");


/* Mirror */

const mirrorPanel =
    getRequiredElement("mirror");

const reported =
    getRequiredElement("reported");

const interpretation =
    getRequiredElement("interpretation");

const unknown =
    getRequiredElement("unknown");

const mirrorYes =
    getRequiredElement("mirror-yes");

const mirrorNotQuite =
    getRequiredElement("mirror-not-quite");


/* Close Loop */

const closePanel =
    getRequiredElement("close-loop");

const closeSummary =
    getRequiredElement("close-summary");

const closeClear =
    getRequiredElement("close-clear");

const closeUnknown =
    getRequiredElement("close-unknown");

const closeUseful =
    getRequiredElement("close-useful");

const closeHere =
    getRequiredElement("close-here");

const nextStep =
    getRequiredElement("next-step");


/* ======================================
   APPLICATION STATE
====================================== */

let isProcessing = false;

let lastSubmittedMessage = "";

let rollingSummary = "";

let recentTurns = [];

let transcript = [];

let lastResponse = null;


/* ======================================
   SESSION STORAGE
====================================== */

function saveSession() {

    const state = {
        rollingSummary,
        recentTurns,
        transcript,
        lastSubmittedMessage,
        lastResponse
    };

    try {

        sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        /*
            sessionStorage is a convenience for the
            temporary active session.

            Failure to save must never prevent the
            conversation from working.
        */

        console.warn(
            "Could not save temporary Unloop session:",
            error
        );

    }
}


function loadSession() {

    try {

        const raw =
            sessionStorage.getItem(
                SESSION_STORAGE_KEY
            );

        if (!raw) {
            return;
        }

        const state =
            JSON.parse(raw);


        if (
            typeof state.rollingSummary ===
            "string"
        ) {

            rollingSummary =
                state.rollingSummary;

        }


        if (
            Array.isArray(
                state.recentTurns
            )
        ) {

            recentTurns =
                state.recentTurns
                    .filter(isValidTurn)
                    .slice(
                        -MAX_RECENT_TURNS
                    );

        }


        if (
            Array.isArray(
                state.transcript
            )
        ) {

            transcript =
                state.transcript.filter(
                    item =>
                        item &&
                        (
                            item.role === "user" ||
                            item.role === "assistant"
                        ) &&
                        typeof item.text ===
                            "string" &&
                        item.text.trim()
                );

        }


        if (
            typeof state.lastSubmittedMessage ===
            "string"
        ) {

            lastSubmittedMessage =
                state.lastSubmittedMessage;

        }


        if (
            state.lastResponse &&
            typeof state.lastResponse ===
                "object"
        ) {

            lastResponse =
                state.lastResponse;

        }

    } catch (error) {

        console.warn(
            "Could not restore temporary Unloop session:",
            error
        );

        try {

            sessionStorage.removeItem(
                SESSION_STORAGE_KEY
            );

        } catch {
            // Ignore storage cleanup failures.
        }

    }
}


/* ======================================
   TURN HELPERS
====================================== */

function isValidTurn(turn) {

    return Boolean(
        turn &&
        (
            turn.role === "user" ||
            turn.role === "assistant"
        ) &&
        typeof turn.content === "string" &&
        turn.content.trim()
    );
}


function pushRecentTurn(
    role,
    content
) {

    recentTurns.push({
        role,
        content
    });

    recentTurns =
        recentTurns.slice(
            -MAX_RECENT_TURNS
        );

}


/* ======================================
   MESSAGE RENDERING
====================================== */

function addMessage(
    role,
    text,
    persist = true
) {

    if (
        role !== "user" &&
        role !== "assistant"
    ) {

        throw new Error(
            `Unsupported message role: ${role}`
        );

    }


    if (
        typeof text !== "string" ||
        !text.trim()
    ) {

        return;

    }


    const cleanText =
        text.trim();


    const row =
        document.createElement("div");

    row.className =
        `message-row ${
            role === "user"
                ? "user-row"
                : "assistant-row"
        }`;


    if (
        role === "assistant"
    ) {

        const avatar =
            document.createElement("div");

        avatar.className =
            "assistant-avatar";

        avatar.textContent =
            "U";

        avatar.setAttribute(
            "aria-hidden",
            "true"
        );

        row.appendChild(
            avatar
        );

    }


    const bubble =
        document.createElement("div");

    bubble.className =
        `message ${
            role === "user"
                ? "message-user"
                : "message-assistant"
        }`;


    const textElement =
        document.createElement("p");

    /*
        textContent is intentional.

        It prevents model/user text from being
        interpreted as HTML.
    */

    textElement.textContent =
        cleanText;


    bubble.appendChild(
        textElement
    );

    row.appendChild(
        bubble
    );

    messages.appendChild(
        row
    );


    if (persist) {

        transcript.push({
            role,
            text: cleanText
        });

        saveSession();

    }


    scrollMessagesToBottom();
}


/* ======================================
   RESTORE DISPLAYED CONVERSATION
====================================== */

function restoreTranscript() {

    for (
        const message
        of transcript
    ) {

        addMessage(
            message.role,
            message.text,
            false
        );

    }

}


/* ======================================
   SCROLLING
====================================== */

function scrollMessagesToBottom() {

    messages.scrollTo({
        top: messages.scrollHeight,
        behavior: "smooth"
    });

}


/* ======================================
   LOADING STATE
====================================== */

function setLoading(loading) {

    isProcessing =
        loading;

    sendButton.disabled =
        loading;

    input.disabled =
        loading;


    typingIndicator.classList.toggle(
        "hidden",
        !loading
    );


    form.setAttribute(
        "aria-busy",
        String(loading)
    );


    if (!loading) {

        input.focus();

    }

}


/* ======================================
   ERROR HANDLING
====================================== */

function showError() {

    errorBox.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorBox.classList.add(
        "hidden"
    );

}


/* ======================================
   MIRROR
====================================== */

function hideMirror() {

    mirrorPanel.classList.add(
        "hidden-panel"
    );

}


function showMirror(
    mirror,
    mirrorReady
) {

    if (
        !mirrorReady ||
        !mirror ||
        typeof mirror !== "object"
    ) {

        hideMirror();

        return;

    }


    reported.textContent =
        mirror.reported ||
        "Not identified yet.";


    interpretation.textContent =
        mirror.interpretation ||
        "Not identified yet.";


    unknown.textContent =
        mirror.unknown ||
        "Not identified yet.";


    /*
        A fresh model response means these controls
        can be used again.
    */

    mirrorYes.disabled =
        false;

    mirrorNotQuite.disabled =
        false;


    mirrorPanel.classList.remove(
        "hidden-panel"
    );


    mirrorPanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


/* ======================================
   CLOSE LOOP
====================================== */

function hideCloseLoop() {

    closePanel.classList.add(
        "hidden-panel"
    );

}


function showCloseLoop(
    response
) {

    const mirror =
        response.mirror || {};


    closeSummary.textContent =
        "We've returned to the same uncertainty "
        + "without meaningful new evidence.";


    /*
        These values are derived only from fields
        already validated by the backend.

        We do not invent a fake response.close object.
    */

    closeClear.textContent =
        mirror.reported ||
        "Only what has actually been reported "
        + "is currently clear.";


    closeUnknown.textContent =
        mirror.unknown ||
        "Some uncertainty cannot be resolved "
        + "from the information available.";


    closeUseful.textContent =
        "Decide whether there is anything useful "
        + "to do with what you know, or leave the "
        + "remaining uncertainty unanswered for now.";


    closePanel.classList.remove(
        "hidden-panel"
    );


    closePanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


/* ======================================
   STRUCTURED PANEL ROUTING
====================================== */

function renderStructuredPanels(
    response
) {

    /*
        Safety/support routes should not continue
        displaying ordinary reflection UI as though
        the conversation were normal.
    */

    if (
        response.safety_route !==
        "normal"
    ) {

        hideMirror();
        hideCloseLoop();

        return;

    }


    showMirror(
        response.mirror,
        response.mirror_ready
    );


    if (
        response.close_ready
    ) {

        showCloseLoop(
            response
        );

    } else {

        hideCloseLoop();

    }

}


/* ======================================
   RESPONSE VALIDATION
====================================== */

function validateBackendResponse(
    data
) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        throw new Error(
            "Backend returned an invalid response."
        );

    }


    if (
        data.schema_version !== "0.1"
    ) {

        throw new Error(
            "Unsupported Unloop response schema."
        );

    }


    if (
        typeof data.reply !== "string" ||
        !data.reply.trim()
    ) {

        throw new Error(
            "Backend response is missing a reply."
        );

    }


    if (
        !data.mirror ||
        typeof data.mirror !== "object"
    ) {

        throw new Error(
            "Backend response is missing the Reality Mirror."
        );

    }


    const mirrorFields = [
        "reported",
        "interpretation",
        "unknown"
    ];


    for (
        const field
        of mirrorFields
    ) {

        if (
            typeof data.mirror[field] !==
            "string"
        ) {

            throw new Error(
                `Backend mirror.${field} is invalid.`
            );

        }

    }


    const booleanFields = [
        "mirror_ready",
        "repetition_detected",
        "seeking_certainty",
        "new_information",
        "close_ready"
    ];


    for (
        const field
        of booleanFields
    ) {

        if (
            typeof data[field] !==
            "boolean"
        ) {

            throw new Error(
                `Backend field ${field} is invalid.`
            );

        }

    }


    const allowedStrategies =
        new Set([
            "listen",
            "clarify",
            "perspective",
            "accountability",
            "uncertainty",
            "action",
            "practice",
            "close_loop",
            "human_support",
            "safety"
        ]);


    if (
        !allowedStrategies.has(
            data.strategy
        )
    ) {

        throw new Error(
            "Backend returned an unsupported strategy."
        );

    }


    const allowedSafetyRoutes =
        new Set([
            "normal",
            "boundary",
            "human_support",
            "urgent_support"
        ]);


    if (
        !allowedSafetyRoutes.has(
            data.safety_route
        )
    ) {

        throw new Error(
            "Backend returned an unsupported safety route."
        );

    }


    if (
        typeof data.rolling_summary !==
        "string"
    ) {

        throw new Error(
            "Backend rolling summary is invalid."
        );

    }


    return data;
}


/* ======================================
   BACKEND REQUEST
====================================== */

async function sendToBackend(
    message
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            API_TIMEOUT_MS
        );


    const body = {

        message,

        rolling_summary:
            rollingSummary,

        recent_turns:
            recentTurns.slice(
                -MAX_RECENT_TURNS
            )

    };


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/turn`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            body
                        ),

                    signal:
                        controller.signal
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            /*
                Handled below if the HTTP request
                was unsuccessful or malformed.
            */

        }


        if (
            !response.ok
        ) {

            const detail =
                data &&
                typeof data.detail === "string"
                    ? data.detail
                    : `Backend request failed with HTTP ${response.status}.`;


            throw new Error(
                detail
            );

        }


        return validateBackendResponse(
            data
        );

    } catch (error) {

        if (
            error &&
            error.name ===
                "AbortError"
        ) {

            throw new Error(
                "The request took too long. Please try again."
            );

        }


        throw error;

    } finally {

        clearTimeout(
            timeout
        );

    }

}


/* ======================================
   PROCESS MESSAGE
====================================== */

async function processMessage(
    message,
    isRetry = false
) {

    const cleanMessage =
        typeof message === "string"
            ? message.trim()
            : "";


    if (
        !cleanMessage ||
        isProcessing
    ) {

        return;

    }


    lastSubmittedMessage =
        cleanMessage;


    hideError();


    /*
        During retry the original user bubble
        already exists, so do not duplicate it.
    */

    if (!isRetry) {

        addMessage(
            "user",
            cleanMessage
        );

        input.value = "";

    }


    setLoading(true);


    try {

        /*
            sendToBackend uses the conversation
            state BEFORE this current message is
            added to recentTurns.

            That is correct because the backend has
            a separate request.message field.
        */

        const response =
            await sendToBackend(
                cleanMessage
            );


        addMessage(
            "assistant",
            response.reply
        );


        /*
            Only successful turns become part of
            recent backend conversation context.
        */

        pushRecentTurn(
            "user",
            cleanMessage
        );

        pushRecentTurn(
            "assistant",
            response.reply
        );


        rollingSummary =
            response.rolling_summary;


        lastResponse =
            response;


        renderStructuredPanels(
            response
        );


        saveSession();

    } catch (error) {

        console.error(
            "Unloop request failed:",
            error
        );


        showError();

    } finally {

        setLoading(false);

    }

}


/* ======================================
   FORM SUBMISSION
====================================== */

form.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const message =
            input.value.trim();


        processMessage(
            message
        );

    }
);


/* ======================================
   ENTER KEY

   Enter = send
   Shift + Enter = newline
====================================== */

input.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            form.requestSubmit();

        }

    }
);


/* ======================================
   RETRY
====================================== */

retryButton.addEventListener(
    "click",
    function () {

        if (
            isProcessing
        ) {

            return;

        }


        hideError();


        if (
            lastSubmittedMessage
        ) {

            processMessage(
                lastSubmittedMessage,
                true
            );

        }

    }
);


/* ======================================
   MIRROR CONFIRMATION
====================================== */

mirrorYes.addEventListener(
    "click",
    function () {

        if (
            isProcessing
        ) {

            return;

        }


        const userConfirmation =
            "Yes, that's roughly right.";


        const acknowledgement =
            "Okay. We'll use that as our current understanding.";


        addMessage(
            "user",
            userConfirmation
        );

        addMessage(
            "assistant",
            acknowledgement
        );


        pushRecentTurn(
            "user",
            userConfirmation
        );

        pushRecentTurn(
            "assistant",
            acknowledgement
        );


        mirrorYes.disabled =
            true;

        mirrorNotQuite.disabled =
            true;


        saveSession();

    }
);


mirrorNotQuite.addEventListener(
    "click",
    function () {

        if (
            isProcessing
        ) {

            return;

        }


        const userCorrectionSignal =
            "Not quite.";


        const correctionPrompt =
            "What did I misunderstand? Tell me the part that doesn't quite fit.";


        addMessage(
            "user",
            userCorrectionSignal
        );

        addMessage(
            "assistant",
            correctionPrompt
        );


        pushRecentTurn(
            "user",
            userCorrectionSignal
        );

        pushRecentTurn(
            "assistant",
            correctionPrompt
        );


        mirrorYes.disabled =
            true;

        mirrorNotQuite.disabled =
            true;


        saveSession();


        input.focus();

    }
);


/* ======================================
   CLOSE LOOP ACTIONS
====================================== */

closeHere.addEventListener(
    "click",
    function () {

        if (
            isProcessing
        ) {

            return;

        }


        addMessage(
            "assistant",
            "We can leave this here for now. You don't need to solve every uncertainty right now."
        );


        hideCloseLoop();


        /*
            Preserve the last Mirror while remembering
            locally that the Close Loop card was dismissed.
        */

        if (
            lastResponse &&
            typeof lastResponse ===
                "object"
        ) {

            lastResponse = {
                ...lastResponse,
                close_ready: false
            };

        }


        saveSession();

        input.focus();

    }
);


nextStep.addEventListener(
    "click",
    function () {

        if (
            isProcessing
        ) {

            return;

        }


        hideCloseLoop();


        /*
            Do not invent a generic next step locally.

            Ask the actual Core Engine to generate one
            from the conversation context.
        */

        processMessage(
            "What is one small, realistic next step I can take based on what we discussed?"
        );

    }
);


/* ======================================
   INITIALIZATION
====================================== */

function initializeApp() {

    loadSession();

    restoreTranscript();


    if (
        lastResponse &&
        typeof lastResponse ===
            "object"
    ) {

        try {

            const validated =
                validateBackendResponse(
                    lastResponse
                );


            renderStructuredPanels(
                validated
            );

        } catch (error) {

            console.warn(
                "Stored response could not be restored:",
                error
            );

            lastResponse =
                null;

            saveSession();

        }

    }


    input.focus();

}


/* ======================================
   START
====================================== */

initializeApp();
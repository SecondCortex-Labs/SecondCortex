// @ts-check

/** @typedef {import('../src/protocol').ToWebview} ToWebview */
/** @typedef {import('../src/protocol').Source} Source */

/**
 * @typedef {{ id: number, question: string } & (
 *   | { state: 'pending' }
 *   | { state: 'interrupted' }
 *   | { state: 'answered', answer: string, sources: readonly Source[] }
 *   | { state: 'failed', message: string }
 * )} Turn
 */

/** @typedef {{ turns: Turn[], nextId: number, draft: string }} State */

const MAX_TURNS = 50;

/** @type {WebviewApi<State>} */
const vscode = acquireVsCodeApi();

/** @param {string} id */
const byId = (id) => /** @type {any} */ (document.getElementById(id));
/** @type {HTMLElement} */ const empty = byId('empty');
/** @type {HTMLOListElement} */ const transcript = byId('transcript');
/** @type {HTMLFormElement} */ const form = byId('ask');
/** @type {HTMLTextAreaElement} */ const input = byId('question');
/** @type {HTMLButtonElement} */ const clear = byId('clear');

/** @type {State} */
let state = load();
input.value = state.draft;

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) {
        return;
    }
    const id = state.nextId;
    input.value = '';
    /** @type {Turn} */
    const turn = { id, question, state: 'pending' };
    update({ turns: [...state.turns, turn].slice(-MAX_TURNS), nextId: id + 1, draft: '' });
    vscode.postMessage({ type: 'ask', id, question });
});

input.addEventListener('input', () => {
    state = { ...state, draft: input.value };
    vscode.setState(state);
});

clear.addEventListener('click', () => update({ ...state, turns: [] }));

window.addEventListener('focus', () => input.focus());

window.addEventListener('message', (/** @type {MessageEvent<ToWebview>} */ event) => {
    const message = event.data;
    switch (message.type) {
        case 'answer':
            settle(message.id, { state: 'answered', answer: message.answer, sources: message.sources });
            break;
        case 'error':
            settle(message.id, { state: 'failed', message: message.message });
            break;
        default:
            assertNever(message);
    }
});

render();

/** Any turn still pending belongs to a previous webview or extension host. */
function load() {
    const saved = vscode.getState() ?? { turns: [], nextId: 1, draft: '' };
    return {
        ...saved,
        turns: saved.turns.map((/** @type {Turn} */ turn) =>
            turn.state === 'pending' ? /** @type {Turn} */ ({ id: turn.id, question: turn.question, state: 'interrupted' }) : turn,
        ),
    };
}

/**
 * @param {number} id
 * @param {{ state: 'answered', answer: string, sources: readonly Source[] } | { state: 'failed', message: string }} outcome
 */
function settle(id, outcome) {
    update({
        ...state,
        turns: state.turns.map((turn) => (turn.id === id ? /** @type {Turn} */ ({ id, question: turn.question, ...outcome }) : turn)),
    });
}

/** @param {State} next */
function update(next) {
    state = next;
    vscode.setState(state);
    render();
}

function render() {
    empty.hidden = state.turns.length > 0;
    transcript.replaceChildren(...state.turns.map(renderTurn));
    transcript.lastElementChild?.scrollIntoView({ block: 'end' });
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {string} className
 * @param {string} [text]
 */
function element(tag, className, text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
}

/** @param {Turn} turn */
function renderTurn(turn) {
    const item = element('li', `turn ${turn.state}`);
    item.append(element('p', 'question', turn.question));
    switch (turn.state) {
        case 'pending':
            item.append(element('p', 'status', 'Thinking…'));
            break;
        case 'interrupted':
            item.append(element('p', 'status', 'No answer arrived. Ask again.'), retryButton(turn));
            break;
        case 'failed':
            item.append(element('p', 'error', turn.message), retryButton(turn));
            break;
        case 'answered': {
            const answer = element('p', 'answer');
            answer.append(...renderAnswer(turn.answer, turn.sources));
            item.append(answer, ...turn.sources.map((source, index) => renderSource(source, index + 1)));
            break;
        }
        default:
            assertNever(turn);
    }
    return item;
}

/** @param {Turn} turn */
function retryButton(turn) {
    const button = element('button', 'secondary', 'Retry');
    button.addEventListener('click', () => {
        update({ ...state, turns: state.turns.map((t) => (t.id === turn.id ? { id: t.id, question: t.question, state: 'pending' } : t)) });
        vscode.postMessage({ type: 'ask', id: turn.id, question: turn.question });
    });
    return button;
}

/**
 * @param {string} answer
 * @param {readonly Source[]} sources
 * @returns {(string | HTMLButtonElement)[]}
 */
function renderAnswer(answer, sources) {
    // Splitting on a capture group puts the numbers at the odd indexes.
    return answer.split(/\[(\d+)\]/).map((part, index) => {
        const source = index % 2 ? sources[Number(part) - 1] : undefined;
        return source ? openButton(source, 'citation', `[${part}]`) : index % 2 ? `[${part}]` : part;
    });
}

/**
 * @param {Source} source
 * @param {number} n
 */
function renderSource(source, n) {
    const parts = [source.file, source.symbol, source.branch, new Date(source.timestamp).toLocaleString()];
    return openButton(source, 'source', `[${n}] ${parts.filter(Boolean).join(' · ')}`);
}

/**
 * @param {Source} source
 * @param {string} className
 * @param {string} text
 */
function openButton(source, className, text) {
    const button = element('button', className, text);
    button.title = source.file;
    button.addEventListener('click', () => vscode.postMessage({ type: 'open', workspace: source.workspace, file: source.file }));
    return button;
}

/** @param {never} value */
function assertNever(value) {
    throw new Error(`unhandled message ${JSON.stringify(value)}`);
}

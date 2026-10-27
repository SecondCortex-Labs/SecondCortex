export const LINKS = {
  marketplace: "https://marketplace.visualstudio.com/items?itemName=secondcortex-labs.secondcortex",
  github: "https://github.com/Syed-Suhaan/SecondCortex-Labs",
  docs: "https://github.com/Syed-Suhaan/SecondCortex-Labs/tree/main/docs",
} as const;

export const PRIMARY_CTA = { label: "Install free for VS Code", href: LINKS.marketplace } as const;

export type SectionId = "features" | "how" | "demo" | "faq";

export const NAV_LINKS: ReadonlyArray<{ label: string; href: string; section?: SectionId }> = [
  { label: "Features", href: "#features", section: "features" },
  { label: "How it works", href: "#how", section: "how" },
  { label: "Demo", href: "#demo", section: "demo" },
  { label: "FAQ", href: "#faq", section: "faq" },
  { label: "Thesis", href: "/thesis" },
];

export const BRAIN = `                                                         .:=*##%%%#*+=-*#%%%%%%@@@%%#+-..
                                             ....::-+#%@@@@@@@@@@@@@%%%%@@@@@@@@@@@@@@@@@@@#+-.
                                     .:-=+*%@@@@@@@@@@@@@@@@@@*=*#@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#****++=-:.
                                  :+#@@@@@@@@@@@@@@@%%##****+-=#@@@@@@@@@@@%%@@@@@@@@%@@@@@@@@@@@%@@@@@@@%#=:
                              .:-#@@@@@@@@@@##%%%@@@@@@@@@@*-:+@@@@@@@@@@@@@@#**##*====-=+=======-=+==*#%##%@%+.
                        .:=*%@@@@@@@@@@@%#%%@@@@@@@@@@@@@@@@@#+-#@@@@@@@@@@@@#=---=#@@@@@@@@@@@@@##@@@@@@@@@@@@%+:.
                      .+%@@%@@@@@@@%%%%#@@@@@@@@@@@@@@@@@@@@@#=.=#@@@@@@@@@@#=.:*@@@@@@@@@%##%@@@%%%%##******#%@@@%#+=-.
                    .=%%%##@@@%@@@@@@@@@@@@%*#@@@@@@@@@@@@@%*-=+@@@@@@@@@@@#+==#@@@@@@@@@@#=:=+++++**#####*+=-::=*%@@@@@#+:
                .-*%@@@%#@@@@@@@@@@@@@@@#*=*@@@@@@@@@@%%@@%+=+@@@@@@@@@%%#*=--%@@@@@@@@@%#+-:*@@@@@@@@@@@@@@@@@@+::=%@@%@@@@+:
             :=#@@@@@@@@@@@@@@@@@@@@@@@#**@@@@@@@@@@@@@@%*++%@@@@@@@@@%#+===#@@@@@@@@@%***#@@@@@@@@@%%%##**@@@@@@@%*==*##***%%+:
           :*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%*==+@@@@@@@@@@%*+-:*@@@@@@@##*++*%@@@@@@@%#*+==----+%@@@@@%%@@%*+*##*#%%#+:
         .=%@@@@%#@@@@@%##@@@@@@@@@@@@@@@@@%%%#**+**==-:.+@@@@@@@@@%*=-:-*@@@@@@@@%=:-#@@@@@@@#*+-::-==+***+*#%@@@@@@@@@@@@@@@@@@*:
        .+@@@@@##%@@@@@@@@@@@@@@@@@@@@@@%**+==---===---:.+@@@@@@@@@*=-: -@@@@@@@@@@*+*@@@@@@@%*=-=#@@@@@@@@@@@%##%@@@@@@@*+*%@@@@@#-.
       :*%@@@@%#@@@@@@@@@@@%#**#@@%%%@%*+===*#@@@@@@@@@#++#@@@@@@@@@@#-.-@@@@@@@@@@@#*@@@@@@@#++#@@@@@@@@@%@@@@%%*+*###**+=-+*####%@%+:
     :+%@@@@@@@@@@@@@@@@@##@@@@@@@@@#+=--=#@@@@@@@@@@@@@@@%#%@@@@@@@@%#=-+@@@@@@@@@@#+%@@@@@@+=@@@@@@@@@@#*@@@@@@@#+:----::::--=--=+#%#+.
    +@@@@@@@@@@@@@@@@@%**%@@@@@@@@@@@#=:+@@@@@@@%#%@@@@@@@@%*=%@@@@@@@#+=+@@@@@@@@@@%+%@@@@@%**@@@@@@@@%#++@@@@@@@@#-......  .--=-::-*@@*:
  :+@@@@@@@@@@@@@@@%#**=*@@@@@@@@@@@@@*-#@@@@@%%#+%@@@@@@@@%+:*@@@@@@%#*+*@@@@@@@@@@#:#@@@@@%%@@@@@@@@#+=*@@@@@@@@%@@#-.  :=%@@@@@%+-.=#@#:
  =@@@@@@@@@@@@@@@@@@@@@%%@@@@@@@@@@@@#=%@@@@@%%*=#@@@@@@@@@*:*@@@@@@%#++@@@@@@@@@@%*-#@@@@@@@@@@@@@%*===%@@@@@@@%%##%%+-:+@@@%*=--+*=-=#%*:
 .+@@@@@@@@@@@@@@@@@@@@@@#*+*%@@@@@@@%*-%@@@@@@%*=*@@@@@@@@%*-*@@@@@@%#=+@@@@@@@@@@#++#@@@@@@@%#***++=-+@@@@@@@%#*#%#**%*-#@@%*=:..-+#=.*%@=
  +@@@@@#%@@@@@@@@@@@@@@#=+%@@@@@@@@%+- :*@@@@@%##++%@@@@@@@#*@@@@@@@@@#%@@@@@@@%*=-:.-*#%#**+==---=--+%@@@%#*++#@@@*++##-+%%*=-.  :=***=*@*:
  =@@@%%%##@@@@@@%@@@@%**@@@@@@@@@@#*+*%@@%%%@@%#*+=+#@@@@@@%*@@@@@@@#+%@@@@@@%*+-:.  .=-=+=---:.....:+++++*#%@@@@%#+++#*-=**+--=:..-+#%+=#%%+:
.-#@@@%#*#%@@%##*#@@@%*#@@@@@@@@@%##%@@@@@@@@@%#**+=-+@@@@@@@#@@@@@@@*=%@@@@#+--=-:    .....::...   .---=#@@@@@@@%#*+++#*::-++::==-.:=*%%#++*%#:
:#@@@@@@*@@@@@@@@@@@@*+@@@@@@@%#*+=+++**####****+===:-@@@@@@@@@@@@@%#+-+#@#+--==-:.         ::::.    .:+@@@@@@@@%#*+==+#*..:==...+*:..-+%%+==#%+.
-@@@@@@@@@@@@@@@@@@@%+=@@@@##*+++**+-::-=++*++==-:...:*@@@@@@@@@@%#+-..=#*+=++-:   .:=#@@@@@@@@@@@@@@#+#@@@@@@@%#*=--=*#+  .::...-+-. .-+*%*-*%%=
-@@@@@@%%@@@@@@@@@@@%#*####%%@@@@@@@@%*-:.:----::::...:+@@@@@%%#*=-:. .=+=--. .:=#@@@@@@@@@@@@@@@@@@@@@@%@@@@@%*+-::-+*+:    .--.:=*=...:=+*%##%+
:%@@@@%#*@@@@@@@@@@@@@@@%##@%##*+++%@%#*-:==-:..::......-+***+=---          -*%@@@@@@@@@@%@@@@@@%%%%%%%##%@@%*+=:..-+**:.-=+**++=-=#*:::..:=*@@%=
.-#@@@%*===+*=#@@@@@@@@@@@@@*=+*%@@@@#*+=-=#@@#=:          :-:.   .-=++++-*@@@@@@@@@@@@%*+%@@%%#**++++*+=#@@%#=...-=*-.:=%@%#*:::-=#*:-+=-.-+@@%=
  :*#@@@#++@@@@@@@@@@@@@@@@@@@@@%%%#**+==-=#@%++++-      .::=#@@@@@@@@@@@@@@@@@@@@%%%@%%+=#%@%#*+==++*++=+*=:...-=+=.-+%@@%*+-. .-+%+.:=##-=*#%#-
    .-@@@%#@@@@%@@%%%%#######*+=========--+#%*=---::..-*%@@@@@@@@@@@@@@@@@@@@@@@%######*=-+*#*+=::::---:::::--=-::.:=#@%#*+=-.  :+##= .:+##+-+##=
     .#@@@#@@@%#+===-=++++++##+-=-:--==+*#%%#+-:::-+%@@@@@@@@@@@@%%%%@@@@@@@@@##**++++=-:.::---..  ..:::::-::-=+-:=*@#*+==-:...:=#%=. .:+#@*:+#%+
      -#@@@@@@%*=:.   :....   ::-+*#####%%%#*+=--*@@@@@@@@@@@@@%%#***#%@@@%%#*+==-----:.:-+++***+++=: .:+*#@@@%#++###+=-:...--:=*%#:  ..-*%*:+%%+
       :#@@@%%#+=-:.        ...   .+%@%*+++=-::=%@@@@@@@@@@@@@%%#******#**+=--::.::-=+%@@@@@@@@@@@@@@%@@@%%#**+==+*+-::...-=***%@*:   :-=*%*=#@%=
        .=%@@#*=-:::::-=+=++=---.. .:*#%#*++=--%@@@@@@@@#*=+****++=====+==-::::-=#@@@@@@@@%##########**++==-----==-:::::=*#%@@%*-.   :--*#***@@=.
           =#@@%*+=:.:--=+*#*+=-::-:. ..-+-:.:+@@@@@@@@@%##+-::---:-*****#%@@@%@@@@@@%%###%#++*+++=---------======++*%@@@%*=-:.    .:-=+#%=+%@#:
             .=#%%###***#%#*#**+++===--:..=#@@%@@@@@@@@@###+-:..=#@@@@@@@@@@@@@@@@%#*+==++*++=-=========+++++=*##**+=-:...:-=+=:  .-==*%%*+#@*:
                 .-=+************+===+===#@@@@@@@@@@@@%#+++=--+@@@@@@@@@%%#**#%%###*++===+=-:..::...::--::..... ......:::=+*%#-.::-+#@@%++%%%-
                                       .*@@@@@@@%##**+===+**+=%@@%#***+++++++++++*#%%%*-:-=*##%##+======--------:::--=+*#%%*+====*%@@%+=*%@*.
                                       .#@@@@%*++*#%%%@@@@%*+#%%#**+-::==--:=+**#%%+:.:+%@@%%#*+=++***+==========+#%@@@%*+====*@@@@#=:+%@#:
                                        +@@@@@@@@@@@@@@%##*+++******##*+-.:-::::::::-+**#*+===++**+++++*****#####**=:..:-==+*##*+=-=+##+:
                                        :+%@@%%@%%##++*****++++****#%#++=+*#*+==------==++**##*+=-:. ..::...                 . .--:.
                                          -*@%*+=+++-:--===+*#%%%#+=---=+*++=-===-=*##%%*=-:.                  .          .:::--=*+.
                                            .+%%*+-:...:-=====----==--::---=+*##%%%*+-::...            ...:-+#%%#######%##+=+*+**#*.
                                               :+*##+--=****+====---===******+=-.  :---:::.        ..:-=+**+++*#**++++++===+=++#%*-
                                                  .:::-+#%%#*******##+=--=**+-.       .:--:.      :+*#####*******+---::::-+***##*:
                                                          .::-::..        -%%#+-..      -=-:    .:=*#%#%@%#####*+======--=++##%+
                                                                           :#@@#+=-::.   .--::...:=*####%%#*==-::::..:-=+***#*-.
                                                                            =%@@@%#**+=-.  .-==-::=*******++=--:::=+++*###*+-.
                                                                             .-+%%@@%#+-.    :-:::=++=-----:--=++++*#**#*=:
                                                                                   =*+=::..   :=+===-:--:...::=*####**+.
                                                                                   .=@%*=---.  ::::.:-===+*++=----:.
                                                                                    .*@@%*+=:..==       ...
                                                                                      =@@@@#=::==.
                                                                                       :#@@@%*+**=.
                                                                                        :+@@@###%%=
                                                                                         .=#@%###%*:
                                                                                           :+#@%#*-`;

export const AGENT_CLIENTS = ["Claude Code", "Cursor", "GitHub Copilot", "Codex", "PicoClaw"] as const;

export const AGENT_VIEW = `> search_memory("retry limit")
{
  "file": "processor.ts",
  "branch": "feat/payment-v2",
  "decision": "retry 5 → 3",
  "why": "backoff storm at load",
  "evidence": ["a3f4b2c"]
}`;

export const DIFF_LINES: ReadonlyArray<{ sign: "-" | "+"; text: string }> = [
  { sign: "-", text: "explain the codebase again at the start of every chat" },
  { sign: "-", text: "git blame tells you who changed it, never why" },
  { sign: "-", text: "incident triage across three tools and 40 minutes" },
  { sign: "+", text: "agents call search_memory and get the decision" },
  { sign: "+", text: "every function carries its branches and reasoning" },
  { sign: "+", text: "the incident timeline rebuilds itself in 30 seconds" },
];

export type Feature = {
  id: string;
  title: string;
  body: string;
  ascii: string;
  wide?: boolean;
};

export const FEATURES: ReadonlyArray<Feature> = [
  {
    id: "archaeology",
    title: "Hover any function to see why it exists",
    body: "Decision archaeology reads git history and your captured sessions, then shows the branches you tried, the approach you dropped, and the commit that settled it.",
    wide: true,
    ascii: `handleTokenExpiry()   94% sure
──────────────────────────────
changed   Prateek · Mar 14
commit    a3f4b2c
chose     queue over mutex
why       mutex cost ~40ms p99
tried     mutex → token queue`,
  },
  {
    id: "firewall",
    title: "Secrets never reach memory",
    body: "API keys, JWTs, bearer tokens, and private keys are stripped inside the extension before a snapshot is stored.",
    ascii: `OPENAI_API_KEY=████████████
Authorization: Bearer ██████
-----BEGIN ████ KEY-----
[ok] 3 secrets stripped`,
  },
  {
    id: "resurrection",
    title: "Pick up last week's branch in one step",
    body: "Files, terminal, and git state come back after you approve the plan. A simulator checks for unstashed changes and conflicts first.",
    ascii: `restore feat/auth-fix
  [ok] 0 unstashed files
  [ok] no branch conflicts
  → open 4 files, 2 terminals`,
  },
  {
    id: "incident",
    title: "Incident triage in 30 seconds",
    body: "A team timeline of edits, commits, deploys, and alerts replaces 40 minutes of digging across three tools.",
    ascii: `14:32 prateek  processor.ts
14:38 saketh   deploy staging
14:43 prateek  retry 5 → 3
14:44 monitor  ALERT down`,
  },
  {
    id: "mcp",
    title: "Stop pasting context into chat",
    body: "Claude Code, Cursor, and Copilot call search_memory and get_function_context directly, scoped to your project.",
    ascii: `tools/list
  search_memory
  get_context_for_task
  get_function_context
  get_raw_snapshots  +11`,
  },
];

export const TAGLINE = "Your code already knows why it looks this way. Now you and your agents never forget it.";

export const STEPS: ReadonlyArray<{ title: string; body: string; file: string }> = [
  {
    title: "Capture",
    body: "The extension snapshots open files, terminal commands, git state, and diagnostics, debounced so you keep decisions, not keystrokes.",
    file: "eventCapture.ts",
  },
  {
    title: "Scrub and store",
    body: "The semantic firewall strips secrets on your machine. Clean snapshots are embedded and written to per user memory.",
    file: "semanticFirewall.ts",
  },
  {
    title: "Recall",
    body: "Ask in VS Code or from any MCP agent. The retriever ranks your history and your team's by meaning and returns the decision with its evidence.",
    file: "retriever.py",
  },
];

export type MemoryId = "payment" | "auth" | "firewall" | "simulator" | "vectordb";

export type Memory = {
  id: MemoryId;
  file: string;
  branch: string;
  age: string;
  summary: string;
  detail: string;
  keywords: ReadonlyArray<string>;
};

export const MEMORIES: ReadonlyArray<Memory> = [
  {
    id: "payment",
    file: "src/payment/processor.ts",
    branch: "feat/payment-v2",
    age: "2h ago",
    summary: "Reduced retry limit from 5 to 3. Cascade failure risk at higher values under concurrent load.",
    detail:
      "Context: retry limit reduced from 5 to 3 to avoid an exponential backoff storm under concurrent load. Marked FIXME to revisit after load testing.\n\nEvidence: payment.test.ts failures, staging alert at 14:43.",
    keywords: ["retry", "payment", "incident", "prateek", "backoff"],
  },
  {
    id: "auth",
    file: "src/auth/tokenRefresh.ts",
    branch: "feat/auth-fix",
    age: "5h ago",
    summary: "Token queue pattern resolves the race when two requests hit expiry at the same time.",
    detail:
      "Context: token queue chosen over a mutex lock to cut latency under concurrent expiry. The mutex approach added ~40ms p99 in local benchmarks.",
    keywords: ["token", "auth", "refresh", "race", "mutex"],
  },
  {
    id: "firewall",
    file: "semanticFirewall.ts",
    branch: "feat/security",
    age: "1d ago",
    summary: "Detects secrets from the AST of each file, with a regex fallback.",
    detail:
      "Context: secret detection runs on the TypeScript Compiler API AST. A regex fallback catches keys, JWTs, bearer tokens, and private key formats.",
    keywords: ["secret", "firewall", "key", "security", "redact"],
  },
  {
    id: "simulator",
    file: "agents/simulator.py",
    branch: "feat/simulator",
    age: "2d ago",
    summary: "Simulator builds a conflict report from git diff before the executor runs.",
    detail:
      "Context: simulator checks detect unstashed files, branch conflicts, and running processes before any executor action. Unresolved risks block execution.",
    keywords: ["simulator", "conflict", "restore", "executor", "safety"],
  },
  {
    id: "vectordb",
    file: "services/vector_db.py",
    branch: "main",
    age: "3d ago",
    summary: "Team retrieval with scoped semantic search across personal and team namespaces.",
    detail:
      "Context: retrieval searches the personal namespace and the team namespace by semantic similarity, filtered by project and team metadata.",
    keywords: ["vector", "search", "team", "retrieval", "chroma"],
  },
];

export const SUGGESTIONS: ReadonlyArray<string> = [
  "why was the retry limit reduced",
  "token refresh race condition fix",
  "what is Prateek working on",
  "where are secrets handled",
];

export const STATS: ReadonlyArray<{ value: string; unit?: string; label: string; source: string }> = [
  { value: "41,536", label: "Snapshots indexed", source: "Memory store" },
  { value: "1,536", unit: "d", label: "Embedding dimensions", source: "Vector space" },
  { value: "15", unit: "+", label: "Tools for agents", source: "MCP server" },
  { value: "~2", unit: "s", label: "Typical retrieval", source: "Query latency" },
  { value: "Top 10", label: "Overall finish", source: "Microsoft AI Unlocked" },
];

export const FAQ: ReadonlyArray<{ q: string; a: string; link?: { label: string; href: string } }> = [
  {
    q: "What does SecondCortex capture?",
    a: "Open files, the active file, terminal commands, git branch and diff state, code comments, diagnostics, and function signatures. Snapshots are debounced, so you get a history of decisions rather than a keystroke log.",
  },
  {
    q: "Do my code or my secrets leave my machine?",
    a: "The semantic firewall runs inside the extension and strips API keys, JWTs, bearer tokens, and private keys before anything is stored. If you want zero network calls, run the fully local stack with ChromaDB and Ollama from the offline setup guide.",
  },
  {
    q: "Which AI agents can use the memory?",
    a: "Any MCP client. Claude Code, Cursor, GitHub Copilot, and Codex connect to the SecondCortex MCP server and call tools such as search_memory and get_function_context.",
  },
  {
    q: "How is this different from git blame or git log?",
    a: "Git records what changed. SecondCortex also keeps what surrounded the change: the files you had open, the commands you ran, the branches you tried and abandoned, and the comments you wrote while deciding.",
  },
  {
    q: "Can it change my workspace without asking?",
    a: "No. A restore starts as a plan you approve. Before anything runs, the simulator checks for unstashed changes, branch conflicts, and running processes, and it blocks the restore if a risk is unresolved.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. The offline setup guide runs storage on ChromaDB and models on Ollama, both on your machine, with no cloud dependency.",
    link: { label: "Read the offline setup guide", href: "/offline-setup" },
  },
  {
    q: "How much does it cost?",
    a: "Nothing. The extension is free on the VS Code Marketplace and the source is MIT licensed on GitHub.",
    link: { label: "View the source on GitHub", href: LINKS.github },
  },
  {
    q: "Does it work for teams?",
    a: "Team Cortex shares decisions across developers with team scoped isolation. The hosted team backend is offline while we rebuild it, and you can self host the backend from the repository today.",
  },
];

export const RISK_REVERSAL = ["Free", "MIT licensed", "Secrets stripped locally", "Runs fully offline"] as const;

export const WORDMARK = `███████╗███████╗ ██████╗ ██████╗ ███╗   ██╗██████╗
██╔════╝██╔════╝██╔════╝██╔═══██╗████╗  ██║██╔══██╗
███████╗█████╗  ██║     ██║   ██║██╔██╗ ██║██║  ██║
╚════██║██╔══╝  ██║     ██║   ██║██║╚██╗██║██║  ██║
███████║███████╗╚██████╗╚██████╔╝██║ ╚████║██████╔╝
╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝
 ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗
╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
 ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝`;

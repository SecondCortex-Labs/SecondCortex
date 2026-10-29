export const metadata = {
  title: 'SecondCortex - Offline Setup',
  description: 'Run the SecondCortex server on your own machine, with OpenAI or Ollama for answers.',
};

export default function OfflineSetupPage() {
  return (
    <main className="sc-dashboard-wrap offline-setup-page" style={{ paddingTop: '84px' }}>
      <div className="sc-dashboard-inner offline-setup-inner">
        <div className="sc-section-header offline-setup-header">
          <p className="section-label">Offline Setup</p>
          <h1 className="section-title">Run Fully Local</h1>
          <p className="section-desc">
            The SecondCortex server runs on your machine and keeps your memory there. The two options differ only in which model answers your questions.
          </p>
        </div>

        <div className="sc-dashboard-panel">
          <div className="sc-dashboard-panel-inner offline-panel-inner">
            <h2 className="sc-dashboard-h2">Option 1: Local memory + OpenAI</h2>
            <p className="sc-dashboard-p">Storage and search run locally. Only the questions you ask in the sidebar go to OpenAI.</p>
            <pre className="query-result offline-code" style={{ whiteSpace: 'pre-wrap' }}>{`# Install the server once, from the repo
cd secondcortex-local
pip install -e .

# Give it an OpenAI key for answers
# Windows (PowerShell)
$env:OPENAI_API_KEY = '<your key>'
# macOS/Linux
export OPENAI_API_KEY=<your key>

# Start it on http://127.0.0.1:8732
secondcortex serve`}</pre>
            <div className="offline-box">
              <h3 className="offline-subtitle">Installation Instructions</h3>
              <p className="sc-dashboard-p"><strong>Storage:</strong> ChromaDB runs inside the server and keeps your memory in <code>~/.secondcortex</code>. There is nothing else to start. The first start downloads the local embedding model (about 80 MB).</p>
            </div>
            <div className="offline-box">
              <h3 className="offline-subtitle">Links</h3>
              <div className="offline-link-list">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI API keys</a>
                <a href="https://docs.trychroma.com/" target="_blank" rel="noreferrer">ChromaDB Documentation</a>
                <a href="https://github.com/chroma-core/chroma" target="_blank" rel="noreferrer">ChromaDB GitHub</a>
              </div>
            </div>
          </div>
        </div>

        <div className="sc-dashboard-panel">
          <div className="sc-dashboard-panel-inner offline-panel-inner">
            <h2 className="sc-dashboard-h2">Option 2: Fully Local (ChromaDB + Ollama)</h2>
            <p className="sc-dashboard-p">Run storage and answers on your machine, with no cloud dependency at all.</p>
            <pre className="query-result offline-code" style={{ whiteSpace: 'pre-wrap' }}>{`# Step 1: Install Ollama locally and pull a model
ollama pull llama3.1

# Step 2: Start Ollama (runs on http://localhost:11434)
ollama serve

# Step 3: In a new terminal, point SecondCortex at Ollama and start it
# Windows (PowerShell)
$env:SECONDCORTEX_LLM_BASE_URL = 'http://localhost:11434/v1'
$env:SECONDCORTEX_LLM_MODEL = 'llama3.1'
secondcortex serve

# macOS/Linux
export SECONDCORTEX_LLM_BASE_URL=http://localhost:11434/v1
export SECONDCORTEX_LLM_MODEL=llama3.1
secondcortex serve`}</pre>
            <div className="offline-box">
              <h3 className="offline-subtitle">Installation Instructions</h3>
              <div className="sc-dashboard-p">
                <p><strong>Ollama Setup:</strong></p>
                <ol className="offline-steps">
                  <li>Download and install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a></li>
                  <li>Run <code>ollama pull llama3.1</code> to download the model (first time only)</li>
                  <li>Start the server with <code>ollama serve</code></li>
                  <li>Verify it is running at <a href="http://localhost:11434" target="_blank" rel="noreferrer">http://localhost:11434</a></li>
                </ol>
                <p><strong>Storage:</strong> ChromaDB runs inside the SecondCortex server. There is nothing else to start.</p>
              </div>
            </div>

            <div className="offline-box">
              <h3 className="offline-subtitle">Links</h3>
              <div className="offline-link-list">
                <a href="https://ollama.com/" target="_blank" rel="noreferrer">Ollama Official Website</a>
                <a href="https://github.com/ollama/ollama" target="_blank" rel="noreferrer">Ollama GitHub Repository</a>
                <a href="https://docs.trychroma.com/" target="_blank" rel="noreferrer">ChromaDB Documentation</a>
                <a href="https://github.com/chroma-core/chroma" target="_blank" rel="noreferrer">ChromaDB GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

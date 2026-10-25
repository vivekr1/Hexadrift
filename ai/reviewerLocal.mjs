// ai/reviewerLocal.mjs — LLM Code Reviewer Agent

import { exec } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// --- Configuration ---
const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:8080';
const SYSTEM_PROMPT = "You are reviewing a code change to a vanilla ESM browser game (no bundler, no TypeScript, no dependencies). Identify ONLY real bugs: runtime errors, logic errors, missing cleanup (pools not culled, listeners not removed), assertions that don't test what they claim, and tests that pass vacuously. Do NOT report style preferences, 'consider adding' suggestions, or anything you're less than 80% confident is a bug. Read the source files before claiming a bug — the diff alone is not enough. Read the test outputs before claiming a test is broken. If you find no bugs, say exactly: 'no bugs found'. Do not invent a bug to seem useful.";
const MAX_DIFF_SIZE = 100 * 1024;
const TIMEOUT_MS = 120000;

// --- Helpers ---

function runCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({
                stdout: stdout || '',
                stderr: stderr || '',
                code: error ? 1 : 0,
            });
        });
    });
}

async function fetchWithTimeout(endpoint, body, method = 'POST') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const opts = { method, signal: controller.signal };
        if (method !== 'GET' && body != null) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const response = await fetch(`${LLAMA_SERVER_URL}${endpoint}`, opts);
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('reviewer: llama-server timed out after 120s');
            process.exit(0);
        }
        throw error;
    }
}

// --- Main ---

async function main() {
    // 1. Preconditions
    const { stdout: branchName } = await runCommand('git rev-parse --abbrev-ref HEAD');
    const mainRef = await runCommand('git rev-parse main');
    const headRef = await runCommand('git rev-parse HEAD');

    if (branchName.trim() === 'main') {
        console.log('No changes to review');
        process.exit(0);
    }
    if (branchName.trim() === 'HEAD') {
        console.error('Cannot review from detached HEAD');
        process.exit(0);
    }
    if (mainRef.code !== 0 || headRef.code !== 0) {
        console.error('Error: Git repository state is invalid. Ensure you are in a git repository and "main" branch exists.');
        process.exit(0);
    }

    // Health check — GET
    try {
        await fetchWithTimeout('/health', null, 'GET');
    } catch (e) {
        console.error(`llama-server not reachable at ${LLAMA_SERVER_URL}. Start it with: llama-server -m <model.gguf> -c 32768 --port 8080 --jinja`);
        process.exit(0);
    }

    // 2. Data gathering
    const diffResult = await runCommand('git diff main...HEAD');
    let diffContent = diffResult.stdout;

    if (diffContent.length > MAX_DIFF_SIZE) {
        diffContent = diffContent.substring(0, MAX_DIFF_SIZE) + '\n[diff truncated]';
    }

    // Parse touched files from +++ b/... lines, strip b/ prefix
    const touchedFiles = new Set();
    for (const line of diffContent.split('\n')) {
        const m = line.match(/^\+\+\+\s+b\/(.+)/);
        if (m) {
            const p = m[1];
            if (p.startsWith('src/') || p.startsWith('test/')) {
                touchedFiles.add(p);
            }
        }
    }

    // Read source files
    const sourceFilesContent = {};
    for (const filePath of touchedFiles) {
        try {
            sourceFilesContent[filePath] = await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            // deleted or inaccessible; skip
        }
    }

    // Uncommitted changes
    const statusResult = await runCommand('git status --porcelain');
    const uncommittedChanges = [];
    for (const line of statusResult.stdout.split('\n')) {
        if (line.length === 0) continue;
        const filePath = line.substring(3).trim();
        if (filePath.startsWith('src/') || filePath.startsWith('test/')) {
            uncommittedChanges.push(filePath);
        }
    }
    if (uncommittedChanges.length > 0) {
        console.warn('WARNING: The working tree has uncommitted changes in src/ or test/: ' + uncommittedChanges.join(', '));
    }

    if (touchedFiles.size === 0 && uncommittedChanges.length > 0) {
        console.error('No committed changes to review. `git diff main...HEAD` is empty.');
        console.error('Uncommitted files present: ' + uncommittedChanges.join(', '));
        console.error('Commit your changes (git add + git commit) and re-run.');
        process.exit(0);
    }
    if (touchedFiles.size === 0) {
        console.log('No committed changes to review.');
        process.exit(0);
    }

    // Run tests — 'skip' if file missing
    const bootTestResult = existsSync('test/boot.mjs')
        ? await runCommand('node test/boot.mjs 2>&1')
        : { stdout: '', stderr: '', code: 'skip' };
    const determinismTestResult = existsSync('test/determinism.mjs')
        ? await runCommand('node test/determinism.mjs 2>&1')
        : { stdout: '', stderr: '', code: 'skip' };

    const testResults = {
        boot: bootTestResult.code === 'skip' ? 'skip' : (bootTestResult.code === 0 ? 'pass' : 'fail'),
        determinism: determinismTestResult.code === 'skip' ? 'skip' : (determinismTestResult.code === 0 ? 'pass' : 'fail'),
    };

    // Real line counts via numstat
    const numstatResult = await runCommand('git diff --numstat main...HEAD');
    let plusLines = 0;
    let minusLines = 0;
    for (const line of numstatResult.stdout.split('\n')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
            const a = parseInt(parts[0], 10);
            const d = parseInt(parts[1], 10);
            if (!isNaN(a)) plusLines += a;
            if (!isNaN(d)) minusLines += d;
        }
    }

    // Docs
    let agentLogContent = '';
    try {
        const logData = await fs.readFile('docs/agent-log.md', 'utf-8');
        agentLogContent = logData.substring(Math.max(0, logData.length - 1000));
    } catch { }
    let claudeMdContent = '';
    try {
        claudeMdContent = await fs.readFile('CLAUDE.md', 'utf-8');
    } catch { }

    // 3. Build user message
    const parts = [];
    parts.push('=== DIFF ===');
    parts.push(diffContent);
    parts.push('\n\n=== SOURCE FILES TOUCHED ===');
    for (const [file, content] of Object.entries(sourceFilesContent)) {
        parts.push(`\n--- ${file} ---\n${content}`);
    }
    parts.push('\n\n=== TEST OUTPUT ===');
    parts.push(`\n--- boot.mjs ---\n${bootTestResult.stdout}\n${bootTestResult.stderr}`);
    parts.push(`\n--- determinism.mjs ---\n${determinismTestResult.stdout}\n${determinismTestResult.stderr}`);
    parts.push('\n\n=== PROJECT CONTEXT ===');
    parts.push(`\n--- agent-log.md (last 1000 chars) ---\n${agentLogContent}`);
    parts.push(`\n--- CLAUDE.md ---\n${claudeMdContent}`);

    const userMessage = parts.join('\n');

    if (userMessage.length > 60000) {
        console.warn(`WARNING: prompt is ${userMessage.length} chars, may exceed server num_ctx. Consider -c 32768.`);
    }

    const apiBody = {
        model: 'gemma4',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
        ],
    };

    // 4. API call
    try {
        const response = await fetchWithTimeout('/v1/chat/completions', apiBody);
        const llmResponse = response.choices[0].message.content;

        console.log(`Branch: ${branchName.trim()} | Files: ${touchedFiles.size} (+${plusLines} -${minusLines} lines)`);
        console.log('');
        console.log(llmResponse);
        console.log('');
        console.log(`Test: boot=${testResults.boot} determinism=${testResults.determinism}`);
    } catch (e) {
        console.error(`An error occurred during API interaction: ${e.message}`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Fatal error in reviewerLocal.mjs:', err);
    process.exit(0);
});
# AI Code Reviewer Agent

This agent (`ai/reviewerLocal.mjs`) is designed to automatically review code changes by submitting the diff, source files, and test outputs to a local LLM server.

## 🚀 Usage
Run the agent from the repository root on a feature branch:
`node ai/reviewerLocal.mjs`

## ⚙️ Setup & Requirements
1.  **Llama Server:** You must have a local Llama.cpp server running.
2.  **Model Recommendation:** Qwen2.5-Coder 14B+ is strongly preferred for high-quality reviews. Gemma-4 E4B is under the practical floor — expect noisy reviews.

## ⚠️ Caveat
Local models, while powerful, can sometimes generate noisy or overly cautious reviews. They are excellent for catching obvious logic errors and missing cleanup, but they should be treated as a powerful first pass, not a final authority, especially when compared to commercial models like Sonnet-class.

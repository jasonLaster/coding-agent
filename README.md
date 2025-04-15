# JS Code Agent

A command-line AI coding assistant powered by Anthropic's Claude AI model. This agent helps with coding tasks through a chat interface and can perform file operations like reading, listing, and editing files.

## Features

- Interactive CLI chat interface with Claude AI
- File manipulation capabilities:
  - Read file contents
  - List files in directories
  - Edit files
- Built with TypeScript
- Telemetry via Braintrust for tracking interactions

## Prerequisites

- Node.js
- Bun runtime
- Anthropic API key
- Braintrust API key (optional for telemetry)

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Set up environment variables by creating a `.env` file:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   BRAINTRUST_API_KEY=your_braintrust_api_key  # Optional
   ```

## Usage

Start the agent:

```
pnpm start
```

or

```
bun agent.ts
```

Once running, you can interact with the agent through the command line. The agent can help with coding questions and perform file operations on your codebase.

Example commands:

- "Show me the contents of package.json"
- "List all files in the src directory"
- "Edit agent.ts to fix a bug"

Press Ctrl+C to exit the agent.

## Project Structure

- `agent.ts` - Entry point for the application
- `src/agent.ts` - Main agent implementation
- `src/tools.ts` - File operation tools implementation
- `src/logger.ts` - Logging functionality

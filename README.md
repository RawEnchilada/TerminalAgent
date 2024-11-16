# Terminal Agent

The **Terminal Agent** is a very small, locally hosted AI assistant that allows users to perform system tasks by interacting with their computer's shell through a natural language interface. It leverages tools and shell commands to complete tasks efficiently while ensuring safety and user control.

## Features

- **Shell Interaction:** Execute shell commands safely via user confirmation.
- **Tool Integration:** Use predefined tools for system information and more.
- **Command Validation:** Automatically validates commands for safety.
- **Flexible Model Loading:** Load AI models dynamically via environment variables. (Uses Ollama)
- **Interactive Command Selection:** Choose which commands to run, skip unsafe commands, or cancel altogether.


## Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** (version 14 or later)
- **npm** (Node Package Manager)
- A supported shell environment (e.g., Bash, Zsh, CMD, or PowerShell)
- A running instance of [Ollama](https://ollama.com/), with your preferred model pulled already.

---

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-repo/assistant-shell-interface.git
cd assistant-shell-interface
```
2. Install dependencies:
```bash
npm install
```

3. Configure your environment variable for the AI model (optional):
```bash
export MODEL="gemma2:2b"
```

## Usage

### Starting

Run the assistant by executing:
```bash        
node index.js
```

### Command Selection Options

When the assistant suggests shell commands, it offers several options for execution:

- Run All Commands: Type a to execute all suggested commands.
- Run Specific Commands: Enter the numbers corresponding to the commands you want to execute, separated by spaces (e.g., 1 2 3).
- Run Selected Commands: Specify specific commands to run (e.g., 1 4 to run commands 1 and 4).
- Cancel Execution: Press Enter without typing anything to cancel the execution.

## Tools
### Adding Tools

The assistant supports integration with tools for additional functionality. Tools are defined in the tools.js file. Each tool must:

- Export a function.name property.
- Include a callable method for executing the tool's functionality.

### Example Tool Definition
```js
export const getSystemInfoTool = () => ({
    function: { name: 'getSystemInfo', arguments: [] },
    callable: () => {
        const os = require('os');
        return `System Info: ${os.type()} ${os.release()} on ${os.arch()} architecture.`;
    }
});
```
To add this tool:

1. Import it into index.js:
```js
import { getSystemInfoTool } from './tools.js';
```
2. Add it to the tools array:
```js
const tools = [
    getSystemInfoTool(),
    // Additional tools...
];
```

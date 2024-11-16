import ollama from 'ollama';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { getSystemInfoTool, searchGoogleTool } from './tools.js';
import { isCommandSafe } from './utils.js';

const model = process.env.MODEL || 'llama3.2';

const tools = [
    getSystemInfoTool(),
    //searchGoogleTool()
];

const systemPrompt = `You are a locally hosted assistant with the capability to use the local computer's shell. The user will give you a task which you need to complete using the tools at your disposal and the user's shell.
Your outputs that are tagged with <command></command> will get executed on the machine if the user allows it. If you do not provide a <command></command> section, then the task is assumed to be finished!
You are also given a list of function tools, which you can use to interact with the system before providing a command. Make sure that you do no harm to the computer as you are given full access to it. Do not call commands that would reset your environment, like reboot, or poweroff or kill.
Your available tools are: ${JSON.stringify(tools.map(t => t.function.name))}. If you do not have a tool for the task, you can achieve it using the command tag.
Here is an example:

<example>
User:
Install the latest version of Node.js

Assistant:
The system information tool showed that you are using Ubuntu. On this machine, we can install Node.js using apt-get:

<command>
curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
sudo apt-get install -y nodejs
</command>
</example>`;

async function run(model) {
    console.log(chalk.green.bold('Welcome to the Assistant Shell Interface!\n'));

    const { userTask } = await inquirer.prompt([
        {
            type: 'input',
            name: 'userTask',
            message: chalk.cyan('Please enter the task you want to perform:'),
        },
    ]);

    let messages = [
        {
            role: 'system',
            content: systemPrompt,
        },
        { role: 'user', content: userTask },
    ];

    let taskFinished = false;

    while (!taskFinished) {
        const response = await ollama.chat({
            model: model,
            messages: messages,
            tools: tools,
        });

        messages.push(response.message);
        const llmResponse = response.message.content;

        // Check if the model decided to use any provided functions
        if (response.message.tool_calls && response.message.tool_calls.length > 0) {
            console.log(chalk.yellow('Assistant (Internal):'), llmResponse);
            for (const requested_tool of response.message.tool_calls) {
                const functionName = requested_tool.function.name.trim();
                try {
                    let functionResponse = "No tool found with this name";
                    tools.forEach((t) => {
                        if (t.function.name == functionName) {
                            functionResponse = t.callable(requested_tool.function.arguments);
                        }
                    });
                    messages.push({
                        role: 'tool',
                        content: functionResponse,
                    });
                    console.log(chalk.magenta(`Calling tool: ${functionName}: ${functionResponse.substring(0, 40)}...`));
                } catch (e) {
                    const errorMessage = `An error has occurred while calling the tool ${functionName}: ${e}`;
                    messages.push({
                        role: 'tool',
                        content: errorMessage,
                    });
                    console.log(chalk.red(errorMessage));
                }
            }
            continue;
        } else {
            console.log(chalk.yellow('Assistant:'), llmResponse);
        }

        const commandTagRegex = /<command>([\s\S]*?)<\/command>/g;
        const commandMatches = [...llmResponse.matchAll(commandTagRegex)];
        let commands = [];

        if (commandMatches.length > 0) {
            for (const match of commandMatches) {
                const commandText = match[1];
                commands.push(...commandText.split('\n').filter(line => line.trim() !== ''));
            }

            let safeCommands = [];
            let unsafeCommands = [];
            for (const cmd of commands) {
                if (isCommandSafe(cmd)) {
                    safeCommands.push(cmd);
                } else {
                    unsafeCommands.push(cmd);
                }
            }

            if (safeCommands.length > 0) {
                console.log(chalk.blue('\nThe assistant suggests the following commands:'));
                safeCommands.forEach((cmd, index) => {
                    console.log(chalk.greenBright(`${index + 1}. ${cmd}`));
                });
            }

            if (unsafeCommands.length > 0) {
                console.log(chalk.blue('\nThe assistant suggested some unsafe commands:'));
                unsafeCommands.forEach((cmd, index) => {
                    console.log(chalk.redBright(`${index + 1}. ${cmd}`));
                });
                console.log(chalk.blue('These will be skipped!'));
            }

            const { commandChoice } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'commandChoice',
                    message: chalk.cyan('Please enter the numbers of the commands you want to execute separated by spaces, "y" or "a" to run all, or press Enter to cancel:'),
                },
            ]);
            
            let selectedCommands = [];

            if (commandChoice.trim().toLowerCase() === 'a' || commandChoice.trim().toLowerCase() === 'y') {
                selectedCommands = safeCommands;
            } else if (commandChoice.trim().length === 0) {
                console.log(chalk.red('Execution cancelled by user.'));
                taskFinished = true;
                return;
            } else {
                const indices = commandChoice.trim().split(/\s+/).map(s => parseInt(s));
                if (indices.every(n => Number.isInteger(n) && n >= 1 && n <= safeCommands.length)) {
                    selectedCommands = indices.map(i => safeCommands[i - 1]);
                } else {
                    console.log(chalk.red('Invalid selection. Execution cancelled.'));
                    taskFinished = true;
                    return;
                }
            }

            let commandOutputs = '';
            for (const cmd of selectedCommands) {
                console.log(chalk.blue(`\nExecuting: ${chalk.greenBright(cmd)}`));

                await new Promise((resolve) => {
                    // Use spawn instead of exec
                    const child = spawn(cmd, {
                        shell: true,
                        stdio: 'inherit', // Inherit stdin, stdout, stderr
                    });

                    child.on('close', (code) => {
                        if (code !== 0) {
                            console.error(chalk.red(`Command "${cmd}" exited with code ${code}`));
                            commandOutputs += `Command "${cmd}" exited with code ${code}\n`;
                        } else {
                            console.log(chalk.green(`Command "${cmd}" executed successfully.`));
                            commandOutputs += `Command "${cmd}" executed successfully.\n`;
                        }
                        resolve();
                    });

                    child.on('error', (error) => {
                        console.error(chalk.red(`Error executing command "${cmd}": ${error.message}`));
                        commandOutputs += `Error executing command "${cmd}": ${error.message}\n`;
                        resolve();
                    });
                });
            }

            messages.push({
                role: 'system',
                content: `Output of your previous commands:\n${commandOutputs}`,
            });
        } else {
            taskFinished = true;
            console.log(chalk.green.bold('\nTask completed.'));
        }
    }
}

run(model).catch(error => console.error(chalk.red('An error occurred:'), error));

const { spawn } = require('child_process');
const path = require('path');
const input = require('input'); // Make sure to install the input package

async function startChildProcesses() {
    // List of bot directories
    const botNames = ['tg1', 'tg2', 'tg3', 'tg4', 'tg5', 'tg6', 'tg7', 'tg8', 'tg9', 'tg10'];

    // Start each bot process
    const childProcesses = botNames.map(bot => {
        const botPath = path.join(__dirname, bot, 'index.js');
        const botCwd = path.join(__dirname, bot);

        console.log(`Starting process for: ${botPath}`);

        const child = spawn('node', [botPath], { stdio: 'pipe', cwd: botCwd }); // Use 'pipe' for stdio

        child.on('error', (err) => {
            console.error(`Failed to start child process for ${bot}: ${err}`);
        });

        child.on('close', (code) => {
            console.log(`Child process for ${bot} exited with code ${code}`);
        });

        return child; // Return the child process for later use
    });

    // Loop for continuous input
    while (true) {
        const buttonChoice = await input.text('Choose a button number to click for all bots (or type "exit" to stop): ');

        if (buttonChoice.toLowerCase() === 'exit') {
            console.log('Exiting all bot processes...');
            childProcesses.forEach(child => child.kill()); // Kill all child processes
            break;
        }

        // Send the button choice to all bot processes
        childProcesses.forEach(child => {
            child.stdin.write(buttonChoice + '\n'); // Send the input and simulate pressing 'Enter'
        });
    }
}

// Start the child processes
startChildProcesses();

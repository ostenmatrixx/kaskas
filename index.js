const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const input = require('input');
const fs = require('fs');

const apiId = '25788359';
const apiHash = '0222048cd1e6c15f81515a9187f8dc8f';
const sessionFilePath = './session.txt';
let sessionString = '';

if (fs.existsSync(sessionFilePath)) {
    sessionString = fs.readFileSync(sessionFilePath, 'utf8');
}

const stringSession = new StringSession(sessionString);
const botUsernames = [
    '@kspr_1_bot', '@kspr_2_bot', '@kspr_3_bot', '@kspr_4_bot',
    '@kspr_5_bot', '@kspr_6_bot', '@kspr_7_bot', '@kspr_8_bot',
    '@kspr_9_bot', '@kspr_10_bot'
];

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main bot-clicking function with a delay and error handling
async function clickButtonWithDelay(client, botUsername, messageId, buttonData, delayMs) {
    try {
        await delay(delayMs);
        await client.invoke(new Api.messages.GetBotCallbackAnswer({
            peer: botUsername,
            msgId: messageId,
            data: Buffer.from(buttonData || ''),
        }));
        console.log(`Button clicked successfully for ${botUsername}`);
    } catch (error) {
        // Ignore BOT_RESPONSE_TIMEOUT errors and only log other errors
        if (error.errorMessage !== 'BOT_RESPONSE_TIMEOUT') {
            console.error(`Error clicking button for ${botUsername}:`, error);
        }
    }
}

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    if (!sessionString) {
        await client.start({
            phoneNumber: async () => await input.text('Please enter your phone number: '),
            password: async () => await input.text('Please enter your password: '),
            phoneCode: async () => await input.text('Please enter the code you received: '),
            onError: (err) => console.log('Error: ', err),
        });

        fs.writeFileSync(sessionFilePath, client.session.save(), 'utf8');
    }

    await client.connect();

    while (true) {
        const customMessage = await input.text('Your message to all bots or "button" to click a button: ');

        if (customMessage.toLowerCase() === 'exit') {
            console.log('Exiting chat...');
            break;
        }

        if (customMessage === "button") {
            const buttonData = [];
            const buttonMap = new Map();
            let buttonCounter = 1;

            for (const botUsername of botUsernames) {
                try {
                    const bot = await client.getEntity(botUsername);
                    console.log(`Fetching messages from ${botUsername}...`);
                    let getMessages = await client.getMessages(bot, { limit: 5 });

                    if (getMessages.length > 0 && getMessages[0].replyMarkup) {
                        console.log(`Found a message with replyMarkup in ${botUsername}`);
                        const buttons = getMessages[0].replyMarkup.rows[0].buttons;

                        if (buttons.length > 0) {
                            buttons.forEach(button => {
                                const buttonText = button.text;

                                if (!buttonMap.has(buttonText)) {
                                    buttonMap.set(buttonText, buttonCounter++);
                                }

                                buttonData.push({
                                    botUsername,
                                    messageId: getMessages[0].id,
                                    button,
                                    displayNumber: buttonMap.get(buttonText)
                                });
                            });
                        } else {
                            console.log(`No buttons found in the reply markup for ${botUsername}`);
                        }
                    } else {
                        console.log(`No reply markup found in the latest message for ${botUsername}`);
                    }
                } catch (error) {
                    console.error(`ERROR Fetching button data for ${botUsername}:`, error);
                }
            }

            if (buttonData.length > 0) {
                console.log("Available buttons:");
                buttonData.forEach((btnObj) => {
                    console.log(`${btnObj.displayNumber}: ${btnObj.button.text} (from ${btnObj.botUsername})`);
                });

                const buttonChoice = await input.text('Choose a button number to click: ');
                const buttonIndex = parseInt(buttonChoice);

                if (!isNaN(buttonIndex) && buttonIndex > 0 && buttonIndex < buttonCounter) {
                    const selectedButtons = buttonData.filter(btnObj => btnObj.displayNumber === buttonIndex);

                    // Execute button clicks with a 2-second delay between each bot
                    await Promise.allSettled(
                        selectedButtons.map((selectedButton, i) => 
                            clickButtonWithDelay(client, selectedButton.botUsername, selectedButton.messageId, selectedButton.button.data, i * 2000)
                        )
                    );
                } else {
                    console.log(`Invalid button number: ${buttonChoice}`);
                }
            } else {
                console.log('No buttons available to click.');
            }
        } else {
            for (const botUsername of botUsernames) {
                try {
                    const bot = await client.getEntity(botUsername);
                    await client.sendMessage(bot, { message: customMessage });
                    console.log(`Message sent to ${botUsername}: ${customMessage}`);
                } catch (error) {
                    console.error(`Failed to send message to ${botUsername}: `, error);
                }
            }
        }
    }
})();

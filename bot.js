'use strict';
var Client = require('./src/client');
var commands = require('./src/commands');
var config = require('./config');
var readline = require('readline');
var bot = new Client(commands, config);

let rl = readline.createInterface(process.stdin, process.stdout);
bot.start(false, rl);
rl.setPrompt('Bot> ');
rl.prompt(true);

rl.on('line', function(line) {
    var bye = ['exit', 'quit', 'q'];
    if (bye.indexOf(line) !== -1) {
        process.exit(1);
    }

    if (/^say\b/.test(line)) {
        let msg = line.replace('say ', '');
        bot.sendMessage({
            to: '117487550733615105',
            message: msg
        });
    }
    rl.prompt();
});

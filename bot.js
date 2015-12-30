'use strict';
var Client = require('./src/client');
var commands = require('./src/commands');
var config = require('./config');
var secrets = require('./secrets');
var readline = require('readline');
var bot = new Client(commands, config, secrets);

let channels = secrets.channels;

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
        let channelIdReg = /^(#[\w-]+)\s{1}/;
        let to = secrets.channels['#default'];

        if (channelIdReg.test(msg)) {
            let channel = channelIdReg.exec(msg)[0].trim();

            to = channels[channel];
            msg = msg.replace(channelIdReg, '');
        }

        bot.sendMessage({
            to: to,
            message: msg
        });
    }

    if (/^channels$/.test(line)) {
        bot.log(JSON.stringify(channels));
    }

    if (/^state$/.test(line)) {
        bot.log(Object.keys(bot));
    }

    rl.prompt(true);
});

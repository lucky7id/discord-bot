var Client = require('./src/client');
var commands = require('./src/commands');
var config = require('./config');
var bot = new Client(commands, config);

bot.start();

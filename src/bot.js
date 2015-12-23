var Client = require('./client');
var commands = require('./commands');
var config = require('../config');
var bot = new Client(commands, config);

bot.start();

'use strict';
let timer = require('node-timer');
let request = require('request');
let Throttler = require('./throttler');
let Commands =  class Commands extends Object {
    constructor(bot) {
        super();
        this.cmds = {};
        this.users = {};
        this.keywords = [];
        this.throttler = new Throttler(this, this.users, timer)
    }

    wire(bot) {
        if (!bot) {
            throw new Error('Commands requires an instace of Discord')
        }

        this.bot = bot;

        return this;
    }

    addCmd(cmd) {
        if (this.getCmd(cmd)) {
            throw new Error(`Command ${cmd.name} already exists`);
        }

        this.cmds[cmd.name] = cmd;
    }

    addCmds(cmds) {
        cmds.forEach(cmd => {
            this.addCmd(cmd);

            if (cmd.scope === '*') {
                this.keywords.push(cmd.name);
            }
        });
    }

    getCmd(cmd) {
        let result = this.cmds[cmd];
        let keywords = [];

        if (result) { return result; }

        keywords = this.keywords.filter(word => {
            return cmd.indexOf(word) !== -1;
        });

        return keywords.length && this.cmds[keywords[0]];
    }

    exec(cmd, params) {
        let parsed = this.getCmd(cmd);

        if (!this.bot) {throw new Error('Commands requires an instace of Discord')}
        if (!parsed) { throw new Error(`Command ${cmd} does not exist`);}

        if (this.throttler.isThrottled(params.user)) {
            return;
        }

        parsed.fn.call(this, params);
        this.throttler.throttleUser(params.user);
    }


    toString() {
        let helpText = Object.keys(this.cmds)
            .filter(key => {
                return this.cmds[key].description !== 'secret';
            })
            .map(key => {
                let cmd = this.cmds[key];

                return `${cmd.name}: ${cmd.description}`
            }).join('\n');

        return `\`\`\`Avialable Commands: \n${helpText}\n\`\`\``;
    }
};

let commands = new Commands();
let startupCmds = [
    {
        name: '/help',
        description: 'Displays a helpful list of commands',
        fn: function(params) {
            this.bot.sendMessage({
                typing: true,
                to: params.channelID,
                message: this.toString()
            });
        }
    },{
        name: '/roll',
        description: 'Rolls a 10 faced die',
        fn: function(params) {
            let val = Math.floor(Math.random() * 10) + 1
            this.bot.sendMessage({
                typing: true,
                to: params.channelID,
                message: `<@${params.userID}> cast the die and got ${val}`
            });
        }
    }, {
        name: 'kiji',
        scope: '*',
        description: 'secret',
        fn: function(params) {
            request.get('http://catfacts-api.appspot.com/api/facts?number=1',
                (e, res, body) => {
                    if (res.statusCode !== 200) { return; }
                    let message = JSON.parse(body).facts[0];

                    message = message.replace(/cat/gi, 'kiji');
                    message = message.replace(/kitten/gi, 'young kiji');
                    console.log(`Kiji fact found: ${message}`);
                    this.bot.sendMessage({
                        typing: true,
                        to: params.channelID,
                        message: message
                    });
                });
        }
    }
];

commands.addCmds(startupCmds);

module.exports = commands;

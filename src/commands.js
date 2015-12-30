'use strict';
let timer = require('node-timer');
let request = require('request');
let Throttler = require('./throttler');
let BaseCommand = require('./base-command');
let fs = require('fs');

let UserCommands =  class Commands extends BaseCommand {
    constructor() {
        super();
        this.throttler = new Throttler(this, this.users, timer);
    }

    exec (cmd, params) {
        let parsed = this.getCmd(cmd);

        this.bot = this.context;

        if (!this.bot) { throw new Error('Commands requires an instace of Discord') }
        if (!parsed) { throw new Error(`Command ${cmd} does not exist`);}

        if (this.throttler.isThrottled(params.user)) {
            return;
        }

        parsed.fn.call(this, params);
        this.throttler.throttleUser(params.user);
    }

    sendError(params) {
        this.bot.sendMessage({
            to: params.channelID,
            message: 'Nice try guy.'
        });
    }
};

let commands = new UserCommands();
let startupCmds = [
    {
        name: '/help',
        description: 'Displays a helpful list of commands',
        fn: function(params) {
            this.bot.sendMessage({
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

                    message = message
                        .replace(/\bcat[s]{0,1}\b/gi, 'kiji')
                        .replace(/kitten/gi, 'young kiji');

                    this.bot.log(`Kiji fact found: ${message}`);
                    this.bot.sendMessage({
                        to: params.channelID,
                        message: message
                    });
                });
        }
    }, {
        name: 'pride',
        scope: '*',
        description: 'secret',
        fn: function(params) {
            request.get('http://api.icndb.com/jokes/random/',
                (e, res, body) => {
                    if (res.statusCode !== 200) { return; }
                    let message = JSON.parse(body).value.joke.toString();

                    message = message.replace(/Chuck Norris/gi, 'Pride');
                    this.bot.log(`Pride fact found: ${message}`);
                    this.bot.sendMessage({
                        to: params.channelID,
                        message: message
                    });
                });
        }
    }, {
        name: '/join',
        description: 'Bot will attempt to join a server provided a link',
        fn: function(params) {
            let invite;
            if (!/discord\.gg/.test(params.message)) {
                this.bot.sendMessage({
                    to: params.channelID,
                    message: 'Not a valid invite link'
                });

                return;
            }

            invite = params.message.split('/').pop();
            this.bot.log(invite);
            this.bot.acceptInvite(invite, (res) => {
                this.bot.log(res);
            });
        }
    }, {
        name: '/sitonmyface',
        description: 'you know',
        fn: function(params) {
            this.bot.uploadFile({
                channel: params.channelID,
                file: fs.createReadStream('./assets/facesit.jpg')
            }, (response) => { //CB Optional
                this.bot.log(response);
            });
        }
    }, {
        name: '/desu',
        description: 'you know',
        fn: function(params) {
            fs.readdir('./assets/', (error, files) => {
                let desulist = files.filter((item) => {
                    return /desu/i.test(item);
                });
                let rand = Math.floor(Math.random() * desulist.length);
                let desu = desulist[rand];

                this.bot.log(`rand: ${rand},
                    desu: ${JSON.stringify(desu)},
                    len: ${desulist.length}`
                );

                this.bot.uploadFile({
                    channel: params.channelID,
                    file: fs.createReadStream(`./assets/${desu}`)
                }, (response) => {
                    this.bot.log(response);
                });
            });
        }
    }, {
        name: '/spam',
        description: 'secret',
        fn: function(params) {
            let cmdReg = /(\/\w+\b)/;

            if (!this.throttler.isMe(params.user)) { this.sendError(params); }

        }
    }
];

commands.addCmds(startupCmds);

module.exports = commands;

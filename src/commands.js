'use strict';
let timer = require('node-timer');
let Commands =  class Commands extends Object {
    constructor(bot) {
        super();
        this.cmds = {};
        this.users = {};
    }

    wire(bot) {
        if (!bot) {
            throw new Error('Commands requires an instace of Discord')
        }

        this.bot = bot;

        return this;
    }

    addCmd(cmd) {
        if (this.cmds[cmd.name]) {
            throw new Error(`Command ${cmd.name} already exists`);
        }

        this.cmds[cmd.name] = cmd;
    }

    addCmds(cmds) {
        cmds.forEach(cmd => {
            this.addCmd(cmd);
        });
    }

    exists(cmd) {
        return !!this.cmds[cmd];
    }

    exec(cmd, params) {
        if (!this.bot) {throw new Error('Commands requires an instace of Discord')}
        if (!this.exists(cmd)) { throw new Error(`Command ${cmd} does not exist`);}

        if (this.isThrottled(params.user)) {
            return;
        }

        this.cmds[cmd].fn.call(this, params);
        this.throttleUser(params.user);
    }

    throttleUser(user) {
        if (!this.users[user]) {
            this.users[user] = this.getNewUser(user);
        }

        let userData = this.users[user];

        userData.cmdCount += 1;

        if (userData.cmdCount >= 5) {
            userData.throttled = true;
        }

        userData.timer.cancel();
        userData.timer.start();
    }

    getNewUser(user) {
        return {
            cmdCount: 0,
            throttled: false,
            timer: timer(user, 10000).oninterval(() => {
                console.log(`clearing ${user}'s timer'`);
                this.clearUserCmdCount(user);
            })
        };
    }

    removeUser(user) {
        let userData = this.users[user];

        if (!userData) { return; }

        userData.timer.end();
        delete this.users[user];
        console.log(`removed user ${user}`);
    }

    isThrottled(user) {
        let userData = this.users[user]

        if (!userData) { return false; }

        return userData.throttled;
    }

    clearUserCmdCount(user) {
        let userData = this.users[user];

        userData.cmdCount = 0;
        userData.throttled = false;
        userData.timer.cancel();
    }

    toString() {
        let helpText = Object.keys(this.cmds)
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
    }
];

commands.addCmds(startupCmds);

module.exports = commands;

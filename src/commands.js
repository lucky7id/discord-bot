'use strict';
let Commands =  class Commands extends Object {
    constructor(bot) {
        super();
        this.cmds = {};
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

    exists(cmd) {
        return !!this.cmds[cmd];
    }

    exec(cmd, params) {
        if (!this.bot) {throw new Error('Commands requires an instace of Discord')}
        if (!this.exists(cmd)) { throw new Error(`Command ${cmd} does not exist`);}

        this.cmds[cmd].fn.call(this, params);
    }

    toString() {
        let helpText = Object.keys(this.cmds).map(key => {
            let cmd = this.cmds[key];
            return `-${cmd.name}: ${cmd.description}`
        });

        return `\`\`\`Avialable Commands:
        ${helpText}
        \`\`\``;
    }
};

let commands = new Commands();

commands.addCmd({
    name: '/help',
    description: 'Displays a helpful list of commands',
    fn: function(params) {
        this.bot.sendMessage({
            to: params.channelID,
            message: this.toString()
        });
    }
});

module.exports = commands;

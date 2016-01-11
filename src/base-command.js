'use strict';
let BaseCommands =  class BaseCommands extends Object {
    constructor () {
        super();
        this.cmds = {};
        this.users = {};
        this.keywords = [];
        this.context = undefined;
    }

    wire (context) {
        if (!context) {
            throw new Error('Base Commands requires an execution context')
        }

        this.context = context;

        return this;
    }

    addCmd (cmd) {
        if (this.getCmd(cmd.name)) {
            throw new Error(`Command ${cmd.name} already exists`);
        }

        this.cmds[cmd.name] = cmd;
    }

    addCmds (cmds) {
        cmds.forEach(cmd => {
            this.addCmd(cmd);

            if (cmd.scope === '*') {
                this.keywords.push(cmd.name);
            }
        });
    }

    getCmd (msg) {
        if (!msg) { return; }

        let cmd = msg.split(' ')[0];
        let result = this.cmds[cmd];
        let keywords = [];

        if (result) { return result; }

        keywords = this.keywords.filter(word => {
            var reg = new RegExp(word, 'gi');
            return reg.test(msg);
        });

        return keywords.length && this.cmds[keywords[0]];
    }

    exec (cmd, params) {
        let parsed = this.getCmd(cmd);

        if (!this.context) {throw new Error('Commands require a context to run'); }
        if (!parsed) { throw new Error(`Command ${parsed} does not exist`); }

        parsed.message = parsed.message.replace(
            new RegExp(`${parsed.name}\s*`),
            ''
        );
        parsed.fn.call(this, params);
    }

    canExec (cmd, params) {
        let ctx = this.context;
        let allowed = cmd.allowed || [];
        let isMe = ctx.commands.isMe(params.userID);
        let perms = ctx.getPermsForUser(params.userID);
        let isBlacklisted = ctx.secrets.blacklist.indexOf(params.userID) !== -1;

        switch (true) {
            case isBlacklisted:
                return false;
            case (perms.nocmds.indexOf(cmd.name) !== -1):
                return false;
            case (perms.cmds.indexOf(cmd.name) !== -1):
                return true;
            case (allowed.indexOf('*') !== -1):
                return true;
            case isMe:
                return true;
            default:
                return false;
        }
    }

    parseArgs (str) {
        let args = str.split(' ');
        let parsed = {};

        for (let str of args) {
            if (str.indexOf(':') === -1) { continue; }
            let arg = str.split(':');

            parsed[arg[0]] = arg[1];
        }

        return parsed;
    }

    toString (params) {
        let helpText = Object.keys(this.cmds)
            .filter(key => {
                let cmd = this.cmds[key];

                return this.canExec(cmd, params);
            })
            .map(key => {
                let cmd = this.cmds[key];

                return `${cmd.name}: ${cmd.description}`
            }).join('\n');

        return `\`\`\`Avialable Commands: \n${helpText}\n\`\`\``;
    }


};

module.exports = BaseCommands;

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

        parsed.message = parsed.message.replace(cmd.name + ' ', '');
        parsed.fn.call(this, params);
    }

    canExec (cmd, params) {
            if (!cmd.roles && !cmd.users) {
                return true;
            }

            if (cmd.roles) {

            }
    }

    toString () {
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

module.exports = BaseCommands;

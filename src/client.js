'use strict';
let Discord = require('discord.io');
let pretty = require('prettyjson');
let fs = require('fs');

function getParamsFromArgs(user, userID, channelID, message, rawEvent) {
    return {
        user: user,
        userID: userID,
        channelID: channelID,
        message: message,
        rawEvent: rawEvent
    };
};

module.exports = class Client extends Discord {
    constructor(commands, config, secrets, AudioCtrl) {
        super(config);
        this.commands = commands.wire(this);
        this.secrets = secrets;
        this.audioCtrl = new AudioCtrl(this);
    }

    start(debug, shell) {
        if (debug) { this.on('debug', this.debug); }

        this.shell = shell;
        this.on('message', this.handleMessage);
        this.on('presence', this.handlePresence);
    }

    handleMessage(user, userID, channelID, message, rawEvent) {
        if (user === this.username) { return; }
        if (this.commands.getCmd(message)) {
            let params = getParamsFromArgs(user, userID, channelID, message, rawEvent);

            this.commands.exec(message, params);
        }
    }

    handlePresence(user, userID, status, rawEvent) {
        switch (status) {
            case 'idle':
            case 'offline':
                this.commands.throttler.removeUser(user);
                break;
            default:
                //this.log(`user ${user} came online`)
                return;
        }
    }

    findMe() {
        let me = this.secrets.id;
        return Object.keys(this.servers).reduce((prev, current) => {
            let channel = this.servers[current].members[me]

            if (prev) return prev;

            return (channel && channel.voice_channel_id) || false;
        }, false)
    }

    findMember (user, members, id) {
        if (id) { return members[id]; }

        for (let id in members) {
            if (members[id].user.username.toLowerCase() === user.trim()) {
                return members[id];
            }
        }

        return false;
    }

    find(user, params, id) {
        let serverId = this.serverFromChannel(params.channelID);
        let serverObj = this.servers[serverId];

        if (serverId && serverObj) {
            return this.findMember(user, serverObj.members, id);
        }

        for (let server in this.servers) {
            let found = this.findMember(user, this.servers[server].members, id);
            if (found) {return found;}
        }
    }

    debug(m) {
        if (m.t === 'MESSAGE_CREATE') {
            this.log(JSON.stringify(m));
        }
    }

    log() {
        console.log(`\n\n${Array.prototype.slice.apply(arguments)} ${new Date().toJSON()}`);

        if (this.shell) {
            this.shell.prompt(true);
            return;
        }
    }

    savePerms() {
        fs.writeFile('secrets.json', JSON.stringify(this.secrets), err =>{
            if (err) {this.log('permissions failed to save')}

            this.log('successfully updated permissions');
            this.secrets = require('../secrets');
        });
    }

    setPermission(params, save) {
        let user = this.getPermsForUser(params.userId);

        user.cmds.push(params.cmd);
        user.nocmds = user.nocmds.filter(cmd => {
            return cmd !== params.cmd;
        });

        if (save) {this.savePerms();}
    }

    unsetPermission(params, save) {
        let user = this.getPermsForUser(params.userId);

        user.cmds = user.cmds.filter(cmd => {
            return cmd !== params.cmd;
        });

        user.nocmds.push(params.cmd);

        if (save) {this.savePerms();}
    }

    addBlacklist(userId, save) {
        let blacklist = this.secrets.blacklist;

        blacklist.push(userId);

        if (save) {this.savePerms();}
    }

    removeBlacklist(userId, save) {
        let blacklist = this.secrets.blacklist;

        this.secrets.blacklist = blacklist.filter(id => {
            return id !== userId;
        });
        console.log(blacklist);
        if (save) {this.savePerms();}
    }

    getPermsForUser(userId) {
        let permissions = this.secrets.permissions;
        let user = permissions[userId] = permissions[userId] || {};

        user.cmds = user.cmds || [];
        user.nocmds = user.nocmds || [];

        return user;
    }


};

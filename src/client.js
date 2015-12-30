'use strict';
var Discord = require('discord.io');
var pretty = require('prettyjson')

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
    constructor(commands, config, secrets) {
        super(config);
        this.commands = commands.wire(this);
        this.secrets = secrets;
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
            this.log(pretty.render(this.servers[current].members[me]), prev)
            if (prev) return prev;

            return (channel && channel.voice_channel_id) || false;
        }, false)
    }

    debug(m) {
        if (m.t === 'MESSAGE_CREATE') {
            this.log(JSON.stringify(m));
        }
    }

    log() {
        console.log(`\n\nSERVER LOG: ${Array.prototype.slice.apply(arguments)}\n`);

        if (this.shell) {
            this.shell.prompt(true);
            return;
        }
    }
};

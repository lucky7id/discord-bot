'use strict';
var Discord = require('discord.io');

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

    debug(m) {
        if (m.t === 'MESSAGE_CREATE') {
            this.log(JSON.stringify(m));
        }
        //this.log(JSON.stringify(arguments));
    }

    log(msg) {
        console.log(`\n\nSERVER LOG: ${msg}\n`);

        if (this.shell) {
            this.shell.prompt(true);
            return;
        }
    }
};

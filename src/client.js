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
    constructor(commands, config) {
        super(config);
        this.commands = commands.wire(this);
    }

    start(debug) {
        if (debug) { this.on('debug', this.debug); }

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
            case 'away':
                this.commands.throttler.removeUser(user);
                break;
            default:
                return;
        }
    }

    debug() {
        console.log(arguments);
    }
};

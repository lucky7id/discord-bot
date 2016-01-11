'use strict';
module.exports = class Throttler extends Object {
    constructor(cmd, users, timer) {
        super();
        this.cmd = cmd;
        this.users = users;
        this.timer = timer;
    }

    isMe(user) {
        let secrets = this.cmd.bot.secrets;

        return (user === secrets.me || user === secrets.id)
    }

    getNewUser(user) {
        return {
            cmdCount: 0,
            throttled: false,
            timer: this.timer(user, 10000).oninterval(() => {
                this.cmd.bot.log(`clearing ${user}'s timer`);
                this.clearUserCmdCount(user);
            })
        };
    }

    removeUser(user) {
        let userData = this.users[user];

        if (!userData) { return; }

        userData.timer.end();
        delete this.users[user];
        this.cmd.bot.log(`removed user ${user}`);
    }

    throttleUser(user) {
        if (this.isMe(user)) { return false;}

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
};

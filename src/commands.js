'use strict';
let timer = require('node-timer');
let request = require('request');
let Throttler = require('./throttler');
let BaseCommand = require('./base-command');
let ytube = require('youtube-dl');
let fs = require('fs');
let pretty = require('prettyjson');
let fork = require('child_process').fork;

let UserCommands =  class Commands extends BaseCommand {
    constructor() {
        super();
        this.throttler = new Throttler(this, this.users, timer);
        this.isMe = this.throttler.isMe.bind(this.throttler);;
        this.threadFinders = {};
    }

    exec (cmd, params) {
        let parsed = this.getCmd(cmd);

        this.bot = this.context;

        if (!this.bot) { throw new Error('Commands requires an instace of Discord') }
        if (!parsed) { throw new Error(`Command ${parsed} does not exist`);}

        if (this.throttler.isThrottled(params.user)) {
            return;
        }

        if (!this.canExec(parsed, params)) { return this.sendError(params); }

        params.message = params.message.replace(
            new RegExp(`${parsed.name}\s*`),
            ''
        );

        try {
            parsed.fn.call(this, params);
        } catch (e) {
            this.bot.sendMessage({
                to: params.channelID,
                message: `\`\`\`${e.stack}\`\`\``
            });
        }
        this.throttler.throttleUser(params.user);
        this.bot.log(`${params.user} used ${parsed.name}`)
    }

    sendError(params) {
        this.bot.sendMessage({
            to: params.channelID,
            message: 'Nice try guy.'
        });
    }

    removeCmdHistory (params) {
        this.bot.deleteMessage({
            channel: params.channelID,
            messageID: params.rawEvent.d.id
        });
    }
};

let commands = new UserCommands();
let startupCmds = [
    {
        name: '/help',
        allowed: ['*'],
        description: 'Displays a helpful list of commands',
        fn: function (params) {
            this.bot.sendMessage({
                to: params.channelID,
                message: this.toString(params)
            });
        }
    },{
        name: '/roll',
        allowed: ['*'],
        description: 'Rolls a 10 faced die',
        fn: function (params) {
            let val = Math.floor(Math.random() * 10) + 1

            this.bot.sendMessage({
                to: params.channelID,
                message: `<@${params.userID}> cast the die and got ${val}`
            });
        }
    }, {
        name: '/join',
        description: 'Bot will attempt to join a server provided a link',
        fn: function (params) {
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
        allowed: ['*'],
        description: 'you know',
        fn: function (params) {
            this.bot.uploadFile({
                to: params.channelID,
                file: fs.createReadStream('./assets/facesit.jpg')
            }, (response) => {
                this.removeCmdHistory(params);
            });
        }
    }, {
        name: '/desu',
        allowed: ['*'],
        description: 'you know',
        fn: function (params) {
            fs.readdir('./assets/', (error, files) => {
                let desulist = files.filter((item) => {
                    return /desu/i.test(item);
                });
                let rand = Math.floor(Math.random() * desulist.length);
                let desu = desulist[rand];

                this.bot.uploadFile({
                    to: params.channelID,
                    file: fs.createReadStream(`./assets/${desu}`)
                }, (response) => {
                    this.removeCmdHistory(params);
                });
            });
        }
    }, {
        name: '/lewd',
        allowed: ['*'],
        description: 'you know',
        fn: function (params) {
            fs.readdir('./assets/', (error, files) => {
                let desulist = files.filter((item) => {
                    return /lewd/i.test(item);
                });
                let rand = Math.floor(Math.random() * desulist.length);
                let desu = desulist[rand];

                this.bot.uploadFile({
                    to: params.channelID,
                    file: fs.createReadStream(`./assets/${desu}`)
                }, (response) => {
                    this.removeCmdHistory(params);
                });
            });
        }
    }, {
        name: '/spam',
        description: '',
        fn: function (params) {
            let cmd = this.getCmd(params.message.replace(/\s/, ''));
            let times = /(\b\d+\b)/.exec(params.message);
            let intFound = (times && times.length);

            if (!this.throttler.isMe(params.user)) {
                this.sendError(params);
                return;
            }

            if (!cmd || !intFound) {
                this.sendError(params);
                return;
            }

            this.removeCmdHistory(params);

            for (var i = 0; i < times[0]; i++) {
                this.exec(cmd.name, params);
            }
        }
    }, {
        name: '/triggered',
        allowed: ['*'],
        description: 'It happens',
        fn: function (params) {
            this.bot.uploadFile({
                to: params.channelID,
                file: fs.createReadStream('./assets/triggered.gif')
            }, (response) => {
                this.bot.log(response);
            });
        }
    }, {
        name: '/summon',
        description: 'summons bot to voice channel',
        fn: function (params) {
            let user = this.bot.find(params.user, params, params.userID);
            let voiceChannel = user.voice_channel_id;

            this.bot.joinVoiceChannel(voiceChannel, () => {
                this.bot.audioCtrl.currentChannel = voiceChannel;
                this.removeCmdHistory(params);
            });
        }
    }, {
        name: '/leavevoice',
        description: 'Leaves a voice channel',
        fn: function (params) {
            let channel = this.bot.audioCtrl.currentChannel;
            this.bot.leaveVoiceChannel(channel, () => {
                channel = false;
                this.removeCmdHistory(params)
            });
        }
    }, {
        name: '/play',
        allowed: ['*'],
        description: 'Adds a video to the queue',
        fn: function (params) {
            this.bot.audioCtrl
                .addVideo(params.message)
                .then((video) =>{
                    this.bot.sendMessage({
                        to: params.channelID,
                        message: `<@${params.userID}> added: \`${video.title} - ${video.url}\``
                    });
                    this.removeCmdHistory(params);
                }, (error) => {
                    this.bot.log(pretty.render(error));
                    this.sendError(params);
                })
        }
    }, {
        name: '/skip',
        allowed: ['*'],
        description: 'skips current playing song',
        fn: function (params) {
            this.bot.audioCtrl.skip();
            this.removeCmdHistory(params);
        }
    }, {
        name: '/queue',
        allowed: ['*'],
        description: 'shows a list of current songs',
        fn: function (params) {
            if (!this.bot.audioCtrl.currentSong) {return this.sendError(params);}

            let current = this.bot.audioCtrl.currentSong.title;
            let songList = this.bot.audioCtrl.queue
                .map((song, index)=>{
                    return `${index + 1}. ${song.title}\r`
                }).join('');

            let message = `\`\`\`Current Song: ${current}\n\r${songList}\`\`\``;

            this.bot.sendMessage({
                to: params.channelID,
                message: message
            })
        }
    }, {
        name: '/radio',
        description: 'toggles the radio',
        fn: function (params) {
            let ctrl = this.bot.audioCtrl;

            ctrl.radioEnabled = !ctrl.radioEnabled;
            if (ctrl.radioEnabled) { this.bot.audioCtrl.radio(); }

            this.bot.sendMessage({
                to: params.channelID,
                message: `<@${params.userID}> ${ctrl.radioEnabled ? 'enabled' : 'disabled'} the radio`
            });

            this.removeCmdHistory(params);
        }
    }, {
        name: '/add',
        allowed: ['*'],
        description: 'Alias for /play',
        fn: function (params) {
            params.message = params.message.replace('/add', '/play');
            this.exec('/play', params);
        }
    }, {
        name: '/watch',
        description: '',
        fn: function (params) {
            let proc;
            let board = /board:(\w+)/.exec(params.message);
            let keywords = /keywords:([\w,]+)/.exec(params.message);

            if (!this.throttler.isMe(params.user)) {
                return this.sendError(params);
            }

            if (!board || !keywords) {
                return this.sendError(params);
            }

            board = board[1];
            keywords = keywords[1].split(',');

            proc = fork(`./4chan.js`, [
                `-b${board}`,
                `-k${keywords.join(',')}`,
                `-c${params.channelID}`
            ], {silent: true});

            proc.on('message', (data) => {
                if (data === 'heartbeat') { return; }

                this.bot.sendMessage({
                    to: data.channel,
                    message: `\`I found some bread: ${data.com}\`
                    \r${data.url}`
                })
            });

            proc.on('close', (close, signal) => {
                this.bot.log(close, signal);
            });

            proc.stderr.on('data', (data) => {
                this.bot.log(data);
            });

            proc.stdout.on('data', (data) => {
                this.bot.log(data);
            });

            this.threadFinders[new Date().getTime()] = {
                board: board[0],
                keywords: keywords,
                proc: proc,
                channel: params.channelID
            }
        }
    }, {
        name: '/notify',
        allowed: ['*'],
        description: '/notify <threadWatcherId> sends you a PM when sh0taBot finds a thread matching the selected keywords',
        fn: function (params) {
            let id = /(\d+)\b/.exec(params.message);
            let watch;

            this.bot.log(id, params.message)
            if (!id || !this.threadFinders[id[1]]) {
                return this.sendError(params);
            }
            watch = this.threadFinders[id[1]];
            watch.proc.send({
                type: 'ADD_WATCHER',
                channelId: params.userID
            });

            this.bot.sendMessage({
                to: params.userID,
                message: `You are now watching ${id[1]} - /${watch.board}/ ${watch.keywords.join(' ,')}
                \r type \`/stopnotify ${id[1]}\` to stop watching`
            });
        }
    }, {
        name: '/stopnotify',
        allowed: ['*'],
        description: '/stopnotify <threadWatcherId> stops notifying you of threads',
        fn: function (params) {
            let id = /(\d+)\b/.exec(params.message)
            let watch;

            if (!id || !this.threadFinders[id[1]]) {
                return this.sendError(params);
            }

            watch = this.threadFinders[id[1]];
            watch.proc.send({
                type: 'REMOVE_WATCHER',
                channelId: params.userID
            });

            this.bot.sendMessage({
                to: params.userID,
                message: `You have stopped watching ${id[1]} - /${watch.board}/ ${watch.keywords.join(' ,')}
                \r type \`/notify ${id[1]}\` to start watching again`
            });
        }
    }, {
        name: '/threads',
        description: 'Lists current threads being watched for',
        fn: function (params) {
            let watches = Object.keys(this.threadFinders)
                .filter(id => {
                    let watch = this.threadFinders[id];
                    return watch.channel === params.channelID;
                })
                .map(id => {
                    let watch = this.threadFinders[id];
                    return `ID: ${id} /${watch.board}/ - ${watch.keywords.join(' ')}`
            });
            let text = `\`\`\` I am looking for\n\r${watches}\`\`\` `

            this.bot.sendMessage({
                to: params.channelID,
                message: text
            })
        }
    }, {
        name: '/killwatch',
        description: '',
        fn: function (params) {
            let id = /(\d+)\b/.exec(params.message);
            let watch;

            if (!this.throttler.isMe(params.user)) {
                return this.sendError(params);
            }

            if (!id || !this.threadFinders[id[1]]) {
                return this.sendError(params);
            }

            watch = this.threadFinders[id[1]];
            watch.proc.kill('SIGHUP');

            delete this.threadFinders[id[1]];
        }
    }, {
        name: '/info',
        description: 'displays user info `/info <username> || @mention`',
        fn: function (params) {
            let user = this.bot.find(params.message, params);
            let spoof = Object.assign({}, params);
            let msg;

            user.user.blacklist = this.bot.secrets.blacklist.indexOf(user.user.id) !== -1;
            spoof.user = user.user.username;
            spoof.userID = user.user.id;

            msg = `\`\`\` ${JSON.stringify(user.user)}\`\`\``
            msg += this.toString(spoof);

            this.bot.sendMessage({
                to: params.channelID,
                message: msg
            });
        }
    }, {
        name: '/allow',
        description: 'allow cmd for a user /allow cmd:<cmd> user:<username>',
        fn: function (params) {
            let parsed = this.parseArgs(params.message);
            if (!parsed.cmd || !parsed.user) {return; }

            let cmd = this.getCmd(parsed.cmd);
            let user = this.bot.find(parsed.user, params);

            if (!cmd || !user) { return; }

            this.bot.setPermission({cmd:cmd.name, userId:user.user.id}, true);
        }
    }, {
        name: '/unallow',
        description: 'unallow cmd for a user /allow cmd:<cmd> user:<username>',
        fn: function (params) {
            let parsed = this.parseArgs(params.message);
            if (!parsed.cmd || !parsed.user) {return; }

            let cmd = this.getCmd(parsed.cmd);
            let user = this.bot.find(parsed.user, params);

            if (!cmd || !user) { return; }

            this.bot.unsetPermission({cmd:cmd.name, userId:user.user.id}, true);
        }
    }, {
        name: '/blacklist',
        description: 'blocks a user from using any commands at all /blacklist user:<username>',
        fn: function (params) {
            let parsed = this.parseArgs(params.message);
            if (!parsed.user) {return; }

            let user = this.bot.find(parsed.user, params);

            this.bot.addBlacklist(user.user.id, true);
        }
    }, {
        name: '/unblacklist',
        description: 'unblocks a user from using any commands at all /unblacklist user:<username>',
        fn: function (params) {
            let parsed = this.parseArgs(params.message);
            if (!parsed.user) {return; }

            let user = this.bot.find(parsed.user, params);

            this.bot.removeBlacklist(user.user.id, true);
        }
    }
];

commands.addCmds(startupCmds);

module.exports = commands;

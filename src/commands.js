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

        params.message = params.message.replace(parsed.name, '');
        parsed.fn.call(this, params);
        this.throttler.throttleUser(params.user);
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
    }, {
        name: 'kiji',
        scope: '*',
        description: 'secret',
        fn: function(params) {
            request.get('http://catfacts-api.appspot.com/api/facts?number=1',
                (e, res, body) => {
                    if (res.statusCode !== 200) { return; }
                    let message = JSON.parse(body).facts[0];

                    message = message
                        .replace(/\bcat[s]{0,1}\b/gi, 'kiji')
                        .replace(/kitten/gi, 'young kiji');

                    this.bot.log(`Kiji fact found: ${message}`);
                    this.bot.sendMessage({
                        to: params.channelID,
                        message: message
                    });
                });
        }
    }, {
        name: 'pride',
        scope: '*',
        description: 'secret',
        fn: function(params) {
            request.get('http://api.icndb.com/jokes/random/',
                (e, res, body) => {
                    if (res.statusCode !== 200) { return; }
                    let message = JSON.parse(body).value.joke.toString();

                    message = message.replace(/Chuck Norris/gi, 'Pride');
                    this.bot.log(`Pride fact found: ${message}`);
                    this.bot.sendMessage({
                        to: params.channelID,
                        message: message
                    });
                });
        }
    }, {
        name: 'haichu',
        description: 'Use at your own risk',
        scope: '*',
        fn: function(params) {
            fs.readdir('./assets/', (error, files) => {
                let haichulist = files.filter((item) => {
                    return /haichu/i.test(item);
                });
                let rand = Math.floor(Math.random() * haichulist.length);
                let desu = haichulist[rand];

                this.bot.uploadFile({
                    channel: params.channelID,
                    file: fs.createReadStream(`./assets/${desu}`)
                }, (response) => {
                    this.bot.log(response);
                });
            });
        }
    }, {
        name: '/join',
        description: 'Bot will attempt to join a server provided a link',
        fn: function(params) {
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
        description: 'you know',
        fn: function(params) {
            this.bot.uploadFile({
                channel: params.channelID,
                file: fs.createReadStream('./assets/facesit.jpg')
            }, (response) => {
                this.removeCmdHistory(params);
            });
        }
    }, {
        name: '/desu',
        description: 'you know',
        fn: function(params) {
            fs.readdir('./assets/', (error, files) => {
                let desulist = files.filter((item) => {
                    return /desu/i.test(item);
                });
                let rand = Math.floor(Math.random() * desulist.length);
                let desu = desulist[rand];

                this.bot.uploadFile({
                    channel: params.channelID,
                    file: fs.createReadStream(`./assets/${desu}`)
                }, (response) => {
                    this.removeCmdHistory(params);
                });
            });
        }
    }, {
        name: '/spam',
        description: 'secret',
        fn: function(params) {
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
        description: 'It happens',
        fn: function(params) {
            this.bot.uploadFile({
                channel: params.channelID,
                file: fs.createReadStream('./assets/triggered.gif')
            }, (response) => {
                this.bot.log(response);
            });
        }
    }, {
        name: '/summon',
        description: 'voice test',
        fn: function(params) {
            let voiceChannel = this.bot.findMe();

            this.bot.joinVoiceChannel(voiceChannel, () => {
                this.bot.audioCtrl.currentChannel = voiceChannel;
                this.removeCmdHistory(params);
            });
        }
    }, {
        name: '/leavevoice',
        description: 'voice test',
        fn: function(params) {
            let channel = this.bot.audioCtrl.currentChannel;
            this.bot.leaveVoiceChannel(channel, () => {
                channel = false;
                this.removeCmdHistory(params)
            });
        }
    }, {
        name: '/play',
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
        description: 'skips current playing song',
        fn: function (params) {
            this.bot.audioCtrl.skip();
            this.removeCmdHistory(params);
        }
    }, {
        name: '/queue',
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
        fn: function(params) {
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
        description: 'Alias for /play',
        fn: function (params) {
            params.message = params.message.replace('/add', '/play');
            this.exec('/play', params);
        }
    }, {
        name: '/watch',
        description: 'secret',
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
        description: 'secret',
        fn: function(params) {
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
    }
];

commands.addCmds(startupCmds);

module.exports = commands;

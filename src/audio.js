'use strict';
let ytdl = require('ytdl-core');
let pretty = require('prettyjson');
let fs = require('fs');
let Promise = require('promise');
let spawn = require('child_process').spawn;
let fork = require('child_process').fork;
let playlist = require('../radio.json');

module.exports = class AudioController {
    constructor(context) {
        this.queue = [];
        this.state = {};
        this.context = context
        this.urlReg = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
    }

    set currentChannel (channel) {
        this.state.currentChannel = channel
    }

    get currentChannel () {
        return this.state.currentChannel || false;
    }

    get currentSong () {
        return this.state.currentSong;
    }

    set currentSong (val) {
        this.state.currentSong = val;
    }

    get skips () {
        return this.state.skips;
    }

    set skips (val) {
        this.state.skips = val;
    }

    get skipsNeeded () {
        return this.state.skipsNeeded || 3;
    }

    set skipsNeeded (val) {
        this.state.skipsNeeded = val;
    }

    get isNextSong () {
        return !!this.queue.length;
    }

    get nextSong () {
        return this.queue.shift();
    }

    get radioEnabled () {
        return this.state.radio;
    }

    set radioEnabled (val) {
        this.state.radio = val;
    }

    get stream () {
        return new Promise((resolve, reject) => {
            if (this._stream) { resolve(this._stream);}

            this.context.getAudioContext(this.currentChannel, (stream) => {
                this._stream = stream;
                resolve(stream);
            });
        });
    }

    skip () {
        this.ytdl.kill('SIGINT');
    }

    getRandomSong () {
        return playlist[Math.floor(Math.random() * playlist.length)];
    }

    radio () {
        return this.addVideo(this.getRandomSong())
    }

    addVideo (videoUrl) {
        let promise = new Promise((resolve, reject) => {
            let song = this.urlReg.exec(videoUrl)[0];
            let proc = fork(`./test.js`, [song]);

            proc.on('error', () => {
                reject();
            });

            proc.on('message', (data) => {
                resolve(data);
            });
        });

        promise.then((video) => {
            this.queue.push(video);
            this.context.log(`\n\rSONG ADD:\n\r${pretty.render(video)}`);
            this.context.log(`\n\rCurrentSong:${pretty.render(this.currentSong)}`);
            if (!this.currentSong && !this.isLoading) { this.play(this.nextSong); }
        });

        return promise;
    }

    play (video, skipped) {
        let stream = this.stream;

        this.ffmpeg = spawn('ffmpeg' , [
            '-i', 'pipe:0',
            '-f', 's16le',
            '-bufsize', '12000k',
            '-maxrate', '3000k',
            '-ar',  `${48000/2}`,
            '-af', 'volume=0.1',
            'pipe:1'

        ],
        {stdio: ['pipe', 'pipe', process.stderr]});

        this.ytdl = fork('./src/ytdl.js', [video.url], {silent:true});
        this.ytdl.stdout.pipe(this.ffmpeg.stdin);

        stream.then((fetched) => {
            this.ffmpeg.stdout.on('readable', () => {
                this.currentSong = video;
                this.isLoading = false;
            })
            fetched.send(this.ffmpeg.stdout);
        });

        this.ffmpeg.stdout.on('end', (code, signal) => {
            this.currentSong = false;
            this.isLoading = true;

            if (this.isNextSong) { return this.play(this.nextSong); }

            if (!this.isNextSong && this.radioEnabled) {
                this.radio().then(() => {
                    this.play(this.nextSong);
                });
            }
        });

    }
}

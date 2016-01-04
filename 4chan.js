'use strict';
let chan = require('4chanjs');
let ArgParse = require('argparse').ArgumentParser;
let parser = new ArgParse({});
let pretty = require('prettyjson').render;

parser.addArgument(['-b'], {dest: 'board'});

parser.addArgument(['-k'], {
    dest: 'keywords',
    type: (arg) => {
        return arg.split(',')
    }
});

parser.addArgument(['-c'], {
    dest: 'channel'
});

let hearbeat = setInterval(() => {

})

class ThreadFinder {
    constructor() {
        this.args = parser.parseArgs();
        this.board = chan.board(this.args.board);
        this.keywords = this.args.keywords;
        this.known = [];
        this.watchers = [];
        this.fetchBoard(0);
        this.startPoll();

        process.on('message', (msg) => {
            console.log(msg);
            this.handleMessage(msg);
        });
    }

    startPoll () {
        this.poller = setInterval(() => {
            this.fetchBoard(0);
        }, 300000);
    }

    fetchBoard (tries) {
        if (tries === 3) { return; }

        this.board.catalog((err, pages) => {
            if (err || !pages.length) { return this.fetchBoard(tries++); }

            this.handleResult(this.parse(pages));
        });
    }

    parse (res) {
        return res.map(page => {
            return page.threads.map(thread => {
                return { com: thread.com, no: thread.no};
            });
        })
        .reduce((prev, cur) => {
            return prev.concat(cur);
        }, [])
        .filter(thread => {
            if (this.known.indexOf(thread.no) !== -1) { return false; }
            return !!this.keywords.filter((word) => {
                let reg = new RegExp(word, 'gi');
                return reg.test(thread.com);
            }).length
        });
    }

    handleResult(parsed) {
        if (!parsed.length) {return; }

        for (let thread of parsed) {
            this.notify(thread, this.args.channel);
            this.notifyWatchers(thread, this.watchers);
        }
    }

    notify (thread, channel) {
        thread.url = `https://boards.4chan.org/${this.args.board}/thread/${thread.no}`
        thread.channel = channel;
        this.known.push(thread.no);
        process.send(thread);
    }

    notifyWatchers (thread, watchers) {
        for (let watcher of watchers) {
            this.notify(thread, watcher);
        }
    }

    addWatcher(id) {
        if (this.watchers.indexOf(id) !== -1) { return; }
        this.watchers.push(id);
    }

    removeWatcher(id) {
        this.watchers = this.watchers.filter(user => {
            return user !== id;
        });
    }

    handleMessage(msg) {
        switch(msg.type) {
            case 'ADD_WATCHER':
                this.addWatcher(msg.channelId);
            case 'REMOVE_WATCHER':
                this.removeWatcher(msg.channelId);
        }
    }
}

process.on('error', (error) => {
    console.log(error)
});



const threadFinder = new ThreadFinder();

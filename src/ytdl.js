'use strict';
let ytdl = require('ytdl-core');
let videoStream = ytdl(process.argv[2], {filter:'audioonly'});


videoStream.pipe(process.stdout);

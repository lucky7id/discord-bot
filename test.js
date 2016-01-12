'use strict';
let ytdl = require('ytdl-core');

ytdl.getInfo(process.argv[2], [], (err, info) => {

    if (err) { process.exit(1); }

    process.send({
        title: info.title,
        ext: info.ext,
        duration: info.duration,
        url: info.loaderUrl
    });

    process.exit(0);
});

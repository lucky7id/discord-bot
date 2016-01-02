'use strict';
let ytube = require('youtube-dl');

ytube.getInfo(process.argv[2], [], (err, info) => {

    if (err) { process.exit(1); }

    process.send({
        title: info.title,
        ext: info.ext,
        duration: info.duration,
        url: info.webpage_url
    });

    process.exit(0);
});

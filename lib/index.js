const readline = require('readline-sync'),
      getConfig = require('./config.js'),
      server = require('./server.js');

exports.execute = function(callback)
{
    const config = getConfig();

    const password = readline.question('Password : ', {
        hideEchoBack: true
    });

    server.init(password, config);
    server.load(() => {
        server.start(s => {
            if(callback)
                callback(s);
        })
    })
}

exports.init = server.init;
exports.load = server.load;
exports.start = server.start;

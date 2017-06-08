const readline = require('readline-sync'),
      getConfig = require('./config.js'),
      server = require('./server.js');

exports.config = getConfig;

exports.init = server.init;
exports.load = server.load;
exports.start = server.start;

exports.execute = function(callback)
{
    exports.config.load(process.argv[2], (e, config) => {
        if(e)
            throw e;
        
        const password = readline.question('Password : ', {
            hideEchoBack: true
        });

        exports.init(password, config);
        exports.load(() => {
            exports.start((config, webDAVServer, httpServer) => {
                if(callback)
                    callback(config, webDAVServer, httpServer);
            })
        })
    })
}


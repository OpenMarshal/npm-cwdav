const webdav = require('webdav-server'),
      crypto = require('./crypto.js'),
      zlib = require('zlib'),
      fs = require('fs');

module.exports = {
    init(password, config)
    {
        this.tempTreeFilePath = config.tempTreeFile
        this.containerPath = config.container
        this.treeFilePath = config.treeFile
        this.isVerbose = config.isVerbose
        this.treeSeed = config.treeSeed
        this.config = config;

        crypto.init(password, config);
        this.server = new webdav.WebDAVServer({
            port: config.port,
            hostname: config.hostname,
            autoSave: {
                treeFilePath: this.treeFilePath,
                tempTreeFilePath: this.tempTreeFilePath,
                onSaveError: () => {
                    if(this.config.isVerbose)
                        console.log('SAVE ERROR');
                },
                streamProvider: (stream, cb) => {
                    cb(stream.pipe(crypto.newCipher(this.treeSeed)).pipe(zlib.createGzip()));
                }
            }
        });
    },

    load(callback)
    {
        fs.exists(this.containerPath, exists => {
            if(!exists)
                fs.mkdirSync(this.containerPath);
            
            const vsfsm = new webdav.VirtualStoredFSManager(new webdav.SimpleVirtualStoredContentManager(this.containerPath, {
                readStream: (uid, stream, cb) => {
                    const cipher = crypto.newDecipher(uid)

                    stream.pipe(zlib.createGunzip()).pipe(cipher);
                    cb(cipher);
                },
                writeStream: (uid, stream, cb) => {
                    const cipher = crypto.newCipher(uid)
                    
                    cipher.pipe(zlib.createGzip()).pipe(stream);
                    cb(cipher);
                }
            }));

            vsfsm.initialize((e) => {
                if(e) throw e;
                
                fs.exists(this.treeFilePath, exists => {
                    if(exists)
                    {
                        const cipher = crypto.newDecipher(this.treeSeed)
                        const stream = zlib.createGunzip();

                        fs.createReadStream(this.treeFilePath).pipe(zlib.createGunzip()).pipe(cipher).pipe(stream);
                        let data = '';
                        stream.on('data', (chunk) => {
                            data += chunk.toString();
                        })
                        stream.on('end', () => {
                            this.server.load(JSON.parse(data), [
                                new webdav.RootFSManager(),
                                vsfsm
                            ], e => {
                                if(e) throw e;
                                callback();
                            })
                        })
                        cipher.on('error', (e) => {
                            console.error('Wrong password ?');
                            console.error('  ',e.message);
                        })
                    }
                    else
                    {
                        this.server.rootResource = new webdav.VirtualStoredFolder('', undefined, vsfsm);
                        callback();
                    }
                })
            })
        })
    },

    start(callback)
    {
        if(this.isVerbose)
            this.server.beforeRequest((arg, next) => {
                console.log(arg.request.method);
                next();
            })
        
        this.server.start(s => {
            if(callback)
                callback(this.config, this.server, s);
        })
    }
}

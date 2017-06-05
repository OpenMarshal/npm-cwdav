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
        this.treeSeed = config.treeSeed

        crypto.init(password, config);
        this.server = new webdav.WebDAVServer({
            port: config.port,
            hostname: config.hostname
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
        
        this.server.beforeRequest((arg, next) => {
            console.log(arg.request.method);
            next();
        })

        let saving = false;
        let saveRequested = false;
        this.server.afterRequest((arg, next) => {
            switch(arg.request.method.toUpperCase())
            {
                case 'PROPPATCH':
                case 'DELETE':
                case 'MKCOL':
                case 'MOVE':
                case 'COPY':
                case 'POST':
                case 'PUT':
                    // Avoid concurrent saving
                    if(saving)
                    {
                        saveRequested = true;
                        next();
                        return;
                    }

                    saving = true;
                    next = () => {
                        if(saveRequested)
                        {
                            saveRequested = false;
                            save.bind(this)();
                        }
                        else
                            saving = false;
                    }

                    save.bind(this)();

                    function save()
                    {
                        this.server.save((e, data) => {
                            if(e)
                            {
                                console.error(e);
                                next();
                            }
                            else
                            {
                                const cipher = crypto.newCipher(this.treeSeed)
                                const stream = zlib.createGzip();

                                stream.pipe(cipher).pipe(zlib.createGzip()).pipe(fs.createWriteStream(this.tempTreeFilePath));
                                stream.end(JSON.stringify(data), (e) => {
                                    if(e)
                                    {
                                        console.error(e);
                                        next();
                                        return;
                                    }

                                    fs.unlink(this.treeFilePath, (e) => {
                                        if(e && e.errno !== -4058) // An error other than ENOENT (no file/folder found)
                                        {
                                            console.error(e);
                                            next();
                                            return;
                                        }

                                        fs.rename(this.tempTreeFilePath, this.treeFilePath, (e) => {
                                            if(e)
                                                console.error(e);/*
                                            else
                                                console.log('SAVED');*/
                                            next();
                                        })
                                    })
                                });
                            }
                        })
                    }
                    break;
                
                default:
                    next();
                    break;
            }
        })
        this.server.start(callback)
    }
}

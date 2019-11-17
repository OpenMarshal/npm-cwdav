const readline = require('readline-sync');
const webdav = require('webdav-server').v2;
const crypto = require('crypto');
const stream = require('stream');
const util = require('util');
const zlib = require('zlib');
const fs = require('fs');

const defaultOptions = {
    webdavServerOptions: undefined,
    masterKeyIteration: 100000,
    fileKeyIteration: 1000,
    keySize: 32,
    ivSize: 16,
    masterFilePath: 'data.json',
    dataFolderPath: '.data',
    hashAlgorithm: 'sha256',
    cipherAlgorithm: 'aes-256-cbc',
    multiUser: false
}

let options = defaultOptions;

const hash = (path) => {
    const hasher = crypto.createHash(options.hashAlgorithm);
    const pathStr = path.toString();

    const hash = hasher.update(pathStr).digest().toString('hex');

    return hash;
}

(async () => {
    if(process.argv.length > 2) {
        let configFilePath = process.argv[2].trim();

        if(configFilePath === '-') {
            configFilePath = readline.question('Configuration file: ');
        }

        const readFile = util.promisify(fs.readFile);

        console.log(`[ ] Loading the config file ${configFilePath}`);

        options = JSON.parse(readFile(configFilePath));

        for(const key in defaultOptions) {
            if(options[key] === undefined || options[key] === null) {
                options[key] = defaultOptions[key];
            }
        }

        console.log(`[o] Loaded the config file ${configFilePath}`);
    }

    if(options.multiUser) {
        const username = readline.question('Username: ');
        options.masterFilePath = `${options.masterFilePath}-${hash(username)}`;
        options.dataFolderPath = `${options.dataFolderPath}-${hash(username)}`;
    }

    const password = readline.question('Password: ', {
        hideEchoBack: true
    });

    console.log(`[ ] Starting...`);
    start(options, password);
})();

async function start(options, password) {
    const pbkdf2 = util.promisify(crypto.pbkdf2);

    const finalPassword = await pbkdf2(password, 'master-key', options.masterKeyIteration, options.keySize, null)
    const iv = await pbkdf2(password, 'master-iv', options.masterKeyIteration, options.ivSize, null)

    options.webdavServerOptions = options.webdavServerOptions || {};
    options.webdavServerOptions.autoSave = { // Will automatically save the changes in the 'data.json' file
        treeFilePath: options.masterFilePath,
        streamProvider: (callback) => {
            const input = crypto.createCipheriv(options.cipherAlgorithm, finalPassword, iv);
            const output = zlib.createGzip();

            input.pipe(output);

            callback(input, output)
        }
    }
    options.webdavServerOptions.autoLoad = {
        serializers: [
            new CryptedFileSystemSerializer()
        ],
        streamProvider: (inputStream, callback) => callback(inputStream.pipe(zlib.createGunzip()).pipe(crypto.createDecipheriv(options.cipherAlgorithm, finalPassword, iv)))
    }

    const server = new webdav.WebDAVServer(options.webdavServerOptions);
    
    try
    {
        await server.autoLoadAsync()
    }
    catch(ex)
    {
        await server.setFileSystemAsync('/', new CryptedFileSystem());
    }

    fs.mkdir(options.dataFolderPath, async () => {
        const info = await server.startAsync();
        const port = info.address().port;

        console.log(`[o] Started on port ${port}`);
        console.log(`    Windows: explorer \\\\localhost@${port}\\DavWWWRoot`);
        console.log(`    Linux:   nautilus dav://localhost:${port}`);
        console.log(`             dolphin  dav://localhost:${port}`);
    });

    // Serializer
    function CryptedFileSystemSerializer()
    {
        const vs = new webdav.VirtualSerializer();

        return {
            uid()
            {
                return "CryptedFileSystemSerializer_1.0.0";
            },
            serialize(fs, callback)
            {
                vs.serialize(fs, callback)
            },
            unserialize(serializedData, callback)
            {
                vs.unserialize(serializedData, (e, fs) => {
                    const fsEx = new CryptedFileSystem();
                    fs.constructor = CryptedFileSystem;
                    fs.setSerializer(this);
                    fs._size = fsEx._size;
                    fs._openWriteStream = fsEx._openWriteStream;
                    fs._openReadStream = fsEx._openReadStream;
                    fs._move = fsEx._move;
                    fs._delete = fsEx._delete;
                    fs._rename = fsEx._rename;

                    callback(null, fs);
                });
            },
            constructor: CryptedFileSystemSerializer
        }
    }
    
    function GetSizeStream() {
        this.size = 0;
        stream.Transform.call(this);
    }
    util.inherits(GetSizeStream, stream.Transform);
    GetSizeStream.prototype._transform = function(chunk, encoding, callback) {
        this.size += chunk.length;
        this.push(chunk);
        callback();
    }

    // File system
    function CryptedFileSystem()
    {
        const r = new webdav.VirtualFileSystem(new CryptedFileSystemSerializer());
        r.constructor = CryptedFileSystem;

        const getCredentials = async (path) => {
            const finalPassword = await pbkdf2(password, `key:${path.toString()}`, options.fileKeyIteration, options.keySize, null)
            const iv = await pbkdf2(password, `iv:${path.toString()}`, options.fileKeyIteration, options.ivSize, null)

            return {
                finalPassword,
                iv
            }
        }

        r._openWriteStream = async function(path /* : Path*/, ctx /* : OpenWriteStreamInfo*/, callback /* : ReturnCallback<Writable>*/) {
            const physicalPath = require('path').join(options.dataFolderPath, hash(path));
            const fileStream = fs.createWriteStream(physicalPath);
            
            const { finalPassword, iv } = await getCredentials(path);
            const finalStream = crypto.createCipheriv(options.cipherAlgorithm, finalPassword, iv);

            const sizeStream = new GetSizeStream();

            sizeStream.on('finish', () => {
                const resource = this.resources[path.toString()];
                resource.size = sizeStream.size;
                webdav.VirtualFileSystemResource.updateLastModified(resource);
            })

            sizeStream.pipe(finalStream).pipe(fileStream);
            
            callback(undefined, sizeStream);
        }
        
        r._openReadStream = async function(path /* : Path*/, ctx /* : OpenReadStreamInfo*/, callback /* : ReturnCallback<Readable>*/) {
            try
            {
                const physicalPath = require('path').join(options.dataFolderPath, hash(path));
                const stat = util.promisify(fs.stat);

                const stats = await stat(physicalPath);
                let stream = fs.createReadStream(physicalPath);

                if(stats.size > 0)
                {
                    const { finalPassword, iv } = await getCredentials(path);
                    stream = stream.pipe(crypto.createDecipheriv(options.cipherAlgorithm, finalPassword, iv));
                }
                
                callback(undefined, stream);
            }
            catch(ex)
            {
                callback(ex, undefined);
            }
        }

        r._delete = function(path, ctx, callback) {
            const physicalPath = require('path').join(options.dataFolderPath, hash(path));

            fs.unlink(physicalPath, () => {
                webdav.VirtualFileSystem.prototype._delete.bind(this)(path, ctx, callback);
            })
        }

        r._size = function(path, ctx, callback) {
            callback(undefined, this.resources[path.toString()].size);
        }

        r._move = undefined;
        r._rename = undefined;

        return r;
    }
}

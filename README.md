# Crypted WebDAV Server

Start a preconfigured WebDAV server (based on [webdav-server](https://www.npmjs.com/package/webdav-server)), which store files in a folder, encrypt and compress them. The encryption is AES256 CBC using a master password.

## Install

```bash
npm i -g cwdav
```

## Usage

```bash
cwdav [<config-file-json>]

# Load the file './cwdav.json' or, if it doesn't exist,
# load a default configuration (store all in the './data'
# folder, creates it if it doesn't exist).
cwdav

# Load a specific configuration file
cwdav "/home/dev/path/config/.cwdav.json"
cwdav .cwdav.json
```

## Configuration

The default configuration file name is `cwdav.json`.

The string values can refer to another value with the `$(...)` pattern.

Key | Default value | Description
-|-|-
**hostname** | `'::'` | Scope of the server (`localhost`, `0.0.0.0`, `::`, etc...)
**port** | `1900` | Port of the server
**container** | `'./data'` | Folder to store the crypted data
**treeFile** | `'$(container)/tree'` | File path in which store the resource tree
**tempTreeFile** | `'$(container)/tree.tmp'` | File path to the temporary resource tree
**treeSeed** | `'tree'` | Seed to use to mix with the global IV to encrypt/decrypt the resource tree file
**salt** | `'this is the salt of the world'` | The salt to use to encrypt/decrypt
**cipher** | `'aes-256-cbc'` | Cipher to use to encrypt/decrypt
**cipherIvSize** | `16` | IV size of the cipher
**hash** | `'sha256'` | Hash algorithm to use for password derivation
**masterNbIteration** | `80000` | Number of hash iteration to get the master key/IV
**minorNbIteration** | `1000` | Number of hash iteration to get the file-specific IV
**keyLen** | `256` | Encryption/descryption key size
**isVerbose** | `false` | Tell the server to display some information on its own

Here is an example of a configuration file :
```json
{
    "port": 1900,
    "container": "./data",
    "treeFile": "$(container)/tree",
    "tempTreeFile": "$(container)/tree.tmp",
    "treeSeed": "tree"
}
```

## Note

For an unkown reason yet, if you set the *hostname* to `'localhost'` or `'127.0.0.1'`, the Windows embedded WebDAV client will be slower requesting to this server.

## As a module

## cwdav.execute

### cwdav.execute(callback : (webDAVServer, httpServer) => void)

Execute is a simple macro to start, quickly, from your code, a webdav server.

```javascript
const cwdav = require('cwdav');

cwdav.execute(() => {
    console.log('READY');
})
```

Is equivalent to :

```javascript
const cwdav = require('cwdav'),
      readline = require('readline-sync');

function execute(callback)
{
    // Load the configuration from the argument file, from the local 'cwdav.json' file or from the default values
    cwdav.config.load(process.argv[2], (e, config) => {
        if(e)
            throw e;
        
        // Ask to password to the user
        const password = readline.question('Password : ', {
            hideEchoBack: true
        });

        // Initialize the server with the password and its configuration
        cwdav.init(password, config);
        // Load the saved state of the server or create a new one
        cwdav.load(() => {
            // Start the webdav server and bind an auto-saver for some HTTP methods
            cwdav.start((config, webDAVServer, httpServer) => {
                if(callback)
                    callback(config, webDAVServer, httpServer);
            })
        })
    })
}

execute(() => {
    console.log('READY');
})
```

## What to do with a WebDAV Server?

You can use it as a virtual repository to store data and allow other softwares to access to it.

For instance (Windows uses `\\localhost@<port>\DavWWWRoot\` to connect to the server ; Linux will need to mount the server or to use a webdav client) :
```javascript
const cwdav = require('cwdav'),
      fs = require('fs');

cwdav.execute((config) => {
    fs.writeFile('\\\\localhost@' + config.port + '\\DavWWWRoot\\data.json', JSON.stringify({ myData: 'data' }), (e) => {
        // ...
    })

    // or
    
    fs.readFile('\\\\localhost@' + config.port + '\\DavWWWRoot\\data.json', (e, data) => {
        data = JSON.parse(data.toString());
        // ...
    })
})
```

const fs = require('fs');

exports.defaultConfig = {
    port: 1900,
    container: './data',
    treeFile: '$(container)/tree',
    tempTreeFile: '$(container)/tree.tmp',
    treeSeed: 'tree',
    salt: 'this is the salt of the world',
    cipher: 'aes-256-cbc',
    cipherIvSize: 16,
    hash: 'sha256',
    masterNbIteration: 80000,
    minorNbIteration: 1000,
    keyLen: 256,
    hostname: '::',
    isVerbose: false
};

function transformStrings(root, obj)
{
    if(!obj)
        obj = root;
    
    for(const name in obj)
        if(obj[name] && obj[name].constructor === String)
        {
            const rex = /\$\(([^\)]+)\)/;
            let match = rex.exec(obj[name]);
            while(match)
            {
                if(root[match[1]] === undefined)
                    throw new Error('Cannot find $(' + match[1] + ')');
                
                obj[name] = obj[name].replace('$(' + match[1] + ')', root[match[1]]);
                match = rex.exec(obj[name]);
            }
        }
}

exports.normalizeConfig = function(config)
{
    if(!config)
        config = exports.defaultConfig;
    
    function defaultValue(name, defaultValue)
    {
        if(config[name] === undefined)
            config[name] = defaultValue;
    }

    Object.keys(exports.defaultConfig).forEach(k => defaultValue(k, exports.defaultConfig[k]));
    transformStrings(config);
    return config;
}

exports.load = function(optionsOrFile, callback)
{
    if(!optionsOrFile)
        optionsOrFile = {};
    if(optionsOrFile.constructor === String)
        optionsOrFile = {
            defaultFile: optionsOrFile
        }
    if(!optionsOrFile.defaultFile)
        optionsOrFile.defaultFile = 'cwdav.json';
    
    fs.readFile(optionsOrFile.defaultFile, (e, data) => {
        if(e)
            callback(e, exports.normalizeConfig(JSON.parse(JSON.stringify(exports.defaultConfig))));
        else
            callback(null, exports.normalizeConfig(JSON.parse(data.toString())));
    })
}
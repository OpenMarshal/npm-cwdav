const fs = require('fs');

module.exports = function()
{
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
    function defaultValue(name, defaultValue)
    {
        if(config[name] === undefined)
            config[name] = defaultValue;
    }

    const args = process.argv;
    const defaultConfig = {
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
        hostname: 'localhost'
    };

    let config;
    if(args[2])
    {
        if(!fs.existsSync(args[2]))
            throw new Error('Cannot find the configuration file "' + args[2] + '"');
        
        config = JSON.parse(fs.readFileSync(args[2]));
    }
    else
    {
        if(fs.existsSync('cwdav.json'))
            config = JSON.parse(fs.readFileSync('cwdav.json'));
        else
            config = JSON.parse(JSON.stringify(defaultConfig));
    }

    Object.keys(defaultConfig).forEach(k => defaultValue(k, defaultConfig[k]));
    transformStrings(config);
    return config;
}
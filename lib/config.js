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
    function checkExists(name)
    {
        if(config[name] === undefined)
            throw new Error('Property missing in the configuration : ' + name);
    }

    const args = process.argv;
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
            config = {
                port: 1900,
                container: './data',
                treeFile: '$(container)/tree',
                tempTreeFile: '$(container)/tree.tmp',
                tempSeed: 'tree'
            };
    }

    transformStrings(config);
    [ 'port', 'container', 'treeFile', 'tempTreeFile', 'tempSeed' ].forEach(checkExists)
    return config;
}
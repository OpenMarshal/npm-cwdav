const crypto = require('crypto')

module.exports = {
    init(password, config)
    {
        this.masterNbIteration = config.masterNbIteration;
        this.minorNbIteration = config.minorNbIteration;
        this.cipherIvSize = config.cipherIvSize;
        this.keyLen = config.keyLen;
        this.cipher = config.cipher;
        this.hash = config.hash;

        const salt = config.salt.constructor === Buffer ? config.salt : new Buffer(config.salt);
        this.master = crypto.pbkdf2Sync(password, salt, this.masterNbIteration, this.keyLen, this.hash);
        
        const hmac = crypto.createHmac(this.hash, this.master);
        hmac.update('key');
        this.key = hmac.digest();
    },
    
    buildIV(seed)
    {
        const ivSeed = crypto.pbkdf2Sync(seed, this.master, this.minorNbIteration, this.keyLen, this.hash);
        const hmac = crypto.createHmac(this.hash, ivSeed);
        hmac.update('iv');
        return hmac.digest().slice(0, this.cipherIvSize);
    },
    
    newCipher(seed)
    {
        const cipher = crypto.createCipheriv(this.cipher, this.key, this.buildIV(seed));
        return cipher;
    },

    newDecipher(seed)
    {
        const cipher = crypto.createDecipheriv(this.cipher, this.key, this.buildIV(seed));
        return cipher;
    }
}

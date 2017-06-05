const crypto = require('crypto')

module.exports = {
    init(password)
    {
        const salt = new Buffer('this is the salt of the world');
        this.master = crypto.pbkdf2Sync(password, salt, 80000, 256, 'sha256');
        
        const hmac = crypto.createHmac('sha256', this.master);
        hmac.update('key');
        this.key = hmac.digest();
    },
    
    buildIV(seed)
    {
        const ivSeed = crypto.pbkdf2Sync(seed, this.master, 1000, 256, 'sha256');
        const hmac = crypto.createHmac('sha256', ivSeed);
        hmac.update('iv');
        return hmac.digest().slice(0, 16);
    },
    
    newCipher(seed)
    {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.buildIV(seed));
        return cipher;
    },

    newDecipher(seed)
    {
        const cipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.buildIV(seed));
        return cipher;
    }
}

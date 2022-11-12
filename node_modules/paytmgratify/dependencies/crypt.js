"use strict";

var crypto = require('crypto');

var crypt = {
    iv: '@@@@&&&&####$$$$',

    encrypt: function (data, custom_key) {
        var iv = this.iv;
        var key = custom_key;
        var algo = '256';
        switch (key.length) {
            case 16:
                algo = '128';
                break;
            case 24:
                algo = '192';
                break;
            case 32:
                algo = '256';
                break;

            default:
                throw new Error('INVALID_KEY_LENGTH');

        }
        var cipher = crypto.createCipheriv('AES-' + algo + '-CBC', key, iv);
        var encrypted = cipher.update(data, 'binary', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    decrypt: function (data, custom_key) {
        var iv = this.iv;
        var key = custom_key;
        var algo = '256';
        switch (key.length) {
            case 16:
                algo = '128';
                break;
            case 24:
                algo = '192';
                break;
            case 32:
                algo = '256';
                break;
        }
        var decipher = crypto.createDecipheriv('AES-' + algo + '-CBC', key, iv);
        var decrypted = decipher.update(data, 'base64', 'binary');
        try {
            decrypted += decipher.final('binary');
        } catch (e) {
            console.log(e);
        }
        return decrypted;
    },

    gen_salt: function (length, cb) {
        return new Promise((resolve, reject)=>{
            crypto.randomBytes((length * 3.0) / 4.0, function (err, buf) {
                var salt;
                if (!err) {
                    salt = buf.toString("base64");
                    if(cb){
                        return cb(null, salt)
                    }
                    return resolve(salt);
                }
                if(cb){
                    return cb(err, null)
                }
                reject(err);
            });
        })
    },

    /* one way md5 hash with salt */
    md5sum: function (salt, data) {
        return crypto.createHash('md5').update(salt + data).digest('hex');
    },
    sha256sum: function (salt, data) {
        return crypto.createHash('sha256').update(data + salt).digest('hex');
    }
};

module.exports = crypt;

// test case
// Is run when the module is run directly: `node crypt.js`
if (require.main === module) {
    var i;

    var logsalt = function (err, salt) {
        if (!err) {
            console.log('salt is ' + salt);
        }
    };

    var enc = crypt.encrypt('One97', 'hellhellhellhell');
    console.log('encrypted - ' + enc);
    console.log('decrypted - ' + crypt.decrypt(enc, 'hellhellhellhell'));

    for (i = 0; i < 5; i++) {
        crypt.gen_salt(4, logsalt);
    }
}
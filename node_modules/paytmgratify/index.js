/**
 * Created by dinesh3836 on 18-07-2016.
 */

const checksum = require('./dependencies/checksum');
const crypt = require('./dependencies/crypt');
const genJson = require('./dependencies/genJson');
const request = require('request');
const debug = require('debug')('paytmgratify:main');

if(process.env.DEBUG_PAYTM_API_CALL === 'yes'){
    debug('debugging API calls also');
    require('request-debug')(request);
}


const PRODUCTION_ENDPOINT = "https://trust.paytm.in/wallet-web/salesToUserCredit";
const STAGING_ENDPOINT = "https://trust-uat.paytm.in/wallet-web/salesToUserCredit";

/**
 *
 * @param {{transaction_type, order_id, cust_phone, amount, currency_type, message, isnew_user}} transactionDetails - transaction related info
 * @param {{ aes_key, merchant_guid, wallet_guid }} merchantDetails - merchant's details
 * @param {{platform_name, ip_address }} platformDetails - platform specific details
 * @returns {Promise.<TResult>}
 */
exports.gratifyCustomer = function(transactionDetails, merchantDetails, platformDetails) {
    if (!(
        transactionDetails.transaction_type
        && transactionDetails.order_id
        && transactionDetails.cust_phone
        && transactionDetails.amount
        && transactionDetails.currency_type
        && transactionDetails.message
        && typeof transactionDetails.isnew_user === 'boolean')) {

        debug("Invalid transaction details. Make sure transaction_type, order_id, cust_phone, amount, currency_type, " +
            "message, and isnew_user are filled in properly");
        throw new Error('INSUFFICIENT_TRANSACTION_DETAILS');
    }

    if(!(merchantDetails.aes_key && merchantDetails.merchant_guid && merchantDetails.wallet_guid)) {
        debug("Invalid merchant details. Make sure aes_key, merchant_guid and wallet_guid are filled in properly");
        throw new Error('INSUFFICIENT_MERCHANT_DETAILS');
    }
    if (!(platformDetails.platform_name && platformDetails.ip_address)) {
        debug("Invalid platform details. Make sure platform_name and ip_address are filled in properly.")
        throw new Error('INSUFFICIENT_PLATFORM_DETAILS');
    }

    if(!(transactionDetails.transaction_type === 'staging' || transactionDetails.transaction_type === 'production')) {
        debug("Invalid transaction type. transaction_type can either be 'staging' or 'production' only.");
        throw new Error('TRANSACTION_TYPE_INVALID');
    }

    const url = (transactionDetails.transaction_type === 'production') ? PRODUCTION_ENDPOINT : STAGING_ENDPOINT;
    const paytmJson = genJson.body(transactionDetails.cust_phone, transactionDetails.amount,
        transactionDetails.order_id, merchantDetails.merchant_guid, merchantDetails.wallet_guid,
        transactionDetails.isnew_user, transactionDetails.currency_type, transactionDetails.message,
        platformDetails.ip_address, platformDetails.platform_name);

    debug('API body will be: ', paytmJson);

    return checksum.genchecksumbystring(JSON.stringify(paytmJson), merchantDetails.aes_key)
        .then((checksum)=>{
            debug('generated checksum: ', checksum);
            debug('calling gratify API at: ', url);
            let responseBody = '';
            let statusCode = null;
            return new Promise((resolve, reject)=>{
                request({
                        method: "POST",
                        url: url,
                        json: paytmJson,
                        headers: {
                            "Content-type": 'application/json',
                            "mid": merchantDetails.merchant_guid,
                            "checksumhash": checksum
                        }
                    })
                    .on('data', (chunk) => {
                        responseBody += chunk;
                        debug(`BODY: ${chunk}`);
                    })
                    .on('end', (dt) => {
                        debug('No more data in response.', statusCode, responseBody);
                        resolve({statusCode: statusCode, body: responseBody});
                    })
                    .on('response', function(response) {
                        statusCode = response.statusCode;
                        debug("Status code: ", response.statusCode);                //  200
                        debug("Content type: ", response.headers['content-type']);  // 'image/png'
                    })
                    .on('error', function(err) {
                        debug("error: ", err);
                        reject(err);
                    })
            })

        })
};

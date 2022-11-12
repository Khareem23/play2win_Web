/**
 * Created by haywire on 17/05/17.
 */
"use strict";

/**
 * ************************ NOTE: *************************
 * Make sure to fill in the .env file. your Paytm AES key, merchant guid and wallet guid before running this test file.
 *
 * To debug, pass on the arguments DEBUG=paytmgratify:* via command line.
 * Passing additional argument DEBUG_PAYTM_API_CALL=yes enables debugging api calls with request's debug method.
 *
 * ********************************************************
 */

require('dotenv').config();
const gratification = require('./index');
const debug = require('debug')('paytmgratify:test');

function sendMoneyToClient(){

    gratification.gratifyCustomer(
        {
            transaction_type: 'staging',    // can be either 'staging' or 'production'
            order_id: 'GBI3847GF',
            cust_phone: '7777777777',
            amount: '1',
            currency_type: 'INR',
            message: 'this is test one rupee',
            isnew_user: false
        },
        {
            aes_key: process.env.AES_KEY,
            merchant_guid: process.env.MERCHANT_GUID,
            wallet_guid: process.env.WALLET_GUID
        },
        {
            platform_name: 'PayTM',
            ip_address: '127.0.0.1'
        }
    )
    .then((result)=>{
        debug("result from gratify customer: ", result.statusCode, result.body);
    })
    .catch((err)=>{
        debug("Error from gratify customer: ", err);
    })

}

sendMoneyToClient();

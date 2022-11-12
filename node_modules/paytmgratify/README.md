# PaytmGratify

**PaytmGratify** is a paytm module which helps in hassle free money transfer from Merchant Sub-Wallet to customer wallet.
It's built on top of the long updated project [paytmGratify](https://github.com/dinesh3836/paytmGratify).

Added features:

* Promisified the API
* Simplified library logic
* updated the API call to the most recent version
* wrote a test case to validate credentials quicky

## Installation

```
npm install paytmgratify
```

Additionally, you can clone from Github:
```
git clone https://github.com/hay-wire/paytmgratify.git
```
or
```
git clone git@github.com:hay-wire/paytmgratify.git
```

Or check the project online on [Github](https://github.com/hay-wire/paytmgratify)


## Usage
Require the library and call gratifyCustomer() with 3 argument objects, namely - transactionDetails, merchantDetails, platformDetails.
It returns a promise on which you can ride forward.

To test the application, just run the test app with your .env file containing merchant specific credentials.


* Sample Code
```javascript

    const gratification = require('./index');
    const debug = require('debug')('paytmgratify:test');

    gratification.gratifyCustomer(
            {
                transaction_type: 'staging',                // can be either 'staging' or 'production'
                order_id: 'GBI3847GF',                      // your unique order id - must be unique for each transaction
                cust_phone: '7777777777',                   // customer's phone number. 7777777777 is for testing with PayTM
                amount: 1,                                  // how much money would you like to pay?
                currency_type: 'INR',                       // currency code for India
                message: 'this is test one rupee',          // your message to the customer
                isnew_user: false                           // make it true to gratify the customer in case he does not have a PayTM wallet at the moment
            },
            {
                aes_key: process.env.AES_KEY,               // Given by Paytm
                merchant_guid: process.env.MERCHANT_GUID,   // Given by Paytm
                wallet_guid: process.env.WALLET_GUID        // Given by Paytm
            },
            {
                platform_name: 'PayTM',                     // your platform name. Keep PayTM for testing
                ip_address: '127.0.0.1'                     // your server's IP address
            }
        )
        .then((result)=>{
            // might not be all good.Their http status code is 200 even if the body statusMessage
            // says 'You are not authorised!' so keep a tab on the result.body message
            debug("result from gratify customer: ", result.statusCode, result.body);
        })
        .catch((err)=>{
            // an error occurred in calling ht API
            debug("Error from gratify customer: ", err);
        })

```

##References
* [Paytm Gateway Reference](http://paywithpaytm.com/)
* [Paytm Api Documentation](http://paywithpaytm.com/developer/paytm_api_doc/)

##Author
* [Haywire](https://github.com/hay-wire)
* [Dinesh Kumar Sharma](https://in.linkedin.com/in/dinesh-sharma-2a7312100)


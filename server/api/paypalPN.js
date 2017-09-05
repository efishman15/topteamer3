var path = require('path');
var async = require('async');
var exceptions = require(path.resolve(__dirname,'../utils/exceptions'));
var logger = require(path.resolve(__dirname,'../utils/logger'));
var paymentUtils = require(path.resolve(__dirname,'../business_logic/payments'));
var https = require('https');
var querystring = require('querystring');

var SANDBOX_URL = 'www.sandbox.paypal.com';
var LIVE_URL = 'www.paypal.com';

//----------------------------------------------------
// ipn
//
// Request coming from paypal servers
//----------------------------------------------------
module.exports.ipn = function (req, res, next) {

    var payPalData = req.body;
    var data = {};

    logger.paypalIPN.info(payPalData, 'incoming paypal ipn');

    res.send(200); //Instantly respond

    var postData = querystring.stringify(payPalData);

    //Very important - paypal needs the exact same query string, and stringify escapes characters...
    postData = querystring.unescape(postData);

    postData = 'cmd=_notify-validate&' + postData;

    //Set up the request to paypal
    var options = {
        host: LIVE_URL,
        port: 443,
        method: 'POST',
        path: '/cgi-bin/webscr',
        headers: {'Content-Length': postData.length}
    };

    var paypalResponse = '';
    var validateRequest = https.request(options, function (validateResponse) {

        validateResponse.setEncoding('utf8');

        validateResponse.on('data', function (chunk) {
            paypalResponse += chunk;
        });

        validateResponse.on('end', function () {

            if (paypalResponse === 'VERIFIED') {
                logger.paypalIPN.info(null, 'ipn verified');

                data.method = 'paypal';
                data.thirdPartyServerCall = true;
                data.sessionOptional = true;
                data.paymentData = payPalData;

                paymentUtils.innerProcessPayment(data, function (err, response) {
                    if (err) {
                        logger.paypalIPN.error(err, 'Error in innerProcessPayment');
                    }

                    res.end();

                });
            }
            else {
                logger.paypalIPN.error(null, 'ipn response not verified, result=' + paypalResponse);
            }
        });
    });

    validateRequest.on('error', function (error) {
        callback(new exceptions.ServerException('Error recevied from paypal while processing ipn', {
            'data': data,
            'error': error
        },'error'));
    });

    validateRequest.write(postData);

    validateRequest.end();
}

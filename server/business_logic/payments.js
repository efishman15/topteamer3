var path = require('path');
var sessionUtils = require(path.resolve(__dirname,'../business_logic/session'));
var uuid = require('node-uuid');
var async = require('async');
var exceptions = require(path.resolve(__dirname,'../utils/exceptions'));
var ObjectId = require('mongodb').ObjectID;
var dalDb = require(path.resolve(__dirname,'../dal/dalDb'));
var dalFacebook = require(path.resolve(__dirname,'../dal/dalFacebook'));
var generalUtils = require(path.resolve(__dirname,'../utils/general'));
var google = require('googleapis');
var Androidpublisher = google.androidpublisher('v2');
var jwtClient;

var PaypalObject = require('paypal-express-checkout').Paypal;
var paypal;
var paypalSettings;

PaypalObject.prototype.origParams = PaypalObject.prototype.params;
PaypalObject.prototype.params = function () {
    var myParams = paypal.origParams();
    myParams.SOLUTIONTYPE = 'Sole';
    myParams.LANDINGPAGE = 'Billing';
    myParams.VERSION = '124';
    return myParams;
};

//----------------------------------------------------
// private Functions
//----------------------------------------------------

//----------------------------------------------------
// prepareClientResponse
//----------------------------------------------------
function prepareClientResponse(data) {
    data.clientResponse = {};
    data.clientResponse.features = data.session.features;
    data.clientResponse.featurePurchased = data.featurePurchased;
    data.clientResponse.nextView = generalUtils.settings.server.features[data.featurePurchased].view;
}

//---------------------------------------------------------
// analyzePaypalStatus
//
// Play with 'switches' according to the payment status
//---------------------------------------------------------
function analyzePaypalStatus(data) {
    switch (data.newPurchase.status) {

        //------------------------------------------------------------------------------------------------------
        //-- Proceed with the payment and give the asset if it does not exist
        //------------------------------------------------------------------------------------------------------
        case 'Completed':               //The payment has been completed, and the funds have been added successfully to your account balance.
        case 'Canceled_Reversal':       //A reversal has been canceled; for example, when you win a dispute and the funds for the reversal have been returned to you.
        case 'Completed-Funds-Held':    //The payment has been completed, and the funds have been added successfully to your pending balance.
        case 'Completed_Funds_Held':    //The payment has been completed, and the funds have been added successfully to your pending balance.
            //See the PAYMENTINFO_n_HOLDDECISION field for more information.
            data.proceedPayment = true;
            break;

        //------------------------------------------------------------------------------------------------------
        //-- Temporary state, just write the transaction, notify client on pending - if coming from client
        //------------------------------------------------------------------------------------------------------
        case 'Pending':                 //The payment is pending. See the PendingReason field for more information.
        case 'In-Progress':             //The transaction has not terminated, e.g. an authorization may be awaiting completion.
            data.serverErrorType = 'SERVER_ERROR_PURCHASE_IN_PROGRESS';
            break;

        //------------------------------------------------------------------------------------------------------
        //-- Revoke the asset
        //------------------------------------------------------------------------------------------------------
        case 'Partially_Refunded':      //The payment has been partially refunded.
        case 'Refunded':                //You refunded the payment.
        case 'Reversed':                //A payment was reversed due to a chargeback or other type of reversal. The funds have been removed from your account balance and returned to the buyer. The reason for the reversal is specified in the ReasonCode element.
            data.revokeAsset = true;
            data.itemCharged = true;
            break;

        //------------------------------------------------------------------------------------------------------
        //-- Terminal state - purchase failed, money has not been recieved - just log the transaction
        //------------------------------------------------------------------------------------------------------
        case 'Denied':                  //You denied the payment. This happens only if the payment was previously pending because of possible reasons described for the PendingReason element.
        case 'Expired':                 //the authorization period for this payment has been reached.
        case 'None':                    //No status.
        case 'Failed':                  //The payment has failed. This happens only if the payment was made from your buyer's bank account.
        case 'Voided':                 //An authorization for this transaction has been voided.
            data.serverErrorType = 'SERVER_ERROR_PURCHASE_FAILED';
            break;

        //------------------------------------------------------------------------------------------------------
        //-- Just log the transaction
        //------------------------------------------------------------------------------------------------------
        case 'Processed':               //A payment has been accepted.
            break;

        //------------------------------------------------------------------------------------------------------
        //-- Just log the transaction
        //------------------------------------------------------------------------------------------------------
        default:
            break;
    }
}

//----------------------------------------------------
// payPalBuy
//
// data:
// input: feature, language
// output: url to surf to
//----------------------------------------------------
module.exports.payPalBuy = function (req, res, next) {

    if (!paypal) {
        paypalSettings = generalUtils.settings.server.payments.paypal;

        //returnUrl, cancelUrl will be set just before each buy
        paypal = require('paypal-express-checkout').init(paypalSettings.user, paypalSettings.password, paypalSettings.signature, '', '', paypalSettings.debug);
    }

    var token = req.headers.authorization;
    var data = req.body;

    if (!data.language) {
        exceptions.ServerResponseException(res, 'Language not received during payPal buy', null, 'warn', 424);
        return;
    }

    var operations = [

        //getSession
        function (callback) {
            data.token = token;
            sessionUtils.getSession(data, callback);
        },

        //Validate the payment transaction based on method
        function (data, callback) {

            //Invoice number will contain the product id which will be required later for validation
            var invoiceNumber = uuid.v1() + '_' + data.session.userId + '_' + data.feature;

            var feature = generalUtils.settings.server.features[data.feature];
            if (!feature) {
                exceptions.ServerResponseException(res, 'Invalid feature received during payPal buy', {'feature': data.feature}, 'warn', 424);
                return;
            }

            var purchaseProduct = generalUtils.settings.server.payments.purchaseProducts[feature.purchaseProductId];
            var purchaseProductDisplayName = purchaseProduct.displayNames[data.language];
            if (!purchaseProductDisplayName) {
                exceptions.ServerResponseException(res, 'Unable to find product display name during payPal buy', {'data': data}, 'warn', 424);
                return;
            }

            var urlPrefix;
            if (req.connection.encrypted) {
                urlPrefix = generalUtils.settings.client.general.baseUrlSecured;
            }
            else {
                urlPrefix = generalUtils.settings.client.general.baseUrl;
            }

            paypal.returnUrl = urlPrefix + paypalSettings.successUrl;
            paypal.cancelUrl = urlPrefix + paypalSettings.cancelUrl;

            paypal.pay(invoiceNumber,
                purchaseProduct.cost,
                purchaseProductDisplayName, 'USD', function (err, url) {
                    if (err) {

                        dalDb.closeDb(data);
                        exceptions.ServerResponseException(res, err, null, 'warn', 424);
                        return;

                    }

                    data.response = {'url': url};

                    dalDb.closeDb(data);

                    callback(null, data);

                });
        }

    ];

    async.waterfall(operations, function (err, data) {
        if (!err) {
            res.json(data.response);
        }
        else {
            res.send(err.httpStatus, err);
        }
    })
};

//-----------------------------------------------------------------------------------------------
// processPayment
//
// data: method (paypal, google, ios, facebook)
//
// For paypal -
//      purchaseData.purchaseToken,
//      purchaseData.payerId
// For facebook - 2 cases:
// - When coming from client:
//      purchaseData.payment_id,
//      purchaseData.amount,
//      purchaseData.currency,
//      purchaseData.quantity,
//      purchaseData.request_id,
//      purchaseData.status,
//      purchaseData.signed_request
//
// - When coming from facebook server callback:
//      entry[0].id is the payment id,
//      entry[0].changed_fields are the fields changed that raised the call
//-----------------------------------------------------------------------------------------------
module.exports.processPayment = function (req, res, next) {

    var token = req.headers.authorization;
    var data = req.body;
    data.token = token;

    if (data.method === 'facebook') {
        //For facebook payments
        data.paymentId = data.purchaseData.payment_id;
    }

    innerProcessPayment(data, function (err, data) {
        if (!err) {
            res.json(data.clientResponse);
        }
        else if (err.httpStatus) {
            res.send(err.httpStatus, err);
        }
        else {
            if (err.message === 'DuplicatePurchase') {
                //This is an intentional stop - data contains client response
                //A duplicate purchase which has completed successfully by another thread
                //The 'additionalInfo' of the err object is the data
                res.json(err.additionalInfo.clientResponse)

            }
            else {
                res.send(err.httpStatus, err);
            }
        }
    });
}

//-----------------------------------------------------------------------------------------------
// innerProcessPayment
//
// like processPayment - but can also be called from Paypal IPN or facebook payments callback
// In this case - can be offline - and session is not required
//-----------------------------------------------------------------------------------------------
module.exports.innerProcessPayment = innerProcessPayment;
function innerProcessPayment(data, callback) {

    var now = (new Date()).getTime();
    var operations = [

        function (callback) {

            data.newPurchase = {'method': data.method};

            switch (data.method) {
                case 'paypal':
                    if (!data.thirdPartyServerCall) {
                        //comming from client
                        paypal.detail(data.purchaseData.purchaseToken, data.purchaseData.payerId, function (err, paypalData, invoiceNumber, amount) {
                            if (err) {
                                callback(new exceptions.ServerException('Error during DoExpressCheckoutPayment', {
                                    'error': err,
                                    'purchaseData': data.purchaseData
                                }, 'error', 403));
                            }

                            data.paymentData = paypalData;

                            data.newPurchase.transactionId = paypalData.PAYMENTINFO_0_TRANSACTIONID;
                            data.newPurchase.status = paypalData.PAYMENTINFO_0_PAYMENTSTATUS;
                            data.newPurchase.amount = paypalData.PAYMENTINFO_0_AMT;
                            data.newPurchase.currency = paypalData.PAYMENTINFO_0_CURRENCYCODE
                            data.newPurchase.extraData = data.paymentData;

                            //invoiceNumber is in the format InvoiceNumner_userId_featureName
                            data.featurePurchased = invoiceNumber.split('_')[2];

                            analyzePaypalStatus(data);

                            dalDb.insertPurchase(data, callback);
                        })
                    }
                    else {
                        //Server call
                        data.newPurchase.transactionId = data.paymentData.txn_id;
                        data.newPurchase.status = data.paymentData.payment_status;
                        data.newPurchase.amount = data.paymentData.mc_gross;
                        data.newPurchase.currency = data.paymentData.mc_currency;
                        data.newPurchase.extraData = data.paymentData;

                        analyzePaypalStatus(data);

                        var invoiceNumberParts = data.paymentData.invoice.split('_');

                        data.userId = invoiceNumberParts[1];
                        data.featurePurchased = invoiceNumberParts[2];

                        dalDb.insertPurchase(data, callback);
                    }
                    break;

                case 'facebook':
                    dalFacebook.getPaymentInfo(data, function () {
                        data.newPurchase.transactionId = data.paymentData.id;
                        data.newPurchase.status = data.paymentData.status;
                        data.newPurchase.amount = data.paymentData.actions[0].amount;
                        data.newPurchase.currency = data.paymentData.actions[0].currency;
                        data.newPurchase.extraData = data.paymentData;
                        dalDb.insertPurchase(data, callback);
                    });
                    break;

                case 'android':

                    if (!jwtClient) {
                        jwtClient = new google.auth.JWT(generalUtils.settings.server.google.api.auth.email, null, generalUtils.settings.server.google.api.auth.privateKey, generalUtils.settings.server.google.api.auth.scopes, null);
                    }

                    jwtClient.authorize(function(err, tokens) {
                        if (err) {
                            callback(new exceptions.ServerException('Unable to authorize to google with jwt', {'purchaseData': data.purchaseData, 'googleError' : err},'error'));
                            return;
                        }

                        var params = {
                            auth : jwtClient,
                            packageName: data.purchaseData.packageName,
                            productId: data.purchaseData.productId,
                            token: data.purchaseData.purchaseToken
                        };

                        Androidpublisher.purchases.products.get(params, function(purchaseError, purchaseResponse) {
                            // handle err and response
                            if (err) {
                                callback(new exceptions.ServerException('Unable to verify google purchase', {'purchaseData': data.purchaseData, 'googleError' : purchaseError},'error'));
                                return;
                            }

                            if (purchaseResponse.consumptionState !== 0) {
                                callback(new exceptions.ServerException('This purchase has already been consumed', {'purchaseData': data.purchaseData, 'purchaseResponse' : purchaseResponse},'error'));
                                return;
                            }

                            data.newPurchase.transactionId = data.purchaseData.orderId;
                            data.newPurchase.amount = data.extraPurchaseData.actualCost;
                            data.newPurchase.currency = data.extraPurchaseData.actualCurrency;
                            data.newPurchase.extraData = data.purchaseData;

                            data.featurePurchased = data.extraPurchaseData.featurePurchased;
                            data.paymentData = data.purchaseData;

                            switch (purchaseResponse.purchaseState) {
                                case 0: //completed
                                    data.newPurchase.status = 'completed';
                                    data.proceedPayment = true;
                                    break;
                                case 1: //canceled
                                    data.newPurchase.status = 'canceled';
                                    data.revokeAsset = true;
                                    break;
                                case 2: //refunded
                                    data.newPurchase.status = 'refunded';
                                    data.proceedPayment = true;
                                    break;
                            }

                            dalDb.insertPurchase(data, callback);

                        });
                    });

                    break;
            }
        },

        //getSession
        function (data, callback) {
            sessionUtils.getSession(data, callback);
        },

        //check for duplicate purchase (client and server occur at the same time or hacking)
        function (data, callback) {
            if (data.duplicatePurchase) {
                dalDb.closeDb(data);
                if (!data.thirdPartyServerCall) {
                    prepareClientResponse(data);
                }
                callback(new exceptions.InternalServerException('DuplicatePurchase', data));
            }
            else {
                callback(null, data);
            }
        },

        //Validate the payment transaction based on method
        function (data, callback) {

            switch (data.method) {
                case 'paypal':
                case 'android':
                    callback(null, data);
                    break;

                case 'facebook':
                    //Double check - if client tries to hack without a signed request
                    //Make sure the purchase belongs to him
                    if (data.session && data.purchaseData && !data.purchaseData.signed_request && data.paymentData.user && data.paymentData.user.id !== data.session.facebookUserId) {
                        callback(new exceptions.ServerException('Error validating payment, payment belongs to someone else', {
                            'purchaseData': data.purchaseData,
                            'paymentData': data.paymentData,
                            'actualFacebookId': data.session.facebookUserId
                        },'error'));
                        return;
                    }

                    callback(null, data);
                    break;

                default:
                    callback(new exceptions.ServerException('Method not supported for payment validation', {'method': data.method},'error', 403));
                    return;
            }
        },

        //Store the asset at the session's level
        function (data, callback) {

            if ((data.proceedPayment || data.revokeAsset || (data.dispute && data.itemCharged)) &&
                data.session) {

                if (data.revokeAsset) {
                    //Revoke the asset if it has been bought within the same purchase method
                    if (data.session.assets && data.session.assets[data.featurePurchased] && data.session.assets[data.featurePurchased].method === data.method) {
                        delete data.session.assets[data.featurePurchased];
                    }
                }
                else {
                    //Give the asset
                    if (!data.session.assets) {
                        data.session.assets = {};
                    }

                    data.session.assets[data.featurePurchased] = {'purchaseDate': now, 'method': data.method};
                    data.session.features = sessionUtils.computeFeatures(data.session);
                }

                if (!data.thirdPartyServerCall) {
                    prepareClientResponse(data);
                }

                data.setData = {assets: data.session.assets, features: data.session.features};
                dalDb.setSession(data, callback);
            }
            else {
                callback(null, data);
            }
        },

        //Store the asset at the user's level
        function (data, callback) {

            if ((data.proceedPayment || data.revokeAsset || (data.dispute && data.itemCharged))) {
                if (!data.session) {
                    if (data.userId) {
                        data.setUserWhereClause = {'_id': ObjectId(data.userId)};
                    }
                    else if (data.facebookUserId) {
                        data.setUserWhereClause = {'facebookUserId': data.facebookUserId};
                    }
                }
                else {
                    data.setUserWhereClause = {'_id': ObjectId(data.session.userId)};
                }

                if (data.revokeAsset) {
                    data.unsetData = {};
                    data.unsetData['assets.' + data.featurePurchased] = '';
                }
                else {
                    data.setData = {};
                    data.setData['assets.' + data.featurePurchased] = {'purchaseDate': now, 'method': data.method};

                    //Update only if asset does not exist yet
                    data.setUserWhereClause['assets.' + data.featurePurchased] = {$exists: false};
                }

                dalDb.setUser(data, callback);
            }
            else {
                callback(null, data);
            }
        },

        //Handle facebook dispute or revoke if required
        function (data, callback) {

            if (data.dispute && data.method === 'facebook') {
                //At this time - asset must already exist from previous steps
                //Deny the dispute - currently dispute supported on facebook only
                dalFacebook.denyDispute(data, callback);
            }
            else {
                callback(null, data);
            }
        },

        //Log the purchase and close db
        function (data, callback) {

            data.closeConnection = true;

            data.logAction = {'action': 'payment', 'extraData': data.paymentData};
            if (!data.session) {
                if (data.userId) {
                    data.logAction.userId = data.userId;
                }
                else if (data.facebookUserId) {
                    data.logAction.facebookUserId = data.facebookUserId;
                }
            }
            else {
                data.logAction.userId = data.session.userId;
            }
            dalDb.logAction(data, callback);
        }
    ];

    async.waterfall(operations, callback);

};

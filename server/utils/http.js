var path = require('path');
var exceptions = require(path.resolve(__dirname,'../utils/exceptions'));
var request = require('request');

//---------------------------------------------------------------------------------------------------------------------------------
// Get http request
//
// Calls api with method get
//---------------------------------------------------------------------------------------------------------------------------------
module.exports.get = get;
function get(options, callback) {
    return api(options, 'get', callback);
}

//---------------------------------------------------------------------------------------------------------------------------------
// Post http request
//
// Calls api with method post
//---------------------------------------------------------------------------------------------------------------------------------
module.exports.post = post;
function post(options, callback) {
    return api(options, 'post', callback);
}

//---------------------------------------------------------------------------------------------------------------------------------
// api
// options - {'url' : url, 'qs' : qs, 'json' : true/false, 'body' : jsonobject
// General function performing http(s) GET/POST
//---------------------------------------------------------------------------------------------------------------------------------
function api(options, method, callback) {

    var apiRequest;
    switch (method) {
        case 'get' :
            apiRequest = request.get;
            break;
        case 'post':
            apiRequest = request.post;
            break;

        default:
            callback(new exceptions.ServerException('Unsupported method during api', {
                'options': options,
                'method' : method
            },'error'));

    }

    apiRequest(options, function (err, resp, body) {
      if (err) {
            callback(new exceptions.ServerException('Error during request from api', {
                'options': options,
                'error': err
            },'error'));
            return;
        }
        var responseData;
        try {
            if (options.json) {
                responseData = body;
            }
            else {
                responseData = JSON.parse(body);
            }
        }
        catch (e) {
            callback(new exceptions.ServerException('Error parsing api response', {
                'options': options,
                'body': body,
                'error': e
            },'error'));
            return;
        }

        if (responseData.error) {
            callback(new exceptions.ServerException('Error received from api', {
                'options': options,
                'responseData': responseData
            },'error'));
            return;
        }

        callback(null, responseData);
    });
}

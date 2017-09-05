var client_1 = require('./client');
var objects_1 = require('../objects/objects');
//------------------------------------------------------
//-- getLoginStatus
//------------------------------------------------------
exports.getLoginStatus = function () {
    return new Promise(function (resolve, reject) {
        var connectInfo;
        if (!window.cordova) {
            window.FB.getLoginStatus(function (response) {
                if (response && response.status === 'connected') {
                    connectInfo = new objects_1.ConnectInfo('facebook');
                    connectInfo.facebookInfo = new objects_1.FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
                    resolve(connectInfo);
                }
                else {
                    reject();
                }
            });
        }
        else {
            window.facebookConnectPlugin.getLoginStatus(function (response) {
                if (response && response.status === 'unknown') {
                    //Give it another try as facebook native is not yet initiated
                    setTimeout(function () {
                        window.facebookConnectPlugin.getLoginStatus(function (response) {
                            if (response && response.status === 'connected') {
                                connectInfo = new objects_1.ConnectInfo('facebook');
                                connectInfo.facebookInfo = new objects_1.FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
                            }
                            resolve(connectInfo);
                        }, function (error) {
                            reject(error);
                        });
                    }, 500);
                }
                else if (response && response.status === 'connected') {
                    connectInfo = new objects_1.ConnectInfo('facebook');
                    connectInfo.facebookInfo = new objects_1.FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
                    resolve(connectInfo);
                }
                else {
                    reject();
                }
            }, function (error) {
                reject(error);
            });
        }
    });
};
//------------------------------------------------------
//-- login
//------------------------------------------------------
exports.login = function (permissions, rerequestDeclinedPermissions) {
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        if (!permissions) {
            permissions = client.settings.facebook.readPermissions;
        }
        var connectInfo = new objects_1.ConnectInfo('facebook');
        if (!window.cordova) {
            var permissionObject = {};
            permissionObject['scope'] = permissions.toString();
            if (rerequestDeclinedPermissions) {
                permissionObject['auth_type'] = 'rerequest';
            }
            window.FB.login(function (response) {
                if (response && response.authResponse) {
                    connectInfo.facebookInfo = new objects_1.FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
                    resolve(connectInfo);
                }
                else {
                    reject(response.status);
                }
            }, permissionObject);
        }
        else {
            window.facebookConnectPlugin.login(client.settings.facebook.readPermissions, function (response) {
                if (response && response.authResponse) {
                    connectInfo.facebookInfo = new objects_1.FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
                    resolve(connectInfo);
                }
            }, function (err) {
                reject(err);
            });
        }
    });
};
//------------------------------------------------------
//-- logout
//------------------------------------------------------
exports.logout = function () {
    return new Promise(function (resolve, reject) {
        if (!window.cordova) {
            window.FB.logout(function (response) {
                resolve(response);
            });
        }
        else {
            window.facebookConnectPlugin.logout(function (response) {
                resolve(response);
            });
        }
    });
};
//------------------------------------------------------
//-- post
//------------------------------------------------------
exports.post = function (story) {
    return new Promise(function (resolve, reject) {
        if (window.cordova) {
            var mobilePostObject = {
                'method': 'share_open_graph',
                'action': story.action,
                'object': JSON.stringify(story.object)
            };
            window.facebookConnectPlugin.showDialog(mobilePostObject, function (response) {
                resolve(response);
            }, function (error) {
                reject(error);
            });
        }
        else {
            var webPostObject = {
                'method': 'share_open_graph',
                'action_type': story.action,
                'action_properties': story.object
            };
            try {
                window.FB.ui(webPostObject, function (response) {
                    resolve(response);
                });
            }
            catch (error) {
                reject(error);
            }
        }
    });
};
//------------------------------------------------------
//-- buy
//------------------------------------------------------
exports.buy = function (purchaseDialogData) {
    return new Promise(function (resolve, reject) {
        try {
            window.FB.ui(purchaseDialogData, function (response) {
                resolve(response);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
//# sourceMappingURL=facebook.js.map
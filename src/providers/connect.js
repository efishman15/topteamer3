var _this = this;
var client_1 = require('./client');
var facebookService = require('./facebook');
var objects_1 = require('../objects/objects');
var CONNECT_INFO_KEY = 'connectInfo';
//------------------------------------------------------
//-- private functions
//------------------------------------------------------
//------------------------------------------------------
//-- createGuest
//------------------------------------------------------
function createGuest() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    var connectInfo = new objects_1.ConnectInfo('guest');
    connectInfo.guestInfo = new objects_1.GuestInfo(uuid);
    return connectInfo;
}
//------------------------------------------------------
//-- getInfo
//------------------------------------------------------
function getInfo() {
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        if (client.user.credentials) {
            resolve(client.user.credentials);
            return;
        }
        var connectInfoString = localStorage.getItem(CONNECT_INFO_KEY);
        if (connectInfoString) {
            client.user.credentials = JSON.parse(connectInfoString);
            resolve(client.user.credentials);
            return;
        }
        //Legacy code - for old clients which are connected to facebook but still
        //do not have anything in localStorage
        facebookService.getLoginStatus().then(function (connectInfo) {
            resolve(connectInfo);
        }, function () {
            reject();
        });
    });
}
//------------------------------------------------------
//-- public functions
//------------------------------------------------------
//------------------------------------------------------
//-- getLoginStatus
//------------------------------------------------------
exports.getLoginStatus = function () {
    return new Promise(function (resolve, reject) {
        getInfo().then(function (connectInfo) {
            if (!connectInfo) {
                reject();
                return;
            }
            switch (connectInfo.type) {
                case 'facebook':
                    if (connectInfo.facebookInfo) {
                        resolve(connectInfo);
                    }
                    else {
                        facebookService.getLoginStatus().then(function (connectInfo) {
                            resolve(connectInfo);
                        }, function () {
                            reject();
                        });
                    }
                    break;
                case 'guest':
                    resolve(connectInfo);
                    break;
                default:
                    reject();
                    break;
            }
        }, function () {
            reject();
        });
    });
};
//------------------------------------------------------
//-- login
//------------------------------------------------------
exports.login = function (permissions, rerequestDeclinedPermissions) {
    return new Promise(function (resolve, reject) {
        getInfo().then(function (connectInfo) {
            exports.specificLogin(connectInfo, permissions, rerequestDeclinedPermissions).then(function (connectInfo) {
                resolve(connectInfo);
            }, function () {
                reject();
            });
        }, function () {
            reject();
        });
    });
};
exports.facebookLogin = function () {
    return _this.specificLogin(new objects_1.ConnectInfo('facebook'));
};
exports.guestLogin = function () {
    return _this.specificLogin(createGuest());
};
exports.specificLogin = function (connectInfo, permissions, rerequestDeclinedPermissions) {
    return new Promise(function (resolve, reject) {
        switch (connectInfo.type) {
            case 'facebook':
                facebookService.login(permissions, rerequestDeclinedPermissions).then(function (connectInfo) {
                    resolve(connectInfo);
                }, function () {
                    reject();
                });
                break;
            case 'guest':
                //Immediate resolve, connectionInfo will include the uuid
                //Immediatelly store credentials - new guest should not fail to connect/register in the server
                exports.storeCredentials(connectInfo);
                resolve(connectInfo);
                break;
            default:
                reject();
                break;
        }
    });
};
//------------------------------------------------------
//-- logout
//------------------------------------------------------
exports.logout = function () {
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        getInfo().then(function (connectInfo) {
            switch (connectInfo.type) {
                case 'facebook':
                    facebookService.logout().then(function () {
                        client.user.credentials = null;
                        localStorage.removeItem(CONNECT_INFO_KEY);
                        resolve();
                    });
                    break;
                case 'guest':
                    client.user.credentials = null;
                    localStorage.removeItem(CONNECT_INFO_KEY);
                    resolve();
                    break;
            }
        }, function () {
            reject();
        });
    });
};
//------------------------------------------------------
//-- post
//------------------------------------------------------
exports.post = function (story) {
    return new Promise(function (resolve, reject) {
        getInfo().then(function (connectInfo) {
            switch (connectInfo.type) {
                case 'facebook':
                    facebookService.post(story).then(function () {
                        resolve();
                    }, function () {
                        reject();
                    });
                    break;
                case 'guest':
                    throw new Error('Posting in guest mode is not supported');
            }
        }, function () {
            reject();
        });
    });
};
//------------------------------------------------------
//-- buy
//------------------------------------------------------
exports.buy = function (purchaseDialogData) {
    return new Promise(function (resolve, reject) {
        getInfo().then(function (connectInfo) {
            switch (connectInfo.type) {
                case 'facebook':
                    facebookService.buy(purchaseDialogData).then(function () {
                        resolve();
                    }, function () {
                        reject();
                    });
                    break;
                case 'guest':
                    throw new Error('Buying in guest mode is not supported');
            }
        }, function () {
            reject();
        });
    });
};
//------------------------------------------------------
//-- storeCredentials
//------------------------------------------------------
exports.storeCredentials = function (connectInfo) {
    var client = client_1.Client.getInstance();
    var storedConnectInfo;
    if (connectInfo.type === 'facebook') {
        //For facebook - do not store in our storage any access token / user id
        storedConnectInfo = new objects_1.ConnectInfo('facebook');
    }
    else {
        storedConnectInfo = connectInfo;
    }
    localStorage.setItem(CONNECT_INFO_KEY, JSON.stringify(storedConnectInfo));
    client.user.credentials = connectInfo;
};
//# sourceMappingURL=connect.js.map
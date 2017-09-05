var _this = this;
var client_1 = require('./client');
function getAlignedTitle(title) {
    var client = client_1.Client.getInstance();
    return '<span class="app-alert-' + client.currentLanguage.direction + '">' + title + '</span>';
}
//------------------------------------------------------
//-- alert
//------------------------------------------------------
exports.alert = function (message, buttons) {
    var client = client_1.Client.getInstance();
    var title;
    var messageText;
    if (message.type) {
        if (!message.additionalInfo) {
            message.additionalInfo = {};
        }
        title = client.translate(message.type + '_TITLE', message.additionalInfo);
        messageText = client.translate(message.type + '_MESSAGE', message.additionalInfo);
    }
    else {
        messageText = message;
    }
    return exports.alertTranslated(title, messageText, buttons);
};
//------------------------------------------------------
//-- alert
//------------------------------------------------------
exports.alertTranslated = function (title, message, buttons) {
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        if (!buttons) {
            buttons = [
                {
                    text: client.translate('OK'),
                    role: 'cancel',
                    handler: resolve
                }
            ];
        }
        var alert = client.createAlert({
            message: message,
            buttons: buttons,
            cssClass: 'app-alert-' + client.currentLanguage.direction
        });
        if (title) {
            alert.setTitle(getAlignedTitle(title));
        }
        alert.present();
    });
};
//------------------------------------------------------
//-- confirm
//------------------------------------------------------
exports.confirm = function (title, message, params) {
    return new Promise(function (resolve, reject) {
        var client = client_1.Client.getInstance();
        var alert = client.createAlert({
            title: getAlignedTitle(client.translate(title, params)),
            message: client.translate(message, params),
            buttons: [
                {
                    text: client.translate('OK'),
                    handler: resolve
                },
                {
                    text: client.translate('CANCEL'),
                    handler: reject
                }
            ]
        });
        alert.present();
    });
};
//------------------------------------------------------
//-- confirmExitApp
//------------------------------------------------------
exports.confirmExitApp = function () {
    var client = client_1.Client.getInstance();
    return _this.confirm('EXIT_APP_TITLE', 'EXIT_APP_MESSAGE', null).then(function () {
        window.navigator['app'].exitApp();
    }, function () {
    });
};
//# sourceMappingURL=alert.js.map
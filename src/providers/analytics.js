var _this = this;
var client_1 = require('./client');
function trackingEnabled() {
    var client = client_1.Client.getInstance();
    return client.settings.analytics.track.events || client.settings.analytics.track.errors;
}
exports.init = function (token) {
    if (!trackingEnabled()) {
        return;
    }
    window.mixpanel.init(token);
};
exports.register = function (superProperties) {
    if (!trackingEnabled()) {
        return;
    }
    window.mixpanel.register(superProperties);
};
exports.identify = function (userId) {
    if (!trackingEnabled()) {
        return;
    }
    window.mixpanel.identify(userId);
};
exports.track = function (eventName, eventProperties) {
    var client = client_1.Client.getInstance();
    if (!client.settings.analytics.track.events) {
        return;
    }
    window.mixpanel.track(eventName, eventProperties);
};
exports.setUserPermanentData = function (data) {
    if (!trackingEnabled()) {
        return;
    }
    window.mixpanel.people.set(data);
};
//Currently implementing loggin errors to the same mixpanel analytics tool
//All errros will be recorded under a single event: 'error' with data of the error in the event properties
exports.logError = function (type, error) {
    var client = client_1.Client.getInstance();
    if (!client.settings.analytics.track.errors) {
        return;
    }
    _this.track('error', { type: type, error: JSON.stringify(error) });
};
//# sourceMappingURL=analytics.js.map
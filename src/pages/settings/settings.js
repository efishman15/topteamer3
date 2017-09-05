var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var client_1 = require('../../providers/client');
var connectService = require('../../providers/connect');
var analyticsService = require('../../providers/analytics');
var SettingsPage = (function () {
    function SettingsPage() {
        this.client = client_1.Client.getInstance();
    }
    SettingsPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/settings');
        this.originalLanguage = this.client.session.settings.language;
    };
    SettingsPage.prototype.ionViewDidLeave = function () {
        if (this.client.session.settings.language != this.originalLanguage) {
            var directionChanged = false;
            if (this.client.settings.languages[this.client.session.settings.language].direction !== this.client.settings.languages[this.originalLanguage].direction) {
                directionChanged = true;
            }
            this.client.events.publish('app:languageChanged', directionChanged);
        }
    };
    SettingsPage.prototype.toggleSettings = function (name, initPushService) {
        var _this = this;
        analyticsService.track('settings/' + name + '/' + !this.client.session.settings[name]);
        this.client.toggleSettings(name).then(function () {
            if (initPushService) {
                _this.client.initPushService();
            }
        }, function () {
            //Revert GUI on server error
            var currentValue = _this.client.getRecursiveProperty(_this.client.session.settings, name);
            _this.client.setRecursiveProperty(_this.client.session.settings, name, !currentValue);
        });
    };
    SettingsPage.prototype.switchLanguage = function () {
        this.client.switchLanguage().then(function () {
        }, function () {
        });
    };
    SettingsPage.prototype.logout = function () {
        var _this = this;
        analyticsService.track('settings/logout');
        connectService.logout().then(function () {
            _this.client.logout();
            _this.client.setRootPage('LoginPage');
        }, function () {
        });
    };
    SettingsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/settings/settings.html'
        }), 
        __metadata('design:paramtypes', [])
    ], SettingsPage);
    return SettingsPage;
})();
exports.SettingsPage = SettingsPage;
//# sourceMappingURL=settings.js.map
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
var LoginPage = (function () {
    function LoginPage() {
        this.client = client_1.Client.getInstance();
    }
    LoginPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.client.setPageTitle('GAME_NAME');
        this.serverPopupHandler = function (eventData) {
            return _this.client.showModalPage('ServerPopupPage', { serverPopup: eventData[0] });
        };
        this.client.events.subscribe('app:serverPopup', this.serverPopupHandler);
    };
    LoginPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:serverPopup', this.serverPopupHandler);
    };
    LoginPage.prototype.ngOnInit = function () {
        this.client.hidePreloader();
    };
    LoginPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/login');
    };
    LoginPage.prototype.ionViewDidEnter = function () {
        //Events here could be serverPopup just as the app loads - the page should be fully visible
        this.client.processInternalEvents();
    };
    LoginPage.prototype.loginToServer = function (connectInfo) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.client.serverConnect(connectInfo).then(function () {
                _this.client.playerInfoComponent.init(_this.client);
                _this.client.setRootPage('MainTabsPage');
                resolve();
            }, function () {
                reject();
            });
        });
    };
    LoginPage.prototype.facebookLogin = function () {
        var _this = this;
        analyticsService.track('login/facebookLogin');
        connectService.facebookLogin().then(function (connectInfo) {
            _this.loginToServer(connectInfo).then(function () {
                connectService.storeCredentials(connectInfo);
            });
        }, function () {
        });
    };
    ;
    LoginPage.prototype.registerGuest = function () {
        var _this = this;
        analyticsService.track('login/guest');
        connectService.guestLogin().then(function (connectInfo) {
            _this.loginToServer(connectInfo).then(function () {
            }, function () {
            });
        }, function () {
        });
    };
    LoginPage.prototype.changeLanguage = function (language) {
        this.client.user.settings.language = language;
        localStorage.setItem('language', language);
        analyticsService.track('login/changeLanguage', { language: language });
    };
    LoginPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/login/login.html'
        }), 
        __metadata('design:paramtypes', [])
    ], LoginPage);
    return LoginPage;
})();
exports.LoginPage = LoginPage;
//# sourceMappingURL=login.js.map
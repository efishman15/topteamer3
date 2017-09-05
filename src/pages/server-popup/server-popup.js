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
var ionic_angular_1 = require('ionic-angular');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var contestsService = require('../../providers/contests');
var ServerPopupPage = (function () {
    function ServerPopupPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.params = params;
        //Look for special variables such as #storeLink (based on client's platform
        for (var i = 0; i < this.params.data.serverPopup.buttons.length; i++) {
            if (this.params.data.serverPopup.buttons[i].link && this.params.data.serverPopup.buttons[i].link.indexOf('#storeLink') >= 0) {
                this.params.data.serverPopup.buttons[i].link = this.params.data.serverPopup.buttons[i].link.replaceAll('#storeLink', this.client.settings.platforms[this.client.clientInfo.platform].storeLink);
            }
        }
        this.viewController = viewController;
    }
    //The only life cycle eve currently called in modals
    ServerPopupPage.prototype.ngAfterViewInit = function () {
        analyticsService.track('page/serverPopup', { title: this.params.data.serverPopup.title, message: this.params.data.serverPopup.message });
    };
    ServerPopupPage.prototype.preventBack = function () {
        return this.params.data.serverPopup.preventBack;
    };
    ServerPopupPage.prototype.buttonAction = function (button) {
        var _this = this;
        switch (button.action) {
            case 'dismiss':
                this.viewController.dismiss(button);
                break;
            case 'link':
                {
                    window.open(button.link, '_system', 'location=yes');
                    this.viewController.dismiss(button);
                    break;
                }
            case 'linkExit':
                {
                    window.open(button.link, '_system', 'location=yes');
                    setTimeout(function () {
                        _this.client.platform.exitApp();
                    }, 1000);
                    break;
                }
            case 'share':
                {
                    if (button.contestId) {
                        contestsService.getContest(button.contestId).then(function (contest) {
                            _this.viewController.dismiss(button).then(function () {
                                _this.client.openPage('SharePage', { 'contest': contest, 'source': 'serverPopup' });
                            }, function () {
                            });
                        }, function () {
                            _this.viewController.dismiss(button);
                        });
                    }
                    else {
                        this.viewController.dismiss(button).then(function () {
                            _this.client.openPage('SharePage', { 'source': 'serverPopup' });
                        }, function () {
                        });
                    }
                    break;
                }
            case 'screen':
                {
                    this.viewController.dismiss(button).then(function () {
                        if (button.rootView) {
                            _this.client.setRootPage(button.screen, button.params);
                        }
                        else {
                            _this.client.openPage(button.screen, button.params);
                        }
                    }, function () {
                    });
                    break;
                }
        }
    };
    ServerPopupPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/server-popup/server-popup.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], ServerPopupPage);
    return ServerPopupPage;
})();
exports.ServerPopupPage = ServerPopupPage;
//# sourceMappingURL=server-popup.js.map
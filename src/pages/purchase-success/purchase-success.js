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
var PurchaseSuccessPage = (function () {
    function PurchaseSuccessPage(params) {
        this.client = client_1.Client.getInstance();
        this.params = params;
    }
    PurchaseSuccessPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/purchaseSuccess', { 'feature': this.params.data.featurePurchased });
        this.unlockText = this.client.translate(this.client.session.features[this.params.data.featurePurchased].unlockText);
    };
    PurchaseSuccessPage.prototype.proceed = function () {
        var _this = this;
        this.client.nav.popToRoot().then(function () {
            switch (_this.client.session.features[_this.params.data.featurePurchased].view.name) {
                case 'setContest':
                    _this.client.openPage('SetContestPage', _this.client.session.features[_this.params.data.featurePurchased].view.params);
                    break;
            }
        }, function () {
        });
    };
    PurchaseSuccessPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/purchase-sucess/purchase-success.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams])
    ], PurchaseSuccessPage);
    return PurchaseSuccessPage;
})();
exports.PurchaseSuccessPage = PurchaseSuccessPage;
//# sourceMappingURL=purchase-success.js.map
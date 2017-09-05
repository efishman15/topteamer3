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
var analyticsService = require('../../providers/analytics');
var alertService = require('../../providers/alert');
var SystemToolsPage = (function () {
    function SystemToolsPage() {
        this.client = client_1.Client.getInstance();
        //Init with first command
        this.commandId = this.client.settings.admin.commands[0].id;
    }
    SystemToolsPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/systemTools');
    };
    SystemToolsPage.prototype.runCommand = function () {
        var _this = this;
        var command;
        for (var i = 0; i < this.client.settings.admin.commands.length; i++) {
            if (this.client.settings.admin.commands[i].id === this.commandId) {
                command = this.client.settings.admin.commands[i];
                break;
            }
        }
        switch (command.type) {
            case 'system':
                if (command.confirm) {
                    alertService.confirm(command.confirm + '_TITLE', command.confirm + '_TEMPLATE').then(function () {
                        _this.runSystemCommand(command, true);
                    }, function () {
                    });
                }
                else {
                    this.runSystemCommand(command, false);
                }
                break;
            case 'download':
                var action = command.action.replace('{{token}}', this.client.session.token);
                window.open(this.client.endPoint + action, '_system', 'location=yes');
                setTimeout(function () {
                    _this.client.nav.pop();
                }, 500);
                break;
        }
    };
    SystemToolsPage.prototype.runSystemCommand = function (command, confirmed) {
        var _this = this;
        if (command.returnValue) {
            this.client.serverPost(command.action).then(function (data) {
                _this.client[command.returnValue] = data;
                if (confirmed) {
                    setTimeout(function () {
                        _this.client.nav.pop();
                    }, 500);
                }
                else {
                    _this.client.nav.pop();
                }
            }, function () {
            });
        }
        else {
            this.client.serverPost(command.action).then(function () {
                if (confirmed) {
                    setTimeout(function () {
                        _this.client.nav.pop();
                    }, 500);
                }
                else {
                    _this.client.nav.pop();
                }
            }, function () {
            });
        }
    };
    SystemToolsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/system-tools/system-tools.html'
        }), 
        __metadata('design:paramtypes', [])
    ], SystemToolsPage);
    return SystemToolsPage;
})();
exports.SystemToolsPage = SystemToolsPage;
//# sourceMappingURL=system-tools.js.map
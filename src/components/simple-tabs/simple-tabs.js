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
var SimpleTabsComponent = (function () {
    function SimpleTabsComponent() {
        this.simpleTabs = [];
    }
    SimpleTabsComponent.prototype.selectTab = function (simpleTab) {
        _deactivateAllTabs(this.simpleTabs);
        simpleTab.active = true;
        function _deactivateAllTabs(simpleTabs) {
            simpleTabs.forEach(function (simpleTab) { return simpleTab.isActive = false; });
        }
        //Bubble the event outside
        simpleTab.selected.emit();
    };
    SimpleTabsComponent.prototype.addTab = function (simpleTab) {
        if (this.simpleTabs.length === 0) {
            simpleTab.active = true;
        }
        this.simpleTabs.push(simpleTab);
    };
    SimpleTabsComponent.prototype.switchToTab = function (tabId) {
        if (tabId >= 0 && tabId < this.simpleTabs.length) {
            this.selectTab(this.simpleTabs[tabId]);
        }
    };
    SimpleTabsComponent = __decorate([
        core_1.Component({
            selector: 'simple-tabs',
            templateUrl: 'build/components/simple-tabs/simple-tabs.html'
        }), 
        __metadata('design:paramtypes', [])
    ], SimpleTabsComponent);
    return SimpleTabsComponent;
})();
exports.SimpleTabsComponent = SimpleTabsComponent;
//# sourceMappingURL=simple-tabs.js.map
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
var simple_tabs_1 = require('../simple-tabs/simple-tabs');
var SimpleTabComponent = (function () {
    function SimpleTabComponent(simpleTabs) {
        this.active = this.active || false;
        this.selected = new core_1.EventEmitter();
        simpleTabs.addTab(this);
    }
    Object.defineProperty(SimpleTabComponent.prototype, "isActive", {
        get: function () {
            return this.active;
        },
        set: function (value) {
            this.active = value;
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], SimpleTabComponent.prototype, "simpleTabTitle", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Object)
    ], SimpleTabComponent.prototype, "active", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], SimpleTabComponent.prototype, "selected", void 0);
    SimpleTabComponent = __decorate([
        core_1.Component({
            selector: 'simple-tab',
            templateUrl: 'build/components/simple-tab/simple-tab.html'
        }), 
        __metadata('design:paramtypes', [simple_tabs_1.SimpleTabsComponent])
    ], SimpleTabComponent);
    return SimpleTabComponent;
})();
exports.SimpleTabComponent = SimpleTabComponent;
//# sourceMappingURL=simple-tab.js.map
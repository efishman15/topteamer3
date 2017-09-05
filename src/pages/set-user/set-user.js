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
var forms_1 = require('@angular/forms');
var date_picker_1 = require('../../components/date-picker/date-picker');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var connectService = require('../../providers/connect');
var SetUserPage = (function () {
    function SetUserPage() {
        this.client = client_1.Client.getInstance();
        this.avatars = new Array();
        this.addAvatar(this.client.session.avatar.id, true);
        for (var i = 0; i < this.client.settings.general.avatars.length; i++) {
            if (this.client.settings.general.avatars[i] !== this.client.session.avatar.id) {
                this.addAvatar(this.client.settings.general.avatars[i], false);
            }
        }
        this.user = {
            avatar: this.client.session.avatar.id,
            //If session has a dob - the profile was already updated once - show the name
            //Otherwise - display an empty name to force the user to enter a name
            name: this.client.session.dob ? this.client.session.name : '',
            dob: this.client.session.dob ? this.client.session.dob : (new Date(2000, 0, 1)).getTime()
        };
        //Init form
        this.userForm = new forms_1.FormGroup({
            name: new forms_1.FormControl(this.user.name, [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.general.inputs.name.maxLength)])
        });
    }
    SetUserPage.prototype.ngAfterViewInit = function () {
        this.nameInput['_native']._elementRef.nativeElement.maxLength = this.client.settings.general.inputs.name.maxLength;
    };
    SetUserPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/setUser');
        this.submitted = false;
    };
    SetUserPage.prototype.addAvatar = function (id, selected) {
        var avatar = {};
        avatar.id = id;
        avatar.src = this.client.getGuestAvatarUrl(id);
        avatar.selected = selected;
        this.avatars.push(avatar);
    };
    SetUserPage.prototype.avatarClick = function (id) {
        for (var i = 0; i < this.avatars.length; i++) {
            if (this.avatars[i].id === id) {
                this.avatars[i].selected = true;
            }
            else {
                this.avatars[i].selected = false;
            }
        }
        this.user.avatar = id;
    };
    SetUserPage.prototype.getMaxEndDate = function () {
        return (new Date()).getTime() - 24 * 60 * 60 * 1000;
    };
    SetUserPage.prototype.dobSelected = function (dateSelection) {
        //Set the end date at the end of this day (e.g. 23:59:59.999)
        this.user.dob = dateSelection.epochLocal;
    };
    SetUserPage.prototype.setUser = function () {
        var _this = this;
        analyticsService.track('user/set/click');
        this.submitted = true;
        if (!this.userForm.valid) {
            return;
        }
        //If nothing changed - close page without saving
        if (this.user.name === this.client.session.name &&
            this.user.dob === this.client.session.dob &&
            this.user.avatar === this.client.session.avatar.id) {
            this.client.nav.pop();
            return;
        }
        this.client.setUser(this.user).then(function (contests) {
            _this.client.nav.pop();
        }, function () {
        });
    };
    SetUserPage.prototype.facebookLogin = function () {
        var _this = this;
        connectService.facebookLogin().then(function (connectInfo) {
            _this.client.upgradeGuest(connectInfo).then(function () {
                connectService.storeCredentials(connectInfo);
                if (_this.client.nav.canGoBack()) {
                    //In the scenraio of switch to another existing facebook user
                    //The client already popped evreything up to the root
                    _this.client.nav.pop();
                }
            }, function () {
            });
        }, function () {
        });
    };
    __decorate([
        core_1.ViewChild('nameInput'), 
        __metadata('design:type', core_1.ElementRef)
    ], SetUserPage.prototype, "nameInput", void 0);
    SetUserPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/set-user/set-user.html',
            directives: [forms_1.REACTIVE_FORM_DIRECTIVES, date_picker_1.DatePickerComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], SetUserPage);
    return SetUserPage;
})();
exports.SetUserPage = SetUserPage;
//# sourceMappingURL=set-user.js.map
import { Component, ViewChild } from '@angular/core';
import { Http } from '@angular/http';
import { Platform, Config, Events, AlertController, ModalController, MenuController, App, Nav } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';

//Components
import { LoadingModalComponent } from '../components/loading-modal/loading-modal';
import { PlayerInfoComponent } from '../components/player-info/player-info';


//Objects
import { AppPage, ConnectInfo, Contest } from '../objects/objects'

//Providers
import * as alertService from '../providers/alert';
import * as analyticsService from '../providers/analytics';
import { Client } from '../providers/client';
import * as connectService from '../providers/connect';
import * as contestsService from '../providers/contests';
import * as shareService from '../providers/share';

@Component({
    templateUrl: 'app.html'
})
export class TopTeamerApp {

    client: Client;
    @ViewChild(Nav) nav: Nav;
    @ViewChild(LoadingModalComponent) loadingModalComponent: LoadingModalComponent;
    @ViewChild(PlayerInfoComponent) playerInfoComponent: PlayerInfoComponent;

    app: App;
    platform: Platform;
    config: Config;
    http: Http;
    events: Events;
    alertController: AlertController;
    modalController: ModalController;
    menuController: MenuController;
    appVersion: AppVersion;

    constructor(app: App,
        platform: Platform,
        config: Config,
        http: Http,
        client: Client,
        events: Events,
        alertController: AlertController,
        modalController: ModalController,
        menuController: MenuController,
        appVersion: AppVersion) {

        this.app = app;
        this.platform = platform;
        this.config = config;
        this.http = http;
        this.client = client;
        this.events = events;
        this.alertController = alertController;
        this.modalController = modalController;
        this.menuController = menuController;
        this.appVersion = appVersion;
    }

    ngAfterViewInit() {
        this.client.init(this.app,
            this.platform,
            this.config,
            this.http,
            this.events,
            this.nav,
            this.alertController,
            this.modalController,
            this.loadingModalComponent,
            this.playerInfoComponent).then(() => {
                this.initApp();
            }, (err) => this.ngAfterViewInit());
    }

    initApp() {

        //TODO: navigate to PurchaseSuccess based on url params (if coming from paypal)

        this.client.platform.ready().then(() => {

            this.expandStringPrototype();
            this.declareRequestAnimationFrame();
            this.expandDatePrototype();

            this.initAnalytics();

            if (!window.cordova) {
                this.initWeb();
            }
            else {
                this.initMobile();
            }

            this.initBranch();

            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                window.StatusBar.styleDefault();
            }

            //Handle hardware back button
            this.client.platform.registerBackButtonAction(() => {

                var client = Client.getInstance();

                //Check if modal view is displayed, currently accessing non-public members of Ionic App
                //Waiting for Ionic team to expose checking if a modal view is displayed
                if (this.app['_portal']._views && this.app['_portal']._views.length > 0 && this.app['_portal']._views[0].isOverlay) {
                    return this.app['_portal']._views[0].dismiss();
                }

                //Root screen - confirm exit app
                if (!client.nav.canGoBack()) {
                    if (this.menuController.isOpen()) {
                        //if main menu is opened - back will close it
                        return this.menuController.close();
                    }
                    else {
                        //Main menu is closed - confirm exit app
                        return alertService.confirmExitApp();
                    }
                }

                //Go back
                return client.nav.pop();

            });

        }, () => {
        });
    };

    initWeb() {

        window.addEventListener('resize', (event) => {
            var client = Client.getInstance();
            client.resizeWeb();
        });

        this.client.resizeWeb();

        //Load branch mobile script
        window.loadJsFile('assets/lib/branch/web.min.js');

        //init facebook javascript sdk
        window.fbAsyncInit = () => {
            window.FB.init({
                appId: this.client.settings.facebook.appId,
                xfbml: true,
                cookie: true,
                version: this.client.settings.facebook.version
            });

            this.initLoginState();
        };

        (function (d, s, id) {
            var client = Client.getInstance();
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {
                return;
            }
            js = d.createElement(s);
            js.id = id;
            js.src = client.settings.facebook.sdk;
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }

    initMobile() {

        //Will discover which apps are installed (from a server list) and support sharing
        shareService.mobileDiscoverSharingApps();

        if (window.cordova.plugins.Keyboard) {
            window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            window.cordova.plugins.Keyboard.disableScroll(false);
        }

        //Hook into window.open
        window.open = window.cordova.InAppBrowser.open;

        //Load branch mobile script
        window.loadJsFile('assets/lib/branch/moblie.min.js');

        //Init android billing
        if (this.client.platform.is('android') && typeof window.inappbilling !== 'undefined') {
            window.inappbilling.init((resultInit) => {
            },
                (errorInit) => {
                    analyticsService.logError('InAppBilling', errorInit);
                }
                ,
                { showLog: true }, []
            );
        }

        document.addEventListener('resume', function (event) {
            if (window.initBranch) {
                window.initBranch();
            }
        });

        this.appVersion.getVersionNumber().then((version) => {
            this.client.user.clientInfo.appVersion = version;
            //The app version property will be sent on each event tracking
            analyticsService.register({ appVersion: version });
            this.initLoginState();
        }, () => {
        });
    }

    initAnalytics() {
        analyticsService.init(this.client.settings.analytics.mixpanel.token)
    }

    initBranch() {
        window.myHandleBranch = (err, data) => {
            try {
                if (err) {
                    analyticsService.logError('BranchIoError', err);
                    return;
                }

                if (data.data_parsed && data.data_parsed.contestId) {
                    //Will go to this contest
                    if (this.client.session && this.client.nav && this.client.nav.length() > 0) {
                        this.client.displayContestById(data.data_parsed.contestId);
                    }
                    else {
                        //Will be displayed on the first posibility
                        this.client.deepLinkContestId = data.data_parsed.contestId;
                    }
                }
            }
            catch (e) {
                analyticsService.logError('BranchIoParseDataError', { data: data, error: e });
            }
        }

        window.initBranch = () => {
            if (window.branch) {
                window.branch.init(this.client.settings.branch.key, (err, data) => {
                    if (window.myHandleBranch) {
                        window.myHandleBranch(err, data);
                    }
                });
            }
            else {
                console.log('branch script not loaded - retrying in 2000 ms.');
                setTimeout(() => {
                    window.initBranch();
                }, 2000)
            }
        }

        //Give the appropriate mobile/web branch js file time to load
        setTimeout(() => {
            window.initBranch();
        }, 2000)

    }

    initLoginState() {
        connectService.getLoginStatus().then((connectInfo: ConnectInfo) => {
            if (this.client.hasCredentials(connectInfo)) {
                this.client.serverConnect(connectInfo).then(() => {
                    connectService.storeCredentials(connectInfo);
                    this.playerInfoComponent.init(this.client);
                    let appPages: Array<AppPage> = new Array<AppPage>();
                    appPages.push(new AppPage('MainTabsPage', {}));
                    if (this.client.deepLinkContestId) {
                        contestsService.getContest(this.client.deepLinkContestId).then((contest: Contest) => {
                            this.client.deepLinkContestId = null;
                            appPages.push(new AppPage('ContestPage', { 'contest': contest, 'source': 'deepLink' }));
                            this.client.setPages(appPages).then(() => {
                                this.client.hidePreloader();
                            }, () => {
                            });
                        })
                    }
                    else {
                        this.client.setPages(appPages).then(() => {
                            this.client.hidePreloader();
                        }, () => {
                        });
                    }
                }, () => {
                    this.client.nav.setRoot(this.client.getPage('LoginPage'));
                })
            }
            else {
                this.client.nav.setRoot(this.client.getPage('LoginPage'));
            }
        }, () => {
            this.client.nav.setRoot(this.client.getPage('LoginPage'));
        });
    }

    declareRequestAnimationFrame() {

        // Fallback where requestAnimationFrame or its equivalents are not supported in the current browser
        window.myRequestAnimationFrame = (() => {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();
    }

    expandStringPrototype() {

        if (!String.prototype.format) {
            String.prototype.format = function () {
                var str = this;

                function replaceByObjectProperies(obj) {
                    for (var property in obj)
                        if (obj.hasOwnProperty(property))
                            //replace all instances case-insensitive
                            str = str.replace(new RegExp(escapeRegExp('{{' + property + '}}'), 'gi'), String(obj[property]));
                }

                function escapeRegExp(string) {
                    return string.replace(/([.*+?^=!:${{}}()|\[\]\/\\])/g, '\\$1');
                }

                function replaceByArray(arrayLike) {
                    for (var i = 0, len = arrayLike.length; i < len; i++)
                        str = str.replace(new RegExp(escapeRegExp('{{' + i + '}}'), 'gi'), String(arrayLike[i]));
                }

                if (!arguments.length || arguments[0] === null || arguments[0] === undefined)
                    return str;
                else if (arguments.length == 1 && Array.isArray(arguments[0]))
                    replaceByArray(arguments[0]);
                else if (arguments.length == 1 && typeof arguments[0] === 'object')
                    replaceByObjectProperies(arguments[0]);
                else
                    replaceByArray(arguments);

                return str;
            };
        }

        if (!String.prototype.replaceAll) {
            String.prototype.replaceAll = function (search, replacement) {
                var target = this;
                return target.replace(new RegExp(search, 'g'), replacement);
            };
        }
    }

    expandDatePrototype() {
        if (!Date.prototype.clearTime) {
            Date.prototype.clearTime = function () {
                this.setHours(0);
                this.setMinutes(0);
                this.setSeconds(0);
                this.setMilliseconds(0);
            }
        }
    }

    newContest() {
        analyticsService.track('menu/newContest');
        this.client.openNewContest();
    }

    share() {
        analyticsService.track('menu/share');
        this.client.share(null, 'menu');
    }

    like() {
        analyticsService.track('like/click');
        window.open(this.client.settings.general.facebookFanPage, '_new');
    }

    settings() {
        analyticsService.track('menu/settings');
        this.client.openPage('SettingsPage');
    }

    systemTools() {
        analyticsService.track('menu/systemTools');
        this.client.openPage('SystemToolsPage');
    }
}

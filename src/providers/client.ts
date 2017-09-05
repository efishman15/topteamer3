import {NgModule} from '@angular/core';
import {Http, Response, Headers} from '@angular/http';
import {Observable} from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/retryWhen';
import {Push} from 'ionic-native';
import {App,Platform,Config, Nav, AlertController, ModalController, Events, AlertOptions} from 'ionic-angular';
import * as contestsService from './contests';
import * as connectService from './connect';
import * as analyticsService from './analytics';
import * as alertService from './alert';
import {User,Session,ClientInfo,Settings,Language,Contest,ClientShareApp,AppPage,ConnectInfo,Avatar} from '../objects/objects';
import {LoadingModalComponent} from '../components/loading-modal/loading-modal'
import {PlayerInfoComponent} from '../components/player-info/player-info'
import * as classesService from './classes';

@NgModule()
export class Client {

  static instance:any;

  _languageKeys:Array<string>;

  app:App;
  platform:Platform;
  config: Config;
  http: Http;
  events:Events;
  nav:Nav;
  alertController:AlertController;
  modalController:ModalController;
  loadingModalComponent:LoadingModalComponent;
  playerInfoComponent:PlayerInfoComponent;
  user:User;
  session:Session;
  settings:Settings;
  loaded:Boolean = false;
  clientInfo:ClientInfo;
  _width:number;
  _chartWidth:number;
  _chartHeight:number;
  deepLinkContestId:string;
  shareApps:Array<ClientShareApp>;
  appPreloading:boolean = true;
  serverGateway:ServerGateway;
  pushService:any;

  constructor() {

    if (Client.instance) {
      throw new Error('You can\'t call new in Singleton instances! Call Client.getInstance() instead.');
    }

    this.clientInfo = new ClientInfo();

    if (!window.cordova) {
      this.clientInfo.mobile = false;
      if (window.self !== window.top) {
        this.clientInfo.platform = 'facebook';
      }
      else {
        this.clientInfo.platform = 'web';
      }
    }
    else {
      this.clientInfo.mobile = true;
      this.clientInfo.device = window.device;
    }


  }

  static getInstance() {
    if (Client.instance == null) {
      Client.instance = this;
    }

    return Client.instance;
  }

  init(app:App,
       platform:Platform,
       config: Config,
       http: Http,
       events:Events,
       nav:Nav,
       alertController:AlertController,
       modalController:ModalController,
       loadingModalComponent:LoadingModalComponent,
       playerInfoComponent:PlayerInfoComponent) {

    return new Promise((resolve, reject) => {

        this.app = app;
        this.platform = platform;
        this.config = config;
        this.http = http;
        this.events = events;
        this.nav = nav;
        this.alertController = alertController;
        this.modalController = modalController;
        this.loadingModalComponent = loadingModalComponent;
        this.playerInfoComponent = playerInfoComponent;

        this.serverGateway = new ServerGateway(http);

        if (this.clientInfo.mobile) {
          this.shareApps = new Array<ClientShareApp>();
          if (platform.is('android')) {
            this.clientInfo.platform = 'android';
          }
          else if (platform.is('ios')) {
            this.clientInfo.platform = 'ios';
          }
        }

        var language = localStorage.getItem('language');

        let settingsVersion: string = localStorage.getItem('settingsVersion');
        if (!settingsVersion) {
          settingsVersion = '0';
        }

        this.getSettings(settingsVersion, language).then((data) => {

          if (data['settings']) {
            this.settings = data['settings'];
            //Save new settings in localStorage
            localStorage.setItem('settings', JSON.stringify(data['settings']));
            localStorage.setItem('settingsVersion', data['settings']['version']);
          }
          else {
            this.settings = JSON.parse(localStorage.getItem('settings'));
          }

          this.serverGateway.retries = this.settings.general.network.retries;
          this.serverGateway.initialDelay = this.settings.general.network.initialDelay;

          if (!language || language === 'undefined') {
            //Language was computed on the server using geoInfo or the fallback to the default language
            language = data['language'];
            localStorage.setItem('language', language);
          }

          this.initUser(language, data['geoInfo']);

          this.setDirection();

          this.loaded = true;

          Client.instance = this;

          resolve();
        }, (err) => reject(err));
      }
    );
  }

  getSettings(settingsVersion:string, localStorageLanguage:string) {

    var postData = {'clientInfo': this.clientInfo};

    if (localStorageLanguage && localStorageLanguage !== 'undefined') {
      //This will indicate to the server NOT to retrieve geo info - since language is already determined
      postData['language'] = localStorageLanguage;
    }
    else {
      //Server will try to retrieve geo info based on client ip - if fails - will revert to this default language
      postData['defaultLanguage'] = this.getDefaultLanguage();
    }

    postData['settingsVersion'] = settingsVersion;
    return this.serverPost('info/settings', postData);
  }

  initUser(language, geoInfo) {

    this.user = new User(language, this.clientInfo, geoInfo);
  }

  setDirection() {
    this.platform.setDir(this.currentLanguage.direction, true);
    this.config.set('backButtonIcon', this.currentLanguage.backButtonIcon);
  }

  serverConnect(connectInfo?:ConnectInfo) {

    return new Promise((resolve, reject) => {

      let postData:any = {};
      if (connectInfo) {
        postData.user = JSON.parse(JSON.stringify(this.user));
        postData.user.credentials = connectInfo;
      }
      else {
        postData.user = this.user;
      }
      this.serverPost('user/connect', postData).then((data) => {

        if (connectInfo) {
          this.user.credentials = connectInfo;
        }

        if (this.user.settings.language !== data['session'].settings.language) {
          this.user.settings.language = data['session'].settings.language;
          this.localSwitchLanguage(this.user.settings.language);
        }

        this.user.settings = JSON.parse(JSON.stringify(data['session'].settings));

        this.session = data['session'];
        this.serverGateway.token = data['session'].token;

        analyticsService.identify(data['session'].userId);
        analyticsService.setUserPermanentData({
          platform: this.clientInfo.platform,
          $name: data['session'].name
        });

        if (data['session'].justRegistered) {
          analyticsService.track('server/register')
        }
        else {
          analyticsService.track('server/login')
        }

        this.initPushService();

        resolve();

      }, (err) => {
        reject(err);
      });

    })
  };

  setUser(userData:any) {

    return new Promise((resolve, reject) => {

      let postData:any = {user: userData};
      this.serverPost('user/set', postData).then((contests:any) => {
        this.session.avatar.id = userData.avatar;
        this.session.name = userData.name;
        this.session.dob = userData.dob;
        this.publishProfileChange(contests);
        resolve();
      }, ()=> {
        reject();
      });
    });
  }

  upgradeGuest(connectInfo:ConnectInfo) {

    return new Promise((resolve, reject) => {

      this.serverPost('user/upgradeGuest', {user: {credentials: connectInfo}}).then((data:any) => {
        this.session.avatar.type = 0; //facebook
        this.session.avatar.id = connectInfo.facebookInfo.userId;
        this.session.name = data.name;
        this.publishProfileChange(data.contests);
        resolve();
      }, (err)=> {
        if (err.type === 'SERVER_ERROR_FACEBOOK_EXISTS_DO_SWITCH' && err.additionalInfo && err.additionalInfo.confirmed) {
          this.serverConnect(connectInfo).then(() => {
            this.events.publish('app:switchedToFacebook');
            this.popToRoot().then(()=> {
              resolve();
            }, ()=> {
              reject();
            })
          }, () => {
            reject();
          })
        }
        else {
          reject();
        }
      });
    });
  }

  publishProfileChange(contests) {
    for (var i = 0; i < contests.length; i++) {
      contestsService.setContestClientData(contests[i]);
      this.events.publish('app:contestUpdated', contests[i], contests[i].status, contests[i].status);
    }
    this.events.publish('app:leaderboardsUpdated');
  }

  serverPost(path:string, postData?:Object) {
    return new Promise((resolve, reject) => {
      this.showLoader();
      this.serverGateway.post(path, postData).then((data) => {
        this.hideLoader();
        if (this.nav && this.nav.length() > 0) {
          //GUI is initiated - process the events right away
          this.processInternalEvents();
        }
        resolve(data);
      }, (err) => {
        this.hideLoader();
        if (err && err.httpStatus === 401) {
          connectService.getLoginStatus().then((connectInfo:ConnectInfo) => {
            if (this.hasCredentials(connectInfo)) {
              this.serverConnect().then(() => {
                //Re-post last request
                return this.serverPost(path, postData).then((data) => {
                  resolve(data);
                }, (err) => {
                  reject(err);
                })
              }, ()=> {
              });
            }
            else {
              connectService.login().then(() => {
                this.serverConnect().then(() => {
                  //Re-post last request
                  return this.serverPost(path, postData).then((data) => {
                    resolve(data);
                  }, (err) => {
                    reject(err);
                  })
                }, ()=> {
                })
              }, ()=> {
              })
            }
          }, ()=> {
          });
        }
        else if (err.httpStatus) {
          //An error coming from our server
          //Display an alert or confirm message and continue the reject so further 'catch' blocks
          //will be invoked if any
          if (!err.additionalInfo || !err.additionalInfo.confirm) {
            alertService.alert(err).then(() => {
              reject(err);
            }, () => {
              reject(err);
            });
          }
          else {
            var title = err.type + '_TITLE';
            var message = err.type + '_MESSAGE';
            alertService.confirm(title, message, err.params).then(() => {
              err.additionalInfo.confirmed = true;
              reject(err);
            }, () => {
              reject(err);
            });
          }
        }
        else {
          alertService.alert({'type': 'SERVER_ERROR_GENERAL'}).then(() => {
            reject(err);
          }, () => {
            reject(err);
          });
        }
      });
    });
  }

  processInternalEvents() {
    while (this.serverGateway.eventQueue.length > 0) {
      var internalEvent = this.serverGateway.eventQueue.shift();
      this.events.publish(internalEvent.eventName, internalEvent.eventData);
    }
  }

  setPageTitle(key:string, params ?:Object) {
    this.app.setTitle(this.translate(key, params));
  }

  openNewContest() {
    analyticsService.track('menu/newContest');
    var modal = this.createModalPage('ContestTypePage');
    modal.onDidDismiss((contestTypeId) => {
      if (contestTypeId) {
        this.openPage('SetContestPage', {'mode': 'add', 'typeId': contestTypeId});
      }
    });
    return modal.present();
  }

  displayContestById(contestId:string) {
    return new Promise((resolve:any, reject:any) => {
      contestsService.getContest(contestId).then((contest:Contest) => {
        resolve(contest);
        this.openPage('ContestPage', {'contest': contest});
      }, (err) => {
        reject(err)
      });
    });
  }

  showContest(contest:Contest, source:string, tryRun?:boolean) {

    return new Promise((resolve:any, reject:any) => {

      let now:number = (new Date()).getTime();

      let eventData:any = {
        'contestId': contest._id,
        'team': '' + contest.myTeam,
        'sourceClick': source
      }

      if (contest.state === 'play' && tryRun) {

        analyticsService.track('contest/play', eventData);

        //Joined to a contest - run it immediately (go to the quiz)
        let appPages:Array<AppPage> = new Array<AppPage>();
        if (now - contest.lastUpdated < this.settings.contest.refreshTresholdInMilliseconds) {
          appPages.push(new AppPage('ContestPage', {'contest': contest}));
          appPages.push(new AppPage('QuizPage', {'contest': contest, 'source': 'list'}));
          this.insertPages(appPages);
          resolve();
        }
        else {
          contestsService.getContest(contest._id).then((serverContest:Contest) => {
            resolve(serverContest);
            appPages.push(new AppPage('ContestPage', {'contest': contest}));
            appPages.push(new AppPage('QuizPage', {'contest': contest, 'source': 'list'}));
            this.insertPages(appPages);
          }, (err) => {
            reject(err);
          });
        }
      }
      else if (now - contest.lastUpdated < this.settings.contest.refreshTresholdInMilliseconds) {
        //Not joined and no refresh required - enter the contest with the object we have
        resolve();
        analyticsService.track('contest/show', eventData);
        this.openPage('ContestPage', {'contest': contest});
      }
      else {
        //Will enter the contest after retrieving it from the server
        analyticsService.track('contest/show', eventData);
        this.displayContestById(contest._id).then((serverContest:Contest) => {
          resolve(serverContest);
        }, (err) => {
          reject(err);
        });
      }
    });
  }

  share(contest:Contest, source) {
    analyticsService.track('share', {'source': source});
    this.openPage('SharePage', {'contest': contest, 'source': source});
  }

  getPage(name:string) {
    return classesService.get(name);
  }

  openPage(name:string, params?:any) {
    return this.nav.push(classesService.get(name), params);
  }

  createModalPage(name:string, params?:any) {
    return this.modalController.create(classesService.get(name), params);
  }

  showModalPage(name:string, params?:any) {
    var modal = this.createModalPage(name, params);
    return modal.present();
  }

  createAlert(alertOptions:AlertOptions) {
    return this.alertController.create(alertOptions);
  }

  setRootPage(name:string, params?:any) {
    return this.nav.setRoot(classesService.get(name), params);
  }

  insertPages(pages:Array<AppPage>, index?:number) {
    if (index === undefined) {
      index = -1; //Will insert at the end of the stack
    }

    return this.nav.insertPages(index, this.getNavPages(pages));
  }

  setPages(pages:Array<AppPage>) {
    return this.nav.setPages(this.getNavPages(pages));
  }

  getNavPages(pages:Array<AppPage>):Array<any> {

    let navPages:Array<any> = new Array<any>();
    pages.forEach((appPage:AppPage) => {
      navPages.push({page: this.getPage(appPage.page), params: appPage.params});
    });

    return navPages;
  }

  hidePreloader() {
    this.appPreloading = false;
    document.body.className = 'app-loaded';
  }

  resizeWeb() {
    //Resize app for web
    var containerWidth = window.innerWidth;

    var myApp = document.getElementById('myApp');
    if (myApp) {
      var minWidth = Math.min(containerWidth, this.settings.general.webCanvasWidth);
      this._width = minWidth;
      myApp.style.width = minWidth + 'px';
      myApp.style.marginLeft = (containerWidth - minWidth) / 2 + 'px';
    }

    this._chartWidth = null; //Will be recalculated upon first access to chartWidth property
    this._chartHeight = null; //Will be recalculated upon first access to chartHeight property

    this.events.publish('app:resize');
  }

  get width():number {
    var innerWidth = window.innerWidth;
    if (this._width > 0 && this._width < innerWidth) {
      return this._width;
    }
    else {
      return innerWidth;
    }
  }

  get height():number {
    return window.innerHeight;
  }

  get chartWidth():number {
    if (!this._chartWidth) {
      this._chartWidth = this.width * this.settings.charts.contest.size.widthRatio;
    }
    return this._chartWidth;
  }

  get chartHeight():number {
    if (!this._chartHeight) {
      this._chartHeight = this.width * this.settings.charts.contest.size.heightRatioFromWidth;
    }
    return this._chartHeight;
  }

  showLoader() {
    if (this.loadingModalComponent && !this.appPreloading) {
      setTimeout(() => {
        this.loadingModalComponent.show();
      }, 100);
    }
  }

  hideLoader() {
    if (this.loadingModalComponent && !this.appPreloading) {
      setTimeout(() => {
        this.loadingModalComponent.hide();
      }, 100);
    }
  }

  popToRoot() {
    if (this.nav.canGoBack()) {
      return this.nav.popToRoot();
    }
    else {
      return Promise.resolve();
    }
  }

  private getDefaultLanguage() {
      //Always return a language - get the browser's language
      var language = window.navigator.languages ? navigator.languages[0].toString() : (navigator.language)
    if (!language) {
      language = 'en';
    }
    if (language.length > 2) {
      language = language.toLowerCase().substring(0, 2);
    }

    return language;
  }

  get endPoint():String {
    return this.serverGateway.endPoint;
  }

  get currentLanguage():Language {
    return this.settings.languages[this.session ? this.session.settings.language : this.user.settings.language];
  }

  get languageKeys():Array<String> {
    if (!this._languageKeys) {
      this._languageKeys = Object.keys(this.settings.languages);
    }
    return this._languageKeys;
  }

  translate(key:string, params ?:Object) {
    var language = (this.session ? this.session.settings.language : this.user.settings.language);
    var translatedValue = this.settings.ui[language][key];
    if (params) {
      translatedValue = translatedValue.format(params);
    }

    return translatedValue;
  }

  toggleSettings(name:string) {
    let postData:Object = {'name': name};
    return this.serverPost('user/toggleSettings', postData);
  }

  localSwitchLanguage(language:string) {
    localStorage.setItem('language', language);
    this.setDirection();
  }

  switchLanguage() {
    return new Promise((resolve, reject) => {
      var postData = {'language': this.user.settings.language};
      this.serverPost('user/switchLanguage', postData).then(() => {
        this.session.settings.language = this.user.settings.language;
        this.localSwitchLanguage(this.user.settings.language);
        analyticsService.track('settings/language/change', {language: this.user.settings.language});
        resolve();
      }, (err) => {
        this.user.settings.language = this.session.settings.language;
        reject(err);
      });
    });
  }

  logout() {
    this.serverPost('user/logout').then(()=> {
      this.serverGateway.token = null;
      this.session = null;
      this.playerInfoComponent.clearXp();
    }, () => {
      this.serverGateway.token = null;
      this.session = null;
      this.playerInfoComponent.clearXp();
    })
  }

  getRecursiveProperty(object:any, property:string):any {
    if (object && property) {
      let keys = property.split('.');
      let currentObject:any = object;
      for (var i = 0; i < keys.length; i++) {
        if (!currentObject[keys[i]]) {
          return null;
        }
        currentObject = currentObject[keys[i]];
      }
      return currentObject;
    }
  }

  setRecursiveProperty(object:any, property:string, value:any):any {
    if (object && property) {
      let keys = property.split('.');
      let currentObject:any = object;
      for (var i = 0; i < keys.length; i++) {
        if (!currentObject[keys[i]]) {
          return;
        }
        if (i === keys.length - 1) {
          //Last cycle - will exit loop
          currentObject[keys[i]] = value;
        }
      }
    }
  }

  initPushService() {
    if (this.clientInfo.platform === 'android') {
      //Push Service - init
      //Will have sound/vibration only if sounds are on
      this.settings.google.gcm.sound = this.session.settings.notifications.sound;
      this.settings.google.gcm.vibrate = this.session.settings.notifications.vibrate;
      this.pushService = Push.init(
        {
          'android': this.settings.google.gcm
        }
      );

      this.pushService.on('error', (error) => {
        analyticsService.logError('PushNotificationError', error);
      });

      //Push Service - registration
      this.pushService.on('registration', (registrationData) => {

        if (!registrationData || !registrationData.registrationId) {
          return;
        }

        localStorage.setItem('gcmRegistrationId', registrationData.registrationId);
        this.user.gcmRegistrationId = registrationData.registrationId;

        if (this.session && this.user.gcmRegistrationId &&
          (
            (!this.session.gcmRegistrationId ||
            this.session.gcmRegistrationId !== this.user.gcmRegistrationId)
          )) {

          //If client has a registration Id and server has not / server has a different one
          //Update the server
          this.serverPost('user/setGcmRegistration', {'registrationId': this.user.gcmRegistrationId}).then(() => {
          }, () => {
          });
        }

      });

      //Push Service - notification
      this.pushService.on('notification', (notificationData) => {
        if (this.session && notificationData.additionalData && notificationData.additionalData.foreground) {
          //App is in the foreground - popup the alert
          var buttons:Array<Object> = null;
          if (notificationData.additionalData['contestId']) {
            buttons = new Array<Object>();
            buttons.push(
              {
                'text': notificationData.additionalData['buttonText'],
                'cssClass': notificationData.additionalData['buttonCssClass'],
                'handler': () => {
                  contestsService.getContest(notificationData.additionalData['contestId']).then((contest:Contest) => {
                    this.showContest(contest, 'push', true);
                  }, () => {
                  })
                }
              });
            if (!notificationData.additionalData['hideNotNow']) {
              buttons.push(
                {
                  'text': this.translate('NOT_NOW'),
                  'role': 'cancel'
                }
              );
            }
          }
          alertService.alertTranslated(notificationData.title, notificationData.message, buttons).then(()=> {
          }, ()=> {
            //Notify push plugin that the 'notification' event has been handled
            this.pushService.finish(()=> {
            }, ()=> {
            });
          });
        }
        else if (notificationData.additionalData['contestId']) {
          //App is not running or in the background
          //Save deep linked contest id for later
          this.deepLinkContestId = notificationData.additionalData['contestId'];
          //Notify push plugin that the 'notification' event has been handled
          this.pushService.finish(()=> {
          }, ()=> {
          });
        }
      });

    }
  }

  getAvatarUrl(avatar:Avatar) {
    if (avatar.type === 0) {
      return this.settings.facebook.avatarTemplate.replace('{{id}}', avatar.id);
    }
    else if (avatar.type === 1) {
      return this.getGuestAvatarUrl(avatar.id);
    }
    else {
      return;
    }
  }

  getGuestAvatarUrl(avatarId:string) {
    return this.settings.general.avatarTemplate.replace('{{id}}', avatarId);
  }


  hasCredentials(connectInfo:ConnectInfo):boolean {
    if (connectInfo.type === 'facebook' && connectInfo.facebookInfo) {
      return true;
    }
    else if (connectInfo.type === 'guest' && connectInfo.guestInfo) {
      return true;
    }
    else {
      return false;
    }
  }
}

export class ServerGateway {

  http:Http;
  endPoint:string;
  token:string;
  eventQueue:Array<InternalEvent>;
  retries:number = 10;
  initialDelay:number = 500;

  constructor(http:Http) {
    this.http = http;

    if (!window.cordova) {
      this.endPoint = window.location.protocol + '//' + window.location.host + '/';
    }
    else {
      this.endPoint = 'http://www.topteamer.com/'
    }

    this.eventQueue = [];
  }

  post(path:string, postData?:Object) {

    return new Promise((resolve, reject) => {

      var headers = new Headers();
      headers.append('Content-Type', 'application/json');

      if (this.token) {
        headers.append('Authorization', this.token);
      }

      this.http.post(this.endPoint + path, JSON.stringify(postData), {headers: headers})
        .catch((err) => {
          if (err['_body'] && typeof err['_body'] === 'string') {
            //This is an applicative error from our server
            try {
              var parsedError = JSON.parse(err['_body']);
              reject(parsedError);
            }
            catch (e) {
              reject(err);
            }
            finally {
              return Observable.empty();
            }
          }
          else {
            //Other error - ocntinue to the retryWhen
            return Observable.throw(err);
          }
        })
        .retryWhen((errors) => {
          //Other network error - retry sending
          return Observable.range(1, this.retries).zip(errors, (i) => {
            return i;
          }).flatMap((i) => {
            if (i < this.retries) {
              return Observable.timer(i * this.initialDelay);
            }
            else {
              reject({'type': 'SERVER_ERROR_NETWORK_TIMEOUT', 'httpStatus': 404});
              return Observable.empty();
            }
          })
        })
        .map((res:Response) => res.json())
        .subscribe(
          (res:Object) => {
            if (res['serverPopup']) {
              this.eventQueue.push(new InternalEvent('app:serverPopup', res['serverPopup']));
            }
            resolve(res);
          }
        );
    });
  };
}

export class InternalEvent {
  eventName:string;
  eventData:Object;

  constructor(eventName:string, eventData:Object) {
    this.eventName = eventName;
    this.eventData = eventData;
  }
}


import {Component} from '@angular/core';
import {Client} from '../../providers/client';
import * as connectService from '../../providers/connect';
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'settings.html'
})

export class SettingsPage {

  client:Client;
  originalLanguage:string;

  constructor() {
    this.client = Client.getInstance();
  }

  ionViewWillEnter() {
    analyticsService.track('page/settings');
    this.originalLanguage = this.client.session.settings.language;
  }

  ionViewDidLeave() {
    if (this.client.session.settings.language != this.originalLanguage) {
      let directionChanged : boolean = false;
      if (this.client.settings.languages[this.client.session.settings.language].direction !== this.client.settings.languages[this.originalLanguage].direction) {
        directionChanged = true;
      }
      this.client.events.publish('app:languageChanged', directionChanged);
    }
  }

  toggleSettings(name: string, initPushService?:boolean) {
    analyticsService.track('settings/' + name + '/' + !this.client.session.settings[name]);
    this.client.toggleSettings(name).then(() => {
      if (initPushService) {
        this.client.initPushService();
      }
    }, () => {
      //Revert GUI on server error
      let currentValue: boolean = this.client.getRecursiveProperty(this.client.session.settings, name);
      this.client.setRecursiveProperty(this.client.session.settings, name, !currentValue);
    });
  }

  switchLanguage() {
    this.client.switchLanguage().then(()=> {
    }, () => {
    });
  }

  logout() {
    analyticsService.track('settings/logout');
    connectService.logout().then(() => {
      this.client.logout();
      this.client.setRootPage('LoginPage');
    },()=>{
    });
  }

}

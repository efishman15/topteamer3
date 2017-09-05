import {Component} from '@angular/core';
import {NavParams} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';
import * as shareService from '../../providers/share';
import {ShareVariables} from '../../objects/objects';

@Component({
  templateUrl: 'share.html'
})

export class SharePage {

  client:Client;
  params:NavParams;
  shareVariables:ShareVariables;
  title:string;
  isNewContest:boolean;

  constructor(params:NavParams) {
    this.client = Client.getInstance();
    this.params = params;

    this.isNewContest = (params.data.source === 'newContest');
    if (this.isNewContest) {
      this.title = this.client.translate('INVITE_FRIENDS_FOR_NEW_CONTEST_MESSAGE');
    }
    else {
      this.title = this.client.translate('SHARE_WITH_FRIENDS_MESSAGE');
    }

    this.shareVariables = shareService.getVariables(this.params.data.contest, this.isNewContest);
  }

  ionViewWillEnter() {
    if (this.params.data.contest) {
      analyticsService.track('page/share', {
        contestId: this.params.data.contest._id,
        source: this.params.data.source
      });
    }
    else {
      analyticsService.track('page/share', {source: this.params.data.source});
    }
  }

  webShare(network:any) {
    analyticsService.track('share/web/' + network.name);
    window.open(network.url.format({
      url: this.shareVariables.shareUrl,
      subject: this.shareVariables.shareSubject,
      emailBody: this.shareVariables.shareBodyEmail
    }), '_blank');
    this.client.nav.pop();
  }

  mobileShare(appName?:string) {
    analyticsService.track('share/mobile' + (appName ? '/' + appName : ''));
    shareService.mobileShare(appName, this.params.data.contest, this.isNewContest).then(() => {
    }, () => {
    });
    this.client.nav.pop();
  }
}

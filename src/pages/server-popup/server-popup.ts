import {Component} from '@angular/core';
import {NavParams,ViewController} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';
import * as contestsService from '../../providers/contests';

@Component({
  templateUrl: 'server-popup.html'
})
export class ServerPopupPage {

  client:Client;
  params:NavParams;
  viewController:ViewController;

  constructor(params:NavParams, viewController: ViewController) {

    this.client = Client.getInstance();
    this.params = params;

    //Look for special variables such as #storeLink (based on client's platform
    for (var i=0; i<this.params.data.serverPopup.buttons.length; i++) {
      if (this.params.data.serverPopup.buttons[i].link && this.params.data.serverPopup.buttons[i].link.indexOf('#storeLink') >= 0) {
        this.params.data.serverPopup.buttons[i].link = this.params.data.serverPopup.buttons[i].link.replaceAll('#storeLink',this.client.settings.platforms[this.client.clientInfo.platform].storeLink);
      }
    }

    this.viewController = viewController;
  }

  //The only life cycle eve currently called in modals
  ngAfterViewInit() {
    analyticsService.track('page/serverPopup', {title : this.params.data.serverPopup.title, message : this.params.data.serverPopup.message});
  }

  preventBack() {
    return this.params.data.serverPopup.preventBack;
  }

  buttonAction(button) {
    switch (button.action) {
      case 'dismiss' :
        this.viewController.dismiss(button);
        break;

      case 'link' :
      {
        window.open(button.link, '_system', 'location=yes');
        this.viewController.dismiss(button);
        break;
      }

      case 'linkExit' :
      {
        window.open(button.link, '_system', 'location=yes');
        setTimeout(() => {
          this.client.platform.exitApp();
        }, 1000)
        break;
      }

      case 'share' :
      {
        if (button.contestId) {
          contestsService.getContest(button.contestId).then ((contest) => {
            this.viewController.dismiss(button).then(() => {
              this.client.openPage('SharePage', {'contest' : contest, 'source': 'serverPopup'});
            },()=>{
            });
          }, () => {
            this.viewController.dismiss(button);
          });
        }
        else {
          this.viewController.dismiss(button).then(() => {
            this.client.openPage('SharePage', {'source': 'serverPopup'});
          },()=>{
          });
        }
        break;
      }

      case 'screen' :
      {
        this.viewController.dismiss(button).then(() => {
          if (button.rootView) {
            this.client.setRootPage(button.screen, button.params)
          }
          else {
            this.client.openPage(button.screen, button.params)
          }
        },()=>{
        });

        break;
      }
    }
  }
}

import {Component} from '@angular/core';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';
import * as alertService from '../../providers/alert';
import {AdminCommand} from '../../objects/objects';

@Component({
  templateUrl: 'system-tools.html'
})

export class SystemToolsPage {

  client:Client;
  commandId:string;

  constructor() {
    this.client = Client.getInstance();

    //Init with first command
    this.commandId = this.client.settings.admin.commands[0].id;
  }

  ionViewWillEnter() {
    analyticsService.track('page/systemTools');
  }

  runCommand() {

    let command:AdminCommand;
    for(var i=0; i<this.client.settings.admin.commands.length; i++) {
      if (this.client.settings.admin.commands[i].id === this.commandId) {
        command = this.client.settings.admin.commands[i];
        break;
      }
    }

    switch (command.type) {
      case 'system':
        if (command.confirm) {
          alertService.confirm(command.confirm + '_TITLE', command.confirm + '_TEMPLATE').then(() => {
            this.runSystemCommand(command, true);
          },()=> {
          });
        }
        else {
          this.runSystemCommand(command, false);
        }
        break;

      case 'download':
        var action = command.action.replace('{{token}}',this.client.session.token);
        window.open(this.client.endPoint + action, '_system', 'location=yes');
        setTimeout(() => {
          this.client.nav.pop();
        }, 500)
        break;
    }
  }

  runSystemCommand(command:AdminCommand, confirmed: boolean) {
    if (command.returnValue) {
      this.client.serverPost(command.action).then((data:any) => {
          this.client[command.returnValue] = data;
          if (confirmed) {
            setTimeout(() => {
              this.client.nav.pop();
            }, 500)
          }
          else {
            this.client.nav.pop();
          }
        },
        ()=> {
        });
    }
    else {
      this.client.serverPost(command.action).then(() => {
          if (confirmed) {
            setTimeout(() => {
              this.client.nav.pop();
            }, 500)
          }
          else {
            this.client.nav.pop();
          }
        },
        ()=> {
        })
    }
  }
}

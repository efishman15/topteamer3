import {Client} from './client';
import {Alert} from 'ionic-angular';

function getAlignedTitle(title) {

  var client = Client.getInstance();

  return '<span class="app-alert-' + client.currentLanguage.direction + '">' + title + '</span>';
}

//------------------------------------------------------
//-- alert
//------------------------------------------------------
export let alert = (message:any, buttons?:any) => {

  var client = Client.getInstance();

  var title;
  var messageText;

  if (message.type) {
    if (!message.additionalInfo) {
      message.additionalInfo = {};
    }

    title = client.translate(message.type + '_TITLE', message.additionalInfo);
    messageText = client.translate(message.type + '_MESSAGE', message.additionalInfo);

  }
  else {
    messageText = message;
  }

  return alertTranslated(title, messageText, buttons);
}

//------------------------------------------------------
//-- alert
//------------------------------------------------------
export let alertTranslated = (title:string, message:string, buttons?:any) => {

  return new Promise((resolve, reject) => {

    var client = Client.getInstance();

    if (!buttons) {
      buttons = [
        {
          text: client.translate('OK'),
          role: 'cancel',
          handler: resolve
        }
      ];
    }

    let alert:Alert = client.createAlert({
      message: message,
      buttons: buttons,
      cssClass: 'app-alert-' + client.currentLanguage.direction
    });

    if (title) {
      alert.setTitle(getAlignedTitle(title));
    }

    alert.present();

  });
}


//------------------------------------------------------
//-- confirm
//------------------------------------------------------
export let confirm = (title:string, message:string, params?:any) => {

  return new Promise((resolve, reject) => {

    var client = Client.getInstance();

    let alert:Alert = client.createAlert({
      title: getAlignedTitle(client.translate(title, params)),
      message: client.translate(message, params),
      buttons: [
        {
          text: client.translate('OK'),
          handler: resolve
        },
        {
          text: client.translate('CANCEL'),
          handler: reject
        }
      ]
    });

    alert.present();

  });
}


//------------------------------------------------------
//-- confirmExitApp
//------------------------------------------------------
export let confirmExitApp = () => {

  return this.confirm('EXIT_APP_TITLE', 'EXIT_APP_MESSAGE', null).then(() => {
    window.navigator['app'].exitApp();
  },()=>{
  })
};

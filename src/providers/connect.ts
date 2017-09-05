import {Client} from './client';
import * as facebookService from './facebook';
import {ConnectInfo,GuestInfo} from '../objects/objects';

const CONNECT_INFO_KEY = 'connectInfo';

//------------------------------------------------------
//-- private functions
//------------------------------------------------------

//------------------------------------------------------
//-- createGuest
//------------------------------------------------------
function createGuest() {

  var d = new Date().getTime();
  var uuid = 'xxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  let connectInfo:ConnectInfo = new ConnectInfo('guest');
  connectInfo.guestInfo = new GuestInfo(uuid);

  return connectInfo;
}

//------------------------------------------------------
//-- getInfo
//------------------------------------------------------
function getInfo() {

  return new Promise((resolve, reject) => {

    var client = Client.getInstance();

    if (client.user.credentials) {
      resolve(client.user.credentials);
      return;
    }

    let connectInfoString:string = localStorage.getItem(CONNECT_INFO_KEY);
    if (connectInfoString) {
      client.user.credentials = JSON.parse(connectInfoString);
      resolve(client.user.credentials);
      return;
    }

    //Legacy code - for old clients which are connected to facebook but still
    //do not have anything in localStorage
    facebookService.getLoginStatus().then((connectInfo:ConnectInfo) => {
      resolve(connectInfo);
    }, ()=> {
      reject();
    });
  });
}

//------------------------------------------------------
//-- public functions
//------------------------------------------------------

//------------------------------------------------------
//-- getLoginStatus
//------------------------------------------------------
export let getLoginStatus = () => {

  return new Promise((resolve, reject) => {

    getInfo().then((connectInfo:ConnectInfo) => {

      if (!connectInfo) {
        reject();
        return;
      }

      switch (connectInfo.type) {
        case 'facebook':
          if (connectInfo.facebookInfo) {
            resolve(connectInfo);
          }
          else {
            facebookService.getLoginStatus().then((connectInfo:ConnectInfo)=> {
              resolve(connectInfo);
            }, () => {
              reject();
            })
          }
          break;
        case 'guest':
          resolve(connectInfo);
          break;
        default:
          reject();
          break;
      }
    }, () => {
      reject();
    })
  });
}

//------------------------------------------------------
//-- login
//------------------------------------------------------
export let login = (permissions?, rerequestDeclinedPermissions?) => {

  return new Promise((resolve, reject) => {

    getInfo().then((connectInfo:ConnectInfo) => {
      specificLogin(connectInfo, permissions, rerequestDeclinedPermissions).then((connectInfo:ConnectInfo) => {
        resolve(connectInfo);
      }, ()=> {
        reject();
      });
    }, () => {
      reject();
    });
  });
}

export let facebookLogin = () => {
  return this.specificLogin(new ConnectInfo('facebook'));
}

export let guestLogin = () => {
  return this.specificLogin(createGuest());
}

export let specificLogin = (connectInfo:ConnectInfo,
                            permissions?:any,
                            rerequestDeclinedPermissions?:boolean) => {

  return new Promise((resolve, reject) => {

    switch (connectInfo.type) {
      case 'facebook':
        facebookService.login(permissions, rerequestDeclinedPermissions).then((connectInfo:ConnectInfo) => {
          resolve(connectInfo);
        }, () => {
          reject();
        });
        break;
      case 'guest':
        //Immediate resolve, connectionInfo will include the uuid
        //Immediatelly store credentials - new guest should not fail to connect/register in the server
        storeCredentials(connectInfo);
        resolve(connectInfo);
        break;
      default:
        reject();
        break;
    }
  });
}

//------------------------------------------------------
//-- logout
//------------------------------------------------------
export let logout = () => {

  return new Promise((resolve, reject) => {

    var client = Client.getInstance();

    getInfo().then((connectInfo:ConnectInfo) => {
      switch (connectInfo.type) {
        case 'facebook':
          facebookService.logout().then(()=> {
            client.user.credentials = null;
            localStorage.removeItem(CONNECT_INFO_KEY);
            resolve();
          });
          break;
        case 'guest':
          client.user.credentials = null;
          localStorage.removeItem(CONNECT_INFO_KEY);
          resolve();
          break;
      }
    }, ()=> {
      reject();
    });
  });
}

//------------------------------------------------------
//-- post
//------------------------------------------------------
export let post = (story:any) => {

  return new Promise((resolve, reject) => {

    getInfo().then((connectInfo:ConnectInfo) => {
      switch (connectInfo.type) {
        case 'facebook':
          facebookService.post(story).then(()=> {
            resolve();
          }, ()=> {
            reject();
          });
          break;
        case 'guest':
          throw new Error('Posting in guest mode is not supported');
      }
    }, ()=> {
      reject();
    });
  });
};

//------------------------------------------------------
//-- buy
//------------------------------------------------------
export let buy = (purchaseDialogData:any) => {

  return new Promise((resolve, reject) => {

    getInfo().then((connectInfo:ConnectInfo) => {
      switch (connectInfo.type) {
        case 'facebook':
          facebookService.buy(purchaseDialogData).then(()=> {
            resolve();
          }, ()=> {
            reject();
          });
          break;
        case 'guest':
          throw new Error('Buying in guest mode is not supported');
      }
    }, ()=> {
      reject();
    });
  });
};


//------------------------------------------------------
//-- storeCredentials
//------------------------------------------------------
export let storeCredentials = (connectInfo:ConnectInfo) => {

  var client = Client.getInstance();
  var storedConnectInfo;
  if (connectInfo.type === 'facebook') {
    //For facebook - do not store in our storage any access token / user id
    storedConnectInfo = new ConnectInfo('facebook');
  }
  else {
    storedConnectInfo = connectInfo;
  }

  localStorage.setItem(CONNECT_INFO_KEY, JSON.stringify(storedConnectInfo));
  client.user.credentials = connectInfo;

};

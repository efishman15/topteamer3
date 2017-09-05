import {Client} from './client';
import {ConnectInfo,FacebookInfo} from '../objects/objects'

//------------------------------------------------------
//-- getLoginStatus
//------------------------------------------------------
export let getLoginStatus = () => {

  return new Promise((resolve, reject) => {

    let connectInfo:ConnectInfo;
    if (!window.cordova) {
      window.FB.getLoginStatus((response:any) => {
        if (response && response.status === 'connected') {
          connectInfo = new ConnectInfo('facebook');
          connectInfo.facebookInfo = new FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
          resolve(connectInfo);
        }
        else {
          reject();
        }
      });
    }
    else {
      window.facebookConnectPlugin.getLoginStatus((response) => {
        if (response && response.status === 'unknown') {
          //Give it another try as facebook native is not yet initiated
          setTimeout(() => {
            window.facebookConnectPlugin.getLoginStatus((response) => {
              if (response && response.status === 'connected') {
                connectInfo = new ConnectInfo('facebook');
                connectInfo.facebookInfo = new FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
              }
              resolve(connectInfo);
            }, (error) => {
              reject(error);
            })
          }, 500);
        }
        else if (response && response.status === 'connected') {
          connectInfo = new ConnectInfo('facebook');
          connectInfo.facebookInfo = new FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
          resolve(connectInfo);
        }
        else {
          reject();
        }

      }, (error) => {
        reject(error);
      });
    }
  });
}

//------------------------------------------------------
//-- login
//------------------------------------------------------
export let login = (permissions?, rerequestDeclinedPermissions?) => {

  return new Promise((resolve, reject) => {

    var client = Client.getInstance();

    if (!permissions) {
      permissions = client.settings.facebook.readPermissions;
    }

    let connectInfo:ConnectInfo = new ConnectInfo('facebook');

    if (!window.cordova) {

      var permissionObject = {};
      permissionObject['scope'] = permissions.toString();
      if (rerequestDeclinedPermissions) {
        permissionObject['auth_type'] = 'rerequest';
      }

      window.FB.login((response:any) => {
        if (response && response.authResponse) {
          connectInfo.facebookInfo = new FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
          resolve(connectInfo);
        }
        else {
          reject(response.status);
        }
      },permissionObject);
    }
    else {
      window.facebookConnectPlugin.login(client.settings.facebook.readPermissions,
        (response) => {
          if (response && response.authResponse) {
            connectInfo.facebookInfo = new FacebookInfo(response.authResponse.accessToken, response.authResponse.userID);
            resolve(connectInfo);
          }
        },
        (err) => {
          reject(err);
        }
      );
    }
  });
}

//------------------------------------------------------
//-- logout
//------------------------------------------------------
export let logout = () => {

  return new Promise((resolve, reject) => {

    if (!window.cordova) {

      window.FB.logout((response) => {
        resolve(response);
      });
    }
    else {
      window.facebookConnectPlugin.logout((response) => {
          resolve(response);
        }
      );
    }
  });
}

//------------------------------------------------------
//-- post
//------------------------------------------------------
export let post = (story) => {

  return new Promise((resolve, reject) => {

    if (window.cordova) {
      var mobilePostObject = {
        'method': 'share_open_graph',
        'action': story.action,
        'object': JSON.stringify(story.object)
      };

      window.facebookConnectPlugin.showDialog(mobilePostObject, (response) => {
        resolve(response);
      }, (error) => {
        reject(error);
      })
    }
    else {
      var webPostObject = {
        'method': 'share_open_graph',
        'action_type': story.action,
        'action_properties': story.object
      };

      try {
        window.FB.ui(webPostObject, (response) => {
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    }
  })
};

//------------------------------------------------------
//-- buy
//------------------------------------------------------
export let buy = (purchaseDialogData) => {

  return new Promise((resolve, reject) => {

    try {
      window.FB.ui(purchaseDialogData, (response) => {
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

import {Client} from './client';

function trackingEnabled() : boolean {
  var client = Client.getInstance();
  return client.settings.analytics.track.events || client.settings.analytics.track.errors;
}
export let init = (token:string) => {
  if (!trackingEnabled()) {
    return;
  }
  window.mixpanel.init(token);

};

export let register = (superProperties:any) => {
  if (!trackingEnabled()) {
    return;
  }
  window.mixpanel.register(superProperties);
}

export let identify = (userId:string) => {
  if (!trackingEnabled()) {
    return;
  }
  window.mixpanel.identify(userId);
}

export let track = (eventName:string, eventProperties?:any) => {
  var client = Client.getInstance();
  if (!client.settings.analytics.track.events) {
    return;
  }
  window.mixpanel.track(eventName, eventProperties);
}

export let setUserPermanentData = (data:any) => {
  if (!trackingEnabled()) {
    return;
  }
  window.mixpanel.people.set(data);
}

//Currently implementing loggin errors to the same mixpanel analytics tool
//All errros will be recorded under a single event: 'error' with data of the error in the event properties
export let logError = (type:string, error:any) => {
  var client = Client.getInstance();
  if (!client.settings.analytics.track.errors) {
    return;
  }
  this.track('error', {type: type, error: JSON.stringify(error)});
}

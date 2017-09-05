export {};

declare global
{
  interface Window {
    cordova: any;
    device: any;
    StatusBar: any;
    loadJsFile(fileName:string) : void;
    FB: IFB;
    fbAsyncInit() : void;
    inappbilling: any;
    initBranch() : void;
    myHandleBranch(err:any, data:any) : void;
    branch: any;
    myRequestAnimationFrame(callback:any): void;
    webkitRequestAnimationFrame(): void;
    mozRequestAnimationFrame(): void;
    FusionCharts: any;
    facebookConnectPlugin: any;
    PushNotification: any;
    plugins: any;
    mixpanel:IMixpanel;
  }

  interface Navigator {
    languages: Array<Object>;
  }

  interface String {
    format(): string;
    replaceAll(search:string, replacement:string): string;
  }

  interface Date {
    clearTime(): void;
  }
}

interface IFB {
  ui(data:Object, callback:any): void;
  init(data:Object): void;
  getLoginStatus(callback:any): void;
  login(callback:any, permissions:Object): void;
  logout(callback:any): void;
}

interface IMixpanel {
  init(token:string) : void;
  register(superProperties:any) : void;
  identify(userId:string) : void;
  track(eventName:string, eventProperties?:any) : void;
  people: IMixpanelPeople;
}

interface IMixpanelPeople {
  set(data: any) : void;
}


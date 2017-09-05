import {ErrorHandler} from '@angular/core';
import {Client} from './client';
import * as analyticsService from './analytics';

export class MyArrayLogger {
  res:Array<any> = [];

  log(s:any):void {
    this.res.push(s);
  }

  logError(s:any):void {
    this.res.push(s);
  }

  logGroup(s:any):void {
    this.res.push(s);
  }

  logGroupEnd() {
    this.res.forEach((error:any) => {
      console.error(error);
    })
  };
}

export class MyErrorHandler implements ErrorHandler {

    handleError(error: any) {
        var errorMessage = error.message;
        if (error.wrapperStack) {
            errorMessage += ', ' + error.wrapperStack;
        }

        analyticsService.logError('UnhandledException', { exception: error.exception, stack: error.stackTrace });

        var client = Client.getInstance();
        if (client && client.session && client.session.isAdmin) {
            console.error(error);
        }
    } 
}

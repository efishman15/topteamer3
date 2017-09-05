import {Component,ViewChild,ElementRef} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Client} from '../../providers/client';
import * as analyticsService from '../../providers/analytics';
import * as connectService from '../../providers/connect';
import {ConnectInfo,Contest} from '../../objects/objects';

@Component({
  templateUrl: 'set-user.html'
})

export class SetUserPage {

  client:Client;
  userForm:FormGroup;
  avatars:Array<any>;
  user:any;
  submitted:boolean;

  //Ionic bug - maxlength property is not copied to the native element, submitted:
  //https://github.com/driftyco/ionic/issues/7635
  @ViewChild('nameInput') nameInput:ElementRef;

  constructor() {

    this.client = Client.getInstance();
    this.avatars = new Array<any>();
    this.addAvatar(this.client.session.avatar.id, true);
    for (var i=0; i<this.client.settings.general.avatars.length; i++) {
      if (this.client.settings.general.avatars[i] !== this.client.session.avatar.id) {
        this.addAvatar(this.client.settings.general.avatars[i], false);
      }
    }

    this.user = {
      avatar: this.client.session.avatar.id,
      //If session has a dob - the profile was already updated once - show the name
      //Otherwise - display an empty name to force the user to enter a name
      name: this.client.session.dob ? this.client.session.name : '',
      dob: this.client.session.dob ? this.client.session.dob : (new Date(2000,0,1)).getTime()
    }

    //Init form
    this.userForm = new FormGroup({
      name: new FormControl(this.user.name, [Validators.required, Validators.maxLength(this.client.settings.general.inputs.name.maxLength)])
    });

  }

  ngAfterViewInit() {
    this.nameInput['_native']._elementRef.nativeElement.maxLength = this.client.settings.general.inputs.name.maxLength;
  }

  ionViewWillEnter() {
    analyticsService.track('page/setUser');
    this.submitted = false;
  }

  addAvatar(id:string, selected:boolean) {
    let avatar:any = {};
    avatar.id = id;
    avatar.src = this.client.getGuestAvatarUrl(id);
    avatar.selected = selected;
    this.avatars.push(avatar);
  }

  avatarClick(id) {
    for(var i=0; i<this.avatars.length; i++) {
      if (this.avatars[i].id === id) {
        this.avatars[i].selected = true;
      }
      else {
        this.avatars[i].selected = false;
      }
    }
    this.user.avatar = id;
  }

  getMaxEndDate() {
    return (new Date()).getTime() - 24 * 60 * 60 * 1000;
  }

  dobSelected(dateSelection) {
    //Set the end date at the end of this day (e.g. 23:59:59.999)
    this.user.dob = dateSelection.epochLocal;
  }

  setUser() {

    analyticsService.track('user/set/click');
    this.submitted = true;
    if (!this.userForm.valid) {
      return;
    }

    //If nothing changed - close page without saving
    if (this.user.name === this.client.session.name &&
      this.user.dob === this.client.session.dob &&
      this.user.avatar === this.client.session.avatar.id) {
      this.client.nav.pop();
      return;
    }

    this.client.setUser(this.user).then( (contests:Array<Contest>)=> {
      this.client.nav.pop();
    },()=>{
    });
  }

  facebookLogin() {
    connectService.facebookLogin().then((connectInfo:ConnectInfo)=> {
      this.client.upgradeGuest(connectInfo).then(()=>{
        connectService.storeCredentials(connectInfo);
        if (this.client.nav.canGoBack()) {
          //In the scenraio of switch to another existing facebook user
          //The client already popped evreything up to the root
          this.client.nav.pop();
        }
      },()=>{
      })
    }, ()=> {
    });
  }
}

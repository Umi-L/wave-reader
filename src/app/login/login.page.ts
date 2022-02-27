import { Component, OnInit } from '@angular/core';
import {StorageService} from '../storage.service';
import {SHA256, enc} from 'crypto-js';
import {Router} from '@angular/router'
import {DataPassService} from '../data-pass.service';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  constructor(private iab: InAppBrowser, private router:Router,private dataPassService: DataPassService, private storageService:StorageService) { }

  async ngOnInit() {
    await this.storageService.init();

    let dropboxKey = 'pzeefxxnpapocfu';
    let redirect_uri = 'http://localhost:8100/callback'

    var code_verifier = this.generateVerifier();

    this.storageService.set('code_verifier', code_verifier);
    this.storageService.set('app_id', dropboxKey);
    this.storageService.set('redirect_uri', redirect_uri);
    

    let hash =  this.base64URL(SHA256(code_verifier));

    var code_challenge = hash;

    let isApp = !document.URL.startsWith('http');

    
    if(isApp){
      const browser = this.iab.create('https://ionicframework.com/')
      browser.on('loadstop').subscribe(event => {
        browser.insertCSS({ code: "body{color: red;" });
      });

      browser.close();
    }else{
      window.location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${dropboxKey}&response_type=code&code_challenge=${code_challenge}&redirect_uri=${redirect_uri}&code_challenge_method=S256`;
    }
  }
  generateVerifier () {
    var arr = new Uint8Array(128);
    let randomValueArray = window.crypto.getRandomValues(arr)
    const base64String = btoa(<any>randomValueArray);
    return this.createBrowserSafeString(base64String).substr(0, 128);
  }
  createBrowserSafeString(toBeConverted) {
    const convertedString = toBeConverted.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return convertedString;
  }
  base64URL(string) {
    return string.toString(enc.Base64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }
}

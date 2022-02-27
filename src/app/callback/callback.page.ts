import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'
import {StorageService} from '../storage.service';
import {Router} from '@angular/router'

@Component({
  selector: 'app-callback',
  templateUrl: './callback.page.html',
  styleUrls: ['./callback.page.scss'],
})
export class CallbackPage implements OnInit {

  constructor(private activatedRoute: ActivatedRoute, private storageService:StorageService, private router:Router) { }

  async ngOnInit() {

    await this.storageService.init();

    let token;
    this.activatedRoute.queryParams
    .subscribe(params => {
      token = params.code;
    });

    let code_verifier = await this.storageService.get("code_verifier");
    let app_id = await this.storageService.get("app_id");
    let redirect_uri = await this.storageService.get("redirect_uri");


    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    
    let url = `https://api.dropboxapi.com/oauth2/token`
    url += '?grant_type=authorization_code';
    url += `&code=${token}`;
    url += `&client_id=${app_id}`;
    url += `&code_verifier=${code_verifier}`;
    url += `&redirect_uri=${redirect_uri}`;

    let response = await this.apiCall(url, fetchOptions);

    this.storageService.set("access_token", response.access_token);

    this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  async apiCall(url:string, headers){
    let response = await fetch(url, headers);
    let data = response.json();
    return data;
  }
}

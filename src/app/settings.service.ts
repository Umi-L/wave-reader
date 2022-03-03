import { Injectable } from '@angular/core';
import { settings } from 'cluster';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})

export class SettingsService {
  _settings;
  constructor(private storageService:StorageService) { 
    this.init();
  }
  public async init(){
    let value = await this.storageService.get("settings");
    if (value == undefined){
      this._settings = {
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
      } 
    }
    else{
      this._settings = value;
    }
    console.log("settings initialized")
  }

  async get(key?:string){
    if (key != undefined){
      return this._settings[key];
    }
    return this._settings;
  }

  set(key:string, value:any){
    this._settings[key] = value;
    this.storageService.set("settings",this._settings);

    console.log(this._settings[key]);
    
  }
}

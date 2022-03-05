import { Injectable } from '@angular/core';
import { settings } from 'cluster';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})

export class SettingsService {
  public _settings: Object | null = null;

  constructor(private storageService:StorageService) { 
    this.init();
  }
  public async init(){
    await this.storageService.init()

    let value = await this.storageService.get("settings");
    if (value == undefined){
      this._settings = {
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
        displayMode: "dark",
        filterMode: "date",
        scriptedContent: false,
      } 
    }
    else{
      this._settings = value;
    }
  }

  public get(key?:string){
    if (key != undefined){
      return this._settings[key];
    }
    return this._settings;
  }

  public async set(key:string, value:any){
    this._settings[key] = value;
    await this.storageService.set("settings",this._settings);    
  }
}

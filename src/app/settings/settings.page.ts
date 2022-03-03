import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  constructor(private settingsService:SettingsService) { }

  async ngOnInit() {
    await this.settingsService.init();

    let rate = this.settingsService.get("ttsRate")
    let pitch = this.settingsService.get("ttsPitch");
    let volume = this.settingsService.get("ttsVolume");

    (<any>document.getElementById("rate")).value = rate;
    (<any>document.getElementById("pitch")).value = pitch;
    (<any>document.getElementById("volume")).value = volume;

    document.getElementById("rateTag").innerHTML = rate;
    document.getElementById("pitchTag").innerHTML = pitch;
    document.getElementById("volumeTag").innerHTML = volume;

  }
  rateChange(){
    let value = (<any>document.getElementById("rate")).value.toFixed(1)
    
    this.settingsService.set("ttsRate", value)
    document.getElementById("rateTag").innerHTML = value
  }
  pitchChange(){
    let value = (<any>document.getElementById("pitch")).value.toFixed(1)
    
    this.settingsService.set("ttsPitch", value)
    document.getElementById("pitchTag").innerHTML = value
  }
  volumeChange(){
    let value = (<any>document.getElementById("volume")).value.toFixed(1)
    
    this.settingsService.set("ttsVolume", value)
    document.getElementById("volumeTag").innerHTML = value
  }
}

import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  constructor(private settingsService:SettingsService) { }

  ngOnInit() {
    
  }
  rateChange(){
    let value = (<any>document.getElementById("rate")).value
    
    this.settingsService.set("rate", value)
  }
}

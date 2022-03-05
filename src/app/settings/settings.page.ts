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
    let displayMode = this.settingsService.get("displayMode");
    let scriptedContent = this.settingsService.get("scriptedContent");

    console.log(scriptedContent);

    (<any>document.getElementById("rate")).value = rate;
    (<any>document.getElementById("pitch")).value = pitch;
    (<any>document.getElementById("volume")).value = volume;
    (<any>document.getElementById("scriptedContentToggle")).checked = scriptedContent;

    document.getElementById("rateTag").innerHTML = rate;
    document.getElementById("pitchTag").innerHTML = pitch;
    document.getElementById("volumeTag").innerHTML = volume;

    (<any>document.getElementById("displayMode")).value = displayMode;
    document.body.setAttribute("color-theme", displayMode);




    const initLoop = setInterval(() =>{
      try{
        let voices = speechSynthesis.getVoices();
        
        if (voices.length > 0){
          clearInterval(initLoop);
          for (let i = 0; i < voices.length; i++){
            let option = document.createElement("ion-select-option");
            option.value = voices[i].name;
            option.innerHTML = voices[i].name;

            document.getElementById("voiceSelector").appendChild(option);
          }
          let savedVoice = this.settingsService.get("ttsVoice")
          if (savedVoice != undefined){
            (<any>document.getElementById("voiceSelector")).value = savedVoice
          }
          
        }

      }
      catch (e) {
      }

    }, 300)
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
  voiceChange(){
    let value = (<any>document.getElementById("voiceSelector")).value;
    
    this.settingsService.set("ttsVoice", value)
  }
  displayModeChange(){
    let value = (<any>document.getElementById("displayMode")).value;

    if (value != null){
      document.body.setAttribute("color-theme", value)
      this.settingsService.set("displayMode", value)
    }
  }
  scriptedContentChange(){
    let value = (<any>document.getElementById("scriptedContentToggle")).checked

    this.settingsService.set("scriptedContent", value);

    console.log(value)
  }
}

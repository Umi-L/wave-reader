import { Component, OnInit } from '@angular/core';
import {DataPassService} from '../data-pass.service';
import {Router} from '@angular/router'
import { interval } from 'rxjs';
import{StorageService} from '../storage.service'
import{SettingsService} from '../settings.service'
import { EpubCFI } from 'src/assets/epubjs/types';


declare var ePub: any;
var rendition;

var delayInterval;

var bookTitle;

var menuShown = true;



@Component({
  selector: 'app-reading',
  templateUrl: './reading.page.html',
  styleUrls: ['./reading.page.scss'],
})
export class ReadingPage implements OnInit {

  constructor(private router:Router, private dataPassService: DataPassService, private storageService:StorageService, private settings:SettingsService) { }
  
  async ngOnInit(){

    await this.settings.init();

    let data = this.dataPassService.getData();

    bookTitle = data[1];

    if (data == 0)
      this.router.navigateByUrl('/home', { replaceUrl: true }) ;


    var book = ePub(data[0]);

    rendition = book.renderTo("area", { method: "default", width: "100%", height: "100%", allowScriptedContent: false, spread: false });


    
    if (this.settings.get("displayMode") == "dark"){
      rendition.themes.default("../assets/bookStyles/darkSheet.css")
    }
    else{
      rendition.themes.default("../assets/bookStyles/lightSheet.css")
    }

    console.log(bookTitle)

    let latestCfi = await this.storageService.get(bookTitle);

    var displayed;
    if (latestCfi != undefined){
      console.log(latestCfi);
      displayed = rendition.display(latestCfi);

    }else{
      displayed = rendition.display()
    }

    
    const initLoop = setInterval(() =>{
      try{
        var doc = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild).contentWindow.document;

        doc.ondblclick =  (e) => {
          this.readPageByElements(e.target);
        };


        clearInterval(initLoop);
      }
      catch (e) {
      }

    }, 300)
    
    
    // <---- possibly temporary removal of old navigation system ---->

    //var startTime;

    // document.getElementById("click-left").onmousedown = () =>{
    //   startTime = new Date();
    // }
    // document.getElementById("click-right").onmousedown = () =>{
    //   startTime = new Date();
    // }
    // document.getElementById("click-menu").onmousedown = () =>{
    //   startTime = new Date();
    // }
    // document.getElementById("click-left").onmouseup = () =>{
    //   let endTime = new Date();

    //   let time = endTime.getTime() - startTime.getTime()

    //   if (time < 1000){
    //     this.pageLeft();
    //   }
    // }
    // document.getElementById("click-right").onmouseup = () =>{
    //   let endTime = new Date();

    //   let time = endTime.getTime() - startTime.getTime()

    //   if (time < 1000){
    //     this.pageRight();
    //   }
    // }
    // document.getElementById("click-menu").onmouseup = () =>{
    //   let endTime = new Date();

    //   let time = endTime.getTime() - startTime.getTime()

    //   if (time < 1000){
    //     this.toggleMenu();
    //   }
    // }
  }
  pageRight(){
    this.updateLatestPos();
    rendition.next();
    window.speechSynthesis.cancel()
    
  }
  pageLeft(){
    this.updateLatestPos();
    rendition.prev()
    window.speechSynthesis.cancel()
  }

  async readTTS(line:string, start = undefined, end = undefined){
    if ('speechSynthesis' in window) {
      var to_speak = new SpeechSynthesisUtterance(line);
      to_speak.rate = this.settings.get("ttsRate");
      to_speak.pitch = this.settings.get("ttsPitch");
      to_speak.volume = this.settings.get("ttsVolume");

      let voiceName = this.settings.get("ttsVoice");
      if (voiceName != undefined) {
        speechSynthesis.getVoices().forEach((voice) => {
          if (voice.name == voiceName) {
            to_speak.voice = voice;
          }
        })
      }


      if (end != undefined){
        to_speak.onend = end;
      }

      if (start != undefined){
        to_speak.onstart = start;
      }

      window.speechSynthesis.speak(to_speak);
    }
  }

  

  // <----- depricated old reading system ----->


  // getLinesOnPage(){
  //   var range = rendition.getRange(rendition.currentLocation().start.cfi);
  //   var endRange = rendition.getRange(rendition.currentLocation().end.cfi);
  //   range.setEnd(endRange.startContainer, endRange.startOffset);
    
  //   var lines = range.toString().split("\n");
  //   return lines;
  // }


  // readPage(){
  //   if (delayInterval != undefined){
  //     if (rendition.currentLocation().start != undefined){
  //       clearInterval(delayInterval);
  //       delayInterval = undefined;
  //     }else{
  //       return
  //     }
  //   }
  //   let lines = this.getLinesOnPage();
  //   for (var i = 0; i < lines.length; i++){
  //     if (i + 1 == lines.length){
  //       this.readTTS(lines[i], undefined,() => {
  //         rendition.next()
  //         delayInterval = setInterval(() => {      
  //           this.updateLatestPos();
  //           this.readPage(); 
  //         }, 100);
          
  //       });
  //     }else
  //       this.readTTS(lines[i]);
  //   }
  // }

  readPageByElements(startElement = undefined){
    let body = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild).contentWindow.document.querySelectorAll("body")[0];

    if (delayInterval != undefined){
      if (rendition.currentLocation().start != undefined){
        clearInterval(delayInterval);
        delayInterval = undefined;
      }else{
        return
      }
    }

    let lines = this.getTextElements(body);

    if (startElement != undefined){
      if (lines.includes(startElement)){
        const index = lines.indexOf(startElement);
        lines = lines.slice(index);

        window.speechSynthesis.cancel();
      }
      else{
        console.log("not found")
        return
      }
    }

    if (lines.length == 0){
      rendition.next()
      delayInterval = setInterval(() => {      
        this.updateLatestPos();
        this.readPageByElements(); 
      }, 100);
    }

    lines.forEach((item, i) => {
      this.readTTS(item.innerText,()=>{
        if (this.settings.get("displayMode") == "dark"){
          item.style.backgroundColor = "#965300";
        }
        else if(this.settings.get("displayMode") == "light"){
          item.style.backgroundColor = "#F18500";
        }
      },
      ()=>{
        item.style.backgroundColor = ""

        if (i + 1 == lines.length){
          rendition.next()
          delayInterval = setInterval(() => {      
            this.updateLatestPos();
            this.readPageByElements(); 
          }, 100);
        }
      });
    })
  }

  readButtonPressed(){
    if (!window.speechSynthesis.speaking){
      this.readPageByElements();
    }
    
    else{
      if (speechSynthesis.paused){
        speechSynthesis.resume();
      }else{
        window.speechSynthesis.pause();
      }
    }
  }

  async updateLatestPos(){
    console.log("---------")


    console.log(rendition.currentLocation().start.cfi.toString())

    await this.storageService.set(bookTitle, rendition.currentLocation().start.cfi.toString());

    console.log(await this.storageService.get(bookTitle))
  }

  toggleMenu(){
    if (menuShown)
      document.getElementById("menu-container").style.display = "none";
    else
      document.getElementById("menu-container").style.display = "block";
    menuShown = !menuShown;
  }
  getTextElements(element){
    let all = element.querySelectorAll("*");
    let cache = []

    all.forEach((ele:any)=>{
      if (ele.innerText != undefined && ele.innerText.length > 0){
        if (this.isInViewport(ele)){
          if (ele.querySelectorAll("*").length < 5){
            if (!cache.includes(ele.parentElement)){
              cache.push(ele);
            }
          }
        }
      }
    });

    return cache;
  }
  isInViewport(element) {
    const iframe = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild);
    const iframeRect = iframe.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    if (rect.left >= Math.abs(iframeRect.left) && rect.left <= (window.innerWidth - iframeRect.left || document.documentElement.clientWidth - iframeRect.left)){
      return true
    }
    return false
  }
}

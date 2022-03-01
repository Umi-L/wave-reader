import { Component, OnInit } from '@angular/core';
import {DataPassService} from '../data-pass.service';
import {Router} from '@angular/router'
import { interval } from 'rxjs';
import{StorageService} from '../storage.service'


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

  constructor(private router:Router, private dataPassService: DataPassService, private storageService:StorageService) { }
  
  ngOnInit(){

    let data = this.dataPassService.getData();

    bookTitle = data[2];

    if (data == 0)
      this.router.navigateByUrl('/home', { replaceUrl: true }) ;


    var book = ePub(data[0]);

    rendition = book.renderTo("area", { method: "default", width: "100%", height: "100%", allowScriptedContent: false});
    rendition.themes.default("../assets/fontSheet.css")
    
    var displayed;
    if (data[1] != undefined){
      displayed = rendition.display(data[1]);
    }else{
      displayed = rendition.display()
    }


    // var startTime;

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
    var body = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild).contentWindow.document.querySelectorAll("body")[0];

    console.log(this.getTextElements(body));

    this.updateLatestPos();
    rendition.next();
    window.speechSynthesis.cancel()
    
  }
  pageLeft(){
    this.updateLatestPos();
    rendition.prev()
    window.speechSynthesis.cancel()
  }

  readTTS(line:string, callback = undefined){
    if ('speechSynthesis' in window) {
      var to_speak = new SpeechSynthesisUtterance(line);

      if (callback != undefined){
        to_speak.onend = callback;
      }

      window.speechSynthesis.speak(to_speak);
    }
  }

  getLinesOnPage(){
    var range = rendition.getRange(rendition.currentLocation().start.cfi);
    var endRange = rendition.getRange(rendition.currentLocation().end.cfi);
    range.setEnd(endRange.startContainer, endRange.startOffset);
    
    var lines = range.toString().split("\n");
    return lines;
  }

  readPage(){
    if (delayInterval != undefined){
      if (rendition.currentLocation().start != undefined){
        clearInterval(delayInterval);
        delayInterval = undefined;
      }else{
        return
      }
    }
    let lines = this.getLinesOnPage();
    for (var i = 0; i < lines.length; i++){
      if (i + 1 == lines.length){
        this.readTTS(lines[i], () => {
          rendition.next()
          delayInterval = setInterval(() => {      
            this.updateLatestPos();
            this.readPage(); 
          }, 100);
          
        });
      }else
        this.readTTS(lines[i]);
    }
  }

  readButtonPressed(){
    if (!window.speechSynthesis.speaking){
      this.readPage();
    }
    else{
      window.speechSynthesis.cancel();
    }
  }

  updateLatestPos(){
    this.storageService.set(bookTitle, rendition.currentLocation().start.cfi);
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
          cache.push(ele);
        }
      }
    });

    console.log(cache)
  }
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}
}

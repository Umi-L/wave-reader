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

    rendition = book.renderTo("area", { method: "default", width: "100%", height: "100%", allowScriptedContent: false, spread: false });
    rendition.themes.default("../assets/fontSheet.css")
    
    var displayed;
    if (data[1] != undefined){
      displayed = rendition.display(data[1]);
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

  readTTS(line:string, start = undefined, end = undefined){
    if ('speechSynthesis' in window) {
      var to_speak = new SpeechSynthesisUtterance(line);

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
      }
      else{
        console.log("not found")
        return
      }
    }

    lines.forEach((item, i) => {
      this.readTTS(item.innerText,()=>{
        console.log(item.innerText)
        item.style.backgroundColor = "#965300";
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
          if (!cache.includes(ele.parentElement) && ele.parentElement.children.length > 5){
            cache.push(ele);
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

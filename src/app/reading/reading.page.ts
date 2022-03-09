import { Component, OnInit } from '@angular/core';
import {DataPassService} from '../data-pass.service';
import {Router} from '@angular/router'
import{StorageService} from '../storage.service'
import{SettingsService} from '../settings.service'


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

    //wait for settings service to be initialized
    await this.settings.init();

    //gets book data passed from homepage
    let data = this.dataPassService.getData();

    //check if data was passed
    if (data == 0)
      this.router.navigateByUrl('/home', { replaceUrl: true }) ;

    bookTitle = data[1];

    //register the book as a parsed epub
    var book = ePub(data[0]);


    let allowScripts = await this.settings.get("scriptedContent");

    //render book
    rendition = book.renderTo("area", { method: "default", width: "100%", height: "100%", allowScriptedContent: allowScripts, spread: false });

    //set light mode and dark mode by checking settings and injecting style sheet
    if (this.settings.get("displayMode") == "dark"){
      rendition.themes.default("../assets/bookStyles/darkSheet.css")
    }
    else{
      rendition.themes.default("../assets/bookStyles/lightSheet.css")
    }

    //get latest position in book
    let latestCfi = await this.storageService.get(bookTitle);

    var displayed;
    if (latestCfi != undefined){
      //if latest cfi exists then display to that
      displayed = rendition.display(latestCfi);

      var started = false;

      //super hacky fix to epubjs bug where display(cfi) jumps to start of chapter not actual page location
      rendition.on("started", () =>{
        if (!started){
          rendition.display(latestCfi);
          console.log("2nd")
          started = true;
        }
      })

    }else{
      //else just display at start of book
      displayed = rendition.display()
    }



    //initialize window controls
    this.startInitLoop();



    //system to reload book when screen resizes, using a timer to only call a new render after the resize motion is complete.
    var resizeTimer;
    window.onresize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout( async () =>{
        //trying to fetch current cfi value, if thats not loaded just get the latest saved one from storage.
        try{
          let latestCfi = rendition.currentLocation().start.cfi
        }
        catch(e){
          let latestCfi = this.storageService.get(bookTitle);
        }

        //update the display
        rendition.display(latestCfi);

        //clear tts cache to fix any errors with text to speech not persisting over re render
        speechSynthesis.cancel()

        setTimeout(() =>{
          //initialize window after rendered
          this.startInitLoop();
        }, 100)

      }, 100)
    } 
  }

  //initializes window controls
  startInitLoop(){
    const initLoop = setInterval(() =>{
      //try to get book iframe if it doesn't exist retry until it exists.
      try{
        var doc = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild).contentWindow.document;
        console.log("passedError")

        //register double click handler to start tts
        doc.ondblclick =  (e) => {
          console.log("dbClickRegistered")
          this.readPageByElements(e.target);
        };

        //clear init loop once completed
        clearInterval(initLoop);
      }
      catch (e) {
      }

    }, 300)
  }

  pageRight(){
    //flips page
    rendition.next();

    //update book position after page turn, must be in a delay because it takes time to change chapters.
    setTimeout(() =>{
      this.updateLatestPos();
    }, 1000)

    //clear tts cache
    window.speechSynthesis.cancel()
  }
  pageLeft(){
    //flips page
    rendition.prev()

    //update book position after page turn, must be in a delay because it takes time to change chapters.
    setTimeout(() =>{
      this.updateLatestPos();
    }, 1000)

    //clear tts cache
    window.speechSynthesis.cancel()
  }

  //reads a line of text using the speechSynthisis api
  //takes a start and end callback function
  async readTTS(line:string, start = undefined, end = undefined){
    //check for speechSynthisis support in browser
    if ('speechSynthesis' in window) {
      
      //create utterance with settings
      var to_speak = new SpeechSynthesisUtterance(line);
      to_speak.rate = this.settings.get("ttsRate");
      to_speak.pitch = this.settings.get("ttsPitch");
      to_speak.volume = this.settings.get("ttsVolume");

      let voiceName = this.settings.get("ttsVoice");

      // if coustom voice find the voice component from the name and read using that
      if (voiceName != undefined) {
        speechSynthesis.getVoices().forEach((voice) => {
          if (voice.name == voiceName) {
            to_speak.voice = voice;
          }
        })
      }

      //setting callbacks in params
      if (end != undefined){
        to_speak.onend = end;
      }
      if (start != undefined){
        to_speak.onstart = start;
      }

      //read line
      window.speechSynthesis.speak(to_speak);
    }
    else{
      alert("tts not supported")
    }
  }

  readPageByElements(startElement = undefined){
    //get body element from book iframe
    let body = (<HTMLIFrameElement>document.getElementById("area").firstChild.firstChild.firstChild).contentWindow.document.querySelectorAll("body")[0];

    //check for delay between chapters
    if (delayInterval != undefined){
      //check if next chapter is rendered
      if (rendition.currentLocation().start != undefined){
        //clear interval and continue reading
        clearInterval(delayInterval);
        delayInterval = undefined;
      }else{
        //return to break from func if chapter not loaded
        return
      }
    }

    //get all html elements with book text
    let lines = this.getTextElements(body);

    //if location to start on page is defined
    if (startElement != undefined){
      //check elements found on page for start element
      if (lines.includes(startElement)){
        //set start index to index of start element
        const index = lines.indexOf(startElement);

        //slice lines on index to get list after start index
        lines = lines.slice(index);

        //cancel all already running speech
        window.speechSynthesis.cancel();
      }
      else{
        //start element not found in lines
        console.log("not found")
        return
      }
    }

    //if no lines
    if (lines.length == 0){
      //change pages
      rendition.next()

      //set page turn loop
      delayInterval = setInterval(() => {      
        this.updateLatestPos();
        this.readPageByElements(); 
      }, 100);
    }

    //for every line
    lines.forEach((item, i) => {
      //read the text of the line
      this.readTTS(item.innerText,()=>{
        //set highlight on currently reading element
        if (this.settings.get("displayMode") == "dark"){
          item.style.backgroundColor = "#965300";
        }
        else if(this.settings.get("displayMode") == "light"){
          item.style.backgroundColor = "#F18500";
        }
      },
      ()=>{
        //clear background highlight on end of reading that line
        item.style.backgroundColor = ""

        //if last line finish reading
        if (i + 1 == lines.length){
          //go to next page and run page turn interval
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
    //if not reading read page
    if (!window.speechSynthesis.speaking){
      this.readPageByElements();
    }
    
    else{
      //if paused resume
      if (speechSynthesis.paused){
        speechSynthesis.resume();
      }
      //if playing pause
      else{
        window.speechSynthesis.pause();
      }
    }
  }

  async updateLatestPos(){
    try{
      //set current location of book to current location
      this.storageService.set(bookTitle, rendition.currentLocation().start.cfi.toString());
    }
    catch (e) {
      //if cant fetch cfi value or some other error
      console.log("error updating position")
    }
  }

  toggleMenu(){
    if (menuShown)
      document.getElementById("menu-container").style.display = "none";
    else
      document.getElementById("menu-container").style.display = "block";
    menuShown = !menuShown;
  }

  getTextElements(element){
    //get all children of element
    let all = element.querySelectorAll("*");
    let cache = []

    //for ever found element
    all.forEach((ele:any)=>{
      //element contains text
      if (ele.innerText != undefined && ele.innerText.length > 0){
        //if element is visisble
        if (this.isInViewport(ele)){
          //if element has less than 5 decendents
          if (ele.querySelectorAll("*").length < 5){
            //if parent element is not already within cache
            if (!cache.includes(ele.parentElement)){
              //add element to cache
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

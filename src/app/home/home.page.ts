import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { timeStamp } from 'console';
import { DataPassService } from '../data-pass.service';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';
import { element } from 'protractor';
import { ToastController } from '@ionic/angular';

var isApp: boolean;
var acsess_token;
declare var ePub: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(
    private router: Router,
    private dataPassService: DataPassService,
    private storageService: StorageService,
    private toastCtrl: ToastController,
  ) {}

  async ngOnInit() {

    await this.storageService.init();


    acsess_token = await this.storageService.get('access_token');

    console.log(acsess_token);

    if (acsess_token == null || acsess_token == undefined) {
      this.router.navigate(['login']);
    }

    this.loadBooks()

    this.updateBookData()

    window.speechSynthesis.cancel();

    const bookInput = document.getElementById('bookInput');
    bookInput.onchange = async (e) => {
      let toast = await this.toastCtrl.create({message: "Uploading", "duration":1000, position:"bottom"})
      toast.present();

      var resp =  await this.uploadFile((<HTMLInputElement>bookInput).files[0], {"path":"/"+(<HTMLInputElement>bookInput).files[0].name});
      
      if (resp.status == 200){
        this.clearBooks();
        this.loadBooks();
        let toast = await this.toastCtrl.create({message: "book added to library!", "duration":1000, position:"bottom"});
        toast.present();
      }
      else{
        let toast = await this.toastCtrl.create({message: "There has been an error while uploading your book.", "duration":7000, position:"bottom"});
        toast.present();
      }
    };
  }
  clearStorage() {
    this.storageService.clearStorage();
  }

  dec2hex(dec) {
    return dec.toString(16).padStart(2, '0');
  }

  async openBook(file) {
    let location = undefined;
    let bookTitle = file.name;
    let response = await this.storageService.get(bookTitle);
    if (response != undefined) {
      location = response;
    }
    this.dataPassService.setData([file, location, bookTitle]);
    this.router.navigate(['reading']);
  }

  async apiCall(url: string, jsonData, headers = undefined, returnJson = true) {
    if (headers == undefined) {
      headers = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + acsess_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      };
    }
    let data = await fetch(url, headers).then((response) => {
      if (response.status == 401) {
        this.router.navigate(['login']);
      }
      if (returnJson) {
        return response.json();
      }
      return response;
    });
    return data;
  }
  parseDownloadResponse(res) {
    if (!res.ok) {
      return 1;
    }
    return new Promise((resolve) => {
      res.blob().then((data) => resolve(data));
    }).then((data) => {
      const result = JSON.parse(res.headers.get('dropbox-api-result'));

      result.fileBlob = data;

      return { status: res.status, headers: res.headers, result: result };
    });
  }
  blobToFile = (theBlob: Blob, fileName: string): File => {
    var b: any = theBlob;
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    b.lastModifiedDate = new Date();
    b.name = fileName;

    //Cast to a File() type
    return <File>theBlob;
  };
  async backupBookLocations(){
    var storageKeys = await this.storageService.keys();
    var re = /(?:\.([^.]+))?$/;

    var tempStorage = {}

    for (var i = 0; i < storageKeys.length; i++){
      if (re.exec(storageKeys[i])[1] == "epub"){
        var keyValue = await this.storageService.get(storageKeys[i]);

        tempStorage[storageKeys[i]] = keyValue;
      }
    }


    var file = new File([JSON.stringify(tempStorage)], "data.json")

    let url = 'https://content.dropboxapi.com/2/files/upload';
    let response = await this.uploadFile(file, {"path":"/data.json", "autorename": false, mode:{".tag":"overwrite"}});
  }

  async makeCard(entry){
    let card = document.createElement('ion-card');
    card.button = true;
    card.onclick = async () => {
      
      let file = await this.downloadFile({path:entry.path_lower}, entry.name);

      this.openBook(file);
    };

    let image = document.createElement('img');

    this.getBookImage(entry.path_lower, image);

    image.src = "../assets/book-cover-placeholder.png";

    let text = document.createElement('ion-card-title');
    text.innerHTML = entry.name.replace(/\.[^/.]+$/, '');

    let cardHead = card.appendChild(
      document.createElement('ion-card-header')
    );
    let cardBody = card.appendChild(
      document.createElement('ion-card-content')
    );

    cardBody.appendChild(image);
    cardHead.appendChild(text);


    card.appendChild(cardHead);
    card.appendChild(cardBody);

    let windows = document.querySelectorAll('ion-content');
    let grid = windows[windows.length - 1].querySelector('ion-grid');

    let rows = grid.querySelectorAll('ion-row');
    rows[rows.length - 1].appendChild(card);
  }
  async getBookImage(path,img){

    let headers = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + acsess_token,
        'Content-Type': 'text/plain',
        'Dropbox-API-Arg': JSON.stringify({
          path: path,
          size: 'w256h256',
        }),
      },
    };

    let url = 'https://content.dropboxapi.com/2/files/get_thumbnail';
    let imageResponse = await this.apiCall(url, null, headers, false);

    let imageFileResponse = await this.parseDownloadResponse(imageResponse);

    let imageFile = new File(
      [imageFileResponse['result'].fileBlob],
      'pic.jpeg'
    );

    img.src = URL.createObjectURL(imageFile);
  }

  uploadFile(file, args){
    const url = "https://content.dropboxapi.com/2/files/upload"

    const fetchOptions = {
      body: file,
      method: 'POST',
      headers: {
        "Authorization": 'Bearer ' + acsess_token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(args),
      },
    };

    return fetch(url,fetchOptions).then((response) => {return response});
  }
  async loadBooks(){
    let data = {
      path: '',
      recursive: true,
    };
  
    let url = 'https://api.dropboxapi.com/2/files/list_folder';
    let response = await this.apiCall(url, data);
  
  
    for (let i = 0; i < response.entries.length; i++) {
      let entry = response.entries[i];
  
      var re = /(?:\.([^.]+))?$/;
  
      if (entry[".tag"] == "file" && re.exec(entry.name)[1] == "epub"){
        this.makeCard(entry)
      }
    }
  }
  clearBooks(){
    let windows = document.querySelectorAll('ion-content');
    let grid = windows[windows.length - 1].querySelector('ion-grid');

    let rows = grid.querySelectorAll('ion-row');
    for (var i = 0; i < rows.length; i++){
      rows[i].innerHTML = "";
    }
  }

  async updateBookData(){
    let data = await this.downloadFile({path:"/data.json"},"data.json");
    let callback = async (fileData) => {
      console.log(await fileData)

      let jsonData = JSON.parse(fileData);

      let serverKeys = Array.from(jsonData.keys());
      let clientKeys = await this.storageService.keys();

      let overlapped = [].concat(serverKeys, clientKeys);
      let keys = [...new Set(overlapped)]

      var EpubCFI =  new ePub.CFI();

      var serverChanged = false;

      for (const key in keys){
        console.log(key)
        let localValue = await this.storageService.get(key);
        if (localValue != undefined && localValue != null){
          let highestValue = EpubCFI.compare(localValue, jsonData[key]);
          if (highestValue == 1){
            this.storageService.set(key, jsonData[key]);
          }
          else if (highestValue == -1){
            serverChanged = true;
            jsonData[key] = localValue;
          }
        }
        else{
          this.storageService.set(key, jsonData[key]);
        }
      }
      if (serverChanged){
        var file = new File([JSON.stringify(jsonData)], "data.json")
        this.uploadFile(file, {"path":"/data.json", "autorename": false, mode:{".tag":"overwrite"}})
      }
    }
    this.readFile(data, callback);
    

  }

  async downloadFile(data:object, fileName:string){
    let headers = {
      method: 'POST',
      headers: {
        "Authorization": 'Bearer ' + acsess_token,
        'Content-Type': 'text/plain',
        'Dropbox-API-Arg': JSON.stringify(data),
      },
    };

    let url = 'https://content.dropboxapi.com/2/files/download';
    let response = await this.apiCall(url, null, headers, false);

    let fileResponse = await this.parseDownloadResponse(response);

    let file = new File([fileResponse['result'].fileBlob], fileName);
    return file;
  }
  readFile(file, callback){
    let fileReader = new FileReader();

    fileReader.onload = () =>{
      callback(fileReader.result)
    };

    fileReader.readAsText(file);
  }
}


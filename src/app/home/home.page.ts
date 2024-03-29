import { Component } from '@angular/core';
import { DataPassService } from '../data-pass.service';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';
import { ToastController } from '@ionic/angular';
import { DropboxService } from '../dropbox.service';
import { SettingsService } from '../settings.service';

var isApp: boolean;
var access_token;
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
    private dropboxService: DropboxService,
    private settingsService:SettingsService
  ) {}

  async ngOnInit() {

    await this.storageService.init();
    await this.settingsService.init();

    let displayMode = this.settingsService.get("displayMode");
    document.body.setAttribute("color-theme", displayMode);
      

    access_token = await this.storageService.get('access_token');

    console.log(access_token);

    if (access_token == null || access_token == undefined) {
      this.router.navigate(['login']);
    }

    

    this.loadBooks();

    window.speechSynthesis.cancel();

    const bookInput = document.getElementById('bookInput');
    bookInput.onchange = async (e) => {
      let toast = await this.toastCtrl.create({
        message: 'Uploading',
        duration: 1000,
        position: 'bottom',
      });
      toast.present();

      var resp = await this.dropboxService.uploadFile((<HTMLInputElement>bookInput).files[0], {
        path: '/' + (<HTMLInputElement>bookInput).files[0].name,
      }, access_token);

      if (resp.status == 200) {
        this.clearBooks();
        this.loadBooks();
        let toast = await this.toastCtrl.create({
          message: 'book added to library!',
          duration: 1000,
          position: 'bottom',
        });
        toast.present();
      } else {
        let toast = await this.toastCtrl.create({
          message: 'There has been an error while uploading your book.',
          duration: 7000,
          position: 'bottom',
        });
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
    this.dataPassService.setData([file, bookTitle]);
    this.router.navigate(['reading']);
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
  async backupBookLocations() {
    var storageKeys = await this.storageService.keys();
    var re = /(?:\.([^.]+))?$/;

    var tempStorage = {};

    for (var i = 0; i < storageKeys.length; i++) {
      if (re.exec(storageKeys[i])[1] == 'epub') {
        var keyValue = await this.storageService.get(storageKeys[i]);

        tempStorage[storageKeys[i]] = keyValue;
      }
    }

    var file = new File([JSON.stringify(tempStorage)], 'data.json');

    let url = 'https://content.dropboxapi.com/2/files/upload';
    let response = await this.dropboxService.uploadFile(file, {
      path: '/data.json',
      autorename: false,
      mode: { '.tag': 'overwrite' },
    }, access_token);
  }

  async makeCard(entry) {
    let card = document.createElement('ion-card');
    card.setAttribute('class', "card");
    card.button = true;
    card.onclick = async () => {

      let toast = await this.toastCtrl.create({
        message: 'Loading',
        position: 'bottom',
      });
      toast.present();

      let file = await this.dropboxService.downloadFile(
        { path: entry.path_lower },
        entry.name,
        access_token
      );

      toast.dismiss();

      this.openBook(file);
    };

    let image = document.createElement('img');

    this.getBookImage(entry.path_lower, image);

    image.src = '../assets/book-cover-placeholder.png';

    let text = document.createElement('ion-card-title');
    text.innerHTML = entry.name.replace(/\.[^/.]+$/, '');

    let cardHead = card.appendChild(document.createElement('ion-card-header'));
    let cardBody = card.appendChild(document.createElement('ion-card-content'));

    cardBody.appendChild(image);
    cardHead.appendChild(text);

    card.appendChild(cardHead);
    card.appendChild(cardBody);

    let windows = document.querySelectorAll('ion-content');
    let grid = windows[windows.length - 1].querySelector('ion-grid');

    let rows = grid.querySelectorAll('ion-row');
    rows[rows.length - 1].appendChild(card);
  }
  async getBookImage(path, img) {
    let headers = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'text/plain',
        'Dropbox-API-Arg': JSON.stringify({
          path: path,
          size: 'w256h256',
        }),
      },
    };

    let url = 'https://content.dropboxapi.com/2/files/get_thumbnail';
    let imageResponse = await this.dropboxService.apiCall(url, null, headers, false, access_token);

    let imageFileResponse = await this.parseDownloadResponse(imageResponse);

    let imageFile = new File(
      [imageFileResponse['result'].fileBlob],
      'pic.jpeg'
    );

    img.src = URL.createObjectURL(imageFile);
  }
  
  async loadBooks() {
    let data = {
      path: '',
      recursive: true,
    };

    let url = 'https://api.dropboxapi.com/2/files/list_folder';
    let response = await this.dropboxService.apiCall(url, data, undefined, undefined, access_token);

    let filterMode = await this.settingsService.get("filterMode");

    let sorted = this.sortBooks(response.entries, filterMode);

    for (let i = 0; i < sorted.length; i++) {
      let entry = sorted[i];

      var re = /(?:\.([^.]+))?$/;

      if (entry['.tag'] == 'file' && re.exec(entry.name)[1] == 'epub') {
        this.makeCard(entry);
      }
    }
  }
  clearBooks() {
    let windows = document.querySelectorAll('ion-content');
    let grid = windows[windows.length - 1].querySelector('ion-grid');

    let rows = grid.querySelectorAll('ion-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].innerHTML = '';
    }
  }

  async updateBookData() {
    if (this.storageService.isInitialized()){
      console.log("books updated")
      let data = await this.dropboxService.downloadFile({ path: '/data.json' }, 'data.json', access_token);
      let callback = async (fileData) => {

        let jsonData = JSON.parse(fileData);

        let serverKeys = Array.from(Object.keys(jsonData));
        let clientKeys = await this.storageService.keys();

        let overlapped = [].concat(serverKeys, clientKeys);
        let keys = [...new Set(overlapped)];

        var EpubCFI = new ePub.CFI();

        var re = /(?:\.([^.]+))?$/;

        var serverChanged = false;

        for (const key in keys) {
          if (re.exec(keys[key])[1] == 'epub') {

            let localValue = await this.storageService.get(keys[key]);
            let serverValue = jsonData[keys[key]];

            if (localValue != undefined) {
              if (serverValue != undefined) {

                let highestValue = EpubCFI.compare(localValue, serverValue);
                if (highestValue == -1) {
                  this.storageService.set(keys[key], serverValue);
                } else if (highestValue == 1) {
                  serverChanged = true;
                  jsonData[keys[key]] = localValue;
                }
              } 
              else {
                serverChanged = true;
                jsonData[keys[key]] = localValue;
              }
            } else {
              this.storageService.set(keys[key], serverValue);
            }
          }
        }
        if (serverChanged) {
          console.log(jsonData);
          var file = new File([JSON.stringify(jsonData)], 'data.json');
          this.dropboxService.uploadFile(file, {
            path: '/data.json',
            autorename: false,
            mode: { '.tag': 'overwrite' },
          }, access_token);
        }
      };
      this.readFile(data, callback);
    }
  }

  
  readFile(file, callback) {
    let fileReader = new FileReader();

    fileReader.onload = () => {
      callback(fileReader.result);
    };

    fileReader.readAsText(file);
  }
  ionViewWillEnter(){
    window.speechSynthesis.cancel();

    this.updateBookData();
  }
  settingsPage(){
    this.router.navigate(['settings']);
  }
  reloadButton(){
    this.clearBooks();
    this.loadBooks();
  }
  sortBooks(books, sortMethod){
    if(sortMethod == "date"){
      return books;
    }
    if (sortMethod == "name"){
      let names = books.map(a => a.name);
      names = names.sort()

      let sortedEnteries = []

      for (var j = 0; j < names.length; j++) {
        for (var i = 0; i < books.length; i++){
          if (books[i].name == names[j]){
            sortedEnteries.push(books[i]);
          }
        }
      }

      return sortedEnteries;
    }
  }
  filterModeChange(){

    let popover = document.getElementById("filterPopover");

    let value = (<any>popover.querySelector("ion-radio-group")).value;

    this.settingsService.set("filterMode", value);
  }

  async popoverPresent(){
    let popover = document.getElementById("filterPopover");

    let savedValue = await this.settingsService.get("filterMode");

    (<any>popover.querySelector("ion-radio-group")).value = savedValue;
  }
  popoverDismiss(){
    const dismiss = setInterval(() => {
      try{
        this.clearBooks()
        this.loadBooks()
        clearInterval(dismiss)
      }
      catch(e){
      }
    },400)
  }
}

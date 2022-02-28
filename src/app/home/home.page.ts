import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { timeStamp } from 'console';
import { DataPassService } from '../data-pass.service';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';
import { element } from 'protractor';

var isApp: boolean;
var acsess_token;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(
    private router: Router,
    private dataPassService: DataPassService,
    private storageService: StorageService
  ) {}

  async ngOnInit() {

    await this.storageService.init();

    acsess_token = await this.storageService.get('access_token');

    console.log(acsess_token);

    if (acsess_token == null || acsess_token == undefined) {
      this.router.navigate(['login']);
    }

    let data = {
      path: '',
      recursive: true,
    };

    let url = 'https://api.dropboxapi.com/2/files/list_folder';
    let response = await this.apiCall(url, data);

    console.log(response);

    for (let i = 0; i < response.entries.length; i++) {
      let entry = response.entries[i];
      console.log(entry);

      var re = /(?:\.([^.]+))?$/;

      if (entry[".tag"] == "file" && re.exec(entry.name)[1] == "epub"){
        let card = document.createElement('ion-card');
        card.button = true;
        card.onclick = async () => {
          let headers = {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + acsess_token,
              'Content-Type': 'text/plain',
              'Dropbox-API-Arg': JSON.stringify({ path: entry.path_lower }),
            },
          };

          let url = 'https://content.dropboxapi.com/2/files/download';
          let response = await this.apiCall(url, null, headers, false);
          console.log('request processed');

          let fileResponse = await this.parseDownloadResponse(response);

          let file = new File([fileResponse['result'].fileBlob], entry.name);

          console.log(file);

          this.openBook(file);
        };

        let headers = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + acsess_token,
            'Content-Type': 'text/plain',
            'Dropbox-API-Arg': JSON.stringify({
              path: entry.path_lower,
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

        let image = document.createElement('img');

        image.src = URL.createObjectURL(imageFile);

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
    }


    window.speechSynthesis.cancel();

    this.backupBookLocations();

    const bookInput = document.getElementById('bookInput');
    bookInput.onchange = async (e) => {
      this.openBook((<HTMLInputElement>bookInput).files[0]);
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

    console.log(tempStorage)
    var blob = new Blob([JSON.stringify(tempStorage)], {type: 'text/plain'})

    const myJsonData = {
      id: Date.now(),
      title: "Untitled Thing",
      description: "Some description here..."
  };

    var file = new File([JSON.stringify(myJsonData, null, 2)], "data.json")

    let headers = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + acsess_token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({"path":"/data.json", "autorename": false, mode:{".tag":"overwrite"}}),
      },
    };

    let url = 'https://content.dropboxapi.com/2/files/upload';
    let response = await this.apiCall(url, file, headers, false);
    console.log(response);
  }
}

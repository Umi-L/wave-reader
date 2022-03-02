import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class DropboxService {

  constructor(private router:Router) { }

  uploadFile(file, args, access_token) {
    const url = 'https://content.dropboxapi.com/2/files/upload';

    const fetchOptions = {
      body: file,
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(args),
      },
    };

    return fetch(url, fetchOptions).then((response) => {
      return response;
    });
  }
  async downloadFile(data: object, fileName: string, access_token) {
    let headers = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + access_token,
        'Content-Type': 'text/plain',
        'Dropbox-API-Arg': JSON.stringify(data),
      },
    };

    let url = 'https://content.dropboxapi.com/2/files/download';
    let response = await this.apiCall(url, null, headers, false, access_token);

    let fileResponse = await this.parseDownloadResponse(response);

    let file = new File([fileResponse['result'].fileBlob], fileName);
    return file;
  }
  async apiCall(url: string, jsonData, headers = undefined, returnJson = true, access_token) {
    if (headers == undefined) {
      headers = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + access_token,
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
}

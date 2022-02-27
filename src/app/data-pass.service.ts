import { Injectable } from '@angular/core';
import { isNullOrUndefined } from 'util';

@Injectable({
  providedIn: 'root'
})
export class DataPassService {

  data:any;
  authData:any;

  constructor() { }

  getData(){
    if(this.data == null || this.data == undefined){
      return 0;
    }
    return this.data;
  }

  setData(_data){
    this.data = _data;
  }
}

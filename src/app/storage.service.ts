import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  public _storage: Storage | null = null;

  constructor(private storage: Storage) {
    this.init();
  }

  public async init(){
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    const storage = await this.storage.create();
    this._storage = storage;
  }

  // Create and expose methods that users of this service can
  // call, for example:
  public async set(key: string, value: any) {
    await this._storage.set(key, value);
  }

  public async get(key: string) {
    return this._storage.get(key);
  }

  public clearStorage(){
    this._storage.clear();
  }
}

import { Component } from '@angular/core';

declare var ePub: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
  constructor() {}

  ngOnInit(){

    const bookInput = document.getElementById("bookInput");
    bookInput.onchange = function(e){
      let book = ePub((<HTMLInputElement>bookInput).files[0]);

      var rendition = book.renderTo("area", { method: "continuous", width: "100%", height: "100%", allowScriptedContent: true});
      rendition.themes.default("../assets/fontSheet.css")
      var displayed = rendition.display();
    }
  }
}

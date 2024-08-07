//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Holdings Ltd

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 


import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[positiveNumbersOnly]'
})
export class NonNegativeNumbersDirective {

  constructor(private _el: ElementRef) {
  }

  @HostListener('blur', ['$event'])
  @HostListener('change', ['$event'])
  @HostListener('input', ['$event'])
  @HostListener('keydown', ['$event']) onKeyDown(event) {
    //this.appService.logToConsole(event);
    //  avoid desimal dot button ,minus button
    if (event.keyCode)
      if (event.keyCode == 109 || event.keyCode == 189 || event.keyCode == 69) {
        //this.appService.logToConsole(event.keyCode);
        event.stopPropagation();
        return false;
      }

    const initalValue = this._el.nativeElement.value;

    // this._el.nativeElement.value = initalValue.replace(/-/g, '');
    // // this._el.nativeElement.value = initalValue.replace(/[^0-9]*/g, '');

    // if (initalValue !== this._el.nativeElement.value) {
    //   this._el.nativeElement.value = "";
    //   event.stopPropagation();
    // }

  }

}



@Directive({
  selector: '[positiveNumberRange]'
})
export class NonNegativeNumbersRangeDirective {

  constructor(private _el: ElementRef) {
  }

  @HostListener('blur', ['$event'])
  @HostListener('change', ['$event'])
  @HostListener('input', ['$event'])
  @HostListener('keydown', ['$event']) onKeyDown(event) {

    

    const initalValue = this._el.nativeElement.value;
    this._el.nativeElement.value = initalValue.replace(/[^0-9^\.^-]*/g, '');
  
    if (initalValue !== this._el.nativeElement.value) {
      event.stopPropagation();
      return false;
    }

    //this.appService.logToConsole(event);
    //  avoid desimal dot button ,minus button
    // if (event.keyCode)
    //   if (event.keyCode == 109 || event.keyCode == 189 || event.keyCode == 69) {
    //     //this.appService.logToConsole(event.keyCode);
    //     event.stopPropagation();
    //     return false;
    //   }
  }

}
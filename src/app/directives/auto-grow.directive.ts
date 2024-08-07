//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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

import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[autoGrow]'
})
export class AutoGrowDirective {


  constructor(private _el: ElementRef) {
  }
  @Input('autoGrow') defaultrow:number; 
  @HostListener('blur', ['$event'])
  @HostListener('change', ['$event'])
  @HostListener('focus', ['$event'])
  @HostListener('input', ['$event'])
  @HostListener('keydown', ['$event']) onKeyDown(event) {
    event.target.style.height = "100px";
    if(this.defaultrow==1) {
      if(event.target.scrollHeight>35)
      {
          event.target.style.height = "0px";
          event.target.style.height = (event.target.scrollHeight + 5)+"px";
      }
      else{
        event.target.style.height = "35px";       
      }
    }
    if(this.defaultrow==5) {
      if(event.target.scrollHeight>175)
      {
          event.target.style.height = "0px";
          event.target.style.height = (event.target.scrollHeight + 5)+"px";
      }
      else{
        event.target.style.height = "118px";       
      }
    }
    if(event.target.value.trim()==="" && this.defaultrow==1)
    {
        event.target.style.height = "35px";
    }
    if(event.target.value.trim()==="" && this.defaultrow==5)
    {
        event.target.style.height = "118px";
    }
  }

}



@Directive({
  selector: '[autoGrowLength]'
})
export class AutoGrowLengthDirective {


  constructor(private el: ElementRef) { }

  // @HostListener('keyup') onKeyUp() {
  //   this.resize();
  // }

  // @HostListener('focus') onFocus() {
  //   this.resize();
  // }

  // @HostListener('change') onChange() {
  //   this.resize();
  // }

  @HostListener('blur', ['$event'])
  @HostListener('change', ['$event'])
  @HostListener('focus', ['$event'])
  @HostListener('input', ['$event'])
  @HostListener('keydown', ['$event']) onKeyDown(event) {
    this.resize();

  }

  private resize() {
    this.el.nativeElement.style.width = null;
    this.el.nativeElement.setAttribute('size', this.el.nativeElement.value.length + 1);
  }
}
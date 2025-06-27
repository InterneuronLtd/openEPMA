//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

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
import { Directive, HostListener, ElementRef, Input, AfterViewInit } from '@angular/core';
import { TimePickerComponent } from '../components/time-picker/time-picker.component';

@Directive({
  selector: '[appTimepicker]'
})
export class TimepickerDirective implements AfterViewInit {

  _picker: TimePickerComponent;

  @Input('appTimepicker')
    set appTimepicker(picker: TimePickerComponent) {

      if(picker) {
        this._picker = picker;
        this._picker.setTimeTo = this.el.nativeElement.value;
        this._picker.onTimeSelected.subscribe((timeVal) => {
            if (timeVal) {
              this.el.nativeElement.value = timeVal;
              this._picker.closeClock();
            }
        })
      }
    }

  constructor(private el: ElementRef) { }

  ngAfterViewInit(): void {
    this.el.nativeElement.readOnly = true;
  }

  @HostListener('click') OnHostClick() {
    this._picker.openClock();
  }
}

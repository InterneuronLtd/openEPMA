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


import { Directive, ElementRef, HostListener, Input } from '@angular/core';
@Directive({
    selector: '[numberMaxLimit]'
})
export class NumberMaxLimitDirective {
    oldVal = null;
    @Input('numberMaxLimit') maxNumber: number;
    @HostListener('keyup', ['$event'])
    @HostListener('keydown', ['$event'])
    onInput(e: any) {
        
        if (Number(this._el.nativeElement.value) > this.maxNumber &&
            e.keyCode != 46 // delete
            &&
            e.keyCode != 8 // backspace
            && 
            e.keyCode != 9 // tab
        ) {
            e.preventDefault();
            this._el.nativeElement.value = this.oldVal;
        } else {
            this.oldVal = Number(this._el.nativeElement.value);
        }
    }
    constructor(private _el: ElementRef) {
    }
}

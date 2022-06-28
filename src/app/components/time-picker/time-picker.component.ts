//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2022  Interneuron CIC

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
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Input, Output, EventEmitter } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-time-picker',
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.css']
})
export class TimePickerComponent implements OnInit {

  @Input() setTimeTo: string;
  @Output() onTimeSelected = new EventEmitter<string>();

  @ViewChild(ModalDirective, { static: false }) staticModal: ModalDirective;
  //@ViewChild("hourten") hourTen: ElementRef;
  //@ViewChild("hourunit") hourUnit: ElementRef;
  //@ViewChild("minuteten") minuteTen: ElementRef;
  //@ViewChild("minuteunit") minuteUnit: ElementRef;

  selectedHourTen: string = '0';
  selectedHourUnit: string = '0';
  selectedMinuteTen: string = '0';
  selectedMinuteUnit: string = '0';
  selectedTime: string = '00:00';

  clickCount = 1;

  displayThree = false;
  displayFour = false;
  displayFive = false;
  displaySix = false;
  displaySeven = false;
  displayEight = false;
  displayNine = false;
  displayPrevious = false;
  displayNext = false;

  /*hourTenBackground: string;
  hourUnitBackground: string;
  minTenBackground: string;
  minUnitBackground: string;*/

  constructor() { }

  ngOnInit(): void {
    //this.resetClock();
    //this.enableNumbersToSelect();
  }

  ngAfterViewInit() {
    //this.hourTen.nativeElement.focus();
    //this.hourTen.nativeElement.select();
  }

  selectTime(value: string): void {

    switch (this.clickCount) {
      case 1:
        this.selectedHourTen = value;
        if (+value == 2 && +this.selectedHourUnit > 3) {
          this.selectedHourUnit = "0";
        } 
        this.clickCount++;
        this.enableNumbersToSelect();
        break;
      case 2:
        this.selectedHourUnit = value;
        this.clickCount++;
        this.enableNumbersToSelect();
        break;
      case 3:
        this.selectedMinuteTen = value;
        this.clickCount++;
        this.enableNumbersToSelect();
        break;
      case 4:
        this.selectedMinuteUnit = value;
        this.selectedTime = this.selectedHourTen.toString() + 
          this.selectedHourUnit.toString() + 
          ':' + 
          this.selectedMinuteTen + 
          this.selectedMinuteUnit;
        this.onTimeSelected.emit(this.selectedTime);
        this.setTimeTo = this.selectedTime;
        //this.clickCount = 4;
        this.resetClock();
        this.enableNumbersToSelect();
        break;
    }
  }

  moveNext(): void {
    if (this.clickCount >= 1 && this.clickCount <= 4) {
      
      this.clickCount++;
      this.enableNumbersToSelect();
      
      if (!this.setTimeTo) {
        switch (this.clickCount) {
          case 1:
            this.selectedHourTen = '0';
            break;
          case 2:
            this.selectedHourUnit = '0';
            break;
          case 3:
            this.selectedMinuteTen = '0';
            break;
          case 4:
            this.selectedMinuteUnit = '0';
            break;
        }
      }
    } else {
      this.clickCount = 1;

      if (!this.setTimeTo) {
        this.selectedMinuteUnit = '0';
      }
    }
  }

  movePrevious(): void {
    if (this.clickCount > 1 && this.clickCount < 5) {
      
      this.clickCount--;
      this.enableNumbersToSelect();

      if (!this.setTimeTo) {
        switch (this.clickCount) {
          case 1:
            this.selectedHourTen = '0';
            break;
          case 2:
            this.selectedHourUnit = '0';
            break;
          case 3:
            this.selectedMinuteTen = '0';
            break;
          case 4:
            this.selectedMinuteUnit = '0';
            break;
        }
      }
    } else {
      this.clickCount = 1;

      if (!this.setTimeTo) {
        this.selectedHourTen = '0';
      }
    }

  }

  openClock() {
    this.staticModal.show();
    this.resetClock();
    this.enableNumbersToSelect();
  }

  closeClock() {
    this.staticModal.hide();
  }

  getCurrentTime(): void {
    let currentTime = new Date();
    this.selectedTime = '';

    if (currentTime.getHours() < 10) {
      this.selectedTime = '0' + currentTime.getHours();
    } else {
      this.selectedTime = currentTime.getHours().toString();
    }
    
    this.selectedTime += ":";

    if (currentTime.getMinutes() < 10) {
      this.selectedTime += '0' + currentTime.getMinutes();
    } else {
      this.selectedTime += currentTime.getMinutes().toString();
    }

    this.onTimeSelected.emit(this.selectedTime);
  }

  getSelectedTime(): void {
    this.selectedTime =
      this.selectedHourTen.toString() +
      this.selectedHourUnit.toString() +
      ':' +
      this.selectedMinuteTen +
      this.selectedMinuteUnit;
      this.onTimeSelected.emit(this.selectedTime);
      this.setTimeTo = this.selectedTime;
      this.resetClock();
      this.enableNumbersToSelect();    
  }

  enterTime(event: any) {
    //console.log(event);
    //event.target.select();

    if (event.key == "Enter") {
      this.getSelectedTime();     
    } else if (event.key == "Tab") {// || event.key == "ArrowRight") {
      event.target.select();
      this.moveNext();
    } /*else if (event.key == "ArrowLeft") {
      event.target.select();
      this.movePrevious();
    }*/ else if (event.key >= 0 && event.key <= 9){
      event.target.select();
      this.validateKeyNumber(event);
    } else {
      event.target.select();
      this.resetInput(event);
    }
    
  }

  clickInput(event: any) {
    event.target.select();

    switch(event.target.id) {
      case "hourten":
        this.clickCount = 1;
        break;
      case "hourunit":
        this.clickCount = 2;
        break;
      case "minuteten":
        this.clickCount = 3;
        break;
      case "minuteunit":
        this.clickCount = 4;
        break;                    
    }

    this.enableNumbersToSelect();
  }

  clickHourTen(event: any) {
    event.target.select();
    this.clickCount = 1;
    this.enableNumbersToSelect();
  }

  clickHourUnit(event: any) {
    event.target.select();
    this.clickCount = 2;
    this.enableNumbersToSelect();
  }

  clickMinTen(event: any) {
    event.target.select();
    this.clickCount = 3;
    this.enableNumbersToSelect();
  }

  clickMinUnit(event: any) {
    event.target.select();
    this.clickCount = 4;
    this.enableNumbersToSelect();
  }

  private enableNumbersToSelect(){

    if (this.clickCount <= 1) {
      this.displayPrevious = false;
    } else {
      this.displayPrevious = true;
    }

    if (this.clickCount >= 4) {
      this.displayNext = false;
    } else {
      this.displayNext = true;
    }

    switch(this.clickCount) {
      case 1:
        this.displayThree = false;
        this.displayFour = false;
        this.displayFive = false;
        this.displaySix = false;
        this.displaySeven = false;
        this.displayEight = false;
        this.displayNine = false;

        /*this.hourTenBackground = 'labelbg';
        this.hourUnitBackground = '';
        this.minTenBackground = '';
        this.minUnitBackground = '';*/

        //this.hourTen.nativeElement.focus();
        //this.hourTen.nativeElement.select();
      break;
      case 2:
        /*this.hourTenBackground = '';
        this.hourUnitBackground = 'labelbg';
        this.minTenBackground = '';
        this.minUnitBackground = '';*/

        //this.hourUnit.nativeElement.focus();
        //this.hourUnit.nativeElement.select();

        if (+this.selectedHourTen >= 0 && +this.selectedHourTen < 2) {
          this.displayThree = true;
          this.displayFour = true;
          this.displayFive = true;
          this.displaySix = true;
          this.displaySeven = true;
          this.displayEight = true;
          this.displayNine = true;
        } else {
          this.displayThree = true;
          this.displayFour = false;
          this.displayFive = false;
          this.displaySix = false;
          this.displaySeven = false;
          this.displayEight = false;
          this.displayNine = false;
        }
      break;
      case 3:
        /*this.hourTenBackground = '';
        this.hourUnitBackground = '';
        this.minTenBackground = 'labelbg';
        this.minUnitBackground = '';*/

        //this.minuteTen.nativeElement.focus();
        //this.minuteTen.nativeElement.select();

        this.displayThree = true;
        this.displayFour = true;
        this.displayFive = true;
        this.displaySix = false;
        this.displaySeven = false;
        this.displayEight = false;
        this.displayNine = false;        
      break;
      case 4:
        /*this.hourTenBackground = '';
        this.hourUnitBackground = '';
        this.minTenBackground = '';
        this.minUnitBackground = 'labelbg';*/

        //this.minuteUnit.nativeElement.focus();
        //this.minuteUnit.nativeElement.select();

        this.displayThree = true;
        this.displayFour = true;
        this.displayFive = true;
        this.displaySix = true;
        this.displaySeven = true;
        this.displayEight = true;
        this.displayNine = true;
      break;
    }

  }

  private resetClock(): void {

    if (this.setTimeTo) {
      if (this.setTimeTo.indexOf(':') > -1) {
        this.selectedHourTen = this.setTimeTo.split(':')[0].substr(0,1);
        this.selectedHourUnit = this.setTimeTo.split(':')[0].substr(1,1);
        this.selectedMinuteTen = this.setTimeTo.split(':')[1].substr(0,1);
        this.selectedMinuteUnit = this.setTimeTo.split(':')[1].substr(1,1);
      } else {
        this.selectedHourTen = '0';
        this.selectedHourUnit = '0';
        this.selectedMinuteTen = '0';
        this.selectedMinuteUnit = '0';
      }
    } else {
      let currentTime = new Date();

      if (currentTime.getHours() < 10) {
        this.selectedHourTen = '0';
        this.selectedHourUnit = currentTime.getHours().toString().substr(0,1);
      } else {
        this.selectedHourTen = currentTime.getHours().toString().substr(0,1);
        this.selectedHourUnit = currentTime.getHours().toString().substr(1,1);
      }
      
      if (currentTime.getMinutes() < 10) {
        this.selectedMinuteTen = '0';
        this.selectedMinuteUnit = currentTime.getMinutes().toString().substr(0,1);
      } else {
        this.selectedMinuteTen = currentTime.getMinutes().toString().substr(0,1);
        this.selectedMinuteUnit = currentTime.getMinutes().toString().substr(1,1);
      }
    }

    this.selectedTime =
    this.selectedHourTen +
    this.selectedHourUnit +
    ':' +
    this.selectedMinuteTen +
    this.selectedMinuteUnit;

    this.clickCount = 1;
  }

  private validateKeyNumber(event: any) {

    let inputId = event.target.name;
    let inputValue = event.key;

    switch (inputId) {
      case 'hourten':
        if (inputValue && inputValue >= 0 && inputValue <= 2) {
          this.selectTime(inputValue);
        } else {
          this.resetInput(event);
        }
      break;
      case 'hourunit':
        if (+this.selectedHourTen < 2) {
          if (inputValue && inputValue >= 0 && inputValue <= 9) {
            this.selectTime(inputValue);
          } else {
            this.resetInput(event);
          }
        } else if (+this.selectedHourTen == 2) {
          if (inputValue && inputValue >= 0 && inputValue <= 3) {
            this.selectTime(inputValue);
          } else {
            this.resetInput(event);
          }          
        } else {
          this.resetInput(event);
        }      
      break;
      case 'minuteten':
        if (inputValue && inputValue >= 0 && inputValue <= 5) {
          this.selectTime(inputValue);
        } else {
          this.resetInput(event);
        }        
      break;
      case 'minuteunit':
        if (inputValue && inputValue >= 0 && inputValue <= 9) {
          this.selectTime(inputValue);
        } else {
          this.resetInput(event);
        }           
      break;
    }
  }

  private resetInput(event: any) {
    switch(event.target.name) {
      case "hourten":
        this.selectedHourTen = this.selectedTime.split(':')[0].substr(0,1);
        event.target.focus();
        event.target.select();
        break;
      case "hourunit":
        this.selectedHourUnit = this.selectedTime.split(':')[0].substr(1,1);
        event.target.focus();
        event.target.select();
        break;
      case "minuteten":
        this.selectedMinuteTen = this.selectedTime.split(':')[1].substr(0,1);
        event.target.focus();
        event.target.select();
        break;
      case "minuteunit":
        this.selectedMinuteUnit = this.selectedTime.split(':')[1].substr(1,1);
        event.target.focus();
        event.target.select();
        break;                    
    }    
  }

}

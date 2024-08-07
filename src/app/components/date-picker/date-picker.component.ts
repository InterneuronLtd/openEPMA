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
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css']
})
export class DatePickerComponent implements OnInit {
  headerLabelText = 'Select date range';
  startDate;
  endDate;
  errorMessage;

  @Output() getDates: EventEmitter<any> = new EventEmitter();

  constructor(public bsModalRef: BsModalRef) { }

  ngOnInit(): void {
    const date = new Date()
    this.endDate = date.getFullYear() + '-' + this.getProperMonth(date) + '-' + this.getProperDay(date);
    const prevDate = new Date(new Date().setDate(date.getDate() - 29));
    this.startDate = prevDate.getFullYear() + '-' + this.getProperMonth(prevDate) + '-' + this.getProperDay(prevDate);
  }

  getProperMonth(date: Date, subtractDate = false) {
    if (!subtractDate) {
      return (date.getMonth() + 1).toString().length === 2 ? (date.getMonth() + 1).toString() : '0' + (date.getMonth() + 1).toString();
    }
    return (date.getMonth()).toString().length === 2 ? (date.getMonth()).toString() : '0' + (date.getMonth()).toString();

  }

  getProperDay(date: Date) {
    return (date.getDate()).toString().length === 2 ? (date.getDate()).toString() : '0' + (date.getDate()).toString();
  }

  saveDates() {
    this.bsModalRef.content.saveDone(this.startDate + '--' + this.endDate);
    this.bsModalRef.hide();

  }

  startDateChange(event) {
    const checkDate = new Date(event.target.value);
    const inputDate = new Date(event.target.value);
    const endDate = new Date(this.endDate);

    inputDate.setHours(0, 0, 0, 0);
    endDate.setHours(0 , 0, 0, 0);
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < inputDate) {
      this.errorMessage = 'Date cannot be greater than today...';
      return;
    } else
     if (inputDate > endDate) {
      this.errorMessage = 'Start Date cannot be greater than end date';
      return
    }
    const start = moment(inputDate);
    const end = moment(endDate);
    if (end.diff(start, 'days') > 30) {
      this.errorMessage = 'Difference between start and end date cannot be more than 31 days'
      return;
    }

    this.errorMessage = '';
    // this.errorMessage = '';
    // this.startDate = checkDate.getFullYear() + '-' + this.getProperMonth(checkDate) + '-' + this.getProperDay(checkDate);
    // let check = checkDate.getDate();
    // let endDateLocal: Date | string = this.addDays(30, checkDate);
    // endDateLocal = endDateLocal.getFullYear() + '-' + this.getProperMonth(endDateLocal) + '-' + this.getProperDay(endDateLocal);
    // let todaysDate: Date | string = new Date();
    // todaysDate = todaysDate.getFullYear() + '-' + this.getProperMonth(todaysDate) + '-' + this.getProperDay(todaysDate);
    // if (endDateLocal > todaysDate) {
    //   this.endDate = todaysDate;
    // } else {
    //   this.endDate = endDateLocal;
    // }
  }

  cancel() {
    this.bsModalRef.content.cancel();
    this.bsModalRef.hide();
  }

  addDays(days, date: Date) {
    var date = new Date(date);
    date.setDate(date.getDate() + days);
    return date;
  }

  subtractDays(days, date: Date) {
    var date = new Date(date);
    date.setDate(date.getDate() - days);
    return date;
  }

  endDateChange(event) {
    const checkDate = new Date(event.target.value);
    checkDate.setHours(0, 0, 0, 0);
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < checkDate) {
      this.errorMessage = 'Date cannot be greater than today...';
      return;
    }
    this.errorMessage = '';
    this.endDate = checkDate.getFullYear() + '-' + this.getProperMonth(checkDate) + '-' + this.getProperDay(checkDate);
    let startDateLocal: Date | string = this.subtractDays(29, checkDate);
    startDateLocal = startDateLocal.getFullYear() + '-' + this.getProperMonth(startDateLocal) + '-' + this.getProperDay(startDateLocal);
    this.startDate = startDateLocal;

  }

}

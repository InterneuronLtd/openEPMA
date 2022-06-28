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
import { Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Injectable } from '@angular/core';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import { DemoHelper } from '../demo-chart/demo-helper';

import { AppService } from "src/app/services/app.service"
import moment from 'moment';
import { Prescription } from 'src/app/models/EPMA';



@Component({
  selector: 'app-demo-chart',
  templateUrl: './demo-chart.component.html',
  styleUrls: ['./demo-chart.component.css']
})
export class DemoChartComponent implements OnInit {
  @Input() Prescription: Prescription

  @ViewChild('demochart', { static: true }) timecomponentid: ElementRef;
  constructor(public appService: AppService) { }
  timeline: Timeline;
  options = {};
  items: any;
  groups: any;
  charthight=125
  demoHelper: DemoHelper;
  ngOnInit(): void {
    if(this.Prescription.isinfusion || this.Prescription.__posology[0].prn ){
      this.charthight=150
    }
    this.items = new DataSet();
    this.getEvents();

    let timediv = new Timeline(this.timecomponentid.nativeElement, null, this.options);

    timediv.setItems(this.items);



  }
  getEvents() {
    this.configureOptions();
    this.demoHelper = new DemoHelper(this.appService);

    let allEvents = this.demoHelper.createPrescriptionFormEvent(this.Prescription);
    for (var dose of allEvents) {
      if (this.Prescription.isinfusion) {
        if (dose.eventEnd) {
          dose.eventEnd = moment(dose.eventEnd);
          this.items.update({
            id: dose.dose_id, content: '', start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id
          })

        }
        else {
          this.addUpdateItem(dose.dose_id, dose.content, "", dose.eventStart, dose.eventEnd, dose.prescription_id, "title")
        }

      }
      else {
        this.addUpdateItem(dose.dose_id, dose.content, "transparant", dose.eventStart, dose.eventEnd, dose.prescription_id, "title")
      }
    }
  }

  addUpdateItem(id: any, content: any, className: any, start: any, end: any = null, groupid: any, title: any) {
    this.items.update({
      id: id, content: content,
      className: "transparant", start: start, end: end, group: groupid
    })
  }
  configureOptions() {

    // Configuration for the Timeline
    let timelineZoomLevelstart = moment(this.Prescription.__posology[0].prescriptionstartdate).toDate();
    timelineZoomLevelstart.setHours(moment(this.Prescription.__posology[0].prescriptionstartdate).get("h") - 3);
    // timelineZoomLevelstart.setHours(0);
    let timelineZoomLevelend = new Date(timelineZoomLevelstart);
    timelineZoomLevelend.setHours(moment(this.Prescription.__posology[0].prescriptionstartdate).get("h") + 21);

    //timelineZoomLevelend.setDate(timelineZoomLevelend.getDate() + 1);
    let currentDate = moment(this.Prescription.__posology[0].prescriptionstartdate).toDate();
    let maxUsercanscroll = moment(currentDate).add(2, 'days');
    let minUsercanscroll = moment(currentDate).add(-1, 'days');
    maxUsercanscroll.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
    minUsercanscroll.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    this.options = {
      height: this.charthight,
      stack: false,
      zoomKey: "altKey",
      start: timelineZoomLevelstart,
      end: timelineZoomLevelend,
      min: minUsercanscroll,                // lower limit of visible range
      max: maxUsercanscroll,
      zoomMin: 40000 * 25,
      zoomMax: (1000 * 60 * 60 * 24 * 7 + 10),
      orientation: { axis: "top" }

    };
  }

}

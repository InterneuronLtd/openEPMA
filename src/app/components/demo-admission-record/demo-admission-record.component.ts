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
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { AppService } from 'src/app/services/app.service';
import moment from 'moment';
import { Medication, Prescription } from 'src/app/models/EPMA';
import { HelperService } from 'src/app/services/helper.service';
import { TimeerHelper } from '../drug-chart/timer-helper';
import { DataRequest } from 'src/app/services/datarequest';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AdmissionRecordsTemplate } from '../admission-records-templates/admission-records-template.component';
import { AdministrationStatus, InfusionType } from 'src/app/services/enum';
import $ from "jquery";

@Component({
  selector: 'app-demo-admission-record',
  templateUrl: './demo-admission-record.component.html',
  styleUrls: ['./demo-admission-record.component.css']
})
export class DemoAdmissionRecordComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() marType: string = 'empty';
  @Input() sdate;
  @Input() edate;
  @Input() emptyTemplates;
  @Input() activeRecordedDays = 5;
  @ViewChildren("activeTemplate") divs: QueryList<ElementRef>;
  @ViewChild("activeHeaderHeight") headerDiv: ElementRef;
  @ViewChildren("secondActivePart") divs2: QueryList<ElementRef>;
  @ViewChildren("presDescription") presDescriptionDivs: QueryList<ElementRef>;
  @ViewChildren("pageHeader") pageHeaders: QueryList<ElementRef>;
  @ViewChildren("pageFooter") pageFooter: QueryList<ElementRef>;
  @ViewChildren("pageFooter2") pageFooter2: QueryList<ElementRef>;
  @ViewChildren("headerSecondPart") headerSecondPart: QueryList<ElementRef>;
  @ViewChild("presParentNode") parentNode: ElementRef;

  @Output() destroyTemplate: EventEmitter<any> = new EventEmitter();
  repeatArray = [1, 2, 3];
  repeatArray2 = [];
  dates = [];
  pres1 = [1, 2, 3];
  daysOfWeek = {
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday"
  };
  transferDoses = {};
  presIds = [];
  prescriptionHistory = [];
  todaysDate;


  prescription: Array<Prescription>;
  prescriptionMapping = {};
  prescriptionMappingForTemplate = {
  };
  objectKeys = Object.keys;
  remainingProtocolDoses;
  updateHeights: Array<any> = [];
  metaprescriptionstatus: Array<any>;
  prescriptionProperFlow = {};
  patientDetails = { fullname: '', born: '', hospitalnumber: '', nhsnumber: '', allergies: '', dob: '', age: '', gender: '' };
  partTwoPrescriptions = [];
  encounterDetails = {
    attendingdoctortext: '', assignedpatientlocationroom: '', assignedpatientlocationbay: '', assignedpatientlocationbed: '',
    admitdatetime: '', admitdate: '', dayspassed: 0, assignedpatientlocationpointofcare: '', consultingdoctortext: ''
  };
  partTwoHeights = [];
  medicationAdministration: any;
  rateEventsdata = [];
  headerSection: number = 0;
  constructor(public timeerHelper: TimeerHelper, public appService: AppService, public hs: HelperService, private renderer: Renderer2, public dr: DataRequest, private apiRequest: ApirequestService) {

  }

  ngOnInit() {
    ///////
    const dateTo = moment().add(3, 'd');
    dateTo.set({'hour':23,'minute': 59,'second':59})
   
    const startDate = moment().add(-1, 'd');
    startDate.set({'hour':23,'minute': 59,'second':59})
    this.timeerHelper.createEvents(startDate,dateTo, true);
  
    this.appService.reportData = this.appService.reportData.filter(function( element ) {
      return element !== undefined;
    });
    var todayDate = moment();
    todayDate.set({'hour':0,'minute': 0,'second':0});
    this.rateEventsdata = this.appService.reportData.filter(e => {
      return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent")
      && moment(e.eventStart).isBetween(moment(todayDate),dateTo)
    });

    //////
    this.prescription = [];
    // this.appService.prescriptionEvent
    this.appService.reportData = [];

    this.appService.Prescription.forEach(pres => {
      pres.comments = pres.comments ? pres.comments?.split(' ').join(' ') : null;
    })
    this.partTwoHeights = [];
    this.medicationAdministration = this.appService.Medicationadministration.slice();
    this.medicationAdministration.forEach(ma => {
      ma['checked'] = false;
    })
    this.todaysDate = moment().format('DD-MM-YYYY');
    // console.log('pres history', this.appService.prescriptionHistory);
    // console.log('encounter', this.appService.encounterDetails);
    // console.log('height, weight', this.appService.refHeightValue, this.appService.refWeightValue);
    this.patientDetails = this.appService.patientDetails;
    const splitAge = this.patientDetails.born?.split(' ');
    this.patientDetails.dob = splitAge[0] + ' ' + splitAge[1] + ' ' + splitAge[2];
    this.patientDetails.age = splitAge[3];
    this.encounterDetails = this.appService.encounterDetails;
    if(this.encounterDetails.assignedpatientlocationbay){
    this.encounterDetails.assignedpatientlocationbay = (this.encounterDetails.assignedpatientlocationbay?? "").replace(new RegExp('-', 'g'), ' - ');
    }
    else{
      this.encounterDetails.assignedpatientlocationbay="";
    }
    if(this.encounterDetails.assignedpatientlocationbed){
    this.encounterDetails.assignedpatientlocationbed = (this.encounterDetails.assignedpatientlocationbed?? "").replace(new RegExp('-', 'g'), ' - ');
    }
    else{
      this.encounterDetails.assignedpatientlocationbed="";
    }
    this.encounterDetails.admitdate = this.appService.encounterDetails.admitdatetime?.split('T')[0];
    this.encounterDetails.dayspassed = moment(this.appService.encounterDetails['admitdate']).diff(moment(), 'days');
    this.metaprescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.appService.FilteredPrescription.forEach(pres => {
      this.prescriptionMapping[pres.prescription_id] = pres;
    });
    // console.log('this.prescriptionMapping',this.prescriptionMapping);
    this.prescription = [];
    // this.hs.getDosesPrescriptions(this.prescription);
    this.dates.push(new Date());
    for (let i = 1; i <= 3; i++) {
      this.dates.push(new Date(this.dates[i - 1].getTime() + 86400000));
    }

    if (this.marType === 'empty') {
      this.prescription = [];
      for (let i = 0; i < this.emptyTemplates; i++) {
        this.prescription.push(null);
      }
    } else if (this.marType === 'active') {
      const dateFrom = moment().subtract(this.activeRecordedDays || 5, 'd');
      this.timeerHelper.createEvents(dateFrom, moment(), true);
      this.appService.reportData = this.appService.reportData.filter(function( element ) {
        return element !== undefined;
      });
      const pastEvents = this.appService.reportData.filter(e => {
        return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent") 
        && moment(e.eventStart).isBefore() && moment(e.eventStart).isAfter(dateFrom) && !e.content.includes("Administer_PRN")
      });
      // const pastEvents = this.appService.events.filter(obj => {
      //   return moment(obj.eventStart).isBefore() && moment(obj.eventStart).isAfter(dateFrom);
      // });
      // console.log("past events", pastEvents);
      const checkPresId = {};
      const activeStartDate = moment().add(-1, 'd');
      activeStartDate.set({'hour':23,'minute': 59,'second':59})
      const dateToForFuture = moment().add(3, 'd');
      this.timeerHelper.createEvents(activeStartDate, dateToForFuture, true);
      const futureEvents = this.appService.reportData.filter(obj => {
        const endDate = this.appService.GetCurrentPosology(this.prescriptionMapping[obj.prescription_id]).prescriptionenddate;
        let endDateCheck = true;
        // // for test
        // if (!obj.isinfusion) {
        //   return false;
        // }
        if (endDate) {
          endDateCheck = moment().isBefore(endDate);
        }

        if (checkPresId[obj.prescription_id]) {
          return false;
        } else if (((!obj.eventEnd) || (moment(obj.eventEnd).isAfter(moment()))) && endDateCheck) {
          checkPresId[obj.prescription_id] = 1;
          return true;
        }
      });
      this.appService.FilteredPrescription.forEach(obj => {
        this.prescription.push(this.prescriptionMapping[obj.prescription_id]);
      });

      // console.log('prescription 1',this.prescription);
      this.prescription = this.prescription.filter(x => (x.prescriptionstatus_id == "fe406230-be68-4ad6-a979-ef15c42365cf" || x.prescriptionstatus_id == "fd8833de-213b-4570-8cc7-67babfa31393" || x.prescriptionstatus_id == "63e946cd-b4a4-4f60-9c18-a384c49486ea"))

      // console.log('prescription 2',this.prescription);
      this.hs.getDosesPrescriptions(this.prescription);
      if(this.prescription.length > 0)
      {
        this.protocolGetDay();
      }
      
      // console.log("pres dictionary", this.hs.prescriptionDictionary);
      this.distributeEvents(pastEvents);


    } else if (this.marType === 'report') {
      const reportStartDate = moment(this.sdate).subtract(1,'d');
      reportStartDate.set({'hour':23,'minute': 59,'second':59})
      const reportEndDate = moment(this.edate);
      reportEndDate.set({'hour':23,'minute': 59,'second':59})
      this.timeerHelper.createEvents(reportStartDate, reportEndDate, true);
      this.appService.reportData = this.appService.reportData.filter(function( element ) {
        return element !== undefined;
      });
      const rangeEvents = this.appService.reportData.filter(e => {
        return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") && !e.content.includes("Administer_PRN")
        && !e.dose_id.includes("infusionevent") && (moment(e.eventStart).isSameOrAfter(this.sdate, 'day') && moment(e.eventStart).isSameOrBefore(this.edate, 'day'))
      });
      // const rangeEvents = this.appService.reportData.filter(obj => {
      //   return moment(obj.eventStart).isSame(this.sdate, 'day') || moment(obj.eventStart).isSame(this.edate, 'day')
      //     || (moment(obj.eventStart).isAfter(this.sdate, 'day') && moment(obj.eventStart).isBefore(this.edate, 'day'))
      // });
      this.distributeEvents(rangeEvents);

    } else {
      var todayDate = moment().add(-1,'d');
      this.timeerHelper.createEvents(todayDate, moment(), true);
      this.appService.reportData = this.appService.reportData.filter(function( element ) {
        return element !== undefined;
      });
      const todayEvents = this.appService.reportData.filter(e => {
        return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") && !e.content.includes('Administer_PRN')
          && moment().isSame(e.eventStart, 'day')
      });
      // const todayEvents = this.appService.events.filter(e => {
      //   return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") 
      //   && moment().isSame(e.eventStart, 'day')
      // });
      // const todayEvents = this.appService.events.filter(obj => {
      //   return moment().isSame(obj.eventStart, 'day');
      // });
      this.distributeEvents(todayEvents);
    }

  }

  getPrescriptionStatus(pres: Prescription | { prescriptionstatus_id: string }) {
    var status = this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id);
    if (status)
      return this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id).status;
    else
      return "active";
  }

  ngAfterViewInit() {
    this.updateHeights.forEach(h => {
      // const filteredDivHeight = this.divs.filter((el, ind) => ind === h[0])[0].nativeElement.offsetHeight;
      // const filterPresHeight = this.presDescriptionDivs.filter((el, ind) => ind === h[0])[0].nativeElement.offsetHeight;
      // let extraRowsHeight;
      // let presDivHeight;
      // const filteredDivHeight = this.divs.filter((el, ind) => ind === h[0])[0].nativeElement.offsetHeight;
      let extraRowsHeight;
      let presDivHeight;
      if (h[1] > 5) {
        extraRowsHeight = (h[1] * 15);
        presDivHeight = (h[1] + 6) * 15;
      } else {
        extraRowsHeight = h[1] * 30;
        presDivHeight = (h[1] + 6) * 30
      }

      // const extraHeightAdded = (filteredDivHeight + extraRowsHeight);
      // this.renderer.setStyle(this.divs.filter((el, i) => i === h[0])[0].nativeElement, "height", extraHeightAdded + 'px');
      // this.renderer.setStyle(this.presDescriptionDivs.filter((el, i) => i === h[0])[0].nativeElement, "height", presDivHeight + 30 + 'px');
    })
    let occupied = 800;
    let pageNumber = 0;
    if (this.marType === 'active' || this.marType === 'empty') {
      this.divs.forEach((div, index) => {
        let filteredDiv;
        if (index > 0) {
          filteredDiv = this.divs.filter((el, i) => i === index - 1)[0].nativeElement;
        }
        // console.log('Div' + pageNumber + ' ' + filteredDiv);
        // console.log('Div' + pageNumber + ' ' + div.nativeElement.offsetHeight);
        if (filteredDiv && (occupied - div.nativeElement.offsetHeight < 0 || (index > 0 && filteredDiv.offsetHeight > 260))) {

          const height = filteredDiv.offsetHeight + occupied;
          // this.renderer.setStyle(filteredDiv, "height", height + 'px');
          const pageHeaderDiv = this.pageHeaders.filter((el, ind1) => ind1 === index)[0].nativeElement;
          // this.renderer.setStyle(pageHeaderDiv, 'visibility', 'visible');
          const pageFooterDiv = this.pageFooter.filter((el, ind1) => ind1 === index - 1)[0].nativeElement;
          const span = this.renderer.createElement('span');

          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);

          this.renderer.setAttribute(span, 'id', `partOnePage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
          // this.renderer.setStyle(pageFooterDiv, 'visibility', 'hidden');
          const xHeight = !pageNumber ? (height - 280) : (height - 100);
          // this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + 'px');
          occupied = 800;
          pageNumber += 1;
        }

        // this.renderer.setStyle(div.nativeElement, "margin-top", "10px");
        occupied -= 10;
        occupied -= div.nativeElement.offsetHeight;
        if (index === this.divs.length - 1) {
          const filteredDiv = this.divs.filter((el, i) => i === index)[0].nativeElement;
          const height = filteredDiv.offsetHeight + occupied;
          // this.renderer.setStyle(filteredDiv, "height", height + 'px');
        }
      });
      {
        let lastIndex = this.divs.length - 1;
        if(this.pageFooter.filter((el, ind1) => ind1 === lastIndex).length > 0)
        {
          const pageFooterDiv = this.pageFooter.filter((el, ind1) => ind1 === lastIndex)[0].nativeElement;
          const span = this.renderer.createElement('span');
          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);
          this.renderer.setAttribute(span, 'id', `partOnePage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
        }
        // this.renderer.setStyle(pageFooterDiv, 'visibility', 'hidden');
        let xHeight = 210;
        if (occupied > 200) {
          xHeight = 480;
        }
        // this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + 'px');
        occupied = 595;
        pageNumber += 1;
      }
      let currTime = moment(moment()).format('HH:mm');
      for (let l = 0; l < pageNumber; l++) {

        const el = document.getElementById(`partOnePage${l + 1}`);
        // el.textContent = `Page ${l + 1} of ${pageNumber}   Time: ${currTime}`;
      }
      if (this.headerDiv && occupied - this.headerDiv.nativeElement.offsetHeight < 0) {
        const filteredDiv = this.divs.filter((el, i) => i === this.divs.length - 1)[0].nativeElement.offsetHeight;
        const height = filteredDiv + occupied;
        // this.renderer.setStyle(this.divs.filter((el, i) => i === this.divs.length - 1)[0].nativeElement, "height", height + 'px');
        occupied = 595;
      }
    }
    if (this.marType !== 'empty') {
      this.renderer.setStyle(this.headerDiv.nativeElement, "margin-top", "10px");
      occupied -= 10;
      occupied -= this.headerDiv.nativeElement.offsetHeight;
      pageNumber = 0;


      // let pageHeight = 595;      

      // this.divs.forEach((div, index) => {
      //   if (index > 0 && (pageHeight - div.nativeElement.offsetHeight < 60 || (pageHeight < 200))) {
      //     const filteredDiv = this.divs.filter((el, i) => i === index - 1)[0].nativeElement.offsetHeight;
      //     const height = filteredDiv + pageHeight;
      //     this.renderer.setStyle(this.divs.filter((el, i) => i === index - 1)[0].nativeElement, "height", height + 'px');
      //     const pageHeaderDiv = this.headerSecondPart.filter((el, ind1) => ind1 === index)[0].nativeElement;
      //     this.renderer.setStyle(pageHeaderDiv, 'display', 'block');
      //     const pageFooterDiv = this.pageFooter2.filter((el, ind1) => ind1 === index - 1)[0].nativeElement;
      //     const span = this.renderer.createElement('span');
      //     const text = this.renderer.createText(`Page ${pageNumber + 1}`);
      //     this.renderer.appendChild(span, text);
      //     this.renderer.setAttribute(span, 'id', `partTwoPage${pageNumber + 1}`);
      //     this.renderer.appendChild(pageFooterDiv, span);
      //     this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
      //     let xHeight = (height - 200);
      //     if (xHeight > 80) {
      //       xHeight = 45;
      //     }
      //     if (this.marType === 'report' || this.marType === 'current') {
      //       this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + pageHeight - 100 + 'px');
      //     } else {
      //       this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + pageHeight - 60 + 'px');
      //     }

      //     pageHeight = 595;
      //     pageNumber += 1;
      //   }

      //   this.renderer.setStyle(div.nativeElement, "margin-top", "10px");
      //   pageHeight -= 10;
      //   pageHeight -= div.nativeElement.offsetHeight;
      // });


      this.divs2.forEach((div, index) => {
        if (index > 0 && (occupied - div.nativeElement.offsetHeight < 60 || (occupied < 200))) {
          const filteredDiv = this.divs2.filter((el, i) => i === index - 1)[0].nativeElement.offsetHeight;
          const height = filteredDiv + occupied;
          // console.log('filteredDiv',filteredDiv)
          // console.log('height',height)
          // this.renderer.setStyle(this.divs2.filter((el, i) => i === index - 1)[0].nativeElement, "height", (height - 100) + 'px');
          const pageHeaderDiv = this.headerSecondPart.filter((el, ind1) => ind1 === index)[0].nativeElement;
          this.renderer.setStyle(pageHeaderDiv, 'display', 'block');
          const pageFooterDiv = this.pageFooter2.filter((el, ind1) => ind1 === index - 1)[0].nativeElement;
          const span = this.renderer.createElement('span');
          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);
          this.renderer.setAttribute(span, 'id', `partTwoPage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
          this.renderer.setStyle(pageFooterDiv, 'visibility', 'hidden');
          let xHeight = (height - 200);
          if (xHeight > 80) {
            xHeight = 45;
          }
          if (this.marType === 'report' || this.marType === 'current') {
            // this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + occupied - 100 + 'px');
          } else {
            // this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + occupied - 60 + 'px');
          }

          occupied = 555;
          pageNumber += 1;
        }

        this.renderer.setStyle(div.nativeElement, "margin-top", "10px");
        occupied -= 10;
        occupied -= div.nativeElement.offsetHeight;

      });
      {
        let lastIndex = this.divs2.length - 1;
        if(this.divs2.filter((el, i) => i === lastIndex).length > 0)
        {
          const filteredDiv = this.divs2.filter((el, i) => i === lastIndex)[0].nativeElement.offsetHeight;
          const height = filteredDiv + occupied;
          let xHeight = (height - 300);
        }
        if(this.pageFooter2.filter((el, ind1) => ind1 === lastIndex).length > 0)
        { 
          const pageFooterDiv = this.pageFooter2.filter((el, ind1) => ind1 === lastIndex)[0].nativeElement;
          const span = this.renderer.createElement('span');
          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);
          this.renderer.setStyle(span, 'color', 'white');
          this.renderer.setAttribute(span, 'id', `partTwoPage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
          this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
          
          this.renderer.setStyle(pageFooterDiv, 'margin-top',0 + 'px');
        }
       
       
        occupied = 565;
        pageNumber += 1;
      }
      // let currTime = moment(moment()).format('HH:mm');
      // for (let l = 0; l < pageNumber; l++) {
      //   const el = document.getElementById(`partTwoPage${l + 1}`);
      //   el.textContent = `Page ${l + 1} of ${pageNumber}  Time: ${currTime}`;
      // }
    }
  }


  distributeEvents(events: Array<any>) {
    this.prescriptionMappingForTemplate = {};
    events=events.filter(x=> !x.dose_id.includes("infusionevent"))
    events.forEach(obj => {
     
      const status = this.getPrescriptionStatus(this.prescriptionMapping[obj.prescription_id]);
      this.prescriptionMappingForTemplate[obj.prescription_id] ? '' : this.prescriptionMappingForTemplate[obj.prescription_id] = { status };
      this.prescriptionMappingForTemplate[obj.prescription_id]['name'] = this.prescriptionMapping[obj.prescription_id].__medications[0].name;
      this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'] ? '' : this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'] = [];
      const updatedObj = this.checkMedicationAdministered(obj);
      let administration = this.medicationAdministration.find(x => x.logicalid == updatedObj.dose_id);
      if (administration && !administration.isenterinerror) {
        let administrationStatus = administration.adminstrationstatus;
        if (administrationStatus == AdministrationStatus.selfadminister)
          if(this.prescriptionMapping[obj.prescription_id].infusiontype_id == "rate")
          {
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'STARTED' });
          }
          else{
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'SELF ' + ' - ' + 'ADMINISTERED' });
          }
        else if (administrationStatus == AdministrationStatus.notgiven)
          if(this.prescriptionMapping[obj.prescription_id].infusiontype_id == "rate")
          {
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'STARTED' });
          }
          else{
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'NOT GIVEN' });
          }
        else if (administrationStatus == AdministrationStatus.defer)
          if(this.prescriptionMapping[obj.prescription_id].infusiontype_id == "rate")
          {
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'STARTED' });
          }
          else{
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'DEFERRED' });
          }
        else {
          if(this.prescriptionMapping[obj.prescription_id].infusiontype_id == "rate")
          {
            if(updatedObj.content.includes('BolusAdministrationCompleted'))
            {
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'GIVEN' });
            }
            else{
              this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'STARTED' });
            }
          }
          else {
            this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'GIVEN' });
          }
          
        }
      } else {
        if(updatedObj.content.includes('InfusionCompleted'))
        {
          this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'COMPLETED' })
        }
        else {
          if(moment() > updatedObj.eventStart)
          {
            if(updatedObj.doctorsorder || updatedObj.titration)
            {
              if(updatedObj.content.includes('Administration_requires_doctors_confirmation_Late'))
              {
                let ptcTime = updatedObj.time.split('-');
                this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: ptcTime[0], stat: 'PTC' })
              }
              else if(updatedObj.content.includes('Late_Administration'))
              {
                this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'MISSED' })
              }
            }
            else {
              if(this.prescriptionMapping[obj.prescription_id].infusiontype_id == "rate" && updatedObj.dose_id.includes("end_")){
                
                let originalDoseStartTime = this.appService.Prescription.find(x => x.prescription_id == updatedObj.prescription_id).__posology.find(y => y.posology_id == updatedObj.posology_id).__dose.find(z => z.dose_id == updatedObj.dose_id.split("_")[2]).dosestartdatetime;
                let originalDoseEndTime = this.appService.Prescription.find(x => x.prescription_id == updatedObj.prescription_id).__posology.find(y => y.posology_id == updatedObj.posology_id).__dose.find(z => z.dose_id == updatedObj.dose_id.split("_")[2]).doseenddatatime;
                
                var a = moment(originalDoseEndTime);//now
                var b = moment(originalDoseStartTime);
                var convertToMinites = a.diff(b, 'minutes');

                let startDate = moment(updatedObj.eventStart).subtract(convertToMinites, "minutes");

                let starsubstring= 'start_'+moment(startDate).format('YYYYMMDDHHmm') + "_" + updatedObj.dose_id.split("_")[2].toString();
                
                
                // let startevent=events.filter(x=>x.dose_id.includes(updatedObj.dose_id.split("_")[2]) && x.dose_id.includes(starsubstring))
                // if(startevent){
                //   startevent=this.appService.events.filter(x=>x.dose_id.includes(updatedObj.dose_id.split("_")[2]) && x.dose_id.includes(starsubstring))
                // }
                // let startevent=events.filter(x=>x.dose_id.includes(updatedObj.dose_id.split("_")[2]) && x.dose_id.includes(starsubstring))

                let startadministred = this.medicationAdministration.find(x => x.logicalid == starsubstring)
                if(startadministred){
                  // if(startadministred.adminstrationstatus != 'given') {
                  //   this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: startadministred.adminstrationstatus.toUpperCase() })
                  // }
                  // else {
                    this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'OVERDUE' })
                  // }
                  
                }else{
                  this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'MISSED' })
                }
  
               }
               else{
                if(obj.prn) {
                  if(administration && administration.isenterinerror && this.marType == 'current') {
                    this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: '', time: '', stat: '' })
                  }   
                  else if(administration && administration.isenterinerror && this.marType != 'current') {
                    // this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: '', time: '', stat: '' })
                  } 
                }
                else {
                  if(administration && !administration.isenterinerror) {
                    this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'MISSED' })
                  } 
                  else {
                    this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'MISSED' })
                  } 
                }
               }
            }
          }
          else {
            if(updatedObj.doctorsorder || updatedObj.titration)
            {
              if(updatedObj.content.includes('Administration_requires_doctors_confirmation_Planned') || updatedObj.content.includes('Administration_requires_doctors_confirmation_Due'))
              {
                let ptcTime = updatedObj.time.split('-');
                this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: ptcTime[0], stat: 'PTC' })
              }
            }
            else {
              this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'PLANNED' })
            }
            
          }
          
        }
        
      }

      // if (updatedObj.content.includes("Administration_Completed") || updatedObj.given) {
      //   let administrationStatus = this.appService.Medicationadministration.find(x => x.logicalid == updatedObj.dose_id).adminstrationstatus;
      //   if(administrationStatus == 'self-administer')
      //     this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'SELF ' + ' - ' + 'ADMINISTERED' });
      //   else
      //     this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'GIVEN' });
      // } else if (updatedObj.content.includes("Administration_Defered")) {
      //   this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'DEFERRED' });
      // } else if (updatedObj.content.includes("Planned_Administration")) {
      //   this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'PLANNED' });
      // } else if (updatedObj.content.includes("Late_Administration")) {
      //   this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'NOT GIVEN' });
      // } else {
      //   this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'PLANNED' })
      // }
    });
    for (let key in this.prescriptionMappingForTemplate) {
      this.prescriptionMappingForTemplate[key]['prescription_information'].sort(function (a, b) {
        const bDate = b.date?.split('-').reverse().join('-');
        const aDate = a.date?.split('-').reverse().join('-');
        return bDate.localeCompare(aDate) || b.time.localeCompare(a.time);
      });
      // if (this.prescriptionMappingForTemplate[key]['prescription_information'].length > 16) {
      //   const noOfArrays = Math.ceil(this.prescriptionMappingForTemplate[key]['prescription_information'].length / 16);
      //   for (let i = 0; i < noOfArrays; i++) {
      //     this.partTwoPrescriptions.push({
      //       ...this.prescriptionMappingForTemplate[key],
      //       'prescription_information': this.prescriptionMappingForTemplate[key]['prescription_information'].slice(i * 16, (i + 1) * 16), key
      //     });
      //   }
      // } else {
        this.partTwoPrescriptions.push({ ...this.prescriptionMappingForTemplate[key], key });
      // }

    }
    // console.log(this.prescription);
    console.log('------',this.partTwoPrescriptions);

    // this.partTwoPrescriptions.sort((a, b) => (a.prescription_information.length > b.prescription_information.length) ? 1 : ((b.prescription_information.length > a.prescription_information.length ? -1 : 0)));
    this.partTwoPrescriptions.forEach(presTwo => {
      const requiredHistory = this.appService.prescriptionHistory.filter(presHistory => presHistory.prescription_id === presTwo.key);
      requiredHistory.sort((a, b) => b.lastmodifiedon.localeCompare(a.lastmodifiedon));
      // console.log('requiredHistory', requiredHistory);
      const suspendTimes = [];
      requiredHistory.forEach((reqHistory, index) => {
        let startDate, stopDate;
        if (reqHistory.history_status === 'suspended') {
          startDate = reqHistory.lastmodifiedon;
          if (requiredHistory[index + 1]) {
            stopDate = requiredHistory[index + 1].lastmodifiedon;
          }
          suspendTimes.push({ startDate, stopDate });

        }
      });
      if (suspendTimes.length) {
        // console.log('length', suspendTimes);
      }
      presTwo['prescription_information'].forEach((dose, newIndex) => {
        let doseDate = dose.date?.split('-').reverse().join('-') + 'T' + dose.time?.split(' ')[0];
        let count = 0;
        let firstIndexChange = 0;
        let suspendTimeToShow;
        suspendTimes.forEach(sTime => {
          let check1 = moment(doseDate).isAfter(sTime.startDate);
          let check2 = moment(doseDate).isBefore(sTime.stopDate);
          if (check1 && check2) {
            count = 1
            if (!firstIndexChange) {
              firstIndexChange = newIndex;
              suspendTimeToShow = sTime.startDate;
            }
          }
        });
        if (count) {
          const [date, time] = suspendTimeToShow?.split('T');
          if (newIndex > 0 && presTwo['prescription_information'][newIndex - 1] && presTwo['prescription_information'][newIndex - 1].stat !== 'SUSPENDED') {
            presTwo['prescription_information'][newIndex] = { date: date?.split('-').reverse().join('-'), time: time.slice(0, 5), stat: 'SUSPENDED' };
          } else {
            presTwo['prescription_information'][newIndex] = null;
          }

        }
      });
      if (requiredHistory.length && requiredHistory[requiredHistory.length - 1].history_status === 'stopped') {
        const [date, time] = requiredHistory[requiredHistory.length - 1].lastmodifiedon?.split('T');
        presTwo['prescription_information'].push({ date: date?.split('-').reverse().join('-'), time: time.slice(0, 5), stat: 'STOPPED' });
      }
      presTwo['prescription_information'] = presTwo['prescription_information'].filter(pres => pres != null);

    });

    this.partTwoPrescriptions.forEach(data => {
      let pres = this.prescriptionMapping[data.key];
      let increaseInHeight = 0;
      let nameCharacters = 0;
      let commentChars = 0;
      // pres.__medications.forEach(meds => {
      //   nameCharacters += (meds.name ? meds.name.length : 0) + (meds.__ingredients.length ? meds.__ingredients[0].name.length : 0) + 2;
      // });
      // commentChars += pres.comments ? pres.comments.length : 0;
      // nameCharacters -= 100;
      // commentChars -= 100;
      // if (nameCharacters > 0) {
      //   increaseInHeight += Math.ceil(nameCharacters / 50) * 25;
      // }
      // if (commentChars > 0) {
      //   increaseInHeight += Math.ceil(commentChars / 50) * 25;
      // }
      this.partTwoHeights.push(240 + increaseInHeight + 'px');
    })


  }

  returnUpdatedHeight(data: any) {

  }

  checkMedicationAdministered(obj: any) {
    // console.log('hs pres', this.hs.prescriptionDictionary);
    const doseId = obj.dose_id?.split('_')[1];
    // const ma = this.appService.Medicationadministration.filter(ma => {
    //   let date = obj.eventStart.format('DD-MM-YYYY');
    //   let time = obj.eventStart.format('HH:mm');
    //   if (!ma.planneddatetime) {
    //     return false;
    //   }
    //   let [maDate, maTime] = ma.planneddatetime?.split('T');
    //   maDate = maDate?.split('-').reverse().join('-');
    //   maTime = maTime.slice(0, 5);
    //   return doseId === ma.dose_id && date === maDate;
    // });
    const ma = this.medicationAdministration.filter(ma => ma.logicalid == doseId);
    const newObj = { ...obj };
    let dose;
    if (ma.length) {
      // let dose;
      if (ma[0].administreddosesize) {
        dose = ma[0].administreddosesize + ' ' + ma[0].administreddoseunit;
      } else if (ma[0].administeredstrengthdenominator) {
        dose = ma[0].administeredstrengthdenominator + ' ' + ma[0].administeredstrengthdenominatorunits
      }

      const [date, time] = ma[0].administrationstartime?.split('T');
      newObj.date = date?.split('-').reverse().join("-");
      newObj.time = time.slice(0, 5) + ' - ' + dose;
      newObj.sort = newObj.date + newObj.time;
      newObj.given = true;
    } else {
      newObj.date = obj.eventStart.format('DD-MM-YYYY');
      dose = this.getDose(obj);

      newObj.time = obj.eventStart.format('HH:mm') + ((dose != undefined || dose != null || dose != ' ')?' - ' : '') + dose;
    }

    return newObj;


  }

  getDose(obj: any) {
    const posology = this.appService.Prescription.find(pres => pres.prescription_id == obj.prescription_id).__posology.find(poso => poso.posology_id == obj.posology_id);
    // const posology = this.appService.GetCurrentPosology(this.appService.Prescription.filter(pres => pres.prescription_id === obj.prescription_id)[0]);
    let dose;
    dose = posology.__dose.filter(dose => dose.dose_id === obj.dose_id?.split('_')[obj.dose_id.split('_').length - 1])[0];

    let admininsteredDose = this.medicationAdministration.find( x => x.logicalid == obj.dose_id);
    if(admininsteredDose)
    {
      if(obj.isinfusion)
      {
        if(admininsteredDose.administredinfusionrate != 0 && admininsteredDose.administredinfusionrate != null)
        {
          return admininsteredDose.administredinfusionrate + ' ' + ((posology.infusiondoserateunits == undefined || posology.infusiondoserateunits == null) ? 'ml/h' : posology.infusionrateunits);
        }
        else if(admininsteredDose.administeredstrengthneumerator)
        {
          return admininsteredDose.administeredstrengthneumerator + ' ' + admininsteredDose.administeredstrengthneumeratorunits + '/' + admininsteredDose.administeredstrengthdenominator + ' ' + admininsteredDose.administeredstrengthdenominatorunits;
        }
        else {
          return admininsteredDose.administreddosesize + ' ' + admininsteredDose.administreddoseunit + '/' + 'hr';
        }
      }
      else{
        if(admininsteredDose.administreddosesize)
        {
          return admininsteredDose.administreddosesize + ' ' + admininsteredDose.administreddoseunit;
        }
        else if (admininsteredDose.administeredstrengthneumerator)
        {
          return admininsteredDose.administeredstrengthneumerator + admininsteredDose.administeredstrengthneumeratorunits +  '/' + admininsteredDose.administeredstrengthdenominator  +  admininsteredDose.administeredstrengthdenominatorunits;
        }
        else if(admininsteredDose.administereddescriptivedose)
        {
          return admininsteredDose.administereddescriptivedose;
        }
      }
    }
    
    if (!obj.isinfusion && dose) {
      let doseUnit;
      if (dose.doseunit === 'capsule') {
        doseUnit = 'caps';
      } else if (dose.doseunit === 'microgram') {
        doseUnit = 'mcg';
      } else if (dose.doseunit === 'suppository') {
        doseUnit = 'supp';
      } else {
        doseUnit = dose.doseunit;
      }
      if(dose.descriptivedose)
      {
        return dose.descriptivedose;
      }
      else if(posology.dosetype == 'strength')
      {
        return dose.strengthneumerator + ' ' + dose.strengthneumeratorunit + ' / ' + dose.strengthdenominator + ' ' + dose.strengthdenominatorunit;
      }
      else if(posology.titration)
      {
        let groupTitrationData = this.appService.DoseEvents.find(x => x.posology_id == obj.posology_id && x.grouptitration == true)
        let titrationData = this.appService.DoseEvents.filter(x => x.logicalid == obj.dose_id && x.eventtype == 'titration');
        if(titrationData.length > 0)
        {
          return titrationData[0].titrateddosesize + ' ' + titrationData[0].titrateddoseunit;
        }
        if(groupTitrationData)
        {
          return groupTitrationData.titrateddosesize + ' ' + groupTitrationData.titrateddoseunit;
        }
      }
      else{
        return dose.dosesize + ' ' + doseUnit;
      }
    } else if ((posology.infusiontypeid === 'ci' || posology.infusiontypeid === InfusionType.pca) && posology) {
      let infusiondose = this.medicationAdministration.find(x=>x.logicalid == obj.dose_id);
      if(infusiondose) {
        return (infusiondose.administredinfusionrate !== null) ? infusiondose.administredinfusionrate : (infusiondose.administreddosesize !== null) ? infusiondose.administreddosesize : '' + ' ' + posology.infusionrateunits;
      } else {
      return posology.infusionrate + ' ' + posology.infusionrateunits;
      }



    } else if (posology.infusiontypeid === 'bolus' && dose) {
      if(posology.dosetype == 'strength')
      {
        return dose.strengthneumerator + ' ' + dose.strengthneumeratorunit + ' / ' + dose.strengthdenominator + ' ' + dose.strengthdenominatorunit;
      }  
      else {
        return dose.dosesize + ' ' + dose.doseunit + ' / ' + 'hr';
      }
    } else if (posology.infusiontypeid === 'rate' && dose) {
      return dose.infusionrate + ' ' + ((posology.infusionrateunits == undefined || posology.infusionrateunits == null) ? 'ml' : posology.infusionrateunits);
    }
    else{
      return ' ';
    }
  }

  ngOnDestroy() {

  }

  getStatus(value: string) {
    if (value === 'active') {
      return 'Active';
    } else if (value === 'suspended') {
      return 'Suspended';
    } else if (value === 'stopped' || value === 'cancelled') {
      return 'Stopped';
    } else {
      return 'Active';
    }
  }



  arrayForTemplate(pres: Prescription, index: number) {
    if (pres) {
      let extraInfoRows = 0;
      // let nameCharacters = 0;
      // let commentChars = 0;
      // pres.__medications.forEach(meds => {
      //   nameCharacters += (meds.name ? meds.name.length : 0) + (meds.__ingredients.length ? meds.__ingredients[0].name.length : 0) + 2;
      // });
      // commentChars += pres.comments ? pres.comments.length : 0;
      // nameCharacters -= 110;
      // commentChars -= 110;
      // if (nameCharacters > 0) {
      //   extraInfoRows += Math.ceil(nameCharacters / 55);
      // }
      // if (commentChars > 0) {
      //   extraInfoRows += Math.ceil(commentChars / 55);
      // }
      // if (extraInfoRows > 10) {
      //   extraInfoRows = 10;
      // }
      let protocolCount 
      if(pres.infusiontype_id == "rate")
      {
       //the previous code here is move to oninit
        const rateRowsLength = this.rateEventsdata.filter(e => {
          return  pres.prescription_id == e.prescription_id
        });

        protocolCount = Math.floor((rateRowsLength.length / this.repeatArray.length));
      }
      else {
        protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].frequency == 'protocol' ? this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount : this.hs.prescriptionDictionary[pres.prescription_id].length;
      }
      
      if (!protocolCount) {
        protocolCount = 6;
      }
      const templateArray = Array((protocolCount != undefined? protocolCount: 1)).fill(4);
      if (templateArray.length > 6) {
        const extraRows = 0;
        let extraTransferRows = this.checkTodayTransfer(pres);
        if (extraTransferRows < 0) {
          extraTransferRows = 0;
        }
        for (let k = 0; k < extraTransferRows; k++) {
          templateArray.push(4);
        }
        for (let k = 0; k < extraInfoRows; k++) {
          templateArray.push(4);
        }
        let count = 0;
        this.updateHeights.forEach(upHeight => {
          if (upHeight[0] === index) {
            count = 1;
          }
        });
        let finalRows = 0;
        if ((extraTransferRows + extraRows + extraInfoRows) >= 6) {
          finalRows = 22;
          for (let k = 0; k < (22 - extraTransferRows + extraRows + extraInfoRows); k++) {
            templateArray.push(4);
          }
        }
        if (!count) {
          this.updateHeights.push([index, finalRows ? finalRows : (extraRows + extraTransferRows + extraInfoRows)]);
        } else {
          this.updateHeights.push([index, extraInfoRows]);
        }

        return templateArray;
      } else {
        let finalRows = 0;
        let extraTransferRows = this.checkTodayTransfer(pres);
        if ((protocolCount) - extraTransferRows < 0) {
          for (let k = 0; k < extraTransferRows - (protocolCount); k++) {
            templateArray.push(4);
          }

          if (extraTransferRows + extraInfoRows - (protocolCount) >= 6) {
            finalRows = 22;
            for (let k = 0; k < (22 - extraTransferRows + extraInfoRows - (protocolCount)); k++) {
              templateArray.push(4);
            }
          }
          this.updateHeights.push([index, finalRows ? finalRows : extraTransferRows + extraInfoRows - (protocolCount)]);
        } else {
          if (extraInfoRows >= 6) {
            finalRows = 22;
            // finalRows = 6;
          }
          this.updateHeights.push([index, finalRows ? finalRows : extraInfoRows]);
        }
        // if (!extraInfoRows) {
          let tempArray = [];
          for (let k = 0; k < protocolCount; k++) {
            tempArray.push(4);
          }
          return tempArray;
          // return this.repeatArray2;
        // } else {
        //   let newArr = []
        //   extraInfoRows = finalRows ? finalRows : extraInfoRows;
        //   for (let k = 0; k < 6; k++) {
        //     newArr.push(4);
        //   }
        //   return newArr;
        // }

      }
    } else {
      return this.repeatArray2;
    }
  }






  pdfDownloaded() {
    this.destroyTemplate.emit('true');
  }

  shortenUnitName(unit: string) {
    if (unit === 'microgram') {
      return 'mcg'
    } else if (unit === 'suppository') {
      return 'supp'
    } else {
      return unit;
    }
  }

  protocolGetDay() {
    for (let key in this.hs.prescriptionDictionary) {
      if (this.hs.prescriptionDictionary[key][0].frequency === 'protocol') {
        const protocolPres = this.prescriptionMapping[key];
        const daysPassedSinceStartingProtocol = moment(this.appService.GetCurrentPosology(protocolPres).prescriptionstartdate);
        const currentDate = moment();
        const diffDays = currentDate.diff(daysPassedSinceStartingProtocol, 'days');
        this.getProtocolRemaining(diffDays, protocolPres);
      }
    }
  }

  getProtocolRemaining(diffDays: number, pres: Prescription) {
    const protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount;
    let remainingDoses;
    let prespos = this.appService.GetCurrentPosology(pres);
    if (prespos.__dose[diffDays * protocolCount]) {
      remainingDoses = prespos.__dose.slice(diffDays * protocolCount);
      // this.adjustForFourDays(remainingDoses, protocolCount);
      if (prespos.repeatlastday && ((remainingDoses.length / protocolCount) < 3)) {
        const toAddPrescription = 3 - (remainingDoses.length / protocolCount);
        const lastDayDose = prespos.__dose.slice(-1 * protocolCount);
        remainingDoses = this.addLastDay(remainingDoses, toAddPrescription, lastDayDose);
      } else if (prespos.repeatprotocoltimes && ((remainingDoses.length / protocolCount) < 3)) {
        remainingDoses = remainingDoses.concat(prespos.__dose.slice());
      }

    } else if (prespos.repeatlastday) {
      remainingDoses = prespos.__dose.slice(-1 * protocolCount);
      const toAddPrescription = 3 - (remainingDoses.length / protocolCount);
      if (toAddPrescription > 0) {
        remainingDoses = this.addLastDay(remainingDoses, toAddPrescription, remainingDoses);
      }
    } else if (prespos.repeatprotocoltimes) {
      const x = (diffDays) % this.hs.prescriptionDictionary[pres.prescription_id][0].protocolDays;
      remainingDoses = prespos.__dose.slice(Math.floor(x * protocolCount));
      remainingDoses = remainingDoses.concat(prespos.__dose.slice());
    }
    this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"] = remainingDoses;
  }


  addLastDay(remainingDoses: Array<any>, toAddPrescription: number, lastDayDose: Array<any>) {
    for (let i = 0; i < toAddPrescription; i++) {
      remainingDoses = remainingDoses.concat(lastDayDose);
    }
    return remainingDoses;

  }

  returnTimeFromObject(date: string) {
    return date?.split('T')[1].slice(0, 5);
  }

  returnProtocolDose(i: number, j: number, pres: Prescription, currDate: Date = new Date()) {
    let month = currDate.getMonth() + 1;
    let addDay = currDate.getDate();
    if (addDay < 10) {
      addDay = <any>('0' + addDay);
    }
    if (month < 10) {
      month = <any>('0' + month);
    }
    const date = currDate.getFullYear() + '-' + month + '-' + addDay;
    const protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount - 1;
    if (protocolCount >= i) {
      let checkTransfer;
      if (this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"] && this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i]) {
        checkTransfer = this.checkTransfer(pres, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dose_id,
          currDate, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosestartdatetime?.split('T')[1].slice(0, 5));
      }
      let administeredEvents = [];
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        administeredEvents = this.medicationAdministration.filter(ma => {
          return ma.dose_id === this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
        });
      }
      if (administeredEvents.length && administeredEvents[0].administrationstartime?.split('T')[0] === date) {
        if (administeredEvents[0].administreddosesize) {
          return administeredEvents[0].administreddosesize + ' ' + administeredEvents[0].administreddoseunit;
        } else if (administeredEvents[0].administredinfusionrate) {
          return administeredEvents[0].administredinfusionrate + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
        } else if (administeredEvents[0].administeredstrengthdenominator) {
          return administeredEvents[0].administeredstrengthdenominator + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
        };


      }

      if (checkTransfer) {
        if(this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosesize == null)
        {
          return '';
        }
          return this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosesize + ' ' + this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][i + j].doseunit;
      }
      return '';

    }
    return '';
  }
  createMultiArray(i) {
    const array = new Array(i);
    for (let j = 0; j < array.length; j++) {
      array[j] = new Array(i)
    }
    return array;
  }

  returnProtocolAdministartionStatus(pres: Prescription, i: number, j: number, currDate)
  {
    let month = currDate.getMonth() + 1;
    let addDay = currDate.getDate();
    if (addDay < 10) {
      addDay = <any>('0' + addDay);
    }
    if (month < 10) {
      month = <any>('0' + month);
    }
    const date = currDate.getFullYear() + '-' + month + '-' + addDay;
    const protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount - 1;
    if (protocolCount >= i) {
      let checkTransfer;
      if (this.hs.prescriptionDictionary[pres.prescription_id] && this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"]
        && this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i]) {
        checkTransfer = this.checkTransfer(pres, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dose_id,
          currDate, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosestartdatetime?.split('T')[1].slice(0, 5));
      }
      let administeredEvents = [];
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        administeredEvents = this.medicationAdministration.filter(ma => {
          return ma.dose_id === this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
        });
      }

      let administrationstatus;
      administeredEvents.forEach((administeredEvent, ind) => {
        if (administeredEvents[ind].administrationstartime.split('T')[0] === date) {
            administrationstatus = [administeredEvents[ind].adminstrationstatus];
        }
      })

      if (administrationstatus) {
        if(this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosesize == null)
        {
          return null;
        }
        return administrationstatus;
      }
      return '';
    }

    return '';
  }


  returnProtocolTime(pres: Prescription, i: number, j: number, currDate) {
    let month = currDate.getMonth() + 1;
    if (month < 10) {
      month = <any>('0' + month);
    }
    let addDay = currDate.getDate();
    if (addDay < 10) {
      addDay = <any>('0' + addDay);
    }
    const date = currDate.getFullYear() + '-' + month + '-' + addDay;
    const protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount - 1;
    if (protocolCount >= i) {
      let checkTransfer;
      if (this.hs.prescriptionDictionary[pres.prescription_id] && this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"]
        && this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i]) {
        checkTransfer = this.checkTransfer(pres, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dose_id,
          currDate, this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosestartdatetime?.split('T')[1].slice(0, 5));
      }
      let administeredEvents = [];
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        administeredEvents = this.medicationAdministration.filter(ma => {
          return ma.dose_id === this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
        });
      }
      if (administeredEvents.length && administeredEvents[0].administrationstartime?.split('T')[0] === date) {
        return administeredEvents[0].administrationstartime?.split('T')[1].slice(0, 5);
      }

      if (checkTransfer === true) {
        return this.hs.prescriptionDictionary[pres.prescription_id][0]["remainingDoses"][((protocolCount + 1) * j) + i].dosestartdatetime?.split('T')[1].slice(0, 5);

      } else if (checkTransfer) {
        // how to get dose?
        return checkTransfer.slice(0, 5);


      }
      return '';
    }

    return '';
  }

  checkTransfer(pres: Prescription, doseId: string, currDate, currTime): any {
    let month = currDate.getMonth() + 1;
    if (month < 10) {
      month = '0' + month;
    }
    let addDay = currDate.getDate();
    if (addDay < 10) {
      addDay = <any>('0' + addDay);
    }
    const date = currDate.getFullYear() + '-' + month + '-' + addDay;
    const doseEvent = this.appService.DoseEvents.filter(doseEvent => {
      let [startDate, startTime] = doseEvent.startdatetime?.split('T');
      startTime = startTime.slice(0, 5);
      // if(pres.infusiontype_id == 'rate') {
      //   this.medicationAdministration.find(x => x.logicalid == doseEvent.logicalid)
      // }
      // else {
        return (doseEvent.dose_id === doseId) && (startDate === date) && (startTime === currTime);
      // }
    });
    if (!doseEvent[0]) {
      return true;
    } else if (doseEvent[0].eventtype === 'Transfer') {
      const [doseDate, doseTime] = doseEvent[0].dosedatetime?.split('T');
      if (date === doseDate) {
        return doseTime;
      } else {
        return false;
      }
    }
    else if (doseEvent[0].eventtype === 'doconfirm') {
      const [doseDate, doseTime] = doseEvent[0].dosedatetime?.split('T');
      if (date === doseDate) {
        return doseTime;
      } else {
        return false;
      }
    }
    else if (doseEvent[0].eventtype === 'titration') {
      const [doseDate, doseTime] = doseEvent[0].titrateduntildatetime?.split('T');
      if (date === doseDate) {
        return doseTime;
      } else {
        return false;
      }
    }
    else if (doseEvent[0].eventtype === 'Undo') {
      const [doseDate, doseTime] = doseEvent[0].dosedatetime?.split('T');
      if (date === doseDate) {
        return doseTime;
      } else {
        return false;
      }
    }
    else if (doseEvent[0].eventtype === 'AdminTransfer' && pres.infusiontype_id == 'rate') {
      const [doseDate, doseTime] = doseEvent[0].startdatetime?.split('T');
      // if (date === doseDate) {
      //   return doseTime;
      // } else {
      //   return false;
      // }
      if (date === doseDate) {
        if(pres.infusiontype_id == 'rate') {
          // let originalDoseStartTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == this.appService.GetCurrentPosology(pres).posology_id).__dose.find(z => z.dose_id == doseEvent[0].dose_id).dosestartdatetime;
          // let originalDoseEndTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == this.appService.GetCurrentPosology(pres).posology_id).__dose.find(z => z.dose_id == doseEvent[0].dose_id).doseenddatatime;
          
          // var a = moment(originalDoseEndTime);//now
          // var b = moment(originalDoseStartTime);
          // var convertToMinites = a.diff(b, 'minutes');

          let splitLogicalId: any = doseEvent[0].logicalid.split('_');
          let date = moment();
          date.set({'year': splitLogicalId[1].substring(0,4),'month': splitLogicalId[1].substring(4,6) - 1,'date': splitLogicalId[1].substring(6,8),'hour':splitLogicalId[1].substring(8,10),'minute': splitLogicalId[1].substring(10,12),'second':0})

          // let startDate = moment(date).subtract(convertToMinites, "minutes");

          let starsubstring= 'end_'+moment(date).format('YYYYMMDDHHmm') + "_" + doseEvent[0].dose_id;

          // let starsubstring='start' + dateFilteredData[i].logicalId.substring(3,12);// append start to _20221228 only date to get start dose 
          // let startevent=dateFilteredData.filter(x=>x.logicalId.includes(dateFilteredData[i].logicalId.split("_")[2]) && x.logicalId.includes(starsubstring))

          // let startadministred = this.medicationAdministration.find(x => x.logicalid == starsubstring)

          // if(startadministred) {
          //   return false;
          // }
          // else {
          //   return doseTime;
          // }

          let checkDose = this.medicationAdministration.find(x => x.logicalid == doseEvent[0].logicalid);
          let checkDoseInfusionEvents = this.appService.InfusionEvents.find(x => x.logicalid == starsubstring);
          if(checkDose || (checkDoseInfusionEvents && checkDoseInfusionEvents.eventtype != 'endinfusion')) {
            return false;
          }
          else {
            return true;
          }
        }
        else {
          return doseTime;
        }
      } else {
        return false;
      }
    }
  }

  sortArray(arr: Array<any>, rows: number, cols: number) {
    for (let n = 0; n < rows; n++) {
      for (let m = 0; m < cols; m++) {
        let k = n;
        while ((arr[k][m] === undefined || arr[k][m] == '' || arr[k][m].time === undefined || arr[k][m].time == '') && k < rows) {
          k += 1
        }
        if (k !== n) {
          arr[n][m] = { ...arr[k][m] };
          arr[k][m] = undefined;
        }

      }
    }
  }


  returnTimeDose(frequency, i: number, j: number, k: number, pres: Prescription, currDate, type = 'time') {
    // console.log('frequency',frequency);
    if (!this.prescriptionProperFlow[pres.prescription_id]) {
      this.prescriptionProperFlow[pres.prescription_id] = this.createMultiArray(30);
      let rows = this.arrayForTemplate(pres, k).length;
      let cols = this.repeatArray.length;
      let count = 0;
      for (let n = 0; n < rows; n++) {
        for (let m = 0; m < cols; m++) {
          let time;
          let dose;
          let administered = false;
          let administrationstatus;
          let flag = false;
          let isPRN = this.appService.GetCurrentPosology(pres).prn;
          if (frequency === 'protocol' || frequency === 'variable') {
            time = this.returnProtocolTime(pres, n, m, this.dates[m]);
            dose = this.returnProtocolDose(n, m, pres, this.dates[m]);
            administrationstatus = this.returnProtocolAdministartionStatus(pres, n, m, this.dates[m]);
            flag = true;
          } else {
            time = this.returnXTime(n, pres, this.dates[m]);
            dose = this.returnXTime(n, pres, this.dates[m], 'dose');
            administrationstatus = this.returnXTime(n, pres, this.dates[m], 'administrationstatus');
            flag = true;
          }
          if (n >= this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount - 1 && frequency !== 'protocol' && !time) {
            let dataObj = this.returnTransferTime(n, pres, m);
            time = dataObj.time;
            dose = dataObj.dose;
            administrationstatus = dataObj.administrationstatus;
            flag = false;
          } else if (n >= this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount && frequency === 'protocol' && !time) {
            let dataObj = this.returnTransferTime(n, pres, m);
            time = dataObj.time;
            dose = dataObj.dose;
            administrationstatus = dataObj.administrationstatus;
            flag = false;
          }

          // if (!time) {
          //   let dataObj = this.returnTransferTime(n, pres, m);
          //   time = dataObj.time;
          //   dose = dataObj.dose;
          // }
          if(flag)
          {
            if (time instanceof Object) {
              dose = time[2];
              administrationstatus = time[1];
              time = time[0];
              administered = true;
            }
            if (administrationstatus instanceof Object) {
              administrationstatus = administrationstatus[0];
              administered = true;
            }
          }
          
          if(isPRN == true && administered == false)
          {
            time = '';
            dose = '';
          }
          this.prescriptionProperFlow[pres.prescription_id][n][m] = { time, dose, administered, isPRN, administrationstatus };
        }
        // this.sortRow(n,cols, pres);
      }
      if (!count) {
        this.presIds.push(pres.prescription_id);
      }
      // this.prescriptionProperFlow[pres.prescription_id].sort(function (a, b) {
      //   if (!a[0]) {
      //     return 1
      //   } else if(!b[0]) {
      //     return -1
      //   }
      //   if (a[0].time === b[0].time) {
      //     return 0;
      //   }
      //   else {
      //     return (a[0].time < b[0].time) ? -1 : 1;
      //   }
      // });
      this.sortArray(this.prescriptionProperFlow[pres.prescription_id], rows, cols);





    }
    if (type === 'time' && this.prescriptionProperFlow[pres.prescription_id][i] && this.prescriptionProperFlow[pres.prescription_id][i][j]) {
      return this.prescriptionProperFlow[pres.prescription_id][i][j].time;
    } else if (type === 'dose' && this.prescriptionProperFlow[pres.prescription_id][i] && this.prescriptionProperFlow[pres.prescription_id][i][j]) {
      return this.prescriptionProperFlow[pres.prescription_id][i][j].dose;
    } else if (this.prescriptionProperFlow[pres.prescription_id][i] && this.prescriptionProperFlow[pres.prescription_id][i][j]) {
      if (!this.prescriptionProperFlow[pres.prescription_id][i][j].administered) {
        const checkTime = moment().format("HH:mm");
        const checkTime2 = this.prescriptionProperFlow[pres.prescription_id][i][j].time;
        if (checkTime2 < checkTime && currDate === this.dates[0]) {
          // return 'N.A';
          if(this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus == null)
          {
            return ''
          }
          else if(this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus)
          {
            return this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus;
          }
          if(pres.infusiontype_id == "rate")
          {
            let dateFilteredData = this.hs.prescriptionDictionary[pres.prescription_id].filter(x => x.date == moment(currDate).format('YYYYMMDD'));
            if(dateFilteredData.length > 0 && dateFilteredData[i] && dateFilteredData[i].logicalId != undefined && dateFilteredData[i].logicalId.includes('end'))
            {
              let originalDoseStartTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == this.appService.GetCurrentPosology(pres).posology_id).__dose.find(z => z.dose_id == dateFilteredData[i].doseId).dosestartdatetime;
              let originalDoseEndTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == this.appService.GetCurrentPosology(pres).posology_id).__dose.find(z => z.dose_id == dateFilteredData[i].doseId).doseenddatatime;
              
              var a = moment(originalDoseEndTime);//now
              var b = moment(originalDoseStartTime);
              var convertToMinites = a.diff(b, 'minutes');

              let splitLogicalId = dateFilteredData[i].logicalId.split('_');
              let date = moment();
              date.set({'year': splitLogicalId[1].substring(0,4),'month': splitLogicalId[1].substring(4,6) - 1,'date': splitLogicalId[1].substring(6,8),'hour':splitLogicalId[1].substring(8,10),'minute': splitLogicalId[1].substring(10,12),'second':0})

              let startDate = moment(date).subtract(convertToMinites, "minutes");

              let starsubstring= 'start_'+moment(startDate).format('YYYYMMDDHHmm') + "_" + dateFilteredData[i].doseId;

              // let starsubstring='start' + dateFilteredData[i].logicalId.substring(3,12);// append start to _20221228 only date to get start dose 
              // let startevent=dateFilteredData.filter(x=>x.logicalId.includes(dateFilteredData[i].logicalId.split("_")[2]) && x.logicalId.includes(starsubstring))

              let startadministred = this.medicationAdministration.find(x => x.logicalid == starsubstring)
              if(startadministred){
                if(dateFilteredData[i].content.includes('InfusionCompleteoverdue')) {
                  return 'overdue' ;
                }
                return 'completed' ;
              }else{
                return 'Missed';
              }
            }
            else {
              return 'Missed';
            }
          }
          else {
            if(this.hs.prescriptionDictionary[pres.prescription_id][i].doctorsorder || this.hs.prescriptionDictionary[pres.prescription_id][i].titration)
            {
              return this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus;
            }
            return 'Missed';
          }
        }
      } else {
        // return 'A';
        if(pres.infusiontype_id == "rate" && this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus == 'given')
        {
          return 'started'
        }
        return this.prescriptionProperFlow[pres.prescription_id][i][j].administrationstatus
      }
    }

  }

  returnXTime(i: number, pres: Prescription, currDate: Date, type = 'time') {
    let checkDate;

    let month = currDate.getMonth() + 1;
    if (month < 10) {
      month = <any>('0' + month);
    }
    let addDay = currDate.getDate();
    if (addDay < 10) {
      addDay = <any>('0' + addDay);
    }
    const date = currDate.getFullYear() + '-' + month + '-' + addDay;
    let currentpos = this.appService.GetCurrentPosology(pres);
    checkDate = moment(currDate.getFullYear() + '-' + (currDate.getMonth() + 1) + '-' + currDate.getDate()).isBefore(this.appService.GetCurrentPosology(pres).prescriptionenddate);
    if (!currentpos.prescriptionenddate) {
      checkDate = true;
    }

    const daysOfWeek = JSON.parse(currentpos.daysofweek);
    if (daysOfWeek.length) {
      const daysNumber = moment(currDate).day();
      if (!daysOfWeek.includes(this.daysOfWeek[daysNumber.toString()])) {
        checkDate = false;
      }
    }

    if (currentpos.dosingdaysfrequency == 'days' || currentpos.dosingdaysfrequency == 'weeks' || currentpos.dosingdaysfrequency == 'months') {
      let time = this.hs.prescriptionDictionary[pres.prescription_id][i].time.split(':')
      let finalLogicalID = moment(currDate).format('YYYYMMDD') + time[0] + time[1] + "_" + this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
      if(pres.infusiontype_id == "rate"){
        finalLogicalID=this.hs.prescriptionDictionary[pres.prescription_id][i].logicalId
      }
      let weekData = this.appService.reportData.filter(x => x.dose_id == finalLogicalID);
      if (weekData.length) {
        checkDate = true;
      }
      else {
        checkDate = false;
      }
    }

    if (pres.isinfusion && (pres.infusiontype_id === 'ci' || pres.infusiontype_id === InfusionType.pca)) {
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        checkDate = moment(currDate.getFullYear() + '-' + (currDate.getMonth() + 1) + '-' + currDate.getDate()).isSame(this.hs.prescriptionDictionary[pres.prescription_id][i].ciDate);
      } else {
        checkDate = false;
      }

    }

    let checkTransfer;
    let administeredEvents = [];
    if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
      administeredEvents = this.medicationAdministration.filter(ma => {
       const logicalDateArrray = ma.logicalid?.split('_');
       let logicalDate;
       if(logicalDateArrray.length == 2)
       {
        logicalDate = logicalDateArrray[0];
       }
       else if(logicalDateArrray.length == 3)
       {
        logicalDate = logicalDateArrray[1];
       }
        const originalDate = logicalDate.slice(0, 4) + '-' + logicalDate.slice(4, 6) + '-' + logicalDate.slice(6, 8);
        if (!ma.planneddatetime) {
          return false;
        }
        if(currentpos.infusiontypeid === "ci")
        {
          return (ma.prescription_id == pres.prescription_id);
        }
        else if(currentpos.prn) {
          return (ma.prescription_id == pres.prescription_id) && (ma.planneddatetime.split('T')[0] == date) && ma.checked == false;
        }
        else {
          return (ma.dose_id === this.hs.prescriptionDictionary[pres.prescription_id][i].doseId) && (ma.planneddatetime.split('T')[0] == originalDate);
        }
        
      });
    }
    let time;
    let dose;
    let administrationstatus;

    if(currentpos.infusiontypeid === "ci" && administeredEvents.length > 0)
    {
      if(administeredEvents.length > 0)
      {
        if(currentpos.prescription_id == administeredEvents[0].prescription_id)
        {
          if (!administeredEvents[0].checked && administeredEvents[0].administrationstartime.split('T')[0] === date) {
            if (type === 'time') {
              time = administeredEvents[0].administrationstartime.split('T')[1].slice(0, 5);
              administrationstatus = administeredEvents[0].adminstrationstatus;
              dose = administeredEvents[0].administredinfusionrate + ' ' + currentpos.infusionrateunits;
            }
          }
        }
      }
      
    }
    else if(currentpos.prn && administeredEvents.length > 0) {
      administeredEvents.reverse();
      if(administeredEvents.length > 0)
      {
        if (administeredEvents[0].administrationstartime.split('T')[0] === date) {
          if (type === 'time' && !administeredEvents[0].isenterinerror) {
            time = administeredEvents[0].administrationstartime.split('T')[1].slice(0, 5);
            administrationstatus = administeredEvents[0].adminstrationstatus;
            dose = administeredEvents[0].administreddosesize + ' ' + administeredEvents[0].administreddoseunit;
            
            // this.medicationAdministration = this.medicationAdministration.filter(x=> x.prescription_id == administeredEvents[0].prescription_id && x.administrationstartime != administeredEvents[0].administrationstartime);
          }
          if (type === 'time') { 
            this.medicationAdministration.forEach((element, index) => {
              if(element.prescription_id == administeredEvents[0].prescription_id && element.administrationstartime == administeredEvents[0].administrationstartime) {
                this.medicationAdministration[index].checked = true;
              }
            });
          } 
   
        }
        else {
          if (type === 'time') { 
            this.medicationAdministration.forEach((element, index) => {
              if(element.prescription_id == administeredEvents[0].prescription_id && element.administrationstartime == administeredEvents[0].administrationstartime) {
                this.medicationAdministration[index].checked = true;
              }
            });
          } 
        }
      }
    }
    else{
      administeredEvents.forEach((administeredEvent, ind) => {
        if(currentpos.prescription_id == administeredEvents[ind].prescription_id)
        {
          if (!administeredEvents[ind].checked && administeredEvents[ind].administrationstartime.split('T')[0] === date) {
            if (type === 'time') {
              time = [administeredEvents[ind].administrationstartime.split('T')[1].slice(0, 5)];
              administrationstatus = [administeredEvents[ind].adminstrationstatus];
              if (administeredEvents[ind].administreddosesize) {
                if(currentpos.infusiontypeid == "rate")
                {
                  dose = [administeredEvents[ind].administredinfusionrate + ' ' + currentpos.infusionrateunits];
                }
                else {
                  dose = [administeredEvents[ind].administreddosesize + ' ' + administeredEvents[ind].administreddoseunit];
                }
                
              } else if(currentpos.doctorsorder && currentpos.dosetype == 'strength') {
                dose = [administeredEvents[ind].administeredstrengthdenominator + ' ' + administeredEvents[ind].administeredstrengthdenominatorunits];
              } else if (administeredEvents[ind].administredinfusionrate != "0") {
                dose = [(administeredEvents[ind].administredinfusionrate != null?administeredEvents[ind].administredinfusionrate:'') + ' ' + (administeredEvents[ind].administeredstrengthdenominatorunits != null?administeredEvents[ind].administeredstrengthdenominatorunits:'')];
              } else if (administeredEvents[ind].administeredstrengthdenominator) {
                dose = [administeredEvents[ind].administeredstrengthdenominator + ' ' + administeredEvents[ind].administeredstrengthdenominatorunits];
              };
    
            } else if (type === 'dose') {
              if (administeredEvents[0].administreddosesize) {
                if(currentpos.infusiontypeid == "rate")
                {
                  dose = [administeredEvents[0].administredinfusionrate + ' ' + currentpos.infusionrateunits];
                }
                else {
                  dose = administeredEvents[0].administreddosesize + ' ' + administeredEvents[0].administreddoseunit;
                }
                
              } else if (currentpos.doctorsorder && currentpos.dosetype == 'strength') {
                dose = administeredEvents[0].administeredstrengthdenominator + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
              } else if (administeredEvents[0].administredinfusionrate != "0") {
                dose = (administeredEvents[0].administredinfusionrate != null?administeredEvents[0].administredinfusionrate:'') + ' ' + (administeredEvents[0].administeredstrengthdenominatorunits != null?administeredEvents[0].administeredstrengthdenominatorunits:'');
              } else if (administeredEvents[0].administeredstrengthdenominator) {
                dose = administeredEvents[0].administeredstrengthdenominator + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
              };
              administeredEvents[ind].checked = true;
            }
            else{
              administrationstatus = administeredEvents[ind].adminstrationstatus
            }
          }
          else if (administeredEvents.length && administeredEvents[0].administrationstartime?.split('T')[0] !== date && administeredEvents[0].planneddatetime?.split('T')[0] === date) {
            time = 'changed';
          }
        }
        
      });
    }
      
    
    if (time === 'changed') {
      return '';
    } else if (time && type === 'time') {
      // return time
      return [time, administrationstatus, dose]
    } else if (time && type === 'dose') {
      return dose;
    } else if (time && type === 'administrationstatus') {
      return administrationstatus;
    }
    else {
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        checkTransfer = this.checkTransfer(pres, this.hs.prescriptionDictionary[pres.prescription_id][i].doseId, currDate, this.hs.prescriptionDictionary[pres.prescription_id][i].time);
      }
      const doseCheck = this.checkShowDose(pres, date);
      if (!doseCheck) {
        return '';
      }

        if (checkTransfer === true && checkDate) {
          let status = this.medicationAdministration.filter(x => x.logicalid == this.hs.prescriptionDictionary[pres.prescription_id][i].logicalId)
          if (pres.infusiontype_id === 'bolus') {
  
            if (type === 'time') {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
            }
            else if (type === 'dose')
            {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose
            }
            return status.length > 0 ? status[0].adminstrationstatus : '';
          } else if (pres.infusiontype_id === 'rate' && !checkTransfer) {
            if (type === 'time') {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
            }
            else if (type === 'dose')
            {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose
            }
            return status.length > 0 ? status[0].adminstrationstatus : '';
          } else if (pres.infusiontype_id === 'ci' || pres.infusiontype_id === InfusionType.pca) {
            if (type === 'time') {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
            }
            else if (type === 'dose')
            {
              return status.length > 0 ? status[0].administredinfusionrate + ' ' +  pres.__posology[i].infusionrateunits : this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose;
            }
            return status.length > 0 ? status[0].adminstrationstatus : '';
          }  
          if (this.hs.prescriptionDictionary[pres.prescription_id][i].dose) {
            if (type === 'time') {
                if(pres.infusiontype_id == "rate")
                {
                  let dateFilteredData = this.hs.prescriptionDictionary[pres.prescription_id].filter(x => x.date == moment(currDate).format('YYYYMMDD'));
                  if(dateFilteredData.length > 0 && dateFilteredData[i] != undefined)
                  {
                    return dateFilteredData[i].time;
                  }
                  
                }
                else {
                    return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
                }
            }
            else if (type === 'dose')
            {
              if(pres.infusiontype_id == "rate")
              {
                let dateFilteredData = this.hs.prescriptionDictionary[pres.prescription_id].filter(x => x.date == moment(currDate).format('YYYYMMDD'));
                if(dateFilteredData.length > 0 && dateFilteredData[i] != undefined)
                {
                  if(dateFilteredData[i].logicalId.includes('end'))
                  {
                    return '';
                  }
                  else {
                    return dateFilteredData[i].dose;
                  }
                }
              }
              else {
                
                if(this.hs.prescriptionDictionary[pres.prescription_id][i].doctorsorder || this.hs.prescriptionDictionary[pres.prescription_id][i].titration)
                {
                  let changeDateFormat = moment(currDate).format('YYYYMMDD');
                  let changeTimeFormat = this.hs.prescriptionDictionary[pres.prescription_id][i].time.split(':');
                  let finalTitrationLogicalID = changeDateFormat + changeTimeFormat[0] + changeTimeFormat[1] + "_" + this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
                  let doctorConfirmData = this.appService.DoseEvents.filter(x => x.logicalid == this.hs.prescriptionDictionary[pres.prescription_id][i].logicalId && x.eventtype == 'doconfirm')
                  let titrationData = this.appService.DoseEvents.filter(x => x.logicalid == finalTitrationLogicalID && x.eventtype == 'titration') 
                  if(doctorConfirmData.length > 0 || titrationData.length > 0)
                  {
                    return 'PTC'
                  }
                  else 
                  {
                    if(doctorConfirmData.length > 0 || titrationData.length > 0)
                    {
                      if(titrationData[0].eventtype == 'titration')
                      {
                        return titrationData[0].titrateddosesize + ' ' + titrationData[0].titrateddoseunit 
                      }
                      else {
                        return this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit);
                      }
                    }
                    else {
                      let groupTitrationData = this.appService.DoseEvents.find(x => x.posology_id == this.hs.prescriptionDictionary[pres.prescription_id][i].posologyId && x.grouptitration == true); 
                      if(groupTitrationData)
                      {
                        let date = moment(currDate).format('YYYY-MM-DD') +' '+ this.hs.prescriptionDictionary[pres.prescription_id][i].time;
                        // let currentTime = moment().format('HH:mm');
                        if(moment(date).isSameOrBefore(moment(groupTitrationData.titrateduntildatetime)))
                        {
                          return groupTitrationData.titrateddosesize + ' ' + groupTitrationData.titrateddoseunit;
                        }
                      }
                      
                      
                      return 'PTC'
                    }
                      
                  }
                }
                else {
                  return this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit);
                }
              }
              
            }
            else if (type === 'administrationstatus')
            {
              if(pres.infusiontype_id == "rate")
              {
                let dateFilteredData = this.hs.prescriptionDictionary[pres.prescription_id].filter(x => x.date == moment(currDate).format('YYYYMMDD'));
                if(dateFilteredData.length > 0 && dateFilteredData[i] != undefined)
                {
                  if(dateFilteredData[i].content.includes('InfusionCompleteddone'))
                  {
                    return 'completed'
                  }
                  else {
                    return dateFilteredData[i].administrationStatus;
                  }
                }
                
              }
              else {
                if(pres.__posology[0].doctorsorder == false && pres.__posology[0].titration == false)
                {
                  return status.length > 0 ? status[0].adminstrationstatus : '';
                }
                else {
                  if(this.hs.prescriptionDictionary[pres.prescription_id][i].doctorsorder || this.hs.prescriptionDictionary[pres.prescription_id][i].titration)
                  {
                    let currentDate = moment().format('YYYY-MM-DD');
                    let currentTime = moment().format('HH:mm');
                    let finalCurrentDate = moment(currDate).format('YYYY-MM-DD') +' '+ currentTime;
                    let finalTitrationDate = moment(this.hs.prescriptionDictionary[pres.prescription_id][i].ciDate).format('YYYY-MM-DD') +' '+ this.hs.prescriptionDictionary[pres.prescription_id][i].time
                    if(moment(finalTitrationDate).isSameOrBefore(finalCurrentDate))
                    {
                      let groupTitrationData = this.appService.DoseEvents.find(x => x.posology_id == this.hs.prescriptionDictionary[pres.prescription_id][i].posologyId && x.grouptitration == true);
                      let changeDateFormat = moment(currDate).format('YYYYMMDD');
                      let changeTimeFormat = this.hs.prescriptionDictionary[pres.prescription_id][i].time.split(':');
                      let finalTitrationLogicalID = changeDateFormat + changeTimeFormat[0] + changeTimeFormat[1] + "_" + this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
                      let doctorConfirmData = this.appService.DoseEvents.filter(x => x.logicalid == this.hs.prescriptionDictionary[pres.prescription_id][i].logicalId && x.eventtype == 'doconfirm')
                      let titrationData = this.appService.DoseEvents.filter(x => x.logicalid == finalTitrationLogicalID  && x.eventtype == 'titration')
                      if(titrationData.length > 0 || doctorConfirmData.length > 0)
                      {
                        return 'Missed';
                      }
                      if(groupTitrationData)
                      {
                        return 'Missed';
                      }
                    }
                    // else {
                    //   return 'false'
                    // }
                  }
                }
              }
            }
            
            
          }
          else if (this.hs.prescriptionDictionary[pres.prescription_id][i].descriptiveDose){
            if (type === 'time') {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
            }
            else if (type === 'dose')
            {
              return '';
              // return this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit);
            }
            return status.length > 0 ? status[0].adminstrationstatus : '';
          }
        } else if (checkTransfer && checkDate) {
          // how to get dose?
          if (type === 'time') {
            return checkTransfer.slice(0, 5);
          } else if (type === 'dose') {
            if (this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose.includes('null')) {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose
            } else if (this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose.includes('null')) {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose
            } else if (this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose.includes('null')) {
              return this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose
            } else {
              if(this.hs.prescriptionDictionary[pres.prescription_id][i].titration)
              {
                let groupTitrationData = this.appService.DoseEvents.find(x => x.posology_id == this.hs.prescriptionDictionary[pres.prescription_id][i].posologyId && x.grouptitration == true);
                let changeDateFormat = moment(currDate).format('YYYYMMDD');
                let changeTimeFormat = this.hs.prescriptionDictionary[pres.prescription_id][i].time.split(':');
                let finalTitrationLogicalID = changeDateFormat + changeTimeFormat[0] + changeTimeFormat[1] + "_" + this.hs.prescriptionDictionary[pres.prescription_id][i].doseId;
                let titrationData = this.appService.DoseEvents.filter(x => x.logicalid == finalTitrationLogicalID && x.eventtype == 'titration');
                if(titrationData.length > 0)
                {
                  return titrationData[0].titrateddosesize + ' ' + titrationData[0].titrateddoseunit 
                }
                if(groupTitrationData)
                {
                  let date = moment(currDate).format('YYYY-MM-DD') +' '+ this.hs.prescriptionDictionary[pres.prescription_id][i].time;
                  if(moment(date).isSameOrBefore(groupTitrationData.titrateduntildatetime))
                  {
                    return groupTitrationData.titrateddosesize + ' ' + groupTitrationData.titrateddoseunit;
                  }
                }
              }
              else {
                return (this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit))
              }
              
            }
          }
          else {
            if(this.hs.prescriptionDictionary[pres.prescription_id][i].doctorsorder || this.hs.prescriptionDictionary[pres.prescription_id][i].titration)
            {
              let currentDate = moment().format('YYYY-MM-DD');
              let currentTime = moment().format('HH:mm');
              // let [startDate, startTime] = todayDate?.split('T');
              // startTime = startTime.slice(0, 5);
              if(currentDate > this.hs.prescriptionDictionary[pres.prescription_id][i].ciDate || currentTime > this.hs.prescriptionDictionary[pres.prescription_id][i].time)
              {
                return 'Missed'
              }
              // else {
              //   return 'false'
              // }
            }
            else {
              let status = this.medicationAdministration.filter(x => x.logicalid == this.hs.prescriptionDictionary[pres.prescription_id][i].logicalId);
              return status.length > 0 ? status[0].adminstrationstatus : '';
            }
            
          }
        }
      }

    }
  checkShowDose(pres: Prescription, date: any) {
    if (moment(this.appService.GetCurrentPosology(pres).prescriptionstartdate?.split('T')[0]).isAfter(date)) {
      return false
    }
    // else if (this.appService.GetCurrentPosology(pres).dosingdaysfrequency == 'days' || this.appService.GetCurrentPosology(pres).dosingdaysfrequency == 'weeks' || this.appService.GetCurrentPosology(pres).dosingdaysfrequency == 'months') {
    //   if(!moment(this.appService.GetCurrentPosology(pres).prescriptionstartdate?.split('T')[0]).isSame(date)) {
    //     return false;
    //   }
    //   else {
    //     return true;
    //   }
    // }
    // else {
      return true;
    // }
    
  }
  checkTodayTransfer(pres: Prescription) {
    const doseEvents = this.appService.DoseEvents.filter(doseEvent => {
      return doseEvent.posology_id === this.appService.GetCurrentPosology(pres).posology_id;
    });
    // check how many are different dates
    const rowsAddition = {};
    doseEvents.forEach(doseEvent => {
      if (!doseEvent.dosedatetime) {
        return;
      }
      if (doseEvent.dosedatetime?.split('T')[0] !== doseEvent.startdatetime?.split('T')[0]) {
        const date = doseEvent.dosedatetime?.split('T')[0];
        if (!rowsAddition[date]) {
          rowsAddition[date] = 1;
        } else {
          rowsAddition[date] += 1;
        }
      }
    });
    let maxRows = -1
    for (let row in rowsAddition) {
      if (rowsAddition[row] > maxRows) {
        maxRows = rowsAddition[row];
      }
    }
    return maxRows;
  }

  returnTransferTime(i: number, pres: Prescription, j: number): { time: string, dose: string, administrationstatus: string } {
    let time;
    let dose;
    let month = this.dates[j].getMonth() + 1;
    if (month < 10) {
      month = '0' + month;
    }
    let prespos=this.appService.GetCurrentPosology(pres);
    const date = this.dates[j].getFullYear() + '-' + month + '-' + this.dates[j].getDate();
    if (!(this.transferDoses[pres.prescription_id])) {
      this.transferDoses[pres.prescription_id] = {};

    }
    if (!(this.transferDoses[pres.prescription_id][date])) {
      this.transferDoses[pres.prescription_id][date] = { count: 0, events: [], added: false, maEvents: [], maCount: 0 };
    }
    if (!this.transferDoses[pres.prescription_id][date].added) {
      const doseEvents = this.appService.DoseEvents.filter(doseEvent => {
        if (!doseEvent.dosedatetime) {
          return false;
        }
        return doseEvent.posology_id === prespos.posology_id && doseEvent.dosedatetime?.split('T')[0] === date;
      });
      const MAevents = this.medicationAdministration.filter(ma => {
        return ma.posology_id === prespos.posology_id;
      });
      // if (doseEvents.length) {
      //   doseEvents.sort((a, b) => a._sequenceid - b._sequenceid);
      // }
      if (doseEvents.length) {
        doseEvents.sort((a, b) => {
          return a.startdatetime.localeCompare(b.startdatetime);
        });
      }
      this.transferDoses[pres.prescription_id][date].events = doseEvents;
      this.transferDoses[pres.prescription_id][date].maEvents = MAevents;
      this.transferDoses[pres.prescription_id][date].added = true;
      this.transferDoses[pres.prescription_id][date].events.forEach(ev => {
        const doseDate = ev.dosedatetime?.split('T')[0];
        const startDate = ev.startdatetime?.split('T')[0];
        if (doseDate === startDate) {
          this.transferDoses[pres.prescription_id][date].count += 1;
        }
      })

    }




    if (this.transferDoses[pres.prescription_id][date].events[Math.floor(this.transferDoses[pres.prescription_id][date].count)]) {

      time = this.transferDoses[pres.prescription_id][date].events[Math.floor(this.transferDoses[pres.prescription_id][date].count)].dosedatetime?.split('T')[1].slice(0, 5);


      let doseId = this.transferDoses[pres.prescription_id][date].events[Math.floor(this.transferDoses[pres.prescription_id][date].count)].dose_id;
      let doseToSend = prespos.__dose.filter(dose => {
        return dose.dose_id === doseId;
      });
      const type = pres.infusiontype_id;
      if (type === 'rate') {
        dose = dose.infusionrate + ' ' + dose.strengthdenominatorunit + 'hrs ' + ' / ' + dose.infusionduration + ' ' + 'hrs';
      } else if (type === 'bolus') {
        dose = dose.strengthdenominator + ' ' + dose.strengthdenominatorunit;
      } else if (type === 'ci' || type == InfusionType.pca) {
        dose = prespos.__dose[0].infusionrate + ' ' + prespos.__dose[0].strengthdenominatorunit;
      } else if (doseToSend.length) {
        dose = doseToSend[0].dosesize + ' ' + doseToSend[0].doseunit;
      }
      const filterEvents = this.transferDoses[pres.prescription_id][date].maEvents.filter(ma => {
        const logicalDate = ma.logicalid?.split('_')[0].slice(0, 8);
        const originalDate = logicalDate.slice(0, 4) + '-' + logicalDate.slice(4, 6) + '-' + logicalDate.slice(6, 8);
        if (!ma.planneddatetime) {
          return false;
        }
        return ma.dose_id === doseId && ma.planneddatetime?.split('T')[0] !== originalDate;
      });
      if (filterEvents.length) {
        filterEvents.forEach((filterEvent, ind) => {
          if (filterEvents[ind].administrationstartime?.split('T')[0] === date && !filterEvents[ind].checked) {
            time = [filterEvents[ind].administrationstartime?.split('T')[1].slice(0, 5)];
            if (filterEvents[ind].administreddosesize) {
              dose = filterEvents[ind].administreddosesize + ' ' + filterEvents[ind].administreddoseunit;
            } else if (filterEvents[ind].administredinfusionrate) {
              dose = filterEvents[ind].administredinfusionrate + ' ' + filterEvents[ind].administeredstrengthdenominatorunits;
            } else if (filterEvents[ind].administeredstrengthdenominator) {
              dose = filterEvents[ind].administeredstrengthdenominator + ' ' + filterEvents[ind].administeredstrengthdenominatorunits
            };
          } else {
            time = '';
            dose = '';
          }
        })

      }
      this.transferDoses[pres.prescription_id][date].count += 1;

    }
    let administrationstatus;
    if (this.transferDoses[pres.prescription_id][date].maEvents.length && (!time || !dose)) {
      const filterEvents = this.transferDoses[pres.prescription_id][date].maEvents.filter(ma => {
        administrationstatus = ma.adminstrationstatus;
        const logicalDate = ma.logicalid?.split('_')[0].slice(0, 8);
        const originalDate = logicalDate.slice(0, 4) + '-' + logicalDate.slice(4, 6) + '-' + logicalDate.slice(6, 8);
        if (!ma.planneddatetime) {
          return false;
        }
        return ma.planneddatetime?.split('T')[0] !== originalDate && ma.planneddatetime?.split('T')[0] === date;
      });
      if (filterEvents[this.transferDoses[pres.prescription_id][date].maCount]) {
        let macount = this.transferDoses[pres.prescription_id][date].maCount;
        time = [filterEvents[macount].administrationstartime?.split('T')[1].slice(0, 5)];
        if (filterEvents[macount].administreddosesize) {
          dose = filterEvents[macount].administreddosesize + ' ' + filterEvents[macount].administreddoseunit;
        } else if (filterEvents[macount].administredinfusionrate) {
          dose = filterEvents[macount].administredinfusionrate + ' ' + pres.__posology[0].infusionrateunits;
        } else if (filterEvents[macount].administeredstrengthdenominator) {
          dose = filterEvents[macount].administeredstrengthdenominator + ' ' + filterEvents[macount].administeredstrengthdenominatorunits
        };
        this.transferDoses[pres.prescription_id][date].maCount += 1;
      }
    }
    if (!dose) {
      time = '';
    }

    return { time, dose, administrationstatus };
  }

  getMargin()
  {
    return this.marType === 'empty' ? '10px 10px 50px 10px' : '10px 10px 20px 10px';
  }

  setHeightWidthForEmptyTemplate()
  {
    return this.marType === 'empty' ? {height: '300px', margin: '10px 10px 200px 10px',width: '70px'} : '';
  }

}

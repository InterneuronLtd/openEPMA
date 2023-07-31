//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

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
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, Renderer2, TemplateRef, ViewChild, ViewChildren } from "@angular/core";
import { Dose, Prescription } from "src/app/models/EPMA";
import { AppService } from "src/app/services/app.service";
import { HelperService } from "src/app/services/helper.service";
import moment from 'moment';
import { DataRequest } from "src/app/services/datarequest";
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from "src/app/models/filter.model";
import { ApirequestService } from "src/app/services/apirequest.service";
import { TimeerHelper } from '../drug-chart/timer-helper'
@Component({
  selector: 'app-records-template',
  templateUrl: './admission-records-template.component.html',
  styleUrls: ['./admission-records-template.component.css']
})
export class AdmissionRecordsTemplate implements OnInit, AfterViewInit, OnDestroy {
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
  repeatArray2 = [1, 2, 3, 4, 5, 6];
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
    admitdatetime: '', admitdate: '', dayspassed: 0, assignedpatientlocationpointofcare: ''
  };
  partTwoHeights = [];

  constructor(public timeerHelper: TimeerHelper, public appService: AppService, public hs: HelperService, private renderer: Renderer2, public dr: DataRequest, private apiRequest: ApirequestService) {

  }

  ngOnInit() {


    this.appService.Prescription.forEach(pres => {
      pres.comments = pres.comments ? pres.comments?.split(' ').join(' ') : null;
    })
    this.partTwoHeights = [];
    this.appService.Medicationadministration.forEach(ma => {
      ma['checked'] = false;
    })
    this.todaysDate = moment().format('DD-MM-YYYY');
    console.log('pres history', this.appService.prescriptionHistory);
    console.log('encounter', this.appService.encounterDetails);
    console.log('height, weight', this.appService.refHeightValue, this.appService.refWeightValue);
    this.patientDetails = this.appService.patientDetails;
    const splitAge = this.patientDetails.born?.split(' ');
    this.patientDetails.dob = splitAge[0] + ' ' + splitAge[1] + ' ' + splitAge[2];
    this.patientDetails.age = splitAge[3];
    this.encounterDetails = this.appService.encounterDetails;
    this.encounterDetails.admitdate = this.appService.encounterDetails.admitdatetime?.split('T')[0];
    this.encounterDetails.dayspassed = moment(this.appService.encounterDetails['admitdate']).diff(moment(), 'days');
    this.metaprescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.appService.FilteredPrescription.forEach(pres => {
      this.prescriptionMapping[pres.prescription_id] = pres;
    });
    this.prescription = [];
    // this.hs.getDosesPrescriptions(this.prescription);
    this.dates.push(new Date());
    for (let i = 1; i <= 2; i++) {
      this.dates.push(new Date(this.dates[i - 1].getTime() + 86400000));
    }

    if (this.marType === 'empty') {
      this.prescription = [];
      for (let i = 0; i < this.emptyTemplates; i++) {
        this.prescription.push(null);
      }
    } else if (this.marType === 'active') {
      const dateFrom = moment().subtract(this.activeRecordedDays || 5, 'd');
      const pastEvents = this.appService.events.filter(obj => {
        return moment(obj.eventStart).isBefore() && moment(obj.eventStart).isAfter(dateFrom);
      });
      console.log("past events", pastEvents);
      const checkPresId = {}
      const futureEvents = this.appService.events.filter(obj => {
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
      futureEvents.forEach(obj => {
        this.prescription.push(this.prescriptionMapping[obj.prescription_id]);
      });

      this.hs.getDosesPrescriptions(this.prescription);
      this.protocolGetDay();
      console.log("pres dictionary", this.hs.prescriptionDictionary);
      this.distributeEvents(pastEvents);


    } else if (this.marType === 'report') {
      this.timeerHelper.createEvents(this.sdate, this.edate, true);
      const rangeEvents = this.appService.reportData.filter(obj => {
        return moment(obj.eventStart).isSame(this.sdate, 'day') || moment(obj.eventStart).isSame(this.edate, 'day')
          || (moment(obj.eventStart).isAfter(this.sdate, 'day') && moment(obj.eventStart).isBefore(this.edate, 'day'))
      });
      this.distributeEvents(rangeEvents);

    } else {
      const todayEvents = this.appService.events.filter(obj => {
        return moment().isSame(obj.eventStart, 'day');
      });
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
      const filteredDivHeight = this.divs.filter((el, ind) => ind === h[0])[0].nativeElement.offsetHeight;
      let extraRowsHeight;
      let presDivHeight;
      if (h[1] > 5) {
        extraRowsHeight = (h[1] * 15);
        presDivHeight = (h[1] + 6) * 15;
      } else {
        extraRowsHeight = h[1] * 30;
        presDivHeight = (h[1] + 6) * 30
      }

      const extraHeightAdded = (filteredDivHeight + extraRowsHeight);
      this.renderer.setStyle(this.divs.filter((el, i) => i === h[0])[0].nativeElement, "height", extraHeightAdded + 'px');
      this.renderer.setStyle(this.presDescriptionDivs.filter((el, i) => i === h[0])[0].nativeElement, "height", presDivHeight + 30 + 'px');
    })
    let occupied = 800;
    let pageNumber = 0;
    if (this.marType === 'active' || this.marType === 'empty') {
      this.divs.forEach((div, index) => {
        let filteredDiv;
        if (index > 0) {
          filteredDiv = this.divs.filter((el, i) => i === index - 1)[0].nativeElement;
        }
        console.log('Div' + pageNumber + ' ' + filteredDiv);
        console.log('Div' + pageNumber + ' ' + div.nativeElement.offsetHeight);
        if (filteredDiv && (occupied - div.nativeElement.offsetHeight < 0 || (index > 0 && filteredDiv.offsetHeight > 260))) {

          const height = filteredDiv.offsetHeight + occupied;
          this.renderer.setStyle(filteredDiv, "height", height + 'px');
          const pageHeaderDiv = this.pageHeaders.filter((el, ind1) => ind1 === index)[0].nativeElement;
          this.renderer.setStyle(pageHeaderDiv, 'visibility', 'visible');
          const pageFooterDiv = this.pageFooter.filter((el, ind1) => ind1 === index - 1)[0].nativeElement;
          const span = this.renderer.createElement('span');

          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);

          this.renderer.setAttribute(span, 'id', `partOnePage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
          this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
          const xHeight = !pageNumber ? (height - 280) : (height - 100);
          this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + 'px');
          occupied = 800;
          pageNumber += 1;
        }

        this.renderer.setStyle(div.nativeElement, "margin-top", "10px");
        occupied -= 10;
        occupied -= div.nativeElement.offsetHeight;
        if (index === this.divs.length - 1) {
          const filteredDiv = this.divs.filter((el, i) => i === index)[0].nativeElement;
          const height = filteredDiv.offsetHeight + occupied;
          this.renderer.setStyle(filteredDiv, "height", height + 'px');
        }
      });
      {
        let lastIndex = this.divs.length - 1;
        const pageFooterDiv = this.pageFooter.filter((el, ind1) => ind1 === lastIndex)[0].nativeElement;
        const span = this.renderer.createElement('span');
        const text = this.renderer.createText(`Page ${pageNumber + 1}`);
        this.renderer.appendChild(span, text);
        this.renderer.setAttribute(span, 'id', `partOnePage${pageNumber + 1}`);
        this.renderer.appendChild(pageFooterDiv, span);
        this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
        let xHeight = 210;
        if (occupied > 200) {
          xHeight = 480;
        }
        this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + 'px');
        occupied = 595;
        pageNumber += 1;
      }
      let currTime = moment(moment()).format('HH:mm');
      for (let l = 0; l < pageNumber; l++) {

        const el = document.getElementById(`partOnePage${l + 1}`);
        el.textContent = `Page ${l + 1} of ${pageNumber}   Time: ${currTime}`;
      }
      if (this.headerDiv && occupied - this.headerDiv.nativeElement.offsetHeight < 0) {
        const filteredDiv = this.divs.filter((el, i) => i === this.divs.length - 1)[0].nativeElement.offsetHeight;
        const height = filteredDiv + occupied;
        this.renderer.setStyle(this.divs.filter((el, i) => i === this.divs.length - 1)[0].nativeElement, "height", height + 'px');
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
          this.renderer.setStyle(this.divs2.filter((el, i) => i === index - 1)[0].nativeElement, "height", height + 'px');
          const pageHeaderDiv = this.headerSecondPart.filter((el, ind1) => ind1 === index)[0].nativeElement;
          this.renderer.setStyle(pageHeaderDiv, 'display', 'block');
          const pageFooterDiv = this.pageFooter2.filter((el, ind1) => ind1 === index - 1)[0].nativeElement;
          const span = this.renderer.createElement('span');
          const text = this.renderer.createText(`Page ${pageNumber + 1}`);
          this.renderer.appendChild(span, text);
          this.renderer.setAttribute(span, 'id', `partTwoPage${pageNumber + 1}`);
          this.renderer.appendChild(pageFooterDiv, span);
          this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
          let xHeight = (height - 200);
          if (xHeight > 80) {
            xHeight = 45;
          }
          if (this.marType === 'report' || this.marType === 'current') {
            this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + occupied - 100 + 'px');
          } else {
            this.renderer.setStyle(pageFooterDiv, 'margin-top', xHeight + occupied - 60 + 'px');
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
        const filteredDiv = this.divs2.filter((el, i) => i === lastIndex)[0].nativeElement.offsetHeight;
        const height = filteredDiv + occupied;
        const pageFooterDiv = this.pageFooter2.filter((el, ind1) => ind1 === lastIndex)[0].nativeElement;
        const span = this.renderer.createElement('span');
        const text = this.renderer.createText(`Page ${pageNumber + 1}`);
        this.renderer.appendChild(span, text);
        this.renderer.setAttribute(span, 'id', `partTwoPage${pageNumber + 1}`);
        this.renderer.appendChild(pageFooterDiv, span);
        this.renderer.setStyle(pageFooterDiv, 'visibility', 'visible');
        let xHeight = (height - 300);
        this.renderer.setStyle(pageFooterDiv, 'margin-top', occupied - 60 + 'px');
        occupied = 565;
        pageNumber += 1;
      }
      let currTime = moment(moment()).format('HH:mm');
      for (let l = 0; l < pageNumber; l++) {
        const el = document.getElementById(`partTwoPage${l + 1}`);
        el.textContent = `Page ${l + 1} of ${pageNumber}  Time: ${currTime}`;
      }
    }
  }


  distributeEvents(events: Array<any>) {
    this.prescriptionMappingForTemplate = {};
    events.forEach(obj => {
      const status = this.getPrescriptionStatus(this.prescriptionMapping[obj.prescription_id]);
      this.prescriptionMappingForTemplate[obj.prescription_id] ? '' : this.prescriptionMappingForTemplate[obj.prescription_id] = { status };
      this.prescriptionMappingForTemplate[obj.prescription_id]['name'] = this.prescriptionMapping[obj.prescription_id].__medications[0].name;
      this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'] ? '' : this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'] = [];
      const updatedObj = this.checkMedicationAdministered(obj);
      if (updatedObj.content.includes("Administration_Completed") || updatedObj.given) {
        this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, sort: updatedObj.sort, stat: 'GIVEN' });
      } else if (updatedObj.content.includes("Administration_Defered")) {
        this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'DEFERRED' });
      } else if (updatedObj.content.includes("Planned_Administration")) {
        this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'PLANNED' });
      } else if (updatedObj.content.includes("Late_Administration")) {
        this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'NOT GIVEN' });
      } else {
        this.prescriptionMappingForTemplate[obj.prescription_id]['prescription_information'].push({ date: updatedObj.date, time: updatedObj.time, stat: 'PLANNED' })
      }
    });
    for (let key in this.prescriptionMappingForTemplate) {
      this.prescriptionMappingForTemplate[key]['prescription_information'].sort(function (a, b) {
        const bDate = b.date?.split('-').reverse().join('-');
        const aDate = a.date?.split('-').reverse().join('-');
        return bDate.localeCompare(aDate) || b.time.localeCompare(a.time);
      });
      if (this.prescriptionMappingForTemplate[key]['prescription_information'].length > 16) {
        const noOfArrays = Math.ceil(this.prescriptionMappingForTemplate[key]['prescription_information'].length / 16);
        for (let i = 0; i < noOfArrays; i++) {
          this.partTwoPrescriptions.push({
            ...this.prescriptionMappingForTemplate[key],
            'prescription_information': this.prescriptionMappingForTemplate[key]['prescription_information'].slice(i * 16, (i + 1) * 16), key
          });
        }
      } else {
        this.partTwoPrescriptions.push({ ...this.prescriptionMappingForTemplate[key], key });
      }

    }
    console.log(this.prescription);
    console.log(this.partTwoPrescriptions);

    this.partTwoPrescriptions.sort((a, b) => (a.prescription_information.length > b.prescription_information.length) ? 1 : ((b.prescription_information.length > a.prescription_information.length ? -1 : 0)));
    this.partTwoPrescriptions.forEach(presTwo => {
      const requiredHistory = this.appService.prescriptionHistory.filter(presHistory => presHistory.prescription_id === presTwo.key);
      requiredHistory.sort((a, b) => b.lastmodifiedon.localeCompare(a.lastmodifiedon));
      console.log('requiredHistory', requiredHistory);
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
        console.log('length', suspendTimes);
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
      pres.__medications.forEach(meds => {
        nameCharacters += (meds.name ? meds.name.length : 0) + (meds.__ingredients.length ? meds.__ingredients[0].name.length : 0) + 2;
      });
      commentChars += pres.comments ? pres.comments.length : 0;
      nameCharacters -= 100;
      commentChars -= 100;
      if (nameCharacters > 0) {
        increaseInHeight += Math.ceil(nameCharacters / 50) * 25;
      }
      if (commentChars > 0) {
        increaseInHeight += Math.ceil(commentChars / 50) * 25;
      }
      this.partTwoHeights.push(200 + increaseInHeight + 'px');
    })


  }

  returnUpdatedHeight(data: any) {

  }

  checkMedicationAdministered(obj: any) {
    console.log('hs pres', this.hs.prescriptionDictionary);
    const doseId = obj.dose_id?.split('_')[1];
    const ma = this.appService.Medicationadministration.filter(ma => {
      let date = obj.eventStart.format('DD-MM-YYYY');
      let time = obj.eventStart.format('HH:mm');
      if (!ma.planneddatetime) {
        return false;
      }
      let [maDate, maTime] = ma.planneddatetime?.split('T');
      maDate = maDate?.split('-').reverse().join('-');
      maTime = maTime.slice(0, 5);
      return doseId === ma.dose_id && date === maDate;
    });
    const newObj = { ...obj };
    if (ma.length) {
      let dose;
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
      newObj.time = obj.eventStart.format('HH:mm') + ' - ' + this.getDose(obj);
    }

    return newObj;


  }

  getDose(obj: any) {
    const posology = this.appService.GetCurrentPosology(this.appService.Prescription.filter(pres => pres.prescription_id === obj.prescription_id)[0]);
    let dose;
    if (posology.infusiontypeid === 'ci') {
      dose = posology.__dose.filter(dose => dose.dose_id === obj.dose_id?.split('_')[2])[0];
    } else if (posology.infusiontypeid === 'bolus') {
      dose = posology.__dose.filter(dose => dose.dose_id === obj.dose_id?.split('_')[2])[0];
    } else {
      dose = posology.__dose.filter(dose => dose.dose_id === obj.dose_id?.split('_')[1])[0];
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
      return dose.dosesize + ' ' + doseUnit;
    } else if (posology.infusiontypeid === 'ci' && dose) {
      return dose.infusionrate + ' ' + dose.strengthdenominatorunit + ' / ' + 'hr';


    } else if (posology.infusiontypeid === 'bolus' && dose) {
      return dose.dosesize + ' ' + dose.doseunit + ' / ' + 'hr';
    } else if (posology.infusiontypeid === 'rate' && dose) {
      return dose.infusionrate + ' ' + dose.strengthdenominatorunit + ' / ' + dose.infusionduration + ' hrs';
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
      let nameCharacters = 0;
      let commentChars = 0;
      pres.__medications.forEach(meds => {
        nameCharacters += (meds.name ? meds.name.length : 0) + (meds.__ingredients.length ? meds.__ingredients[0].name.length : 0) + 2;
      });
      commentChars += pres.comments ? pres.comments.length : 0;
      nameCharacters -= 110;
      commentChars -= 110;
      if (nameCharacters > 0) {
        extraInfoRows += Math.ceil(nameCharacters / 55);
      }
      if (commentChars > 0) {
        extraInfoRows += Math.ceil(commentChars / 55);
      }
      if (extraInfoRows > 10) {
        extraInfoRows = 10;
      }
      let protocolCount = this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount;
      if (!protocolCount) {
        protocolCount = 6;
      }
      const templateArray = Array(protocolCount - 1).fill(4);
      if (templateArray.length > 6) {
        const extraRows = templateArray.length - 6;
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
        if (extraTransferRows + extraRows + extraInfoRows >= 6) {
          finalRows = 22;
          for (let k = 0; k < (22 - extraTransferRows + extraRows + extraInfoRows); k++) {
            templateArray.push(4);
          }
        }
        if (!count) {
          this.updateHeights.push([index, finalRows ? finalRows : extraRows + extraTransferRows + extraInfoRows]);
        } else {
          this.updateHeights.push([index, extraInfoRows]);
        }

        return templateArray;
      } else {
        let finalRows = 0;
        let extraTransferRows = this.checkTodayTransfer(pres);
        if (protocolCount - 1 - extraTransferRows < 0) {
          for (let k = 0; k < extraTransferRows - protocolCount - 1; k++) {
            templateArray.push(4);
          }

          if (extraTransferRows + extraInfoRows - protocolCount - 1 >= 6) {
            finalRows = 22;
            for (let k = 0; k < (22 - extraTransferRows + extraInfoRows - protocolCount - 1); k++) {
              templateArray.push(4);
            }
          }
          this.updateHeights.push([index, finalRows ? finalRows : extraTransferRows + extraInfoRows - protocolCount - 1]);
        } else {
          if (extraInfoRows >= 6) {
            finalRows = 22;
          }
          this.updateHeights.push([index, finalRows ? finalRows : extraInfoRows]);
        }
        if (!extraInfoRows) {
          return this.repeatArray2;
        } else {
          let newArr = []
          extraInfoRows = finalRows ? finalRows : extraInfoRows;
          for (let k = 0; k < extraInfoRows + 6; k++) {
            newArr.push(4);
          }
          return newArr;
        }

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
        administeredEvents = this.appService.Medicationadministration.filter(ma => {
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
        administeredEvents = this.appService.Medicationadministration.filter(ma => {
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
      return (doseEvent.dose_id === doseId) && (startDate === date) && (startTime === currTime);
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
          if (frequency === 'protocol' || frequency === 'variable') {
            time = this.returnProtocolTime(pres, n, m, this.dates[m]);
            dose = this.returnProtocolDose(n, m, pres, this.dates[m]);
          } else {
            time = this.returnXTime(n, pres, this.dates[m]);
            dose = this.returnXTime(n, pres, this.dates[m], 'dose');
          }
          if (n >= this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount - 1 && frequency !== 'protocol' && !time) {
            let dataObj = this.returnTransferTime(n, pres, m);
            time = dataObj.time;
            dose = dataObj.dose;
          } else if (n >= this.hs.prescriptionDictionary[pres.prescription_id][0].protocolCount && frequency === 'protocol' && !time) {
            let dataObj = this.returnTransferTime(n, pres, m);
            time = dataObj.time;
            dose = dataObj.dose;
          }

          // if (!time) {
          //   let dataObj = this.returnTransferTime(n, pres, m);
          //   time = dataObj.time;
          //   dose = dataObj.dose;
          // }
          if (time instanceof Object) {
            time = time[0];
            administered = true;
          }
          this.prescriptionProperFlow[pres.prescription_id][n][m] = { time, dose, administered };
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
          return 'N.A';
        }
      } else {
        return 'A';
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
    if (pres.isinfusion && pres.infusiontype_id === 'ci') {
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        checkDate = moment(currDate.getFullYear() + '-' + (currDate.getMonth() + 1) + '-' + currDate.getDate()).isSame(this.hs.prescriptionDictionary[pres.prescription_id][i].ciDate);
      } else {
        checkDate = false;
      }

    }

    let checkTransfer;
    let administeredEvents = [];
    if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
      administeredEvents = this.appService.Medicationadministration.filter(ma => {
        const logicalDate = ma.logicalid?.split('_')[0].slice(0, 8);
        const originalDate = logicalDate.slice(0, 4) + '-' + logicalDate.slice(4, 6) + '-' + logicalDate.slice(6, 8);
        if (!ma.planneddatetime) {
          return false;
        }
        return ma.dose_id === this.hs.prescriptionDictionary[pres.prescription_id][i].doseId && ma.planneddatetime?.split('T')[0] === originalDate;
      });
    }
    let time;
    let dose;
    administeredEvents.forEach((administeredEvent, ind) => {
      if (!administeredEvents[ind].checked && administeredEvents[ind].administrationstartime?.split('T')[0] === date) {
        if (type === 'time') {
          time = [administeredEvents[ind].administrationstartime?.split('T')[1].slice(0, 5)];

        } else {
          if (administeredEvents[0].administreddosesize) {
            dose = administeredEvents[0].administreddosesize + ' ' + administeredEvents[0].administreddoseunit;
          } else if (administeredEvents[0].administredinfusionrate) {
            dose = administeredEvents[0].administredinfusionrate + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
          } else if (administeredEvents[0].administeredstrengthdenominator) {
            dose = administeredEvents[0].administeredstrengthdenominator + ' ' + administeredEvents[0].administeredstrengthdenominatorunits;
          };
          administeredEvents[ind].checked = true;
        }

      }
      else if (administeredEvents.length && administeredEvents[0].administrationstartime?.split('T')[0] !== date && administeredEvents[0].planneddatetime?.split('T')[0] === date) {
        time = 'changed';
      }
    });
    if (time === 'changed') {
      return '';
    } else if (time && type === 'time') {
      return time
    } else if (time && type === 'dose') {
      return dose;
    } else {
      if (this.hs.prescriptionDictionary[pres.prescription_id][i]) {
        checkTransfer = this.checkTransfer(pres, this.hs.prescriptionDictionary[pres.prescription_id][i].doseId, currDate, this.hs.prescriptionDictionary[pres.prescription_id][i].time);
      }
      const doseCheck = this.checkShowDose(pres, date);
      if (!doseCheck) {
        return '';
      }

      if (checkTransfer === true && checkDate) {
        if (pres.infusiontype_id === 'bolus') {

          if (type === 'time') {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
          }
          return this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose
        } else if (pres.infusiontype_id === 'rate' && !checkTransfer) {
          if (type === 'time') {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
          }
          return this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose
        } else if (pres.infusiontype_id === 'ci') {
          if (type === 'time') {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
          }
          return this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose;

        }
        if (this.hs.prescriptionDictionary[pres.prescription_id][i].dose) {
          if (type === 'time') {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].time;
          }
          return this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit);

        }
      } else if (checkTransfer && checkDate) {
        // how to get dose?
        if (type === 'time') {
          return checkTransfer.slice(0, 5);
        } else {
          if (this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose.includes('null')) {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].bolusDose
          } else if (this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose.includes('null')) {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].rateDose
          } else if (this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose && !this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose.includes('null')) {
            return this.hs.prescriptionDictionary[pres.prescription_id][i].ciDose
          } else {
            return (this.hs.prescriptionDictionary[pres.prescription_id][i].dose + ' ' + this.shortenUnitName(this.hs.prescriptionDictionary[pres.prescription_id][i].doseunit))
          }
        }

      }
    }

  }
  checkShowDose(pres: Prescription, date: any) {
    if (moment(this.appService.GetCurrentPosology(pres).prescriptionstartdate?.split('T')[0]).isAfter(date)) {
      return false
    };
    return true;
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

  returnTransferTime(i: number, pres: Prescription, j: number): { time: string, dose: string } {
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
      const MAevents = this.appService.Medicationadministration.filter(ma => {
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
      } else if (type === 'ci') {
        dose = prespos.__dose[0].infusionrate + ' ' + prespos[0].__dose[0].strengthdenominatorunit;
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
    if (this.transferDoses[pres.prescription_id][date].maEvents.length && (!time || !dose)) {
      const filterEvents = this.transferDoses[pres.prescription_id][date].maEvents.filter(ma => {
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
          dose = filterEvents[macount].administredinfusionrate + ' ' + filterEvents[macount].administeredstrengthdenominatorunits;
        } else if (filterEvents[macount].administeredstrengthdenominator) {
          dose = filterEvents[macount].administeredstrengthdenominator + ' ' + filterEvents[macount].administeredstrengthdenominatorunits
        };
        this.transferDoses[pres.prescription_id][date].maCount += 1;
      }
    }
    if (!dose) {
      time = '';
    }

    return { time, dose };
  }
}

  // returnVariableCiDose(prescriptionId: string, i: number, date: string) {

  // }



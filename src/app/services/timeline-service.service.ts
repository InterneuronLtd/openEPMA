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
import { Injectable } from '@angular/core';
import { Timeline, DataSet } from 'vis-timeline/standalone';

import { AppService } from "src/app/services/app.service"
import moment from 'moment';

import { TimelineZoomLevel } from '../models/encounter.model'
import { Medication, Prescriptionroutes } from '../models/EPMA';
import { Route } from '../components/prescribing-form/formhelper';

@Injectable({
  providedIn: 'root'
})

export class TimelineServiceService {
  timeline: Timeline;
  toptimeline: Timeline;
  options = {};
  items: any;
  groups: any;
  timelineZoomLevel: TimelineZoomLevel = new TimelineZoomLevel();
  PRNids = new Array();

  constructor(private appService: AppService) {

    this.configureOptions("top");

  }

  Reset() {
    this.timeline = null;
    this.toptimeline = null;
    this.options = {};
    this.items = null;
    this.groups = null;
    this.PRNids = new Array();
  }

  mapGroupids(filterValue: any, option: any) {
    this.options = {};
    this.PRNids = new Array();
    this.groups = new DataSet();
    this.items = new DataSet();
    this.configureOptions("none");

    for (var val of this.appService.FilteredPrescription) {
      if (option == "Basic") {

        if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id && x.group == filterValue)) {
          continue;
        }
        // Add all to this no grouping

      }
      else if (option == "custom group") {
        if (val.__medications.find(x => x.prescription_id === val.prescription_id && x.isprimary == true).customgroup != filterValue) {
          continue;
        }

      }
      else if (option == "Base") {
        if (val.__medications.find(x => x.prescription_id === val.prescription_id && x.isprimary == true).classification != filterValue) {
          continue;
        }

      }
      else if (option == "Route") {
        // if (this.appService.Prescriptionroutes.find(x => x.prescription_id === val.prescription_id && x.isdefault == true).route != filterValue) {
        //   continue;
        // } 

        if (val.__routes.length == 0 || val.__routes.find(x => x.isdefault == true).route != filterValue) {
          continue;
        }
      }

      var container = document.getElementById(val.prescription_id.toString());
      this.groups.update({ id: val.prescription_id, content: container });

    }
    this.loadEvents(filterValue, option);
    // this.createPRNEEvent(classification);
  }

  loadEvents(filterValue: any, option: any) {

    for (var dose of this.appService.events) {

      if (option == "Basic") {
        if (!this.appService.dcgroupadded.find(x => x.prescriptionid == dose.prescription_id && x.group == filterValue)) {
          continue;
        }
        // Add all to this no grouping

      }
      else if (option == "Base") {
        if ([].concat(...this.appService.Prescription.map(p => p.__medications)).find((x: Medication) => x.prescription_id === dose.prescription_id && x.isprimary == true).classification != filterValue) {
          continue;
        }

      }
      else if (option == "Route") {
        if ([].concat(...this.appService.Prescription.map(p => p.__routes)).find((x: Route) => x.prescription_id === dose.prescription_id && x.isdefault == true).route != filterValue) {
          continue;
        }
      }

      //  need to change not in if condetion
      if (this.appService.Prescription.find(x => x.prescription_id === dose.prescription_id).isinfusion) {
        if (dose.eventEnd) {
          dose.eventEnd = moment(dose.eventEnd);
          this.items.update({
            id: dose.dose_id, content: '', start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id
          })

        }
        else {
          this.addUpdateItem(dose.dose_id, dose.content, "", dose.eventStart, dose.eventEnd, dose.prescription_id, dose.title)
        }

      }
      else {
        this.addUpdateItem(dose.dose_id, dose.content, "transparant", dose.eventStart, dose.eventEnd, dose.prescription_id, dose.title)

        // if (dose.iscancelled) {
        //   this.addUpdateItem(dose.doseventEnde_id, contents.Administration_withheld_by_doctor, "transparant", dose.dosestartdatetime, dose.dosestartdatetime, dose.prescription_id, "title")
        // }
        // else {
        // this.createMedicineDoseEvent(dose);
        // }
      }
    }

  }

  getConcadeCode(Code: any) {
    // let Code= this.appService.DCGroups[0].MatchConditions.ClassificationCodes[0].Code.split(".");
    let concadCode = "";
    for (let x of Code) {
      if (!isNaN(x)) {
        concadCode = concadCode + (+x);
      }
    }
    return concadCode;
  }
  groupingBasics() {
    this.appService.dcgroupadded = [];
    for (var val of this.appService.FilteredPrescription) {

        let isIvFluid=false;
      if (val.__drugcodes) {
        const customrows = val.__drugcodes.filter(x => x.additionalCodeSystem.toLowerCase() == "custom");
        const ivfluids = customrows.filter(x => x.additionalCode.toUpperCase() == "BASIC_FLUID");
        if (ivfluids.length > 0)
          isIvFluid = true;
        else
          isIvFluid = false;
      }


      if (val.__posology.find(x => x.iscurrent == true).frequency == "stat") {
        this.appService.dcgroupadded.push({ group: "Stat", prescriptionid: val.prescription_id })
      }
      else {
        let codematteched = false;
        let Presindecation = JSON.parse(val.indication)
        let drug_bnf = "";
        if (val.__drugcodes) {
          const bnfrow = val.__drugcodes.filter(x => x.additionalCodeSystem == "BNF");
          if (bnfrow.length > 0)
            drug_bnf = bnfrow[0].additionalCode;
        }

       
        drug_bnf.padEnd(10, "0");

        for (let group of this.appService.DCGroups) {
          let isbnfmatch = false
          for (let arrcode of group.MatchConditions.ClassificationCodes) {
            let bnf = (arrcode.Code ?? "").replace(/\./g, "");
            if (bnf == drug_bnf.substring(0, bnf.length)) {
              isbnfmatch = true;
            }
          }

          let isindecationmatch = false;
          for (let arrindecation of group.MatchConditions.Indications) {
            if (Presindecation) {
              if (arrindecation.Code == Presindecation.code || arrindecation.Indication == Presindecation?.indication) {
                isindecationmatch = true
              }
            }
          }
          let Indications = group.MatchConditions.Indications;
          if (group.MatchType == "AND") {

            if (isindecationmatch && isbnfmatch) {
              if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres 47  4.0.1.0
                this.appService.dcgroupadded.push({ group: group.GroupName, prescriptionid: val.prescription_id })
              }
            }
          }
          else {
            if (isindecationmatch || isbnfmatch) {
              if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
                this.appService.dcgroupadded.push({ group: group.GroupName, prescriptionid: val.prescription_id })
              }
            }
          }
        }
        
        if (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'ci' || (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'rate' && val.__posology.find(x => x.iscurrent == true).frequency == "variable")) {
          if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
            this.appService.dcgroupadded.push({ group: "Variable/Continuous infusion", prescriptionid: val.prescription_id })
          }
        }
        else if (val.__posology.find(x => x.iscurrent == true).prn == true) {
          if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
            this.appService.dcgroupadded.push({ group: "PRN", prescriptionid: val.prescription_id })
          }
        }
        else if (isIvFluid) {
          if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
            this.appService.dcgroupadded.push({ group: "IV Fluid", prescriptionid: val.prescription_id })
          }
        }
        else {
          if (!this.appService.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
            this.appService.dcgroupadded.push({ group: "Regular drugs", prescriptionid: val.prescription_id })
          }
        }



      }


    }


  }
  addUpdateItem(id: any, content: any, className: any, start: any, end: any = null, groupid: any, title: any) {
    if (content.indexOf("myDIVPRN") >= 0) {
      this.items.update({
        id: id, content: content,
        className: "PRNRange", start: start, end: end, group: groupid,title:title

      })
    }
    else {
      this.items.update({
        id: id, content: content,
        className: "transparant", start: start, end: end, group: groupid ,title:title


      })
    }
  }


  configureOptions(orientation: any) {

    // Configuration for the Timeline

    this.timelineZoomLevel.start = this.appService.changechoosenFilterDate.toDate();
    this.timelineZoomLevel.start.setHours(0);
    this.timelineZoomLevel.end = new Date(this.timelineZoomLevel.start);
    this.timelineZoomLevel.end.setHours(12);

    this.timelineZoomLevel.end.setDate(this.timelineZoomLevel.end.getDate() + 1);
    let currentDate = this.appService.changechoosenFilterDate.toDate();
    let maxUsercanscroll = moment(currentDate).add(7, 'days');
    let minUsercanscroll = moment(currentDate).add(-7, 'days');
    maxUsercanscroll.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
    minUsercanscroll.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    this.options = {
      stack: false,
      zoomKey: "altKey",
      start: this.timelineZoomLevel.start,
      end: this.timelineZoomLevel.end,
      min: minUsercanscroll,                // lower limit of visible range
      max: maxUsercanscroll,
      zoomMin: 60000 * 5,
      zoomMax: (1000 * 60 * 60 * 24 * 7 + 10),
      orientation: { axis: orientation }
    };


  }


}

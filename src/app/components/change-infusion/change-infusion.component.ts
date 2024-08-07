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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { InfusionEvents, Medicationadministration, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { ChangeInfusion } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-change-infusion',
  templateUrl: './change-infusion.component.html',
  styleUrls: ['./change-infusion.component.css']
})
export class ChangeInfusionComponent implements OnInit, OnDestroy {
  prescription: Prescription;
  subscriptions = new Subscription();
  administration: Medicationadministration = new Medicationadministration();
  infusionEvents: InfusionEvents = new InfusionEvents();
  minDate: Date;
  maxDate: Date;
  startime: string = moment(new Date()).format('HH:mm');
  stardate: string = moment(new Date()).format('DD-MM-YYYY');
  validatiommessage: string = "";
  comments: string = "";
  showSpinner: boolean = false;
  infusionType: string;
  administrationstartime: string;
  @Input('event') event: any
  expirydate: any;
  currDate: Date;
  public changeInfusion: typeof ChangeInfusion = ChangeInfusion;
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {

    this.currDate = new Date();

  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {
    this.prescription = event.prescription;
    this.validatiommessage = "";
    this.comments = "";
    this.infusionType = this.changeInfusion.changeinfusion;
    this.startime = moment(new Date()).format('HH:mm');
    this.stardate = moment(new Date()).format('DD-MM-YYYY');
    this.showSpinner = false;
    this.infusionEvents = new InfusionEvents();
    this.administration = new Medicationadministration();
    this.setMinMaxDate(event);

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  closePopup() {
    this.subjects.closeAppComponentPopover.next();
  }
  saveChangeInfusion() {
    this.administrationstartime = moment(this.stardate, "DD-MM-YYYY").format("DD-MM-YYYY") + " " + this.startime;
    this.changeInfusionValidation();
    if (this.validatiommessage != "") {
      return;
    }
    if (this.expirydate) {
      this.infusionEvents.expirydate = this.appService.getDateTimeinISOFormat(moment(this.expirydate, "DD-MM-YYYY HH:mm").toDate());
    }
    this.infusionEvents.eventdatetime = this.appService.getDateTimeinISOFormat(moment(this.administrationstartime, "DD-MM-YYYY HH:mm").toDate());
    this.infusionEvents.planneddatetime = this.infusionEvents.eventdatetime;
    //this.infusionEvents.logicalid = this.infusionType + "_" + this.createLogicalId(this.infusionEvents.eventdatetime, this.infusionEvents.dose_id);
    this.infusionEvents.posology_id = this.appService.GetCurrentPosology(this.prescription).posology_id;
    this.infusionEvents.eventtype = this.infusionType;
    this.infusionEvents.comments = this.comments;
    delete this.infusionEvents._sequenceid;
    this.appService.logToConsole(this.infusionEvents);
    this.showSpinner = true;
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=core&synapseentityname=infusionevents', JSON.stringify(this.infusionEvents))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.appService.logToConsole(response);
          this.dr.getAdminstrations(() => {
            this.showSpinner = false;
            this.subjects.refreshDrugChart.next("refresh");
            this.subjects.closeAppComponentPopover.next();
          })


        }, (error) => {
          this.showSpinner = false;
          this.subjects.closeAppComponentPopover.next();

          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
    )
  }
  setMinMaxDate(event) {
    this.maxDate = new Date();
    this.minDate = new Date(this.appService.GetCurrentPosology(this.prescription).__dose[0].dosestartdatetime);
    // check for exisiting event
    if (event.infusionEvents) {
      this.infusionEvents = event.infusionEvents;
      this.infusionType = this.infusionEvents.eventtype;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.comments = this.infusionEvents.comments;
      if (event.infusionEvents.expirydate) {
        this.expirydate = moment(event.infusionEvents.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      }
      this.stardate = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      this.startime = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("HH:mm");
      let infusionData = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.appService.GetCurrentPosology(this.prescription).posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
      var index = infusionData.indexOf(infusionData.find(e => e.dose_id == this.infusionEvents.logicalid));
      var prevEvent = infusionData[index - 1];
      var nextEvent = infusionData[index + 1];
      this.minDate = moment(prevEvent.eventStart).toDate();
      if (nextEvent) {
        if (moment(nextEvent.eventStart).format("YYYYMMDDHHmm") > moment(new Date()).format("YYYYMMDDHHmm")) {
          this.maxDate = moment(new Date(), 'DD-MM-YYYY HH:mm').toDate();
        } else {
          this.maxDate = moment(nextEvent.eventStart).toDate();
          this.maxDate = moment(this.maxDate, 'DD-MM-YYYY HH:mm').add(-this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
        }
      }
    } else {
      this.infusionEvents.infusionevents_id = uuid();
      this.infusionEvents.dose_id = uuid();
      this.infusionEvents.logicalid = this.infusionType + "_" + this.createLogicalId(this.infusionEvents.eventdatetime, this.infusionEvents.dose_id);
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.administeredby = this.appService.loggedInUserName;
      this.infusionEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      let eventRecord = this.appService.events.sort((b, a) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.appService.GetCurrentPosology(this.prescription).posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
      let doneInfusion = eventRecord.find(e => e.admitdone);
      var index = eventRecord.indexOf(eventRecord.find(e => e.admitdone));
      let notDoneInfusion = eventRecord[index - 1];
      //let notDoneInfusion = eventRecord.slice().reverse().find(e => !e.admitdone)
      this.minDate = new Date(doneInfusion.eventStart);
      if (notDoneInfusion) {
        let maximumDate = new Date(notDoneInfusion.eventStart);
        if (moment(maximumDate).format("YYYYMMDDHHmm") > moment(new Date()).format("YYYYMMDDHHmm")) {
          this.maxDate = moment(new Date(), 'DD-MM-YYYY HH:mm').toDate();
        } else {
          this.maxDate = maximumDate;
          this.maxDate = moment(this.maxDate, 'DD-MM-YYYY HH:mm').add(-this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
        }
      }
    }
    this.minDate = moment(this.minDate, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  changeInfusionValidation() {
    this.validatiommessage = "";
    var doseStart = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");
    var administeredTime = moment(moment(this.administrationstartime, "DD-MM-YYYY HH:mm")).format("YYYYMMDDHHmm");
    var doseEnd = moment(moment(this.maxDate).toDate()).format("YYYYMMDDHHmm");
    var administered = this.appService.InfusionEvents.sort((a, b) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(e => e.eventtype == "administered" && e.posology_id == this.appService.GetCurrentPosology(this.prescription).posology_id);
    if (!administered) {
      this.validatiommessage = "This infusion is not administered";
      return;
    }
    if (doseStart >= doseEnd) {
      this.validatiommessage = "Please try later, You cannot change kit/syringe after immediate administration";
      return;
    }
    if (administeredTime <= doseEnd && administeredTime >= doseStart) {
      this.validatiommessage = "";
    } else {
      this.validatiommessage = "Administered date time must be between " + moment(moment(this.minDate).toDate()).format("DD-MM-YYYY HH:mm") + " and " + moment(moment(this.maxDate).toDate()).format("DD-MM-YYYY HH:mm");
    }
  }
}

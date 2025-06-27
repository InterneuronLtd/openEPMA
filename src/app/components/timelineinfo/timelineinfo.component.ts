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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Medicationadministration, Prescription } from 'src/app/models/EPMA';
import { v4 as uuid } from 'uuid';
import { DoseEvents } from '../../models/EPMA';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import moment from 'moment';
import { TimelineServiceService } from 'src/app/services/timeline-service.service';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { InfusionType } from 'src/app/services/enum';

@Component({
  selector: 'app-timelineinfo',
  templateUrl: './timelineinfo.component.html',
  styleUrls: ['./timelineinfo.component.css'],
})
export class TimelineinfoComponent implements OnInit, OnDestroy {

  @Output() hideAdministrationForm = new EventEmitter();
  @Input() prescription: Prescription;
  @Input() editpopuptypetype: string;
  @Input() dose: any;

  doctorComments: string;
  startDate: Date;
  startTime: string;
  subscriptions: Subscription = new Subscription();
  validationMessage: string;
  prescriptionStartDate: Date;
  cancelEventComments: string;
  administration: Medicationadministration = new Medicationadministration();
  headerString: string;
  isSaving: boolean = false;

  constructor(private timelineService: TimelineServiceService,
    private apiRequest: ApirequestService,
    public appService: AppService,
    private dr: DataRequest,
    private subjects: SubjectsService
  ) { }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
    this.administration.planneddatetime = moment(new Date(this.dose.eventStart)).format('YYYY-MM-DD HH:mm');
    /*if (this.editpopuptypetype == 'Cancel Event') {
      this.cancelEvent();
    }*/
    if (this.editpopuptypetype == 'Undo Cancel') {
      this.unDoCancel();
    }
    else {
      this.startDate = moment(this.dose.eventStart).toDate();

      if (moment(this.dose.eventStart).toDate().getHours() < 10) {
        this.startTime = '0' + moment(this.dose.eventStart).toDate().getHours().toString();
      } else {
        this.startTime = moment(this.dose.eventStart).toDate().getHours().toString();
      }

      if (moment(this.dose.eventStart).toDate().getMinutes() < 10) {
        this.startTime += ':0' + moment(this.dose.eventStart).toDate().getMinutes().toString();
      } else {
        this.startTime += ':' + moment(this.dose.eventStart).toDate().getMinutes().toString();
      }

      let month = new Array();
      month[0] = "Jan";
      month[1] = "Feb";
      month[2] = "Mar";
      month[3] = "Apr";
      month[4] = "May";
      month[5] = "Jun";
      month[6] = "Jul";
      month[7] = "Aug";
      month[8] = "Sep";
      month[9] = "Oct";
      month[10] = "Nov";
      month[11] = "Dec";

      switch (this.editpopuptypetype) {
        case 'Transfer':
          this.headerString = 'Transfer';
          this.prescriptionStartDate = new Date(this.prescription.startdatetime);
          break;
        case 'Prescriber\'s comments':
          this.headerString = `Prescriber's comments - ${this.startDate.getDate()}, ${month[this.startDate.getMonth()]} ${this.startTime}`;
          let previousComment = this.appService.DoseEvents.find(e => e.dose_id == this.dose.dose_id.split('_')[1]
            && e.posology_id == this.dose.posology_id
            && moment(e.startdatetime).format("YYYYMMDDHHmm") == moment(this.dose.eventStart).format("YYYYMMDDHHmm")
            && e.eventtype == 'Comment' && e.iscancelled == false);

          if (previousComment) {
            this.doctorComments = previousComment.comments;
          }
          break;
        case 'Cancel Event':
          this.headerString = `Cancel Event - ${this.startDate.getDate()}, ${month[this.startDate.getMonth()]} ${this.startTime}`;
          break;
      }

    }
  }

  unDoCancel() {
    var currectDose = this.appService.DoseEvents.find(x => x.logicalid === this.dose.dose_id);
    var index = this.appService.DoseEvents.indexOf(currectDose);
    currectDose.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    currectDose.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
    currectDose.createdby = this.appService.loggedInUserName;
    currectDose.modifiedby = this.appService.loggedInUserName;

    Object.keys(currectDose).map((e) => { if (e.startsWith("_")) delete currectDose[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(currectDose)), "del");
    upsertManager.save( (resp: DoseEvents[]) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.DoseEvents.splice(index, 1);
      upsertManager.destroy();



      this.hideAdministrationForm.emit(true);
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.hideAdministrationForm.emit(true);

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );

  }


  cancelEvent() {
    let doseEvents = new DoseEvents();
    doseEvents.doseevents_id = uuid();
    doseEvents.dose_id = this.dose.dose_id.split('_')[this.dose.dose_id.split('_').length - 1];
    doseEvents.posology_id = this.dose.posology_id;
    doseEvents.startdatetime = this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate());
    doseEvents.eventtype = 'Cancel';
    doseEvents.dosedatetime = this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate());
    doseEvents.comments = this.cancelEventComments;
    doseEvents.logicalid = this.dose.dose_id;//this.getLogicalId(this.startDate, this.dose.dose_id.split('_')[1]),
    doseEvents.iscancelled = true;
    doseEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    doseEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
    doseEvents.createdby = this.appService.loggedInUserName;
    doseEvents.modifiedby = this.appService.loggedInUserName;
    this.isSaving = true;
    Object.keys(doseEvents).map((e) => { if (e.startsWith("_")) delete doseEvents[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(doseEvents)));
    upsertManager.save( (resp: DoseEvents[]) => {
      // this.appService.logToConsole(resp[0]["core|doseevents"]);
      //   this.doseEvents._sequenceid= resp[0]["core|doseevents"]._sequenceid;; 
      //  this.appService.DoseEvents.push(<DoseEvents>JSON.parse(JSON.stringify(this.doseEvents)));
      this.appService.UpdateDataVersionNumber(resp);

      this.dr.getDoseEvents(() => {
        this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
        this.hideAdministrationForm.emit(true);
      })
      upsertManager.destroy();
      // this.appService.DoseEvents.push(resp);           

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.hideAdministrationForm.emit(true);

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );

  }

  addDoseEvent(): void {

    let doseEvents = {};
    let isTransferPermitted = true;

    if (this.editpopuptypetype == 'Cancel Event') {

      isTransferPermitted = false;

      if (!this.cancelEventComments || this.cancelEventComments.trim() == '') {
        this.validationMessage = 'Please enter the comment';
        return;
      } else if (this.cancelEventComments.trim().length < 2) {
        this.validationMessage = 'Comment should have min. 2 characters.';
        return;
      } else {
        this.cancelEvent();
      }
    } else if (this.editpopuptypetype == 'Prescriber\'s comments') {

      if (!this.doctorComments || this.doctorComments.trim() == '') {
        this.validationMessage = 'Please enter the comment';
        isTransferPermitted = false;
        return;
      }

      let existingDoseEvent = this.appService.DoseEvents.find(e => e.dose_id == this.dose.dose_id.split('_')[1]
        && e.posology_id == this.dose.posology_id
        && e.eventtype == 'Comment' && e.iscancelled == false);

      let newDoseEventId: string;

      if (existingDoseEvent) {
        newDoseEventId = existingDoseEvent.doseevents_id;
      } else {
        newDoseEventId = uuid();
      }

      doseEvents = {
        doseevents_id: newDoseEventId,
        dose_id: this.dose.dose_id.split('_')[1],
        posology_id: this.dose.posology_id,
        startdatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
        eventtype: 'Comment',
        dosedatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
        comments: this.doctorComments,
        logicalid: this.dose.dose_id,
        iscancelled: false,
        createdon :this.appService.getDateTimeinISOFormat(moment().toDate()),
        modifiedon : this.appService.getDateTimeinISOFormat(moment().toDate()),
        createdby : this.appService.loggedInUserName,
        modifiedby : this.appService.loggedInUserName,
      };
      this.isSaving = true;
      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=doseevents", doseEvents).subscribe(
        (response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.dr.getDoseEvents(() => {
            this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
            this.isSaving = false;
            this.hideAdministrationForm.emit(true);
          })
        }, (error) => {
          this.isSaving = false;
          this.hideAdministrationForm.emit(true);
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        }));
    } else if (this.editpopuptypetype == 'Transfer') {
      let transferdate = moment(new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate(), +this.startTime.split(':')[0], +this.startTime.split(':')[1]));
      if (this.startDate == null || this.startDate.toString() == '') {
        this.validationMessage = 'Please select the transfer date';
        isTransferPermitted = false;
        return;
      }

      else if (moment(transferdate) <= moment(this.appService.encounter.sortdate)) {
        this.validationMessage = 'The time of transfer cannot be earlier than the Admission date/time';
        isTransferPermitted = false;
        return;
      }
      else if (moment(this.prescription.__posology.find(x => x.posology_id == this.dose.posology_id).prescriptionenddate).isValid && moment(transferdate) >= moment(this.prescription.__posology.find(x => x.posology_id == this.dose.posology_id).prescriptionenddate)) {
        this.validationMessage = 'The time of transfer cannot be beyond the prescription end date/time or posology modification date/time. ';
        isTransferPermitted = false;
        return;
      }

      let doselist = [];

      if (this.dose.isinfusion && this.appService.Prescription.find(p => p.prescription_id == this.dose.prescription_id).__posology.find(po => po.posology_id == this.dose.posology_id).infusiontypeid != "bolus") {
        if (this.appService.Prescription.find(p => p.prescription_id == this.dose.prescription_id).__posology.find(po => po.posology_id == this.dose.posology_id).infusiontypeid == "ci" ||
          this.appService.Prescription.find(p => p.prescription_id == this.dose.prescription_id).__posology.find(po => po.posology_id == this.dose.posology_id).infusiontypeid == "rate" ||
          this.appService.Prescription.find(p => p.prescription_id == this.dose.prescription_id).__posology.find(po => po.posology_id == this.dose.posology_id).infusiontypeid == InfusionType.pca) {
          isTransferPermitted = false;
          this.isSaving = true;
          this.dr.transferRateInfution(this.dose, this.startDate, this.startTime, false, (message) => {
            if (message == "success") {
              this.dr.getDoseEvents(() => {
                this.isSaving = false;
                this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
                this.hideAdministrationForm.emit(true);
              })

            }
            else {
              this.isSaving = false;
              this.validationMessage = message;
              isTransferPermitted = false;
            }
          });



        }

        // // }
        // // else{
        // doselist = this.appService.events.filter(p => p.posology_id === this.dose.posology_id && !p.dose_id.includes("dur") && !p.dose_id.includes("flowrate") && !p.dose_id.includes("bolus"));
        // // }
      } else {
        doselist = this.appService.events.filter(x => x.posology_id == this.dose.posology_id);


        let newDoseList = [];
        //New Transfer Date and Time
        let newDoseDateTime = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate(), +this.startTime.split(':')[0], +this.startTime.split(':')[1]);

        let index = 0;

        //Event can be transferred min of 7 days before today
        let minDoseDateTime = new Date();
        minDoseDateTime.setDate(minDoseDateTime.getDate() - 7);

        //Transfer is not permitted beyond prescription start date
        if (this.appService.encounter.sortdate) {
          let timeDiff = minDoseDateTime.getTime() - new Date(this.appService.encounter.sortdate).getTime();
          if (timeDiff < 0) {
            minDoseDateTime = new Date(this.appService.encounter.sortdate);
          }
        }

        //Event can be transferred max of 7 days from today
        let maxDoseDateTime = new Date();
        maxDoseDateTime.setDate(maxDoseDateTime.getDate() + 7);

        //Get all the dates into an array
        while (index < doselist.length) {
          let m = (doselist[index].eventStart)._d;
          newDoseList.push(m);
          index++;
        }

        //sort the array by asc
        newDoseList.sort((date1, date2) => {
          if (date1 > date2) return 1;
          if (date1 < date2) return -1;
          return 0;
        }
        );

        let startDateTime = this.dose.isinfusion == true ? this.dose.dose_id.split('_')[1] : this.dose.dose_id.split('_')[0];

        let transferingDate = (this.dose.eventStart)._d;

        index = 0;
        let minDate = minDoseDateTime;
        let maxDate = maxDoseDateTime;

        //Identify the position of the transfering event
        while (index < newDoseList.length) {
          if (transferingDate.getTime() == new Date(newDoseList[index]).getTime()) {
            break;
          }
          index++;
        }

        if (index > 0) {
          minDate = new Date(newDoseList[index - 1]);
          minDate.setMinutes(minDate.getMinutes() + this.appService.administrationTimeDiffInMinute);
        }

        if (newDoseList.length > index + 1) {
          maxDate = new Date(newDoseList[index + 1]);
          maxDate.setMinutes(maxDate.getMinutes() - this.appService.administrationTimeDiffInMinute);
        }

        if (newDoseDateTime <= minDate) {
          // this.validationMessage = `Transfer between ${moment(minDate).format('MM/DD/YYYY HH:mm')} 
          // and ${moment(maxDate).format('MM/DD/YYYY HH:mm')}.`;
          // this.validationMessage = `You can only transfer to a time between the last 
          // ${moment(minDate).format('DD/MM/YYYY HH:mm')} and the next ${moment(maxDate).format('DD/MM/YYYY HH:mm')} administration events`;
          this.validationMessage = "The administration event cannot be transferred too close to the previous event.";
          isTransferPermitted = false;
          return;
        }

        if (newDoseDateTime >= maxDate) {
          // this.validationMessage = `Transfer between ${moment(minDate).format('MM/DD/YYYY HH:mm')} 
          // and ${moment(maxDate).format('MM/DD/YYYY HH:mm')}.`;
          // this.validationMessage = `You can only transfer to a time between the last 
          // ${moment(minDate).format('DD/MM/YYYY HH:mm')} and the next ${moment(maxDate).format('DD/MM/YYYY HH:mm')} administration events`;
          this.validationMessage = "The administration event cannot be transferred to a time after the next administration event.";

          isTransferPermitted = false;
          return;
        }

        let newDoseEventId: string = '';
        let newDoseId: string = '';
        let existingDoseEvent: DoseEvents = new DoseEvents();

        if (this.dose.isinfusion) {
          existingDoseEvent = this.appService.DoseEvents.find(e => e.logicalid == this.dose.dose_id
            && e.posology_id == this.dose.posology_id
            && e.eventtype == 'Transfer' && e.iscancelled == false);
        } else {
          existingDoseEvent = this.appService.DoseEvents.find(e => e.logicalid == this.dose.dose_id
            && e.posology_id == this.dose.posology_id
            && e.eventtype == 'Transfer' && e.iscancelled == false);
        }

        if (existingDoseEvent) {
          newDoseEventId = existingDoseEvent.doseevents_id;
        } else {
          newDoseEventId = uuid();
        }

        if (this.dose.isinfusion) {
          newDoseId = this.dose.dose_id.split('_')[2];
        } else {
          newDoseId = this.dose.dose_id.split('_')[1];
        }
         let fromDate = moment(startDateTime.slice(0, 4) + "-" + startDateTime.slice(4, 6) + "-" + startDateTime.slice(6, 8) + "T" + startDateTime.slice(8, 10) + ":" + startDateTime.slice(10, 12), "YYYY-MM-DDTHH:mm").toDate();
        doseEvents = {
          doseevents_id: newDoseEventId,
          dose_id: newDoseId,
          posology_id: this.dose.posology_id,
          startdatetime:this.appService.getDateTimeinISOFormat(fromDate),
          eventtype: 'Transfer',
          dosedatetime: this.appService.getDateTimeinISOFormat(newDoseDateTime),
          iscancelled: false,
          logicalid: this.dose.dose_id,
          createdon :this.appService.getDateTimeinISOFormat(moment().toDate()),
          modifiedon : this.appService.getDateTimeinISOFormat(moment().toDate()),
          createdby : this.appService.loggedInUserName,
          modifiedby : this.appService.loggedInUserName,
        };
      }

      if (isTransferPermitted) {
        this.isSaving = true;
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=doseevents", doseEvents).subscribe(
          (response) => {
            this.appService.UpdateDataVersionNumber(response);

            // let doseEventsobject: DoseEvents;
            // doseEventsobject = <DoseEvents>response[0];
            // this.appService.DoseEvents.push(doseEventsobject);

            this.dr.getDoseEvents(() => {
              this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
              this.hideAdministrationForm.emit(true);
            })


          }, (error) => {
            this.hideAdministrationForm.emit(true);
            if (this.appService.IsDataVersionStaleError(error)) {
              this.appService.RefreshPageWithStaleError(error);
            }
          }));
      }
    }
  }


  closepopup() {
    this.hideAdministrationForm.emit(false);
  }

  private getLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }

  onTimeSelected(event: string) {
    this.startTime = event;
  }

}

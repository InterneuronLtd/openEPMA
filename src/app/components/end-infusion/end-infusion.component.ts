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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { InfusionEvents, Medicationadministration, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
@Component({
  selector: 'app-end-infusion',
  templateUrl: './end-infusion.component.html',
  styleUrls: ['./end-infusion.component.css']
})
export class EndInfusionComponent implements OnInit, OnDestroy {
  showPauseInfusion: boolean = false;
  showSpinner: boolean = false;
  prescription: Prescription;
  dose: any;
  administration: Medicationadministration;
  @Input('event') event: any
  subscriptions = new Subscription();
  administrationstartime: any;
  infusionEvents: InfusionEvents = new InfusionEvents();
  deleteInfusionEvents: InfusionEvents = new InfusionEvents();
  minDate: Date;
  maxDate: Date;
  startime: string = moment(new Date()).format('HH:mm');
  stardate: string = moment(new Date()).format('DD-MM-YYYY');
  validatiommessage: string = "";
  comments: string = "";
  logicalId: string = "";
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {

  }

  ngOnInit(): void {
    this.prescription = this.event.prescription;
    this.dose = this.event.dose;
    this.administration = this.event.administration;
    let d = Object.assign({}, this.dose);
    this.administration.planneddatetime = moment(new Date(d.eventStart)).format('YYYY-MM-DD HH:mm');
    this.logicalId = d.dose_id;
    this.maxDate = new Date();
    this.minDate = new Date();
    this.comments = "";
    this.validatiommessage = "";
    this.startime = moment(new Date()).format('HH:mm');
    this.stardate = moment(new Date()).format('DD-MM-YYYY');
    let infusionEventRecord = this.appService.InfusionEvents.find(e => e.logicalid == this.logicalId);
    if (infusionEventRecord) {
      this.infusionEvents = Object.assign({}, infusionEventRecord);
    } else {
      this.infusionEvents = null;
    }
    this.setMinMaxDate();
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  closePopup() {
    this.subjects.closeAppComponentPopover.next();
    //this.hideEndInfusionForm.emit()
  }
  saveEndInfusion() {
    this.administrationstartime = moment(this.stardate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.endValidation();
    if (this.validatiommessage != "") {
      return;
    }


    this.infusionEvents.eventdatetime = this.appService.getDateTimeinISOFormat(moment(this.administrationstartime, "YYYY-MM-DD HH:mm").toDate());

    this.infusionEvents.logicalid = this.logicalId;
    this.infusionEvents.posology_id = this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).posology_id;
    this.infusionEvents.eventtype = "endinfusion";
    this.infusionEvents.comments = this.comments;
    this.infusionEvents.administeredby = this.appService.loggedInUserName;

    delete this.infusionEvents._sequenceid;


    this.appService.logToConsole(this.infusionEvents);
    this.showSpinner = true;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
    let linkedInfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == this.prescription.prescription_id);
    for (let infusion of linkedInfusion) {

      if (!this.appService.Medicationadministration.find(x => x.dose_id == this.appService.GetCurrentPosology(infusion).__dose.find(x => x.continuityid == null).dose_id)) {
        let startDose = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).find(x => x.prescription_id == infusion.prescription_id && x.continuityid == null);
        var duration = moment.duration(moment(this.administrationstartime).diff(moment(startDose.dosestartdatetime)));
        var diffMinutes = duration.asMinutes();
        startDose.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(startDose.dosestartdatetime).add(diffMinutes, "minutes").toDate());
        this.appService.GetCurrentPosology(infusion).prescriptionstartdate = startDose.dosestartdatetime;
        if (startDose.doseenddatatime) {
          startDose.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(startDose.doseenddatatime).add(diffMinutes, "minutes").toDate());
        }
        if (this.appService.GetCurrentPosology(infusion).prescriptionenddate) {
          this.appService.GetCurrentPosology(infusion).prescriptionenddate = startDose.doseenddatatime;
        }
        let doseobject = Object.assign({}, startDose);
        let posologyobject = Object.assign({}, this.appService.GetCurrentPosology(infusion));

        Object.keys(posologyobject).map((e) => { if (e.startsWith("_")) delete posologyobject[e]; });
        Object.keys(doseobject).map((e) => { if (e.startsWith("_")) delete doseobject[e]; });

        upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobject)));
        upsertManager.addEntity('core', 'posology', JSON.parse(JSON.stringify(posologyobject)));

        let allDoses = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(x => x.prescription_id == infusion.prescription_id && x.continuityid == startDose.dose_id);
        for (let flowdoses of allDoses) {
          flowdoses.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(flowdoses.dosestartdatetime).add(diffMinutes, "minutes").toDate());
          flowdoses.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(flowdoses.doseenddatatime).add(diffMinutes, "minutes").toDate());
          let doseobjectflow = Object.assign({}, flowdoses);
          Object.keys(doseobjectflow).map((e) => { if (e.startsWith("_")) delete doseobjectflow[e]; });
          upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobjectflow)));
        }

      }
    }

    upsertManager.save((response) => {
      this.appService.UpdateDataVersionNumber(response);

      let linkedInfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == this.prescription.prescription_id);
      if(linkedInfusion.length>0) {
        this.dr.getAllPrescription(() => {
          this.dr.getInfusionEvents(() => {
            this.showSpinner = false;
            this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
              this.subjects.reloadCurrentModule.next();
             this.subjects.closeAppComponentPopover.next();
            });
          });
        });
      } else {
        this.dr.getInfusionEvents(() => {
          this.showSpinner = false;
          this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
            this.subjects.refreshDrugChart.next();
           this.subjects.closeAppComponentPopover.next();
          });
        });
      }
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );
  }
  setMinMaxDate() {
    this.maxDate = new Date();
    this.minDate = new Date(this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).__dose[0].dosestartdatetime);
    // check for exisiting event
    if (this.infusionEvents) {
      this.comments = this.infusionEvents.comments;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.stardate = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      this.startime = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("HH:mm");
    } else {
      this.infusionEvents = new InfusionEvents();
      this.infusionEvents.infusionevents_id = uuid();
      this.infusionEvents.dose_id = uuid();
      this.infusionEvents.administeredby = this.appService.loggedInUserName;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.planneddatetime = this.appService.getDateTimeinISOFormat(moment(moment(new Date(this.dose.eventStart)).format('YYYY-MM-DD HH:mm')).toDate());
    }
    let infusionData = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.prescription_id == this.prescription.prescription_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
    var index = infusionData.indexOf(infusionData.find(e => e.dose_id == this.logicalId));
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
    this.minDate = moment(this.minDate, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  endValidation() {
    this.validatiommessage = "";
    var doseStart = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");
    var administeredTime = moment(moment(this.administrationstartime, "YYYY-MM-DD HH:mm")).format("YYYYMMDDHHmm");
    var doseEnd = moment(moment(this.maxDate).toDate()).format("YYYYMMDDHHmm");
    var administered = this.appService.InfusionEvents.sort((a, b) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(e => e.posology_id == this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).posology_id);
    if (!administered) {
      this.validatiommessage = "This infusion is not administered";
      return;
    }
    if (doseStart >= doseEnd) {
      this.validatiommessage = "Please try later, You cannot end infusion after immediate administration";
      return;
    }
    if (administeredTime <= doseEnd && administeredTime >= doseStart) {
      this.validatiommessage = "";
    } else {
      this.validatiommessage = "Administered date time must be between " + moment(moment(this.minDate).toDate()).format("DD-MM-YYYY HH:mm") + " and " + moment(moment(this.maxDate).toDate()).format("DD-MM-YYYY HH:mm");
    }
  }
}

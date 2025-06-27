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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { InfusionEvents, Medication, Medicationadministration, Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { DoseType } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { v4 as uuid } from 'uuid';
@Component({
  selector: 'app-add-bolus',
  templateUrl: './add-bolus.component.html',
  styleUrls: ['./add-bolus.component.css']
})
export class AddBolusComponent implements OnInit, OnDestroy {
  //showAddBolus: boolean = false;
  prescription: Prescription;
  medication: Medication;
  dosesize: string = "";
  strengthneumerator: number;
  strengthdenominator: number;
  showSpinner: boolean = false;
  subscriptions = new Subscription();
  administration: Medicationadministration = new Medicationadministration();
  infusionEvents: InfusionEvents = new InfusionEvents();
  minDate: Date;
  maxDate: Date;
  startime: string = moment(new Date()).format('HH:mm');
  stardate: string = moment(new Date()).format('DD-MM-YYYY');
  validatiommessage: string = "";
  comments: string = "";
  doeseType: string;
  currentposology: Posology;
  @Input('event') event: any
  expirydate: any;
  currDate: Date;
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {
    this.appService.logToConsole("Subscribed addBolus");



  }
  volumeFordose() {
    // IF dose entered is 10mg, then 
    // Ratio r = concentration dose/entered dose = 10/10 = 1
    // Volume = concentration volume/r = 100/1 = 100 ml
    // Calculated dose = 10mg/100ml. 
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthneumerator / this.strengthneumerator;
      const volume = this.medication.strengthdenominator / ratio;
      this.strengthdenominator = parseFloat(volume.toFixed(2));
    }
  }

  doseForVolume() {
    // IF volume entered is 10ml, then 
    // Ratio r= concentration volume/entered volume = 100/10 = 10
    // Dose = concentration dose/r = 10/10 = 1 mg
    // Calculated dose = 1mg/10ml
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthdenominator / this.strengthdenominator;
      const volume = this.medication.strengthneumerator / ratio;
      this.strengthneumerator = parseFloat(volume.toFixed(2));;
    }
  }
  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {

    //this.showAddBolus = true;
    this.prescription = event.prescription;
    this.currentposology = this.appService.GetCurrentPosology(this.prescription);
    this.medication = this.prescription.__medications.find(e => e.isprimary == true);
    this.validatiommessage = "";
    this.comments = "";
    this.dosesize = "";
    this.strengthneumerator = null;
    this.strengthdenominator = null;
    this.startime = moment(new Date()).format('HH:mm');
    this.stardate = moment(new Date()).format('DD-MM-YYYY');
    this.infusionEvents = new InfusionEvents();
    this.administration = new Medicationadministration();
    this.showSpinner = false;
    this.doeseType = this.currentposology.dosetype;
    this.setMinMaxDate(event);

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  closePopup() {
    // this.showAddBolus = false;
    this.subjects.closeAppComponentPopover.next();
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  saveBolus() {
    this.administration.administrationstartime = moment(this.stardate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.bolusValidation()
    if (this.validatiommessage != "") {
      return;
    }
    let correctionId = uuid();
    this.administration.correlationid = correctionId;
    this.infusionEvents.correlationid = correctionId;
    this.administration.dose_id = this.infusionEvents.dose_id;
    this.administration.administrationstartime = this.appService.getDateTimeinISOFormat(moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm").toDate());
    this.infusionEvents.planneddatetime = this.administration.administrationstartime;
    //this.administration.logicalid = "bolus_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    if (this.doeseType == DoseType.units) {
      this.administration.planneddosesize = this.dosesize;
      this.administration.planneddoseunit = this.currentposology.__dose[0].doseunit;
      this.administration.administreddosesize = this.dosesize;
      this.administration.administreddoseunit = this.currentposology.__dose[0].doseunit;
    }
    if (this.doeseType == DoseType.strength) {
      this.administration.plannedstrengthneumerator = this.strengthneumerator;
      this.administration.plannedstrengthneumeratorunits = this.currentposology.__dose[0].strengthneumeratorunit;
      this.administration.plannedstrengthdenominator = this.strengthdenominator;
      this.administration.plannedstrengthdenominatorunits = this.currentposology.__dose[0].strengthdenominatorunit;

      this.administration.administeredstrengthneumerator = this.strengthneumerator;
      this.administration.administeredstrengthneumeratorunits = this.currentposology.__dose[0].strengthneumeratorunit;
      this.administration.administeredstrengthdenominator = this.strengthdenominator;
      this.administration.administeredstrengthdenominatorunits = this.currentposology.__dose[0].strengthdenominatorunit;

    }

    this.administration.prescription_id = this.prescription.prescription_id;
    this.administration.posology_id = this.currentposology.posology_id;
    this.administration.person_id = this.appService.personId;
    this.administration.encounter_id = this.appService.encounter.encounter_id;
    this.administration.medication_id = this.medication.medication_id;
    this.administration.comments = this.comments;
    this.administration.administredby = this.appService.loggedInUserName;
    
    this.infusionEvents.dose_id = this.administration.dose_id;
    this.infusionEvents.eventdatetime = this.administration.administrationstartime;
    this.infusionEvents.planneddatetime = this.administration.administrationstartime;
    if (this.expirydate) {
      this.infusionEvents.expirydate = this.appService.getDateTimeinISOFormat(moment(this.expirydate, "DD-MM-YYYY HH:mm").toDate());
    }
    this.infusionEvents.logicalid = this.administration.logicalid;
    this.infusionEvents.posology_id = this.currentposology.posology_id;
    this.infusionEvents.eventtype = "bolus";
    this.infusionEvents.comments = this.comments;
    

    delete this.infusionEvents._sequenceid;
    this.appService.logToConsole(this.administration);
    this.appService.logToConsole(this.infusionEvents);
    this.showSpinner = true;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
    upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.administration)));
    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();
      this.dr.getAdminstrations(() => {
        //this.showAddBolus = false;
        this.showSpinner = false;
        this.subjects.refreshDrugChart.next("Refresh");
        this.subjects.closeAppComponentPopover.next();
      });

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.subjects.closeAppComponentPopover.next();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
  }
  bolusValidation() {
    this.validatiommessage = "";
    var doseStart = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");
    var administeredTime = moment(moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm")).format("YYYYMMDDHHmm");
    var doseEnd = moment(moment(this.maxDate).toDate()).format("YYYYMMDDHHmm");
    var administered = this.appService.InfusionEvents.sort((a, b) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(e => e.posology_id == this.currentposology.posology_id);
    if (!administered) {
      this.validatiommessage = "This infusion is not administered";
      return;
    }
    if (this.doeseType == DoseType.units) {
      if (!this.dosesize) {
        this.validatiommessage = "Please enter a valid dose.";
        return;
      }
    }
    if (this.doeseType == DoseType.strength) {
      if (!this.strengthneumerator) {
        this.validatiommessage = "Please enter a valid strength neumerator.";
        return;
      }
      if (!this.strengthdenominator) {
        this.validatiommessage = "Please enter a valid strength denominator.";
        return;
      }
    }
    if (doseStart >= doseEnd) {
      this.validatiommessage = "Please try later, You cannot add bolus after immediate administration";
      return;
    }
    if (administeredTime <= doseEnd && administeredTime >= doseStart) {
      this.validatiommessage = "";
    } else {
      this.validatiommessage = "Administered date time must be between " + moment(moment(this.minDate).toDate()).format("DD-MM-YYYY HH:mm") + " and " + moment(moment(this.maxDate).toDate()).format("DD-MM-YYYY HH:mm");
    }
  }

  setMinMaxDate(event) {
    this.maxDate = new Date();
    this.minDate = new Date(this.currentposology.__dose[0].dosestartdatetime);
   
    // check for exisiting event
    if (event.infusionEvents) {
      this.infusionEvents = event.infusionEvents;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      // for update exsiting event
      if (event.infusionEvents.expirydate) {
        this.expirydate = moment(event.infusionEvents.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      }
      this.comments = this.infusionEvents.comments;
      this.stardate = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      this.startime = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("HH:mm");
      let infusionData = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
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
      this.infusionEvents.administeredby = this.appService.loggedInUserName;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.dosesize = null;
      let eventRecord = this.appService.events.sort((b, a) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
      let doneInfusion = eventRecord.find(e => e.admitdone);
      let notDoneInfusion = eventRecord.slice().filter(x => moment(x.eventStart).isAfter(doneInfusion.eventStart)).reverse().find(e => !e.admitdone)
      this.appService.logToConsole(eventRecord);
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
     // check for exssting administration
     if (event.administration) {
      this.administration = event.administration;
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      if (this.doeseType == DoseType.units) {
        this.dosesize = this.administration.administreddosesize;
      }
      if (this.doeseType == DoseType.strength) {
        this.strengthneumerator = this.administration.administeredstrengthneumerator;
        this.strengthdenominator = this.administration.administeredstrengthdenominator;
      }

    } else {
      this.administration.medicationadministration_id = uuid();
      this.administration.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.logicalid = "bolus_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    }
    this.minDate = moment(this.minDate, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
}

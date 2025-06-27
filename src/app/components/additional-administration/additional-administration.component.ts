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
import { Component, Input, OnInit } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Dose, Medication, Medicationadministration, Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { AdministrationStatus, AdministrationStatusReason, LevelOfSelfAdmin, AdministrationType, DoseType } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import { InfusionEvents } from '../../models/EPMA';
@Component({
  selector: 'app-additional-administration',
  templateUrl: './additional-administration.component.html',
  styleUrls: ['./additional-administration.component.css']
})
export class AdditionalAdministrationComponent implements OnInit {
  prescription: Prescription;
  currentposology: Posology;
  administration: Medicationadministration = new Medicationadministration();
  medication: Medication = new Medication();
  dose: Dose = new Dose();
  subscriptions = new Subscription();
  minDate: Date;
  maxDate: Date;
  validatiommessage: string = "";
  headerLabel = "";
  adminstrationType: string;
  showSpinner: boolean = false;
  doseStarTime: string;
  doseStartDate: string;
  @Input('event') event: any

  public administrationStatus: typeof AdministrationStatus = AdministrationStatus;
  public administrationStatusReason: typeof AdministrationStatusReason = AdministrationStatusReason;
  public levelOfSelfAdmin: typeof LevelOfSelfAdmin = LevelOfSelfAdmin;
  vtm_dose_units: unknown[];
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {
    this.appService.logToConsole("Subscribed additional");



  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.doseStarTime = startime;
  }
  closePopup() {
    // this.appService.openAdditionalAdministration = false;
    this.subjects.closeAppComponentPopover.next(undefined);
  }
  saveAdministrationForm() {
    this.dose.dosestartdatetime = moment(this.doseStartDate, "DD-MM-YYYY").format("DD-MM-YYYY") + " " + this.doseStarTime;
    this.additionalValidation();
    if (this.validatiommessage != "") {
      return;
    }

    let correlationid = uuid();
    this.dose.dose_id = uuid();
    this.dose.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(this.dose.dosestartdatetime, 'DD-MM-YYYY HH:mm').toDate());
    this.dose.doseenddatatime = this.dose.dosestartdatetime;
    this.dose.isadditionaladministration = true;
    let logicalid = this.createLogicalId(this.dose.dosestartdatetime, this.dose.dose_id);
    Object.keys(this.dose).map((e) => { if (e.startsWith("_")) delete this.dose[e]; })
    this.validatiommessage = "";
    this.appService.logToConsole(this.dose);
    this.showSpinner = true;
    if (this.adminstrationType == AdministrationType.schedule) {
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=core&synapseentityname=dose', JSON.stringify(this.dose))
          .subscribe((response) => {
            this.appService.UpdateDataVersionNumber(response);

            // this.appService.openAdditionalAdministration = false;
            this.showSpinner = false;
            // let d:Dose;
            // d= <Dose>JSON.parse(JSON.stringify(response[0]));
            this.dose.__doseEvent = [];
            // this.appService.Dose.push(this.dose);
            // this.currentposology.__dose.push(this.dose);
            this.dr.updateDoseForPrescription(this.prescription.prescription_id, () => {
              this.subjects.refreshDrugChart.next("Refresh");
              this.subjects.closeAppComponentPopover.next(undefined);
            });



          }, (error) => {
            this.showSpinner = false;
            this.subjects.closeAppComponentPopover.next(undefined);

            if (this.appService.IsDataVersionStaleError(error)) {
              this.appService.RefreshPageWithStaleError(error);
            }
          })
      )
    }

    if (this.adminstrationType == AdministrationType.record) {
      if(this.currentposology.infusiontypeid=="bolus") {
        this.administration.logicalid = "start_" + logicalid;
      } else {
        this.administration.logicalid = logicalid;
      }
      this.administration.medicationadministration_id = uuid();
      this.administration.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.dose_id = this.dose.dose_id;
      this.administration.prescription_id = this.prescription.prescription_id;
      this.administration.posology_id = this.currentposology.posology_id;
      this.administration.person_id = this.appService.personId;
      this.administration.encounter_id = this.appService.encounter.encounter_id;
      this.administration.medication_id = this.medication.medication_id;
      this.administration.prescriptionroutesid = this.prescription.__routes[0].prescriptionroutes_id;
      this.administration.requestresupply = false;
      this.administration.planneddatetime = this.dose.dosestartdatetime;
      this.administration.routename = this.prescription.__routes.find(e => e.isdefault).route;
      this.administration.administrationstartime = this.administration.planneddatetime;
      this.administration.adminstrationstatus = AdministrationStatus.given;
      this.administration.comments = this.dose.additionaladministrationcomment;
      this.administration.correlationid = correlationid;
      this.administration.administredby = this.appService.loggedInUserName;

      this.administration.isadhoc = true;
      this.administration.isenterinerror =false;
      if (this.currentposology.dosetype == DoseType.units) {
        this.administration.planneddosesize = this.dose.dosesize;
        this.administration.planneddoseunit = this.dose.doseunit;
        this.administration.planneddosemeasure = this.dose.dosemeasure;

        this.administration.administreddosesize = this.dose.dosesize;
        this.administration.administreddoseunit = this.dose.doseunit;
        this.administration.administreddosemeasure = this.dose.dosemeasure;

      }
      if (this.currentposology.dosetype == DoseType.strength) {
        this.administration.plannedstrengthneumerator = this.dose.strengthneumerator;
        this.administration.plannedstrengthneumeratorunits = this.dose.strengthneumeratorunit;
        this.administration.plannedstrengthdenominator = this.dose.strengthdenominator;
        this.administration.plannedstrengthdenominatorunits = this.dose.strengthdenominatorunit;

        this.administration.administeredstrengthneumerator = this.dose.strengthneumerator;
        this.administration.administeredstrengthneumeratorunits = this.dose.strengthneumeratorunit;
        this.administration.administeredstrengthdenominator = this.dose.strengthdenominator;
        this.administration.administeredstrengthdenominatorunits = this.dose.strengthdenominatorunit;
      }
      if (this.currentposology.dosetype == DoseType.descriptive) {
        this.administration.administereddescriptivedose = this.dose.descriptivedose;
      }
     

      Object.keys(this.dose).map((e) => { if (e.startsWith("_")) delete this.dose[e]; })
      Object.keys(this.administration).map((e) => { if (e.startsWith("_")) delete this.administration[e]; })
      this.appService.logToConsole(this.administration);
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
      //upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(this.dose)));
      if(this.currentposology.infusiontypeid=="bolus") {
        let infusionEvents = new InfusionEvents();
        infusionEvents.infusionevents_id = uuid();
        infusionEvents.dose_id = this.administration.dose_id;
        infusionEvents.eventdatetime = this.administration.administrationstartime;
        infusionEvents.planneddatetime = this.administration.planneddatetime;
        infusionEvents.logicalid = this.administration.logicalid;
        infusionEvents.posology_id = this.currentposology.posology_id;
        infusionEvents.comments = this.administration.comments;
        infusionEvents.correlationid = correlationid;
        infusionEvents.eventtype = "administered";
        Object.keys(infusionEvents).map((e) => { if (e.startsWith("_")) delete infusionEvents[e]; })
        upsertManager.addEntity('core', "infusionevents", JSON.parse(JSON.stringify(infusionEvents)));
      }
      upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.administration)));
      upsertManager.save((resp) => {
        this.appService.logToConsole(resp);
        this.appService.UpdateDataVersionNumber(resp);

        upsertManager.destroy();
        // this.appService.openAdditionalAdministration = false;
        this.showSpinner = false;
        //let doseResp= <Dose>resp[0]["core|dose"];
        //let adminResp= <Medicationadministration>resp[1]["core|medicationadministration"];

        // This need to uncomment when we decided to push into dose while we will record additional administration
        //this.appService.Dose.push(this.dose); 
        // this.currentposology.__dose.push(this.dose);     
        //this.appService.Medicationadministration.push(this.administration);
        this.dr.getAdminstrations(() => {
          this.subjects.refreshDrugChart.next("Refresh");
          this.subjects.closeAppComponentPopover.next(undefined);
        })
      },
        (error) => {
          this.appService.logToConsole(error);
          upsertManager.destroy();
          this.subjects.closeAppComponentPopover.next(undefined);

          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        }
      );
    }
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  ngOnInit(): void {
    this.init(this.event);
  }

  init(event: any) {

    // this.appService.openAdditionalAdministration = true;
    this.administration = new Medicationadministration();
    this.medication = new Medication();
    this.prescription = event.prescription;
    this.currentposology = this.appService.GetCurrentPosology(this.prescription);
    this.dose = Object.assign({}, this.currentposology.__dose[0]);
    Object.keys(this.dose).map((e) => { if (e.startsWith("_")) delete this.dose[e]; })
    this.medication = this.prescription.__medications.find(e => e.isprimary == true);
    this.appService.logToConsole(this.appService.events);
    this.adminstrationType = event.type;
    this.dose.additionaladministrationcomment = "";
    if (this.prescription.titration) {
      this.dose.dosesize = null;
      this.dose.strengthneumerator = null;
      this.dose.strengthdenominator = null;
    }
    this.doseStarTime = moment(new Date()).format('HH:mm');
    this.doseStartDate = moment(new Date()).format('DD-MM-YYYY');
    this.validatiommessage = "";
    if (this.adminstrationType == AdministrationType.record) {
      this.headerLabel = "Record additional administration";
      this.minDate = moment(this.currentposology.prescriptionstartdate, "YYYY-MM-DD HH:mm").toDate();
      this.maxDate = new Date();
    } else {
      this.headerLabel = "Schedule additional administration";
      this.minDate = new Date();
      this.maxDate = null;
    }
    this.vtm_dose_units = [...new Set(this.medication.__ingredients.map(ig => ig.strengthneumeratorunit))];
    this.vtm_dose_units.sort();
    if(!this.medication.name.startsWith("Warfarin")) {
      this.dr.SetUnits(this.medication.__codes[0].code, (data)=> {
        this.dose.doseunit = data;
      });  
    }
    if(this.medication.name.startsWith("Warfarin") && this.prescription.titration) {
      this.dose.doseunit = "mg";
    }

  }
  additionalValidation() {
    this.validatiommessage = "";
    if (this.adminstrationType == AdministrationType.record) {
      if (this.currentposology.dosetype == DoseType.units) {
        if (!this.dose.dosesize) {
          this.validatiommessage = "Please enter dose";
          return;
        }
      }
      if (this.currentposology.dosetype == DoseType.strength) {
        if (!this.dose.strengthneumerator || !this.dose.strengthdenominator) {
          this.validatiommessage = "Please enter strenth";
          return;
        }
      }
    }
    if (this.adminstrationType == AdministrationType.schedule) {
      if (moment(this.dose.dosestartdatetime, "DD-MM-YYYY HH:mm").format("YYYYMMDDHHmm") < moment(new Date()).format("YYYYMMDDHHmm")) {
        this.validatiommessage = "Administered date time can not be before current date time";
        return;
      }
      let doseExist = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && Math.abs(moment(e.eventStart, "DD-MM-YYYY HH:mm").diff(moment(this.dose.dosestartdatetime, "DD-MM-YYYY HH:mm"), "minutes")) < 5);
      if (doseExist) {
        this.validatiommessage = "Administered date time can not be same as existing dose date time";
        return;
      }
    }
    if (this.adminstrationType == AdministrationType.record) {
      if (moment(this.dose.dosestartdatetime, "DD-MM-YYYY HH:mm").format("YYYYMMDDHHmm") > moment(new Date()).format("YYYYMMDDHHmm")) {
        this.validatiommessage = "Administered date time can not be future date time";
        return;
      }
      let doseExist = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && Math.abs(moment(e.eventStart, "DD-MM-YYYY HH:mm").diff(moment(this.dose.dosestartdatetime, "DD-MM-YYYY HH:mm"), "minutes")) < 5);
      if (doseExist) {
        this.validatiommessage = "Administered date time can not be same as existing dose date time";
        return;
      }
    }
  }

  volumeFordose() {
    // IF dose entered is 10mg, then 
    // Ratio r = concentration dose/entered dose = 10/10 = 1
    // Volume = concentration volume/r = 100/1 = 100 ml
    // Calculated dose = 10mg/100ml. 
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthneumerator / this.dose.strengthneumerator;
      const volume = this.medication.strengthdenominator / ratio;
      this.dose.strengthdenominator = parseFloat(volume.toFixed(2));
    }
  }
  doseForVolume() {
    // IF volume entered is 10ml, then 
    // Ratio r= concentration volume/entered volume = 100/10 = 10
    // Dose = concentration dose/r = 10/10 = 1 mg
    // Calculated dose = 1mg/10ml
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthdenominator / this.dose.strengthdenominator;
      const volume = this.medication.strengthneumerator / ratio;
      this.dose.strengthneumerator = parseFloat(volume.toFixed(2));;
    }
  }
}


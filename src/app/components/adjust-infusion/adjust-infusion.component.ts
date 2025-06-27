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
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { AdministerMedication, AdministerMedicationcodes, AdministerMedicationingredients, AdministrationWitness, InfusionEvents, Medication, Medicationadministration, Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { action } from '../../models/filter.model';
import { v4 as uuid } from 'uuid';
import { timeStamp } from 'console';
import { popovers, RoleAction } from 'src/app/services/enum';

@Component({
  selector: 'app-adjust-infusion',
  templateUrl: './adjust-infusion.component.html',
  styleUrls: ['./adjust-infusion.component.css']
})
export class AdjustInfusionComponent implements OnInit, OnDestroy {

  prescription: Prescription;
  currentposology:Posology;
  medication: Medication;
  infusionrate: number;
  doseunit: string;
  showSpinner: boolean = false;
  Infusionkitchange:boolean=false;
  subscriptions = new Subscription();
  administration: Medicationadministration = new Medicationadministration();
  infusionEvents: InfusionEvents = new InfusionEvents();
  minDate: Date;
  maxDate: Date;
  validatiommessage: string = "";
  comments: string = "";
  startime: string;
  stardate: string;
  @Input('event') event: any
  expirydate: any;
  currDate: Date;
  iswitnessRequired: boolean = false;
  isLoadingMedication: boolean = false;
  authMessage: string;
  username: string;
  password: string;
  isWitnessAuthenticate: boolean = false;
  showSpinnerWitness: boolean = false;
  witnessBtnValue = "Witness authentication";
  witnessDisplayName = "";
  administrationWitness: AdministrationWitness;
  correctionId: string;

 
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {
    this.appService.logToConsole("Subscribed adjustInfusion");


  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {
    this.prescription = event.prescription;
    console.log(event.administration);
    this.currentposology = this.appService.GetCurrentPosology(this.prescription);
    this.medication = this.prescription.__medications.find(e => e.isprimary == true);
    this.validatiommessage = "";
    this.comments = "";
    this.startime = moment(new Date()).format('HH:mm');
    this.stardate = moment(new Date()).format('DD-MM-YYYY');
    this.showSpinner = false;
    this.correctionId = uuid();
    this.infusionEvents = new InfusionEvents();
    this.administration = new Medicationadministration();
    this.setMinMaxDate(event);
    this.getFormularyDetail(this.medication.__codes[0].code,()=> {});
    this.SetNursingInstruction();
  }
  SetNursingInstruction() {
    let nursingInstrruction= this.appService.NursingInstructions.find(x=>x.prescription_id==this.prescription.prescription_id);
    if(this.prescription.__nursinginstructions.length>0 || nursingInstrruction) {
      this.subjects.nursingInstruction.next( { "prescription_id" : this.prescription.prescription_id, "data": this.prescription.__nursinginstructions , "source" : "additional" } );
    }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  closePopup() {
    this.subjects.closeAppComponentPopover.next(popovers["app-adjust-infusion"]);
  }
  saveAdjustInfusion() {
    this.administration.administrationstartime = moment(this.stardate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.adjustInfusionValidation()
    if (this.validatiommessage != "") {
      return;
    }
    // witness authnication
    if (this.administrationWitness && this.administrationWitness.displayname) {
      this.administrationWitness.medicationadministration_id = this.administration.medicationadministration_id;
      this.administrationWitness.logicalid = this.administration.logicalid;
      this.administrationWitness.dose_id = this.administration.dose_id;
    }

    this.administration.dose_id = this.infusionEvents.dose_id;
    this.administration.administrationstartime = this.appService.getDateTimeinISOFormat(moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm").toDate());
    this.administration.planneddatetime = this.administration.administrationstartime;
    this.infusionEvents.planneddatetime = this.administration.administrationstartime;
    //this.administration.logicalid = "addadjust_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    this.administration.plannedinfustionrate = this.infusionrate;
    this.administration.administredinfusionrate = this.infusionrate;
    this.administration.prescription_id = this.prescription.prescription_id;
    this.administration.posology_id = this.currentposology.posology_id;
    this.administration.person_id = this.appService.personId;
    this.administration.encounter_id = this.appService.encounter.encounter_id;
    this.administration.medication_id = this.medication.medication_id;
    this.administration.comments = this.comments;
    this.administration.isinfusionkitchange= this.Infusionkitchange;
    this.administration.correlationid = this.correctionId;
    this.administration.administredby = this.appService.loggedInUserName;
    this.infusionEvents.dose_id = this.administration.dose_id;
    this.infusionEvents.eventdatetime = this.administration.administrationstartime;
    this.infusionEvents.planneddatetime = this.administration.administrationstartime;
    this.infusionEvents.logicalid = this.administration.logicalid;
    this.infusionEvents.posology_id = this.currentposology.posology_id;
    this.infusionEvents.correlationid = this.correctionId;
    if(this.expirydate) {
      this.infusionEvents.expirydate = this.appService.getDateTimeinISOFormat(moment(this.expirydate, "DD-MM-YYYY HH:mm").toDate());
    }
    this.infusionEvents.eventtype = "adjust";
    this.infusionEvents.comments = this.comments;
    delete this.infusionEvents._sequenceid;
    this.appService.logToConsole(this.administration);
    this.appService.logToConsole(this.infusionEvents);
    this.showSpinner = true;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
    upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.administration)));
    if (this.administrationWitness && this.administrationWitness.displayname) {
      upsertManager.addEntity('local', 'epma_administrationwitness', JSON.parse(JSON.stringify(this.administrationWitness)));
    }
    upsertManager.save((resp) => {
      this.appService.logToConsole(resp);
      this.appService.UpdateDataVersionNumber(resp);

      upsertManager.destroy();
      this.dr.getAdminstrations(() => {
        this.dr.GetWitnesAuthentication(() => {
        this.showSpinner = false;
        this.subjects.refreshDrugChart.next("Refresh");
        this.subjects.closeAppComponentPopover.next(popovers["app-adjust-infusion"]);
      });
    });


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
  adjustInfusionValidation() {
    this.validatiommessage = "";
    var doseStart = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");
    var administeredTime = moment(moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm")).format("YYYYMMDDHHmm");
    var doseEnd = moment(moment(this.maxDate).toDate()).format("YYYYMMDDHHmm");
    var administered = this.appService.InfusionEvents.sort((a, b) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(e => e.posology_id == this.currentposology.posology_id);
    if (!administered) {
      this.validatiommessage = "This infusion is not administered";
      return;
    }
    if (this.infusionrate == null || this.infusionrate < 0) {
      this.validatiommessage = "Please enter infusion rate";
      return;
    }
    if (doseStart >= doseEnd) {
      this.validatiommessage = "Please try later, You cannot adjust rate after immediate administration";
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
    
    this.doseunit = this.currentposology.__dose[0].doseunit;
    // check for exisiting event
    if (event.infusionEvents) {
      this.infusionEvents = event.infusionEvents;
      // for update exsiting event
      if (event.infusionEvents.expirydate) {
        this.expirydate = moment(event.infusionEvents.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      }
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
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
      // get previous administer rate
      let padminister = this.appService.Medicationadministration.sort((b, a) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime()).find(x=>x.prescription_id == this.prescription.prescription_id);
      if(padminister) {
        this.infusionrate = padminister.administredinfusionrate;
      } else {
        this.infusionrate = null;
      }
      let eventRecord = this.appService.events.sort((b, a) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
      let doneInfusion = eventRecord.find(e => e.admitdone);
      let notDoneInfusion = eventRecord.slice().filter(x=> moment(x.eventStart).isAfter(doneInfusion.eventStart)).reverse().find(e => !e.admitdone)
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
      this.infusionrate = this.administration.administredinfusionrate;
      this.Infusionkitchange= this.administration.isinfusionkitchange;
      // set witness authnication 
       let witness = this.appService.administrationWitness.find(x => x.medicationadministration_id == this.administration.medicationadministration_id);
       if (witness) {
         this.administrationWitness = new AdministrationWitness();
         this.administrationWitness = witness;
         this.witnessDisplayName = this.administrationWitness.displayname;
         this.administrationWitness.correlationid = this.correctionId;
         this.witnessBtnValue = "Change";
       }
    } else {
      this.administration.medicationadministration_id = uuid();
      this.administration.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.logicalid = "addadjust_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    }
    this.minDate = moment(this.minDate, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  authenticateUser() {
    this.authMessage = "";
    if (!this.username) {
      this.authMessage = "Please enter username";
      return;
    }
    if (!this.password) {
      this.authMessage = "Please enter password";
      return;
    }
    this.showSpinnerWitness = true;
    this.subscriptions.add(this.apiRequest.getRequestWithoutAuth(this.appService.platfromServiceURI + "/Auth/AuthenticateUser?userName=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password))
      .subscribe((resp) => {
        let groups = this.appService.appConfig.AppSettings.GroupsAuthorisedToWitness;
        let isGroupFound = false;
        if (this.appService.appConfig && !this.appService.appConfig.AppSettings.enableRBAC) {
          isGroupFound = true;
        }
        else if (groups && resp) {
          groups.forEach(i => {
            if (resp.memberof && Array.isArray(resp.memberof) && resp.memberof.findIndex(element => element.includes('CN=' + i)) > -1) {
              isGroupFound = true;
            }
          });
        }
        this.appService.logToConsole(resp);

        if (resp && isGroupFound) {
          if (!this.administrationWitness) {
            this.administrationWitness = new AdministrationWitness();
            this.administrationWitness.epma_administrationwitness_id = uuid();
          }
          this.witnessDisplayName = resp.displayname;
          this.isWitnessAuthenticate = false;
          this.witnessBtnValue = "Change";
          this.administrationWitness.displayname = resp.displayname;
          this.administrationWitness.accountname = resp.accountname;
          this.administrationWitness.firstname = resp.firstname;
          this.administrationWitness.lastname = resp.lastname;
          this.administrationWitness.email = resp.email;
          this.administrationWitness.correlationid = this.correctionId;
          this.administrationWitness.administredby = this.appService.loggedInUserName;
          this.administrationWitness.witnessdatetime = this.appService.getDateTimeinISOFormat(moment().toDate());
          this.administrationWitness.person_id = this.appService.personId;
          this.administrationWitness.encounter_id = this.appService.encounter.encounter_id;
        } else {
          this.authMessage = "Unable to authenticate";
        }
        this.showSpinnerWitness = false;

      }, (error) => { console.log(error); this.authMessage = "There was a problem with authentication"; this.showSpinnerWitness = false; }));
  }
  public AuthoriseWitnessAction(action: string, actions: action[]): boolean {
    if (this.appService.appConfig && this.appService.appConfig.AppSettings.enableRBAC)
      return actions.filter(x => x.actionname.toLowerCase().trim() == action.toLowerCase()).length > 0;
    else
      return true;
  }
  openWitnessAuthnication() {
    this.authMessage = "";
    this.username = "";
    this.password = "";
    this.isWitnessAuthenticate = true;
    this.showSpinnerWitness = false;
  }
  closeWitnessAuthentication() {
    this.isWitnessAuthenticate = false;
  }
  getFormularyDetail(code, cb: (data) => any) {
    let dmd = (this.prescription.__drugcodes??[]).find(x => (x.additionalCodeSystem ?? "").toLowerCase() == "dmd")
    let dmdCode = ""
    if (dmd) {
        dmdCode = dmd.additionalCode;
    }
    else {
      dmdCode = code;
    }
    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${dmdCode}?api-version=1.0`)
      .subscribe((response) => {
        this.isLoadingMedication = false;
        if (response && response.length != 0) {
          this.appService.logToConsole(response);
          this.iswitnessRequired = response.detail.witnessingRequired == "1";
          if (this.appService.AuthoriseAction(RoleAction.epma_skip_witnessauthentication) == true) {
            this.iswitnessRequired = false;
          }
          if (this.appService.AuthoriseAction(RoleAction.epma_mandate_witnessauthentication) == true) {
            this.iswitnessRequired = true;
          }
        }
        else {
          this.appService.logToConsole("Medication not found");
        }
      }));
  }
}

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
import { InfusionEvents, Medication, Medicationadministration, Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-restart-infusion',
  templateUrl: './restart-infusion.component.html',
  styleUrls: ['./restart-infusion.component.css']
})
export class RestartInfusionComponent implements OnInit,OnDestroy {
  showSpinner : boolean =false;
  prescription: Prescription;
  medication: Medication;
  dose : string;
  doseunit:string;
  currentposology: Posology
  subscriptions = new Subscription();
  administration:Medicationadministration = new Medicationadministration();
  infusionEvents: InfusionEvents = new InfusionEvents();
  minDate: Date;
  maxDate: Date;
  startime: string;
  stardate: string;
  validatiommessage:string="";
  comments: string="";
  infusionrate: number;
  @Input('event') event: any
  expirydate: any;
  currDate: Date;
  constructor( public subjects: SubjectsService, public appService: AppService, public apiRequest:ApirequestService,public dr:DataRequest) {   
   
   

   }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event:any)
  {     
        this.prescription = event.prescription;  
        this.currentposology = this.appService.GetCurrentPosology(this.prescription)          
        this.medication = this.prescription.__medications.find(e=>e.isprimary ==true);      
        this.validatiommessage="";
        this.comments= "";
        this.dose=""; 
        this.startime=moment(new Date()).format('HH:mm');
        this.stardate = moment(new Date()).format('DD-MM-YYYY');
        this.infusionEvents = new InfusionEvents(); 
        this.administration = new Medicationadministration();
        this.setMinMaxDate(event);
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  onTimeSelected(startime) {
    this.startime= startime;   
  }
  closePopup(){
   this.subjects.closeAppComponentPopover.next();
  }
  saveRestartInfusion() {
    this.administration.administrationstartime= moment(this.stardate, "DD-MM-YYYY").format("DD-MM-YYYY") + " " + this.startime; 
    this.restartValidation()
    if(this.validatiommessage!="") {
      return;
    }
    
    this.administration.dose_id = this.infusionEvents.dose_id;
    this.administration.administrationstartime= this.appService.getDateTimeinISOFormat(moment(this.administration.administrationstartime,"DD-MM-YYYY HH:mm").toDate()); 
    this.administration.planneddatetime= this.administration.administrationstartime;
    //this.administration.logicalid = "restart_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    this.administration.administredinfusionrate = this.infusionrate;
    this.administration.plannedinfustionrate = this.infusionrate;
    this.administration.prescription_id = this.prescription.prescription_id;
    this.administration.posology_id = this.currentposology.posology_id;
    this.administration.person_id= this.appService.personId;
    this.administration.encounter_id= this.appService.encounter.encounter_id;
    this.administration.medication_id = this.medication.medication_id;
    this.administration.comments = this.comments;
    this.administration.administredby = this.appService.loggedInUserName;
    
    this.infusionEvents.dose_id = this.administration.dose_id;
    this.infusionEvents.eventdatetime = this.administration.administrationstartime;
    this.infusionEvents.planneddatetime= this.administration.administrationstartime;
    this.infusionEvents.logicalid = this.administration.logicalid;
    this.infusionEvents.posology_id = this.currentposology.posology_id;
    if(this.expirydate) {
      this.infusionEvents.expirydate = this.appService.getDateTimeinISOFormat(moment(this.expirydate, "DD-MM-YYYY HH:mm").toDate());
    }
    this.infusionEvents.eventtype = "restart";
    this.infusionEvents.comments = this.comments;
    let correctionId = uuid();
    this.infusionEvents.correlationid = correctionId;
    this.administration.correlationid = correctionId;

    delete this.infusionEvents._sequenceid;
    this.appService.logToConsole(this.administration);
    this.appService.logToConsole(this.infusionEvents);
    this.showSpinner= true;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
    upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.administration)));
    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();          
      this.dr.getAdminstrations(()=>{  
        this.showSpinner= false;   
        this.subjects.refreshDrugChart.next("Refresh"); 
        this.subjects.refreshTemplate.next(this.prescription.prescription_id);  
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
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
   restartValidation() {
    this.validatiommessage = "";
    var doseStart = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");    
    var administeredTime = moment(moment(this.administration.administrationstartime,"DD-MM-YYYY HH:mm")).format("YYYYMMDDHHmm");
    var doseEnd = moment(moment(this.maxDate).toDate()).format("YYYYMMDDHHmm"); 
    var administered = this.appService.InfusionEvents.sort((a, b) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(e=>e.eventtype=="administered" && e.posology_id== this.currentposology.posology_id);   
    if(!administered) {
      this.validatiommessage = "This infusion is not administered";
      return;
    }
    if(this.infusionrate == null || this.infusionrate < 0) {
      this.validatiommessage = "Please enter infusion rate";
      return;
    }
    if(doseStart>=doseEnd) {
      this.validatiommessage = "Please try later, You cannot restart immediate administration";
      return;
    }
    if(administeredTime <= doseEnd && administeredTime >= doseStart) {
      this.validatiommessage = "";
    } else {
      this.validatiommessage = "Administered date time must be between "+ moment(moment(this.minDate).toDate()).format("DD-MM-YYYY HH:mm") +" and "+ moment(moment(this.maxDate).toDate()).format("DD-MM-YYYY HH:mm");
    }
  }
  setMinMaxDate(event) {
    this.maxDate = new Date();
    this.minDate =  new Date(this.currentposology.__dose[0].dosestartdatetime);
    // check for exssting administration
    let administer = this.appService.Medicationadministration.sort((b, a) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime()).find(e => e.prescription_id == this.prescription.prescription_id);
   
    this.doseunit = this.currentposology.__dose[0].doseunit;
    // check for exisiting event
    if(event.infusionEvents) {
      this.infusionEvents = event.infusionEvents;    
      // for update exsiting event
      if (event.infusionEvents.expirydate) {
        this.expirydate = moment(event.infusionEvents.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      }
      this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.comments= this.infusionEvents.comments;
      this.infusionEvents.modifiedby = this.appService.loggedInUserName;
      this.stardate = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
      this.startime = moment(this.infusionEvents.eventdatetime, "YYYY-MM-DD HH:mm").format("HH:mm");      
      let infusionData = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e=>e.posology_id== this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
      var index = infusionData.indexOf(infusionData.find(e=>e.dose_id==this.infusionEvents.logicalid));
      var prevEvent = infusionData[index-1];
      var nextEvent = infusionData[index+1];
      this.minDate = moment(prevEvent.eventStart).toDate(); 
      if(nextEvent) {
        if(moment(nextEvent.eventStart).format("YYYYMMDDHHmm") > moment(new Date()).format("YYYYMMDDHHmm")) {
          this.maxDate =  moment(new Date(), 'DD-MM-YYYY HH:mm').toDate(); 
        } else {
          this.maxDate = moment(nextEvent.eventStart).toDate(); 
          this.maxDate = moment(this.maxDate, 'DD-MM-YYYY HH:mm').add(-this.appService.administrationTimeDiffInMinute, 'minutes').toDate();   
        }               
      }
    } else {
        this.infusionEvents.infusionevents_id = uuid();
        this.infusionEvents.dose_id =  uuid();
        this.infusionEvents.administeredby = this.appService.loggedInUserName;
        this.infusionEvents.modifiedby = this.appService.loggedInUserName;
        this.infusionEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.infusionrate = null;
        if(administer) {
          this.infusionrate = administer.administredinfusionrate;
        }
        let eventRecord = this.appService.events.sort((b, a) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e=>e.posology_id== this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate")  && !e.dose_id.includes("infusionevent"));
        let doneInfusion = eventRecord.find(e=>e.admitdone);
        let notDoneInfusion = eventRecord.slice().filter(x=> moment(x.eventStart).isAfter(doneInfusion.eventStart)).reverse().find(e=>!e.admitdone)
        this.appService.logToConsole(eventRecord);
        this.minDate = new Date(doneInfusion.eventStart); 
        if(notDoneInfusion) {        
          let maximumDate = new Date(notDoneInfusion.eventStart);
          if(moment(maximumDate).format("YYYYMMDDHHmm") > moment(new Date()).format("YYYYMMDDHHmm")) {
            this.maxDate =  moment(new Date(), 'DD-MM-YYYY HH:mm').toDate(); 
          } else {
            this.maxDate= maximumDate;
            this.maxDate = moment(this.maxDate, 'DD-MM-YYYY HH:mm').add(-this.appService.administrationTimeDiffInMinute, 'minutes').toDate(); 
          } 
      }         
    }
    if(event.administration) {
      this.administration = event.administration;
      this.infusionrate = this.administration.administredinfusionrate;
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    } else {
      this.administration.medicationadministration_id = uuid();
      this.administration.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.logicalid = "restart_" + this.createLogicalId(this.administration.administrationstartime, this.infusionEvents.dose_id);
    }
    this.minDate = moment(this.minDate, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();   
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
}

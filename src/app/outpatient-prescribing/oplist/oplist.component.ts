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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UpsertTransactionManager } from '@interneuroncic/interneuron-ngx-core-lib';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Opprescriptiontherapies, Outpatientprescriptions, Prescription } from 'src/app/models/EPMA';
import { prescriptiondetail } from 'src/app/models/prescriptiondetail';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-oplist',
  templateUrl: './oplist.component.html',
  styleUrls: ['./oplist.component.css']
})
export class OplistComponent implements OnInit,OnDestroy {

  constructor(private subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService) {
   this.Choosenfilterdate=new Date()
   this.timeselected= moment().format("hh:mm")
    this.selectedobj = new Outpatientprescriptions();
    this.subjects.showopAdministration.subscribe((pres: any) => {

      this.PrescriptionAdmistration = pres.prescription;
      let logicalid;
      if (pres.prescription.isinfusion) {
        logicalid = "start_" + moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime).format('YYYYMMDDHHmm') + "_" + pres.prescription.__posology[0].__dose[0].dose_id;
      } else {
        logicalid = moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime).format('YYYYMMDDHHmm') + "_" + pres.prescription.__posology[0].__dose[0].dose_id;
      }
      this.dose = {
        prescription_id: pres.prescription.prescription_id,
        posology_id: pres.prescription.__posology[0].posology_id,
        dose_id: logicalid,
        eventStart: moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime),
        eventEnd: null,
        prn: pres.prescription.__posology[0].prn,
        iscancel: false,
        doctorsorder: false,
        isinfusion: pres.prescription.isinfusion,
        content: "",
        title: "",
        admitdone: false
      }
      if (pres.type == "OpAdministration") {
        this.editpopuptypetype = "OpAdministration";
      } else {
        this.editpopuptypetype = "View Administration";
      }
      this.showopAdministration = true;

    });
  }
  Outpatientprescriptionslist: Array<Outpatientprescriptions>
  Outpatientprescriptions: Outpatientprescriptions;
  Oppatienttheripy: Array<Opprescriptiontherapies>;
  showpopup = false;
  rContext: any;
  PrescriptionAdmistration: Prescription;
  showopAdministration = false;
  showmanagelist = false;
  showprescriptionlist = false;
  editpopuptypetype = "OpAdministration"
  Choosenfilterdate: any;
  timeselected = ""
  locationselected="";
  prescriber: string;
  error = "";
  prescriptions: Array<Prescription>;
  selectedItem = ""
  selectedobj: Outpatientprescriptions;
  subscriptions = new Subscription();
  othereLocation="";
  showothereLocation=false
 
  dose: any;
  locationlst = ["Clinic 1", "Clinic 2", "Clinic 3","Other"];
  opSubscription = new Subscription();

  ngOnInit(): void {
    this.prescriber = this.appService.loggedInUserName;

    this.getoplist();
  }
  onChangeOfLocation(event){
    this.showothereLocation=false;
    if( event.target.value.includes("Other")){
      this.showothereLocation=true;
    }
  }
  getoppatienttherapy() {
    if (this.selectedItem != "") {
      this.opSubscription.unsubscribe();
      this.opSubscription = new Subscription();
      this.prescriptions = [];
      this.opSubscription.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_opprescriptiontherapies&synapseattributename=epma_outpatientprescriptions_id&attributevalue=" + this.selectedItem).subscribe(
        (response) => {
          this.Oppatienttheripy = JSON.parse(response);
          let arr = this.appService.optherapies.find(x => x.opid == this.selectedItem)
          if (arr) {
            arr.opprescriptions = this.Oppatienttheripy.map(x => x.prescription_id)
          }
          else {
            this.appService.optherapies.push({ opid: this.selectedItem, opprescriptions: this.Oppatienttheripy.map(x => x.prescription_id) })
          }
          for (let r of this.Oppatienttheripy) {

            this.prescriptions.push(this.appService.Prescription.find(x => x.prescription_id == r.prescription_id));

            this.showprescriptionlist = true;

          }
        }
      ));
    }
  }
  getoplist() {
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_outpatientprescriptions&synapseattributename=person_id&attributevalue=" + this.appService.personId).subscribe(
      (response) => {
        this.Oppatienttheripy = JSON.parse(response);
        this.Outpatientprescriptionslist = JSON.parse(response);
        if (this.Outpatientprescriptionslist && this.Outpatientprescriptionslist.length > 0) {
          if( this.selectedItem == ""){
          this.selectedItem = this.Outpatientprescriptionslist[0].epma_outpatientprescriptions_id;
          }
          this.selectedobj = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
          this.getoppatienttherapy();
        }

      }
    ));
  }
  ChoosenfilterdateChange(value: Date): void {

  }

  prescriptionchange(item: string) {
    this.selectedItem = item;
    this.selectedobj = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
    this.showmanagelist = false;
    this.showprescriptionlist = false;
    this.getoppatienttherapy();
  }

  onTimeSelected(startime) {
    this.timeselected = startime;
  }
  showAddPrescription() {
    this.showpopup = true;
  }

  closepopup() {
    this.showpopup = false;
  }
  addOutpatient() {
    this.rContext = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
    this.showmanagelist = true;
    this.showprescriptionlist = false
  }
  cancelManageList() {
    this.rContext = null;
    this.showmanagelist = false;
    this.showprescriptionlist = true
  }

  finishManageList() {

    this.rContext = null;
    this.getoppatienttherapy();
    this.showmanagelist = false;
    this.showprescriptionlist = false;
  }
  SavePrescription() {
    this.error = "";
    if (!this.Choosenfilterdate) {
      this.error = "Please select date";
      return;
    }
    if (this.timeselected == "") {
      this.error = "Please select time"
      return;
    }
    if (!this.locationselected || this.locationselected == "") {
      this.error = "Pleae select a location"
      return;
    }


    this.Outpatientprescriptions = new Outpatientprescriptions();
    this.Outpatientprescriptions.epma_outpatientprescriptions_id = uuid();
    this.Outpatientprescriptions.createdby = this.prescriber;
    this.Outpatientprescriptions.modifiedby = this.prescriber;
    this.Outpatientprescriptions.prescriber = this.prescriber;
    if(this.locationselected=="Other"){
      this.Outpatientprescriptions.locationtext = this.othereLocation;
      this.Outpatientprescriptions.locationcode = this.othereLocation;
    }
    else{
      this.Outpatientprescriptions.locationtext = this.locationselected;
    this.Outpatientprescriptions.locationcode = this.locationselected;
    }
    
    this.Outpatientprescriptions.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.Outpatientprescriptions.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    let date = moment(this.Choosenfilterdate).format("DD-MM-YYYY") + " " + this.timeselected;
    this.Outpatientprescriptions.prescriptiondate = this.appService.getDateTimeinISOFormat(moment(date, "DD-MM-YYYY HH:mm").toDate());
    this.Outpatientprescriptions.encounter_id = this.appService.encounter.encounter_id;
    this.Outpatientprescriptions.person_id = this.appService.personId;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('local', 'epma_outpatientprescriptions', JSON.parse(JSON.stringify(this.Outpatientprescriptions)));
    upsertManager.save((resp: Outpatientprescriptions[]) => {

      this.appService.UpdateDataVersionNumber(resp);


      upsertManager.destroy();
      this.getoplist()
      this.selectedItem = this.Outpatientprescriptions.epma_outpatientprescriptions_id;
      this.selectedobj =  this.Outpatientprescriptions;
      this.showmanagelist = false;
      this.Choosenfilterdate=new Date()
      this.timeselected= moment().format("hh:mm")
      this.locationselected = "";
      this.Outpatientprescriptions = new Outpatientprescriptions();
      this.showpopup = false;

    },
      (error) => {
        this.Choosenfilterdate = null;
        this.timeselected = "";
        this.locationselected = "";
        this.showpopup = false;
        this.Outpatientprescriptions = new Outpatientprescriptions();
        this.appService.logToConsole(error);
        upsertManager.destroy();



      }
    );
  }

  hideAdministrationForm(isrefresh = false) {
    this.showopAdministration = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}



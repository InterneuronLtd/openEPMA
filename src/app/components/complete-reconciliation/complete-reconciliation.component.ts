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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Medreconciliation } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { RoleAction } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-complete-reconciliation',
  templateUrl: './complete-reconciliation.component.html',
  styleUrls: ['./complete-reconciliation.component.css']
})
export class CompleteReconciliationComponent implements OnInit, OnDestroy {

  constructor(public subjects: SubjectsService,
    public appService: AppService,
     public dr: DataRequest,
    private apiRequest: ApirequestService) {

    this.subscriptions.add(this.subjects.CompleteReconciliation.subscribe
      ((event: any) => {

        if(this.appService.AuthoriseAction(RoleAction.epma_reconciliation_pharmacist)){
          this.userRole="EPMA Pharmacist"
        }
        else if(this.appService.AuthoriseAction(RoleAction.epma_reconciliation_pharmacytech)){
          this.userRole="EPMA Pharmacy tech"
        }
        else
        {
          this.userRole=""
        }
    
        // if(this.appService.loggedInUserRoles.indexOf("EPMA Pharmacist") !== -1){
        //   this.userRole="EPMA Pharmacist"
        //   }
        //   else if(this.appService.loggedInUserRoles.indexOf("EPMA Pharmacy tech") !== -1){
        //     this.userRole="EPMA Pharmacy tech"
        //   }
        //   else{
        //     this.userRole=""
        //   }
        this.getmedreconciliaCompletedobject();
        this.showconform = true;
      }));
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  subscriptions: Subscription = new Subscription();
  showconform = false;
  lastcomplete = "";
  comments="";
  iscomplete=false;
  medreconciliation: Medreconciliation;
  medreconciliationhistory: Medreconciliation[] = [];
  medreconciliationhistoryComplete: Medreconciliation;
  userRole = "";

  ngOnInit(): void {
   

  }
  closeComplete() {
    this.showconform = false;
  }

  submitComplete() {
    if (!this.medreconciliation) {
      this.medreconciliation = new Medreconciliation();
      this.medreconciliation.epma_medreconciliation_id = uuid();
      this.medreconciliation.createdby = this.appService.loggedInUserName;;
      this.medreconciliation.createdon = this.appService.getDateTimeinISOFormat(new Date());
      this.medreconciliation.encounter_id = this.appService.encounter.encounter_id;
    }
      this.medreconciliation.comments=this.comments;
      this.medreconciliation.role= this.userRole;
      if(this.userRole == "EPMA Pharmacy tech"){
        this.medreconciliation.status="Reviewed by pharmacy technician"
      }
      else if(this.userRole == "EPMA Pharmacist" && this.iscomplete){
        this.medreconciliation.status="Reviewed by pharmacist"
      }
      else{
        this.medreconciliation.status="Medicines Reconciliation completed"       
    
    }


     if(this.userRole == "EPMA Pharmacy tech"  && this.iscomplete){
      this.medreconciliation.reviewstatus="reviewed by pharmacist and technician"
    }
    else if(this.userRole == "EPMA Pharmacy tech"  && !this.iscomplete){
      this.medreconciliation.reviewstatus="reviewed by pharmacy technician only"
    }
    else if(this.userRole == "EPMA Pharmacist"  && this.medreconciliationhistory.find(x=>x.status== "Reviewed by pharmacy technician")){
      this.medreconciliation.reviewstatus="reviewed by pharmacist and technician"
    }
    else if(this.userRole == "EPMA Pharmacist"){
      this.medreconciliation.reviewstatus="reviewed by pharmacist only"
    }

    this.medreconciliation.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.medreconciliation.modifiedby = this.appService.loggedInUserName;

    Object.keys(this.medreconciliation).map((e) => { if (e.startsWith("_")) delete this.medreconciliation[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_medreconciliation", JSON.parse(JSON.stringify(this.medreconciliation)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.getmedreconciliaCompletedobject();
       this.dr.getmedreconciliaCompletedobject();
      this.showconform = false;

    },
      (error) => {
        this.appService.logToConsole(error);
        this.getmedreconciliaCompletedobject();
        upsertManager.destroy();
        this.showconform = false;

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
  }
  getmedreconciliaCompletedobject() {
   
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medreconciliation&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
      (response) => {

        let medreconciliationobject = <Medreconciliation[]>JSON.parse(response);


        if (medreconciliationobject && Array.isArray(medreconciliationobject) && medreconciliationobject.length > 0) {
          this.medreconciliation = medreconciliationobject[0];
         
          this.lastcomplete = "";
          if (this.medreconciliation) {
            this.getmedscompleteHistory();
            this.lastcomplete = "Previously completed " + moment(this.medreconciliation.modifiedon).format('DD-MMM-YYYY HH:mm') + " " + this.medreconciliation.modifiedby;
          }


        }
      }
    ));
  }

  getmedscompleteHistory() {
    this.medreconciliationhistoryComplete=new Medreconciliation();
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetObjectHistory?synapsenamespace=local&synapseentityname=epma_medreconciliation&id=" + this.medreconciliation.epma_medreconciliation_id).subscribe(
      (response) => {
      
        this.medreconciliationhistory = <Medreconciliation[]>JSON.parse(response);
      
        this.medreconciliationhistoryComplete = this.medreconciliationhistory.find(x=>x.status=="Medicines Reconciliation completed");
        if( this.medreconciliationhistory &&  this.medreconciliationhistoryComplete){
          this.iscomplete=true;
        }
        else{
          this.iscomplete=false;
        }
        this.medreconciliationhistory = this.medreconciliationhistory.filter(x=>x.status !="Medicines Reconciliation completed");
        this.medreconciliationhistory= this.medreconciliationhistory.sort((b,a) => new Date(a.modifiedon).getTime() - new Date(b.modifiedon).getTime());
      }
    ));
  }


}



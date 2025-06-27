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
import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { PersonAwayPeriod } from '../../models/EPMA';
import { ApirequestService } from '../../services/apirequest.service';
import { AppService } from '../../services/app.service';
import { DataRequest } from '../../services/datarequest';
import { SubjectsService } from '../../services/subjects.service';
import { v4 as uuid } from 'uuid';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-away-period',
  templateUrl: './away-period.component.html',
  styleUrls: ['./away-period.component.css']
})
export class AwayPeriodComponent implements OnInit {
  @Input('event') event: any
  showSpinner: boolean =false;
  subscriptions: Subscription = new Subscription();
  startdate: any;
  enddate:any;
  starttime: string;
  endtime: string;
  awayPeriod: PersonAwayPeriod = new PersonAwayPeriod();
  confirmModalRef: BsModalRef;
  validationMessage: string;
  showAwayPeriodHistory: boolean =false;
  awayPeriodHistory: PersonAwayPeriod[] = [];
  constructor( private apiRequest: ApirequestService,public subjects: SubjectsService, public appService: AppService, public dr: DataRequest, private modalService: BsModalService) { }

  ngOnInit(): void {
   
  }
  toggoleEnabled(awayPeriod: PersonAwayPeriod) {
    this.saveToDB(awayPeriod);
  }
  saveAwayPeriod() {
    this.validationMessage= "";
    if(!this.startdate) {
      this.validationMessage= "From date is required";
      return;
    }
    if(!this.starttime) {
      this.validationMessage= "From time is required";
      return;
    }
    if(!this.enddate) {
      this.validationMessage= "To date is required";
      return;
    }
    if(!this.endtime) {
      this.validationMessage= "To time is required";
      return;
    }
    if(!this.awayPeriod.awayreason || (this.awayPeriod.awayreason && !this.awayPeriod.awayreason.trim())) {
      this.validationMessage= "Away reason is required";
      return;
    }
    let startDate =  moment(this.startdate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.starttime;
    let endDate =  moment(this.enddate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.endtime;
    let isExistNew = this.appService.PersonAwayPeriod.find(x=>!this.awayPeriod.epma_personawayperiod_id
      && (moment(startDate,"YYYY-MM-DD HH:mm").isBetween(x.awayfrom, x.awayto)) || moment(endDate,"YYYY-MM-DD HH:mm").isBetween(x.awayfrom, x.awayto)
      || (moment(startDate,"YYYY-MM-DD HH:mm").isBefore(x.awayfrom) && moment(endDate,"YYYY-MM-DD HH:mm").isAfter(x.awayto))
      );

    let isExistOld = this.appService.PersonAwayPeriod.find(x=> this.awayPeriod.epma_personawayperiod_id && x.epma_personawayperiod_id != this.awayPeriod.epma_personawayperiod_id 
      &&((moment(startDate,"YYYY-MM-DD HH:mm").isBetween(x.awayfrom, x.awayto)) || moment(endDate,"YYYY-MM-DD HH:mm").isBetween(x.awayfrom, x.awayto)));

    if(isExistNew || isExistOld) {
      this.validationMessage= "Away from or away to can not overlap";
      return;
    }
    if(moment(startDate,"YYYY-MM-DD HH:mm").isAfter(moment(endDate,"YYYY-MM-DD HH:mm"))) {
      this.validationMessage= "To date cannot be less than From date";
      return;
    }
    if(!this.awayPeriod.epma_personawayperiod_id) {
       this.awayPeriod.epma_personawayperiod_id = uuid();
       this.awayPeriod.isenabled =true;
    }
    this.awayPeriod.awayfrom = this.appService.getDateTimeinISOFormat(moment(startDate,'YYYY-MM-DD HH:mm').toDate());
    this.awayPeriod.awayto = this.appService.getDateTimeinISOFormat(moment(endDate,'YYYY-MM-DD HH:mm').toDate());
    this.awayPeriod.person_id = this.appService.personId;
    this.awayPeriod.encounter_id =this.appService.encounter.encounter_id;
    this.awayPeriod.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.awayPeriod.modifiedon= this.appService.getDateTimeinISOFormat(moment().toDate());
    this.awayPeriod.createdby =this.appService.loggedInUserName;
    this.awayPeriod.modifiedby = this.appService.loggedInUserName;
    this.showSpinner = true;
    this.saveToDB(this.awayPeriod);
  }
  saveToDB(awayPeriod:PersonAwayPeriod) {
   
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
      "/PostObject?synapsenamespace=local&synapseentityname=epma_personawayperiod", JSON.stringify(awayPeriod))
      .subscribe((saveResponse) => {
        this.appService.UpdateDataVersionNumber(saveResponse);
        this.showSpinner = false;
        this.clearFormData();
        this.awayPeriod = new PersonAwayPeriod();
        this.dr.GetManageAwayPeriod(()=> {
          this.subjects.refreshDrugChart.next();
        });
      }, (error) => {
        this.showSpinner = false;
        this.subjects.closeAppComponentPopover.next();
        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      })
    )
  }
  editPeriod(data) {
    this.awayPeriod = new PersonAwayPeriod();
    this.awayPeriod = Object.assign({}, data);
    this.startdate = moment(this.awayPeriod.awayfrom).format("DD-MM-YYYY");
    this.enddate = moment(this.awayPeriod.awayto).format("DD-MM-YYYY");
    this.starttime = moment(this.awayPeriod.awayfrom).format("HH:mm");
    this.endtime = moment(this.awayPeriod.awayto).format("HH:mm");
  }
  openConfirmModal(data, template:TemplateRef<any>) {
    this.confirmModalRef = this.modalService.show(template, {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-sm modal-dialog-centered',
    });
    this.confirmModalRef.content = data;
  }
  confirmDeletion(): void {
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('local', 'epma_personawayperiod', JSON.parse(JSON.stringify(this.confirmModalRef.content)), "del");
    upsertManager.save( (resp) => {
      this.appService.UpdateDataVersionNumber(resp);
      this.clearFormData();
      this.confirmModalRef.hide();
      this.dr.GetManageAwayPeriod(()=> {
        this.subjects.refreshDrugChart.next();
      });
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
   
  }
  declineDeletion(): void {
    this.confirmModalRef.hide();
  }
  removePeriod(data, template:TemplateRef<any>) {
    this.openConfirmModal(data, template);
  }
  viewAwayPeriodHistory(data:PersonAwayPeriod) {
    this.showAwayPeriodHistory =true;
    this.dr.GetAwayPeriodHistory(data.epma_personawayperiod_id,(response)=>{
        this.awayPeriodHistory = <PersonAwayPeriod[]>JSON.parse(response).sort((a, b) => (moment(a.modifiedon) > moment(b.modifiedon)) ? -1 : 0);
    })
    
  }
  clearAwayPeriod() {
   this.clearFormData();
  }
  closePopup() {
      this.subjects.closeAppComponentPopover.next();
  }
  closeAwayPeriodPopup(){
    this.showAwayPeriodHistory =false;
  }
  clearFormData() {
    this.awayPeriod = new PersonAwayPeriod();
    this.startdate = null;
    this.enddate =null;
    this.starttime = null;
    this.endtime = null;
  }
  onStartTimeSelected(starttime) {
    this.starttime = starttime;
  }
  onEndTimeSelected(endtime) {
    this.endtime = endtime;
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
 


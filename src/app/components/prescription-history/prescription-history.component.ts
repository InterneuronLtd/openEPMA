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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MetaPrescriptionadditionalcondition, MetaPrescriptionstatus, Prescription } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
@Component({
  selector: 'app-prescription-history',
  templateUrl: './prescription-history.component.html',
  styleUrls: ['./prescription-history.component.css']
})

export class PrescriptionHistoryComponent implements OnInit, OnDestroy {
  prescriptionstatus: MetaPrescriptionstatus[];
  additionalcondition: MetaPrescriptionadditionalcondition[];
  subscriptions: Subscription = new Subscription();
  prescriptionId: string;
  prescription: Prescription[] = [];
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService) {
    this.subscriptions.add(this.subjects.prescriptionHistory.subscribe
      ((event: any) => {
        this.appService.logToConsole(event.prescriptionId);
        this.prescriptionId = event.prescriptionId;
        this.subscriptions.add(
          this.apiRequest.postRequest(this.appService.baseURI + '/GetBaseViewListByPost/epma_prescriptionhistory', this.createPrescriptionHistoryFilter())
            .subscribe((response) => {
              var strData = JSON.stringify(response);
              this.prescription = JSON.parse(strData);
              this.appService.logToConsole(this.prescription);

            })
        )
      }));
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  parseJSON(data: any) {
    return JSON.parse(data);
  }
  hidePrescriptionHistory() {
    this.appService.openPrescriptionHistory = false;
  }
  getAdditionalcondition(id: string) {
    var condition = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == id);
    if (condition)
      return this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == id).additionalcondition;
    else
      return "No additional criteria";
  }
  getPrescriptionStatus(id: string) {
    var status = this.prescriptionstatus.find(x => x.prescriptionstatus_id == id);
    if (status)
      return this.prescriptionstatus.find(x => x.prescriptionstatus_id == id).status;
    else
      return "Prescribed";
  }
  route(data: any) {
    return JSON.parse(data).map(m => m.route).join(",");
  }
  ngOnInit(): void {
    this.prescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.additionalcondition = this.appService.MetaPrescriptionadditionalcondition;
  }
  createPrescriptionHistoryFilter() {
    let f = new filters()
    let condition = "prescription_id=@prescription_id";
    f.filters.push(new filter(condition));


    let pm = new filterParams();
    pm.filterparams.push(new filterparam("prescription_id", this.prescriptionId));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }
}

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
import { Component, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { Epma_Dischargesummarry, Epma_Medsonadmission, Epma_Medsondischarge } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { FormContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-reconciliation-lists',
  templateUrl: './reconciliation-lists.component.html',
  styleUrls: ['./reconciliation-lists.component.css']
})
export class ReconciliationListsComponent implements OnInit {

  constructor(public subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService) {

  }
  formContext: FormContext;
  rContext: any
  showreconcillation = false;
  showmanagelist = false;
  subscriptions: Subscription = new Subscription();
  Medsonadmission: Epma_Medsonadmission;
  Medsondischarge: Epma_Medsondischarge;
  isMedsondischargeOnce:false;
  Dischargesummarry: Epma_Dischargesummarry;
  ngOnInit(): void {
    this.Medsonadmission = new Epma_Medsonadmission();
    this.Medsondischarge = new Epma_Medsondischarge();
    this.Dischargesummarry = new Epma_Dischargesummarry();
    
    this.subscriptions.add(forkJoin([
      this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medsonadmission&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id),
      this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medsondischarge&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id),
      this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_dischargesummarry&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id)

    ]).subscribe(([responseArray1, responseArray2, responseArray3]) => {

      if (JSON.parse(responseArray1).length > 0) {
        this.Medsonadmission = JSON.parse(responseArray1)[0];
      }
      if (JSON.parse(responseArray2).length > 0) {
        this.Medsondischarge = JSON.parse(responseArray2)[0];
        if(JSON.parse(responseArray2).find(x=>x.iscomplete)){
        this.isMedsondischargeOnce=JSON.parse(responseArray2).find(x=>x.iscomplete).iscomplete;
        }
      }
      if (JSON.parse(responseArray3).length > 0) {
        this.Dischargesummarry = JSON.parse(responseArray3)[0];
      }

      this.showreconcillation = true;

    }));

  }


  EditType(type: FormContext) {
    this.formContext = type;

    if (type == FormContext.moa) {
      this.rContext = this.Medsonadmission;
    }
    else if (type == FormContext.mod) {
      this.rContext = this.Medsondischarge;
    }

    this.showreconcillation = false;
    this.showmanagelist = true;
  }

  cancelManageList() {
    this.formContext = null;
    this.rContext = null;

    this.showreconcillation = true;
    this.showmanagelist = false;
  }

  finishManageList() {
    this.formContext = null;
    this.rContext = null;

    this.showreconcillation = true;
    this.showmanagelist = false;
  }

}

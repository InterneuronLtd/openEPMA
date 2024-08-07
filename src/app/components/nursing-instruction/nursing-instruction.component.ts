//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
import { Subscription } from 'rxjs';
import { NursingInstructions } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import moment from 'moment';
import { type } from 'os';
@Component({
  selector: 'app-nursing-instruction',
  templateUrl: './nursing-instruction.component.html',
  styleUrls: ['./nursing-instruction.component.css']
})
export class NursingInstructionComponent implements OnInit {

  // showNursingInstruction: boolean = false;
  subscriptions = new Subscription();
  endorsement: any[];
  medusaInstruction: any[];
  @Input('event') event: any
  _nursingInstructions: NursingInstructions =  new NursingInstructions();
  _nursingInstructionsHistory: any[];
  isSaving: boolean;
  notesError="";
  nursingInstructionType: string;
  constructor(public subjects: SubjectsService,
    public dr: DataRequest,
    private apiRequest: ApirequestService,
    public appService: AppService) {

  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {
    // this.showNursingInstruction = true;
    this.nursingInstructionType = event?.source;
    if(event.data) {
      this.endorsement = event.data.filter(e => e.category == "Endorsement");
      this.medusaInstruction = event.data.filter(e => e.category == "Medusa Instructions");
    }
    this._nursingInstructions = this.appService.NursingInstructions.find(x=>x.prescription_id == this.event.prescription_id);
    if(this._nursingInstructions) {
    this.dr.GetNursingInstructionHistory(this._nursingInstructions.epma_nursinginstructions_id, (data) => {
      this._nursingInstructionsHistory = data;
    });
   } else {
    this._nursingInstructions = new NursingInstructions();
   }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  closeNursingInstructionPopup() {
    this.subjects.closeAppComponentPopover.next();
  }
  saveNursingInstructions() {
    this.notesError="";
    if(this._nursingInstructions.nursinginstructionstext && this._nursingInstructions.nursinginstructionstext.length >  this.appService.appConfig.AppSettings.nursingInstructionMaxLength){
     this.notesError="Nursing Instructions must be less than "+this.appService.appConfig.AppSettings.nursingInstructionMaxLength + " characters"
      return;
    }
  
    if (this._nursingInstructions.epma_nursinginstructions_id) {
      this._nursingInstructions.encounter_id = this.appService.encounter.encounter_id;
      this._nursingInstructions.person_id = this.appService.personId;
      this._nursingInstructions.prescription_id = this.event.prescription_id;
      this._nursingInstructions.modifiedby = this.appService.loggedInUserName;
      this._nursingInstructions.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    } else {
      this._nursingInstructions.epma_nursinginstructions_id = uuid();
      this._nursingInstructions.encounter_id = this.appService.encounter.encounter_id;
      this._nursingInstructions.person_id = this.appService.personId;
      this._nursingInstructions.prescription_id = this.event.prescription_id;
      this._nursingInstructions.createdby = this.appService.loggedInUserName;
      this._nursingInstructions.modifiedby = this.appService.loggedInUserName;
      this._nursingInstructions.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this._nursingInstructions.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    }
    this.isSaving = true;
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
      "/PostObject?synapsenamespace=local&synapseentityname=epma_nursinginstructions", JSON.stringify(this._nursingInstructions))
      .subscribe((saveResponse) => {
        this.dr.GetNursingInstruction(() => {
        this.isSaving = false;
        this.appService.UpdateDataVersionNumber(saveResponse);
        this.subjects.closeAppComponentPopover.next();
        this.subjects.refreshTemplate.next();
        });
      }, (error) => {
        this.isSaving = false;
        this.subjects.closeAppComponentPopover.next();
        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      })
    )
  }
}

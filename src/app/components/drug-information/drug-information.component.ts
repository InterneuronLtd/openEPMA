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
import { Medication, Prescription } from 'src/app/models/EPMA';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-drug-information',
  templateUrl: './drug-information.component.html',
  styleUrls: ['./drug-information.component.css']
})
export class DrugInformationComponent implements OnInit,OnDestroy {
  drugInformationPopup: boolean =false;
  subscriptions = new Subscription();
  prescription : Prescription; 
  primaryMedication: Medication;
  constructor( public subjects: SubjectsService, public appService: AppService) {  
    this.subscriptions.add(this.subjects.drugInformation.subscribe
      ((event: Medication) => {   
        this.drugInformationPopup = true;   
        this.appService.logToConsole(event);     
        // this.prescription = event.prescription;
        this.primaryMedication = event;  
        this.appService.logToConsole(this.primaryMedication);                      
      }));     
   

  }
  ngOnDestroy(): void {   
     this.subscriptions.unsubscribe();
  }
  ngOnInit(): void {
  }
  closePopup(){
    this.drugInformationPopup =false;
  }
  therapyType() {
    if(!this.primaryMedication.form) {
      return "therapy";
    }
    else if(this.primaryMedication.form.toLowerCase().indexOf("tablet")!=-1 || this.primaryMedication.form.toLowerCase().indexOf("capsule")!=-1) {
      return "TabletorCapsule";
    } else if(this.primaryMedication.form.toLowerCase().indexOf("injection")!=-1) {
      return "Injection";
    } else if(this.primaryMedication.form.toLowerCase().indexOf("infusion")!=-1) {
      return "ContinuousInfusion";
    }else if(this.primaryMedication.form.toLowerCase().indexOf("fluid")!=-1) {
      return "BasicFluids";
    }else if(this.primaryMedication.form.toLowerCase().indexOf("inhalation")!=-1) {
      return "Inhalation";
    } else {
      return "therapy";
    }
  }
}

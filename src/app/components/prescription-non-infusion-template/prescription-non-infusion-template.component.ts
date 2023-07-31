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
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import moment from 'moment';
import { Medication, Medicationadministration, MetaPrescriptionadditionalcondition, MetaPrescriptionstatus, Prescription } from 'src/app/models/EPMA';
import { AppService } from 'src/app/services/app.service';
import { Indication } from '../prescribing-form/formhelper';

@Component({
  selector: 'app-prescription-non-infusion-template',
  templateUrl: './prescription-non-infusion-template.component.html',
  styleUrls: ['./prescription-non-infusion-template.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class PrescriptionNonInfusionTemplateComponent implements OnInit {
  prescriptionstatus: MetaPrescriptionstatus[];
  additionalcondition: MetaPrescriptionadditionalcondition[];
  medicationadminstration: Medicationadministration;
  @Input() componenttype: string;
  @Input() prescription: Prescription;
  @Input() administration: Medicationadministration;
  @Input() posologyid:string;
  showPrescriptionHistory: boolean = false;
  primaryMedication: Medication;
  plannedTime: string;
  chosenDays = "";
  routes = "";
  prescriptionAdditionalConditions: string;
  indicationstring = ""
  
 
  constructor(public appService: AppService) { }

  ngOnInit(): void {
    this.prescription.__medications.sort(value => {
      return value.isprimary ? -1 : 1
    });
    this.prescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.additionalcondition = this.appService.MetaPrescriptionadditionalcondition;
    this.primaryMedication = this.prescription.__medications.find(e => e.isprimary == true);
    if (this.administration) {
      this.plannedTime = moment(this.administration.planneddatetime, "YYYY-MM-DD HH:mm").format("DD-MMM-YYYY HH:mm");
    }
   
    this.GetChosenDays();
    this.GetRoutes();
    this.GetAdditionalConditions();
    this.indicationstring = this.appService.GetIndication(this.prescription);

  }

  GetRoutes() {
    this.routes = this.prescription.__routes.sort((x,y)=> Number(y.isdefault) - Number(x.isdefault)).map(m => m.route).join(",");
  }
  GetChosenDays() {
    this.chosenDays = JSON.parse(this.appService.GetCurrentPosology(this.prescription,this.posologyid).daysofweek).join(", ");
  }
  GetAdditionalConditions() {
    var condition = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == this.prescription.prescriptionadditionalconditions_id);
    if (condition)
      this.prescriptionAdditionalConditions = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == this.prescription.prescriptionadditionalconditions_id).additionalcondition;
    else
      this.prescriptionAdditionalConditions = "No additional criteria";
  }
}

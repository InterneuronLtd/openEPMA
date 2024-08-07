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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Medicationadministration, MetaPrescriptionadditionalcondition, MetaPrescriptionstatus, Prescription } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
@Component({
  selector: 'app-prescription-history',
  templateUrl: './prescription-history.component.html',
  styleUrls: ['./prescription-history.component.css']
})

export class PrescriptionHistoryComponent implements OnInit, OnDestroy {
  
  @Input('prescription') prescription: Prescription
  prescriptionHistory: Medicationadministration[]=[];
  constructor(public subjects: SubjectsService, public appService: AppService,public dr:DataRequest) {
    
  }
  ngOnDestroy(): void {
 
  }
 
  hidePrescriptionHistory() {
    this.subjects.closeAppComponentPopover.next();
  }
  
  ngOnInit(): void {
    this.dr.getPrescriptionAdministrationHistory(this.prescription.prescription_id, (data)=> {
        this.prescriptionHistory =data; 
    })
  }
  
}

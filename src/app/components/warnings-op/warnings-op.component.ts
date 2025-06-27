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
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { WarningContext, WarningContexts, WarningService } from 'src/app/models/WarningServiceModal';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { Common } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-warnings-op',
  templateUrl: './warnings-op.component.html',
  styleUrls: ['./warnings-op.component.css']
})
export class WarningsOpComponent implements OnInit, OnDestroy {

  componentModuleData: ComponentModuleData;
  showwarningscreen = true
  @ViewChild('open_warningsop') open_warningsop: ElementRef;
  @ViewChild('close_warningsop') close_warningsop: ElementRef;
  ws: WarningService;
  subscriptions = new Subscription();
  @Input() warningcontext: string;
  constructor(public appService: AppService, public apiRequest: ApirequestService, public subjects: SubjectsService, public dr: DataRequest) {

    this.subjects.showOPWarnings.subscribe((e) => {
      this.OpenWarnings();
    });

    this.subjects.closeOPWarnings.subscribe((e) => {
      this.CloseWarnings();
    });
  }
  ngOnInit(): void {
    this.SetComponentModuleData();
  }
  HideWarning() {
    this.appService.HideWarning(WarningContext.op);
  }
  ngOnDestroy(): void {
    console.log("unloading warnings epma component - op")
  }

  OpenWarnings() {
    this.open_warningsop.nativeElement.click();
  }
  CloseWarnings() {
    this.close_warningsop.nativeElement.click();

  }

  SetComponentModuleData() {
    this.componentModuleData = new ComponentModuleData();
    this.componentModuleData.elementTag = "app-warnings"
    this.componentModuleData.moduleContext.apiService = this.apiRequest;
    this.componentModuleData.moduleContext.encouterId = Common.op_encounter_placeholder; //this.appService.encounter.encounter_id;
    this.componentModuleData.moduleContext.personId = this.appService.personId;
    this.componentModuleData.moduleContext.refreshonload = true;
    this.componentModuleData.moduleContext.existingwarnings = true;
    this.componentModuleData.moduleContext.newwarnings = false;
    this.componentModuleData.moduleContext.enableOverride = true;
    this.componentModuleData.moduleContext.warningContext =  this.warningcontext;
    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;
  }

  OnWarningsModuleUnLoad(e: any) {
  }

  refreshTemplate() {
    this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
      this.subjects.refreshTemplate.next();
    }, this.ws);
  }

  OnWarningsLoadComplete(e: WarningContexts) {
    this.ws = e.GetWarningsInstance(this.warningcontext);
    
    //if there is no last refresh / no recored for this encounterid in WarningsStatus entity 
    //refresh from api 

    //get current allergies,bsa and weight
    //if allergies,weight, BSA has changed from last refresh
    //if yes refresh from api
    
    if (this.ws.loader != true) {
      this.dr.TriggerWarningUpdateOnChanges(() => {
        if (this.ws.existingWarningsStatus == false) {
          this.refreshTemplate();
          this.subjects.showOPWarnings.next();
        }
        else {
          this.refreshTemplate();
        }
      }, this.warningcontext);
    }
    else {
      if (this.ws.existingWarningsStatus == false) {
        this.OpenWarnings();
      }
    }
    console.log("op warnigns component loaded")
    console.log(e);
  }

  //click to refresh handler

  RefreshWarningsFromApi() {
    this.dr.getAllergy(() => {
      this.appService.RefreshWarningsFromApi(() => { }, this.ws);
    });
  }
  
}

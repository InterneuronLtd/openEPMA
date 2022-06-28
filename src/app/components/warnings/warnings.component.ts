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
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { Allergyintolerance } from 'src/app/models/allergy.model';
import { Allergens, WarningContext, WarningContexts, WarningService } from 'src/app/models/WarningServiceModal';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-warnings-header',
  templateUrl: './warnings.component.html',
  styleUrls: ['./warnings.component.css']
})
export class WarningsComponent implements OnInit, OnDestroy {

  componentModuleData: ComponentModuleData;
  showwarningscreen = true
  @ViewChild('open_warnings') open_warnings: ElementRef;
  @ViewChild('close_warnings') close_warnings: ElementRef;
  saveerror = false;
  constructor(public appService: AppService, public apiRequest: ApirequestService, public subjects: SubjectsService, public dr: DataRequest) {
    this.SetComponentModuleData();

    this.subjects.showWarnings.subscribe(() => {
      this.OpenWarnings();
    });

    this.subjects.closeWarnings.subscribe(() => {
      this.CloseWarnings();
    });
  }
  ngOnDestroy(): void {
    console.log("unloading warnings epma component")
  }

  OpenWarnings() {
    this.subjects.closeBannerWarnings.next();
    this.open_warnings.nativeElement.click();
  }
  CloseWarnings() {
    this.close_warnings.nativeElement.click();

  }

  SetComponentModuleData() {

    this.componentModuleData = new ComponentModuleData();
    this.componentModuleData.elementTag = "app-warnings"
    this.componentModuleData.moduleContext.apiService = this.apiRequest;
    this.componentModuleData.moduleContext.encouterId = this.appService.encounter.encounter_id;
    this.componentModuleData.moduleContext.personId = this.appService.personId;
    this.componentModuleData.moduleContext.refreshonload = true;
    this.componentModuleData.moduleContext.existingwarnings = true;
    this.componentModuleData.moduleContext.newwarnings = false;
    this.componentModuleData.moduleContext.enableOverride = this.appService.isCurrentEncouner || (this.appService.isTCI && !this.appService.isTCICancelled);
    this.componentModuleData.moduleContext.warningContext = WarningContext.ip;
    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;  // "http://127.0.0.1:5500/dist/terminus-module-warnings/main.js"; // "https://csa6155a2f7abb5x42b5xbe7.blob.core.windows.net/terminusmodules/warnings.js";
  }

  ngOnInit(): void {
  }

  OnWarningsModuleUnLoad(e: any) {
  }

  refreshTemplate() {
    this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
      this.subjects.refreshTemplate.next();
    });
  }

  OnWarningsLoadComplete(e: WarningContexts) {
    this.appService.warningService = e;
    this.appService.warningServiceIPContext = e.GetWarningsInstance(WarningContext.ip);

    //if there is no last refresh / no recored for this encounterid in WarningsStatus entity 
    //refresh from api 

    //get current allergies,bsa and weight
    //if allergies,weight, BSA has changed from last refresh
    //if yes refresh from api

    //change to condition on above logic
    // this.dr.TriggerWarningUpdateOnChanges(() => { });
    if (this.appService.warningServiceIPContext.loader != true) {
      this.dr.TriggerWarningUpdateOnChanges(() => {
        this.appService.warningServiceIPContextInitComplete = true;
        if (this.appService.warningServiceIPContext.existingWarningsStatus == false) {
          this.refreshTemplate();
          this.subjects.showWarnings.next();
        }
        else {
          this.refreshTemplate();
        }
      });
    }
    else {
      this.appService.warningServiceIPContextInitComplete = true;

      if (this.appService.warningServiceIPContext.existingWarningsStatus == false) {
        this.OpenWarnings();
      }
    }
    console.log("warnigns component loaded")
    console.log(e);
  }

  //click to refresh handler

  RefreshWarningsFromApi() {
    this.saveerror = false;
    this.dr.getAllergy(() => {
      this.appService.RefreshWarningsFromApi(() => { });
    });
  }
  SaveExistingWarnings() {
    this.saveerror = false;
    this.appService.warningServiceIPContext.UpdateOverrideMsg(null, (status, data, version = "") => {

      if (status == "success") {
        if (version) {
          this.appService.UpdateDataVersionNumber({ "version": version });
        }
        this.close_warnings.nativeElement.click();
        this.subjects.refreshTemplate.next();
      }
      else {
        this.saveerror = true;
        this.subjects.closeWarnings.next();
        if (this.appService.IsDataVersionStaleError(data)) {
          this.subjects.ShowRefreshPageMessage.next(data);
        }
      }

    });
  }

}

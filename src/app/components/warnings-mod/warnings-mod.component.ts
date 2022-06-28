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
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { forkJoin, Subscription } from 'rxjs';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { Epma_Medsondischarge } from 'src/app/models/EPMA';
import { WarningContext, WarningContexts, WarningService } from 'src/app/models/WarningServiceModal';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { ReconciliationListActions } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
@Component({
  selector: 'app-warnings-mod',
  templateUrl: './warnings-mod.component.html',
  styleUrls: ['./warnings-mod.component.css']
})
export class WarningsModComponent implements OnInit {


  componentModuleData: ComponentModuleData;
  showwarningscreen = true
  @ViewChild('open_warningsmod') open_warningsmod: ElementRef;
  @ViewChild('close_warningsmod') close_warningsmod: ElementRef;
  ws: WarningService;
  subscriptions = new Subscription();
  constructor(public appService: AppService, public apiRequest: ApirequestService, public subjects: SubjectsService, public dr: DataRequest) {
    this.SetComponentModuleData();

    this.subjects.showMODWarnings.subscribe((e) => {
      this.OpenWarnings();
    });

    this.subjects.closeMODWarnings.subscribe((e) => {
      this.CloseWarnings();
    });
  }
  ngOnDestroy(): void {
    console.log("unloading warnings epma component - mod")
  }

  OpenWarnings() {
    this.open_warningsmod.nativeElement.click();
  }
  CloseWarnings() {
    this.close_warningsmod.nativeElement.click();

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
    this.componentModuleData.moduleContext.enableOverride = this.appService.isCurrentEncouner;
    this.componentModuleData.moduleContext.warningContext = WarningContext.mod;
    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;
  }

  ngOnInit(): void {
  }

  OnWarningsModuleUnLoad(e: any) {
  }

  refreshTemplate() {
    this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
      this.subjects.refreshTemplate.next();
    }, this.ws);
  }

  OnWarningsLoadComplete(e: WarningContexts) {
    this.appService.warningServiceMODContext = e.GetWarningsInstance(WarningContext.mod);
    this.ws = this.appService.warningServiceMODContext
    //if there is no last refresh / no recored for this encounterid in WarningsStatus entity 
    //refresh from api 

    //get current allergies,bsa and weight
    //if allergies,weight, BSA has changed from last refresh
    //if yes refresh from api
    
    //change to condition on above logic
    if (this.appService.warningServiceMODContext.loader != true) {
      this.dr.TriggerWarningUpdateOnChanges(() => {
        if (this.appService.warningServiceMODContext.existingWarningsStatus == false) {
          this.refreshTemplate();
          this.subjects.showMODWarnings.next();

          //reset mod complete if there is a new warning based on external changes like allergies
          this.subscriptions.add(forkJoin([
            this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medsondischarge&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id),
            this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_dischargesummarry&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id)

          ]).subscribe(([responseArray2, responseArray3]) => {
            let medsondischarge;
            let dischargesummary;

            var upsertManager = new UpsertTransactionManager();
            upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
            if (JSON.parse(responseArray2).length > 0) {
              medsondischarge = JSON.parse(responseArray2)[0];
              if (medsondischarge.action == ReconciliationListActions.complete) {
                medsondischarge.action = ReconciliationListActions.resetcompletestatus;
                medsondischarge.iscomplete = false;
                medsondischarge.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
                medsondischarge.modifiedby = this.appService.loggedInUserName;
                upsertManager.addEntity('local', "epma_medsondischarge", JSON.parse(JSON.stringify(medsondischarge)));
              }
            }
            if (JSON.parse(responseArray3).length > 0) {
              dischargesummary = JSON.parse(responseArray3)[0];
              if (dischargesummary.action == ReconciliationListActions.complete) {
                dischargesummary.action = ReconciliationListActions.resetcompletestatus;
                dischargesummary.iscomplete = false;
                dischargesummary.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
                dischargesummary.modifiedby = this.appService.loggedInUserName;
                upsertManager.addEntity('local', "epma_dischargesummarry", JSON.parse(JSON.stringify(dischargesummary)));
              }
            }

            if (upsertManager.entities.length != 0) {
              upsertManager.save((resp) => {
                this.appService.UpdateDataVersionNumber(resp);

                this.appService.logToConsole(resp);
                upsertManager.destroy();
              },
                (error) => {
                  this.appService.logToConsole(error);
                  upsertManager.destroy();

                  if (this.appService.IsDataVersionStaleError(error)) {
                    this.subjects.ShowRefreshPageMessage.next(error);
                  }
                }
              );
            }
          }));

        }
        else {
          this.refreshTemplate();
        }
      }, WarningContext.mod); 
    }
    else {
      if (this.appService.warningServiceMODContext.existingWarningsStatus == false) {
        this.OpenWarnings();
      }
    }
    console.log("mod warnigns component loaded")
    console.log(e);
  }

  //click to refresh handler

  RefreshWarningsFromApi() {
    this.dr.getAllergy(() => {
      this.appService.RefreshWarningsFromApi(() => { }, this.ws);
    });
  }


}

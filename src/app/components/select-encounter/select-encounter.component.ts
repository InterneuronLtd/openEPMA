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
import { Component, OnInit, Output, EventEmitter, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { filters, filter, filterParams, filterparam, selectstatement, orderbystatement } from 'src/app/models/filter.model';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { Encounter } from 'src/app/models/encounter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { AppService } from 'src/app/services/app.service';

@Component({
  selector: 'app-encounter',
  templateUrl: './select-encounter.component.html',
  styleUrls: ['./select-encounter.component.css']
})

export class SelectEncounterComponent implements OnInit, OnDestroy {

  selectedEncounter: any;
  encounters: Array<Encounter> = [];

  selectedEncounterText: string = "Visits";

  @Output() loadComplete: EventEmitter<string> = new EventEmitter();
  @Output() clicked: EventEmitter<string> = new EventEmitter();
  @Output() encountersLoaded: EventEmitter<boolean> = new EventEmitter();
  @Input() nonInitiatorView: boolean = false;
  @ViewChild('encounterDropdown') encounterDropdown: ElementRef;
  @ViewChild('encounterTypeahead') encounterTypeahead: ElementRef;

  subscriptions: Subscription = new Subscription();

  constructor(private callAPI: ApirequestService, private subjects: SubjectsService, public appService: AppService, private datePipe: DatePipe) {
    this.subscriptions.add(
      this.subjects.personIdChange.subscribe(() => {
        this.fillEncounters();
      }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  fillEncounters() {
    let tcicode = this.appService.appConfig.AppSettings.encounterTCIClassCode;
    const ipcode = this.appService.appConfig.AppSettings.encounterInpatientClassCode;
    const opcode = this.appService.appConfig.AppSettings.encounterOPClassCode;
    const wlcode = this.appService.appConfig.AppSettings.encounterWLClassCode;

    this.subscriptions.add(this.callAPI.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_encounters", this.createEncounterFilter())
      .subscribe((response) => {
        this.encounters = [];
        if (!this.nonInitiatorView) {
          this.appService.encounter = null;
          this.appService.personencounters = [];
        }
        this.selectedEncounterText = "";
        let currentvisitadded = false
        for (var i = 0; i < response.length; i++) {

          if (response[i].patientclasscode?.toLowerCase() == tcicode) {
            let tcidisplaydate = "";
            // response[i].sortdate = null;
            if (response[i].sortdate) {
              tcidisplaydate = this.datePipe.transform(response[i].sortdate, 'dd-MMM-yyyy', 'en-GB');
            }
            else {
              tcidisplaydate = "No Date"
            }
            if (response[i].episodestatustext?.toLowerCase() == "cancel")
              response[i].displayText = "TCI - Cancelled (" + tcidisplaydate + ")";
            else
              response[i].displayText = "TCI  (" + tcidisplaydate + ")";
          }
          else if (response[i].patientclasscode?.toLowerCase() == ipcode) {
            if (currentvisitadded == false) {
              if (response[i].dischargedatetime == "" || response[i].dischargedatetime == null)
                response[i].displayText = "Current Visit (" + this.datePipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB') + ")";
              else
                response[i].displayText = "Previous Visit (" + this.datePipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB') + ")";
              currentvisitadded = true;
            }
            else
              response[i].displayText = "Previous Visit (" + this.datePipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB') + ")";
          }
          else if (response[i].patientclasscode?.toLowerCase() == wlcode) {
            response[i].displayText = "Waiting List - " + response[i].consultingdoctortext;
          }
          else if (response[i].patientclasscode?.toLowerCase() == opcode) {
            response[i].displayText = "Outpatient Visit (" + this.datePipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB') + ") - " + response[i].consultingdoctortext;
          }

          this.encounters.push(response[i])
          if (!this.nonInitiatorView) {
            this.appService.personencounters.push(response[i]);
          }
        }
        if (response != null && response.length > 0) {
          let curr = this.encounters.find(e => e.displayText.indexOf("Current Visit") != -1);
          if (!this.nonInitiatorView) {
            this.selectEncounter(curr ?? this.encounters[0]);
            this.encountersLoaded.emit(true);
          }
          else {
            this.selectedEncounterText = curr?.displayText ?? this.encounters[0].displayText
          }
        }
        else {
          if (!this.nonInitiatorView) {
            this.encountersLoaded.emit(false);
          }
        }
      })
    );
  }

  createEncounterFilter() {
    let condition = "person_id = @person_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));

    if (this.appService.outpatientPrescribingMode) {
      const opcode = this.appService.appConfig.AppSettings.encounterOPClassCode;
      let c1 = "lower(patientclasscode) = @patientclasscode"
      f.filters.push(new filter(c1));
      pm.filterparams.push(new filterparam("patientclasscode", opcode));
    }

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY sortdate desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  ngOnInit() {
    this.loadComplete.emit("Encounter component Ready");
    if (this.nonInitiatorView) {
      this.fillEncounters();
    }
  }

  public selectEncounter(encounter: Encounter) {
    this.selectedEncounterText = encounter.displayText;
    this.appService.encounter = encounter;
    this.appService.isCurrentEncouner = encounter.displayText.indexOf("Current Visit") != -1;
    this.appService.isTCI = encounter.displayText.indexOf("TCI") != -1 || encounter.displayText.indexOf("Waiting") != -1;
    this.appService.isTCICancelled = encounter.displayText.indexOf("TCI") != -1 && encounter.displayText.indexOf("Cancelled") != -1;
    this.appService.isOP = encounter.displayText.indexOf("Outpatient") != -1;

    this.appService.setPatientAgeAtAdmission();
    this.subjects.encounterChange.next(encounter);
    this.selectedEncounter = "";
    this.encounterDropdown.nativeElement.click();
  }

  encounterClicked() {
    this.clicked.emit("Encounter component clicked");
    this.encounterTypeahead.nativeElement.click();
  }
}

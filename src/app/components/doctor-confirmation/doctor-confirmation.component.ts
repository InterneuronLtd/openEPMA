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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { DoseEvents, Medicationadministration, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { DoseType } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
@Component({
  selector: 'app-doctor-confirmation',
  templateUrl: './doctor-confirmation.component.html',
  styleUrls: ['./doctor-confirmation.component.css']
})
export class DoctorConfirmationComponent implements OnInit, OnDestroy {
  @Output() hideAdministrationForm = new EventEmitter();
  @Input() prescription: Prescription;
  @Input() dose: any;
  administration: Medicationadministration = new Medicationadministration();
  subscriptions = new Subscription();
  doseEvents: DoseEvents = new DoseEvents();
  dose_id: string;
  showSpinnerConfirm: boolean = false;
  showSpinnerCancel: boolean = false;
  showEditpopup: boolean = false;
  editpopuptypetype="Cancel Event";
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) { }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe
  }

  ngOnInit(): void {
    this.showSpinnerConfirm = false;
    this.showSpinnerCancel = false;
    let d = this.dose;
    this.appService.logToConsole(d);
    this.dose_id = d.dose_id.split('_')[1];
    this.administration.planneddatetime = moment(new Date(d.eventStart)).format('YYYY-MM-DD HH:mm');
  }
  closePopup() {
    this.hideAdministrationForm.emit(false)
  }
  cancelAdministration() {
    this.showEditpopup=true;
    // this.doseEvents.doseevents_id = uuid();
    // this.doseEvents.logicalid = this.dose.dose_id;
    // this.doseEvents.dose_id = this.dose_id;
    // this.doseEvents.dosedatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.planneddatetime, 'YYYY-MM-DD HH:mm').toDate());
    // this.doseEvents.startdatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.planneddatetime, 'YYYY-MM-DD HH:mm').toDate());
    // this.doseEvents.eventtype = "Cancel";
    // this.doseEvents.iscancelled = true;
    // this.doseEvents.posology_id = this.dose.posology_id;
    // this.doseEvents.comments = "";
    // delete this.doseEvents._sequenceid;
    // this.showSpinnerCancel = true;
    // this.subscriptions.add(
    //   this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=core&synapseentityname=doseevents', JSON.stringify(this.doseEvents))
    //     .subscribe((response) => {
    //       this.appService.UpdateDataVersionNumber(response);

    //       this.appService.logToConsole(response);
    //       // let medobj: DoseEvents;
    //       // medobj = <DoseEvents>response[0];
    //       // this.doseEvents._sequenceid = medobj._sequenceid;
    //       // this.appService.DoseEvents.push(this.doseEvents);

    //       this.dr.getDoseEvents(() => {
    //         this.hideAdministrationForm.emit(true);
    //         this.showSpinnerCancel = false;
    //       });
    //     }, (error) => {
    //       this.showSpinnerCancel = false;
    //       this.hideAdministrationForm.emit(true);

    //       if (this.appService.IsDataVersionStaleError(error)) {
    //         this.appService.RefreshPageWithStaleError(error);
    //       }
    //     }));
  }
  hidecancel(isrefresh = false) {
    this.hideAdministrationForm.emit(true);
  }
  confirmAdministration() {

    this.doseEvents.doseevents_id = uuid();
    this.doseEvents.logicalid = this.dose.dose_id;
    this.doseEvents.dose_id = this.dose_id;
    this.doseEvents.dosedatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.planneddatetime, 'YYYY-MM-DD HH:mm').toDate());
    this.doseEvents.startdatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.planneddatetime, 'YYYY-MM-DD HH:mm').toDate());
    this.doseEvents.eventtype = "doconfirm";
    this.doseEvents.iscancelled = false;
    this.doseEvents.posology_id = this.dose.posology_id;
    this.doseEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.doseEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
    this.doseEvents.createdby = this.appService.loggedInUserName;
    this.doseEvents.modifiedby = this.appService.loggedInUserName;
    delete this.doseEvents._sequenceid;
    this.appService.logToConsole(this.doseEvents);
    this.showSpinnerConfirm = true;
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=core&synapseentityname=doseevents', JSON.stringify(this.doseEvents))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.appService.logToConsole(response);
          // let medobj: DoseEvents;
          // medobj = <DoseEvents>response[0];
          // this.doseEvents._sequenceid = medobj._sequenceid;
          // this.appService.DoseEvents.push(this.doseEvents);

          this.dr.getDoseEvents(() => {
            this.hideAdministrationForm.emit(true);
            this.showSpinnerConfirm = false;
          });
        }, (error) => {
          this.showSpinnerConfirm = false;
          this.hideAdministrationForm.emit(true);

          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        }));
  }
  setDose(dose_id: string) {
    var timelineDose = this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).__dose.find(d => d.dose_id === dose_id);
    if (this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).dosetype == DoseType.units) {
      this.administration.planneddosesize = timelineDose.dosesize;
      this.administration.planneddoseunit = timelineDose.doseunit;
      this.administration.planneddosemeasure = timelineDose.dosemeasure;

      this.administration.administreddosesize = timelineDose.dosesize;
      this.administration.administreddoseunit = timelineDose.doseunit;
      this.administration.administreddosemeasure = timelineDose.dosemeasure;

    }
    if (this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).dosetype == DoseType.strength) {
      this.administration.plannedstrengthneumerator = timelineDose.strengthneumerator;
      this.administration.plannedstrengthneumeratorunits = timelineDose.strengthneumeratorunit;
      this.administration.plannedstrengthdenominator = timelineDose.strengthdenominator;
      this.administration.plannedstrengthdenominatorunits = timelineDose.strengthdenominatorunit;

      this.administration.administeredstrengthneumerator = timelineDose.strengthneumerator;
      this.administration.administeredstrengthneumeratorunits = timelineDose.strengthneumeratorunit;
      this.administration.administeredstrengthdenominator = timelineDose.strengthdenominator;
      this.administration.administeredstrengthdenominatorunits = timelineDose.strengthdenominatorunit;
    }
    if (this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).dosetype == DoseType.descriptive) {

    }

  }
}

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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { InfusionEvents, Prescription, PrescriptionEvent } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { AdministrationStatus, PrescriptionStatus } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.css']
})
export class CommentsComponent implements OnInit, OnDestroy {
  //showReasonForChange: boolean = false;
  reasonComments: string;
  reasonStatus: string;
  showSpinner: boolean = false;
  subscriptions = new Subscription();
  prescription: Prescription;
  prescriptionEvent: PrescriptionEvent;
  infusionEvents: InfusionEvents;
  isMOAPrescription: boolean;
  message: string;
  @Input('event') event: any

  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest) {

  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {

    //this.showReasonForChange = true;
    this.reasonComments = "";
    this.prescription = event.prescription;
    this.reasonStatus = event.status;
    this.isMOAPrescription = false;
    if (event.isMOAPrescription) {
      this.isMOAPrescription = event.isMOAPrescription;
    }


  } ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  closeReasonPopup() {
    //this.showReasonForChange = false;
    this.subjects.closeAppComponentPopover.next();
  }
  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  saveContinuosInfusionTherapy() {
    var statusId = "";
    let administration = this.appService.Medicationadministration.find(e => e.prescription_id == this.prescription.prescription_id);
    if (administration) {
      statusId = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped).prescriptionstatus_id;
    } else {
      statusId = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
    }

    var data = Object.assign({}, this.prescription);
    Object.keys(data).map((e) => { if (e.startsWith("_")) delete data[e]; });
    data.prescriptionstatus_id = statusId;
    let lastmodifiedon = this.appService.getDateTimeinISOFormat(new Date());
    data.lastmodifiedon = lastmodifiedon;
    data.lastmodifiedby = this.appService.loggedInUserName;

    this.prescriptionEvent = new PrescriptionEvent();
    this.prescriptionEvent.epma_prescriptionevent_id = uuid();
    this.prescriptionEvent.comments = this.reasonComments;
    this.prescriptionEvent.correlationid = this.prescription.correlationid;
    this.prescriptionEvent.createdby = this.appService.loggedInUserName;
    this.prescriptionEvent.datetime = this.appService.getDateTimeinISOFormat(new Date());
    this.prescriptionEvent.prescriptionid = this.prescription.prescription_id;
    this.prescriptionEvent.prescriptionstatusid = statusId;
    this.prescriptionEvent.person_id = this.appService.personId;
    this.prescriptionEvent.encounter_id = this.appService.encounter.encounter_id;

    if (this.prescription.infusiontype_id == "ci") {
      this.showSpinner = true;
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
      let isEndEventAdministered =null ;
      let isNotGiven = null;
      let startTime = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && e.dose_id.includes("start_"));
      let endEvent = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && e.dose_id.includes("end_"));
      if(endEvent) {
        isEndEventAdministered = this.appService.InfusionEvents.find(x => x.logicalid == endEvent.dose_id && x.eventtype=='endinfusion');
      }
      if(startTime) {
        isNotGiven = this.appService.Medicationadministration.find(x => x.logicalid == startTime.dose_id && x.adminstrationstatus == AdministrationStatus.notgiven);
      }
      if (this.prescription.infusiontype_id == "ci" && startTime && !isNotGiven && !isEndEventAdministered  && moment(startTime.eventStart).isBefore(moment().toDate())) {
        let logical_id = "";
        let dose_id = "";
        let plannedtime: any;
        let end = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && e.dose_id.includes("end_"));
        if (end) {
          logical_id = end.dose_id;
          dose_id = end.dose_id.split('_')[2];
          plannedtime = end.eventStart.toDate();
        } else {
          let start = this.appService.events.find(e => e.prescription_id == this.prescription.prescription_id && e.dose_id.includes("start_"));
          if (start) {
            dose_id = start.dose_id.split('_')[2];
            logical_id = "end_" + this.createLogicalId(new Date(), dose_id);
            plannedtime = new Date();
          }
        }
        this.infusionEvents = new InfusionEvents();
        this.infusionEvents.infusionevents_id = uuid();
        this.infusionEvents.dose_id = dose_id;
        this.infusionEvents.planneddatetime = this.appService.getDateTimeinISOFormat(plannedtime);
        this.infusionEvents.eventdatetime = this.appService.getDateTimeinISOFormat(new Date());
        this.infusionEvents.logicalid = logical_id;
        this.infusionEvents.posology_id = this.appService.GetCurrentPosology(this.prescription).posology_id;
        this.infusionEvents.eventtype = "endinfusion_planned";
        this.infusionEvents.comments = "End infusion from stop prescription";
        this.infusionEvents.administeredby = this.appService.loggedInUserName;
        delete this.infusionEvents._sequenceid;
        upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
        this.appService.logToConsole(this.infusionEvents);
      }

      upsertManager.addEntity('core', 'prescription', JSON.parse(JSON.stringify(data)));
      upsertManager.addEntity('local', "epma_prescriptionevent", JSON.parse(JSON.stringify(this.prescriptionEvent)));

      let linkedInfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == this.prescription.prescription_id);
      for (let infusion of linkedInfusion) {
        if (!this.appService.Medicationadministration.find(x => x.dose_id == this.appService.GetCurrentPosology(infusion).__dose.find(x => x.continuityid == null).dose_id)) {
          //let startDose = [].concat(...this.appService.Prescription.map(p => p.__posology.map(pos => pos.__dose))).find(x => x.prescription_id == infusion.prescription_id && x.continuityid == null);
          let startDose = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).find(x => x.prescription_id == infusion.prescription_id && x.continuityid == null);
          var duration = moment.duration(moment(new Date()).diff(moment(startDose.dosestartdatetime)));
          var diffMinutes = duration.asMinutes();
          startDose.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(startDose.dosestartdatetime).add(diffMinutes, "minutes").toDate());
          this.appService.GetCurrentPosology(infusion).prescriptionstartdate = startDose.dosestartdatetime;
          if(startDose.doseenddatatime) {
            startDose.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(startDose.doseenddatatime).add(diffMinutes, "minutes").toDate());
          }
          if (this.appService.GetCurrentPosology(infusion).prescriptionenddate) {
            this.appService.GetCurrentPosology(infusion).prescriptionenddate = startDose.doseenddatatime;
          }
          let doseobject = Object.assign({}, startDose);
          let posologyobject = Object.assign({}, this.appService.GetCurrentPosology(infusion));

          Object.keys(posologyobject).map((e) => { if (e.startsWith("_")) delete posologyobject[e]; });
          Object.keys(doseobject).map((e) => { if (e.startsWith("_")) delete doseobject[e]; });

          upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobject)));
          upsertManager.addEntity('core', 'posology', JSON.parse(JSON.stringify(posologyobject)));

          let allDoses = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(x => x.prescription_id == infusion.prescription_id && x.continuityid == startDose.dose_id);
          for (let flowdoses of allDoses) {
            flowdoses.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(flowdoses.dosestartdatetime).add(diffMinutes, "minutes").toDate());
            flowdoses.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(flowdoses.doseenddatatime).add(diffMinutes, "minutes").toDate());
            let doseobjectflow = Object.assign({}, flowdoses);
            Object.keys(doseobjectflow).map((e) => { if (e.startsWith("_")) delete doseobjectflow[e]; });
            upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobjectflow)));
          }

        }
      }

      upsertManager.save((response) => {
        this.appService.UpdateDataVersionNumber(response);

        let linkedInfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == this.prescription.prescription_id);
        if (linkedInfusion.length > 0) {
          this.dr.getAllPrescription(() => {
            this.dr.getInfusionEvents(() => {
              this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).prescriptionstatus_id = statusId;
              this.appService.RefreshWarningsFromApi(() => {
                this.dr.GetPrescriptionEvent(() => {
                  this.dr.PharmacyReviewReset(this.prescription, this.prescriptionEvent.epma_prescriptionevent_id, () => {
                    this.subjects.refreshDrugChart.next("refresh");
                    this.showSpinner = false;
                    this.subjects.closeAppComponentPopover.next();
                    this.subjects.showWarnings.next();
                    this.subjects.reloadCurrentModule.next();
                  });

                });
              });
            });
          });
        } else {
          this.dr.getInfusionEvents(() => {
            this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).prescriptionstatus_id = statusId;
            this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).lastmodifiedon = lastmodifiedon;
            this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).lastmodifiedby = data.lastmodifiedby;
            this.appService.RefreshWarningsFromApi(() => {
              this.dr.GetPrescriptionEvent(() => {
                this.dr.PharmacyReviewReset(this.prescription, this.prescriptionEvent.epma_prescriptionevent_id, () => {
                  this.subjects.refreshDrugChart.next("refresh");
                  this.showSpinner = false;
                  this.subjects.closeAppComponentPopover.next();
                  this.subjects.showWarnings.next();

                });

              });
            });
          });
        }



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
  }
  saveReason() {
    this.message = "";
    if (this.appService.isReasonForChangeReuired) {
      if (!this.reasonComments) {
        this.message = "Please enter reason";
        return;
      }
    }
    if (this.prescription.infusiontype_id == "ci" && !this.isMOAPrescription) {
      this.saveContinuosInfusionTherapy();
    } else {
      var statusId = this.appService.MetaPrescriptionstatus.find(x => x.status == this.reasonStatus).prescriptionstatus_id;
      var data = Object.assign({}, this.prescription);
      Object.keys(data).map((e) => { if (e.startsWith("_")) delete data[e]; });
      data.prescriptionstatus_id = statusId;
      data.lastmodifiedon = this.appService.getDateTimeinISOFormat(new Date());
      data.lastmodifiedby = this.appService.loggedInUserName;

      this.prescriptionEvent = new PrescriptionEvent();
      this.prescriptionEvent.epma_prescriptionevent_id = uuid();
      this.prescriptionEvent.comments = this.reasonComments;
      this.prescriptionEvent.correlationid = this.prescription.correlationid;
      this.prescriptionEvent.createdby = this.appService.loggedInUserName;
      this.prescriptionEvent.datetime = this.appService.getDateTimeinISOFormat(new Date());
      this.prescriptionEvent.prescriptionid = this.prescription.prescription_id;
      this.prescriptionEvent.prescriptionstatusid = statusId;
      this.prescriptionEvent.person_id = this.appService.personId;
      this.prescriptionEvent.encounter_id = this.appService.encounter.encounter_id;

      this.showSpinner = true;
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
      upsertManager.addEntity('core', 'prescription', JSON.parse(JSON.stringify(data)));
      upsertManager.addEntity('local', "epma_prescriptionevent", JSON.parse(JSON.stringify(this.prescriptionEvent)));
      upsertManager.save((resp) => {
        this.appService.UpdateDataVersionNumber(resp);

        this.appService.logToConsole(resp);
        upsertManager.destroy();
        this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).prescriptionstatus_id = statusId;
        this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).lastmodifiedon = data.lastmodifiedon;
        this.appService.Prescription.find(x => x.prescription_id == this.prescription.prescription_id).lastmodifiedby = data.lastmodifiedby;



        this.appService.RefreshWarningsFromApi(() => {
          this.dr.GetPrescriptionEvent(() => {
            this.dr.PharmacyReviewReset(this.prescription, this.prescriptionEvent.epma_prescriptionevent_id, () => {
              this.reasonStatus = "";
              this.reasonComments = "";
              this.subjects.refreshDrugChart.next("refresh");
              this.showSpinner = false;
              this.subjects.closeAppComponentPopover.next();
              this.subjects.showWarnings.next();
            });
          });

        });

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
  }

}

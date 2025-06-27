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
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import moment from 'moment';
import { Medication, Medicationadministration, MetaPrescriptionadditionalcondition, MetaPrescriptionstatus, Prescription, PrescriptionEvent } from 'src/app/models/EPMA';
import { AppService } from 'src/app/services/app.service';
import { PrescriptionContext, PrescriptionStatus } from 'src/app/services/enum';

@Component({
  selector: 'app-prescription-infusion-template',
  templateUrl: './prescription-infusion-template.component.html',
  styleUrls: ['./prescription-infusion-template.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class PrescriptionInfusionTemplateComponent implements OnInit {

  metaprescriptionstatus: MetaPrescriptionstatus[];
  additionalcondition: MetaPrescriptionadditionalcondition[];
  medicationadminstration: Medicationadministration;
  prescriptionEvent: PrescriptionEvent;
  @Input() componenttype: string;
  @Input() prescription: Prescription;
  @Input() administration: Medicationadministration;
  @Input() fromPrinting = false;
  @Input() posologyid: string;
  @Input() sumstatus: string;
  showPrescriptionHistory: boolean = false;
  primaryMedication: Medication;
  plannedTime: string;
  routes = "";
  choosenDays = "";
  prescriptionAdditionalCondition = "";
  device = "";
  oxygenAdditionalInformation: string = "";
  indicationstring = "";
  isMOAPrescription: boolean = false;
  startDate: any;
  modifiedFrom: any;
  prescriptionEventComment: string;
  dischargeSummaryComment: string;
  dischargeSummarystatus: string;
  prescription_id: string;
  prescriptionstatus: string;
  prnmaxdosestring: string;
  prescribedConcentration: string

  constructor(public appService: AppService) { }

  ngOnInit(): void {
    const currentPosology = this.appService.GetCurrentPosology(this.prescription);
    this.prescription_id = this.prescription.prescription_id;
    this.prescription.__medications.sort(value => {
      return value.isprimary ? -1 : 1
    });
    this.metaprescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.additionalcondition = this.appService.MetaPrescriptionadditionalcondition;
    this.primaryMedication = this.prescription.__medications.find(e => e.isprimary == true);
    if (this.administration) {
      this.plannedTime = moment(this.administration.planneddatetime, "YYYY-MM-DD HH:mm").format("DD-MMM-YYYY HH:mm");
    }
    let oxydevice = this.appService.oxygenDevices.find(x => x.code == this.prescription.oxygendevices_id);
    if (oxydevice) {
      this.device = oxydevice.name;
    }

    this.startDate = this.prescription.startdatetime;
    if (moment(this.prescription.startdatetime).format("YYYYMMDDHHmm") != moment(currentPosology.prescriptionstartdate).format("YYYYMMDDHHmm")) {
      this.modifiedFrom = currentPosology.prescriptionstartdate;
    } else {
      this.modifiedFrom = null;
    }

    this.GetRoutes();
    this.GetChoosenDays();
    this.getOxygenAditionalInformation();
    this.getMOAPrescription();
    this.indicationstring = this.appService.GetIndication(this.prescription);

    this.prescriptionEvent = this.appService.prescriptionEvent.find(e => e.prescriptionid == this.prescription_id);
    if (this.prescriptionEvent) {
      this.prescriptionEventComment = this.prescriptionEvent.comments;
    }

    this.GetDischargeSummaryMessage();
    this.getPrescriptionStatus();
    if (currentPosology.prn && currentPosology.prnmaxdose) {
      this.prnmaxdosestring = this.appService.GetPRNMaxDoseDisplayString(currentPosology.prnmaxdose);
    }
    this.prescribedConcentration = this.appService.CalculatePrescribedConcentration(this.prescription);
  }
  
  GetRoutes() {
    this.routes = this.prescription.__routes.sort((x, y) => Number(y.isdefault) - Number(x.isdefault)).map(m => m.route).join(",");
  }
  GetChoosenDays() {
    this.choosenDays = JSON.parse(this.appService.GetCurrentPosology(this.prescription, this.posologyid).daysofweek).join(", ");
  }
  getOxygenAditionalInformation() {
    let arrayAdd = [];
    if (this.prescription.oxygenadditionalinfo) {
      JSON.parse(this.prescription.oxygenadditionalinfo).forEach(element => {
        arrayAdd.push(this.appService.oxygenprescriptionadditionalinfo.find(e => e.oxygenprescriptionadditionalinfo_id == element).additionalinfo);
      });
    }
    this.oxygenAdditionalInformation = arrayAdd.join(",");
  }
  GetAdditionalcondition() {
    var condition = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == this.prescription.prescriptionadditionalconditions_id);
    if (condition)
      this.prescriptionAdditionalCondition = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == this.prescription.prescriptionadditionalconditions_id).additionalcondition;
    else
      this.prescriptionAdditionalCondition = "No additional criteria";
  }
  getMOAPrescription() {
    if (this.prescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id) {
      this.isMOAPrescription = true;
    }
  }
  GetDischargeSummaryMessage() {
    // discharge summary comment
    this.dischargeSummaryComment = "";
    this.dischargeSummarystatus = "";
    if (this.componenttype == 'SUMNO') {
      let prescription_stop_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped || x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
      let prescription_cancel_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
      let prescription_suspend_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.suspended).prescriptionstatus_id;
      let allPrescription = this.appService.Prescription.filter(x => x.__medications.find(x => x.isprimary).__codes[0].code == this.primaryMedication.__codes[0].code && x.prescriptioncontext_id != this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Discharge).prescriptioncontext_id);
      if (this.sumstatus == PrescriptionStatus.stopped) {
        let allStop = allPrescription.filter(x => x.prescriptionstatus_id == prescription_stop_statusid || x.prescriptionstatus_id == prescription_cancel_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));
        if (allStop && allStop.length > 0) {
          let comment = this.appService.prescriptionEvent.find(e => e.prescriptionid == allStop[0].prescription_id);
          if (comment) {
            this.dischargeSummaryComment = comment.comments;
            this.dischargeSummarystatus = PrescriptionStatus.stopped;
          }
        }
      }
      if (this.sumstatus == PrescriptionStatus.suspended) {
        let addedToChart = allPrescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Inpatient).prescriptioncontext_id).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
        if (addedToChart && addedToChart.length == 0)// this drug was not added to drug chart as inpatient medication 
        {
          this.dischargeSummaryComment = "Medicine suspended on admission";
          this.dischargeSummarystatus = PrescriptionStatus.suspended;
        }
        else {
          let allActive = allPrescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Inpatient).prescriptioncontext_id && x.prescriptionstatus_id != prescription_suspend_statusid && x.prescriptionstatus_id != prescription_stop_statusid && x.prescriptionstatus_id != prescription_cancel_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
          if (allActive && allActive.length > 0) // added to drug chart as inpatient medicaiton but, not to discharge prescription 
          {
            this.dischargeSummaryComment = "Medicine suspended on discharge";
            this.dischargeSummarystatus = PrescriptionStatus.suspended;
          } else {
            let allSuspend = allPrescription.filter(x => x.prescriptionstatus_id == prescription_suspend_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
            if (allSuspend && allSuspend.length > 0) // added to drug chart and manually suspended 
            {
              let comment = this.appService.prescriptionEvent.find(e => e.prescriptionid == allSuspend[0].prescription_id);
              if (comment) {
                this.dischargeSummaryComment = comment.comments;
                this.dischargeSummarystatus = PrescriptionStatus.suspended;
              }
            }
          }
        }
      }
    }
  }
  getPrescriptionStatus() {
    var status = this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == this.prescription.prescriptionstatus_id);
    if (status)
      this.prescriptionstatus = this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == this.prescription.prescriptionstatus_id).status;
    else
      this.prescriptionstatus = "active";
  }

}

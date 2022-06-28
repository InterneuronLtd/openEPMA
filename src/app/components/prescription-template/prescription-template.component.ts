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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs/internal/Subscription';
import { InfusionEvents, Medication, Medicationadministration, MetaPrescriptionadditionalcondition, MetaPrescriptionstatus, Prescription, PrescriptionEvent } from 'src/app/models/EPMA';
import { Product } from 'src/app/models/productdetail';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { PrescriptionContext, PrescriptionStatus, title } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { SupplyRequestStatus } from 'src/app/services/enum';
@Component({
  selector: 'app-prescription-template',
  templateUrl: './prescription-template.component.html',
  styleUrls: ['./prescription-template.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrescriptionTemplateComponent implements OnInit, OnDestroy {
  @Output() basketAction = new EventEmitter();
  @Output() showTitrationForm = new EventEmitter();
  subscriptions: Subscription = new Subscription();
  metaprescriptionstatus: MetaPrescriptionstatus[];
  additionalcondition: MetaPrescriptionadditionalcondition[];
  medicationadminstration: Medicationadministration;
  infusionEvents: InfusionEvents = new InfusionEvents();
  @Input() componenttype: string;
  @Input() prescription: Prescription;
  @Input() administration: Medicationadministration;
  @Input() posologyid: string;
  @Input() sumstatus: string;
  showPrescriptionHistory: boolean = false;
  primaryMedication: Medication;
  therapyTypeClass: string;
  isresupply: boolean = false;
  resupply=title.resupply
  ComplianceAid=title.ComplianceAid
  Highalertmedication=title.Highalertmedication
  NursingInstruction=title.NursingInstruction
  pharmacyreview=title.pharmacyreview
  critialdrug=title.critialdrug
  nonformularymedication=title.nonformularymedication
  clinicaltrialmedicine=title.clinicaltrialmedicine
  expensivemedication=title.expensivemedication
  highalertmedication=title.highalertmedication
  unlicencedmedicine=title.unlicencedmedicine
  isAdministered: boolean = false;
  eventType: string;
  isDateShown = false;
  distinctDate: string[];
  prescription_id: string;
  antimicobialDate: string;
  prescriptionstatus: string;
  dayNumber: number;
  therapyType: string;
  prescriptionAdditionalConditions: string;
  chosenDays: any;
  prescriptionsource: string;
  badgeText: string;
  reasonStatus: string;
  showSpinner: boolean = false;
  prescriptionEvent: PrescriptionEvent;
  reminderIcon: string;
  reminderIconDesc: string;
  reminderIconIvtoOral: string;
  reminderIconDescIvtoOral: string;
  reviewStatusIcon: string;
  reviewStatusDesc: string;
  isPrescriptionGas: boolean = false;
  oxygenAdditionalInformation: string;
  isMOAPrescription: boolean = false;
  indicationstring = "";
  showCompliance: boolean = false;
  showOwnSupply: boolean = false;
  showWardStockIcon: boolean = false;
  isNewMedicine: any;
  startDate: any;
  modifiedFrom: any;
  plannedTime: any;
  prescriptionEventComment: string;
  prescriptionCardComment: string;
  dischargeSummaryComment: string;
  dischargeSummarystatus: string;
  protocolMessage: string;
  showModifiedStatus: boolean;
  opAdministeredCSSClass: string;
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public cd: ChangeDetectorRef) {
    this.subscriptions.add(this.subjects.refreshTemplate.subscribe
      ((event) => {
        if (this.prescription.prescription_id == event) {
          this.isAdministered = false;
          this.isresupply = false;
          this.prescription = this.appService.Prescription.find(e => e.prescription_id == event);
        }
        this.initComponent();
        cd.detectChanges();
      
      }));
  }

  initComponent() {
    this.prescription_id = this.prescription.prescription_id;
    this.metaprescriptionstatus = this.appService.MetaPrescriptionstatus;
    this.additionalcondition = this.appService.MetaPrescriptionadditionalcondition;
    this.primaryMedication = this.prescription.__medications.find(e => e.isprimary == true);
    this.medicationadminstration = this.appService.Medicationadministration.sort((b, a) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime()).find(e => e.prescription_id == this.prescription.prescription_id);

    if (this.appService.InfusionEvents.sort((b, a) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(x => x.posology_id == this.appService.GetCurrentPosology(
      this.prescription).posology_id)) {
      this.eventType = this.appService.InfusionEvents.sort((b, a) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(x => x.posology_id == this.appService.GetCurrentPosology(
        this.prescription).posology_id).eventtype;
    }
   
    // View medication supply icon
    let medicationSupply = this.appService.PrescriptionMedicaitonSupply.find(x => x.prescriptionid == this.prescription_id);
    if (medicationSupply) {
      this.showCompliance = medicationSupply.complianceaid ? true : false;
      this.showOwnSupply = medicationSupply.ownsupplyathome;
      this.showWardStockIcon = medicationSupply.resupplyfrom=="Ward stock" ? true : false;
    }
    //View Supply Request Icon
    let supplyRequests = this.appService.SupplyRequest.filter(s => s.prescription_id == this.prescription_id &&
      s.medication_id == this.prescription.__medications.find(x => x.isprimary).__codes.find(x => x.terminology == "formulary").code &&
      (s.requeststatus == SupplyRequestStatus.Incomplete || s.requeststatus == SupplyRequestStatus.Pending));

    if (supplyRequests.length > 0) {
      this.isresupply = true;
    } else {
      this.isresupply = false;
    }
    this.isNewMedicine = this.appService.checkMedicineTypeForMoa(this.prescription, true);
    if (this.medicationadminstration) {
      //this.isresupply = this.medicationadminstration.requestresupply;
      this.isAdministered = true;
      this.GetOPAdministrationIcon();
    }
    this.showModifiedStatus = !(this.prescription.prescriptioncontext_id ==
      this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id)
    // if (this.firstmedicationadminstration) {
    //   this.startDate = this.firstmedicationadminstration.administrationstartime;
    // } else {
    //   this.startDate = this.appService.GetCurrentPosology(this.prescription).prescriptionstartdate;
    // }
    this.startDate = this.prescription.startdatetime;
    if (moment(this.prescription.startdatetime).format("YYYYMMDDHHmm") != moment(this.appService.GetCurrentPosology(this.prescription).prescriptionstartdate).format("YYYYMMDDHHmm")) {
      this.modifiedFrom = this.appService.GetCurrentPosology(this.prescription).prescriptionstartdate;
    } else {
      this.modifiedFrom = null;
    }
    this.isPrescriptionGas = false;
    if (this.primaryMedication.form) {
      this.isPrescriptionGas = this.primaryMedication.form.includes("gas");
    }
    if (!this.appService.GetCurrentPosology(this.prescription).__dose) {
      let d = this.appService.GetCurrentPosology(this.prescription).__dose;
    }
    this.appService.GetCurrentPosology(this.prescription).__dose.sort((a, b) => new Date(a.dosestartdatetime).getTime() - new Date(b.dosestartdatetime).getTime());

    this.distinctDate = this.appService.GetCurrentPosology(this.prescription).__dose.filter(d => d.dosesize || d.strengthdenominator).filter(
      (thing, i, arr) => arr.findIndex(t => moment(new Date(t.dosestartdatetime)).format("DD-MM-YYYY") === moment(new Date(thing.dosestartdatetime)).format("DD-MM-YYYY")) === i
    ).map(x => x.dosestartdatetime);
    this.prescriptionEvent = this.appService.prescriptionEvent.find(e => e.prescriptionid == this.prescription_id);
    if (this.prescriptionEvent) {
      this.prescriptionEventComment = this.prescriptionEvent.comments;
    }

    //set max length comments
    let maxCardCommentLen = 0;
    let maxlencomments = this.appService.appConfig.AppSettings.prescriptionCardCommentsMaxLenth;
    if (isNaN(maxlencomments) || +maxlencomments <= 0) {
      maxCardCommentLen = 256;
    }
    else {
      maxCardCommentLen = +maxlencomments;
    }
    if (this.prescription.comments && this.prescription.comments.length > maxCardCommentLen) {
      this.prescriptionCardComment = this.prescription.comments.slice(0, 255);
      this.prescriptionCardComment = this.prescriptionCardComment + "...";
    } else {
      this.prescriptionCardComment = this.prescription.comments;
    }
    this.GetDischargeSummaryMessage();
    this.getPrescriptionStatus();
    this.getdayNumber();
    this.GetTherapyType();
    this.getAdditionalcondition(this.prescription.prescriptionadditionalconditions_id);
    this.GetChosenDays();
    this.GetSource();
    this.getReminderIcon();
    this.getPharmacistReviewStatus();
    this.getOxygenAditionalInformation();
    this.getMOAPrescription();
    this.getProtocolMessage();
    
    if (this.appService.appConfig.isMultiplelinkedinfusion) {
      this.appService.getMultilinkPrescriptionBags();
    } else {
      this.appService.getPrescriptionBags();
    }
    let badge = this.appService.PrescriptionBag.find(x => x.prescriptionid == this.prescription.prescription_id);
    if (badge) {
      this.badgeText = badge.Batch;
    }

    this.indicationstring = this.appService.GetIndication(this.prescription);
    if (this.administration) {
      this.plannedTime = moment(this.administration.planneddatetime, "YYYY-MM-DD HH:mm").format("DD-MMM-YYYY HH:mm");
    }
    // if (this.componenttype != "therapyoverview") {
    //   this.getNursingInstructions();
    // }


  }

  ngOnInit(): void {
    this.initComponent();
  }
  ngOnDestroy(): void {
    this.appService.logToConsole("destroy template pop");
    this.subscriptions.unsubscribe();
  }
  medicationBasketAction(actionType) {
    this.basketAction.emit({ prescription_id: this.prescription.prescription_id, action: actionType });
  }
  getMOAPrescription() {
    if (this.prescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id) {
      this.isMOAPrescription = true;
    }
  }
  isShowDate(starteDate: any, i: number = null) {
    let date = this.distinctDate.find(x => moment(new Date(x)).format("DD-MMM-YYYY HH:mm") == moment(new Date(starteDate.dosestartdatetime)).format("DD-MMM-YYYY HH:mm"));
    if (date) {
      if (this.isMOAPrescription && i != null) {
        return "Day " + (this.distinctDate.findIndex(x => x == date) + 1).toString();
      }
      else
        return moment(new Date(starteDate.dosestartdatetime)).format("DD-MMM-YYYY");
    } else {
      return "";
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
  GetEndDateNumber() {
    return (Math.ceil(moment(this.appService.GetCurrentPosology(this.prescription).prescriptionenddate).set("h", 0).set("minute", 0).diff(moment(this.appService.GetCurrentPosology(this.prescription).prescriptionstartdate).set("h", 0).set("minute", 0), "d", true)) + 1)
  }
  GetTherapyType() {
    if (!this.primaryMedication.form) {
      this.therapyType = "therapy";
    }
    else if (this.primaryMedication.form.toLowerCase().indexOf("tablet") != -1 || this.primaryMedication.form.toLowerCase().indexOf("capsule") != -1) {
      this.therapyType = "TabletorCapsule";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("injection") != -1) {
      this.therapyType = "Injection";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("infusion") != -1) {
      if (this.prescription.infusiontype_id == "ci") {
        this.therapyType = "ContinuousInfusion";
      } else {
        this.therapyType = "Infusion";
      }

    } else if (this.primaryMedication.form.toLowerCase().indexOf("fluid") != -1) {
      this.therapyType = "BasicFluids";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("inhalation") != -1) {
      this.therapyType = "Inhalation";
    } else {
      this.therapyType = "therapy";
    }
  }
  getdayNumber() {
    let startwithzero = false;
    if (this.appService.GetCurrentPosology(this.prescription).antimicrobialstartdate) {

      let stoppedId = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.stopped).prescriptionstatus_id;
      let cancelledId = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.cancelled).prescriptionstatus_id;
      let currDate = moment().toDate();
      let stopDate;
      if (this.prescription.prescriptionstatus_id == stoppedId || this.prescription.prescriptionstatus_id == cancelledId) {
        stopDate = this.prescription.lastmodifiedon;
      }
      if (stopDate && moment(currDate).format("YYYYMMDD") > moment(stopDate).format("YYYYMMD")) {
        currDate = stopDate;
      } else if (this.appService.GetCurrentPosology(this.prescription).prescriptionenddate && moment(currDate).format("YYYYMMDD") > moment(this.appService.GetCurrentPosology(this.prescription).prescriptionenddate).format("YYYYMMD")) {
        currDate = this.appService.GetCurrentPosology(this.prescription).prescriptionenddate;
      }

      this.antimicobialDate = moment(this.appService.GetCurrentPosology(this.prescription).antimicrobialstartdate).format("DD-MM-YYYY HH:mm");

      startwithzero = this.appService.appConfig.AppSettings.startAMTherapyCountFromDay0;
      let days;
      if (this.appService.appConfig.AppSettings.amTherapyCount24Hrs) {
        days = moment().diff(moment(this.appService.GetCurrentPosology(this.prescription).antimicrobialstartdate), 'days');
      }
      else {
        days = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).diff(moment(this.appService.GetCurrentPosology(this.prescription).antimicrobialstartdate).clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }), 'days');
      }

      if (days < 0) {
        this.dayNumber = 0;
      } else {
        this.dayNumber = days;
        if (!startwithzero)
          this.dayNumber++;
      }
    }
  }
  GetSource() {
    // if (this.prescription.prescriptionsources) {
    //   this.prescriptionsource = this.appService.MetaPrescriptionSource.find(e => e.prescriptionsource_id == this.prescription.prescriptionsource_id).source;
    // } else {
    //   this.prescriptionsource = null;
    // }
    this.prescriptionsource = null;
    if (this.prescription.prescriptionsources && Array.isArray(JSON.parse(this.prescription.prescriptionsources))) {
      let srcs = <Array<string>>JSON.parse(this.prescription.prescriptionsources);
      let sources: string = "";
      srcs.forEach(src => {
        let s = this.appService.MetaPrescriptionSource.find(s => s.prescriptionsource_id == src);
        if (s) {
          if (s.source.toLowerCase() == "other")
            sources += s.source + " (" + this.prescription.otherprescriptionsource + "), "
          else
            sources += s.source + ", "
        }
      });
      if (sources)
        this.prescriptionsource = sources.trim().replace(/\,+$/g, '');
    }
  }

  GetChosenDays() {
    this.chosenDays = JSON.parse(this.appService.GetCurrentPosology(this.prescription).daysofweek).join(", ");
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
  getPrescriptionStatus() {
    var status = this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == this.prescription.prescriptionstatus_id);
    if (status)
      this.prescriptionstatus = this.metaprescriptionstatus.find(x => x.prescriptionstatus_id == this.prescription.prescriptionstatus_id).status;
    else
      this.prescriptionstatus = "active";
  }
  getProtocolMessage() {
    this.protocolMessage = "";
    let posology = this.appService.GetCurrentPosology(this.prescription);
    if (posology.repeatlastday == true && posology.repeatlastdayuntil == null) {
      this.protocolMessage = "Last day of the protocol repeated until cancelled";
    }
    else if (posology.repeatlastday == true && posology.repeatlastdayuntil != null) {
      this.protocolMessage = "Last day of the protocol repeated until the " + moment(posology.repeatlastdayuntil).format("Do MMM YYYY");
    }
    else if (+posology.repeatprotocoltimes > 0) {
      this.protocolMessage = "Repeated " + posology.repeatprotocoltimes + " time(s) until the " + (posology.prescriptionenddate == null ? "cancelled" : moment(posology.prescriptionenddate).format("Do MMM YYYY"));
    }
  }
  // getLegendPrescriptionStatus(status: string) {
  //   var id = this.metaprescriptionstatus.find(x => x.status == status).prescriptionstatus_id;
  //   var psatus = this.appService.Prescription.filter(p => p.prescriptionstatus_id == id && p.prescription_id == this.prescription_id)
  //   if (psatus.length > 0)
  //     return true;
  //   else
  //     return false;
  // }
  getAdditionalcondition(id: string) {
    var condition = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == id);
    if (condition)
      this.prescriptionAdditionalConditions = this.additionalcondition.find(x => x.prescriptionadditionalconditions_id == id).additionalcondition;
    else
      this.prescriptionAdditionalConditions = "No additional criteria";
  }
  getReminderIcon() {
    this.reminderIcon = "";
    this.reminderIconDesc = "";
    this.reminderIconIvtoOral = "";
    this.reminderIconDescIvtoOral = "";
    let icons = this.appService.Prescriptionreminders.slice().filter(x => x.prescription_id == this.prescription_id && !x.isacknowledged);
    icons.forEach((item) => {
      item.__calculatedactivationdatetime = null;
      if (!item.activationdatetime) {
        let administration = this.appService.Medicationadministration.filter(x => x.prescription_id == this.prescription.prescription_id).sort((a, b) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime());
        if (administration.length > 0) {
          item.__calculatedactivationdatetime = moment(administration[0].administrationstartime, "YYYY-MM-DD HH:mm").add(+item.activationinhours, "hours")
        }
      } else {
        item.__calculatedactivationdatetime = moment(item.activationdatetime);
      }
    });
    let active = icons.filter(e => e.__calculatedactivationdatetime).filter(e => moment(e.__calculatedactivationdatetime).format("YYYYMMDDHHmm") <= moment().format("YYYYMMDDHHmm"));
    let switchtoOral = icons.find(x => x.isivtooral == true);
    let otherthanswitchtoOral = icons.find(x => !x.isivtooral);
    let overduetimeSwitchtoOral;
    let overduetimeOther;
    if (icons.length > 0) {
      if (otherthanswitchtoOral) {
        this.reminderIcon = "template-reminder-icon-set";
        this.reminderIconDesc = "Reminder set";
      }
      if (switchtoOral) {
        this.reminderIconIvtoOral = "template-switch-to-oral-set";
        this.reminderIconDescIvtoOral = "Switch IV to oral";
      }
    }
    if (active.length > 0) {
      let switchtoOralactive = active.find(x => x.isivtooral == true);
      let otherthanswitchtoOralactive = active.find(x => !x.isivtooral);
      if (otherthanswitchtoOralactive) {
        this.reminderIcon = "template-reminder-icon-active";
        this.reminderIconDesc = "Reminder active";
        overduetimeOther = moment(otherthanswitchtoOralactive.__calculatedactivationdatetime.toDate());
        overduetimeOther.add(this.appService.appConfig.defaultOverdueTimePeriod, "hours");
      }
      if (switchtoOralactive) {
        this.reminderIconIvtoOral = "template-switch-to-oral-acive";
        this.reminderIconDescIvtoOral = "Switch IV to oral active";
        overduetimeSwitchtoOral = moment(switchtoOralactive.__calculatedactivationdatetime.toDate());
        overduetimeSwitchtoOral.add(this.appService.appConfig.defaultOverdueTimePeriod, "hours");
      }
    }
    if (overduetimeOther) {
      let overdue = icons.find(e => overduetimeOther.format("YYYYMMDDHHmm") < moment().format("YYYYMMDDHHmm"));
      if (overdue) {
        if (otherthanswitchtoOral) {
          this.reminderIcon = "template-reminder-icon-overdue";
          this.reminderIconDesc = "Reminder overdue";
        }
      }
    }
    if (overduetimeSwitchtoOral) {
      let overdue = icons.find(e => overduetimeSwitchtoOral.format("YYYYMMDDHHmm") < moment().format("YYYYMMDDHHmm"));
      if (overdue) {
        if (switchtoOral) {
          this.reminderIconIvtoOral = "template-switch-to-oral-overdue";
          this.reminderIconDescIvtoOral = "Switch IV to  overdue";
        }
      }
    }
  }
  getPharmacistReviewStatus() {
    let reviewStatus = this.appService.Prescriptionreviewstatus.slice().filter(e => e.prescription_id == this.prescription.prescription_id).sort((b, a) => new Date(a.modifiedon).getTime() - new Date(b.modifiedon).getTime());
    if (reviewStatus.length > 0) {
      this.reviewStatusIcon = "";
      let status = this.appService.MetaReviewstatus.find(e => e.reviewstatus_id == reviewStatus[0].status);
      this.reviewStatusDesc = status.description;
      if (status.status == "Grey" && (this.componenttype == "MOA" || this.componenttype == "MOANO" || this.componenttype == "MOD" || this.componenttype == "MODNO" || this.componenttype == "SUM" || this.componenttype == "SUMNO")) {
        this.reviewStatusDesc = "Medicine comments and change history";
      }
      if (status.status == "Grey") {
        this.reviewStatusIcon = "Pharmacist_review_not_required";
      }
      if (status.status == "Amber") {
        this.reviewStatusIcon = "Waiting_for_pharmacist_review";
      }
      if (status.status == "Green") {
        this.reviewStatusIcon = "Pharmacist_review_complete";
      }
      if (status.status == "Red") {
        this.reviewStatusIcon = "Pharmacist_reviewed_back_to_prescriber";
      }
    }
  }
  hidePrescriptionHistory() {
    this.appService.openPrescriptionHistory = false;
  }
  openPrescriptionHistory() {

    this.subjects.pharmacyReview.next(this.prescription);
  }
  suspendTherapy() {
    this.reasonStatus = PrescriptionStatus.suspended;
    this.subjects.comments.next({ prescription: this.prescription, status: this.reasonStatus });
  }
  editTherapy(clonetherapy: boolean = false) {
    if (clonetherapy == true || this.isMOAPrescription) {
      this.subjects.clonePrescription.next(this.prescription);
    }
    else {
      this.subjects.editPrescription.next(this.prescription);
    }
  }
  restartTherapy() {
    if (this.isMOAPrescription) {
      this.subjects.clonePrescription.next(this.prescription);
    } else {
      this.reasonStatus = PrescriptionStatus.restarted
      this.subjects.comments.next({ prescription: this.prescription, status: this.reasonStatus });
    }

  }
  stopTherapy() {
    let administration = this.appService.Medicationadministration.find(e => e.prescription_id == this.prescription_id);
    if (administration) {
      this.reasonStatus = PrescriptionStatus.stopped;
    } else {
      this.reasonStatus = PrescriptionStatus.cancelled;
    }
    if (this.isMOAPrescription) {
      this.reasonStatus = PrescriptionStatus.stopped;
    }
    this.subjects.comments.next({ prescription: this.prescription, status: this.reasonStatus, isMOAPrescription: this.isMOAPrescription });
  }

  patientDrugs() {
    this.subjects.patientDrug.next({ prescription: this.prescription });
  }

  supplyRequest(componenttype) {
    this.subjects.supplyRequest.next({ prescription: this.prescription, componenttype : componenttype });
  }
  addAdministration() {
    this.subjects.showopAdministration.next({ prescription: this.prescription , type: "OpAdministration" });
  }

  viewAdministration() {
    this.subjects.showopAdministration.next({ prescription: this.prescription , type: "View Administration" });
  }

  reminder() {
    this.subjects.viewReminder.next({ prescription: this.prescription });
  }

  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }
  pleaseResupply() {
    this.isresupply = true;
  }
  scheduleAdditionalAdministration() {
    this.subjects.additionalAdministration.next({ type: 'schedule', prescription: this.prescription });
  }
  recordAdditionalAdministration() {
    this.subjects.additionalAdministration.next({ type: 'record', prescription: this.prescription });
  }
  drugInformation() {
    this.subjects.drugInformation.next(this.prescription.__medications.find(x => x.isprimary == true));
  }
  doseTitration() {
    //this.showTitrationForm.next();
    this.subjects.titrationChart.next({ prescription: this.prescription, isOnlyShowChart: true, componenttype: this.componenttype });
  }
  selfAdministration() {
    this.subjects.drugInformation.next({ prescription: this.prescription });
  }
  changeInfusion() {
    this.subjects.changeInfusion.next({ prescription: this.prescription });
  }
  addInfusionRate() {
    this.subjects.adjustInfusion.next({ prescription: this.prescription });
  }
  pauseInfusion() {
    this.subjects.pauseInfusion.next({ prescription: this.prescription });
  }
  addBolus() {
    this.subjects.addBolus.next({ prescription: this.prescription });
  }
  restartInfusion() {
    this.subjects.restartInfusion.next({ prescription: this.prescription });
  }
  showNursingInstructions() {
    //open the popup to show nursing instrustions
    this.subjects.nursingInstruction.next(this.prescription.__nursinginstructions);

  }
  GetOPAdministrationIcon() {
      
    if(moment(this.medicationadminstration.planneddatetime).isSame(this.medicationadminstration.administrationstartime)) {
      if(this.medicationadminstration.planneddosesize == this.medicationadminstration.administreddosesize) {
        this.opAdministeredCSSClass= "OP_Completed_Administration";
      } else {
        // green with triangle
        this.opAdministeredCSSClass= "OP_Dose_Administered_Is_Different_From_Prescribed";
      }
    } else  if(moment(this.medicationadminstration.planneddatetime).isAfter(this.medicationadminstration.administrationstartime)) {
      if(this.medicationadminstration.planneddosesize == this.medicationadminstration.administreddosesize) {
        this.opAdministeredCSSClass= "OP_Administration_Completed_Early";
      } else {
        // green with triangle
        this.opAdministeredCSSClass= "OP_Dose_Administered_Early_Is_Different_From_Prescribed";
      }
    } 
    else  if(moment(this.medicationadminstration.planneddatetime).isBefore(this.medicationadminstration.administrationstartime)) {
      if(this.medicationadminstration.planneddosesize == this.medicationadminstration.administreddosesize) {
        this.opAdministeredCSSClass= "OP_Administration_Completed_Late";
      } else {
        // green with triangle
        this.opAdministeredCSSClass= "OP_Dose_Administered_Late_Is_Different_From_Prescribed";
      }
    } 
  }

  // getNursingInstructions() {
  //   let primarymedication = this.prescription.__medications.find(x => x.isprimary);
  //   if (primarymedication) {
  //     let dmd = primarymedication.__codes.find(x => x.terminology == "formulary");
  //     if (dmd && dmd.code != 'custom') {
  //       let formularyid = dmd.code;
  //       var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
  //       this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${formularyid}?api-version=1.0`)
  //         .subscribe((response) => {
  //           if (response && response.length != 0) {
  //             this.prescription.__customWarning=response.detail.customWarnings;
  //             response.detail.endorsements.forEach(e => {

  //               this.nursingInstructions.push(new NursingInstructions(null, "Endorsement", e));

  //             });
  //             response.detail.medusaPreparationInstructions.forEach(e => {
  //               this.nursingInstructions.push(new NursingInstructions(null, "Medusa Instructions", e));
  //             });
  //           }

  //           this.cd.detectChanges();
  //         }));
  //     }
  //   }
  // }
}

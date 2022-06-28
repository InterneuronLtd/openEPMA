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
import { Injectable } from '@angular/core';
import { Encounter } from '../models/encounter.model';
import jwt_decode from 'jwt-decode';
import { Prescription, Posology, Dose, DoseEvents, Medication, Medicationadministration, Medicationcodes, Medicationingredients, Medicationroutes, MetaPrescriptionstatus, MetaPrescriptionduration, DrugChart, MetaPrescriptionadditionalcondition, Prescriptionroutes, InfusionEvents, PrescriptionSource, Oxygendevices, MetaReviewstatus, SupplyRequest, Prescriptionreminders, Prescriptionreviewstatus, MetaPrescriptioncontext, Orderset, PrescriptionEvent, PrescriptionMedicaitonSupply, AdministerMedication } from "src/app/models/EPMA"
import { action } from '../models/filter.model';
import { Observation, Observationscaletype, PersonObservationScale } from '../models/observations.model';
import * as moment from 'moment';
import { Indication } from '../components/prescribing-form/formhelper';
import { DoseType, PrescriptionContext, PrescriptionStatus, RefWeightType } from './enum';
import { PatientInfo, WarningContext, WarningContexts, WarningService } from '../models/WarningServiceModal';
import { Allergyintolerance } from '../models/allergy.model';
import { SubjectsService } from './subjects.service';
import { Product } from '../models/productdetail';
import { Subject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AppService {
  personAgeInDays: number;
  warningServiceIPContext: WarningService;
  warningServiceMODContext: WarningService;
  // warningServiceOPContext: Array<{ "opid": string, "warningservice": WarningService }>;

  bannerWarningStatus: boolean = true;
  personencounters: Encounter[];
  refWeightType: RefWeightType;
  warningServiceIPContextInitComplete: boolean;
  criticalDrugbuffertimeAmber: number;
  EnableDischargeSummaryComplete: any;

  // AddToOPWarningContext(opid: string, service: WarningService) {
  //   let i = this.warningServiceOPContext.find(x => x.opid == opid);
  //   if (i) {
  //     i.warningservice = service;
  //   } else {
  //     this.warningServiceOPContext.push({ "opid": opid, "warningservice": service });
  //   }
  // }

  // GetOPWarningContext(opid) {
  //   return this.warningServiceOPContext.find(o => o.opid == opid);
  // }
  GetCurrentPrescriptionsForWarnings(wc: WarningContext = WarningContext.ip): any {
    if (wc == WarningContext.ip) {
      return this.Prescription.filter(
        p =>
          (p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.active).prescriptionstatus_id
            ||
            p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.modified).prescriptionstatus_id
            ||
            p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.restarted).prescriptionstatus_id

          )
          &&
          p.prescriptioncontext_id == this.MetaPrescriptioncontext.find(pc => pc.context === PrescriptionContext.Inpatient).prescriptioncontext_id
      )
    }
    else if (wc == WarningContext.mod) {
      return this.Prescription.filter(
        p =>
          (p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.active).prescriptionstatus_id
            ||
            p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.modified).prescriptionstatus_id
            ||
            p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.restarted).prescriptionstatus_id

          )
          &&
          p.prescriptioncontext_id == this.MetaPrescriptioncontext.find(pc => pc.context === PrescriptionContext.Discharge).prescriptioncontext_id
      )
    } else if (wc.startsWith(WarningContext.op)) {
      let opid = wc.split('_')[1];
      let opp = this.optherapies.find(x => x.opid == opid);
      if (opp && opp.opprescriptions.length > 0) {
        return this.Prescription.filter(
          p =>
            (p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.active).prescriptionstatus_id
              ||
              p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.modified).prescriptionstatus_id
              ||
              p.prescriptionstatus_id == this.MetaPrescriptionstatus.find(mp => mp.status === PrescriptionStatus.restarted).prescriptionstatus_id

            )
            &&
            p.prescriptioncontext_id == this.MetaPrescriptioncontext.find(pc => pc.context === PrescriptionContext.Outpatient).prescriptioncontext_id
            &&
            opp.opprescriptions.filter(x => x == p.prescription_id).length != 0
        )
      }
      else {
        return [];
      }
    }
  }

  isAppDataReady: boolean;
  showdrugChart: boolean;
  showDischargeSummaryNotes: boolean = true;

  constructor(private subject: SubjectsService) { }
  public modulename = "app-epma";
  public dataversion = null;
  public oxygenprescriptionadditionalinfo = [];
  public changechoosenFilterDate: any;
  public isreportview = false;
  public reportData: any = [];
  public batchIndex = 0;
  public linkedBatchArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  public enableLogging = true;
  public appConfig: any;
  public buffertimeAmber: number;
  public bufferAdministered: number;
  public apiService: any;
  public baseURI: string;
  public prescriptionId: string;
  public personId: string;
  public encounter: Encounter;
  public isCurrentEncouner = false;
  public isTCI = false;
  public isTCICancelled = false;
  public isTitrationPopOverOpen = false;
  public optherapies: Array<{ "opid": string, "opprescriptions" }> = [];

  public MetaPrescriptionstatus: Array<MetaPrescriptionstatus>;
  public MetaReviewstatus: Array<MetaReviewstatus>;
  public MetaPrescriptioncontext: Array<MetaPrescriptioncontext>;
  public Prescription: Array<Prescription>;
  public Prescriptionreminders: Array<Prescriptionreminders>;
  public PrescriptionBag: any;
  public Prescriptionreviewstatus: Array<Prescriptionreviewstatus>;
  public FilteredPrescription: Array<Prescription>;
  public TherapyPrescription: Array<Prescription>;
  //public Posology: Array<Posology>;
  //public Dose: Array<Dose>;
  public events: any = [];
  public DoseEvents: Array<DoseEvents>;
  public InfusionEvents: Array<InfusionEvents>;
  //public Medication: Array<Medication>;
  public Medicationadministration: Array<Medicationadministration>;
  //public Medicationingredients: Array<Medicationingredients>;
  //public Medicationroutes: Array<Medicationroutes>;
  //public Prescriptionroutes: Array<Prescriptionroutes>;
  public MetaPrescriptionDuration: Array<MetaPrescriptionduration>;
  //public Medicationcodes: Array<Medicationcodes>;
  public DrugeGroupsType: Array<string>;
  public TimelineArray: DrugChart[];
  public VtmUnits: any[];
  public oxygenDevices: Array<Oxygendevices> = [];

  public MetaPrescriptionadditionalcondition: Array<MetaPrescriptionadditionalcondition>;
  public openPrescriptionHistory: boolean = false;
  public openAdditionalAdministration: boolean = false;
  public MetaPrescriptionSource: Array<PrescriptionSource>;

  public roleActions: action[] = [];
  public loggedInUserName: string = null;
  public obsScales: Array<Observationscaletype> = [];
  public observation: Array<Observation> = [];
  public personAgeAtAdmission: number;
  public personAgeToday: number;

  public personDOB: Date;
  public personscale: PersonObservationScale = null;
  public currentEWSScale: string;
  public isWeightCaptured: boolean = false;
  public isWeightCapturedForToday: boolean = false;
  public refWeightValue: number;
  public idealWeightValue: number;
  public refWeightRecordedOn: string;
  public isHeightCaptured: boolean = false;
  public refHeightValue: number;
  public bodySurfaceArea: number;
  public therapyCurrentDate: any;
  public therapyNoOfDays: number;
  public drugGroupOption: string;
  public drugRouteOption: string;
  public drugSortOrder: string;
  public SupplyRequest: Array<SupplyRequest> = [];
  public loggedInUserRoles: Array<string> = [];
  public pleaseResupplyStockValidation: boolean = false;
  public remainingEvents: Array<Prescription> = [];
  public prescriptionHistory = [];
  public patientDetails;
  public encounterDetails;
  public patientInfo: PatientInfo
  public warningService: WarningContexts;
  public allergyintolerance: Array<Allergyintolerance>;
  public gender: string;
  public isReasonForChangeReuired: boolean = false;
  public administrationWitness = [];
  public platfromServiceURI: string;
  public DCGroups: any;
  public dcgroupadded: any;
  public prescriptionEvent: Array<PrescriptionEvent> = [];
  public PrescriptionMedicaitonSupply: Array<PrescriptionMedicaitonSupply> = [];
  public medReconcelationCompleteStatus = "not reviewed by pharmacy";
  public administrationTimeDiffInMinute: number
  public DoseEventsHistory: Array<DoseEvents>;
  public InfusionEventsHistory: Array<InfusionEvents>;
  public MedicationadministrationHistory: Array<Medicationadministration>;
  public AdministermedicationHistory: Array<AdministerMedication>;
  reset(): void {
    this.warningServiceIPContextInitComplete = false;
    this.dataversion = null;
    this.personId = null;
    this.encounter = null;
    this.isCurrentEncouner = null;
    this.isTCI = null;
    this.isTCICancelled = null;
    this.apiService = null;
    this.baseURI = null;
    this.loggedInUserName = null;
    this.enableLogging = true;
    this.roleActions = [];
    this.personDOB = null;
    this.personAgeAtAdmission = null;
    this.personAgeToday = null;
    this.personAgeInDays = null;
    this.personscale = null;
    this.currentEWSScale = null;
    this.obsScales = [];
    this.optherapies = [];
    this.prescriptionId = null;
    if (this.Prescription)
      this.Prescription.forEach(p => {
        p.__posology.forEach(pos => {
          pos.__dose = null;
          pos = null;
        });

        p.__medications.forEach(m => {
          m.__codes.forEach(c => {
            c = null;
          });
          m.__ingredients.forEach(i => {
            i = null;
          });
          m = null;
        });
        p.__medications = null;
        p.__routes.forEach(r => {
          r = null
        });
        p.__routes = null;
        p.__editingprescription = null;
        p.__editingreviewstatus = null;
        p.__initialreminder = null;

      });

    this.MetaPrescriptionstatus = [];
    this.MetaReviewstatus = [];

    this.Prescription = [];
    this.FilteredPrescription = [];
    this.TherapyPrescription = [];
    this.isWeightCaptured = false;
    this.isHeightCaptured = false;
    this.isWeightCapturedForToday = false;
    this.InfusionEvents = [];
    this.DoseEvents = [];
    //this.Prescriptionroutes = [];
    // this.Posology = [];
    //this.Dose = [];
    this.events = null;;
    this.DoseEvents = [];
    this.InfusionEvents = [];
    // this.Medication = [];
    this.Medicationadministration = [];
    //this.Medicationingredients = [];
    //this.Medicationroutes = [];
    //this.Prescriptionroutes = [];
    this.MetaPrescriptionDuration = [];
    // this.Medicationcodes = [];
    this.DrugeGroupsType = [];
    this.TimelineArray = [];
    this.VtmUnits = [];
    this.PrescriptionBag = [];
    this.MetaPrescriptionadditionalcondition = [];
    this.openPrescriptionHistory = null;
    this.openAdditionalAdministration = null;
    this.MetaPrescriptionSource = [];
    this.Prescriptionreminders = [];
    this.roleActions = [];
    this.loggedInUserName = null;
    this.obsScales = [];
    this.observation = [];

    this.personDOB = null;
    this.personscale = null;
    this.currentEWSScale = null;
    this.isWeightCaptured = null;
    this.isWeightCapturedForToday = null;
    this.refWeightValue = null;
    this.idealWeightValue = null;
    this.refWeightRecordedOn = null;
    this.isHeightCaptured = null;
    this.refHeightValue = null;
    this.bodySurfaceArea = null;
    this.therapyCurrentDate = null;
    this.therapyNoOfDays = null;
    this.drugGroupOption = null;
    this.drugRouteOption = null;
    this.drugSortOrder = null;
    this.SupplyRequest = [];
    this.oxygenDevices = [];
    this.oxygenprescriptionadditionalinfo = [];
    this.isAppDataReady = false;
    this.batchIndex = 0;
    this.Prescriptionreviewstatus = [];
    this.loggedInUserRoles = [];
    this.pleaseResupplyStockValidation = false;
    this.allergyintolerance = [];
    this.gender = null;
    this.isReasonForChangeReuired = false;
    this.administrationWitness = [];
    this.platfromServiceURI = null;
    this.prescriptionEvent = [];
    this.warningServiceIPContext = null;
    this.warningServiceMODContext = null;
    this.warningService = null;
    this.bannerWarningStatus = true;
    this.refWeightType = null;
    this.PrescriptionMedicaitonSupply = [];
    this.administrationTimeDiffInMinute = null;
    this.DoseEventsHistory = [];
    this.InfusionEventsHistory = [];
    this.MedicationadministrationHistory = [];
    this.AdministermedicationHistory = [];
  }

  decodeAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    }
    catch (Error) {
      this.logToConsole(`Error: ${Error}`);
      return null;
    }
  }


  public AuthoriseAction(action: string): boolean {
    if (this.appConfig && this.appConfig.AppSettings.enableRBAC)
      return this.roleActions.filter(x => x.actionname.toLowerCase().trim() == action.toLowerCase()).length > 0;
    else
      return true;

  }

  public getPrescriptionBags() {
    this.batchIndex = 0;
    this.PrescriptionBag = [];
    let allprescriptionbatches = this.Prescription.slice();
    allprescriptionbatches.sort((a, b) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime());
    for (let prescription of allprescriptionbatches) {
      if (this.PrescriptionBag.find(x => x.prescriptionid == prescription.prescription_id)) {
        continue;
      }
      if (prescription.linkedinfusionid) {
        let letterBatch = "";
        if (this.PrescriptionBag.find(x => x.prescriptionid == prescription.linkedinfusionid)) {
          let temp = this.PrescriptionBag.find(x => x.prescriptionid == prescription.linkedinfusionid).Batch;
          letterBatch = temp.split("-")[0];
          letterBatch = letterBatch + "-" + (+temp.split("-")[1] + 1).toString();
          this.PrescriptionBag.push(
            {
              prescriptionid: prescription.prescription_id,
              Batch: letterBatch

            }
          );
        }

        else {
          let batchletter = this.getlinkedArrayLetter();
          this.PrescriptionBag.push({
            prescriptionid: prescription.linkedinfusionid,
            Batch: batchletter + "-0"
          }
          );
          this.PrescriptionBag.push({
            prescriptionid: prescription.prescription_id,
            Batch: batchletter + "-1"
          }
          );
        }
      }
    }
  }

  public getMultilinkPrescriptionBags() {
    this.batchIndex = 0;
    this.PrescriptionBag = [];
    let allprescriptionbatches = this.Prescription.slice();
    allprescriptionbatches.sort((a, b) => new Date(a.createdon).getTime() - new Date(b.createdon).getTime());
    for (let prescription of allprescriptionbatches) {
      if (this.PrescriptionBag.find(x => x.prescriptionid == prescription.prescription_id)) {
        continue;
      }
      if (prescription.linkedinfusionid) {
        let letterBatch = "";
        if (this.PrescriptionBag.find(x => x.prescriptionid == prescription.linkedinfusionid)) {
          let parentbag = this.PrescriptionBag.find(x => x.prescriptionid == prescription.linkedinfusionid).Batch;
          let count = 1;
          let multilink = allprescriptionbatches.filter(x => x.linkedinfusionid == prescription.linkedinfusionid)
          for (let linkprescri of multilink) {
            letterBatch = parentbag + "." + count;
            this.PrescriptionBag.push(
              {
                prescriptionid: linkprescri.prescription_id,
                Batch: letterBatch

              }
            );
            count++;
          }

        }

        else {
          let batchletter = this.getlinkedArrayLetter();
          this.PrescriptionBag.push({
            prescriptionid: prescription.linkedinfusionid,
            Batch: batchletter
          }
          );
          let count = 1;
          let multilink = allprescriptionbatches.filter(x => x.linkedinfusionid == prescription.linkedinfusionid)
          for (let linkprescri of multilink) {
            letterBatch = batchletter + "." + count;
            this.PrescriptionBag.push(
              {
                prescriptionid: linkprescri.prescription_id,
                Batch: letterBatch

              }
            );
            count++;
          }

        }
      }
    }
  }

  getlinkedArrayLetter() {
    this.batchIndex++;
    return this.linkedBatchArray.charAt(this.batchIndex - 1);

  }
  public getDateTimeinISOFormat(date: Date): string {

    var time = date;
    var hours = time.getHours();
    var s = time.getSeconds();
    var m = time.getMilliseconds()
    var minutes = time.getMinutes();
    date.setHours(hours);
    date.setMinutes(minutes);
    //date.setSeconds(s);
    //date.setMilliseconds(m);
    //this.appService.logToConsole(date);
    let year = date.getFullYear();
    let month = (date.getMonth() + 1);
    let dt = date.getDate();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();
    let msecs = date.getMilliseconds();
    let returndate = (year + "-" + (month < 10 ? "0" + month : month) + "-" + (dt < 10 ? "0" + dt : dt) + "T" + (hrs < 10 ? "0" + hrs : hrs) + ":" + (mins < 10 ? "0" + mins : mins) + ":" + (secs < 10 ? "0" + secs : secs) + "." + (msecs < 10 ? "00" + msecs : (msecs < 100 ? "0" + msecs : msecs)));
    //this.appService.logToConsole(returndate);
    return returndate;
  }

  setPatientAgeAtAdmission(setAgeAtEarliestPosologyStartDate: moment.Moment = null) {
    console.log("setAgeAtEarliestPosologyStartDate" + setAgeAtEarliestPosologyStartDate);
    this.personAgeAtAdmission = moment(this.encounter.sortdate ?? moment(), moment.ISO_8601).diff(moment(this.personDOB, moment.ISO_8601), "years");
    this.personAgeToday = moment(moment(), moment.ISO_8601).diff(moment(this.personDOB, moment.ISO_8601), "years");
    if (setAgeAtEarliestPosologyStartDate) {
      this.personAgeInDays = moment(setAgeAtEarliestPosologyStartDate ?? moment(), moment.ISO_8601).diff(moment(this.personDOB, moment.ISO_8601), "days");
    }
    else {
      this.personAgeInDays = moment(moment(), moment.ISO_8601).diff(moment(this.personDOB, moment.ISO_8601), "days");
    }
    console.log(this.personAgeInDays);
  }

  logToConsole(msg: any) {
    if (this.enableLogging) {
      console.log(msg);
    }
  }
  setCurrentScale() {
    let scale = "";
    if (this.personAgeAtAdmission < 19) {
      if (this.personAgeAtAdmission <= 0)
        scale = "PEWS-0To11Mo";
      else if (this.personAgeAtAdmission >= 1 && this.personAgeAtAdmission <= 4)
        scale = "PEWS-1To4Yrs";
      else if (this.personAgeAtAdmission >= 5 && this.personAgeAtAdmission <= 12)
        scale = "PEWS-5To12Yrs";
      else if (this.personAgeAtAdmission >= 13 && this.personAgeAtAdmission <= 18)
        scale = "PEWS-13To18Yrs";

    } else
      if (this.personscale) {

        scale = this.obsScales.filter(x => x.observationscaletype_id == this.personscale.observationscaletype_id)[0].scaletypename;
      }
      else {
        scale = "NEWS2-Scale1";
      }
    this.currentEWSScale = scale;
    return scale;
  }

  GetIndication(p: Prescription) {
    if (p.indication && p.indication.indexOf("indication") != -1 && p.indication.indexOf("code") != -1) {
      let ind = <Indication>JSON.parse(p.indication);
      if (ind.code == "other")
        return ind.indication + " - " + p.otherindications;
      else
        return ind.indication;
    }
    else
      return p.indication
  }



  checkMedicineTypeForMoa(prescription: Prescription, getchangestatus = false): boolean | number {

    let ismoa = prescription.prescriptioncontext_id ==
      this.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id;
    if (ismoa) {
      return getchangestatus ? 0 : true;
    } else {

      let medcode = prescription.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code;

      let codeobject = this.Prescription.find(p =>
        p.prescription_id != prescription.prescription_id &&
        p.prescriptioncontext_id == this.MetaPrescriptioncontext.find(w => w.context == PrescriptionContext.Admission).prescriptioncontext_id &&
        p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode);

      if (getchangestatus) {
        if (codeobject) {
          let issame = this.ComparePrescriptions(prescription, codeobject);
          return issame ? 0 : 1; //1= orange 0= blue
        }
        else {
          return -1; // -1 = no icon
        }
      }
      else {
        if (codeobject) {
          return true;// MOA match and no need to show
        } else {
          return false // Code not found and MOA prescription not prescribed
        }
      }
    }
  }

  UpdatePrescriptionWarningSeverity(parray: Array<Prescription>, cb, ws: WarningService = this.warningServiceIPContext) {
    ws.GetExistingWarnings(false, (data) => {
      parray.forEach(p => {
        const highwarnings = data.filter(
          x => (x.primaryprescriptionid == p.prescription_id || x.secondaryprescriptionid == p.prescription_id)
            && x.severity == 4)
        if (highwarnings && highwarnings.length > 0) {
          p.__severityWarning = highwarnings[0].severity;
          p.__warningOverrideREQ = highwarnings.filter(w => w.overriderequired).length > 0;
        }
      })
      cb();
    })
  }

  RefreshWarningsFromApi(cb, ws = this.warningServiceIPContext) {
    if (this.isTCI && !this.encounter.sortdate) {
      let minposologystartdateexisting = moment.min([].concat(...this.GetCurrentPrescriptionsForWarnings(ws.context).map(p => p.__posology)).map(pos => (<Posology>pos).prescriptionstartdate));

      this.setPatientAgeAtAdmission(minposologystartdateexisting);
    }
    this.logToConsole("Refreshing warnigns from api");
    ws.existingWarningsStatus = false;
    ws.RefreshCurrentMedicationWarnings(this.GetCurrentPrescriptionsForWarnings(ws.context), this.patientInfo, (status, data, version = "") => {
      this.logToConsole("Refreshing warnigns from api - complete");
      if (status == "success") {
        if (version) {
          this.UpdateDataVersionNumber({ "version": version });
        }
        this.UpdatePrescriptionWarningSeverity(this.Prescription, () => {
          this.subject.refreshTemplate.next();
          cb();
        });
      }
      else {
        cb();
        this.subject.closeWarnings.next();
        if (this.IsDataVersionStaleError(data)) {
          this.subject.ShowRefreshPageMessage.next(data);
        }
      }
    });
    this.subject.refreshTemplate.next();

  }


  distinct(value, index, self) {
    return self.indexOf(value) === index;
  }

  MedicationHasFlag(flag, m?: Product) {
    return (flag == "clinicaltrial" && m.detail.clinicalTrialMedication && +m.detail.clinicalTrialMedication == 1)
      || (flag == "controlled" && m.detail.isCustomControlledDrug)
      || (flag == "blacktriangle" && (m.detail.emaAdditionalMonitoring == "1" || m.detail.blackTriangle && +m.detail.blackTriangle == 1))
      || (flag == "critical" && m.detail.criticalDrug && +m.detail.criticalDrug == 1)
      || (flag == "expensive" && m.detail.expensiveMedication && +m.detail.expensiveMedication == 1)
      || (flag == "highalert" && m.detail.highAlertMedication && +m.detail.highAlertMedication == 1)
      || (flag == "nonformulary" && m.detail.rnohFormularyStatuscd == "002")
      || (flag == "unlicenced" && m.detail.unlicensedMedicationCd && +m.detail.unlicensedMedicationCd == 1)
      || (flag == "bloodproduct" && m.detail.isBloodProduct == true)
  }

  GetCurrentPosology(p: Prescription, pos_id: string = null) {
    if (pos_id) {
      return p.__posology.find(p => p.posology_id == pos_id);
    }
    else
      return p.__posology.find(p => p.iscurrent == true);
  }

  ComparePrescriptions(p: Prescription, p1: Prescription) {
    //compare interval
    if (this.GetCurrentPosology(p).frequency != this.GetCurrentPosology(p1).frequency) {
      return false;
    }
    if (this.GetCurrentPosology(p).frequencysize != this.GetCurrentPosology(p1).frequencysize) {
      return false;
    }

    if (this.GetCurrentPosology(p).dosetype != this.GetCurrentPosology(p1).dosetype) {
      return false;
    }
    if (this.GetCurrentPosology(p).__dose.length != this.GetCurrentPosology(p1).__dose.length) {
      return false
    }

    //compare dose
    for (var i = 0; i < this.GetCurrentPosology(p).__dose.length; i++) {
      const d = this.GetCurrentPosology(p).__dose[i];
      const d1 = this.GetCurrentPosology(p1).__dose[i];

      if (this.GetCurrentPosology(p).dosetype == DoseType.descriptive && d.descriptivedose != d1.descriptivedose) {
        return false;
      }
      else
        if (this.GetCurrentPosology(p).dosetype == DoseType.strength
          && (d.strengthneumerator != d1.strengthneumerator
            ||
            d.strengthdenominator != d1.strengthdenominator)) {
          return false;
        } else
          if (this.GetCurrentPosology(p).dosetype == DoseType.units &&
            (d.doseunit != d1.doseunit
              || d.dosesize != d1.dosesize)) {
            return false;
          }

    }

    //compare routes
    if (p.__routes.length != p1.__routes.length) {
      return false
    }
    else {
      //compare primary routes
      const rp = p.__routes.find(r => r.isdefault);
      const rp1 = p1.__routes.find(r => r.isdefault);

      if (rp && rp1 && rp.routecode != rp1.routecode) {
        return false;
      }
      else if ((rp && !rp1) || (rp1 && !rp)) {
        return false;
      }

      //compare discretionary
      var diff = p.__routes.find(r => p1.__routes.filter(r1 => r1.routecode == r.routecode).length == 0);
      if (diff)
        return false;
    }

    //prn
    if (this.GetCurrentPosology(p).prn != this.GetCurrentPosology(p1).prn)
      return false;

    //do
    if (this.GetCurrentPosology(p).doctorsorder != this.GetCurrentPosology(p1).doctorsorder)
      return false;

    //chosendays
    if (this.GetCurrentPosology(p).daysofweek != this.GetCurrentPosology(p1).daysofweek)
      return false;

    //everyndays
    if (this.GetCurrentPosology(p).dosingdaysfrequency != this.GetCurrentPosology(p1).dosingdaysfrequency)
      return false;
    //everyndays
    if (this.GetCurrentPosology(p).dosingdaysfrequencysize != this.GetCurrentPosology(p1).dosingdaysfrequencysize)
      return false;

    //comments
    if ((p.comments ?? "").toLowerCase().trim() != (p1.comments ?? "").toLowerCase().trim())
      return false;

    if (p.indication != p1.indication || p.otherindications != p1.otherindications) {
      return false
    }

    // //additional conditions
    // if (p.prescriptionadditionalconditions_id != p1.prescriptionadditionalconditions_id)
    //   return false;


    return true;

  }

  setIdealBodyWeight() {
    if (!isNaN(this.refHeightValue) && +this.refHeightValue > 0 && +this.refHeightValue >= 152 && +this.personAgeToday >= 18) {
      if (this.gender == "M") {
        this.idealWeightValue = 50 + (0.9 * (+this.refHeightValue - 152));
      }
      else {
        this.idealWeightValue = 45.5 + (0.9 * (+this.refHeightValue - 152));
      }
    }
    else {
      this.idealWeightValue = -1;
    }
  }

  UpdateDataVersionNumber(saveResponse: any) {
    if (saveResponse.hasOwnProperty('version')) {
      this.dataversion = saveResponse["version"];
    }
  }

  IsDataVersionStaleError(error): boolean {
    if (error.error) {
      if (error.error.includes("oldversion") ||
        error.error.includes("noversion") ||
        error.error.includes("cannotinitdataversion") ||
        error.error.includes("otherongoingsequence") ||
        error.error.includes("invalidsequenceoperation") ||
        error.error.includes("sequenceexpired") ||
        error.error.includes("otherprocesswriting")) {
        return true;
      }
      else
        return false;
    }
    else
      return false
  }
  GroupingBasics(val) {
    let dcgroup;
    let isIvFluid = false;
    if (val.__drugcodes) {
      const customrows = val.__drugcodes.filter(x => x.additionalCodeSystem.toLowerCase() == "custom");
      const ivfluids = customrows.filter(x => x.additionalCode.toUpperCase() == "BASIC_FLUID");
      if (ivfluids.length > 0)
        isIvFluid = true;
      else
        isIvFluid = false;
    }
    if (val.__posology.find(x => x.iscurrent == true).frequency == "stat") {
      dcgroup = {
        group: "Stat",
        prescriptionid: val.prescription_id
      };
      return dcgroup;
    } else {
      let codematteched = false;
      let Presindecation = JSON.parse(val.indication)
      let drug_bnf = "";
      if (val.__drugcodes) {
        const bnfrow = val.__drugcodes.filter(x => x.additionalCodeSystem == "BNF");
        if (bnfrow.length > 0)
          drug_bnf = bnfrow[0].additionalCode;
      }
      drug_bnf.padEnd(10, "0");
      for (let group of this.DCGroups) {
        let isbnfmatch = false
        for (let arrcode of group.MatchConditions.ClassificationCodes) {
          let bnf = (arrcode.Code ?? "").replace(/\./g, "");
          if (bnf == drug_bnf.substring(0, bnf.length)) {
            isbnfmatch = true;
          }
        }

        let isindecationmatch = false;
        for (let arrindecation of group.MatchConditions.Indications) {
          if (Presindecation) {
            if (arrindecation.Code == Presindecation.code || arrindecation.Indication == Presindecation?.indication) {
              isindecationmatch = true
            }
          }
        }
        let Indications = group.MatchConditions.Indications;
        if (group.MatchType == "AND") {

          if (isindecationmatch && isbnfmatch) {
            if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) { // checking is allready add this pres 47  4.0.1.0
              dcgroup = {
                group: group.GroupName,
                prescriptionid: val.prescription_id
              };
              return dcgroup;
            }
          }
        } else {
          if (isindecationmatch || isbnfmatch) {
            if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) { // checking is allready add this pres
              dcgroup = {
                group: group.GroupName,
                prescriptionid: val.prescription_id
              };
              return dcgroup
            }
          }
        }
      }
      if (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'ci' || (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'rate' && val.__posology.find(x => x.iscurrent == true).frequency == "variable")) {
        if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) { // checking is allready add this pres
          dcgroup = {
            group: "Variable/Continuous infusion",
            prescriptionid: val.prescription_id
          };
          return dcgroup;
        }
      } else if (val.__posology.find(x => x.iscurrent == true).prn == true) {
        if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) { // checking is allready add this pres
          dcgroup = {
            group: "PRN",
            prescriptionid: val.prescription_id
          };
          return dcgroup;
        }
      }
      else if (isIvFluid) {
        if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) {// checking is allready add this pres
          this.dcgroupadded.push({ group: "IV Fluid", prescriptionid: val.prescription_id })
        }
      }
      else {
        if (!this.dcgroupadded.find(x => x.prescriptionid == val.prescription_id)) { // checking is allready add this pres
          dcgroup = {
            group: "Regular drugs",
            prescriptionid: val.prescription_id
          };
          return dcgroup;
        }
      }
    }
    return dcgroup;
  }
}




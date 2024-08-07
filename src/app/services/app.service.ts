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
import { Injectable } from '@angular/core';
import { Encounter } from '../models/encounter.model';
import jwt_decode from 'jwt-decode';
import { Prescription, Posology, Dose, DoseEvents, Medication, Medicationadministration, Medicationcodes, Medicationingredients, Medicationroutes, MetaPrescriptionstatus, MetaPrescriptionduration, DrugChart, MetaPrescriptionadditionalcondition, Prescriptionroutes, InfusionEvents, PrescriptionSource, Oxygendevices, MetaReviewstatus, SupplyRequest, Prescriptionreminders, Prescriptionreviewstatus, MetaPrescriptioncontext, Orderset, PrescriptionEvent, PrescriptionMedicaitonSupply, AdministerMedication, PersonAwayPeriod, NursingInstruction, NursingInstructions, Remindersack } from "src/app/models/EPMA"
import { action } from '../models/filter.model';
import { Observation, Observationscaletype, PersonObservationScale } from '../models/observations.model';
import * as moment from 'moment';
import { Indication, PRNMaxDose } from '../components/prescribing-form/formhelper';
import { DaysOfWeek, DoseForm, DoseType, InfusionType, PrescriptionContext, PrescriptionStatus, RefWeightType } from './enum';
import { PatientInfo, WarningContext, WarningContexts, WarningService } from '../models/WarningServiceModal';
import { Allergyintolerance } from '../models/allergy.model';
import { SubjectsService } from './subjects.service';
import { Product } from '../models/productdetail';
import { ComplianceAid } from '../models/EPMA';
import { v4 as uuid } from 'uuid';


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
          &&
          p.__completed != true
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
  public currentBasket: Array<Prescription> = [];
  public Prescriptionreminders: Array<Prescriptionreminders>;
  public PrescriptionBag: any;
  public Prescriptionreviewstatus: Array<Prescriptionreviewstatus>;
  public FilteredPrescription: Array<Prescription>;
  public TherapyPrescription: Array<Prescription>;
  //public Posology: Array<Posology>;
  //public Dose: Array<Dose>;
  public remindersack: Array<Remindersack>;
  public events: any = [];
  public CurrentReminderevents: any = [];
  public AllReminderevents: any = [];
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
  public stackButtons: any = [];
  public arrPrescriptionCurrentFlowRate: any = [];
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
  public PersonAwayPeriod: Array<PersonAwayPeriod> = [];
  public MetaComplianceAid: Array<ComplianceAid>;
  public outPatientPrescriptionSelected: any;
  public PatientDrugHistory: Array<PrescriptionMedicaitonSupply> = [];
  public NursingInstructions: Array<NursingInstructions>;
  public Choosenfilterdate: any;
  public currentTerminusModle = "";
  public outpatientPrescribingMode: boolean = false;
  public isOP = false;
  public chartScrolled = false;
  public disabledatechange = true;
  reset(): void {
    this.disabledatechange = true;
    this.chartScrolled = false;
    this.stackButtons = [];
    this.arrPrescriptionCurrentFlowRate = [];
    this.PersonAwayPeriod = [];
    this.currentBasket = [];
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
    this.outPatientPrescriptionSelected = null;
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
    this.MetaComplianceAid = [];
    this.PatientDrugHistory = [];
    this.NursingInstructions = [];
    this.currentTerminusModle = "";
    this.outpatientPrescribingMode = false;
    this.isOP = false;
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
      let minposologystartdateexisting = moment.min([].concat(...this.GetCurrentPrescriptionsForWarnings(ws.context).map(p => p.__posology)).map(pos => moment((<Posology>pos).prescriptionstartdate)));

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

  RefreshPageWithStaleError(error) {
    let refreshed = false;
    if (error.error) {
      if (error.error.includes("serverversion:")) {
        let splitmsg = error.error.split("serverversion:");
        if (Array.isArray(splitmsg) && splitmsg.length == 2) {
          let serverversion = splitmsg[1];
          if (serverversion) {
            let versionobject = JSON.parse(serverversion);
            let serverversion_userid = versionobject.createdby;
            refreshed = true;

            this.subject.ShowRefreshPageMessage.next(serverversion_userid);
          }
        }
      }
    }
    if (!refreshed) {
      this.subject.ShowRefreshPageMessage.next();
    }
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

      if (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'ci' || val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'pca' || (val.__posology.find(x => x.iscurrent == true).infusiontypeid == 'rate' && val.__posology.find(x => x.iscurrent == true).frequency == "variable")) {
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

  GetPRNMaxDoseDisplayString(prnmaxdose: string) {
    const prnMaxDoseObj = <PRNMaxDose>JSON.parse(prnmaxdose)
    if (prnMaxDoseObj) {
      if (prnMaxDoseObj.type == DoseType.units) {
        return prnMaxDoseObj.maxdenominator + " " + prnMaxDoseObj.d_units;
      }
      else if (prnMaxDoseObj.type == "numeratoronlystrength" || prnMaxDoseObj.type == DoseType.strength) {
        return prnMaxDoseObj.maxnumerator + " " + prnMaxDoseObj.n_units + "/" + prnMaxDoseObj.maxdenominator + " " + prnMaxDoseObj.d_units;
      }
      else if (prnMaxDoseObj.type == "na") {
        return prnMaxDoseObj.maxtimes + " doses";
      }
    }
  }
  public GetMostFrequentElementInArray(arr) {
    let compare = "";
    let mostFreq = "";

    arr.reduce((acc, val) => {
      if (val in acc) {               // if key already exists
        acc[val]++;                // then increment it by 1
      } else {
        acc[val] = 1;      // or else create a key with value 1
      }
      if (acc[val] > compare) {   // if value of that key is greater
        // than the compare value.
        compare = acc[val];    // than make it a new compare value.
        mostFreq = val;        // also make that key most frequent.
      }
      return acc;
    }, {})
    this.logToConsole("Most Frequent Item is:" + mostFreq);
    return mostFreq;
  }

  HideWarning(context) {
    if (document.getElementById(context + "_ToggleShowLowPriorityWarnings").innerText == 'Hide all warnings') {
      document.getElementById(context + "_ToggleShowLowPriorityWarnings").click()
    }
  }

  UpdatePrescriptionCompletedStatus(p: Prescription) {
    p.__completed = false;
    const currentposology = this.GetCurrentPosology(p);
    if (currentposology.prescriptionenddate) {
      let lastdosedate;
      let tempdose = [];
      let logical_ID;
      let iteration = 0;
      Object.assign(tempdose, currentposology.__dose);
      tempdose.sort((a, b) => new Date(b.dosestartdatetime).getTime() - new Date(a.dosestartdatetime).getTime());
      let enddate = moment(currentposology.prescriptionenddate);
      let cd_startdtm = moment(currentposology.prescriptionstartdate).clone().set("minute", 0).set("hour", 0).set("seconds", 0);
      let cd_enddtm = enddate.clone().set("minute", 0).set("hour", 0).set("seconds", 0);
      let chosendays_dose_dates = [];
      let days_of_week_selected = [];
      try {
        days_of_week_selected = JSON.parse(currentposology.daysofweek);
      }
      catch { }
      if (Array.isArray(days_of_week_selected) && days_of_week_selected.length != 0) {

        while (cd_startdtm.isSameOrBefore(cd_enddtm)) {
          if (days_of_week_selected.find(x => x.toLowerCase() == cd_enddtm.format('dddd').toLowerCase())) {
            chosendays_dose_dates.push(cd_enddtm.clone());
          }
          cd_enddtm.subtract(1, 'days');
        }
        chosendays_dose_dates.reverse(); //because we iterated last date first 
      }
      else if (currentposology.dosingdaysfrequencysize > 0) {
        while (cd_startdtm.isSameOrBefore(cd_enddtm)) {
          chosendays_dose_dates.push(cd_startdtm.clone());
          if (currentposology.dosingdaysfrequency == "days") {
            cd_startdtm.add(currentposology.dosingdaysfrequencysize, "days");
          }
          else if (currentposology.dosingdaysfrequency == "weeks") {
            cd_startdtm.add(currentposology.dosingdaysfrequencysize, "weeks");
          }
          else if (currentposology.dosingdaysfrequency == "months") {
            cd_startdtm.add(currentposology.dosingdaysfrequencysize, "months");
          }
        }
      }


      if (chosendays_dose_dates.length != 0)
      // chosen days has been selected in the prescription, last dose date might not be on the 
      // prescription end date use the last index of this prepared array as last date
      {
        const newenddate = chosendays_dose_dates[chosendays_dose_dates.length - 1];
        if (newenddate.format('LL') != enddate.format('LL')) {
          enddate.date(newenddate.date());
          enddate.month(newenddate.month());
          enddate.year(newenddate.year());

          //pick the last dose for the day 
          enddate.hour(moment(tempdose[0].dosestartdatetime).hour())
          enddate.minute(moment(tempdose[0].dosestartdatetime).minute())
        }

      }


      for (let startdate = moment(currentposology.prescriptionstartdate).clone().set("minute", 0).set("hour", 0).set("seconds", 0); enddate.isSameOrAfter(startdate); enddate.subtract(1, 'days')) {
        for (let i = 0; i < tempdose.length; i++) {
          let dose = tempdose[i];
          //to create logical id get last dose date and doseid
          //if start date is smaller than prescriptionenddate, last dose date = prescription end date 
          //if start date is bigger than prescriptionenddate, last dose date = start date of dose
          //logical id = lastdosedate plus doseid

          if (p.isinfusion && (p.infusiontype_id == InfusionType.ci || p.infusiontype_id == InfusionType.pca)) {
            if (dose.continuityid)
              logical_ID = "end_" + moment(dose.doseenddatatime).format('YYYYMMDDHHmm') + "_" + dose.continuityid.toString();
            else
              logical_ID = "end_" + moment(dose.doseenddatatime).format('YYYYMMDDHHmm') + "_" + dose.dose_id.toString();

            const endevent = this.InfusionEvents.find(x => x.logicalid == logical_ID);
            if (endevent) {
              p.__completed = true;
              p.__completedOn = moment(endevent.eventdatetime);
              return;
            }
            else {
              p.__completed = false;
              return;
            }
          }
          else
            if (p.isinfusion && currentposology.infusiontypeid == InfusionType.rate) {
              let lasteventstartdate = moment({
                year: moment(enddate).year(),
                month: moment(enddate).month(),
                day: moment(enddate).date(),
                hour: moment(dose.dosestartdatetime).hour(),
                minute: moment(dose.dosestartdatetime).minute()
              });
              if (lasteventstartdate.isAfter(enddate) && iteration == 0)
                continue;
              logical_ID = moment(lasteventstartdate).format('YYYYMMDDHHmm') + "_" + dose.dose_id.toString();

              //check if this event is cancelled
              let infusionevent = this.InfusionEvents.find(de => de.eventtype.toLowerCase() == "cancel" && de.logicalid.includes(logical_ID));
              if (!infusionevent) { //this is the last dose now get the stop event logical id
                lastdosedate = moment({
                  year: moment(enddate).year(),
                  month: moment(enddate).month(),
                  day: moment(enddate).date(),
                  hour: moment(dose.doseenddatatime).hour(),
                  minute: moment(dose.doseenddatatime).minute()
                });
                if (moment(dose.dosestartdatetime).format("YYYYMMDD") != moment(dose.doseenddatatime).format("YYYYMMDD")) // if end date is after start date. 
                  lastdosedate = moment({
                    year: moment(enddate).add(1, "day").year(),
                    month: moment(enddate).add(1, "day").month(),
                    day: moment(enddate).add(1, "day").date(),
                    hour: moment(dose.doseenddatatime).hour(),
                    minute: moment(dose.doseenddatatime).minute()
                  });

                logical_ID = "end_" + moment(lastdosedate).format('YYYYMMDDHHmm') + "_" + dose.dose_id.toString();

                const adminrecord = this.InfusionEvents.find(x => x.logicalid.includes(logical_ID));
                if (adminrecord) {
                  p.__completed = true;
                  p.__completedOn = moment(adminrecord.eventdatetime);
                }
                else {
                  p.__completed = false;
                }
                return;
              }
            }
            else {
              if (moment(dose.dosestartdatetime).isAfter(moment(currentposology.prescriptionenddate)))
                lastdosedate = dose.dosestartdatetime;
              else {
                lastdosedate = moment({
                  year: moment(enddate).year(),
                  month: moment(enddate).month(),
                  day: moment(enddate).date(),
                  hour: moment(dose.dosestartdatetime).hour(),
                  minute: moment(dose.dosestartdatetime).minute()
                });
                if (lastdosedate.isAfter(enddate) && iteration == 0)
                  continue;
              }
              logical_ID = moment(lastdosedate).format('YYYYMMDDHHmm') + "_" + dose.dose_id.toString();

              //check if this event is cancelled
              let doseevent = this.DoseEvents.find(de => de.eventtype.toLowerCase() == "cancel" && de.logicalid.includes(logical_ID));
              if (!doseevent) { //this is the last dose 
                const adminrecord = this.Medicationadministration.find(x => x.logicalid.includes(logical_ID));
                if (adminrecord) {
                  p.__completed = true;
                  p.__completedOn = moment(adminrecord.administrationstartime);
                }
                else {
                  p.__completed = false;
                }
                return;
              }
            }
        }
        iteration++;
      }
    }
    else {
      p.__completed = false;
      return;
    }
  }

  public GetDefaultSupplyRequestObject(prescription: Prescription, doseSize?: any, strengthneumerator?: any, strengthdenominator?: any) {
    let supplyRequest: SupplyRequest = new SupplyRequest();
    let primaryMed = prescription.__medications.find(m => m.isprimary == true);
    if (primaryMed && primaryMed.producttype.toLocaleLowerCase() != "custom") {
      let medicationCode = primaryMed.__codes.find(c => c.terminology == 'formulary').code;
      let isFormulary = !primaryMed.isformulary;
      prescription.__medications[0].producttype
      let requests = this.SupplyRequest.filter(s => s.prescription_id == prescription.prescription_id &&
        s.medication_id == medicationCode && (s.requeststatus == 'Incomplete' || s.requeststatus == 'Pending'));
      if (requests.length == 0) {
        supplyRequest.epma_supplyrequest_id = uuid();
        supplyRequest.requeststatus = 'Incomplete';
        supplyRequest.lastmodifiedby = '';
        supplyRequest.requestedon = this.getDateTimeinISOFormat(moment().toDate());;
        supplyRequest.requestedby = this.loggedInUserName;
      } else {
        supplyRequest.epma_supplyrequest_id = requests[0].epma_supplyrequest_id;
        supplyRequest.requeststatus = requests[0].requeststatus;
        supplyRequest.lastmodifiedby = this.loggedInUserName;
        supplyRequest.lastmodifiedon = this.getDateTimeinISOFormat(moment().toDate());;
        supplyRequest.requestedon = requests[0].requestedon;
        supplyRequest.requestedby = requests[0].requestedby;
      }

      supplyRequest.prescription_id = prescription.prescription_id;
      supplyRequest.medication_id = medicationCode;
      supplyRequest.personid = this.personId;
      supplyRequest.encounterid = this.encounter.encounter_id;

      supplyRequest.requestednoofdays = null;
      let currentposology = this.GetCurrentPosology(prescription);
      if (currentposology.dosetype == 'units') {
        supplyRequest.requestquantity = doseSize;
        supplyRequest.requestedquantityunits = currentposology.__dose[0].doseunit;
      } else if (currentposology.dosetype == 'strength') {
        supplyRequest.requestquantity = (strengthneumerator / strengthdenominator).toFixed(2);
        supplyRequest.requestedquantityunits = currentposology.__dose[0].strengthdenominatorunit;
      }
      supplyRequest.daterequired = null;
      supplyRequest.labelinstructiosrequired = false;
      supplyRequest.additionaldirections = '';
      supplyRequest.isformulary = !isFormulary;
      supplyRequest.ordermessage = '';
      return supplyRequest;
    }
    else
      return null;

  }

  static IsNullOrEmpty(o: string) {
    if (o === undefined || o == null)
      return true;
    else if (o.trim() === "")
      return true;

    return false;
  }


  GetAdministrationDoseType(medication: Product) {
    var m = medication;
    var doseFormType = m.detail.doseFormCd;
    var t = <any>{};
    if (m.formularyIngredients.length == 1 && (m.formularyIngredients[0].ingredientName ?? "").toLowerCase() == "oxygen" && (doseFormType == DoseForm.Continuous || doseFormType == DoseForm.NA)) {
      t.dose_type = DoseType.units;
      t.dose_units = "L/min";
    }
    else
      if (m.productType.toLowerCase() == "vtm") {

        var ing = m.formularyIngredients;
        if (ing.length > 0) {

          //new logic - create an arry to bind to a dropdownlist of dose units

          t.vtm_dose_units = [...new Set(ing.map(ig => ig.strengthValueNumeratorUnitDesc))]; //get distinct values using Set 

          t.vtm_dose_units.sort();
          let emptyneumerators = t.vtm_dose_units.filter(x => AppService.IsNullOrEmpty(x) == true);
          if (t.vtm_dose_units.length != 0 && emptyneumerators.length == 0) {
            t.dose_type = DoseType.units;
          }
          else // there is at least one ingredient with value for no strength neumerator  - use unit dose form units if available 
            if (!AppService.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //units available
            {
              t.dose_type = DoseType.units;
              t.vtm_dose_units = [];
              t.vtm_dose_units.push(m.detail.unitDoseFormUnitsDesc);
            }
            else
              t.dose_type = DoseType.descriptive;
        }
      }
      else
        if (doseFormType == DoseForm.NA) {
          t.dose_type = DoseType.descriptive;
        }
        else
          if (doseFormType == DoseForm.Continuous) {
            t.dose_type = DoseType.descriptive;
          }
          else
            if (doseFormType == DoseForm.Discrete) {
              //whenever there is strength denomninator unit - and there is one ingredient -  use dose/volume - if not  - use quantity/units
              var ingredients = m.formularyIngredients;
              if (ingredients && ingredients.length == 1) // one ingredient 
              {
                var strength_value_denominatorunits = ingredients[0].strengthValueDenominatorUnitDesc;
                var strength_value_neumeratorunits = ingredients[0].strengthValueNumeratorUnitDesc;

                var strength_value_denominator = ingredients[0].strengthValueDenominator;
                var strength_value_neumerator = ingredients[0].strengthValueNumerator;

                if (!AppService.IsNullOrEmpty(strength_value_denominatorunits) && strength_value_denominatorunits.toLowerCase() == "ml" && !this.IsBasicFluid(m) && !((m.detail.formDesc ?? "").toLowerCase().includes("oral solution")))//one ingredient and strength denominator units available
                {
                  t.dose_type = DoseType.strength;
                  t.dose_strength_neumerator_units = strength_value_neumeratorunits;
                  t.dose_strength_denominator_units = strength_value_denominatorunits;

                  t.dose_strength_neumerator = +strength_value_neumerator;
                  t.dose_strength_denominator = +strength_value_denominator;
                }
                else
                  if (!AppService.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //one ingredient and units available
                  {
                    t.dose_type = DoseType.units;
                    t.dose_units = m.detail.unitDoseFormUnitsDesc;
                  }
                  else  //discrete and one ingredient and strength and units not available
                    t.dose_type = DoseType.descriptive;
              }
              else // more than one ingredient
                if (!AppService.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //multiple ingredients and units available
                {
                  t.dose_type = DoseType.units;
                  t.dose_units = m.detail.unitDoseFormUnitsDesc;
                }
                else  //discrete and multiple ingredienst and strength and units not available
                  t.dose_type = DoseType.descriptive;
            }

    return t;
  }

  IsBasicFluid(medication) {
    return medication.formularyAdditionalCodes && (medication.formularyAdditionalCodes.filter(x => x.additionalCodeSystem == "Custom" && x.additionalCode == "BASIC_FLUID").length != 0);
  }

  JSONTryParse(jsonstring) {
    try {
      return JSON.parse(jsonstring);
    } catch (e) {
      return null;
    }
  }

  CalculatePrescribedConcentration(p: Prescription) {
    const primaryPosology = this.GetCurrentPosology(p);
    const vtmstyle = p.orderformtype == "vtmstyle";
    const dose_type = primaryPosology.dosetype;
    const primaryMed = p.__medications.find(x => x.isprimary == true);
    let productType = null;
    if (primaryMed)
      productType = primaryMed.producttype;
    let dose = 0;
    let units = "";
    let prescribedConcentration = "";
    const totalvolume = primaryPosology.totalinfusionvolume;
    let diluents = p.__medications.filter(x => x.isprimary != true);
    if (primaryPosology.__dose.length != 0) {
      if (vtmstyle && productType.toLowerCase() != 'vtm') {
        dose = +primaryPosology.__dose[0].dosesize; //+this.prescription.get('posology.strength.dose_size').value; 
        units = primaryPosology.__dose[0].doseunit; // this.formsettings.dose_units;
      }
      else if (dose_type == DoseType.units && +primaryPosology.__dose[0].dosestrength) {
        dose = +primaryPosology.__dose[0].dosestrength;  //+this.prescription.get("posology.strength.totalstrength").value;
        units = primaryPosology.__dose[0].dosestrengthunits; //this.formsettings.singleIngredientStrength;
      }
      else if (dose_type == DoseType.strength) {
        dose = +primaryPosology.__dose[0].strengthneumerator; //+this.prescription.get("posology.strength.dose_strength_neumerator").value;
        units = primaryPosology.__dose[0].strengthneumeratorunit; //this.formsettings.dose_strength_neumerator_units; 
      }
      let concentration = this.FixToDecimalPlaces(dose / totalvolume, 2);
      if (concentration == 0 || diluents.length != 0)
        concentration = this.FixToDecimalPlaces(dose / totalvolume, 7);
      prescribedConcentration = +dose > 0 && +totalvolume > 0 ?
        [concentration, " ", units, "/ml"].join("") : "";
    }
    return prescribedConcentration;
  }
  FixToDecimalPlaces(input: number, n: number = 2) {
    if (!isNaN(input)) {
      if (input % 1 != 0)
        return +(+input).toFixed(n).replace(/\.0+$/g, '');
      else
        return input;
    }
    else if (input.toString().indexOf('-') != -1) {
      let components = input.toString().split('-');
      let comp1 = components[0];
      let comp2 = components[1];
      if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
        comp1 = (+comp1).toFixed(n).replace(/\.0+$/g, '');
        comp2 = (+comp2).toFixed(n).replace(/\.0+$/g, '');
        return comp1 + "-" + comp2;
      }
      else {
        return input
      }
    }
    else
      return input;
  }

}




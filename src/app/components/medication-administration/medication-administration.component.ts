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
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { AdministerMedication, AdministerMedicationcodes, AdministerMedicationingredients, AdministrationWitness, FormularyDescendent, InfusionEvents, Medication, Medicationadministration, Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import { SearchPostData } from '../search-medication/search-medication.component';
import { PrescriptionMedicaitonSupply, SupplyRequest } from '../../models/EPMA';
import { action, filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { AdministrationStatus, AdministrationStatusReason, LevelOfSelfAdmin, DoseType, SupplyRequestStatus, RoleAction, Common, InfusionType } from 'src/app/services/enum';
import { DataRequest } from 'src/app/services/datarequest';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { PRNMaxDose } from '../prescribing-form/formhelper';
import { AudienceType, NotificationClientContext, publishSenderNotificationWithParams } from 'src/app/notification/lib/notification.observable.util';

@Component({
  selector: 'app-medication-administration',
  templateUrl: './medication-administration.component.html',
  styleUrls: ['./medication-administration.component.css']
})
export class MedicationAdministrationComponent implements OnInit, OnDestroy {

  @Output() hideAdministrationForm = new EventEmitter();
  @Input() prescription: Prescription;
  @Input() dose: any;
  @Input() editpopuptypetype: any;
  currentposology: Posology;
  administration: Medicationadministration = new Medicationadministration();
  medication: Medication = new Medication();
  infusionEvents: InfusionEvents = new InfusionEvents();
  subscriptions = new Subscription();
  minDate: Date;
  maxDate: Date;
  currDate: Date;
  doctorcomments: string;
  otherreason: string;
  validatiommessage: string = "";
  otherReasonMessage: string = "";
  startime: string = moment(new Date()).format('HH:mm');
  stardate: string = moment(new Date()).format('DD-MM-YYYY');
  dose_id: string;
  headerLabel: string = "Administration";
  showSpinner: boolean = false;
  showEndInfusion: boolean = false;
  otherAdministrationForm: boolean = false;
  showTitration: boolean = false;
  isOnlyShowChart: boolean = false;
  plannedDate: string;
  administeredDate: string;
  currentDose: any;
  results: any;
  searchCode: string;
  searchtype: string;
  productName: string;
  productType: string;
  isDropdownshow: boolean = false;
  isFormulary: boolean = false;
  isLoadingMedication: boolean = false;
  showloadingmessage = false;
  shownoresultsmessage = false;
  isInitializing: boolean = true;
  administermedication: AdministerMedication[] = [];
  existingadministermedication: AdministerMedication[] = [];
  administermultiplemedication: AdministerMedication[] = [];
  administermedication_id: string;
  previuosAdministeredQuantity: number = 0;
  medicationCode: string;
  expanded = [];
  warningMessage: string;
  isWitnessAuthenticate: boolean = false;
  username: string;
  password: string;
  authMessage: string = "";
  witnessBtnValue = "Witness authentication";
  witnessDisplayName = "";
  administrationWitness: AdministrationWitness;
  showSpinnerWitness: boolean = false;
  iswitnessRequired: boolean = false;
  expirydate: any;
  isAdministrationWarning: boolean = false;
  administrationWarning: any[];
  usedAdminisistraionHistory: any[] = [];
  isShowAdministrationHistory: boolean = false;
  isShowHistory = false;
  productList: AdministerMedication[] = [];
  administrationHistory: AdministrationHistory[]=[];
  @ViewChild('administrationform') private myScrollContainer: ElementRef;
  @ViewChild('confirmWardStockTemplate') private modalWardStock: ElementRef;
  @ViewChild('undoAdministrationTemplate') private undoAdministrationAlert: ElementRef;
  encounterId: string;
  public administrationStatus: typeof AdministrationStatus = AdministrationStatus;
  public administrationStatusReason: typeof AdministrationStatusReason = AdministrationStatusReason;
  public levelOfSelfAdmin: typeof LevelOfSelfAdmin = LevelOfSelfAdmin;
  confirmModalRef: BsModalRef;
  undoAdministrationRef: BsModalRef;
  componentModuleData: ComponentModuleData;
  hasAdministrationWarning = false;
  displayStyle = false;
  medIndexSelected: number = 0;
  undoConflictTime: any;
  correctionId: string;
  undoAdministrationdisplayStyle: boolean;
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, public dr: DataRequest, private modalService: BsModalService) {
    this.minDate = new Date();
    this.maxDate = new Date();
    this.currDate = new Date();
    this.administration.adminstrationstatus = AdministrationStatus.given;
    this.administration.adminstrationstatusreason = AdministrationStatusReason.Other;

  }

  ngOnInit(): void {
    if(this.editpopuptypetype == "OpAdministration")
    {
      this.encounterId = Common.op_encounter_placeholder;
    }
    else 
    {
      this.encounterId = this.appService.encounter.encounter_id;
    }
    if(this.editpopuptypetype != "Undo Administration") {
        this.dr.RefreshIfDataVersionChanged(() => { });
    }
    this.currentposology = this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id);
    this.searchCode = this.prescription.__medications[0].__codes[0].code;
    this.productType = this.prescription.__medications[0].producttype;
    this.isInitializing = true;
    this.administermedication = [];
    this.correctionId = uuid();

    this.warningMessage = "";
    this.currentDose = Object.assign({}, this.dose);
    this.medication = Object.assign({}, this.prescription.__medications.find(e => e.isprimary == true));
    this.medicationCode = this.medication.__codes.find(x => x.terminology == "formulary").code;
    let doConfirmComment = this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid).find(e => e.logicalid === this.currentDose.dose_id && e.eventtype == "Comment");
    if (doConfirmComment) {
      this.doctorcomments = doConfirmComment.comments;

    }
    if (this.editpopuptypetype == "Titrate") {
      this.showTitration = true;
      this.isOnlyShowChart = false;
      this.subjects.titrationChart.next({ prescription: this.prescription, isOnlyShowChart: false, dose: this.dose, componenttype: "" });
      this.subscriptions.add(this.subjects.closeAppComponentPopover.subscribe(() => {
        this.hideAdministrationForm.emit(false);
      }));
      return;
    }
    if (this.editpopuptypetype == "Administration" || this.editpopuptypetype == "OpAdministration") {
      this.administration.medicationadministration_id = uuid();
      this.administration.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.previuosAdministeredQuantity = 0;
      this.searchProducts(false, false);
      this.productName = this.medication.name;
      if (this.currentDose.dose_id.includes("end")) {
        this.showEndInfusion = true;
        this.subjects.endInfusion.next({ prescription: this.prescription, dose: this.dose, administration: this.administration });
        this.subscriptions.add(this.subjects.closeAppComponentPopover.subscribe(() => {
          this.hideAdministrationForm.emit(false);
        }));
        return;
      } else {

        this.administration.planneddatetime = moment(new Date(this.currentDose.eventStart)).format('YYYY-MM-DD HH:mm');
        this.plannedDate = moment(new Date(this.currentDose.eventStart)).format('DD-MMM-YYYY HH:mm');
        if (this.currentDose.prn) {
          this.headerLabel = "Record PRN administration"
          this.dose_id = this.currentDose.dose_id;
          this.setMaxDoseWarning();
        } else {
          if (this.currentDose.isinfusion) {
            this.dose_id = this.currentDose.dose_id.split('_')[2];
          } else {
            this.dose_id = this.currentDose.dose_id.split('_')[1];
          }
        }
        this.administration.logicalid = this.currentDose.dose_id;
        this.administration.dose_id = this.dose_id;
        this.administration.prescription_id = this.prescription.prescription_id;
        this.administration.prescriptionroutesid = this.prescription.__routes.find(e => e.isdefault).prescriptionroutes_id;
        this.administration.routename = this.prescription.__routes.find(e => e.isdefault).route;
        this.administration.posology_id = this.currentposology.posology_id;
        this.administration.person_id = this.appService.personId;
        this.administration.encounter_id = this.encounterId;
        this.administration.medication_id = this.medication.medication_id;
        this.administration.requestresupply = false;
        this.administration.administrationstartime = moment(new Date()).format('YYYY-MM-DD HH:mm');

        this.setDose(this.dose_id);
        this.setAdministrationDateValidation(this.currentDose.dose_id);
        this.SetNursingInstruction();
      }
    
    } else {
      this.searchProducts(false, true);
    }
    let administrationRecord = this.appService.Medicationadministration.find(e => e.logicalid == this.currentDose.dose_id);
    if (administrationRecord) {
      this.administration = Object.assign({}, administrationRecord);
    }
    let infusionEventRecord = this.appService.InfusionEvents.find(e => e.logicalid == this.currentDose.dose_id);
    if (infusionEventRecord) {
      this.infusionEvents = Object.assign({}, infusionEventRecord);
    }


    // View Administration
    if (this.editpopuptypetype == "View Administration" || this.editpopuptypetype == "View History") {
      this.isShowAdministrationHistory = false;
      this.productName = this.medication.name;
      if (this.currentDose.isinfusion) {
        this.dose_id = this.currentDose.dose_id.split('_')[2];
      }
      this.LoadHistory();

      if (this.currentDose.dose_id.includes("addadjust")) {
        this.administeredDate = moment(this.administration.administrationstartime).format("DD-MM-YYYY HH:mm");

      } else if (this.currentDose.dose_id.includes("bolus")) {
        this.administeredDate = moment(this.administration.administrationstartime).format("DD-MM-YYYY HH:mm");

      } else if (this.currentDose.dose_id.includes("changeinfusionset") || this.currentDose.dose_id.includes("changeinfusionkit")) {
        this.administeredDate = moment(this.infusionEvents.eventdatetime).format("DD-MM-YYYY HH:mm");

      } else if (this.currentDose.dose_id.includes("pause")) {
        this.administeredDate = moment(this.infusionEvents.eventdatetime).format("DD-MM-YYYY HH:mm");

      } else if (this.currentDose.dose_id.includes("restart")) {
        this.administeredDate = moment(this.administration.administrationstartime).format("DD-MM-YYYY HH:mm");

      } else if (this.currentDose.dose_id.includes("end")) {
        this.plannedDate = moment(this.infusionEvents.planneddatetime).format("DD-MM-YYYY HH:mm");
        this.administeredDate = moment(this.infusionEvents.eventdatetime).format("DD-MM-YYYY HH:mm");
        this.administration.comments = this.infusionEvents.comments;

      } else {
        this.plannedDate = moment(this.administration.planneddatetime).format("DD-MM-YYYY HH:mm");
        this.administeredDate = moment(this.administration.administrationstartime).format("DD-MM-YYYY HH:mm");

        let witness = this.appService.administrationWitness.find(x => x.medicationadministration_id == this.administration.medicationadministration_id);
        if (witness) {
          this.administrationWitness = new AdministrationWitness();
          this.administrationWitness = witness;
          this.witnessDisplayName = this.administrationWitness.displayname;
        }
      }
    }
    /// Edit administration
    if (this.editpopuptypetype == "Edit Administration") {
      if (this.currentDose.dose_id.includes("addadjust")) {
        this.subjects.adjustInfusion.next({ prescription: this.prescription, infusionEvents: this.infusionEvents, administration: this.administration });
        this.hideAdministrationForm.emit(false);

      } else if (this.currentDose.dose_id.includes("bolus")) {
        this.subjects.addBolus.next({ prescription: this.prescription, infusionEvents: this.infusionEvents, administration: this.administration });
        this.hideAdministrationForm.emit(false);

      } else if (this.currentDose.dose_id.includes("changeinfusionset") || this.currentDose.dose_id.includes("changeinfusionkit")) {
        this.subjects.changeInfusion.next({ prescription: this.prescription, infusionEvents: this.infusionEvents });
        this.hideAdministrationForm.emit(false);

      } else if (this.currentDose.dose_id.includes("pause")) {
        this.subjects.pauseInfusion.next({ prescription: this.prescription, infusionEvents: this.infusionEvents });
        this.hideAdministrationForm.emit(false);

      } else if (this.currentDose.dose_id.includes("restart")) {
        this.subjects.restartInfusion.next({ prescription: this.prescription, infusionEvents: this.infusionEvents, administration: this.administration });
        this.hideAdministrationForm.emit(false);

      } else if (this.currentDose.dose_id.includes("end")) {
        this.subjects.endInfusion.next({ prescription: this.prescription, dose: this.dose, administration: this.administration });
        this.subscriptions.add(this.subjects.closeAppComponentPopover.subscribe(() => {
          this.hideAdministrationForm.emit(false);
        }));
        return;
      } else {
        /// check if it is old administration
        let administrationRecord = this.appService.Medicationadministration.find(e => e.logicalid == this.currentDose.dose_id);
        if (administrationRecord) {
          // populate administration data from administration entity
          this.administration = Object.assign({}, administrationRecord);
          this.previuosAdministeredQuantity = 0;
          if (administrationRecord.administreddosesize) {
            this.previuosAdministeredQuantity = +administrationRecord.administreddosesize;
          }
          if (administrationRecord.administeredstrengthdenominator) {
            this.previuosAdministeredQuantity = administrationRecord.administeredstrengthdenominator;
          }
          this.stardate = moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
          this.startime = moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm").format("HH:mm");
          if (this.administration.expirydate) {
            this.expirydate = moment(this.administration.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
          }
          this.otherreason = this.administration.adminstrationstatusreasontext;
          this.plannedDate = moment(new Date(this.administration.planneddatetime)).format('DD-MMM-YYYY HH:mm');
          this.setProduct(this.administration.medicationadministration_id);

          if (this.currentDose.prn) {
            this.headerLabel = "Record PRN administration"
            this.dose_id = this.currentDose.dose_id;
            this.setMaxDoseWarning();
          } else {
            if (this.currentDose.isinfusion) {
              this.dose_id = this.currentDose.dose_id.split('_')[2];
            } else {
              this.dose_id = this.currentDose.dose_id.split('_')[1];
            }
          }

          this.setAdministrationDateValidation(this.currentDose.dose_id);
          this.SetNursingInstruction();
          // set witness authnication 
          let witness = this.appService.administrationWitness.find(x => x.medicationadministration_id == this.administration.medicationadministration_id);
          if (witness) {
            this.administrationWitness = new AdministrationWitness();
            this.administrationWitness = witness;
            this.witnessDisplayName = this.administrationWitness.displayname;
            this.administrationWitness.correlationid = this.correctionId;
            this.witnessBtnValue = "Change";
          }
        }
      }
    }

    // Undo administration
    if (this.editpopuptypetype == "Undo Administration") {
      this.undoAdministrationdisplayStyle = true;     
    }
    this.GetWarningStatus();

  }
  setMaxDoseWarning() {
    let warnings = [];
    if (this.stardate && this.startime && this.currentposology.prnmaxdose) {
      let currentadministrationtime = moment(moment(this.stardate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime)
      let totalAministredDoses = this.appService.Medicationadministration.filter(x => x.prescription_id == this.currentposology.prescription_id &&
        x.medicationadministration_id != this.administration.medicationadministration_id && !x.isenterinerror && moment(x.administrationstartime) >= currentadministrationtime.clone().subtract(24, "hours"));
      let totalAministred = 0;
      const prnMaxDoseObj = <PRNMaxDose>JSON.parse(this.currentposology.prnmaxdose)
      if (this.currentposology.dosetype == DoseType.units && +prnMaxDoseObj.maxdenominator > 0) {
        totalAministred = totalAministredDoses.reduce((prev, cur) => prev + parseFloat(cur.administreddosesize), 0);
        if (totalAministred == +prnMaxDoseObj.maxdenominator) {
          warnings.push("Maximum dose of");
          if (prnMaxDoseObj.type == "numeratoronlystrength" && +prnMaxDoseObj.maxnumerator > 0) {
            warnings.push(+prnMaxDoseObj.maxnumerator);
            warnings.push(prnMaxDoseObj.n_units);
            warnings.push("/");
          }
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours has been administered already.");
        } else if (totalAministred > +prnMaxDoseObj.maxdenominator) {
          warnings.push("Maximum dose of");
          if (prnMaxDoseObj.type == "numeratoronlystrength" && +prnMaxDoseObj.maxnumerator > 0) {
            warnings.push(+prnMaxDoseObj.maxnumerator);
            warnings.push(prnMaxDoseObj.n_units);
            warnings.push("/");
          }
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours has already been exceeded.");
        }
        else if ((totalAministred + (+this.administration.administreddosesize)) > +prnMaxDoseObj.maxdenominator) {
          warnings.push("Maximum dose of");
          if (prnMaxDoseObj.type == "numeratoronlystrength" && +prnMaxDoseObj.maxnumerator > 0) {
            warnings.push(+prnMaxDoseObj.maxnumerator);
            warnings.push(prnMaxDoseObj.n_units);
            warnings.push("/");
          }
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours will be exceeded with this administration");
        }
      }
      if (this.currentposology.dosetype == DoseType.strength) {
        totalAministred = totalAministredDoses.reduce((prev, cur) => prev + cur.administeredstrengthdenominator, 0);
        if (totalAministred == +prnMaxDoseObj.maxdenominator) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxnumerator);
          warnings.push(prnMaxDoseObj.n_units);
          warnings.push("/");
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours has been administered already");
        } else if (totalAministred > +prnMaxDoseObj.maxdenominator) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxnumerator);
          warnings.push(prnMaxDoseObj.n_units);
          warnings.push("/");
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours has already been exceeded.");
        }
        else if ((totalAministred + (+this.administration.administeredstrengthdenominator)) > +prnMaxDoseObj.maxdenominator) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxnumerator);
          warnings.push(prnMaxDoseObj.n_units);
          warnings.push("/");
          warnings.push(+prnMaxDoseObj.maxdenominator);
          warnings.push(prnMaxDoseObj.d_units);
          warnings.push("in 24 hours will be exceeded with this administration.");
        }
      }
      else {
        totalAministred = totalAministredDoses.length;
        if (totalAministred == +prnMaxDoseObj.maxtimes) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxtimes);
          warnings.push("times in 24 hours has been administered already");
        } else if (totalAministred > +prnMaxDoseObj.maxtimes) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxtimes);
          warnings.push("times in 24 hours has already been exceeded.");
        }
        else if ((totalAministred + 1) > +prnMaxDoseObj.maxtimes) {
          warnings.push("The maximum dose of");
          warnings.push(+prnMaxDoseObj.maxtimes);
          warnings.push("times in 24 hours will be exceeded with this administration.");
        }
      }
    }
    if (warnings.length > 0) {
      this.warningMessage = warnings.join(" ");
    }
    else {
      this.warningMessage = "";
    }
  }
  SetNursingInstruction() {
    let nursingInstrruction= this.appService.NursingInstructions.find(x=>x.prescription_id==this.prescription.prescription_id);
    if(this.prescription.__nursinginstructions.length>0 || nursingInstrruction) {
      this.subjects.nursingInstruction.next( { "prescription_id" : this.prescription.prescription_id, "data": this.prescription.__nursinginstructions , "source" : "administration" } );
    }
  }
  saveAdministrationForm() {
    this.administration.administrationstartime = moment(this.stardate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.administrationValidation();
    if (this.validatiommessage != "" || this.otherReasonMessage != "") {
      this.scrollToElement();
      return;
    }
    this.administration.administrationstartime = this.appService.getDateTimeinISOFormat(moment(this.administration.administrationstartime, 'YYYY-MM-DD HH:mm').toDate());
    if (this.editpopuptypetype == "Edit Administration") {
      this.administration.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    }
    this.administration.isenterinerror =false;
    if (this.currentDose.prn) {
      this.administration.isadhoc =true;
      if (this.editpopuptypetype != "Edit Administration") {
        this.administration.logicalid = this.createLogicalId(this.administration.administrationstartime, this.dose_id);
      } else {
        this.administration.logicalid = this.dose_id;
      }
      this.administration.planneddatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.administrationstartime, 'YYYY-MM-DD HH:mm').toDate());
    } else {
      this.administration.planneddatetime = this.appService.getDateTimeinISOFormat(moment(this.administration.planneddatetime, 'YYYY-MM-DD HH:mm').toDate());
    }

    if (this.administration.adminstrationstatus != AdministrationStatus.selfadminister) {
      this.administration.levelofselfadmin = null;
    }

    if (this.administration.adminstrationstatus != AdministrationStatus.notgiven) {
      this.administration.adminstrationstatusreason = null;
    }

    this.administration.adminstrationstatusreasontext = "";
    if (this.administration.adminstrationstatus == AdministrationStatus.notgiven) {
      if (this.administration.adminstrationstatusreason == AdministrationStatusReason.Other) {
        this.administration.adminstrationstatusreasontext = this.otherreason;
      }
    }
    this.administration.posology_id = this.currentposology.posology_id;
    this.administration.administredby = this.appService.loggedInUserName;

    if (this.expirydate) {
      this.administration.expirydate = this.appService.getDateTimeinISOFormat(moment(this.expirydate, "DD-MM-YYYY").toDate());
    }
    if(this.administration.isdifferentproductadministered) {
      this.administration.administreddosesize =null;
      this.administration.administeredstrengthneumerator = null;
      this.administration.administeredstrengthdenominator = null;
      this.administration.expirydate = null;
      this.administration.batchnumber = null;
    }
    this.appService.logToConsole(this.administration);
    Object.keys(this.administration).map((e) => { if (e.startsWith("_")) delete this.administration[e]; });

    this.showSpinner = true;
    if (this.currentDose.isinfusion == true) {
      this.infusionEvents.dose_id = this.administration.dose_id;
      this.infusionEvents.eventdatetime = this.administration.administrationstartime;
      this.infusionEvents.planneddatetime = this.administration.planneddatetime;
      this.infusionEvents.logicalid = this.administration.logicalid;
      this.infusionEvents.posology_id = this.currentposology.posology_id;
      this.infusionEvents.comments = this.administration.comments;
      let isInfusionExist = this.appService.InfusionEvents.find(e => e.logicalid == this.currentDose.dose_id);
      if (isInfusionExist) {
        this.infusionEvents.infusionevents_id = isInfusionExist.infusionevents_id;
        this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      } else {
        this.infusionEvents.infusionevents_id = uuid();
        this.infusionEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      }
      if (this.administration.logicalid.includes("start")) {
        this.infusionEvents.eventtype = "administered";
      } else {
        this.infusionEvents.eventtype = "flowrate";
      }
      Object.keys(this.infusionEvents).map((e) => { if (e.startsWith("_")) delete this.infusionEvents[e]; });
    }

    // witness authnication
    if (this.administrationWitness && this.administrationWitness.displayname) {
      this.administrationWitness.medicationadministration_id = this.administration.medicationadministration_id;
      this.administrationWitness.logicalid = this.administration.logicalid;
      this.administrationWitness.dose_id = this.administration.dose_id;
    }

    // if (this.administermedication.length > 0) {
    //   supplyRequest.selectedproductcode = this.administermedication[0].__codes[0].code;
    //   supplyRequest.selectproductcodetype = this.administermedication[0].producttype;
    //   supplyRequest.selectedproductname = this.administermedication[0].name;
    // } else {
    //   supplyRequest.selectedproductcode = this.searchCode;
    //   supplyRequest.selectproductcodetype = this.productType;
    //   supplyRequest.selectedproductname = this.productName;
    // }

    let supplyRequest: SupplyRequest = new SupplyRequest();
    //Create Update Supply Request   
    this.dr.getSupplyRequest(() => {
      let requests = this.appService.SupplyRequest.filter(s => s.prescription_id == this.administration.prescription_id &&
        s.medication_id == this.medicationCode && (s.requeststatus == 'Incomplete' || s.requeststatus == 'Pending'));

      if (this.administration.requestresupply) {
        if (requests.length == 0) {
          supplyRequest.epma_supplyrequest_id = uuid();
          supplyRequest.requeststatus = 'Incomplete';
          supplyRequest.lastmodifiedby = '';
          supplyRequest.requestedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
          supplyRequest.requestedby = this.appService.loggedInUserName;
        } else {
          supplyRequest.epma_supplyrequest_id = requests[0].epma_supplyrequest_id;
          supplyRequest.requeststatus = requests[0].requeststatus;
          supplyRequest.lastmodifiedby = this.appService.loggedInUserName;
          supplyRequest.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
          supplyRequest.requestedon = requests[0].requestedon;
          supplyRequest.requestedby = requests[0].requestedby;
        }

        supplyRequest.prescription_id = this.administration.prescription_id;
        supplyRequest.medication_id = this.medicationCode;
        supplyRequest.personid = this.appService.personId;
        supplyRequest.encounterid = this.encounterId;

        if (this.administermedication.length > 0) {
          supplyRequest.selectedproductcode = this.administermedication[0].__codes[0].code;
          supplyRequest.selectproductcodetype = this.administermedication[0].producttype;
          supplyRequest.selectedproductname = this.administermedication[0].name;
        } else {
          supplyRequest.selectedproductcode = this.searchCode;
          supplyRequest.selectproductcodetype = this.productType;
          supplyRequest.selectedproductname = this.productName;
        }

        supplyRequest.requestednoofdays = 1;

        if (this.currentposology.dosetype == 'units') {
          supplyRequest.requestquantity = this.administration.administreddosesize;
          supplyRequest.requestedquantityunits = this.currentposology.__dose[0].doseunit;
        } else if (this.currentposology.dosetype == 'strength') {
          supplyRequest.requestquantity = (this.administration.administeredstrengthneumerator / this.administration.administeredstrengthdenominator).toFixed(2);
          supplyRequest.requestedquantityunits = this.currentposology.__dose[0].strengthdenominatorunit;
        }

        supplyRequest.daterequired = null;
        supplyRequest.labelinstructiosrequired = false;
        supplyRequest.additionaldirections = '';
        supplyRequest.isformulary = this.prescription.__medications[0].isformulary;
        supplyRequest.ordermessage = '';
      } else {
        supplyRequest = null;
      }
      if ((this.currentposology.infusiontypeid == "ci" || this.currentposology.infusiontypeid == InfusionType.pca || this.currentposology.infusiontypeid == "rate") && this.currentDose.dose_id.includes("start") ) {
        this.dr.UndoTransfer(this.currentDose, () => {
          this.dr.transferRateInfution(this.currentDose, moment(this.stardate, "DD-MM-YYYY").toDate(), this.startime, true, (message) => {
            if (message == "success") {
              this.saveByUpsertManager(supplyRequest);
            } else {
              this.validatiommessage = message;
              this.showSpinner = false;
            }
          });
        });
      }
      else {
        this.saveByUpsertManager(supplyRequest);
      }

      //Recalculate stock
      // this.subscriptions.add(
      //   this.apiRequest.postRequest(this.appService.baseURI +
      //     "GetListByPost?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply", this.createDrugRecordFilter(this.administration.prescription_id, this.medicationCode))
      //     .subscribe((response) => {
      //       let responseArray: PrescriptionMedicaitonSupply[] = response;
      //       let patientDrug = new PrescriptionMedicaitonSupply();

      //       if (responseArray.length > 0 && this.productType != 'VTM') {
      //         patientDrug = responseArray[0];
      //         if (this.administration.administreddosesize) {
      //           patientDrug.availablequantity = (patientDrug.availablequantity + this.previuosAdministeredQuantity) - (+this.administration.administreddosesize);
      //         }
      //         if (this.administration.administeredstrengthdenominator) {
      //           patientDrug.availablequantity = (patientDrug.availablequantity + this.previuosAdministeredQuantity) - (+this.administration.administeredstrengthdenominator);
      //         }
      //         patientDrug.updatesouce = 'Administration';
      //       } else {
      //         patientDrug = null;
      //       }
      //       this.saveByUpsertManager(patientDrug, supplyRequest);
      //     }
      //     )
      // )

    });



  }

  saveByUpsertManager(supplyRequest: SupplyRequest) {
    this.appService.logToConsole(this.infusionEvents);
    this.administration.correlationid = this.correctionId;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    if (supplyRequest) {
      upsertManager.addEntity('local', "epma_supplyrequest", supplyRequest);
    }
    if(this.administration.adminstrationstatus == "notgiven" && this.currentposology.infusiontypeid == "rate" && this.currentDose.dose_id.includes("start")){
   
     let execting= this.appService.InfusionEvents.find(e => e.logicalid.includes("end") && e.logicalid.includes(this.currentDose.dose_id.split("_")[2]));
     if(execting)
     upsertManager.addEntity('core', 'infusionevents', execting.infusionevents_id, "del");
    }
    if (this.administermedication.length > 0 || this.administermultiplemedication.length>0) {
      this.existingadministermedication.forEach(med => {
        upsertManager.addEntity('core', 'administermedication', med.administermedication_id, "del");
        upsertManager.addEntity('core', "administermedicationingredients", { "administermedicationid": med.administermedication_id }, "del");
        upsertManager.addEntity('core', 'administermedicationcodes', { "administermedicationid": med.administermedication_id }, "del");

      });
    }

    if (this.currentDose.isinfusion == true) {
      this.infusionEvents.correlationid = this.correctionId;
      upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(this.infusionEvents)));
    }
    Object.keys(this.administration).map((e) => {
      if (e.startsWith('checked')) delete this.administration[e];
  });
    upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.administration)));
    // add witness authentication
    if (this.administrationWitness && this.administrationWitness.displayname) {
      upsertManager.addEntity('local', 'epma_administrationwitness', JSON.parse(JSON.stringify(this.administrationWitness)));
    }
    if(this.administration.isdifferentproductadministered) {
      this.administermedication = this.administermultiplemedication;
    }
    this.administermedication.forEach(m => {
      m.medicationadministrationid = this.administration.medicationadministration_id;
      m.correlationid = this.correctionId;
      let administermed = Object.assign({}, m);
      Object.keys(administermed).map((e) => { if (e.startsWith("_")) delete administermed[e]; });
      if(administermed.expirydate) {
        administermed.expirydate = this.appService.getDateTimeinISOFormat(moment(administermed.expirydate, "DD-MM-YYYY").toDate());
      }
      upsertManager.addEntity('core', 'administermedication', JSON.parse(JSON.stringify(administermed)));
      m.__ingredients.forEach(mig => {
        mig.medicationadministrationid = this.administration.medicationadministration_id;
        mig.correlationid = this.correctionId;
        upsertManager.addEntity('core', 'administermedicationingredients', JSON.parse(JSON.stringify(mig)));
      });
      m.__codes.forEach(mcd => {
        mcd.medicationadministrationid = this.administration.medicationadministration_id;
        mcd.correlationid = this.correctionId;
        upsertManager.addEntity('core', 'administermedicationcodes', JSON.parse(JSON.stringify(mcd)));
      });
    });

    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();
      this.dr.getAdminstrations(() => {
        this.dr.getSupplyRequest(() => {
          this.dr.GetWitnesAuthentication(() => {
            this.showSpinner = false;
            this.hideAdministrationForm.emit(true);
            this.subjects.refreshTemplate.next(this.prescription.prescription_id);
          });

        });
      });

      this.publishNotificationForDoseAdministeredEvent();
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.hideAdministrationForm.emit(false);

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
  }

  publishNotificationForDoseAdministeredEvent(eventName?: string) {
    if (!this.appService.appConfig.AppSettings.can_send_notification) return;
    const { prescription_id, encounter_id } = this.prescription;
    let contextsForNotification: NotificationClientContext[] = [
      { name: 'dose_id', value: this.currentDose.dose_id },
      { name: 'prescription_id', value: prescription_id },
      { name: 'encounter_id', value: encounter_id }];

    let notifTypeName = eventName ?? 'MED_ADMINISTERED';
    publishSenderNotificationWithParams(notifTypeName, contextsForNotification, null, AudienceType.ALL_SESSIONS_EXCEPT_CURRENT_SESSION);
  }

  undoAdministration() {

    let deleteInfusionEvent: InfusionEvents;
    deleteInfusionEvent = this.appService.InfusionEvents.find(x => x.logicalid == this.currentDose.dose_id);
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager = this.updateLinkedInfusion(upsertManager, deleteInfusionEvent);
    if(this.administration.isadhoc) {
      upsertManager = this.setToUpdateAdHocAdministration(upsertManager);
    } else {
      upsertManager = this.setToDeleteAdministration(upsertManager);
    }
    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();
      if (this.currentDose.dose_id.includes("start") && this.currentposology.infusiontypeid != "bolus") {
        this.dr.UndoTransfer(this.currentDose, () => {
          this.dr.getAdminstrations(() => {
            this.showSpinner = false;
            this.hideAdministrationForm.emit(true);
            this.subjects.refreshTemplate.next(this.prescription.prescription_id);
          });
        });
      } else {
        this.dr.getAdminstrations(() => {
          this.showSpinner = false;
          this.hideAdministrationForm.emit(true);
          this.subjects.refreshTemplate.next(this.prescription.prescription_id);
        });
      }
      this.publishNotificationForDoseAdministeredEvent('MED_ADMINISTRATION_UNDONE');

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
  }
  DeleteDoseEventAdministration(upsertManager) {
   let doseEvents = {
      doseevents_id: uuid(),
      dose_id: this.dose.dose_id.split('_')[1],
      posology_id: this.dose.posology_id,
      startdatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
      eventtype: 'Undo',
      dosedatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
      comments: "",
      logicalid: this.dose.dose_id,
      iscancelled: false,
      correlationid: this.administration.correlationid, 
      createdon :this.appService.getDateTimeinISOFormat(moment().toDate()),
      modifiedon : this.appService.getDateTimeinISOFormat(moment().toDate()),
      createdby : this.appService.loggedInUserName,
      modifiedby : this.appService.loggedInUserName,
    };
    upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(doseEvents)));
  }
  DeleteInfusionEventAdministration(upsertManager) {
    let infusionEvents : InfusionEvents = new InfusionEvents();
    infusionEvents.infusionevents_id = uuid();
    infusionEvents.dose_id = this.administration.dose_id;
    infusionEvents.eventdatetime = this.administration.administrationstartime;
    infusionEvents.planneddatetime = this.administration.administrationstartime;
    infusionEvents.logicalid = this.administration.logicalid;
    infusionEvents.posology_id = this.currentposology.posology_id;
    infusionEvents.eventtype = "Undo";
    infusionEvents.comments = "";
    infusionEvents.correlationid = this.administration.correlationid;
    infusionEvents.administeredby = this.appService.loggedInUserName;
    infusionEvents.createdby = this.appService.loggedInUserName;
    infusionEvents.modifiedby = this.appService.loggedInUserName;
    infusionEvents.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    infusionEvents.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    upsertManager.addEntity('core', 'infusionevents', JSON.parse(JSON.stringify(infusionEvents)));
  }
  setToDeleteAdministration(upsertManager) {
    if (this.currentDose.dose_id.startsWith("start") && this.currentposology.infusiontypeid != "bolus") {
      if ((this.currentposology.infusiontypeid == 'ci' || this.currentposology.infusiontypeid == InfusionType.pca) || (this.currentposology.infusiontypeid == 'rate' && this.currentposology.frequency == 'variable')) {
        upsertManager.addEntity('core', "medicationadministration", { "prescription_id": this.prescription.prescription_id }, "del");
        upsertManager.addEntity('core', "infusionevents", { "posology_id": this.currentposology.posology_id }, "del");
        this.DeleteInfusionEventAdministration(upsertManager);
      } else if (this.currentposology.infusiontypeid == 'rate' && this.currentposology.frequency != 'variable') {
        /// find and delete rate and not variable
        let eventRecord = this.appService.events.sort((b, a) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == this.currentposology.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
        let startEvent = eventRecord.find(e => e.dose_id == this.currentDose.dose_id);
        let endEvent = eventRecord.slice().reverse().find(e => moment(e.eventStart).isAfter(startEvent.eventStart) && e.dose_id.includes("end"));
        let eventToDelete
        if(endEvent){
         eventToDelete = eventRecord.slice().filter(x => moment(x.eventStart).isSameOrAfter(startEvent.eventStart) && moment(x.eventStart).isSameOrBefore(endEvent.eventStart));
        }
        else{
          eventToDelete = eventRecord.slice().filter(x => moment(x.eventStart).isSameOrAfter(startEvent.eventStart));
        }
       
        eventToDelete.forEach(item => {
          let admin = this.appService.Medicationadministration.find(x => x.logicalid == item.dose_id);
          let infusion = this.appService.InfusionEvents.find(x => x.logicalid == item.dose_id);
          if (admin) {
            upsertManager.addEntity('core', "medicationadministration", admin.medicationadministration_id, "del");
            this.DeleteInfusionEventAdministration(upsertManager);
          }
          if (infusion)
            upsertManager.addEntity('core', "infusionevents", infusion.infusionevents_id, "del");
        });
      }
    } else {
      let deleteAdministration = this.appService.Medicationadministration.find(x => x.logicalid == this.currentDose.dose_id);
      let deleteInfusionEvent = this.appService.InfusionEvents.find(x => x.logicalid == this.currentDose.dose_id);
      if (deleteAdministration) {
        upsertManager.addEntity('core', "medicationadministration", deleteAdministration.medicationadministration_id, "del");
        if(this.prescription.isinfusion)
        {
          this.DeleteInfusionEventAdministration(upsertManager);
        }
        else 
        {
          this.DeleteDoseEventAdministration(upsertManager);
        }
      }
      if (deleteInfusionEvent)
        upsertManager.addEntity('core', 'infusionevents', deleteInfusionEvent.infusionevents_id, "del");
    }
    return upsertManager;
  }
  setToUpdateAdHocAdministration(upsertManager) {
    let updateAdministration = this.appService.Medicationadministration.find(x => x.logicalid == this.currentDose.dose_id);
    Object.keys(updateAdministration).map((e) => {
      if (e.startsWith('checked')) delete updateAdministration[e];
  });
      if (updateAdministration) {
        if(updateAdministration.isenterinerror==true) {
          updateAdministration.isenterinerror =false;
        } else {
          updateAdministration.isenterinerror =true;
        }
        upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(updateAdministration)));
      }         
    return upsertManager;
  }
  updateLinkedInfusion(upsertManager, deleteInfusionEvent) {
    if (deleteInfusionEvent) {
      var duration = moment.duration(moment(deleteInfusionEvent.planneddatetime).diff(moment(deleteInfusionEvent.eventdatetime)));
      var diffMinutes = duration.asMinutes();
      let linkedInfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == this.prescription.prescription_id);
      for (let infusion of linkedInfusion) {

        if (!this.appService.Medicationadministration.find(x => x.dose_id == this.appService.GetCurrentPosology(infusion).__dose.find(x => x.continuityid == null).dose_id)) {
          let startDose = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).find(x => x.prescription_id == infusion.prescription_id && x.continuityid == null);

          startDose.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(startDose.dosestartdatetime).add(diffMinutes, "minutes").toDate());
          if (startDose.doseenddatatime) {
            startDose.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(startDose.doseenddatatime).add(diffMinutes, "minutes").toDate());
          }

          let doseobject = Object.assign({}, startDose);

          Object.keys(doseobject).map((e) => { if (e.startsWith("_")) delete doseobject[e]; });
          upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobject)));

          let allDoses = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(x => x.prescription_id == infusion.prescription_id && x.continuityid == startDose.dose_id);
          for (let flowdoses of allDoses) {
            flowdoses.dosestartdatetime = this.appService.getDateTimeinISOFormat(moment(flowdoses.dosestartdatetime).add(diffMinutes, "minutes").toDate());
            if (flowdoses.doseenddatatime) {
              flowdoses.doseenddatatime = this.appService.getDateTimeinISOFormat(moment(flowdoses.doseenddatatime).add(diffMinutes, "minutes").toDate());
            }
            let doseobjectflow = Object.assign({}, flowdoses);
            Object.keys(doseobjectflow).map((e) => { if (e.startsWith("_")) delete doseobjectflow[e]; });
            upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(doseobjectflow)));
          }

        }
      }
    }
    return upsertManager;
  }
  openWitnessAuthnication() {
    this.authMessage = "";
    this.username = "";
    this.password = "";
    this.isWitnessAuthenticate = true;
    this.showSpinnerWitness = false;
  }
  closeWitnessAuthentication() {
    this.isWitnessAuthenticate = false;
  }
  GetWarningStatus() {
    this.appService.warningServiceIPContext.GetExistingWarnings(false, (data) => {
      let code = this.prescription.__medications.find(x => x.isprimary).__codes.find(x => x.terminology == "formulary").code;
      const hasWarning = data.filter(
        x => ((x.primaryprescriptionid == this.prescription.prescription_id
          || x.secondaryprescriptionid == this.prescription.prescription_id
          || x.primarymedicationcode == code
          || x.secondarymedicationcode == code) && x.severity == 4)
      )
      if (hasWarning.length > 0) {
        this.hasAdministrationWarning = true;
      }
    })
  }
  authenticateUser() {
    this.authMessage = "";
    if (!this.username) {
      this.authMessage = "Please enter username";
      return;
    }
    if (!this.password) {
      this.authMessage = "Please enter password";
      return;
    }
    this.showSpinnerWitness = true;
    this.subscriptions.add(this.apiRequest.getRequestWithoutAuth(this.appService.platfromServiceURI + "/Auth/AuthenticateUser?userName=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password))
      .subscribe((resp) => {
        let groups = this.appService.appConfig.AppSettings.GroupsAuthorisedToWitness;
        let isGroupFound = false;
        if (this.appService.appConfig && !this.appService.appConfig.AppSettings.enableRBAC) {
          isGroupFound = true;
        }
        else if (groups && resp) {
          groups.forEach(i => {
            if (resp.memberof && Array.isArray(resp.memberof) && resp.memberof.findIndex(element => element.includes('CN=' + i)) > -1) {
              isGroupFound = true;
            }
          });
        }
        this.appService.logToConsole(resp);

        if (resp && isGroupFound) {
          if (!this.administrationWitness) {
            this.administrationWitness = new AdministrationWitness();
            this.administrationWitness.epma_administrationwitness_id = uuid();
          }
          this.witnessDisplayName = resp.displayname;
          this.isWitnessAuthenticate = false;
          this.witnessBtnValue = "Change";
          this.administrationWitness.displayname = resp.displayname;
          this.administrationWitness.accountname = resp.accountname;
          this.administrationWitness.firstname = resp.firstname;
          this.administrationWitness.lastname = resp.lastname;
          this.administrationWitness.email = resp.email;
          this.administrationWitness.correlationid = this.correctionId;
          this.administrationWitness.administredby = this.appService.loggedInUserName;
          this.administrationWitness.witnessdatetime = this.appService.getDateTimeinISOFormat(moment().toDate());
          this.administrationWitness.person_id = this.appService.personId;
          this.administrationWitness.encounter_id = this.encounterId;
        } else {
          this.authMessage = "Unable to authenticate";
        }
        this.showSpinnerWitness = false;

      }, (error) => { console.log(error); this.authMessage = "There was a problem with authentication"; this.showSpinnerWitness = false; }));
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public AuthoriseWitnessAction(action: string, actions: action[]): boolean {
    if (this.appService.appConfig && this.appService.appConfig.AppSettings.enableRBAC)
      return actions.filter(x => x.actionname.toLowerCase().trim() == action.toLowerCase()).length > 0;
    else
      return true;
  }

  createRoleFilter(roles: any) {

    let condition = "";
    let pm = new filterParams();

    for (var i = 0; i < roles.length; i++) {
      condition += "or rolename = @rolename" + i + " ";
      pm.filterparams.push(new filterparam("rolename" + i, roles[i]));
    }
    condition = condition.replace(/^\or+|\or+$/g, '');
    let f = new filters();
    f.filters.push(new filter(condition));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }


  getRolesFromWitnessAuthResponse(response) {
    let groups = [];
    if (response && response.memberof && Array.isArray(response.memberof)) {
      response.memberof.forEach(g => {
        let i = g.split(",");
        if (i.length != 0) {
          let j = i[0].split("=")
          if (j.length == 2) {
            groups.push(j[1]);
          }
        }
      });
    }
    return groups;
  }
  adminStatus(status) {
    this.administration.adminstrationstatus = status;
    if (status == this.administrationStatus.notgiven) {
      this.administration.adminstrationstatusreason = AdministrationStatusReason.Other;
    }
    if (status == this.administrationStatus.selfadminister && !this.administration.levelofselfadmin) {
      this.administration.levelofselfadmin = this.levelOfSelfAdmin.notwitnessedbynurse;
    }
    this.validatiommessage = "";
    this.appService.logToConsole(status);
  }

  setAdministredRoute(route) {
    this.administration.prescriptionroutesid = route.prescriptionroutes_id;
    this.administration.routename = route.route;
  }

  setDose(dose_id: string) {
    let timelineDose;
    timelineDose = this.appService.DoseEvents.find(e => e.logicalid == this.currentDose.dose_id && e.eventtype == "titration");
    if (!timelineDose) {
      timelineDose = this.appService.DoseEvents.find(e => e.posology_id == this.currentposology.posology_id && e.grouptitration == true);
    }
    if (this.prescription.titration && timelineDose) {
      if (this.currentposology.dosetype == DoseType.units) {
        this.administration.planneddosesize = timelineDose.titrateddosesize;
        this.administration.planneddoseunit = timelineDose.titrateddoseunit;
        this.administration.administreddosesize = timelineDose.titrateddosesize;
        this.administration.administreddoseunit = timelineDose.titrateddoseunit;
      }
      if (this.currentposology.dosetype == DoseType.strength) {
        this.administration.plannedstrengthneumerator = timelineDose.titratedstrengthneumerator;
        this.administration.plannedstrengthneumeratorunits = timelineDose.titratedstrengthneumeratorunits;
        this.administration.plannedstrengthdenominator = timelineDose.titratedstrengthdenominator;
        this.administration.plannedstrengthdenominatorunits = timelineDose.titratedstrengthdenominatorunits;

        this.administration.administeredstrengthneumerator = timelineDose.titratedstrengthneumerator;
        this.administration.administeredstrengthneumeratorunits = timelineDose.titratedstrengthneumeratorunits;
        this.administration.administeredstrengthdenominator = timelineDose.titratedstrengthdenominator;
        this.administration.administeredstrengthdenominatorunits = timelineDose.titratedstrengthdenominatorunits;
      }
      if (this.currentposology.dosetype == DoseType.descriptive) {
        this.administration.administereddescriptivedose = timelineDose.titrateddescriptivedose;
      }
    } else {
      timelineDose = this.currentposology.__dose.find(d => d.dose_id === dose_id);
      if (this.currentposology.dosetype == DoseType.units) {
        this.administration.planneddosesize = timelineDose.dosesize;
        if (timelineDose.dosesizerangemax)
          this.administration.planneddosesizerangemax = timelineDose.dosesizerangemax;
        else
          this.administration.planneddosesizerangemax = "0";
        this.administration.planneddoseunit = timelineDose.doseunit;
        this.administration.administreddosesize = timelineDose.dosesize;
        this.administration.administreddoseunit = timelineDose.doseunit;
      }
      if (this.currentposology.dosetype == DoseType.strength) {
        this.administration.plannedstrengthneumerator = timelineDose.strengthneumerator;
        this.administration.plannedstrengthneumeratorunits = timelineDose.strengthneumeratorunit;
        this.administration.plannedstrengthdenominator = timelineDose.strengthdenominator;
        this.administration.plannedstrengthdenominatorunits = timelineDose.strengthdenominatorunit;

        this.administration.administeredstrengthneumerator = timelineDose.strengthneumerator;
        this.administration.administeredstrengthneumeratorunits = timelineDose.strengthneumeratorunit;
        this.administration.administeredstrengthdenominator = timelineDose.strengthdenominator;
        this.administration.administeredstrengthdenominatorunits = timelineDose.strengthdenominatorunit;
      }
      if (this.currentDose.isinfusion) {
        this.administration.plannedinfustionrate = timelineDose.infusionrate;
        this.administration.administredinfusionrate = timelineDose.infusionrate;
      }
      if (this.currentposology.dosetype == DoseType.descriptive) {
        this.administration.administereddescriptivedose = timelineDose.descriptivedose;
      }
    }



  }

  closePopup() {
    this.hideAdministrationForm.emit(false);
  }

  onTimeSelected(startime) {
    this.startime = startime;
    if (this.currentDose.prn) {
      this.setMaxDoseWarning();
    }
  }

  showTitrationForm() {
    this.showTitration = true;
    this.isOnlyShowChart = true;
  }

  scrollToElement(): void {
    this.myScrollContainer.nativeElement.scroll({
      top: this.myScrollContainer.nativeElement.scrollHeight,
      left: 0,
      behavior: 'smooth'
    });
  }

  hideTitrationForm() {
    if (this.isOnlyShowChart) {
      this.showTitration = false;
    } else {
      this.showTitration = false;
      this.hideAdministrationForm.emit(false);
    }
  }

  createLogicalId(dosedate: any, dose_id: any) {
    let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
    return logicalid;
  }

  hideEndInfusionForm() {
    //this.showEndInfusion = false;

    this.hideAdministrationForm.emit(false);
  }

  route() {
    return this.prescription.__routes.find(e => e.prescriptionroutes_id == this.administration.prescriptionroutesid).route;
  }

  administrationValidation() {
    this.setAdministrationDateValidation(this.currentDose.dose_id);
    this.validatiommessage = "";
    this.otherReasonMessage = "";
    var minDate = moment(moment(this.minDate).toDate()).format("YYYYMMDDHHmm");
    var currDate = moment(moment(new Date()).toDate()).format("YYYYMMDDHHmm");
    var administeredTime = moment(moment(this.administration.administrationstartime, "YYYY-MM-DD HH:mm")).format("YYYYMMDDHHmm");
    var maxDate = moment(this.maxDate).format("YYYYMMDDHHmm");
    // if (moment(this.administration.administrationstartime).isBefore(moment(this.currentposology.prescriptionstartdate))) {
    //   this.validatiommessage = "Administration date time cannot be before posology start datetime - " + moment(this.currentposology.prescriptionstartdate).format("DD MMM YYYY HH:mm");
    //   return;
    // }
    if (this.administration.adminstrationstatus == this.administrationStatus.given || this.administration.adminstrationstatus == this.administrationStatus.selfadminister) {
      if (this.currentposology.infusiontypeid == "ci" || this.currentposology.infusiontypeid == InfusionType.pca || this.currentposology.infusiontypeid == "rate") {
        if (this.administration.administredinfusionrate == null || this.administration.administredinfusionrate < 0) {
          this.validatiommessage = "Please enter rate";
          return;
        }
      } else if(!this.administration.isdifferentproductadministered) {
        if (this.currentposology.dosetype == DoseType.units) {
          if (!this.administration.administreddosesize) {
            this.validatiommessage = "Please enter dose";
            return;
          }
        }
        if (this.currentposology.dosetype == DoseType.strength) {
          if (!this.administration.administeredstrengthneumerator || !this.administration.administeredstrengthdenominator) {
            this.validatiommessage = "Please enter strength";
            return;
          }
        }
      } else if(this.administration.isdifferentproductadministered) {
        this.administermultiplemedication.forEach((item)=> {
          if(item.dosetype == DoseType.units) {
            if(!item.administreddosesize) {
              this.validatiommessage = "Please enter dose";
            }
          }
          if(item.dosetype == DoseType.strength) {
            if(!item.administeredstrengthneumerator || !item.administeredstrengthdenominator) {
              this.validatiommessage = "Please enter strength";
            }
          }
        }) 
        if(this.validatiommessage) {
          return;
        }
      }
    }
    if (this.administration.adminstrationstatus == this.administrationStatus.notgiven) {
      if (this.administration.adminstrationstatusreason == this.administrationStatusReason.Other) {
        if (!this.otherreason) {
          this.otherReasonMessage = "Please enter other reason";
          return;
        }
      }
    }
    if (this.administration.adminstrationstatus == this.administrationStatus.notgiven) {
      if (this.administration.adminstrationstatusreason == this.administrationStatusReason.Patientunavailable || this.administration.adminstrationstatusreason == this.administrationStatusReason.Clinicalreason) {
        if (!this.administration.comments) {
          this.validatiommessage = "Please enter comment";
          return;
        }
      }
    }
    if (administeredTime >= minDate && administeredTime <= maxDate) {
      this.validatiommessage = "";
    } else if (administeredTime > currDate) {
      this.validatiommessage = "An administration event cannot be recorded as given in the future";
    } else if (administeredTime <= minDate) {
      this.validatiommessage = "An administration event must be given after the previous administration event";
      // this.validatiommessage = "Please select an administration date time between " + moment(moment(this.minDate).toDate()).format("DD-MM-YYYY HH:mm") + " and " + moment(moment(this.maxDate).toDate()).format("DD-MM-YYYY HH:mm") + ". Administration datetime cannot be before the previous administration event, or after the next administration event.";
      return;
    }
    else if (administeredTime >= maxDate) {
      this.validatiommessage = "An administration event must be given before the next administration event";
      return;
    }
    else {
      this.validatiommessage = "Unable to administer this event at the time selected";
      return;
    }
    if (this.administration.adminstrationstatus == this.administrationStatus.given && this.iswitnessRequired && !this.administrationWitness) {
      this.validatiommessage = "Witness authentication is required";
      return;
    }
    if (this.administration.adminstrationstatus == this.administrationStatus.defer) {
      if (!this.administration.comments) {
        this.validatiommessage = "Please enter comments";
        return;
      }
    }

  }

  setAdministrationDateValidation(dose_id) {
    this.minDate = new Date();
    this.maxDate = new Date();
    // if (this.currentDose.dose_id.includes("start") && this.currentposology.infusiontypeid == "rate") {
    //   this.minDate = moment(this.currentposology.prescriptionstartdate, "YYYY-MM-DD HH:mm").toDate();
    // } else {
    //   this.minDate = moment(this.appService.encounter.admitdatetime, "YYYY-MM-DD HH:mm").toDate();
    // }
    if(this.editpopuptypetype == "OpAdministration") {
      this.minDate = moment().add(-10, "years").toDate();
    } else {
      this.minDate = moment(this.appService.encounter.sortdate, "YYYY-MM-DD HH:mm").toDate();
    }
    this.maxDate.setDate(new Date().getDate());
    if (this.appService.events && ((!this.currentDose.dose_id.includes("start") && this.currentposology.infusiontypeid != "rate") || this.currentposology.infusiontypeid == "bolus")) {
      var alldose = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(p => p.prescription_id === this.currentposology.prescription_id && !p.dose_id.includes("dur") && !p.dose_id.includes("flowrate") && !p.dose_id.includes("infusionevent"));
      var currectDose = alldose.find(x => x.dose_id === dose_id);
      var index = alldose.indexOf(currectDose);
      var previuosDose = alldose[index - 1];
      var nextDose = alldose[index + 1];
      if (previuosDose) {
        this.minDate = moment(previuosDose.eventStart, 'DD-MM-YYYY HH:mm').add(this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
      }
      if (nextDose) {
        if (moment(nextDose.eventStart, 'YYYYMMDDHHmm') > moment(new Date(), 'YYYYMMDDHHmm')) {
          this.maxDate = moment(new Date(), 'DD-MM-YYYY HH:mm').toDate();
        } else {
          this.maxDate = moment(nextDose.eventStart, 'DD-MM-YYYY HH:mm').toDate();
          this.maxDate = moment(this.maxDate, 'DD-MM-YYYY HH:mm').add(-this.appService.administrationTimeDiffInMinute, 'minutes').toDate();
        }
      } else {
        this.maxDate = moment(new Date(), 'DD-MM-YYYY HH:mm').toDate();
      }
    }
    this.appService.logToConsole(this.minDate);
    this.appService.logToConsole(this.maxDate);
  }
  setProduct(id: string) {
    this.existingadministermedication = [];
    this.administermedication = [];
    this.expanded = [];
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=administermedication&synapseattributename=medicationadministrationid&attributevalue=" + id).subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        this.productName = this.medication.name;
        let administermedication = [];
        let administermedicationcode = [];
        let administermedicationingredients = [];
        if (responseArray.length > 0) {
          for (let r of responseArray) {
            administermedication.push(<AdministerMedication>r);
          }
          this.productName = responseArray[0].name;
          this.administermedication_id = responseArray[0].administermedication_id;
          this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=administermedicationcodes&synapseattributename=medicationadministrationid&attributevalue=" + id).subscribe(
            (response) => {
              let responseArray = JSON.parse(response);
              if (responseArray.length > 0) {
                for (let r of responseArray) {
                  administermedicationcode.push(<AdministerMedicationcodes>r);
                }
                this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=administermedicationingredients&synapseattributename=medicationadministrationid&attributevalue=" + id).subscribe(
                  (response) => {
                    let responseArray = JSON.parse(response);
                    if (responseArray.length > 0) {
                      for (let r of responseArray) {
                        administermedicationingredients.push(<AdministerMedicationingredients>r);
                      }
                    }
                    administermedication.forEach(element => {
                      element.__codes = administermedicationcode.filter(x => x.administermedicationid == element.administermedication_id);
                      element.__ingredients = administermedicationingredients.filter(x => x.administermedicationid == element.administermedication_id);
                      if(element.expirydate) {
                        element.expirydate = moment(element.expirydate, "YYYY-MM-DD HH:mm").format("DD-MM-YYYY");
                      }
                      this.existingadministermedication.push(element)
                    });
                    if(this.administration.isdifferentproductadministered) {
                      this.administermultiplemedication = this.existingadministermedication.slice();
                    } else {
                      this.administermedication = this.existingadministermedication.slice();
                    }
                  }));
              }
            }));
        }
      }));
  }
  addMoreMedication() {
    this.getFormularyDetail(this.searchCode, (data) => {
      this.administermedication.push(data);
    });

  }
  removeMoreMedication(m: AdministerMedication) {
    const index: number = this.administermedication.indexOf(m);
    if (index !== -1) {
      this.administermedication.splice(index, 1);
    }
  }
  searchProducts(shownf: boolean, isInit: boolean) {
    this.results = null;
    this.showloadingmessage = true;
    this.shownoresultsmessage = false;
    const postdata = this.createPostData(shownf);
    this.appService.logToConsole(postdata);
    if (postdata) {
      this.subscriptions.add(this.apiRequest.postRequest(this.appService.appConfig.uris.terminologybaseuri + "/Formulary/searchformularies?api-version=1.0", postdata)
        .subscribe((response) => {
          this.showloadingmessage = false;
          this.isInitializing = false;
          this.isFormulary = shownf;
          if (response && response.data && response.data.length != 0) {
            this.results = response;
            this.appService.logToConsole(this.results);
          } else {
            this.shownoresultsmessage = true;
          }
          if (this.productType != "custom") {
            this.getFormularyDetail(this.searchCode, (data) => {
              if (!isInit || this.administration.isdifferentproductadministered)
                this.administermedication.push(data);
            });
          }
        }));
    }
    return false;
  }
  onmedicationselected(event) {
    if(event.productType=='VTM') {
      return false;
    }
    let medication = this.appService.GetAdministrationDoseType(event);
    this.getFormularyDetail(event.code, (data) => {
        data.dosetype = medication.dose_type;
        if(medication.dose_type == DoseType.units) {
          data.administreddoseunit = medication.dose_units;
        }
        if(medication.dose_type == DoseType.strength) {
          data.administeredstrengthneumerator = medication.dose_strength_neumerator;
          data.administeredstrengthdenominator = medication.dose_strength_denominator;
          data.administeredstrengthdenominatorunits = medication.dose_strength_denominator_units;
          data.administeredstrengthneumeratorunits = medication.dose_strength_neumerator_units;
          data.administeredstrengthdenominatorunits = medication.dose_strength_denominator_units;
        }
        if(medication.dose_type == DoseType.descriptive) {
          data.administereddescriptivedose ="";
        }
        this.administermultiplemedication.push(data);
    });
  }
  removeProductAdministered(p) {
    this.administermultiplemedication = this.administermultiplemedication.filter(x=>x.__codes.find(x=>x.code!= p.__codes[0].code));
  }
  getFormularyDetail(code, cb: (data) => any) {
    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${code}?api-version=1.0`)
      .subscribe((response) => {
        this.isLoadingMedication = false;
        if (response && response.length != 0) {
          this.appService.logToConsole(response);
          var m = new AdministerMedication();
          m.administermedication_id = uuid();
          m.personid = this.appService.encounter.person_id;
          m.encounterid = this.encounterId;
          m.name = response.name;
          m.producttype = response.productType;
          m.roundingfactor = response.detail.roundingFactorDesc;

          m.__ingredients = [];
          m.__codes = [];

          var fdbc = response.formularyAdditionalCodes ? response.formularyAdditionalCodes.find(x => x.additionalCodeSystem.toString().toLowerCase() == "fdb") : null;
          var cgc = response.formularyAdditionalCodes ? response.formularyAdditionalCodes.find(x => x.additionalCodeSystem.toString().toLowerCase() == "customgroup") : null;

          if (fdbc && fdbc.additionalCodeDesc) {
            m.classification = fdbc.additionalCodeDesc;
            m.bnf = fdbc.additionalCode;
          }
          else {
            m.classification = "Others";
          }
          if (cgc) {
            m.customgroup = cgc.additionalCode;
          }
          else {
            m.customgroup = "Others";
          }
          this.appService.logToConsole(m.classification);
          this.appService.logToConsole(m.customgroup);

          m.isprimary = true;
          m.form = response.detail.formDesc;
          m.doseformunitofmeasure = response.detail.unitDoseUnitOfMeasureDesc;
          this.iswitnessRequired = response.detail.witnessingRequired == "1";
          if (this.appService.AuthoriseAction(RoleAction.epma_skip_witnessauthentication) == true) {
            this.iswitnessRequired = false;
          }
          if (this.appService.AuthoriseAction(RoleAction.epma_mandate_witnessauthentication) == true) {
            this.iswitnessRequired = true;
          }
          if (response.formularyIngredients) {
            response.formularyIngredients.forEach((fi) => {
              var mig = new AdministerMedicationingredients();
              mig.administermedicationingredients_id = uuid();
              mig.name = fi.ingredientName;
              mig.strengthneumerator = +fi.strengthValueNumerator;
              mig.strengthneumeratorunit = fi.strengthValueNumeratorUnitDesc;
              mig.strengthdenominator = fi.strengthValueDenominator;
              mig.strengthdenominatorunit = fi.strengthValueDenominatorUnitDesc;
              mig.administermedicationid = m.administermedication_id;
              m.__ingredients.push(mig);

              m.strengthneumerator = +fi.strengthValueNumerator;
              m.strengthneumeratorunit = fi.strengthValueNumeratorUnitDesc;
              m.strengthdenominator = +fi.strengthValueDenominator;
              m.strengthdenominatorunit = fi.strengthValueDenominatorUnitDesc;
            });
          }

          m.isblacktriangle = this.MedicationHasFlag("blacktriangle", response);
          m.isclinicaltrial = this.MedicationHasFlag("clinicaltrial", response);
          m.iscontrolled = this.MedicationHasFlag("controlled", response);
          m.isexpensive = this.MedicationHasFlag("expensive", response);
          m.isformulary = !this.MedicationHasFlag("nonformulary", response);
          m.ishighalert = this.MedicationHasFlag("highalert", response);
          m.isunlicenced = this.MedicationHasFlag("unlicenced", response);
          m.iscritical = this.MedicationHasFlag("critical", response);

          var fid = new AdministerMedicationcodes();
          fid.administermedicationcodes_id = uuid();
          fid.code = response.code;
          fid.terminology = "formulary";
          fid.administermedicationid = m.administermedication_id;
          m.__codes.push(fid);
          cb(m);
        }
        else {
          this.appService.logToConsole("Medication not found");
        }
      }));
  }
  expandtoggle(code) {
    let index = this.expanded.indexOf(code);
    if (index != -1) {
      this.expanded.splice(index, 1);
    }
    else
      this.expanded.push(code);
  }
  createPostData(shownf: boolean) {
    var p = new SearchPostData();

    p.searchTerm = this.searchCode;
    if (this.prescription.isgastroresistant || this.prescription.ismodifiedrelease) {
      p.searchTerm = this.prescription.__medications[0].name;
    }
    if (p.searchTerm == "" || p.searchTerm.length < 3)
      return null;

    p.flags = []
    if (this.prescription.isgastroresistant) {
      p.flags.push("GastroResistant");
    }
    if (this.prescription.ismodifiedrelease) {
      p.flags.push("ModifiedRelease");
    }
    p.formularyStatusCd = [];
    if (shownf) {
      this.searchtype = "non-formulary results"
      p.formularyStatusCd.push("002");
    }
    else {
      this.searchtype = "formulary results"
      p.formularyStatusCd.push("001");
    }
    const postdata = JSON.stringify(p);
    return postdata;
  }

  selectmedication(e) {
    this.productName = e.name;
    this.isDropdownshow = false;
    this.isLoadingMedication = true;
    this.getFormularyDetail(e.code, (data) => {
      this.administermedication[this.medIndexSelected] = data;
    });
  }

  MedicationHasFlag(flag, m?: any) {
    return this.appService.MedicationHasFlag(flag, m);
  }

  volumeFordose() {
    // IF dose entered is 10mg, then 
    // Ratio r = concentration dose/entered dose = 10/10 = 1
    // Volume = concentration volume/r = 100/1 = 100 ml
    // Calculated dose = 10mg/100ml. 
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthneumerator / this.administration.administeredstrengthneumerator;
      const volume = this.medication.strengthdenominator / ratio;
      this.administration.administeredstrengthdenominator = parseFloat(volume.toFixed(2));
      this.setMaxDoseWarning();
    }
  }

  doseForVolume() {
    // IF volume entered is 10ml, then 
    // Ratio r= concentration volume/entered volume = 100/10 = 10
    // Dose = concentration dose/r = 10/10 = 1 mg
    // Calculated dose = 1mg/10ml
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthdenominator / this.administration.administeredstrengthdenominator;
      const volume = this.medication.strengthneumerator / ratio;
      this.administration.administeredstrengthneumerator = parseFloat(volume.toFixed(2));
      this.setMaxDoseWarning();
    }
  }

  volumeFordoseAdministerMedication(medication) {     
    if (medication.strengthneumerator > 0 && medication.strengthdenominator > 0) {
      const ratio = medication.strengthneumerator / medication.administeredstrengthneumerator;
      const volume = medication.strengthdenominator / ratio;
      medication.administeredstrengthdenominator = parseFloat(volume.toFixed(2));
    }
  }

  doseForVolumeAdministerMedication(medication) {    
    if (medication.strengthneumerator > 0 && medication.strengthdenominator > 0) {
      const ratio = medication.strengthdenominator / medication.administeredstrengthdenominator;
      const volume = medication.strengthneumerator / ratio;
      medication.administeredstrengthneumerator = parseFloat(volume.toFixed(2));
    }
  }
  onResupply(e, template: TemplateRef<any>): void {
    if (e.target.checked) {
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI +
          "/GetListByPost?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply", this.createDrugRecordFilter(this.administration.prescription_id, this.medicationCode))
          .subscribe((response) => {
            let responseArray: PrescriptionMedicaitonSupply[] = response;

            if (responseArray.length > 0) {
              if (responseArray[0].resupplyfrom == "Ward stock") {
                this.openConfirmModal(template);
                // if (!confirm('This drug is resupplied from ward stock. Are you sure to make a request to the pharmacy?')) {
                //   //this.validatiommessage = 'Resupply request to the pharmacy is cancelled.';
                //   this.administration.requestresupply = false;
                //   return;
                // }
              } else {
                this.findActiveSuppyRequest();
              }
              // if (this.appService.pleaseResupplyStockValidation) {
              //   if (responseArray[0].availablequantity > 0 && this.productType != 'VTM' && !this.prescription.isinfusion && !this.prescription.ismedicinalgas && this.currentposology.frequency != 'protocol' && this.currentposology.dosetype != 'descriptive') {
              //     if (!confirm('The Patient has ' + responseArray[0].availablequantity + ' ' + this.medication.form + ' / ' + responseArray[0].noofdays + ' days of medication remaining. Are you sure you want to request more?')) {
              //       this.administration.requestresupply = false;
              //       return;
              //     }
              //   }
              // }
            } else {
              this.findActiveSuppyRequest();
            }
          }
          )
      )
    }
  }
  findActiveSuppyRequest() {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI +
        "/GetListByPost?synapsenamespace=local&synapseentityname=epma_supplyrequest",
        this.createSupplyRequestFilter())
        .subscribe((response) => {
          let supReqRespArray: SupplyRequest[] = response;
          if (supReqRespArray.length > 0) {
            if (supReqRespArray.filter(s => s.requeststatus == SupplyRequestStatus.Incomplete).length > 0) {
              this.validatiommessage = 'A request has already been made but it is incomplete. Please call pharmacy to expedite if necessary.';
              this.administration.requestresupply = false;
            } else if (supReqRespArray.filter(s => s.requeststatus == SupplyRequestStatus.Pending).length > 0) {
              this.validatiommessage = 'A pharmacy request has been made and is pending for approval. Please call pharmacy to expedite if necessary.';
              this.administration.requestresupply = false;
            } else if (supReqRespArray.filter(s => s.requeststatus == SupplyRequestStatus.Approved).length > 0) {
              this.validatiommessage = 'A pharmacy request has been made and is waiting to be dispensed. Please call pharmacy to expedite if necessary.';
              this.administration.requestresupply = false;
            }
          }
        }
        )
    )
  }
  showAdministrationWarning() {
    this.isAdministrationWarning = true;
    this.SetComponentModuleData();
  }

  SetComponentModuleData() {
    this.componentModuleData = new ComponentModuleData();
    this.componentModuleData.elementTag = "app-warnings"
    this.componentModuleData.moduleContext.apiService = this.apiRequest;
    this.componentModuleData.moduleContext.encouterId = this.encounterId;
    this.componentModuleData.moduleContext.personId = this.appService.personId;
    this.componentModuleData.moduleContext.refreshonload = false;
    this.componentModuleData.moduleContext.existingwarnings = true;
    this.componentModuleData.moduleContext.newwarnings = false;
    this.componentModuleData.moduleContext.viewOnly = true;
    this.componentModuleData.moduleContext.filterDisplayByPresId = this.prescription.prescription_id;
    this.componentModuleData.moduleContext.filterDisplayByMedCode = this.prescription.__medications.find(x => x.isprimary == true).__codes.find(c => c.terminology == "formulary").code;
    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;
  }
  private createDrugRecordFilter(prescription_id, medication_id) {
    let condition = "prescriptionid = @prescriptionid and prescribedmedicationid = @prescribedmedicationid";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("prescriptionid", prescription_id));
    pm.filterparams.push(new filterparam("prescribedmedicationid", medication_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  private createSupplyRequestFilter() {
    let condition = "prescription_id = @prescriptionid and medication_id = @prescribedmedicationid";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("prescriptionid", this.administration.prescription_id));
    pm.filterparams.push(new filterparam("prescribedmedicationid", this.medicationCode));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY lastmodifiedon DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }
  LoadHistory() {
    this.isShowHistory = false;
    if (this.editpopuptypetype == "View History") {
      this.isShowAdministrationHistory = false;
      this.isShowHistory = true;
    } else {
      this.isShowAdministrationHistory = false;
      this.isShowHistory = false;
    }
    this.appService.MedicationadministrationHistory = [];
    this.appService.DoseEventsHistory = [];
    this.appService.InfusionEventsHistory = [];
    if (this.currentDose.dose_id) {
      this.dr.getMedicationAdministrationHistory(this.currentDose.dose_id, (witnessHistory) => {
        // set product data and witness
        if (this.administration && this.administration.correlationid) {
          this.administration.__administerMedication = this.appService.AdministermedicationHistory.filter(x => x.correlationid == this.administration.correlationid);
        }
        this.appService.MedicationadministrationHistory.forEach(element => {
          element.__administerMedication = this.appService.AdministermedicationHistory.filter(x => x.correlationid == element.correlationid);
          let witness = witnessHistory.find(e => e.correlationid == element.correlationid);
          if (witness) {
            element.__witnessName = witness.displayname;             
            if(element.correlationid==this.administration.correlationid) {
              this.administration.__witnessName = witness.displayname;
            }
          }         
        });

        if (this.currentDose.isinfusion) {
          let temp = [];
          this.dr.getInfusionEventsHistory(this.currentDose.dose_id, () => {
            this.appService.InfusionEventsHistory.forEach(element => {
              let admin = null;
              if (element.correlationid) {
                admin = this.appService.MedicationadministrationHistory.find(x => x.correlationid == element.correlationid);
              } else {
                admin = this.appService.MedicationadministrationHistory.find(x => x.administrationstartime == element.eventdatetime && !temp.includes((<any>x)._row_id));
              }
              if (admin) {
                temp.push((<any>admin)._row_id);
                element.__administredinfusionrate = admin.administredinfusionrate;
                element.__administreddosesize = admin.administreddosesize;
                element.__administeredstrengthneumerator = admin.administeredstrengthneumerator;
                element.__administeredstrengthneumeratorunits = admin.administeredstrengthneumeratorunits;
                element.__administeredstrengthdenominator = admin.administeredstrengthdenominator;
                element.__administeredstrengthdenominatorunits = admin.administeredstrengthdenominatorunits;
                element.__witnessName = admin.__witnessName;
              }
            });
            this.SortAdministrationHistory();
          });
        } else {
          this.dose_id = this.currentDose.dose_id.split('_')[1];
          this.dr.getDoseEventsHistory(this.currentDose.dose_id, () => {
            this.SortAdministrationHistory();
          });
        }
      });
    }
  }
  SortAdministrationHistory() {
    this.appService.MedicationadministrationHistory.forEach(element => {  
        this.administrationHistory.push({date : element.modifiedon, recordType: "administration", data : element });
    });
    this.appService.DoseEventsHistory.forEach(element => {
      this.administrationHistory.push({date : element.modifiedon, recordType: "doseevent", data : element });
    });
    this.appService.InfusionEventsHistory.forEach(element => {
      this.administrationHistory.push({date : element.modifiedon, recordType: "infusionevent", data : element });
    });
    this.administrationHistory.sort((b, a) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  openConfirmModal(template: TemplateRef<any>) {
    this.confirmModalRef = this.modalService.show(template, {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-sm modal-dialog-centered'
    });
  }
  confirmWardStock(): void {
    this.findActiveSuppyRequest();
    this.confirmModalRef.hide();
  }
  declineWardStock(): void {
    this.administration.requestresupply = false;
    this.confirmModalRef.hide();
  }
  undoAdministrationModal() {
    this.displayStyle = true;
  }
  undoAdministrationOk(): void {
    this.displayStyle = false;
    this.hideAdministrationForm.emit(false);
  }
  undoAdministrationConfirm() {
    let eventDatetime = null;
    let isNotUndoAllow = null;
    if (this.prescription.isinfusion) {
      eventDatetime = moment(this.currentDose.dose_id.split('_')[1], "YYYYMMDDHHmm").toDate();
    } else {
      eventDatetime = moment(this.currentDose.dose_id.split('_')[0], "YYYYMMDDHHmm").toDate();
    }
    // find the time from logical id 12
    // update time if there is transfer
    let isEventTransfer = this.appService.DoseEvents.find(e => e.logicalid == this.currentDose.dose_id && e.eventtype == "Transfer");
    if (isEventTransfer) {
      eventDatetime = moment(isEventTransfer.dosedatetime);
    }
    if(this.appService.GetCurrentPosology(this.prescription).infusiontypeid == "rate"){
    let startimedose = moment(eventDatetime, "YYYY-MM-DD HH:mm").format("HH:mm");
    this.transferRateInfution(this.currentDose, moment(eventDatetime, "DD-MM-YYYY").toDate(), startimedose, true, (message) => {
      if (message == "success") {
      
      } else {
        isNotUndoAllow = message;
      }
    });
    }
    else{

    isNotUndoAllow = this.appService.events.find(x => x.prescription_id == this.prescription.prescription_id && moment(eventDatetime).isSame(x.eventStart) && x.dose_id != this.currentDose.dose_id && !x.dose_id.includes("dur") && !x.dose_id.includes("flowrate") && !x.dose_id.includes("infusionevent"));
    }
    if (isNotUndoAllow && !this.appService.GetCurrentPosology(this.prescription).prn) {
      this.undoConflictTime = eventDatetime;
      this.undoAdministrationdisplayStyle =false;
      this.undoAdministrationModal();
    } else {
      this.undoAdministration();
    }
  }
  undoAdministrationDecline() {
    this.undoAdministrationdisplayStyle = false;
    this.hideAdministrationForm.emit(false);
  }
  createEndevent(dose: any, pres: any) {
    let originalDoseStartTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == dose.posology_id).__dose.find(z => z.dose_id == dose.dose_id.split("_")[2]).dosestartdatetime;
    let originalDoseEndTime = this.appService.Prescription.find(x => x.prescription_id == pres.prescription_id).__posology.find(y => y.posology_id == dose.posology_id).__dose.find(z => z.dose_id == dose.dose_id.split("_")[2]).doseenddatatime;

    var a = moment(originalDoseEndTime);//now
    var b = moment(originalDoseStartTime);
    var convertToMinites = a.diff(b, 'minutes');

    let splitLogicalId = dose.dose_id.split('_');
    let date = moment();
    date.set({ 'year': splitLogicalId[1].substring(0, 4), 'month': splitLogicalId[1].substring(4, 6) - 1, 'date': splitLogicalId[1].substring(6, 8), 'hour': splitLogicalId[1].substring(8, 10), 'minute': splitLogicalId[1].substring(10, 12), 'second': 0 })
    let originalLogicid = moment(date).add(convertToMinites, "minutes");
    let endtDatetemp = moment(dose.eventStart).add(convertToMinites, "minutes");

    let endaddedtime = 'end_' + moment(originalLogicid).format('YYYYMMDDHHmm') + "_" + dose.dose_id.split("_")[2];
    return {
        "prescription_id": dose.prescription_id,
        "posology_id": dose.posology_id,
        "dose_id": endaddedtime,
        "eventStart": endtDatetemp,
        "eventEnd": null,
        "prn": false,
        "iscancel": false,
        "doctorsorder": false,
        "isinfusion": true,
        "content": "<div class='InfusionCompleteoverdue'></div>",
        "title": "Infusion Complete overdue",
        "admitdone": false,
        "opacityclass": "",
        "diffrence": 0,
        "stackclass": false
    }
    
}
transferRateInfution(dose: any, startDate: Date, startTime: string, transferStart: boolean, cb: (message: string) => any ) {
  let doselist = [];

  doselist = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == dose.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
  // if (this.appService.Prescription.find(p => p.__posology[0].posology_id == dose.posology_id && p.__posology[0].infusiontypeid == "ci")) {

  let pres = this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id);

  if ((pres.infusiontypeid == "ci" || pres.infusiontypeid == InfusionType.pca) ||
      (pres.infusiontypeid == "rate" && pres.frequency == "variable")
  ) {
     
  }
  else {

      let newDoseDateTime = moment(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), +startTime.split(':')[0], +startTime.split(':')[1]));

      // for (let dose of doselist)
      //  var index = doselist.indexOf(dose);
      var index = doselist.findIndex(x => x.dose_id == dose.dose_id);
      let nextstartItem
      let lastenditem
      let currentend
      let nexttime
      let endtime
      let currentendtime
      if (doselist.length == 1 && doselist[0].dose_id.includes("start")) {
          currentend = this.createEndevent(dose, pres);
          let dosesrate = [];
          dosesrate.push(dose);

          dosesrate.push(currentend);

         
      }
      if (index >= 0 && index < doselist.length - 1) {

          currentend = doselist[index + 1];
          nextstartItem = doselist[index + 2];

          if (currentend.dose_id.includes("start")) {

              currentend = this.createEndevent(dose, pres);
              nextstartItem = doselist[index + 1];
              let testcurrenttime= moment(currentend.eventStart).clone();
              testcurrenttime.add(this.appService.administrationTimeDiffInMinute, 'minutes')
              testcurrenttime = moment(currentend.eventStart).add(moment(newDoseDateTime).diff(dose.eventStart, 'minutes'), 'minutes')
              if(testcurrenttime.isSameOrAfter(moment(nextstartItem.eventStart))){
                  cb("The administration event cannot be administered at a time after the next administration event.");
                  return;
              }
              
          }


          lastenditem = doselist[index - 1];
          if (nextstartItem) {
              nexttime = moment(nextstartItem.eventStart).clone();
          }
          else {
              // if (this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).prescriptionenddate) {
              //     nexttime = moment(this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).prescriptionenddate).clone();
              // }
              // else {
              nexttime = moment().add(8, 'days');
              // }
          }
          if (index == 0) {
              // endtime = moment(this.appService.Prescription.find(x => x.prescription_id == dose.prescription_id).startdatetime)
              endtime = moment(this.appService.encounter.sortdate);
          }
          else {
              endtime = moment(lastenditem.eventStart).clone();
          }
          currentendtime = moment(currentend.eventStart).add(moment(newDoseDateTime).diff(dose.eventStart, 'minutes'), 'minutes')
          nexttime.add(- this.appService.administrationTimeDiffInMinute, 'minutes')
          if (index != 0) {
              endtime.add(this.appService.administrationTimeDiffInMinute, 'minutes')
          }
      }
      let timediffback = moment(newDoseDateTime).diff(dose.eventStart, 'minutes');
      let timediffForword = moment(newDoseDateTime).diff(nexttime, 'minutes');
      if (timediffback < 0) {
          //  let dif=moment(lastenditem.eventStart).diff(moment(newDoseDateTime),'minutes')
          if (moment(endtime).isSameOrAfter(moment(newDoseDateTime))) {
              if (index == 0) {
                  cb("The time of transfer cannot be earlier than the admission date/time");
              }
              else {
                  if (transferStart)
                      cb("The administration event cannot be administered at a time before the previous administration event.");
                  else
                      cb("The administration event cannot be transferred to a time before the previous administration event.");
              }

          }
          else {
              let dosesrate = [];
              dosesrate.push(dose);

              dosesrate.push(currentend);
             

         
          }
      }
      else if (timediffback > 0) {

          if (moment(currentendtime).isSameOrAfter(moment(nexttime))) {
              if (transferStart)
                  cb("The administration event cannot be administered at a time after the next administration event.");
              else
                  cb("The administration event cannot be transferred to a time after the next administration event.");
          }
          else {
              let dosesrate = [];
              dosesrate.push(dose);

              dosesrate.push(currentend);


             
          }
      }
      else {
          cb("success");
      }
  }

}

}
export class  AdministrationHistory {
  date : any;
  recordType: any;
  data: any;
}

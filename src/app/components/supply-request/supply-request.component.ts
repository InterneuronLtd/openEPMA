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
import { Component, OnInit, TemplateRef, ElementRef, ViewChild, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SupplyRequest, AdministerMedication, AdministerMedicationingredients, AdministerMedicationcodes, Prescription, DSMedSupplyRequiredStatus, SupplyRequestMedications, PrescriptionMedicaitonSupply } from '../../models/EPMA';
import { v4 as uuid } from 'uuid';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import moment from 'moment';
import { SearchPostData } from '../search-medication/search-medication.component';
import { SubjectsService } from 'src/app/services/subjects.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { DataRequest } from 'src/app/services/datarequest';
import { Indication } from '../prescribing-form/formhelper';
import { Common, DoseType, RoleAction, SupplyRequestStatus } from 'src/app/services/enum';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';

@Component({
  selector: 'app-supply-request',
  templateUrl: './supply-request.component.html',
  styleUrls: ['./supply-request.component.css']
})
export class SupplyRequestComponent implements OnInit, OnDestroy {

  subscriptions: Subscription = new Subscription();
  validationMessage: string = '';
  informationMessage: string = '';
  quantityMessage: string = '';
  dsOtherReasonMessage: string = '';
  isSaving: boolean = false;
  headerLabelText: string;
  isInfusion = false;
  totalDose = 0;
  showIndication = false;
  minDate: Date;
  isPharmacist: boolean = false;
  isSeniorPharmacist: boolean = false;

  isActiveRequestExists: boolean = false;

  therapyType: string;
  medicationFullName: string;
  supplyRequestId: string;
  productName: string;
  originalProductType: string;
  productType: string;
  isDropdownshow: boolean = false;
  isLoadingMedication: boolean = false;
  showloadingmessage = false;
  isInitializing: boolean = true;
  shownoresultsmessage = false;
  isFormulary: boolean = false;
  results: any;
  searchCode: string;
  searchtype: string;
  administermedication: AdministerMedication[] = [];
  supplyRequestStatusList: any[] = [];
  supplyRequestStatus: string;
  requestedNoOfDays: number;
  requestedQuantity: string;
  doseUnit: string;
  labelInstructionsRequired: boolean = false;
  nonFormularyRequest: boolean = false;
  routeList: any[] = [];
  indication: any;
  route: any;
  supplyRequestChanges: SupplyRequest[] = [];
  supplyRequestHistory: SupplyRequest[] = [];
  allSupplyRequests: SupplyRequest[] = [];
  indications: Indication[] = [];
  requestedOn: Date;
  requestedBy: string;
  isRequestApproved: boolean = false;
  isRequestFulfilled: boolean = false;
  isRequestRejected: boolean = false;
  isRequestPending: boolean = false;
  supplyrequest: SupplyRequest = new SupplyRequest();
  prescription: Prescription = new Prescription();
  prescriptionId: string;
  medicationCode: string;
  isLoading: boolean = false;
  modalRef: BsModalRef;
  isNewMedicine: boolean = false;
  licensingAuthority: string;
  originalSupplyStatus: string;
  isAnyPendingRequest: boolean = false;
  patientownsupplyarr = ['Not brought in', 'Supply unsuitable', 'Supply ran out', 'Other'];
  expanded = [];
  confirmModalRef: BsModalRef;
  public supplyReqStatus: typeof SupplyRequestStatus = SupplyRequestStatus;
  @ViewChild('confirmcopy') confirmcopy: ElementRef;
  @Input('event') event: any
  doseType: string;
  dSMedSupplyNotRequired: DSMedSupplyRequiredStatus = new DSMedSupplyRequiredStatus();
  supplyRequestMedications: Array<SupplyRequestMedications> = [];
  medIndexSelected: number = 0;
  patientDrug: PrescriptionMedicaitonSupply;
  patientDrugHistory: PrescriptionMedicaitonSupply[] = [];
  componenttype : string;
  encounterId: string;
  validEncounter:boolean;
  isEditable: boolean;
  constructor(
    private apiRequest: ApirequestService,
    public appService: AppService,
    public subjects: SubjectsService,
    private modalService: BsModalService,
    public dr: DataRequest
  ) {
    this.headerLabelText = "Supply Request";


  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(preEvent: any) {
    this.componenttype = preEvent.componenttype ;

    if(this.componenttype == 'OP')
    {
      this.encounterId = Common.op_encounter_placeholder;
    }
    else 
    {
      this.encounterId = this.appService.encounter.encounter_id;
    }

   this.validEncounter = (this.appService.isCurrentEncouner || (this.appService.isTCI && !this.appService.isTCICancelled) || this.componenttype == 'OP')

    if (this.componenttype == "SUM" ||  this.componenttype == "SUMNO") {
      this.headerLabelText = "Discharge Supply Request";
      this.dr.getDSMedSupplyRequest(this.event.prescription.prescription_id, (data) => {
        if (data.length > 0) {
          this.dSMedSupplyNotRequired = data[0];
        }
      });
    }
    this.allSupplyRequests = [];
    this.supplyRequestChanges = [];
    this.supplyRequestHistory = [];
    this.licensingAuthority = "";

    this.prescription = preEvent.prescription;
    this.prescriptionId = preEvent.prescription.prescription_id;
    this.medicationCode = preEvent.prescription.__medications.find(x => x.isprimary).__codes.find(x => x.terminology == "formulary").code;
    this.originalProductType = preEvent.prescription.__medications.find(x => x.isprimary).producttype;
    this.isNewMedicine = !this.appService.checkMedicineTypeForMoa(this.prescription);
    this.doseType = this.appService.GetCurrentPosology(this.prescription).dosetype;
    this.supplyrequest = new SupplyRequest();
    this.isLoading = true;
    this.patientDrug = this.appService.PrescriptionMedicaitonSupply.find(x => x.prescriptionid == this.prescriptionId);
    this.appService.PatientDrugHistory =[];
    if (this.patientDrug) {
      this.GetMedicationSupplyHistory();
    }
    // if (this.appService.pleaseResupplyStockValidation) {
    //   this.validateStock();
    // } else {
    //   this.showSupplyRequestPopup = true;
    // }

    this.getUserRole();
    this.initializeForm();
    if (this.productType != 'custom') {
      this.searchProducts(false);
      this.getProductDetail(this.medicationCode, "load");
    } else {
      this.isLoading = false;
    }
    this.minDate = new Date();

  }
  patientDrugs() {
    this.subjects.patientDrug.next({ prescription: this.prescription });
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  // validateStock() {
  //   this.subscriptions.add(
  //     this.apiRequest.postRequest(this.appService.baseURI +
  //       "GetListByPost?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply", this.createDrugRecordFilter(this.prescriptionId, this.medicationCode))
  //       .subscribe((response) => {

  //         let responseArray: PrescriptionMedicaitonSupply[] = response;
  //         if (responseArray.length > 0 && responseArray[0].availablequantity > 0 && this.originalProductType != 'VTM' && !this.isInfusion && this.appService.GetCurrentPosology(this.prescription).frequency != 'protocol' && this.appService.GetCurrentPosology(this.prescription).dosetype != 'descriptive') {
  //           if (confirm('The Patient has ' + responseArray[0].availablequantity + ' drugs / ' + responseArray[0].noofdays + ' days of drug remaining. Are you sure you want to request more?')) {
  //             this.showSupplyRequestPopup = true;
  //             return;
  //           }
  //           else {
  //             this.showSupplyRequestPopup = false;
  //             return;
  //           }
  //         } else {
  //           this.showSupplyRequestPopup = true;
  //         }
  //       }
  //       )
  //   )
  // }
  newRequest(): void {
   // this.dr.RefreshIfDataVersionChanged(() => { });
    this.minDate = new Date();
    this.validationMessage = '';
    this.supplyRequestStatus = this.supplyReqStatus.Incomplete;
    this.originalSupplyStatus = this.supplyReqStatus.Incomplete;
    this.SetSupplyStatus(this.supplyReqStatus.Incomplete);

    this.supplyRequestChanges = [];
    this.supplyRequestHistory = [];
    this.supplyRequestId = "";
    this.supplyrequest = new SupplyRequest();
    this.supplyrequest.daterequired = null;
    this.requestedNoOfDays = null;
    this.requestedQuantity = null;
    this.supplyrequest.licenseauthority = this.licensingAuthority;
    if (this.routeList.length > 0) {
      this.supplyrequest.route = this.routeList.find(x => x.code == this.prescription.__routes[0].routecode);
    }
    this.setIndication();
    this.nonFormularyRequest = !this.prescription.__medications[0].isformulary;
    this.isEditable = !(this.originalSupplyStatus == this.supplyReqStatus.Incomplete || this.originalSupplyStatus == this.supplyReqStatus.Pending); 
  }
  SetSupplyStatus(status) {
    this.supplyRequestStatusList = [];
    if(this.componenttype == 'OP') {
      this.supplyRequestStatusList.push({ name: status, value: status });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.OutpatientApproved, value: this.supplyReqStatus.Approved });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.Fulfilled, value: this.supplyReqStatus.Fulfilled });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.OutpatientChecked, value: this.supplyReqStatus.OutpatientChecked });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.Rejected, value: this.supplyReqStatus.Rejected });
      
    } else {
      this.supplyRequestStatusList.push({ name: status, value: status });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.Approved, value: this.supplyReqStatus.Approved });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.Rejected, value: this.supplyReqStatus.Rejected });
      this.supplyRequestStatusList.push({ name: this.supplyReqStatus.Fulfilled, value: this.supplyReqStatus.Fulfilled });
    }
  }
  /* Check where the login user is pharmacist or senior pharmacist */
  private getUserRole(): void {
    this.isPharmacist = this.appService.loggedInUserRoles.includes("Pharmacist");
    this.isSeniorPharmacist = this.appService.loggedInUserRoles.includes('Senior Pharmacist');
  }

  /* Get the prescription and dose details for the prescription id and medication id */
  private initializeForm(): void {
    this.validationMessage = '';
    this.informationMessage = '';
    this.quantityMessage = '';
    this.supplyRequestStatus = '';
    this.labelInstructionsRequired = false;
    this.nonFormularyRequest = false;
    this.totalDose = 0;
    this.supplyRequestChanges = [];
    this.supplyRequestHistory = [];
    this.isRequestApproved = false;
    this.isRequestRejected = false;
    this.isRequestFulfilled = false;
    this.isRequestRejected = false;
    this.isRequestPending = false;
    this.isInfusion = false;
    let prescriptionArray = this.appService.Prescription.filter(pre => pre.prescription_id == this.prescriptionId);

    this.medicationFullName = this.prescription.__medications.find(x => x.isprimary).name;
    let medicationForm = this.prescription.__medications.find(x => x.isprimary).form;

    if (!medicationForm) {
      this.therapyType = 'therapy';
    } else if (medicationForm.toLowerCase().indexOf('tablet') != -1 || medicationForm.toLowerCase().indexOf('capsule') != -1) {
      this.therapyType = 'TabletorCapsule';
    } else if (medicationForm.toLowerCase().indexOf('injection') != -1) {
      this.therapyType = 'Injection';
    } else if (medicationForm.toLowerCase().indexOf('infusion') != -1) {
      this.therapyType = 'ContinuousInfusion';
    } else if (medicationForm.toLowerCase().indexOf('fluid') != -1) {
      this.therapyType = 'BasicFluids';
    } else if (medicationForm.toLowerCase().indexOf('inhalation') != -1) {
      this.therapyType = 'Inhalation';
    } else {
      this.therapyType = 'therapy';
    }

    this.searchCode = prescriptionArray[0].__medications[0].__codes[0].code;
    this.productType = prescriptionArray[0].__medications[0].producttype;
    this.isInitializing = true;
    this.productName = this.medicationFullName;
    let supplyMed = new SupplyRequestMedications();
    supplyMed.epma_supplyrequestmedications_id = uuid();
    supplyMed.productname = this.medicationFullName;
    supplyMed.productcode = this.searchCode;
    supplyMed.producttype = this.productType;
    supplyMed.prescription_id = this.prescriptionId;
    supplyMed.encounter_id = this.encounterId;
    supplyMed.person_id = this.appService.personId;
    this.supplyRequestMedications.push(supplyMed);
    if (prescriptionArray[0].isinfusion || prescriptionArray[0].ismedicinalgas) {
      this.isInfusion = true;
    }
    this.setQuantityDays();
  }
  addMoreMedication() {
    let supplyMed = new SupplyRequestMedications();
    supplyMed.epma_supplyrequestmedications_id = uuid();
    supplyMed.productname = this.medicationFullName;
    supplyMed.productcode = this.searchCode;
    supplyMed.producttype = this.productType;
    supplyMed.prescription_id = this.prescriptionId;
    supplyMed.encounter_id = this.encounterId;
    supplyMed.person_id = this.appService.personId;
    this.supplyRequestMedications.push(supplyMed);
  }
  removeMoreMedication(m: SupplyRequestMedications) {
    const index: number = this.supplyRequestMedications.indexOf(m);
    if (index !== -1) {
      this.supplyRequestMedications.splice(index, 1);
    }
  }
  setQuantityDays() {
    let doseArray = this.appService.GetCurrentPosology(this.prescription).__dose;

    for (let dose of doseArray) {
      if (this.isInfusion || this.productType == 'VTM' || this.appService.GetCurrentPosology(this.prescription).frequency == 'protocol' || this.appService.GetCurrentPosology(this.prescription).dosetype == DoseType.descriptive) {
        this.doseUnit = "Product packs";
      } else {
        if (dose.dosesize && dose.doseunit) {
          this.totalDose += +dose.dosesize;
          this.doseUnit = dose.doseunit;
        } else if (dose.strengthdenominator) {
          this.totalDose += +dose.strengthdenominator;
          this.doseUnit = dose.strengthdenominatorunit;
        }
        else {
          this.doseUnit = "Product packs";
        }
      }
    }

    this.totalDose = +this.totalDose.toFixed(2).replace(/\.00$/, '');
  }
  searchProducts(shownf: boolean) {
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
          this.nonFormularyRequest = shownf;
          this.showIndication = shownf;
          if (response && response.data && response.data.length != 0) {
            this.results = response;
            this.appService.logToConsole(this.results);
          } else {
            this.shownoresultsmessage = true;
          }

        }));
    }
    return false;
  }
  getProductDetail(code, type) {
    this.isDropdownshow = false;
    this.isLoadingMedication = true;
    this.licensingAuthority = "";
    this.validationMessage = "";
    this.expanded = [];
    var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
    this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${code}?api-version=1.0`)
      .subscribe((response) => {
        this.isLoadingMedication = false;
        if (response && response.length != 0) {
          console.log(response);
          this.productType = response.productType;
          this.routeList = [];
          if (response.formularyRouteDetails) {
            response.formularyRouteDetails.forEach((fr) => {
              this.routeList.push({ name: fr.routeDesc, code: fr.routeCd });
            });
          }
          if (type == "load") {
            this.setIndicationList(response);
            this.getSupplyRequestDetails();
            this.setIndication();
          }
          if (response.detail.currentLicensingAuthorityCd == "1") {
            this.licensingAuthority = "MHRA/EMA";
          } else {
            this.licensingAuthority = "None";
          }
          this.administermedication = [];
          var m = new AdministerMedication();
          this.administermedication.push(m);
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
          this.setQuantityDays();
          console.log(this.administermedication);

        }
        else { }
      }));
  }
  selectmedication(e, medIndexSelected) {
    this.supplyRequestMedications[medIndexSelected].productname = e.name;
    this.supplyRequestMedications[medIndexSelected].productcode = e.code;
    this.supplyRequestMedications[medIndexSelected].producttype = e.productType;
    this.productName = e.name;
    this.requestedQuantity = null;
    this.requestedNoOfDays = null;
    this.getProductDetail(e.code, "change");
  }
  expandtoggle(code) {
    let index = this.expanded.indexOf(code);
    if (index != -1) {
      this.expanded.splice(index, 1);
    }
    else
      this.expanded.push(code);
  }
  /* Get the details of the supply request if any active request exists */
  getSupplyRequestDetails(): void {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI +
        "/GetListByPost?synapsenamespace=local&synapseentityname=epma_supplyrequest",
        this.createSupplyRequestFilter())
        .subscribe((response) => {
          // supply request history
          this.isLoading = false;
          let responseArray: SupplyRequest[] = response;
          this.supplyRequestHistory = [];
          this.supplyRequestHistory = responseArray;
          if (this.supplyRequestHistory.length > 0) {
            this.allSupplyRequests = this.supplyRequestHistory.slice().sort((a, b) => new Date(b.requestedon).getTime() - new Date(a.requestedon).getTime());
          }
          let anyPending = responseArray.find(r => r.requeststatus == SupplyRequestStatus.Incomplete || r.requeststatus == SupplyRequestStatus.Pending);
          if (anyPending) {
            this.isAnyPendingRequest = true;
          }
          // check for active supply request
          this.supplyrequest = null; //responseArray.find(r => r.requeststatus == SupplyRequestStatus.Incomplete || r.requeststatus == SupplyRequestStatus.Pending || r.requeststatus == SupplyRequestStatus.Approved);
          if (this.supplyrequest) {
            this.isActiveRequestExists = true;
            this.supplyRequestId = this.supplyrequest.epma_supplyrequest_id;
            this.supplyRequestHistory.sort((b, a) => new Date(b.requestedon).getTime() - new Date(a.requestedon).getTime());
            // if (this.supplyRequestHistory.length >= 1) {
            //   this.supplyRequestHistory = this.supplyRequestHistory.filter(h => h.epma_supplyrequest_id != this.supplyRequestId);
            //   if (this.supplyRequestHistory.length > 0) {
            //     this.supplyRequestHistory.sort((a, b) => new Date(b.lastmodifiedon).getTime() - new Date(a.lastmodifiedon).getTime());
            //   }
            // }
            this.searchCode = this.supplyrequest.selectedproductcode;
            this.productType = this.supplyrequest.selectproductcodetype;
            this.productName = this.supplyrequest.selectedproductname;
            this.supplyRequestStatus = this.supplyrequest.requeststatus;
            this.originalSupplyStatus = this.supplyrequest.requeststatus;
            this.isRequestApproved = this.supplyrequest.requeststatus == this.supplyReqStatus.Approved ? true : false;
            this.isRequestFulfilled = this.supplyrequest.requeststatus == this.supplyReqStatus.Fulfilled ? true : false;
            this.isRequestRejected = this.supplyrequest.requeststatus == this.supplyReqStatus.Rejected ? true : false;
            this.isRequestPending = this.supplyrequest.requeststatus == this.supplyReqStatus.Pending ? true : false;
            this.requestedNoOfDays = this.supplyrequest.requestednoofdays;
            this.requestedQuantity = this.supplyrequest.requestquantity;
            this.requestedOn = this.supplyrequest.requestedon;
            this.requestedBy = this.supplyrequest.requestedby;
            this.doseUnit = this.supplyrequest.requestedquantityunits;
            if (this.supplyrequest.daterequired) {
              this.supplyrequest.daterequired = moment(this.supplyrequest.daterequired).toDate();
            } else {
              this.supplyrequest.daterequired = null;
            }
            this.labelInstructionsRequired = this.supplyrequest.labelinstructiosrequired;
            this.nonFormularyRequest = !this.supplyrequest.isformulary;
            if (this.supplyRequestStatus == this.supplyReqStatus.Fulfilled) {
              if (this.supplyrequest.fulfilledon) {
                this.supplyrequest.fulfilledon = moment(this.supplyrequest.fulfilledon).toDate();
              } else {
                this.supplyrequest.fulfilledon = moment().toDate();
              }
            }
            if (this.supplyrequest.indication) {
              let ind = JSON.parse(this.supplyrequest.indication);
              this.supplyrequest.indication = this.indications.find(x => x.code == ind.code);
            }
            if (this.supplyrequest.route) {
              let ind = JSON.parse(this.supplyrequest.route);
              this.supplyrequest.route = this.routeList.find(x => x.code == ind.code);
            }
            this.supplyRequestStatusList = [];
            this.SetSupplyStatus(this.supplyReqStatus.Pending)
            // supply request change list
            this.setSupplyRequestChangeData(this.supplyRequestId);
            this.getSupplyRequestMedication(this.supplyRequestId);
            this.isEditable = !(this.originalSupplyStatus == this.supplyReqStatus.Incomplete || this.originalSupplyStatus == this.supplyReqStatus.Pending); 
          } else {
            this.isActiveRequestExists = false;
            this.supplyRequestStatus = '';
            this.supplyRequestStatusList = [];
            this.requestedNoOfDays = 1;
            this.requestedQuantity = this.totalDose?.toString();
          }
          //this.showSupplyRequestPopup = true;
          // no stock validation for now
          // if (this.appService.pleaseResupplyStockValidation && this.allSupplyRequests.length == 0) {
          //   this.validateStock();
          // } else {
          //   this.showSupplyRequestPopup = true;
          // }
        }
        )
    )

  }
  getSelectedSupplyRequestDetails(supplyRequestId: string): void {
    this.validationMessage = '';
    this.informationMessage = '';
    this.quantityMessage = '';
    // let prescriptionArray = this.appService.Prescription.filter(pre => pre.prescription_id == this.prescriptionId);
    // this.supplyrequest.indication = prescriptionArray[0].indication;

    this.supplyrequest = this.allSupplyRequests.slice().find(e => e.epma_supplyrequest_id == supplyRequestId)
    if (typeof this.supplyrequest.route != "object") {
      this.supplyrequest.route = JSON.parse(this.supplyrequest.route);
    }
    if (this.supplyrequest.route && this.supplyrequest.route.code) {
      this.supplyrequest.route = this.routeList.find(x => x.code == this.supplyrequest.route.code);
    }
    if (typeof this.supplyrequest.indication != "object") {
      this.supplyrequest.indication = JSON.parse(this.supplyrequest.indication);
    }
    if (this.supplyrequest.indication && this.supplyrequest.indication.code) {
      this.supplyrequest.indication = this.indications.find(x => x.code == this.supplyrequest.indication.code);
    }
    this.supplyRequestId = this.supplyrequest.epma_supplyrequest_id;;
    this.searchCode = this.supplyrequest.selectedproductcode;
    this.productType = this.supplyrequest.selectproductcodetype;
    this.productName = this.supplyrequest.selectedproductname;
    this.supplyRequestStatus = this.supplyrequest.requeststatus;
    this.originalSupplyStatus = this.supplyrequest.requeststatus;
    this.isRequestApproved = this.supplyrequest.requeststatus == this.supplyReqStatus.Approved ? true : false;
    this.isRequestFulfilled = this.supplyrequest.requeststatus == this.supplyReqStatus.Fulfilled ? true : false;
    this.isRequestRejected = this.supplyrequest.requeststatus == this.supplyReqStatus.Rejected ? true : false;
    this.isRequestPending = this.supplyrequest.requeststatus == this.supplyReqStatus.Pending ? true : false;
    this.requestedNoOfDays = this.supplyrequest.requestednoofdays;
    this.requestedQuantity = this.supplyrequest.requestquantity;
    this.requestedOn = this.supplyrequest.requestedon; //moment(supplyRequest.requestedon).format('DD-MM-YYYY');
    this.requestedBy = this.supplyrequest.requestedby;
    this.doseUnit = this.supplyrequest.requestedquantityunits;
    this.nonFormularyRequest = !this.supplyrequest.isformulary
    if (this.supplyrequest.daterequired) {
      this.supplyrequest.daterequired = moment(this.supplyrequest.daterequired).toDate();
    } else {
      this.supplyrequest.daterequired = null;
    }
    if (this.supplyRequestStatus == this.supplyReqStatus.Fulfilled) {
      if (this.supplyrequest.fulfilledon) {
        this.supplyrequest.fulfilledon = moment(this.supplyrequest.fulfilledon).toDate();
      } else {
        this.supplyrequest.fulfilledon = moment().toDate();
      }
   }
    
    if (this.originalSupplyStatus == this.supplyReqStatus.Incomplete) {
      this.SetSupplyStatus(this.supplyReqStatus.Incomplete);
    } else {
      this.SetSupplyStatus(this.supplyReqStatus.Pending);
    }
    this.setSupplyRequestChangeData(supplyRequestId);
    this.getSupplyRequestMedication(supplyRequestId);
    this.isEditable = !(this.originalSupplyStatus == this.supplyReqStatus.Incomplete || this.originalSupplyStatus == this.supplyReqStatus.Pending); 
  }
  setFullFilDate() {
    if (this.supplyRequestStatus == this.supplyReqStatus.Fulfilled) {
      if (this.supplyrequest.fulfilledon) {
        this.supplyrequest.fulfilledon = moment(this.supplyrequest.fulfilledon).toDate();
      } else {
        this.supplyrequest.fulfilledon = moment().toDate();
      }
   }
  }
  setSupplyRequestChangeData(supplyRequestId) {
    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetObjectHistory?synapsenamespace=local&synapseentityname=epma_supplyrequest&id=' + supplyRequestId
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);
          this.supplyRequestChanges = [];
          for (let resp of responseArray) {
            this.supplyRequestChanges.push(resp);
          }
          this.supplyRequestChanges.sort((a, b) => new Date(b.lastmodifiedon).getTime() - new Date(a.lastmodifiedon).getTime());
        }
        )
    );
  }
  getSupplyRequestMedication(supplyRequestId) {
    this.dr.getSupplyRequestMedication(supplyRequestId, (data) => {
      if (data.length > 0) {
        this.supplyRequestMedications = data;
      }
    });
  }
  setIndicationList(medication) {
    this.indications = [];
    if (medication.detail.licensedUses)
      medication.detail.licensedUses.forEach(el => {
        let pi = new Indication();
        pi.code = el.cd;
        pi.indication = el.desc;
        pi.islicensed = true;
        pi.selected = false;
        this.indications.push(pi);
      });
    if (medication.detail.unLicensedUses)
      medication.detail.unLicensedUses.forEach(el => {
        let pi = new Indication();
        pi.code = el.cd;
        pi.indication = el.desc;
        pi.islicensed = false;
        pi.selected = false;

        this.indications.push(pi);
      });

    let pi = new Indication();
    pi.code = "other";
    pi.indication = "other";
    pi.selected = false;
    this.indications.push(pi);

  }
  setIndication() {
    if (this.prescription.indication) {
      let ind = JSON.parse(this.prescription.indication);
      this.supplyrequest.indication = this.indications.find(x => x.code == ind.code);
      if (ind.code == "other") {
        this.supplyrequest.otherindication = this.prescription.otherindications;
      }
    }
  }
  saveValidation() {
    if (this.originalSupplyStatus == this.supplyReqStatus.Incomplete) {
      return true;
    }
    if (this.originalSupplyStatus == this.supplyReqStatus.Pending) {
      if (!this.nonFormularyRequest || this.supplyRequestStatus == this.supplyReqStatus.Pending) {
        return true;
      }
      if (this.nonFormularyRequest && this.supplyRequestStatus == this.supplyReqStatus.Approved && this.isSeniorPharmacist) {
        return true;
      }
    }
    if (this.originalSupplyStatus == this.supplyReqStatus.Pending && this.supplyRequestStatus == this.supplyReqStatus.Rejected) {
      return true;
    }
    if (this.originalSupplyStatus == this.supplyReqStatus.Approved && this.supplyRequestStatus == this.supplyReqStatus.Fulfilled) {
      return true;
    }
  }
  statusRBACValidation(status) {
    if(this.prescription.isdeleted){
      return true;
    }
    if (status == this.supplyReqStatus.Fulfilled) {
       if(this.originalSupplyStatus == this.supplyReqStatus.Approved) {
        return false;
       } else {
        return true;
       }
    }
    if (!this.nonFormularyRequest) {
      if (status == this.supplyReqStatus.Pending) {
        if (this.appService.AuthoriseAction(RoleAction.epma_approve_formulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Approved) {
        if (this.appService.AuthoriseAction(RoleAction.epma_approve_formulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Rejected || status == this.supplyReqStatus.OutpatientChecked) {
        if (this.appService.AuthoriseAction(RoleAction.epma_reject_formulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Fulfilled) {
        if (this.appService.AuthoriseAction(RoleAction.epma_fulfil_formulary_supplyrequest) == true) {
          return false;
        } else {
          return true;
        }
      }
    } else {
      if (status == this.supplyReqStatus.Pending) {
        if (this.appService.AuthoriseAction(RoleAction.epma_approve_nonformulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Approved) {
        if (this.appService.AuthoriseAction(RoleAction.epma_approve_nonformulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Rejected || status == this.supplyReqStatus.OutpatientChecked) {
        if (this.appService.AuthoriseAction(RoleAction.epma_reject_nonformulary_supplyequest) == true) {
          return false;
        } else {
          return true;
        }
      }
      if (status == this.supplyReqStatus.Fulfilled) {
        if (this.appService.AuthoriseAction(RoleAction.epma_fulfil_nonformulary_supplyrequest) == true) {
          return false;
        } else {
          return true;
        }
      }
    }
  }
  onSave(): void {
    if ((this.event.componenttype == 'SUM' || this.event.componenttype == 'SUMNO') && this.dSMedSupplyNotRequired.status == "No") {
      if (!this.dSMedSupplyNotRequired.epma_dsmedsupplyrequiredstatus_id) {
        this.dSMedSupplyNotRequired.epma_dsmedsupplyrequiredstatus_id = uuid();
      }
      if (this.dSMedSupplyNotRequired.reason != 'Not required') {
        this.dSMedSupplyNotRequired.otherreason = "";
      }
      this.dsOtherReasonMessage = "";
      if (this.dSMedSupplyNotRequired.reason == 'Not required') {
        if (!this.dSMedSupplyNotRequired.otherreason) {
          this.dsOtherReasonMessage = "Please enter reason";
          return;
        }
      }
      this.dSMedSupplyNotRequired.prescription_id = this.event.prescription.prescription_id;
      this.dSMedSupplyNotRequired.person_id = this.appService.personId;
      this.dSMedSupplyNotRequired.encounter_id = this.encounterId;
      this.isSaving = true;
      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
        "/PostObject?synapsenamespace=local&synapseentityname=epma_dsmedsupplyrequiredstatus", JSON.stringify(this.dSMedSupplyNotRequired),false)
        .subscribe((saveResponse) => {
          this.appService.UpdateDataVersionNumber(saveResponse);
          this.isSaving = false;
          this.subjects.closeAppComponentPopover.next();
        }
        )
      )
    } else {
      if ((this.event.componenttype == 'SUM' || this.event.componenttype == 'SUMNO')) {
        this.dSMedSupplyNotRequired.prescription_id = this.event.prescription.prescription_id;
        this.dSMedSupplyNotRequired.person_id = this.appService.personId;
        this.dSMedSupplyNotRequired.encounter_id = this.encounterId;
        this.dSMedSupplyNotRequired.status = "Yes";
        this.dSMedSupplyNotRequired.otherreason = "";
        this.dSMedSupplyNotRequired.reason = "";
        if (!this.dSMedSupplyNotRequired.epma_dsmedsupplyrequiredstatus_id) {
          this.dSMedSupplyNotRequired.epma_dsmedsupplyrequiredstatus_id = uuid();
        }
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
          "/PostObject?synapsenamespace=local&synapseentityname=epma_dsmedsupplyrequiredstatus", JSON.stringify(this.dSMedSupplyNotRequired),false)
          .subscribe((saveResponse) => {
            this.appService.UpdateDataVersionNumber(saveResponse);
            this.onSupplyRequestSave();
          }
          )
        )
      } else {
        this.onSupplyRequestSave();
      }

    }
  }
  onSupplyRequestSave(): void {
    this.validationMessage = '';
    this.informationMessage = '';
    this.isSaving = false;
    let isnnewRequest = false;
    if (this.productType == 'VTM') {
      this.validationMessage = 'Please select a VMP or AMP medication';
      return;
    }
    if (!this.prescription.titration && !this.isInfusion && this.originalProductType != 'VTM' && this.appService.GetCurrentPosology(this.prescription).frequency != 'protocol' && this.appService.GetCurrentPosology(this.prescription).dosetype != DoseType.descriptive) {
      if (!this.requestedNoOfDays || this.requestedNoOfDays <= 0) {
        if(this.supplyRequestStatus != SupplyRequestStatus.Rejected) {
          this.validationMessage = 'Please enter valid quantity/days';
          return;
        }
      }
    }
    if (typeof this.requestedQuantity === 'undefined' || +this.requestedQuantity <= 0 || +this.requestedQuantity > 999999999999) {
      if(this.supplyRequestStatus != SupplyRequestStatus.Rejected) {
        this.validationMessage = 'Please enter valid quantity/days';
        return;
      }
    }

    if (this.requestedQuantity && this.requestedQuantity.toString().indexOf('.') > -1) {
      if (this.requestedQuantity.toString().split('.')[1].length > 2) {
        this.validationMessage = 'Quantity should be of format nn.nn.';
        return;
      }
    }
    if (this.supplyRequestStatus == this.supplyReqStatus.Fulfilled) {
      if (moment(this.supplyrequest.fulfilledon).format("YYYYMMDD") > moment(new Date()).format("YYYYMMDD")) {
        this.validationMessage = 'Date fulfilled should be on/before today.';
        return;
      }
      ////// Romoved for issiue EPMA-2794
      // if (moment(this.supplyrequest.fulfilledon).format("YYYYMMDD") < moment(this.requestedOn).format("YYYYMMDD")) {
      //   this.validationMessage = `Date fulfilled should not be earlier than ${moment(this.requestedOn).format('DD-MMM-YYYY')}.`;
      //   return;
      // }
    }
    if (this.validationMessage == '' && this.quantityMessage == '') {
      this.isSaving = true;

      if (!this.supplyRequestId) {
        isnnewRequest = true;
        this.supplyrequest.epma_supplyrequest_id = uuid();
        this.supplyrequest.lastmodifiedby = this.appService.loggedInUserName;
        this.supplyrequest.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.supplyrequest.requestedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.supplyrequest.requestedby = this.appService.loggedInUserName;
      } else {
        this.supplyrequest.epma_supplyrequest_id = this.supplyRequestId;
        this.supplyrequest.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.supplyrequest.lastmodifiedby = this.appService.loggedInUserName;
        this.supplyrequest.requestedon = this.requestedOn;
        this.supplyrequest.requestedby = this.requestedBy;
      }
      if (this.supplyRequestStatus == this.supplyReqStatus.Incomplete) {
        this.supplyrequest.requeststatus = this.supplyReqStatus.Pending;
      } else {
        this.supplyrequest.requeststatus = this.supplyRequestStatus;
      }
      if(this.componenttype!="OP" && this.supplyRequestStatus != this.supplyReqStatus.Rejected) {
        this.supplyrequest.comment = "";
      }
      this.supplyrequest.prescription_id = this.prescriptionId;
      this.supplyrequest.medication_id = this.medicationCode;
      this.supplyrequest.selectedproductcode = this.searchCode;
      this.supplyrequest.selectproductcodetype = this.productType;
      this.supplyrequest.selectedproductname = this.productName;

      this.supplyrequest.requestednoofdays = this.requestedNoOfDays;
      this.supplyrequest.requestquantity = this.requestedQuantity?.toString();
      this.supplyrequest.requestedquantityunits = this.doseUnit;
      this.supplyrequest.isformulary = !this.nonFormularyRequest;
      this.supplyrequest.personid = this.appService.personId;
      this.supplyrequest.encounterid = this.encounterId;
      // change object to post data
      let data = Object.assign({}, this.supplyrequest);
      let route = JSON.stringify(this.supplyrequest.route);
      let indication = JSON.stringify(this.supplyrequest.indication);
      data.route = route;
      data.indication = indication;
      if(this.supplyrequest.daterequired) {
        data.daterequired = this.appService.getDateTimeinISOFormat(this.supplyrequest.daterequired);
      }
      if (this.supplyRequestStatus == SupplyRequestStatus.Fulfilled) {
        data.fulfilledon = this.appService.getDateTimeinISOFormat(this.supplyrequest.fulfilledon);
      }
      if (this.supplyRequestStatus != SupplyRequestStatus.Fulfilled) {
        data.fulfilledon = null;
      }
      console.log(JSON.stringify(data));
      // save to database
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
      if (data) {
        upsertManager.addEntity('local', "epma_supplyrequest", JSON.parse(JSON.stringify(data)));
        upsertManager.addEntity('local', 'epma_supplyrequestmedications', { "epma_supplyrequest_id": data.epma_supplyrequest_id }, "del");
        this.supplyRequestMedications.forEach(m => {
          m.epma_supplyrequest_id = data.epma_supplyrequest_id;
          upsertManager.addEntity('local', 'epma_supplyrequestmedications', JSON.parse(JSON.stringify(m)));
        });
      }
      upsertManager.save((resp) => {
        this.appService.UpdateDataVersionNumber(resp);
        this.supplyRequestStatusList = [];
        this.supplyRequestStatusList.push({ name : this.supplyReqStatus.Pending, value : this.supplyReqStatus.Pending});
     
        this.informationMessage = 'Supply request is saved.';
        this.isSaving = false;
        if (isnnewRequest && !this.supplyrequest.isformulary) {
          let result: any[] = [];
          this.supplyRequestMedications.forEach(elm => result.push(elm.productname));
          const productNameList = result;
          this.dr.SendEmailForNonFormularyRequest(productNameList, this.supplyrequest.requestquantity, this.supplyrequest.daterequired);
        }
        this.dr.getSupplyRequest(() => {
          this.subjects.refreshTemplate.next();
          this.subjects.closeAppComponentPopover.next();
        });
        upsertManager.destroy();
        this.appService.logToConsole(resp);
      },
        (error) => {
          this.appService.logToConsole(error);
          upsertManager.destroy();
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        }, false
      );
    }
  }
  GetMedicationSupplyHistory() {
    this.dr.GetMedicationSupplyHistory(this.patientDrug.prescriptionid, (data) => {
      
    });
  }
  GetComplienceAid(id) {
    if (id) {
      return this.appService.MetaComplianceAid.find(x => x.complianceaid_id == id).complianceaid_name;
    } else {
      return "";
    }
  }
  onCancel(): void {
    this.isSaving = false;
    //this.showSupplyRequestPopup = false;
    this.subjects.closeAppComponentPopover.next();
  }
  NewPatientDrug() {
    this.subjects.patientDrug.next({ prescription: this.prescription });
  }
  alphaNumberOnly(e) {  // Accept only alpha numerics, not special characters 
    var regex = new RegExp("^[a-zA-Z0-9 .]+$");
    var str = String.fromCharCode(!e.charCode ? e.which : e.charCode);
    if (regex.test(str)) {
      return true;
    }

    e.preventDefault();
    return false;
  }
  openConfirmModal(template: TemplateRef<any>) {
    this.confirmModalRef = this.modalService.show(template, {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-sm modal-dialog-centered'
    });
  }
  confirm(): void {
    this.confirmModalRef.hide();
    this.copyRequest();
  }
  decline(): void {
    this.confirmModalRef.hide();
  }

  copyRequest(): void {


    this.supplyRequestId = '';
    this.supplyRequestStatus = this.supplyReqStatus.Incomplete
    this.originalSupplyStatus = this.supplyReqStatus.Incomplete;
    this.supplyRequestStatusList = [];
    this.supplyRequestStatusList.push({name : this.supplyRequestStatus , value : this.supplyRequestStatus});
    this.supplyrequest.daterequired = moment().toDate();
    this.supplyrequest.fulfilledon = null;
    this.supplyrequest.ordermessage = "";
    this.supplyRequestChanges = [];
    this.supplyRequestHistory = [];
    this.isRequestApproved = false;
    this.isRequestFulfilled = false;
    this.isRequestRejected = false;
    this.isRequestPending = false;
    this.isEditable = false;


  }

  closePopup() {
    this.subjects.closeAppComponentPopover.next();
  }
  daysChange(event): void {

    let doseArray = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(dos => dos.prescription_id == this.prescriptionId);
    this.totalDose = 0;
    if (this.isInfusion || this.productType == 'VTM' || this.appService.GetCurrentPosology(this.prescription).frequency == 'protocol' || this.appService.GetCurrentPosology(this.prescription).dosetype == DoseType.descriptive) {
      this.doseUnit = "Product packs";
    } else {
      for (let dose of doseArray) {
        if (dose.dosesize && dose.doseunit) {
          this.totalDose += +dose.dosesize;
          this.doseUnit = dose.doseunit;
        } else if (dose.strengthdenominator) {
          this.totalDose += +dose.strengthdenominator;
          this.doseUnit = dose.strengthdenominatorunit;
        } else {
          this.doseUnit = "Product packs";
        }
      }
    }
    this.quantityMessage = '';
    this.requestedQuantity = (this.totalDose * event.target.value).toFixed(2).replace(/\.00$/, '');
    let noOfDays = this.appService.appConfig.AppSettings.maxNoDaysForSupplyRequest;
    if (!this.isInfusion && this.productType != 'VTM' && this.appService.GetCurrentPosology(this.prescription).frequency != 'protocol' && this.appService.GetCurrentPosology(this.prescription).dosetype != DoseType.descriptive) {
      if (this.requestedNoOfDays > noOfDays) {
        this.requestedNoOfDays = undefined;
        this.quantityMessage = "The number of days is restricted to a value between 1 and " + noOfDays + ". Please enter a valid value";
      } else if (this.requestedNoOfDays < 1) {
        if(this.supplyRequestStatus != SupplyRequestStatus.Rejected) {
         this.quantityMessage = "Field should not accept value less than 1";
        }
      }
    }
  }

  quantityChange(event): void {
    let doseArray = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(dos => dos.prescription_id == this.prescriptionId);
    this.totalDose = 0;
    if (this.isInfusion || this.productType == 'VTM' || this.appService.GetCurrentPosology(this.prescription).frequency == 'protocol' || this.appService.GetCurrentPosology(this.prescription).dosetype == DoseType.descriptive) {
      this.doseUnit = "Product packs";
    } else {
      for (let dose of doseArray) {
        if (dose.dosesize) {
          this.totalDose += +dose.dosesize;
          this.doseUnit = dose.doseunit;
        } else if (dose.strengthdenominator) {
          this.totalDose += +dose.strengthdenominator;
          this.doseUnit = dose.strengthdenominatorunit;
        } else {
          this.doseUnit = "Product packs";
        }
      }
    }

    if (!isNaN(+this.requestedQuantity) && +this.requestedQuantity > 0 && this.totalDose > 0)
      this.requestedNoOfDays = +(event.target.value / this.totalDose).toFixed(1);
    else
      this.requestedNoOfDays = undefined;
    this.quantityMessage = '';
    let noOfDays = this.appService.appConfig.AppSettings.maxNoDaysForSupplyRequest;
    if (!this.isInfusion && this.productType != 'VTM' && this.appService.GetCurrentPosology(this.prescription).frequency != 'protocol' && this.appService.GetCurrentPosology(this.prescription).dosetype != DoseType.descriptive) {
      if (this.requestedNoOfDays > noOfDays) {
        this.requestedNoOfDays = undefined;
        this.quantityMessage = "The entered quantity would result in a supply request for more than " + noOfDays + " days. Please reduce the required quantity";
      } else if (+this.requestedQuantity < 1) {
        if(this.supplyRequestStatus != SupplyRequestStatus.Rejected) {
         this.quantityMessage = "Field should not accept value less than 1";
        }
      }
    }

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
    pm.filterparams.push(new filterparam("prescriptionid", this.prescriptionId));
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

  private MedicationHasFlag(flag, m?: any) {
    return this.appService.MedicationHasFlag(flag, m);
  }

}

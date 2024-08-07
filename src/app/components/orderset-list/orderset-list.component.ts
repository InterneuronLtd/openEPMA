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
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { AdministerMedication, Dose, DoseEvents, Epma_Medsonadmission, Medication, Medicationcodes, Medicationingredients, Posology, Prescription, Prescriptionroutes } from '../../models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { OrderSetList } from '../../models/ordersetlist.model';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { FormContext, PrescriptionContext, PrescriptionStatus, RoleAction } from 'src/app/services/enum';
import * as moment from 'moment';
import { FormSettings, Route } from '../prescribing-form/formhelper';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import { SearchMedicationComponent } from '../search-medication/search-medication.component';

@Component({
  selector: 'app-orderset-list',
  templateUrl: './orderset-list.component.html',
  styleUrls: ['./orderset-list.component.css'],
})
export class OrdersetListComponent implements OnInit, OnDestroy {
  ownerId: string;
  patientId: string; //= 'd91ef1fa-e9c0-45ba-9e92-1e1c4fd468a2';
  @Input('prescriptionid') prescriptionId: string;
  @Input() context: FormContext;

  @Output() onEditPrescription = new EventEmitter<object>();
  @Output() onAddToTherapy = new EventEmitter<object>();

  @ViewChild('openToEditPrescription') openToEditPrescription: ElementRef;

  modalRef: BsModalRef;
  config = {
    backdrop: true,
    ignoreBackdropClick: false,
    class: 'modal-dialog-centered'
  };

  organizationalOrderSetsId = 'b1c5bc96-3655-4a44-a64f-49b515b0dd0a';
  myOrderSetsId = 'cf9fb4a0-b355-4197-943e-e5f6e7b241b2';
  patientOrderSetsId = 'a9cd4eaf-38c8-4106-8310-d1bbfde252e0';
  orderSetGroupsId = '2e2a88f6-16ef-45ea-8c68-e3abe7ccced8';

  showOrganizationalOrderSets: boolean = false;
  showMyOrderSets: boolean = false;
  showPatientOrderSet: boolean = false;
  showOrderSetGroups: boolean = false;

  displayOrgOS: boolean = false
  displayMyOS: boolean = false
  displayPatientOS: boolean = false
  displayPOAOS: boolean = false
  displayMOAOS: boolean = false
  displayMODOS: boolean = false
  displayCMOS: boolean = false
  displaySTOS: boolean = false
  displayGPC: boolean = false
  nullprescription: Prescription = null;

  organizationalOrderSetsPrescriptions = [];
  myOrderSetsPrescriptions = [];
  patientOrderSetsPrescriptions = [];
  orderSetGroupsPrescriptions = [];

  MOAPrescriptions = [];
  MODPrescriptions = [];
  CurrentInpatientPrescriptions = [];
  POAPrescriptions = [];
  StoppedMOAPrescriptions = [];
  GPConnectPrescriptions = [];

  prescriptionList: Prescription[] = new Array<Prescription>();
  contextualprescriptionList: Prescription[] = new Array<Prescription>();

  prescriptionRoutesList: Prescriptionroutes[] = new Array<Prescriptionroutes>();
  posologyList: Posology[] = new Array<Posology>();
  doseList: Dose[] = new Array<Dose>();
  doseEventsList: DoseEvents[] = new Array<DoseEvents>();
  medicationList: Medication[] = new Array<Medication>();
  medicationingredientsList: Medicationingredients[] = new Array<Medicationingredients>();
  medicationcodesList: Medicationcodes[] = new Array<Medicationcodes>();

  tablet = 'tablet';
  capsule = 'capsule';
  injection = 'Injection';
  continuousInfusion = 'ContinuousInfusion';
  basicFluids = 'BasicFluids';
  inhalation = 'Inhalation';
  bloodProduct = 'BloodProduct';

  definedCriteria: string = '';

  subscriptions: Subscription = new Subscription();

  isDataLoaded: boolean = false;
  showMOAOrderSet: boolean = false;
  showMODOrderSet: boolean = false;
  showPOAOrderSet: boolean = false;
  showCMOrderSet: boolean = false;
  showSTOrderSet: boolean = false;
  showGPConnectOrderSet: boolean = false;
  allowView: boolean = false;
  showaddtoorderset = false;
  orderset_id = "";
  showNotespopup = false;
  arrreconcilation: any[] = [];
  latestNotes: string = "";
  gpconnectheading: string = "GP Connect";
  constructor(
    private apiRequest: ApirequestService,
    public appService: AppService,
    private modalService: BsModalService,
    private dr: DataRequest,
    private subjects: SubjectsService
  ) { }

  ngOnDestroy(): void {
    if (this.context != FormContext.mod && this.context != FormContext.op) {
      this.appService.currentBasket = [];
    }
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
    if (this.context != FormContext.moa && this.context != FormContext.mod && this.context != FormContext.op) {
      this.appService.currentBasket = [];
    }

    if (this.appService.AuthoriseAction(RoleAction.epma_view_ordersetlists) ||
      this.appService.AuthoriseAction(RoleAction.epma_create_org_orderset) ||
      this.appService.AuthoriseAction(RoleAction.epma_edit_org_orderset) ||
      this.appService.AuthoriseAction(RoleAction.epma_delete_org_orderset)
    ) {
      this.allowView = true;
      this.ownerId = this.appService.loggedInUserName;
      this.patientId = this.appService.personId;
      this.getOrderSets();

      this.GetContextualOrdersets();
    }
  }

  getOrderSets(): void {

    this.organizationalOrderSetsPrescriptions = [];
    this.myOrderSetsPrescriptions = [];
    this.patientOrderSetsPrescriptions = [];
    this.orderSetGroupsPrescriptions = [];
    this.isDataLoaded = false;

    this.ConstructPrescriptionObject((prescriptionList: Prescription[]) => {

      this.subscriptions.add(
        //get ordersets
        this.apiRequest
          .getRequest(
            this.appService.baseURI + '/GetBaseViewList/epma_ordersetprescription'
          )
          .subscribe((preOrderSetResponse) => {
            let presecriptionOrderSets = [];
            presecriptionOrderSets = JSON.parse(preOrderSetResponse);
            //get all prescription ids for each orderset
            this.subscriptions.add(
              this.apiRequest
                .getRequest(
                  this.appService.baseURI + '/GetList?synapsenamespace=local&synapseentityname=epma_ordersetprescription'
                )
                .subscribe((orderSetPrescriptionResponse) => {
                  let orderSetPrescriptionIds = JSON.parse(orderSetPrescriptionResponse);
                  //this.appService.logToConsole(orderSetPrescriptions);

                  if (this.appService.AuthoriseAction("epma_create_org_orderset")) {

                  }
                  else {

                    for (let r of presecriptionOrderSets) {
                      let removeorderset = true;
                      let selectedgroups = JSON.parse(r.groupsauthorizedtoview)

                      for (let group of (selectedgroups ?? [])) {
                        if (this.appService.loggedInUserRoles.includes(group.groupname)) {
                          removeorderset = false;
                        }
                      }
                      if (removeorderset) {
                        if (this.organizationalOrderSetsId == r.prescriptionordersettype_id) {
                          presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                        }
                      }

                    }


                    for (let r of presecriptionOrderSets) {
                      if (r.criteria) {
                        if (r.criteria == 'Age in years') {
                          if (!(Math.floor(this.appService.personAgeInDays / 365) >= r.inclusive_value && Math.floor(this.appService.personAgeInDays / 365) <= r.exclusive_value)) {
                            presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                          }
                        }
                        else if (r.criteria == 'Age in months') {
                          if (!(Math.floor(this.appService.personAgeInDays / 30) >= r.inclusive_value && Math.floor(this.appService.personAgeInDays / 30) <= r.exclusive_value)) {
                            presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                          }
                        }
                        else if (r.criteria == 'Weight') {
                          if (!(this.appService.refWeightValue >= r.inclusive_value && this.appService.refWeightValue <= r.exclusive_value)) {
                            presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                          }
                        }
                        else if (r.criteria == 'Body Surface') {
                          if (!(this.appService.bodySurfaceArea >= r.inclusive_value && this.appService.bodySurfaceArea <= r.exclusive_value)) {
                            presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                          }
                        }
                        else {
                          if ((r.inclusive_value == 'undefined' && r.exclusive_value == 'undefined')) {
                            presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                          }
                        }
                      }
                      else {
                        let criteria_Arr = []
                        if (r.criteriajson) {
                          criteria_Arr = JSON.parse(r.criteriajson)
                        }
                        for (let c of criteria_Arr) {
                          if (c.criteria == 'Age in years') {
                            if (!(Math.floor(this.appService.personAgeInDays / 365) >= c.min && Math.floor(this.appService.personAgeInDays / 365) <= c.max)) {
                              presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                            }
                          }
                          else if (c.criteria == 'Age in months') {
                            if (!(Math.floor(this.appService.personAgeInDays / 30) >= c.min && Math.floor(this.appService.personAgeInDays / 30) <= c.max)) {
                              presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                            }
                          }
                          else if (c.criteria == 'Weight') {
                            if (!(this.appService.refWeightValue >= c.min && this.appService.refWeightValue <= c.max)) {
                              presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                            }
                          }
                          else if (c.criteria == 'Body Surface') {
                            if (!(this.appService.bodySurfaceArea >= c.min && this.appService.bodySurfaceArea <= c.max)) {
                              presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                            }
                          }
                          else {
                            if ((c.min == 'undefined' && c.max == 'undefined')) {
                              presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                            }
                          }
                        }
                      }
                    }
                  }
                  //iterate each orderset
                  for (let preOrd of presecriptionOrderSets) {

                    // get all prescription objects in this orderset
                    let prescriptionsIdsInOrderset = orderSetPrescriptionIds.filter(o => o.ordersetid == preOrd.prescriptionorderset_id);
                    let orderSetPrescriptions: Prescription[] = [];

                    if (prescriptionList && prescriptionList.length > 0) {
                      for (let id of prescriptionsIdsInOrderset) {

                        let prescriptionsInOrderset: Prescription[] = prescriptionList.filter(p => p.prescription_id == id.prescription_id);

                        for (let p of prescriptionsInOrderset) {
                          orderSetPrescriptions.push(p);
                        }

                      }
                    }

                    let orderSetList: OrderSetList = {
                      prescriptionorderset_id: preOrd.prescriptionorderset_id,
                      orderSetName: preOrd.ordersetname,
                      defined_criteria: preOrd.defined_criteria,
                      showPrescriptions: false,
                      prescriptions: orderSetPrescriptions,
                      visible: true,
                      notes: null
                    };

                    switch (preOrd.prescriptionordersettype_id) {
                      case this.organizationalOrderSetsId:
                        this.organizationalOrderSetsPrescriptions.push(
                          orderSetList
                        );
                        break;
                      case this.myOrderSetsId:
                        if (preOrd.owner == this.ownerId) {
                          this.myOrderSetsPrescriptions.push(orderSetList);
                        }
                        break;
                      case this.patientOrderSetsId:
                        if (preOrd.person_id == this.patientId) {
                          this.patientOrderSetsPrescriptions.push(orderSetList);
                        }
                        break;
                      case this.orderSetGroupsId:
                        this.orderSetGroupsPrescriptions.push(orderSetList);
                        break;
                    }
                  }
                  this.isDataLoaded = true;
                }
                )
            )
          }
          )
      )
      // console.log('organizationalOrderSetsPrescriptions',this.organizationalOrderSetsPrescriptions);
      // console.log('myOrderSetsPrescriptions',this.myOrderSetsPrescriptions);
      // console.log('patientOrderSetsPrescriptions',this.patientOrderSetsPrescriptions);
    }
    );
  }

  GetCurrentContextId() {
    if (this.context == FormContext.moa) {
      return this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id;
    }
    else
      if (this.context == FormContext.mod) {
        return this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Discharge).prescriptioncontext_id;
      }
      else if (this.context == FormContext.op) {
        return this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Outpatient).prescriptioncontext_id;
      }
      else
        if (this.context == FormContext.ip) {
          return this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Inpatient).prescriptioncontext_id;
        }
  }

  AddMedicationClass(prescription: Prescription) {
    let currentcontextid = this.GetCurrentContextId();

    let formularycode = prescription.__medications.find(x => x.isprimary).__codes.find(y => y.terminology == "formulary").code;
    // let codeobject = this.appService.Prescription.filter(x => x.prescription_id != prescription.prescription_id && x.prescriptioncontext_id == currentcontextid &&
    //   (x.__medications.find(y => y.isprimary == true).__codes.filter(z => z.terminology == "formulary" && z.code == formularycode).length != 0))
    // if (codeobject.length > 0) {
    //   //return "medicationexist";
    //   "";
    // }
    // else {
    let exitinbasket = this.appService.currentBasket.filter(x =>
      (x.__medications.find(y => y.isprimary == true).__codes.filter(z => z.terminology == "formulary" && z.code == formularycode).length != 0))
    if (exitinbasket.length > 0) {
      return "medicationadded";
    }
    else {
      return ""
    }

    // }
  }
  FilterOrderSets(ordersetlist: Array<OrderSetList>, searchterm) {
    for (let os of ordersetlist) {
      let osnamematch = false;
      if (os.orderSetName?.toLowerCase().indexOf(searchterm.toLowerCase()) != -1 || FormSettings.IsNullOrEmpty(searchterm.toLowerCase())) {
        os.visible = true;
        osnamematch = true;
      }
      else {
        os.visible = false;
      }
      for (let pres of os.prescriptions) {
        if (osnamematch == true || pres.__medications.find(m => m.name.toLowerCase().indexOf(searchterm.toLowerCase()) != -1) || FormSettings.IsNullOrEmpty(searchterm.toLowerCase())) {
          os.visible = true;
          // pres.visible = true; // prescriptions should not hide
        }
        else {
          //pres.visible = false;// prescriptions should not hide
        }
      }
    }
  }

  toggleHeader(orderSetType: String): void {

    switch (orderSetType) {
      case 'O':
        this.showOrganizationalOrderSets = !this.showOrganizationalOrderSets;
        break;
      case 'M':
        this.showMyOrderSets = !this.showMyOrderSets;
        break;
      case 'P':
        this.showPatientOrderSet = !this.showPatientOrderSet;
        break;
      case 'G':
        this.showOrderSetGroups = !this.showOrderSetGroups;
        break;
      case 'MOA':
        this.showMOAOrderSet = !this.showMOAOrderSet;
        break;
      case 'MOD':
        this.showMODOrderSet = !this.showMODOrderSet;
        break;
      case 'POA':
        this.showPOAOrderSet = !this.showPOAOrderSet;
        break;
      case 'CM':
        this.showCMOrderSet = !this.showCMOrderSet;
        break;
      case 'ST':
        this.showSTOrderSet = !this.showSTOrderSet;
        break;
      case 'GPC':
        this.showGPConnectOrderSet = !this.showGPConnectOrderSet;
        break;
    }

  }

  toggleChild(node) {
    node.showPrescriptions = !node.showPrescriptions;
  }

  openModal(template: TemplateRef<any>, defined_criteria: string) {
    this.definedCriteria = defined_criteria;
    this.modalRef = this.modalService.show(template, this.config);
  }

  addPrescriptionsToTherapy(prescriptions: Prescription[]) {
    this.onAddToTherapy.emit(prescriptions)
  }

  addPrescriptionToTherapy(prescription: Prescription) {
    let preList: Prescription[] = [];

    preList.push(prescription);
    this.onAddToTherapy.emit(preList);
  }

  addToTherapyList(
    orderSetType: string,
    itemId: string,
    itemType: string
  ): void {
    let prescriptionIds = [];

    if (itemType == 'P' && itemId) {
      prescriptionIds.push(itemId);
    } else {
      switch (orderSetType) {
        case 'O':
          for (let ordSet of this.organizationalOrderSetsPrescriptions.filter(o => o.prescriptionorderset_id == itemId)) {
            for (let pres of ordSet.prescriptions) {
              prescriptionIds.push(pres.prescription_id);
            }
          }
          break;
        case 'M':
          for (let ordSet of this.myOrderSetsPrescriptions.filter(o => o.prescriptionorderset_id == itemId)) {
            for (let pres of ordSet.prescriptions) {
              prescriptionIds.push(pres.prescription_id);
            }
          }
          break;
        case 'P':
          for (let ordSet of this.patientOrderSetsPrescriptions.filter(o => o.prescriptionorderset_id == itemId)) {
            for (let pres of ordSet.prescriptions) {
              prescriptionIds.push(pres.prescription_id);
            }
          }
          break;
        case 'G':
          for (let ordSet of this.orderSetGroupsPrescriptions.filter(o => o.prescriptionorderset_id == itemId)) {
            for (let pres of ordSet.prescriptions) {
              prescriptionIds.push(pres.prescription_id);
            }
          }
          break;
      }
    }

    /*if (prescriptionIds.length > 0) {
      this.ConstructPrescriptionObject(prescriptionIds);
    }*/
  }

  editPrescription(prescription: Prescription): void {
    this.appService.logToConsole(prescription);
    this.onEditPrescription.emit(prescription);
    //this.openToEditPrescription.nativeElement.click();
  }
  OnOrderSetCancelled() {
    this.showaddtoorderset = false;

  }

  OnOrderSetComplete() {
    this.showaddtoorderset = false;
    this.getOrderSets();
  }

  OnOrderSetFailed(e) {
    this.showaddtoorderset = false;
  }
  editOrderSet(orderset_id: string, orderSetType: String) {

    this.orderset_id = orderset_id;
    this.showaddtoorderset = true;
  }

  deleteOrderSet(orderset_id: string, orderSetType: String): void {

    //let attributevalue = orderset_id;

    let confirm = window.confirm("Are you sure you want to delete this Order set?");
    if (confirm) {
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

      this.subscriptions.add(
        this.apiRequest
          .getRequest(
            this.appService.baseURI +
            '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_ordersetprescription' +
            '&synapseattributename=ordersetid&&attributevalue=' + orderset_id
          )
          .subscribe((response) => {
            let ordersetPrescriptionList = JSON.parse(response);

            ordersetPrescriptionList.forEach(e => {
              upsertManager.addEntity('local', 'epma_ordersetprescription', e.epma_ordersetprescription_id, 'del');
            });

            upsertManager.addEntity('local', 'epma_orderset', orderset_id, 'del');

            upsertManager.save((resp) => {
              this.appService.UpdateDataVersionNumber(resp);

              upsertManager.destroy();
            },
              (error) => {
                this.appService.logToConsole(error);
                upsertManager.destroy();

                if (this.appService.IsDataVersionStaleError(error)) {
                  this.appService.RefreshPageWithStaleError(error);
                }
              }
            )
            this.toggleHeader(orderSetType);
            this.getOrderSets();
          }
          )
      )


      /*this.subscriptions.add(
        this.apiRequest
          .deleteRequest(
            this.appService.baseURI +
              '/DeleteObjectByAttribute?synapsenamespace=local&synapseentityname=epma_ordersetprescription&synapseattributename=' +
              'ordersetid' +
              '&attributevalue=' +
              attributevalue
          )
          .subscribe((response) => {
            this.subscriptions.add(
              this.apiRequest
                .deleteRequest(
                  this.appService.baseURI +
                    '/DeleteObjectByAttribute?synapsenamespace=local&synapseentityname=epma_orderset&synapseattributename=' +
                    'epma_orderset_id' +
                    '&attributevalue=' +
                    attributevalue
                )
                .subscribe((response) => {
                  this.getOrderSets();
                })
            );
          })
      );*/
    }
  }

  deletePrescriptionFromOrderSet(prescriptionorderset_id: string, prescription_id: string) {

    let confirm = window.confirm("Are you sure you want to remove this prescription from the orderset?");

    if (confirm) {
      this.subscriptions.add(
        this.apiRequest
          .getRequest(
            this.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_ordersetprescription&synapseattributename=ordersetid' +
            '&attributevalue=' + prescriptionorderset_id
          )
          .subscribe((response) => {
            let responseArray = JSON.parse(response);
            let presId = responseArray.filter(o => o.prescription_id == prescription_id)[0];
            this.subscriptions.add(
              this.apiRequest
                .deleteRequest(
                  this.appService.baseURI +
                  '/DeleteObject?synapsenamespace=local&synapseentityname=epma_ordersetprescription&id=' +
                  presId.epma_ordersetprescription_id
                )
                .subscribe((response) => {
                  this.getOrderSets();
                }
                )
            );
          }
          )
      );
    }
  }

  private ConstructPrescriptionObject(completion: any) {

    this.prescriptionList = [];
    this.prescriptionRoutesList = [];
    this.posologyList = [];
    this.doseList = [];
    this.doseEventsList = [];
    this.medicationList = [];
    this.medicationingredientsList = [];
    this.medicationcodesList = [];

    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI + '/GetListByAttribute?synapsenamespace=core&synapseentityname=prescription&synapseattributename=' +
          'prescriptioncontext_id&attributevalue=3d5ff660-ccfc-43c5-bada-52d15b866d77'
        )
        .subscribe((prescriptionResponse) => {
          let prescriptionArray = JSON.parse(prescriptionResponse);
          let prescriptionIDs: string = '';

          for (let pres of prescriptionArray) {
            this.prescriptionList.push(<Prescription>pres);
            prescriptionIDs += `'${pres.prescription_id}',`
          }

          if (this.prescriptionList.length == 0) {
            if (completion) {
              completion([]);
            }
            return;
          }

          prescriptionIDs = prescriptionIDs.substring(0, prescriptionIDs.length - 1);

          this.subscriptions.add(
            this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_prescriptionroutes", this.createPrescriptionFilter(prescriptionIDs))
              .subscribe((routesResponse) => {
                let routesArray = (routesResponse);
                for (let route of routesArray) {
                  this.prescriptionRoutesList.push(<Prescriptionroutes>route);
                }

                this.subscriptions.add(
                  this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=posology", this.createPrescriptionFilter(prescriptionIDs))
                    .subscribe((posologyResponse) => {
                      let posologyArray: Posology[] = (posologyResponse);
                      let posologyIds: string = '';

                      for (let poslgy of posologyArray) {
                        this.posologyList.push(<Posology>poslgy);
                        posologyIds += `'${poslgy.posology_id}',`
                      }

                      posologyIds = posologyIds.substring(0, posologyIds.length - 1);

                      this.subscriptions.add(
                        this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=dose", this.createPrescriptionFilter(prescriptionIDs))
                          .subscribe((doseResponse) => {
                            let doseArray: Dose[] = doseResponse;

                            this.subscriptions.add(
                              this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=doseevents", this.createPosologyFilter(posologyIds))
                                .subscribe((doseEventsResponse) => {
                                  let doseEventsArray: DoseEvents[] = doseEventsResponse;

                                  for (let dos of doseArray) {
                                    dos.__doseEvent = doseEventsArray.filter(e => e.dose_id == dos.dose_id);
                                  }

                                  for (let posl of this.posologyList) {
                                    posl.__dose = doseArray.filter(d => d.posology_id == posl.posology_id);
                                  }
                                }
                                )
                            )
                          }
                          )
                      )

                      this.subscriptions.add(
                        this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=medication", this.createPrescriptionFilter(prescriptionIDs))
                          .subscribe((medicationResponse) => {
                            let medicationArray = (medicationResponse);
                            let medicationIds: string = '';

                            for (let medic of medicationArray) {
                              this.medicationList.push(<Medication>medic);
                              medicationIds += `'${medic.medication_id}',`
                            }

                            medicationIds = medicationIds.substring(0, medicationIds.length - 1);

                            this.subscriptions.add(
                              this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=medicationingredients", this.createMedicationFilter(medicationIds))
                                .subscribe((medIngResponse) => {
                                  let medIngArray = (medIngResponse);

                                  this.subscriptions.add(
                                    this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost?synapsenamespace=core&synapseentityname=medicationcodes", this.createMedicationFilter(medicationIds))
                                      .subscribe((medCodeResponse) => {
                                        let medCodeArray = (medCodeResponse);

                                        for (let medi of this.medicationList) {
                                          medi.__ingredients = medIngArray.filter(i => i.medication_id == medi.medication_id);
                                          medi.__codes = medCodeArray.filter(i => i.medication_id == medi.medication_id);
                                        }
                                      }
                                      )
                                  )
                                }
                                )
                            )

                            for (let pres of this.prescriptionList) {
                              pres.__routes = this.prescriptionRoutesList.filter(p => p.prescription_id == pres.prescription_id);
                              pres.__posology = this.posologyList.filter(p => p.prescription_id == pres.prescription_id);
                              pres.__medications = this.medicationList.filter(p => p.prescription_id == pres.prescription_id);
                            }

                            //Final Prescription list object
                            if (completion) {
                              completion(this.prescriptionList);
                            }
                          }
                          )
                      );

                    }
                    )
                );

              }
              )
          );
        }
        )
    )
  }

  GetContextualOrdersets() {
    if (this.context == FormContext.moa) {
      this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);
      this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);

      this.getPOAPrescriptions(this.GetPOAcallback);

      if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts && Array.isArray(this.appService.appConfig.AppSettings.gpConnectListDisplayContexts)) {
        if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts.find(x => x == PrescriptionContext.Admission)) {
          this.getGPConnectPrescriptions();
          this.displayGPC = true
        }
      }
      this.displayOrgOS = true;
      this.displayMyOS = true;
      this.displayPOAOS = true;
      this.displayMODOS = true;
      this.displayMOAOS = true;
      this.displayCMOS = false;
      this.displaySTOS = false;
      this.displayPatientOS = true;
    } else
      if (this.context == FormContext.mod) {
        this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
        this.getAllInpatientPrescriptions();
        this.getPOAPrescriptions(this.GetPOAcallback);

        if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts && Array.isArray(this.appService.appConfig.AppSettings.gpConnectListDisplayContexts)) {
          if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts.find(x => x == PrescriptionContext.Discharge)) {
            this.getGPConnectPrescriptions();
            this.displayGPC = true
          }
        }

        this.displayOrgOS = true;
        this.displayMyOS = true;
        this.displayPOAOS = true;
        this.displayMODOS = false;
        this.displayMOAOS = true;
        this.displayCMOS = true;
        this.displaySTOS = true;
        this.displayPatientOS = true;

      } else
        if (this.context == FormContext.ip) {
          this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
          this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);

          if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts && Array.isArray(this.appService.appConfig.AppSettings.gpConnectListDisplayContexts)) {
            if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts.find(x => x == PrescriptionContext.Inpatient)) {
              this.getGPConnectPrescriptions();
              this.displayGPC = true
            }
          }

          this.displayOrgOS = true;
          this.displayMyOS = true;
          this.displayPOAOS = false;
          this.displayMODOS = true;
          this.displayMOAOS = true;
          this.displayCMOS = false;
          this.displaySTOS = true;
          this.displayPatientOS = true;

        } else
          if (this.context == FormContext.op) {
            this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);

            this.getPOAPrescriptions(this.GetPOAcallback);
            this.GetCurrentInpatientPrescriptionsForOP();

            if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts && Array.isArray(this.appService.appConfig.AppSettings.gpConnectListDisplayContexts)) {
              if (this.appService.appConfig.AppSettings.gpConnectListDisplayContexts.find(x => x == PrescriptionContext.Outpatient)) {
                this.getGPConnectPrescriptions();
                this.displayGPC = true
              }
            }

            this.displayOrgOS = true;
            this.displayMyOS = true;
            this.displayPOAOS = true;
            this.displayMODOS = true;
            this.displayMOAOS = false;
            this.displayCMOS = true;
            this.displaySTOS = false;
            this.displayPatientOS = true;

          }


    // this.getPOAPrescriptions(this.GetPOAcallback);
    // this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
    // this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);
    // this.getAllInpatientPrescriptions();

  }

  getAllInpatientPrescriptions() {
    let orderSetPrescriptions: Prescription[] = [];
    let stoppedid = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.stopped.toLowerCase()).prescriptionstatus_id;
    let cancelledid = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.cancelled.toLowerCase()).prescriptionstatus_id;

    for (let p of this.appService.Prescription.filter(x => x.prescriptionstatus_id != stoppedid && x.prescriptionstatus_id != cancelledid && x.__completed != true && x.prescriptioncontext_id == (this.appService.MetaPrescriptioncontext.find(c => c.context.toLowerCase() == "inpatient").prescriptioncontext_id))) {

      orderSetPrescriptions.push(this.ClonePrescription(p, true));
    }
    let orderSetList: OrderSetList = {
      prescriptionorderset_id: "",
      orderSetName: "Current Medications",
      defined_criteria: "",
      showPrescriptions: false,
      prescriptions: orderSetPrescriptions,
      visible: true,
      notes: null
    };
    this.CurrentInpatientPrescriptions.push(orderSetList);
    this.showCMOrderSet = true;
  }

  getGPConnectPrescriptions() {
    if (this.appService.appConfig.AppSettings.enableGPConnectList) {
      let postdata = new GPConnectDataContract()

      postdata.includeAllergies = false;
      if (this.appService.patientDetails && this.appService.patientDetails.nhsnumber) {

        let nhsnumber = this.appService.patientDetails.nhsnumber.replaceAll(" ", "").toString();
        let gpConnectRepeatMedsInMonths = +this.appService.appConfig.AppSettings.gpConnectRepeatMedsInMonths;
        let gpConnectAcuteMedsInMonths = +this.appService.appConfig.AppSettings.gpConnectAcuteMedsInMonths;
        postdata.nhsNumber = nhsnumber//  "9690937286" //"9690937294";
        postdata.repeatMedicationsSinceInMonths = gpConnectRepeatMedsInMonths;
        postdata.acuteMedicationsSinceInMonths = gpConnectAcuteMedsInMonths;

        if (nhsnumber) {
          this.subscriptions.add(
            this.apiRequest.postRequest(this.appService.appConfig.uris.gpconnectbaseuri + "/GetStructuredRecordByAttributes?api-version=1.0",
              postdata, false)
              .subscribe((gpconnectdata) => {
                if (gpconnectdata && gpconnectdata.data) {

                  //assign gp connect last sync date to heading 
                  let lastSyncDate = gpconnectdata.data.lastSyncDate;
                  if (lastSyncDate)
                    this.gpconnectheading = "GP Connect (" + moment(lastSyncDate).format("DD-MMM-yyyy") + ")";

                  //get the medication data for all the snomed codes from terminology
                  //generate current repeat medications orderset object
                  if (gpconnectdata.data.currentRepeatMedications && gpconnectdata.data.currentRepeatMedications.length != 0) {
                    this.ConstructGPConnectPrescriptions(gpconnectdata, "currentRepeatMedications")
                  }

                  //generate current actute medications orderset object
                  if (gpconnectdata.data.currentAcuteMedications && gpconnectdata.data.currentAcuteMedications.length != 0) {
                    this.ConstructGPConnectPrescriptions(gpconnectdata, "currentAcuteMedications")
                  }
                }
              }))
        }
      }
      else {
        this.appService.logToConsole("no nhs number - orderset lists");
      }
    }
  }

  ConstructGPConnectPrescriptions(gpconnectdata, medtype) {
    const terminologyEndpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode";
    let formsettings = new FormSettings();
    formsettings.appService = this.appService;
    formsettings.apiRequest = this.apiRequest;
    formsettings.subjects = this.subjects;
    formsettings.formContext = FormContext.ip;
    let orderSetPrescriptions: Prescription[] = [];

    if (gpconnectdata.data[medtype] && gpconnectdata.data[medtype].length != 0) {
      let i = 0;
      gpconnectdata.data[medtype].forEach((med) => {
        let snomedCode = med.medicationItem.find(x => x.system == "http://snomed.info/sct");
        let gpConnectAcuteMedsInMonths = this.appService.appConfig.AppSettings.gpConnectAcuteMedsInMonths;
        let ordersetname = "";
        if (medtype == "currentRepeatMedications")
          ordersetname = "Current Repeat Medication"
        else
          if (medtype == "currentAcuteMedications")
            ordersetname = "Acute Medication (Last " + gpConnectAcuteMedsInMonths + " Months)"
        let snomedcode = "na"
        if (snomedCode)
          snomedcode = snomedCode.code;
        this.subscriptions.add(this.apiRequest.getRequest(`${terminologyEndpoint}/${snomedcode}?api-version=1.0`)
          .subscribe((terminologyMedication) => {
            if (terminologyMedication) {
              //generate prescription template meta data
              let p = this.GenerateGPCPrescriptionObject(med, formsettings, terminologyMedication);
              // push to ordersetPrescriptions
              orderSetPrescriptions.push(p);
            }
            if (i == gpconnectdata.data[medtype].length - 1) {
              let orderSetList: OrderSetList = {
                prescriptionorderset_id: "",
                orderSetName: ordersetname,
                defined_criteria: "",
                showPrescriptions: false,
                prescriptions: orderSetPrescriptions,
                visible: true,
                notes: null
              };
              this.GPConnectPrescriptions.push(orderSetList);
            }
            i++;
          }, (error) => {

            // medication not found in termiology, create custom product 

            let searchMed = new SearchMedicationComponent(this.subjects, this.appService, this.apiRequest);
            searchMed.clearSearchText();
            searchMed.u_name = med.medicationItem[0].text;
            searchMed.u_form = "Not applicable";
            let customMedication = searchMed.GenerateCustomProduct();

            //generate prescription template meta data
            let p = this.GenerateGPCPrescriptionObject(med, formsettings, customMedication);
            // push to ordersetPrescriptions
            orderSetPrescriptions.push(p);

            if (i == gpconnectdata.data[medtype].length - 1) {
              let orderSetList: OrderSetList = {
                prescriptionorderset_id: "",
                orderSetName: ordersetname,
                defined_criteria: "",
                showPrescriptions: false,
                prescriptions: orderSetPrescriptions,
                visible: true,
                notes: null
              };
              this.GPConnectPrescriptions.push(orderSetList);
            }
            i++;

          }));
      })
    }
  }


  GenerateGPCPrescriptionObject(med, formsettings, terminologyMedication) {
    let startDate = med.medicationStartDate;
    let lastIssueDate = med.lastIssuedDate;
    let reviewDate = med.reviewDate;
    let dosageInst = med.dosageInstruction;
    let additionalInfo = med.additonalInformation;
    let daysDuration = med.daysDuration;
    let scheduledEndDate = med.scheduledEndDate;

    let arr = [];
    if (startDate) {
      arr.push("<span class='text-info font-weight-bold'>Start Date: </span>")
      arr.push(moment(startDate).format("DD-MMM-yyyy HH:mm"))
      arr.push("<br>")
      if (!scheduledEndDate && daysDuration) {
        scheduledEndDate = moment(startDate).add(+daysDuration, 'days');
      }
    }
    if (daysDuration) {
      arr.push("<span class='text-info font-weight-bold'>Duration: </span>")
      arr.push(+daysDuration)
      arr.push(" days")
      arr.push("<br>")
    }
    if (scheduledEndDate) {
      arr.push("<span class='text-info font-weight-bold'>Scheduled End Date : </span>")
      arr.push(moment(scheduledEndDate).format("DD-MMM-yyyy HH:mm"))
      arr.push("<br>")
    }

    if (reviewDate) {
      arr.push("<span class='text-info font-weight-bold'>Review Date: </span>")
      arr.push(moment(reviewDate).format("DD-MMM-yyyy HH:mm"))
      arr.push("<br>")
    }

    if (lastIssueDate) {
      arr.push("<span class='text-info font-weight-bold'>Last Issued: </span>")
      arr.push(moment(lastIssueDate).format("DD-MMM-yyyy HH:mm"))
      arr.push("<br>")
    }

    if (dosageInst) {
      arr.push("<span class='text-info font-weight-bold'>Dosage Instructions: </span>")
      arr.push(dosageInst)
      arr.push("<br>")
    }

    if (additionalInfo) {
      arr.push("<span class='text-info font-weight-bold'>Additional Info: </span>")
      arr.push(additionalInfo)
      arr.push("<br>")
    }

    //generate prescription object 
    formsettings.medication = terminologyMedication;
    formsettings.SetDoseType();
    let p = formsettings.GeneratePrescriptionObject([{ key: 'frequency', value: '' }])
    p.startdatetime = this.appService.getDateTimeinISOFormat(moment(med.medicationStartDate).toDate());
    p.__posology[0].prescriptionstartdate = this.appService.getDateTimeinISOFormat(moment(med.medicationStartDate).toDate());
    p.__posology[0].prescriptionenddate = scheduledEndDate;
    // p.comments = dosageInst + "\n" + additionalInfo + "\n(Source is GP Connect)";
    p.__GpConnect = { displayinfo: "", comments: "" }
    p.__GpConnect.displayinfo = arr.join("");
    p.prescriptionsources = "[\"437850c2-6d80-41f8-a136-2f590e72781e\"]";
    p.__GpConnect.comments = dosageInst + "\n" + additionalInfo + "\n(Source is GP Connect)";

    return p;
  }

  GetCurrentInpatientPrescriptionsForOP() {
    const currentencounter = this.appService.personencounters.find(x => x.displayText.startsWith("Current Visit"));
    if (currentencounter) {
      let orderSetPrescriptions: Prescription[] = [];

      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_prescriptiondetail", this.contextPrescriptionFilter(PrescriptionContext.Inpatient, currentencounter.encounter_id))
          .subscribe((response) => {
            // this.appService.Medication = [];
            for (let prescription of response) {
              if (prescription.correlationid) {
                prescription.__posology = JSON.parse(prescription.__posology);
                prescription.__routes = JSON.parse(prescription.__routes);
                prescription.__medications = JSON.parse(prescription.__medications);
              }
              orderSetPrescriptions.push(this.ClonePrescription(prescription, true));
            }
            let orderSetList: OrderSetList = {
              prescriptionorderset_id: "",
              orderSetName: "Current Medications",
              defined_criteria: "",
              showPrescriptions: false,
              prescriptions: orderSetPrescriptions,
              visible: true,
              notes: null
            };
            this.CurrentInpatientPrescriptions.push(orderSetList);
            this.showCMOrderSet = true;
          })
      )
    }

  }

  GetPOAcallback(instance: OrdersetListComponent, prescriptionList: Prescription[]) {
    instance.subscriptions.add(
      //get all POAs for this person
      instance.apiRequest
        .getRequest(
          instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=poa_preopassessment' +
          '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
        )
        .subscribe((poas) => {
          poas = JSON.parse(poas);
          //iterate each poa
          for (let poa of poas) {

            // get all prescription objects in this poa
            let orderSetPrescriptions: Prescription[] = [];

            if (prescriptionList && prescriptionList.length > 0) {
              let prescriptionsInOrderset: Prescription[] = prescriptionList.filter(p => p.encounter_id == poa.poa_preopassessment_id);
              for (let p of prescriptionsInOrderset) {
                orderSetPrescriptions.push(p);
              }
            }
            if (orderSetPrescriptions.length != 0) {
              let orderSetList: OrderSetList = {
                prescriptionorderset_id: poa.poa_preopassessment_id,
                orderSetName: "POA (" + moment(poa.poadate).format("DD MMM YYYY") + ")",
                defined_criteria: "",
                showPrescriptions: false,
                prescriptions: orderSetPrescriptions,
                visible: true,
                notes: null
              };
              instance.POAPrescriptions.push(orderSetList);
            }
          }
        }
        ))
  }

  CreateSessionFilter() {
    const condition = "person_id=@person_id";
    const f = new filters()
    f.filters.push(new filter(condition));

    const pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));


    const select = new selectstatement("SELECT *");

    const orderby = new orderbystatement("ORDER BY 2");

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }
  GetMOAcallback(instance: OrdersetListComponent, prescriptionList: Prescription[]) {
    instance.subscriptions.add(
      //get all MOAs for this person
      instance.apiRequest
        .getRequest(
          instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medsonadmission' +
          '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
        )
        .subscribe((moas) => {
          moas = JSON.parse(moas);
          moas.sort((a, b) => new Date(b.modifiedon).getTime() - new Date(a.modifiedon).getTime())

          //get all moa prescriptions for this person
          instance.subscriptions.add(
            instance.apiRequest
              .getRequest(
                instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_moaprescriptions' +
                '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
              )
              .subscribe((moaprescriptions) => {
                moaprescriptions = JSON.parse(moaprescriptions);


                instance.subscriptions.add(
                  instance.apiRequest
                    .postRequest(
                      instance.appService.baseURI + "/GetBaseViewListByPost/epma_modonadmissionhistory", instance.CreateSessionFilter() // get "meds on admission" history 
                    )
                    .subscribe((nodesHistory) => {

                      nodesHistory.sort((a, b) => b._sequenceid - a._sequenceid);

                      //for each moa get prescription list from epma_moaprescriptions
                      for (let moa of moas) {
                        let encounterobjects = nodesHistory.filter(x => x.encounterid == moa.encounterid && x.action == "Notes")
                        let encounterNotes
                        if (encounterobjects && encounterobjects.length > 0) {
                          encounterobjects.sort((a, b) => b._sequenceid - a._sequenceid);
                          encounterNotes = encounterobjects[0].notes;
                        }
                        let orderSetPrescriptions: Prescription[] = [];
                        if (prescriptionList && prescriptionList.length > 0) {
                          // get all prescription objects in this moa
                          let prescriptionsInOrderset: Prescription[] =
                            prescriptionList.filter(p =>
                              moaprescriptions.find(mp => mp.prescription_id == p.prescription_id && mp.epma_medsonadmission_id == moa.epma_medsonadmission_id));
                          for (let p of prescriptionsInOrderset) {
                            orderSetPrescriptions.push(p);
                          }
                        }
                        if (orderSetPrescriptions.length != 0) {
                          let moaencounter = instance.appService.personencounters.find(e => e.encounter_id == moa.encounterid);
                          let admitdatetimeformoa = moaencounter ? moaencounter.sortdate : null;
                          let name = admitdatetimeformoa ? ["MOA (", moment(admitdatetimeformoa).format("DD MMM YYYY"), ")"] : ["MOA (Cancelled)"];
                          if (!moa.iscomplete)
                            name.push(" - Incomplete");
                          else if (moa.iscomplete) {
                            name.push(" - Completed by ");
                            name.push(moa.modifiedby);
                            name.push(" (");
                            name.push(moment(moa.modifiedon).format("DD MMM YYYY"));
                            name.push(" at ");
                            name.push(moment(moa.modifiedon).format("HH:mm"));
                            name.push(")");
                          }

                          if (moa.noteshasaddinfo) {
                            name.push(" - ");
                            name.push("See medical notes for additional information")
                          }

                          let orderSetList: OrderSetList = {
                            prescriptionorderset_id: moa.epma_medsonadmission_id,
                            orderSetName: name.join(""),
                            defined_criteria: "",
                            showPrescriptions: false,
                            prescriptions: orderSetPrescriptions,
                            visible: true,
                            notes: encounterNotes
                          };
                          instance.MOAPrescriptions.push(orderSetList);
                        }

                        //stopped moa prescriptions  if current encounter
                        if (moa.encounterid == instance.appService.encounter.encounter_id) {


                          //any moa that is stopped or any other prescription with same primary medicationa stopped and no other medication with same primary medication being active
                          let stoppedid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.stopped.toLowerCase()).prescriptionstatus_id;
                          let activeid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.active.toLowerCase()).prescriptionstatus_id;
                          let modifiedid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.modified.toLowerCase()).prescriptionstatus_id;
                          let restartedid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.restarted.toLowerCase()).prescriptionstatus_id;

                          let inpatientid = instance.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Inpatient.toLowerCase()).prescriptioncontext_id;

                          let stoppedlist: Prescription[] = [];
                          //for each moa
                          orderSetPrescriptions.forEach((moap: Prescription) => {

                            let medcode = moap.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code;

                            let activeondc = instance.appService.Prescription.find(p =>
                              p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                              && (p.prescriptionstatus_id == activeid || p.prescriptionstatus_id == modifiedid || p.prescriptionstatus_id == restartedid || p.prescriptionstatus_id == "" || p.prescriptionstatus_id == null)
                              && p.prescriptioncontext_id == inpatientid)

                            let stoppedondc = instance.appService.Prescription.find(p =>
                              p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                              && (p.prescriptionstatus_id == stoppedid)
                              && p.prescriptioncontext_id == inpatientid)

                            let notcompletedondc = instance.appService.Prescription.find(p =>
                              p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                              && (p.prescriptionstatus_id == activeid || p.prescriptionstatus_id == modifiedid || p.prescriptionstatus_id == restartedid || p.prescriptionstatus_id == "" || p.prescriptionstatus_id == null)
                              && p.prescriptioncontext_id == inpatientid
                              && p.__completed != true)

                            let completedondc = instance.appService.Prescription.find(p =>
                              p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                              && (p.prescriptionstatus_id == activeid || p.prescriptionstatus_id == modifiedid || p.prescriptionstatus_id == restartedid || p.prescriptionstatus_id == "" || p.prescriptionstatus_id == null)
                              && p.prescriptioncontext_id == inpatientid
                              && p.__completed == true)

                            //if not active in drug chart
                            //check if its stopped
                            if (moap.prescriptionstatus_id == stoppedid) {
                              //check if there is any active with same dmd code
                              stoppedlist.push(moap);
                            }
                            else if (stoppedondc && !activeondc) {
                              stoppedlist.push(moap);
                            }
                            else if (completedondc && !notcompletedondc) {
                              stoppedlist.push(moap);
                            }
                          });

                          let orderSetListStopped: OrderSetList = {
                            prescriptionorderset_id: moa.epma_medsonadmission_id,
                            orderSetName: "MOA - Stopped (" + moment(moa.createdon).format("DD MMM YYYY") + ")",
                            defined_criteria: "",
                            showPrescriptions: false,
                            prescriptions: stoppedlist,
                            visible: true,
                            notes: encounterNotes
                          };
                          instance.StoppedMOAPrescriptions.push(orderSetListStopped);
                        }
                      }
                      instance.isDataLoaded = true;
                    }
                    ))
              }
              ))
        }));
  }

  GetMODcallback(instance: OrdersetListComponent, prescriptionList: Prescription[]) {
    instance.subscriptions.add(
      //get all MODs for this person
      instance.apiRequest
        .getRequest(
          instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medsondischarge' +
          '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
        )
        .subscribe((mods) => {
          mods = JSON.parse(mods);
          mods.sort((a, b) => new Date(b.modifiedon).getTime() - new Date(a.modifiedon).getTime())
          //get all mod prescriptions for this person
          instance.subscriptions.add(
            instance.apiRequest
              .getRequest(
                instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_modprescriptions' +
                '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
              )
              .subscribe((modprescriptions) => {
                modprescriptions = JSON.parse(modprescriptions);
                //for each mod get prescription list from epma_moaprescriptions
                for (let mod of mods) {
                  if (mod.encounterid != instance.appService.encounter.encounter_id) {
                    let orderSetPrescriptions: Prescription[] = [];
                    if (prescriptionList && prescriptionList.length > 0) {
                      // get all prescription objects in this mod
                      let prescriptionsInOrderset: Prescription[] =
                        prescriptionList.filter(p =>
                          modprescriptions.find(mp => mp.prescription_id == p.prescription_id && mp.epma_medsondischarge_id == mod.epma_medsondischarge_id));
                      for (let p of prescriptionsInOrderset) {
                        orderSetPrescriptions.push(p);
                      }
                    }
                    let orderSetList: OrderSetList = {
                      prescriptionorderset_id: mod.epma_medsondischarge_id,
                      orderSetName: "MOD (" + moment(mod.createdon).format("DD MMM YYYY") + ")",
                      defined_criteria: "",
                      showPrescriptions: false,
                      prescriptions: orderSetPrescriptions,
                      visible: true,
                      notes: null
                    };
                    instance.MODPrescriptions.push(orderSetList);
                  }
                }
              }
              ))
        }));
  }

  private contextPrescriptionFilter(context: any, encounter_id = null) {
    let condition = "person_id = @person_id and prescriptioncontext_id = @prescriptioncontext_id"
    let contextid = "";
    if (context == PrescriptionContext.Admission) {
      let admcontext = this.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Admission.toLowerCase());
      if (admcontext) {
        contextid = admcontext.prescriptioncontext_id
      }
    }
    else if (context == PrescriptionContext.Discharge) {
      {
        let discontext = this.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Discharge.toLowerCase());
        if (discontext) {
          contextid = discontext.prescriptioncontext_id;
        }
      }
    }
    else if (context == "poa") {
      condition = "person_id = @person_id"
    }
    else if (context == PrescriptionContext.Inpatient) {
      let ipcontext = this.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Inpatient.toLowerCase());
      if (ipcontext) {
        contextid = ipcontext.prescriptioncontext_id;
      }
      condition = "person_id = @person_id and prescriptioncontext_id = @prescriptioncontext_id and encounter_id=@encounter_id"
    }
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    if (context != "poa")
      pm.filterparams.push(new filterparam("prescriptioncontext_id", contextid));
    if (context == PrescriptionContext.Inpatient) {
      pm.filterparams.push(new filterparam("encounter_id", encounter_id));
    }

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }


  // get  moa/mod prescription objects
  getAllPrescriptions(context: PrescriptionContext, cb: (instance: OrdersetListComponent, prescription: Prescription[]) => any) {

    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_prescriptiondetail", this.contextPrescriptionFilter(context))
        .subscribe((response) => {
          // this.appService.Medication = [];
          for (let prescription of response) {
            if (prescription.correlationid) {
              prescription.__posology = JSON.parse(prescription.__posology);
              prescription.__routes = JSON.parse(prescription.__routes);
              prescription.__medications = JSON.parse(prescription.__medications);
              if (context == PrescriptionContext.Admission) {
                this.contextualprescriptionList.push(<Prescription>prescription);
              }
              else if (context == PrescriptionContext.Discharge) {
                this.contextualprescriptionList.push(<Prescription>prescription);
              }
            }
          }
          cb(this, this.contextualprescriptionList);
        })
    )
  }

  // get  prescriptions
  getPOAPrescriptions(cb: (instance: OrdersetListComponent, prescription: Prescription[]) => any) {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_poaprescriptions", this.contextPrescriptionFilter("poa"))
        .subscribe((response) => {
          for (let prescription of response) {
            if (prescription.correlationid) {
              prescription.__posology = JSON.parse(prescription.__posology);
              prescription.__routes = JSON.parse(prescription.__routes);
              prescription.__medications = JSON.parse(prescription.__medications);
              this.contextualprescriptionList.push(<Prescription>prescription);
            }
          }
          cb(this, this.contextualprescriptionList);
        })
    )
  }


  createPrescriptionFilter(prescriptionIds: string) {

    let condition = `prescription_id in (${prescriptionIds}) and '1' = @one`;
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("one", "1"));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  createPosologyFilter(posologyIds: string) {

    let condition = `posology_id in (${posologyIds}) and '1' = @one`;
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("one", "1"));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  createMedicationFilter(medicationIds: string) {

    let condition = `medication_id in (${medicationIds}) and '1' = @one`;
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("one", "1"));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  ClonePrescription(p: Prescription, skipVisitIdentifiers = false) {

    var person_id = p.person_id;
    var encounter_id = p.encounter_id;
    if (skipVisitIdentifiers) {
      person_id = null;
      encounter_id = null;
    }
    var p1 = <Prescription>FormSettings.CleanAndCloneObject(p);
    p1.prescription_id = uuid();
    p1.correlationid = uuid();

    p1.__medications = new Array<Medication>();
    p1.__medications = [];
    p1.person_id = person_id;
    p1.encounter_id = encounter_id;
    //p1.prescriptionstatus_id = null;


    p.__medications.forEach(m => {
      var mindex = p.__medications.indexOf(m);
      p1.__medications.push(<Medication>FormSettings.CleanAndCloneObject(m));
      p1.__medications[mindex].medication_id = uuid();
      p1.__medications[mindex].correlationid = p1.correlationid;

      p1.__medications[mindex].prescription_id = p1.prescription_id;
      p1.__medications[mindex].person_id = person_id;
      p1.__medications[mindex].encounter_id = encounter_id;


      p1.__medications[mindex].__codes = new Array<Medicationcodes>();
      p1.__medications[mindex].__codes = [];
      m.__codes.forEach(c => {
        var cindex = m.__codes.indexOf(c);
        p1.__medications[mindex].__codes.push(<Medicationcodes>FormSettings.CleanAndCloneObject(c));
        p1.__medications[mindex].__codes[cindex].medication_id = p1.__medications[mindex].medication_id;
        p1.__medications[mindex].__codes[cindex].medicationcodes_id = uuid();
        p1.__medications[mindex].__codes[cindex].correlationid = p1.correlationid;
      });

      p1.__medications[mindex].__ingredients = new Array<Medicationingredients>();
      p1.__medications[mindex].__ingredients = [];
      m.__ingredients.forEach(ig => {
        var igindex = m.__ingredients.indexOf(ig);
        p1.__medications[mindex].__ingredients.push(<Medicationingredients>FormSettings.CleanAndCloneObject(ig));
        p1.__medications[mindex].__ingredients[igindex].medication_id = p1.__medications[mindex].medication_id;
        p1.__medications[mindex].__ingredients[igindex].medicationingredients_id = uuid();
        p1.__medications[mindex].__ingredients[igindex].correlationid = p1.correlationid;
      });
    });

    p1.__posology = [];
    p1.__posology.push(<Posology>FormSettings.CleanAndCloneObject(this.appService.GetCurrentPosology(p)));
    // p1.__posology[0] = <Posology>FormSettings.CleanAndCloneObject(p.__posology[0]);
    p1.__posology[0].prescription_id = p1.prescription_id;
    p1.__posology[0].posology_id = uuid();
    p1.__posology[0].correlationid = p1.correlationid;

    p1.__posology[0].person_id = person_id;
    p1.__posology[0].encounter_id = encounter_id;

    p1.__posology[0].__dose = new Array<Dose>();
    p1.__posology[0].__dose = [];
    this.appService.GetCurrentPosology(p).__dose.forEach(d => {
      var dindex = this.appService.GetCurrentPosology(p).__dose.indexOf(d);
      p1.__posology[0].__dose.push(<Dose>FormSettings.CleanAndCloneObject(d));
      p1.__posology[0].__dose[dindex].dose_id = uuid();
      if (dindex > 0 && p.isinfusion)
        p1.__posology[0].__dose[dindex].continuityid = p1.__posology[0].__dose[0].dose_id;
      p1.__posology[0].__dose[dindex].posology_id = p1.__posology[0].posology_id;
      p1.__posology[0].__dose[dindex].prescription_id = p1.prescription_id;
      p1.__posology[0].__dose[dindex].correlationid = p1.correlationid;

    });

    p1.__routes = new Array<Route>();
    p1.__routes = [];
    p.__routes.forEach(r => {
      var rindex = p.__routes.indexOf(r);
      p1.__routes.push(<Route>FormSettings.CleanAndCloneObject(r));
      p1.__routes[rindex].medication_id = "";
      p1.__routes[rindex].prescription_id = p1.prescription_id;
      p1.__routes[rindex].prescriptionroutes_id = uuid();
      p1.__routes[rindex].correlationid = p1.correlationid;

    });

    p1.__customWarning = [];
    if (p.__customWarning)
      p.__customWarning.forEach(cw => {
        p1.__customWarning.push(<any>FormSettings.CleanAndCloneObject(cw));
      });

    this.appService.logToConsole(p);
    this.appService.logToConsole(p1);

    return p1;
  }

  showMOANotespop(notes) {
    this.showNotespopup = true;
    this.latestNotes = notes
  }

  closepopupNotes() {
    this.showNotespopup = false;
  }

  GetordersetAccess(action) {
    if (this.context == FormContext.ip) {
      return this.appService.AuthoriseAction(action)
    }
    else if (this.context == FormContext.moa) {
      return this.appService.AuthoriseAction(action + "_moa")
    }
    else if (this.context == FormContext.op) {
      return this.appService.AuthoriseAction(action + "_op")
    }
    else if (this.context == FormContext.mod) {
      return this.appService.AuthoriseAction(action + "_mod")
    }
  }

}

export class GPConnectDataContract {
  nhsNumber: string;
  includeAllergies: boolean;
  acuteMedicationsSinceInMonths: number;
  repeatMedicationsSinceInMonths: number
}

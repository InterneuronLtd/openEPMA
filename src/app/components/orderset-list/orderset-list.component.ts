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
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { AdministerMedication, Dose, DoseEvents, Medication, Medicationcodes, Medicationingredients, Posology, Prescription, Prescriptionroutes } from '../../models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { OrderSetList } from '../../models/ordersetlist.model';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { FormContext, PrescriptionContext, PrescriptionStatus, RoleAction } from 'src/app/services/enum';
import * as moment from 'moment';
import { FormSettings } from '../prescribing-form/formhelper';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';

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
  allowView: boolean = false;
  showaddtoorderset = false;
  orderset_id = "";
  constructor(
    private apiRequest: ApirequestService,
    public appService: AppService,
    private modalService: BsModalService,
    private dr: DataRequest,
    private subjects: SubjectsService
  ) { }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
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

                  if ( this.appService.AuthoriseAction("epma_create_org_orderset")) {

                  }
                  else {

                    for (let r of presecriptionOrderSets) {
                      let removeorderset = true;
                      let selectedgroups = JSON.parse(r.groupsauthorizedtoview)
                    
                      for (let group of (selectedgroups??[])) {
                        if (this.appService.loggedInUserRoles.includes(group.groupname)) {
                          removeorderset = false;
                        }
                      }
                      if (removeorderset) {
                        if(this.organizationalOrderSetsId==r.prescriptionordersettype_id){
                        presecriptionOrderSets = presecriptionOrderSets.filter(o => o.prescriptionorderset_id != r.prescriptionorderset_id);
                        }
                      }

                    }


                    for (let r of presecriptionOrderSets) {

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
                      visible: true
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
                  this.subjects.ShowRefreshPageMessage.next(error);
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
    if (this.context == FormContext.moa || this.context == FormContext.op) {
      this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);

      this.getPOAPrescriptions(this.GetPOAcallback);

      this.displayOrgOS = true;
      this.displayMyOS = true;
      this.displayPOAOS = true;
      this.displayMODOS = true;
      this.displayMOAOS = false;
      this.displayCMOS = false;
      this.displaySTOS = false;
      this.displayPatientOS = true;
    }
    if (this.context == FormContext.mod) {
      this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
      this.getAllInpatientPrescriptions();
      this.getPOAPrescriptions(this.GetPOAcallback);

      this.displayOrgOS = true;
      this.displayMyOS = true;
      this.displayPOAOS = true;
      this.displayMODOS = false;
      this.displayMOAOS = true;
      this.displayCMOS = true;
      this.displaySTOS = true;
      this.displayPatientOS = true;

    }
    if (this.context == FormContext.ip) {
      this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
      this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);

      this.displayOrgOS = true;
      this.displayMyOS = true;
      this.displayPOAOS = false;
      this.displayMODOS = true;
      this.displayMOAOS = true;
      this.displayCMOS = false;
      this.displaySTOS = true;
      this.displayPatientOS = true;

    }

    // this.getPOAPrescriptions(this.GetPOAcallback);
    // this.getAllPrescriptions(PrescriptionContext.Admission, this.GetMOAcallback);
    // this.getAllPrescriptions(PrescriptionContext.Discharge, this.GetMODcallback);
    // this.getAllInpatientPrescriptions();

  }

  getAllInpatientPrescriptions() {
    let orderSetPrescriptions: Prescription[] = [];

    for (let p of this.appService.Prescription.filter(x => x.prescriptioncontext_id == (this.appService.MetaPrescriptioncontext.find(c => c.context.toLowerCase() == "inpatient").prescriptioncontext_id))) {

      orderSetPrescriptions.push(p);
    }
    let orderSetList: OrderSetList = {
      prescriptionorderset_id: "",
      orderSetName: "Current Medications",
      defined_criteria: "",
      showPrescriptions: false,
      prescriptions: orderSetPrescriptions,
      visible: true
    };
    this.CurrentInpatientPrescriptions.push(orderSetList);
    this.showCMOrderSet = true;
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
                visible: true
              };
              instance.POAPrescriptions.push(orderSetList);
            }
          }
        }
        ))
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
          //get all moa prescriptions for this person
          instance.subscriptions.add(
            instance.apiRequest
              .getRequest(
                instance.appService.baseURI + '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_moaprescriptions' +
                '&synapseattributename=person_id&&attributevalue=' + instance.appService.personId
              )
              .subscribe((moaprescriptions) => {
                moaprescriptions = JSON.parse(moaprescriptions);

                //for each moa get prescription list from epma_moaprescriptions
                for (let moa of moas) {
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
                    let admitdatetimeformoa = moaencounter ? moaencounter.sortdate : "na";
                    let name = ["MOA (", moment(admitdatetimeformoa).format("DD MMM YYYY"), ")"]
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


                    let orderSetList: OrderSetList = {
                      prescriptionorderset_id: moa.epma_medsonadmission_id,
                      orderSetName: name.join(""),
                      defined_criteria: "",
                      showPrescriptions: false,
                      prescriptions: orderSetPrescriptions,
                      visible: true
                    };
                    instance.MOAPrescriptions.push(orderSetList);
                  }

                  //stopped moa prescriptions  if current encounter
                  if (moa.encounterid == instance.appService.encounter.encounter_id) {


                    //any moa that is stopped or any other prescription with same primary medicationa stopped and no other medication with same primary medication being active
                    let stoppedid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.stopped.toLowerCase()).prescriptionstatus_id;
                    let activeid = instance.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase() == PrescriptionStatus.active.toLowerCase()).prescriptionstatus_id;

                    let stoppedlist: Prescription[] = [];
                    //for each moa
                    orderSetPrescriptions.forEach((moap: Prescription) => {

                      let medcode = moap.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code;

                      let activeondc = instance.appService.Prescription.find(p =>
                        p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                        && (p.prescriptionstatus_id == activeid || p.prescriptionstatus_id == "" || p.prescriptionstatus_id == null))

                      let stoppedondc = instance.appService.Prescription.find(p =>
                        p.__medications.find(m => m.isprimary).__codes.find(c => c.terminology == "formulary").code == medcode
                        && (p.prescriptionstatus_id == stoppedid))

                      //if not active in drug chart
                      //check if its stopped
                      if (moap.prescriptionstatus_id == stoppedid) {
                        //check if there is any active with same dmd code
                        stoppedlist.push(moap);
                      }
                      else {
                        if (stoppedondc && !activeondc) {
                          stoppedlist.push(moap);
                        }
                      }
                    });

                    let orderSetListStopped: OrderSetList = {
                      prescriptionorderset_id: moa.epma_medsonadmission_id,
                      orderSetName: "MOA - Stopped (" + moment(moa.createdon).format("DD MMM YYYY") + ")",
                      defined_criteria: "",
                      showPrescriptions: false,
                      prescriptions: stoppedlist,
                      visible: true
                    };
                    instance.StoppedMOAPrescriptions.push(orderSetListStopped);
                  }
                }
                instance.isDataLoaded = true;
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
                      visible: true
                    };
                    instance.MODPrescriptions.push(orderSetList);
                  }
                }
              }
              ))
        }));
  }

  private contextPrescriptionFilter(context: any) {
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
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    if (context != "poa")
      pm.filterparams.push(new filterparam("prescriptioncontext_id", contextid));

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
}

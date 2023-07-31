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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { Subscription } from 'rxjs';
import { Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { v4 as uuid } from 'uuid';
import { OrderSet } from '../../models/orderset.model';
import { FormSettings } from '../prescribing-form/formhelper';
import { Orderset, OrdersetPrescription } from '../../models/EPMA';
import { DataRequest } from 'src/app/services/datarequest';
import { PrescriptionContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-addto-orderset',
  templateUrl: './addto-orderset.component.html',
  styleUrls: ['./addto-orderset.component.css'],
})
export class AddtoOrdersetComponent implements OnInit, OnDestroy {
  @Input('patientid') patientid: string;// = '1058b305c9-3753-4c5e-ac4a-eba1d19dca4801';
  @Input('ownerid') ownerid: string;// = '1001';
  @Input('visible') visible: boolean = true;
  @Input('prescriptions') prescriptions: Array<Prescription>;
  @Input('orderset_id') orderset_id?:string

  @Output() Complete = new EventEmitter<object>();
  @Output() Failed = new EventEmitter<object>();
  @Output() Cancelled = new EventEmitter<any>();
  updateorderset = new Orderset();
  therapyOrderSet: OrderSet;

  validationMessage = '';

  inclusiveLabelText: string;
  exclusiveLabelText: string;

  subscriptions: Subscription = new Subscription();

  orderSetTypes = [];
  existingOrderSets = [];

  isSaving: boolean = false;
  groups=[]
  
  constructor(
    private apiRequest: ApirequestService,
    public appService: AppService,
    private dr: DataRequest,
    public subjects: SubjectsService
  ) { }

  ngOnInit(): void {
  this.accessgroupReset();
    this.initializeForm();
    if(this.orderset_id){
      this.getupdateOrderSet();
    }
  }

  accessgroupReset(){
    this.groups=[]
    for(let grop of this.appService.appConfig.AppSettings.EPMAGroups){
      let g = new EPMAGroups();
      g.selected = false;
      g.groupname = grop
      this.groups.push(g);
}
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getupdateOrderSet(){
   let id= this.orderset_id
   this.subscriptions.add(
    this.apiRequest
      .getRequest(
        this.appService.baseURI +
        '/GetObject?synapsenamespace=local&synapseentityname=epma_orderset&id=' +id
      )
        .subscribe((response) => {
         this.updateorderset = JSON.parse(response);
         let selectedgroups=JSON.parse(this.updateorderset.groupsauthorizedtoview)
         for(let g of (selectedgroups??[])){
           this.groups.find(x=>x.groupname==g.groupname).selected=true;
         }
         this.therapyOrderSet.definedCriteria=this.updateorderset.defined_criteria
         this.therapyOrderSet.inclusiveValue=this.updateorderset.inclusive_value
         this.therapyOrderSet.exclusiveValue=this.updateorderset.exclusive_value

        })
    );
  }

  onChangeOfOrderSetType(event): void {
    this.therapyOrderSet.prescriptionordersettype_id = event.target.value;
    this.therapyOrderSet.definedCriteria = '';
    this.therapyOrderSet.inclusiveValue = undefined;
    this.therapyOrderSet.exclusiveValue = undefined;
    this.validationMessage = '';

    if (this.therapyOrderSet.addToExistingOrderSet) {
      this.getExistingOrderSets();
    }
  }

  onClickOfOrderSetType(event): void {
    this.accessgroupReset();
    switch (event.target.value) {
      case 'New':
        this.therapyOrderSet.addToNewOrderSet = true;
        this.therapyOrderSet.addToExistingOrderSet = false;
        this.existingOrderSets = [];
        this.therapyOrderSet.definedCriteria = '';
        this.therapyOrderSet.inclusiveValue = undefined;
        this.therapyOrderSet.exclusiveValue = undefined;
        this.inclusiveLabelText = '';
        this.exclusiveLabelText = '';
        this.validationMessage = '';
        break;
      case 'Existing':
        this.therapyOrderSet.addToNewOrderSet = false;
        this.therapyOrderSet.addToExistingOrderSet = true;
        this.therapyOrderSet.newOrderSetName = '';
        this.validationMessage = '';
        this.getExistingOrderSets();
        break;
    }
  }
  ongroupChange(group:string): void {
  //  if( event.target.value=="Select"){
  //    return;
  //  }
   let grp= this.groups.find(x=>x.groupname ==group)
    grp.selected=true;
  }
  groupChanged(group:string){
    let grp= this.groups.find(x=>x.groupname == group)
    grp.selected=false;
  }
  onDefinedCriteriaChange(event): void {
    switch (event.target.value) {
      case 'Age in years':
        this.inclusiveLabelText = 'years (incl.) -';
        this.exclusiveLabelText = 'years (excl.)';
        break;
      case 'Age in months':
        this.inclusiveLabelText = 'months (incl.) -';
        this.exclusiveLabelText = 'months (excl.)';
        break;
      case 'Weight':
        this.inclusiveLabelText = 'kg (incl.) -';
        this.exclusiveLabelText = 'kg (excl.)';
        break;
      case 'Body Surface':
        this.inclusiveLabelText = 'm' + '\u00B2' + '(incl.) -';
        this.exclusiveLabelText = 'm' + '\u00B2' + '(excl.)';
        break;
      default:
        this.inclusiveLabelText = '';
        this.exclusiveLabelText = '';
        break;
    }
  }
  onupdate(){
    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_orderset&synapseattributename=prescriptionordersettype_id&attributevalue=' +
          this.updateorderset.prescriptionordersettype_id
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);

         let recordExists = responseArray.filter(
            (val) =>
              val.ordersetname.toLowerCase() ==
              this.updateorderset.ordersetname.toLowerCase() && val.epma_orderset_id !=this.updateorderset.epma_orderset_id
          ).length;

          if (recordExists > 0) {
            this.validationMessage = 'Order set name already exists.';
            this.isSaving = false;
            return;
          }

          if(this.therapyOrderSet.definedCriteria.trim()!=""){
            if (this.therapyOrderSet.inclusiveValue > this.therapyOrderSet.exclusiveValue) {
              this.validationMessage = 'The inclusive value should not be greater than exclusive value';
              return;
            }
           }
            var entities: Array<UpsertEntity> = [];
           
            this.updateorderset.defined_criteria = this.therapyOrderSet.definedCriteria;
            this.updateorderset.inclusive_value = this.therapyOrderSet.inclusiveValue;
            this.updateorderset.exclusive_value = this.therapyOrderSet.exclusiveValue;
            this.updateorderset.groupsauthorizedtoview=JSON.stringify(this.groups.filter(x=>x.selected))
            entities.push(new UpsertEntity("local", "epma_orderset", this.updateorderset));
            this.CommitInTransaction(entities);
         
      


        })
    );
   
  }
  onConfirm(): void {
    let prescriptionorderset = new Orderset();
    var entities: Array<UpsertEntity> = [];

    if (this.therapyOrderSet.addToNewOrderSet) {
      if (this.therapyOrderSet.inclusiveValue > this.therapyOrderSet.exclusiveValue) {
        this.validationMessage = 'The inclusive value should not be greater than exclusive value';
        return;
      }

      if (!this.therapyOrderSet.newOrderSetName) {
        this.validationMessage = 'Please enter the new order set name';
        return;
      }

      let attributeName = 'prescriptionordersettype_id';
      let attributeValue = this.therapyOrderSet.prescriptionordersettype_id
        .split(':')[1]
        .trim();
      let orderSets = [];
      let recordExists = 0;
      let newOrderSetId = uuid();
      this.isSaving = true;

      this.subscriptions.add(
        this.apiRequest
          .getRequest(
            this.appService.baseURI +
            '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_orderset&synapseattributename=' +
            attributeName +
            '&attributevalue=' +
            attributeValue
          )
          .subscribe((response) => {
            let responseArray = JSON.parse(response);

            for (let resp of responseArray) {
              orderSets.push(resp);
            }

            recordExists = orderSets.filter(
              (val) =>
                val.ordersetname.toLowerCase() ==
                this.therapyOrderSet.newOrderSetName.toLowerCase()
            ).length;

            if (recordExists > 0) {
              this.validationMessage = 'Order set name already exists.';
              this.isSaving = false;
              return;
            }

            /*prescriptionorderset = {
              prescriptionorderset_id: newOrderSetId,
              prescriptionordersettype_id: this.therapyOrderSet.prescriptionordersettype_id
                .split(':')[1]
                .trim(),
              ordersetname: this.therapyOrderSet.newOrderSetName,
              person_id: this.patientid,
              owner: this.ownerid,
              defined_criteria: this.therapyOrderSet.definedCriteria,
              inclusive_value: this.therapyOrderSet.inclusiveValue,
              exclusive_value: this.therapyOrderSet.exclusiveValue,
            };*/
            prescriptionorderset.epma_orderset_id = newOrderSetId;
            prescriptionorderset.prescriptionordersettype_id = this.therapyOrderSet.prescriptionordersettype_id
              .split(':')[1]
              .trim();
            prescriptionorderset.ordersetname = this.therapyOrderSet.newOrderSetName;
            prescriptionorderset.person_id = this.patientid;
            prescriptionorderset.owner = this.ownerid;
            prescriptionorderset.defined_criteria = this.therapyOrderSet.definedCriteria;
            prescriptionorderset.inclusive_value = this.therapyOrderSet.inclusiveValue;
            prescriptionorderset.exclusive_value = this.therapyOrderSet.exclusiveValue;
            prescriptionorderset.groupsauthorizedtoview=JSON.stringify(this.groups.filter(x=>x.selected))
            entities.push(new UpsertEntity("local", "epma_orderset", prescriptionorderset));

            //this.onOrderSetConfirm.emit(prescriptionorderset);

            this.saveOrdersetPrescription(newOrderSetId, entities);

            // this.subscriptions.add(
            //   this.apiRequest
            //     .postRequest(
            //       this.appService.baseURI +
            //       'PostObject?synapsenamespace=core&synapseentityname=prescriptionorderset',
            //       prescriptionorderset
            //     )
            //     .subscribe((response) => {
            //       //this.appService.logToConsole(response);
            //       this.saveOrdersetPrescription(newOrderSetId);
            //     })
            // );




            //this.visible = false;


          })
      );
    } else {
      if (this.therapyOrderSet.inclusiveValue > this.therapyOrderSet.exclusiveValue) {
        this.validationMessage = 'The inclusive value should not be greater than exclusive value';
        return;
      }

      if (!this.therapyOrderSet.existingOrderSetName) {
        if (this.existingOrderSets.length == 0) {
          this.validationMessage = 'No order sets exists. Please create a new.';
        } else {
          this.validationMessage = 'Please select the existing order set name';
        }
        return;
      }

      let attributeName = 'epma_orderset_id';
      let attributeValue = this.therapyOrderSet.existingOrderSetName;
      let orderSets = [];
      this.isSaving = true;
      this.subscriptions.add(
        this.apiRequest
          .getRequest(
            this.appService.baseURI +
            '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_orderset&synapseattributename=' +
            attributeName +
            '&attributevalue=' +
            attributeValue
          )
          .subscribe((response) => {
            let responseArray = JSON.parse(response);

            for (let resp of responseArray) {
              orderSets.push(resp);
            }

            /*prescriptionorderset = {
              prescriptionorderset_id: attributeValue,
              prescriptionordersettype_id: this.therapyOrderSet.prescriptionordersettype_id
                .split(':')[1]
                .trim(),
              ordersetname: orderSets[0].ordersetname,
              person_id: this.patientid,
              owner: this.ownerid,
              defined_criteria: this.therapyOrderSet.definedCriteria,
              inclusive_value: this.therapyOrderSet.inclusiveValue,
              exclusive_value: this.therapyOrderSet.exclusiveValue,
            };*/

            prescriptionorderset.epma_orderset_id = attributeValue;
            prescriptionorderset.prescriptionordersettype_id = this.therapyOrderSet.prescriptionordersettype_id
              .split(':')[1]
              .trim();
            prescriptionorderset.ordersetname = orderSets[0].ordersetname;
            prescriptionorderset.person_id = this.patientid;
            prescriptionorderset.owner = this.ownerid;
            prescriptionorderset.defined_criteria = this.therapyOrderSet.definedCriteria;
            prescriptionorderset.inclusive_value = this.therapyOrderSet.inclusiveValue;
            prescriptionorderset.exclusive_value = this.therapyOrderSet.exclusiveValue;
            prescriptionorderset.groupsauthorizedtoview=JSON.stringify(this.groups.filter(x=>x.selected))
            entities.push(new UpsertEntity("local", "epma_orderset", prescriptionorderset));

            this.saveOrdersetPrescription(attributeValue, entities);

            // this.subscriptions.add(
            //   this.apiRequest
            //     .postRequest(
            //       this.appService.baseURI +
            //       'PostObject?synapsenamespace=core&synapseentityname=prescriptionorderset',
            //       prescriptionorderset
            //     )
            //     .subscribe((response) => {
            //       //this.appService.logToConsole(response);
            //       this.updateDefinedCriteriaForExistingOrderSet(
            //         this.therapyOrderSet.definedCriteria,
            //         this.therapyOrderSet.inclusiveValue,
            //         this.therapyOrderSet.exclusiveValue);

            //       this.saveOrdersetPrescription(attributeValue);
            //     })
            // );

            //this.visible = false;


          })
      );
    }
  }

  CommitInTransaction(entities: Array<UpsertEntity>) {
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    entities.forEach(e => {
      upsertManager.addEntity(e.namespace, e.entityname, JSON.parse(JSON.stringify(e.entity)));
    });
    upsertManager.save((resp) => {
      this.appService.logToConsole(resp);
      this.appService.UpdateDataVersionNumber(resp);

      upsertManager.destroy();
      this.Complete.emit(resp.data);
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.Failed.emit(error);

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );
  }

  onCancel(): void {
    this.initializeForm();
    this.visible = false;
    this.Cancelled.emit("cancelled");
  }

  getOrderSetTypes(): void {
    let authOrgSet = this.appService.AuthoriseAction("epma_create_org_orderset");

    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetList?synapsenamespace=meta&synapseentityname=prescriptionordersettype'
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);
          responseArray.sort((a, b) => {
            if (a.ordersettype == 'Organisational order sets')
              return -1
            else
              if (b.ordersettype == 'Organisational order sets')
                return 1;
              else
                return a.ordersettype.localeCompare(b.ordersettype)
          })

          for (let resp of responseArray) {
            if (resp.ordersettype == 'Organisational order sets') {
              if (authOrgSet) {
                this.orderSetTypes.push(resp);
              }
            } else {
              if (resp.ordersettype != "Patient order sets") {
                this.orderSetTypes.push(resp);
              }
            }
          }

          this.therapyOrderSet.prescriptionordersettype_id = '0: ' + this.orderSetTypes[0].prescriptionordersettype_id;
          this.getExistingOrderSets();

        })
    );
  }

  getExistingOrderSets(): void {
    this.existingOrderSets = [];

    let attributeName = 'prescriptionordersettype_id';
    let attributeValue = this.therapyOrderSet.prescriptionordersettype_id
      .split(':')[1]
      .trim();

    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_orderset&synapseattributename=' +
          attributeName +
          '&attributevalue=' +
          attributeValue
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);

          for (let resp of responseArray) {
            this.existingOrderSets.push(resp);
          }

          //My Order Set
          if (
            this.therapyOrderSet.prescriptionordersettype_id
              .split(':')[1]
              .trim() == 'cf9fb4a0-b355-4197-943e-e5f6e7b241b2'
          ) {
            //this.existingOrderSets = [];
            this.existingOrderSets = this.existingOrderSets.filter(
              (value) => value.owner == this.ownerid
            );
          }

          //Patient Order Set
          if (
            this.therapyOrderSet.prescriptionordersettype_id
              .split(':')[1]
              .trim() == 'a9cd4eaf-38c8-4106-8310-d1bbfde252e0'
          ) {
            //this.existingOrderSets = [];
            this.existingOrderSets = this.existingOrderSets.filter(
              (value) => value.person_id == this.patientid
            );
          }
        })
    );

    this.therapyOrderSet.existingOrderSetName = '';
  }

  onExistingOrderSetSelected(event): void {
    if (event.target.value) {
      let prescriptionorderset_id = event.target.value
        .toString()
        .split(':')[1]
        .trim();

      let orderSet = this.existingOrderSets.filter(
        (value) => value.epma_orderset_id == prescriptionorderset_id
      );

      this.validationMessage = '';
      this.accessgroupReset();
      let selectedgroups=JSON.parse(orderSet[0].groupsauthorizedtoview)
      for(let g of (selectedgroups??[])){
        this.groups.find(x=>x.groupname==g.groupname).selected=true;
      }
      this.therapyOrderSet.definedCriteria = orderSet[0].defined_criteria;
      this.therapyOrderSet.inclusiveValue = orderSet[0].inclusive_value;
      this.therapyOrderSet.exclusiveValue = orderSet[0].exclusive_value;

      switch (this.therapyOrderSet.definedCriteria) {
        case 'Age in years':
          this.inclusiveLabelText = 'years (incl.) -';
          this.exclusiveLabelText = 'years (excl.)';
          break;
        case 'Age in months':
          this.inclusiveLabelText = 'months (incl.) -';
          this.exclusiveLabelText = 'months (excl.)';
          break;
        case 'Weight':
          this.inclusiveLabelText = 'kg (incl.) -';
          this.exclusiveLabelText = 'kg (excl.)';
          break;
        case 'Body Surface':
          this.inclusiveLabelText = 'm' + '\u00B2' + '(incl.) -';
          this.exclusiveLabelText = 'm' + '\u00B2' + '(excl.)';
          break;
        default:
          this.inclusiveLabelText = '';
          this.exclusiveLabelText = '';
          break;
      }
    } else {
      this.therapyOrderSet.definedCriteria = "";
      this.therapyOrderSet.inclusiveValue = undefined;
      this.therapyOrderSet.exclusiveValue = undefined;
      this.inclusiveLabelText = '';
      this.exclusiveLabelText = '';
    }
  }

  private initializeForm(): void {
    this.therapyOrderSet = new OrderSet();
    this.therapyOrderSet.addToExistingOrderSet = true;
    this.therapyOrderSet.existingOrderSetName = '';
    this.therapyOrderSet.definedCriteria = '';
    this.getOrderSetTypes();
  }

  private saveOrdersetPrescription(orderSetId: string, entities: Array<UpsertEntity>): void {

    let iteration = 0;

    this.prescriptions.forEach(p => {

      let orderSetPrescription = new OrdersetPrescription();
      // let attributeName = 'prescription_id';
      // let attributeValue = p.prescription_id;

      // this.subscriptions.add(
      //   this.apiRequest
      //     .getRequest(
      //       this.appService.baseURI +
      //       '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_ordersetprescription&synapseattributename=' +
      //       attributeName +
      //       '&attributevalue=' +
      //       attributeValue
      //     )
      //     .subscribe((response) => {
      //       let responseArray = JSON.parse(response);

      //       if (responseArray.length > 0) {
      //         orderSetPrescription.epma_ordersetprescription_id = responseArray[0].ordersetprescription_id;
      //         orderSetPrescription.ordersetid = orderSetId;
      //         orderSetPrescription.prescription_id = p.prescription_id;

      //       } else {
      //         orderSetPrescription.epma_ordersetprescription_id = uuid();
      //         orderSetPrescription.ordersetid = orderSetId;
      //         orderSetPrescription.prescription_id = p.prescription_id;
      //       }

      orderSetPrescription.epma_ordersetprescription_id = uuid();
      orderSetPrescription.ordersetid = orderSetId;
      orderSetPrescription.prescription_id = p.prescription_id;

      p.prescriptioncontext_id = this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Orderset).prescriptioncontext_id;
      entities.push(new UpsertEntity("local", "epma_ordersetprescription", orderSetPrescription));


      var presc = FormSettings.CleanAndCloneObject(p);
      //var med = FormSettings.CleanAndCloneObject(p.__medications[0]);
      var pos = FormSettings.CleanAndCloneObject(p.__posology[0]);
      (<Prescription>presc).linkedinfusionid = null;
      entities.push(new UpsertEntity("core", 'prescription', presc));

      p.__medications.forEach(m => {
        var med = FormSettings.CleanAndCloneObject(m);
        entities.push(new UpsertEntity('core', 'medication', med));
        m.__ingredients.forEach(mig => {
          entities.push(new UpsertEntity('core', 'medicationingredients', mig));
        });
        m.__codes.forEach(mcd => {
          entities.push(new UpsertEntity('core', 'medicationcodes', mcd));
        });
      });

      // entities.push(new UpsertEntity('core', 'medication', med));
      // entities.push(new UpsertEntity('core', 'medicationingredients', p.__medications[0].__ingredients));
      // entities.push(new UpsertEntity('core', 'medicationcodes', p.__medications[0].__codes));
      entities.push(new UpsertEntity('core', 'posology', pos));
      entities.push(new UpsertEntity('core', 'dose', p.__posology[0].__dose));
      entities.push(new UpsertEntity('core', "prescriptionroutes", p.__routes));

      iteration++;

      if (entities.length > 0 && iteration == this.prescriptions.length)
        this.CommitInTransaction(entities);
      // })
      //);
    });
  }

  private updateDefinedCriteriaForExistingOrderSet(criteria: string, incVal: number, exlVal: number): void {
    //let orderSets = [];
    let attributeName = 'defined_criteria';
    let attributeValue = criteria;

    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetListByAttribute?synapsenamespace=core&synapseentityname=prescriptionorderset&synapseattributename=' +
          attributeName +
          '&attributevalue=' +
          attributeValue
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);

          responseArray.filter(val => val.inclusive_value != incVal && val.exclusive_value != exlVal);

          for (let resp of responseArray) {
            resp.inclusive_value = incVal;
            resp.exclusive_value = exlVal;

            this.subscriptions.add(
              this.apiRequest
                .postRequest(
                  this.appService.baseURI +
                  '/PostObject?synapsenamespace=core&synapseentityname=prescriptionorderset',
                  resp,false
                )
                .subscribe((response) => {
                }
                )
            )
            //orderSets.push(resp);
          }
        }
        )
    );
  }
}

class UpsertEntity {
  constructor(public namespace?: string, public entityname?: string, public entity?: any) {
  }
}

export class EPMAGroups {
  selected: boolean
  groupname:string
}
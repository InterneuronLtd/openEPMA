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
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { FormSettings, Route } from 'src/app/components/prescribing-form/formhelper';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { Dose, Medication, Medicationcodes, Medicationingredients, Outpatientprescriptions, Posology, Prescription } from 'src/app/models/EPMA';
import { Product } from 'src/app/models/productdetail';
import { WarningContext, WarningContexts, WarningService } from 'src/app/models/WarningServiceModal';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { FormContext, PrescriptionContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-manage-lists',
  templateUrl: './manage-lists.component.html',
  styleUrls: ['./manage-lists.component.css']
})
export class ManageListsComponent implements OnInit, OnDestroy {

  showPrescribingForm = false;
  formsettings = new FormSettings();
  prescibingMedication: Product;
  editingPrescription: Prescription;
  subscriptions = new Subscription();
  PrescriptionBasket: Array<ListItem> = [];
  prescriptionContextId: string;
  // @ViewChild('open_pform') open_pform: ElementRef;
  // @ViewChild('close_pform') close_pform: ElementRef;

  @Output() cancelManageList = new EventEmitter();
  @Output() finishManageList = new EventEmitter();
  isFormSaving = false;


  listTypeTitle: string;
  @Input() formContext: FormContext;
  @Input() rContext: any
  @Input() dischargesummaryContext: any

  clonePrescription: boolean;
  isEditingfromOrderset: boolean;
  showaddtoorderset = false;
  @ViewChild('openordersetbtn') openordersetbtn: ElementRef;
  @ViewChild('closeordersetbtn') closeordersetbtn: ElementRef;
  @ViewChild('reloadorderset') reloadorderset: ElementRef;

  OrderSetPrescriptions: Array<Prescription> = [];
  os_ownerid = this.appService.loggedInUserName;
  os_personid = this.appService.personId;
  componentModuleData: ComponentModuleData;
  ws: WarningService

  constructor(public appService: AppService, public apiRequest: ApirequestService, public changeDetector: ChangeDetectorRef, private dr: DataRequest, private subjects: SubjectsService) {
  }

  GetOPWarningContext() {
    return [WarningContext.op, this.rContext["epma_outpatientprescriptions_id"]].join('_');
  }
  // setDummyContext() {
  //   let c = new Outpatientprescriptions();
  //   c.epma_outpatientprescriptions_id = "b5bf6ed7-734f-4fcc-b7d8-6669d4edce0f";
  //   c.locationcode = "banglore";
  //   c.locationtext = "banglore";
  //   c.person_id = "c8c654c5-9272-4324-b3f0-2cf8be9a9576";

  //   this.rContext = c;
  // }

  SetComponentModuleData() {
    this.componentModuleData = new ComponentModuleData();
    this.componentModuleData.elementTag = "app-warnings"
    this.componentModuleData.moduleContext.apiService = this.apiRequest;
    this.componentModuleData.moduleContext.personId = this.appService.personId;
    this.componentModuleData.moduleContext.refreshonload = true;
    this.componentModuleData.moduleContext.existingwarnings = false;
    this.componentModuleData.moduleContext.newwarnings = true;

    if (this.formContext == FormContext.op) {
      this.componentModuleData.moduleContext.encouterId = this.rContext["epma_outpatientprescriptions_id"];
      this.componentModuleData.moduleContext.warningContext = this.GetOPWarningContext();
      this.componentModuleData.moduleContext.enableOverride = true;
    }
    else if (this.formContext == FormContext.mod) {
      this.componentModuleData.moduleContext.encouterId = this.appService.encounter.encounter_id;
      this.componentModuleData.moduleContext.warningContext = WarningContext.mod;
      this.componentModuleData.moduleContext.enableOverride = true;
    }
    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;//"http://127.0.0.1:5500/dist/terminus-module-warnings/main.js"; // "https://csa6155a2f7abb5x42b5xbe7.blob.core.windows.net/terminusmodules/warnings.js";
  }

  ngOnInit(): void {
    // this.setDummyContext();
    console.log(this.rContext);
    if (this.rContext.hasOwnProperty("epma_medsonadmission_id"))
      this.formContext = FormContext.moa;
    else
      if (this.rContext.hasOwnProperty("epma_medsondischarge_id")) {
        this.formContext = FormContext.mod;
      }
      else if (this.rContext.hasOwnProperty("epma_outpatientprescriptions_id")) {
        this.formContext = FormContext.op;
        this.listTypeTitle = "Prescription"
        this.prescriptionContextId = this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Outpatient).prescriptioncontext_id;
      }

    if (this.formContext == FormContext.moa) {
      this.listTypeTitle = "Medications On Admission"
      this.prescriptionContextId = this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id;

    } else if (this.formContext == FormContext.mod) {
      this.prescriptionContextId = this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Discharge).prescriptioncontext_id;
      this.listTypeTitle = "Discharge Prescription"
    }
    this.SetComponentModuleData();
    this.InitializeList();
  }
  SortList() {
    let config = this.appService.appConfig.AppSettings.PrescribingForm;
    let configvalue = ""
    if (this.formContext == FormContext.moa) {
      configvalue = config.MOASortBy;
    }
    else if (this.formContext == FormContext.mod) {
      configvalue = config.MODSortBy;
    }
    else if
      (this.formContext == FormContext.op) {
      configvalue = config.OPBasketSortBy;
    }

    if (configvalue != undefined) {
      let parts = configvalue.split("::");
      let column = ""
      let entity = ""
      let order = "";
      if (parts.length == 1) {
        return;
      }
      else if (parts.length == 2) {
        entity = parts[0];
        column = parts[1];
        order = "asc"
      }
      else if (parts.length == 3) {
        entity = parts[0];
        column = parts[1];
        order = parts[2];
      }
      this.PrescriptionBasket.sort((a, b) => {
        let c1;
        let c2;

        if (entity.toLowerCase() == "prescription") {
          c1 = a.prescription[column];
          c2 = b.prescription[column];
        }
        else if (entity.toLowerCase() == "posology") {
          c1 = a.prescription.__posology[0][column];
          c2 = b.prescription.__posology[0][column];
        }
        else if (entity.toLowerCase() == "medication") {
          c1 = a.prescription.__medications.find(x => x.isprimary)[column];
          c2 = b.prescription.__medications.find(x => x.isprimary)[column];
        }

        if (c1 && c2) {
          if (moment.isDate(c1)) {
            if (order == "asc")
              return (moment(c1) > moment(c2)) ? 1 : ((moment(c2) > moment(c1) ? -1 : 0));
            else
              return (moment(c1) > moment(c2)) ? -1 : ((moment(c2) > moment(c1) ? 1 : 0));
          }
          else {
            if (order == "asc")
              return (c1 > c2) ? 1 : (c2 > c1 ? -1 : 0);
            else
              return (c1 > c2) ? -1 : (c2 > c1 ? 1 : 0);
          }
        }
        return 0;
      });
    }
  }

  saveOrderSet() {
    this.showaddtoorderset = true;
    // this.saveToOrderSetFromBasket = true;
    let cloneArray = this.getClonedPrescriptionArray(this.PrescriptionBasket);
    this.OrderSetPrescriptions = [];
    cloneArray.forEach(p => {
      this.OrderSetPrescriptions.push(p);
    });
    this.openordersetbtn.nativeElement.click();
  }

  getClonedPrescriptionArray(ar: any) {
    let clone = [];
    ar.forEach(p => {
      clone.push(this.ClonePrescription(p.prescription));
    });
    return clone;
  }

  InitializeList() {
    this.PrescriptionBasket = [];
    if (this.formContext == FormContext.op) {
      let opp = this.appService.optherapies.find(x => x.opid == this.rContext["epma_outpatientprescriptions_id"]);

      this.appService.Prescription.filter(p => p.prescriptioncontext_id == this.prescriptionContextId
        &&
        opp.opprescriptions.filter(x => x == p.prescription_id).length != 0
      ).forEach(p => {
        this.PrescriptionBasket.push(new ListItem(ListItemType.unchanged, p));
      });
    }
    else {
      this.appService.Prescription.filter(p => p.prescriptioncontext_id == this.prescriptionContextId).forEach(p => {
        this.PrescriptionBasket.push(new ListItem(ListItemType.unchanged, p));
      });
    }
    this.SortList();
  }

  onmedicationselected(e) {
    this.prescibingMedication = e;
    this.openInpatientPrescribingModal();
  }
  openInpatientPrescribingModal() {
    this.showPrescribingForm = true;
    this.changeDetector.detectChanges();
    //  this.open_pform.nativeElement.click();
  }
  closeInpatientPrescribingModal() {
    this.editingPrescription = null;
    this.prescibingMedication = null;
    this.showPrescribingForm = false;
    // this.close_pform.nativeElement.click();
    this.subjects.closePform.next();
  }

  BasketAction(e) {
    var index = this.PrescriptionBasket.findIndex((p) => { return p.prescription.prescription_id === e.prescription_id });

    if (index != -1) {
      if ((<string>e.action).toLowerCase() == "delete") {
        this.PrescriptionBasket[index].itemtype = ListItemType.delete;
      }
      else if ((<string>e.action).toLowerCase() == "edit") {
        this.editingPrescription = this.PrescriptionBasket[index].prescription;
        this.openInpatientPrescribingModal();
      }
      else if ((<string>e.action).toLowerCase() == "orderset") {
        var op = this.ClonePrescription(this.PrescriptionBasket[index].prescription, true);
        // this.saveToOrderSetFromBasket = false;
        this.OrderSetPrescriptions = [];
        this.OrderSetPrescriptions.push(op);
        this.OpenOrderSetModal();//invoke orderset ui template
      }
    }
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

    p1.__medications = new Array<Medication>();
    p1.__medications = [];
    p1.__posology = [];
    p1.person_id = person_id;
    p1.encounter_id = encounter_id;
    //p1.prescriptionstatus_id = null;


    p.__medications.forEach(m => {
      var mindex = p.__medications.indexOf(m);
      p1.__medications.push(<Medication>FormSettings.CleanAndCloneObject(m));
      p1.__medications[mindex].medication_id = uuid();
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
      });

      p1.__medications[mindex].__ingredients = new Array<Medicationingredients>();
      p1.__medications[mindex].__ingredients = [];
      m.__ingredients.forEach(ig => {
        var igindex = m.__ingredients.indexOf(ig);
        p1.__medications[mindex].__ingredients.push(<Medicationingredients>FormSettings.CleanAndCloneObject(ig));
        p1.__medications[mindex].__ingredients[igindex].medication_id = p1.__medications[mindex].medication_id;
        p1.__medications[mindex].__ingredients[igindex].medicationingredients_id = uuid();
      });
    });

    let pcurrposology = this.appService.GetCurrentPosology(p);
    p1.__posology.push(<Posology>FormSettings.CleanAndCloneObject(pcurrposology));
    // p1.__posology[0] = <Posology>FormSettings.CleanAndCloneObject(pos);
    p1.__posology[0].prescription_id = p1.prescription_id;
    p1.__posology[0].posology_id = uuid();
    p1.__posology[0].person_id = person_id;
    p1.__posology[0].encounter_id = encounter_id;

    p1.__posology[0].__dose = new Array<Dose>();
    p1.__posology[0].__dose = [];
    pcurrposology.__dose.forEach(d => {
      var dindex = pcurrposology.__dose.indexOf(d);
      p1.__posology[0].__dose.push(<Dose>FormSettings.CleanAndCloneObject(d));
      p1.__posology[0].__dose[dindex].dose_id = uuid();
      if (dindex > 0 && p.isinfusion)
        p1.__posology[0].__dose[dindex].continuityid = p1.__posology[0].__dose[0].dose_id;
      p1.__posology[0].__dose[dindex].posology_id = p1.__posology[0].posology_id;
      p1.__posology[0].__dose[dindex].prescription_id = p1.prescription_id;
    });
    p1.__routes = new Array<Route>();
    p1.__routes = [];
    p.__routes.forEach(r => {
      var rindex = p.__routes.indexOf(r);
      p1.__routes.push(<Route>FormSettings.CleanAndCloneObject(r));
      p1.__routes[rindex].medication_id = "";
      p1.__routes[rindex].prescription_id = p1.prescription_id;
      p1.__routes[rindex].prescriptionroutes_id = uuid();
    });

    this.appService.logToConsole(p);
    this.appService.logToConsole(p1);

    return p1;
  }

  AddPrescriptionToBasket(prescription: Prescription) {

    this.appService.logToConsole(prescription);
    prescription.prescriptioncontext_id = this.prescriptionContextId;

    var pindex = this.PrescriptionBasket.findIndex(x => x.prescription.prescription_id == prescription.prescription_id);
    if (pindex != -1)  //edit
    {
      //check if this is a saved prescription that was edited or a new prescription in the basket that was edited
      //if a new prescription in the basket was edited, formhelper would have tagged an oldcorrelation id in review object 
      //this old object doesnt exist in the database as this is a new prescription and not saved in db yet 
      //remove this oldcorrelationid
      //also remove the _editingprescription object from the new prescription

      if (this.PrescriptionBasket[pindex].itemtype == ListItemType.new) {
        prescription.__editingreviewstatus.oldcorrelationid = null;
        prescription.__editingreviewstatus.precriptionedited = false;
        prescription.__editingprescription = null;
        prescription.prescriptionstatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase().trim() == "active").prescriptionstatus_id;
        prescription.hasbeenmodified = false;
        //remove existing prescription
        this.PrescriptionBasket.splice(pindex, 1);
        //push edited prescription 
        this.PrescriptionBasket.push(new ListItem(ListItemType.new, prescription));

      }
      else {
        //remove existing prescription
        this.PrescriptionBasket.splice(pindex, 1);
        //push edited prescription 
        this.PrescriptionBasket.push(new ListItem(ListItemType.edit, prescription));
      }

    }
    else //new 
    {
      //push new prescription
      this.PrescriptionBasket.push(new ListItem(ListItemType.new, prescription));
    }
    this.prescibingMedication = null;
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.closeInpatientPrescribingModal();
    if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {
      this.GetwarningsForBasket();
    }

    this.SortList();
  }

  GetwarningsForBasket() {
    if (this.ws) {
      if (this.PrescriptionBasket.length == 0) {
        this.ws.ClearNewWarnings();
      }
      else {
        // if (this.appService.isTCI && !this.appService.encounter.sortdate) {
        //   let minposologystartdateexisting;
        //   let minposologystartdatenew = moment.min([].concat(...this.PrescriptionBasket.map(p => p.__posology)).map(pos => moment((<Posology>pos).prescriptionstartdate)));
        //   let existingposologydates = [].concat(...this.appService.GetCurrentPrescriptionsForWarnings().map(p => p.__posology.filter(pp => pp.prescriptionstartdate))).map(pos => (<Posology>pos).prescriptionstartdate);
        //   if (existingposologydates.length != 0) {
        //     minposologystartdateexisting = moment.min(existingposologydates);
        //   }
        //   else {
        //     minposologystartdateexisting = minposologystartdatenew;
        //   }
        //   this.appService.setPatientAgeAtAdmission(moment.min([minposologystartdateexisting, minposologystartdatenew]));
        // }

        this.ws.newWarningsStatus = false;
        this.ws.GetNewWarnings(this.PrescriptionBasket.filter(p => p.itemtype == ListItemType.new).map(p => p.prescription), this.PrescriptionBasket.filter(p => p.itemtype != ListItemType.delete && p.itemtype != ListItemType.new).map(p => p.prescription), this.appService.patientInfo, () => {
          this.ws.showExistingWarnings = false;
          this.ws.showNewWarnings = true;
        });
      }
    }
  }

  PrescribingCancelled() {
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.closeInpatientPrescribingModal();
  }

  Cancel() {
    if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {
      this.ws.ClearNewWarnings();
    }
    this.cancelManageList.emit();
  }

  SaveAllPrescriptions() {
    this.isFormSaving = true;
    this.formsettings.appService = this.appService;
    this.formsettings.apiRequest = this.apiRequest;
    this.formsettings.appService = this.appService;
    this.formsettings.subjects = this.subjects;
    let prescToSave = this.PrescriptionBasket.filter(x => x.itemtype == ListItemType.new || x.itemtype == ListItemType.edit);
    if (this.formContext == FormContext.op && prescToSave.length == 0) {
      this.PrescriptionBasket = [];
      this.finishManageList.emit();
    }
    else {
      this.subscriptions.add(this.formsettings.SaveprescriptionArray(
        prescToSave.
          map(e => e.prescription), this.formContext, this.rContext, this.dischargesummaryContext).subscribe(
            (t) => {
              if (t.status == true) {

                if ((this.formContext == FormContext.mod || this.formContext == FormContext.op) && this.ws) {
                  this.ws.CommitNewWarningsToDB((status, data, version = "") => {
                    this.appService.logToConsole("warnings committed");
                    if (status == "success") {
                      if (version) {
                        this.appService.UpdateDataVersionNumber({ "version": version });
                      }
                    }
                    else {
                      if (this.appService.IsDataVersionStaleError(data)) {
                        this.subjects.ShowRefreshPageMessage.next(data);
                      }
                    }
                  });
                }

                let deletelist = this.PrescriptionBasket.filter(x => x.itemtype == ListItemType.delete).
                  map(d => d.prescription);

                if (deletelist.length > 0) {
                  this.subscriptions.add(this.formsettings.DeleteReconciliationPrescriptionArray(
                    deletelist, this.formContext, this.rContext).subscribe(
                      (td) => {
                        this.RefreshAppServicePrescription();
                      }))
                }
                else {
                  this.RefreshAppServicePrescription();
                }
              }
              else {
                console.error(t.response);
              }
            }
          ));
    }
  }

  RefreshAppServicePrescription() {
    this.dr.getAllPrescription(() => {
      this.dr.getPharmacyReviewStatus(() => {
        this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => {
          this.PrescriptionBasket = [];
          this.finishManageList.emit();
        });

      })
    });
  }

  ShowWarnings() {
    if (this.formContext == FormContext.mod)
      this.subjects.showMODWarnings.next();
    else
      if (this.formContext == FormContext.op)
        this.subjects.showOPWarnings.next();
  }

  EditOrderSetPrescription(e: Prescription) {
    this.editingPrescription = this.ClonePrescription(e);
    this.clonePrescription = true;
    this.openInpatientPrescribingModal();
  }


  OpenOrderSetModal() {
    this.showaddtoorderset = true;
    this.openordersetbtn.nativeElement.click();
  }

  CloseOrderSetModal() {
    this.showaddtoorderset = false;
    this.closeordersetbtn.nativeElement.click();
    this.reloadorderset.nativeElement.click();
  }

  OnOrderSetCancelled() {
    //this.showaddtoorderset = false;
    this.CloseOrderSetModal();
  }

  OnOrderSetComplete() {
    this.CloseOrderSetModal();
  }

  OnOrderSetFailed(e) {
    this.CloseOrderSetModal();
  }

  OnWarningsModuleUnLoad(e: any) {

  }

  OnWarningsLoadComplete(e: WarningContexts) {
    if (this.formContext == FormContext.mod) {
      this.ws = e.GetWarningsInstance(WarningContext.mod);
      this.ws.ClearNewWarnings();
      console.log("mod new warnigns loaded")
      console.log(e);
    }
    else if (this.formContext == FormContext.op) {
      this.ws = e.GetWarningsInstance(this.GetOPWarningContext());
      this.ws.ClearNewWarnings();
      console.log("op new warnigns loaded")
      console.log(e);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}

class ListItem {
  constructor(public itemtype: ListItemType,
    public prescription: Prescription) {
  }
}

enum ListItemType {
  ["new"] = "new",
  ["edit"] = "edit",
  ["delete"] = "delete",
  ["unchanged"] = "unchanged"
}



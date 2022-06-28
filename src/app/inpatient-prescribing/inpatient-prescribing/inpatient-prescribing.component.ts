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
import { AfterContentInit, AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormSettings, Route } from 'src/app/components/prescribing-form/formhelper';
import { Dose, Medication, Medicationcodes, Medicationingredients, Posology, Prescription } from 'src/app/models/EPMA';
import { Product } from 'src/app/models/productdetail';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { PrescriptionContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import { ComponentModuleData } from 'src/app/directives/warnings-loader.directive';
import { WarningContext, WarningContexts, WarningService } from 'src/app/models/WarningServiceModal';
import moment from 'moment';


@Component({
  selector: 'app-inpatient-prescribing',
  templateUrl: './inpatient-prescribing.component.html',
  styleUrls: ['./inpatient-prescribing.component.css']
})
export class InpatientPrescribingComponent implements OnInit, OnDestroy, AfterViewInit, AfterContentInit {

  showPrescribingForm = false;
  formsettings = new FormSettings();
  @ViewChild('pf') pformdiv: ElementRef;
  prescibingMedication: Product;
  subscriptions = new Subscription();
  PrescriptionBasket: Array<Prescription> = [];
  OrderSetPrescriptions: Array<Prescription> = [];
  os_ownerid = this.appService.loggedInUserName;
  os_personid = this.appService.personId;
  @ViewChild('openordersetbtn') openordersetbtn: ElementRef;
  @ViewChild('closeordersetbtn') closeordersetbtn: ElementRef;
  @ViewChild('reloadorderset') reloadorderset: ElementRef;

  showaddtoorderset = false;
  @Output('cancel') cancelprescribing: EventEmitter<any> = new EventEmitter();
  @Output('finish') finishprescribing: EventEmitter<any> = new EventEmitter();
  @Input() editingPrescription: Prescription;
  @Input() clonePrescription: boolean;
  @Input() cloningExternally: boolean;
  isFormSaving = false;
  isEditingfromOrderset = false;
  // saveToOrderSetFromBasket = false;
  componentModuleData: ComponentModuleData;
  ws: WarningService
  canSelectNewMedication: boolean;
  warningsError: string;
  editingFromBasket = false;
  constructor(public appService: AppService, public apiRequest: ApirequestService, public changeDetector: ChangeDetectorRef, private dr: DataRequest, private subjects: SubjectsService) {
    this.subscriptions.add(
      this.subjects.recheckBasketWarnings.subscribe(() => {
        this.GetwarningsForBasket();
      }));
    this.SetComponentModuleData();
  }

  SetComponentModuleData() {
    this.componentModuleData = new ComponentModuleData();
    this.componentModuleData.elementTag = "app-warnings"
    this.componentModuleData.moduleContext.apiService = this.apiRequest;
    this.componentModuleData.moduleContext.encouterId = this.appService.encounter.encounter_id;
    this.componentModuleData.moduleContext.personId = this.appService.personId;
    this.componentModuleData.moduleContext.refreshonload = true;
    this.componentModuleData.moduleContext.existingwarnings = false;
    this.componentModuleData.moduleContext.newwarnings = true;

    this.componentModuleData.url = this.appService.appConfig.uris.warningscomponent;//"http://127.0.0.1:5500/dist/terminus-module-warnings/main.js"; // "https://csa6155a2f7abb5x42b5xbe7.blob.core.windows.net/terminusmodules/warnings.js";
  }
  ngAfterContentInit(): void {
  }

  ngAfterViewInit(): void {
    if (this.editingPrescription) {
      this.onmedicationselected(this.editingPrescription);
    }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit(): void {
    this.canSelectNewMedication = !this.cloningExternally;
  }

  onmedicationselected(e) {
    this.prescibingMedication = e;

    this.openInpatientPrescribingModal();
    // form.addEventListener("PrescriptionCreated", (p) => {
    //   this.AddPrescriptionToBasket(p);
    // });
    // this.pformdiv.nativeElement.appendChild(form);
    //this.openInpatientPrescribingModal();
    // this.appService.logToConsole(e);
  }

  AddPrescriptionToBasket(prescription: Prescription) {
    this.cloningExternally = false;
    this.appService.logToConsole(prescription);
    prescription.prescriptioncontext_id = this.appService.MetaPrescriptioncontext.find(x => x.context === PrescriptionContext.Inpatient).prescriptioncontext_id;
    this.PrescriptionBasket.push(prescription);
    this.SortList();
    this.closeInpatientPrescribingModal();
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.editingFromBasket = false;
    this.isEditingfromOrderset = false;
    this.GetwarningsForBasket();
  }
  GetwarningsForBasket() {
    if (this.ws) {
      if (this.PrescriptionBasket.length == 0) {
        this.ws.ClearNewWarnings();
      }
      else {
        if (this.appService.isTCI && !this.appService.encounter.sortdate) {
          let minposologystartdateexisting;
          let minposologystartdatenew = moment.min([].concat(...this.PrescriptionBasket.map(p => p.__posology)).map(pos => moment((<Posology>pos).prescriptionstartdate)));
          let existingposologydates = [].concat(...this.appService.GetCurrentPrescriptionsForWarnings().map(p => p.__posology.filter(pp => pp.prescriptionstartdate))).map(pos => (<Posology>pos).prescriptionstartdate);
          if (existingposologydates.length != 0) {
            minposologystartdateexisting = moment.min(existingposologydates);
          }
          else {
            minposologystartdateexisting = minposologystartdatenew;
          }
          this.appService.setPatientAgeAtAdmission(moment.min([minposologystartdateexisting, minposologystartdatenew]));
        }

        this.ws.newWarningsStatus = false;
        this.ws.GetNewWarnings(this.PrescriptionBasket, this.appService.GetCurrentPrescriptionsForWarnings(), this.appService.patientInfo, () => {
          this.ws.showExistingWarnings = false;
          this.ws.showNewWarnings = true;
        });
      }
    }
  }
  getClonedPrescriptionArray(ar: any) {
    let clone = [];
    ar.forEach(p => {
      clone.push(this.ClonePrescription(p));
    });
    return clone;
  }

  SaveAllPrescriptions(isEdit = false) {
    if (!isEdit && (!this.ws || !this.ws.newWarningsStatus || !this.ws.existingWarningsStatus)) {
      this.warningsError = "One or more high alerts require override."
    }
    else {
      this.warningsError = "";

      this.isFormSaving = true;
      this.formsettings.appService = this.appService;
      this.formsettings.apiRequest = this.apiRequest;
      this.formsettings.appService = this.appService;
      this.formsettings.subjects = this.subjects;

      this.subscriptions.add(this.formsettings.SaveprescriptionArray(this.PrescriptionBasket).subscribe(
        (t) => {
          if (t.status == true) {
            if (!isEdit) {
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
            this.dr.getAllPrescription(() => {
              this.dr.getPharmacyReviewStatus(() => {
                this.dr.getReminders(() => {
                  this.subjects.movePatientDrugs.next(this.PrescriptionBasket);
                  if (!isEdit) {
                    this.appService.UpdatePrescriptionWarningSeverity(this.appService.Prescription, () => { });
                  }
                  else {
                    this.appService.RefreshWarningsFromApi(() => {
                      // if (this.appService.warningServiceIPContext.existingWarningsStatus != true) {
                      //   this.subjects.showWarnings.next();
                      // }
                      this.subjects.showWarnings.next();
                    })
                  }
                  this.PrescriptionBasket = [];
                  this.finishprescribing.emit();
                })

              })

            });

          }
        }
      ));
    }
  }


  BasketAction(e) {
    var index = this.PrescriptionBasket.findIndex((p) => { return p.prescription_id === e.prescription_id });

    if (index != -1) {
      if ((<string>e.action).toLowerCase() == "delete") {
        this.PrescriptionBasket.splice(index, 1);
        this.GetwarningsForBasket();
      }
      else if ((<string>e.action).toLowerCase() == "orderset") {
        var op = this.ClonePrescription(this.PrescriptionBasket[index], true);
        // this.saveToOrderSetFromBasket = false;
        this.OrderSetPrescriptions = [];
        this.OrderSetPrescriptions.push(op);
        this.OpenOrderSetModal();//invoke orderset ui template
      }
      else if ((<string>e.action).toLowerCase() == "edit") {
        this.editingPrescription = this.ClonePrescription(this.PrescriptionBasket[index]);
        this.PrescriptionBasket.splice(index, 1);
        this.clonePrescription = true;
        this.editingFromBasket = true;
        this.openInpatientPrescribingModal();

      }
    }
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

  Cancel() {
    this.ws.ClearNewWarnings();
    this.cancelprescribing.emit();
  }

  PrescriptionCancelled() {

    if (this.clonePrescription && this.cloningExternally) {
      this.editingPrescription = null;
      this.clonePrescription = false;
      this.editingFromBasket = false;
      this.isEditingfromOrderset = false;
      this.closeInpatientPrescribingModal();
      this.cancelprescribing.emit();
    }
    if (this.clonePrescription && !this.isEditingfromOrderset) {
      this.PrescriptionBasket.push(this.ClonePrescription(this.editingPrescription));
      this.SortList();
    }
    if (this.editingPrescription && this.PrescriptionBasket.length == 0 && !this.clonePrescription) {
      this.editingPrescription = null;
      this.clonePrescription = false;
      this.editingFromBasket = false;
      this.isEditingfromOrderset = false;
      this.closeInpatientPrescribingModal();
      this.cancelprescribing.emit();
    }
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.editingFromBasket = false;
    this.isEditingfromOrderset = false;
    this.closeInpatientPrescribingModal();
  }

  @ViewChild('open_pform') open_pform: ElementRef;
  @ViewChild('close_pform') close_pform: ElementRef;

  closeInpatientPrescribingModal() {
    this.prescibingMedication = null;
    this.showPrescribingForm = false;
    //this.close_pform.nativeElement.click();
    this.subjects.closePform.next();

  }
  openInpatientPrescribingModal() {
    this.showPrescribingForm = true;
    this.changeDetector.detectChanges();
    //this.open_pform.nativeElement.click();
  }

  AddToOrderSet() {
  }

  AddToTherapyFromOrderset(event) {

    this.dr.GetNursingInstructionsAndCustomWarnings(event, () => {
      for (let pres of event) {
        this.PrescriptionBasket.push(this.ClonePrescription(pres));
        this.GetwarningsForBasket();
      }
    });
    this.SortList();
  }

  EditOrderSetPrescription(e: Prescription) {
    this.editingPrescription = this.ClonePrescription(e);
    this.clonePrescription = true;
    this.editingFromBasket = false;
    this.isEditingfromOrderset = true;
    this.openInpatientPrescribingModal();
  }

  clearBasket(): void {
    if (this.PrescriptionBasket.length > 0) {
      this.PrescriptionBasket = [];
      this.ws.ClearNewWarnings();
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

  OnWarningsModuleUnLoad(e: any) {

  }

  OnWarningsLoadComplete(e: WarningContexts) {
    this.ws = e.GetWarningsInstance(WarningContext.ip);
    this.ws.ClearNewWarnings();
    console.log("warnigns loaded")
    console.log(e);
  }


  SortList() {
    let config = this.appService.appConfig.AppSettings.PrescribingForm;
    let configvalue = config.IPBasketSortBy;

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
          c1 = a[column];
          c2 = b[column];
        }
        else if (entity.toLowerCase() == "posology") {
          c1 = a.__posology[0][column];
          c2 = b.__posology[0][column];
        }
        else if (entity.toLowerCase() == "medication") {
          c1 = a.__medications.find(x => x.isprimary)[column];
          c2 = b.__medications.find(x => x.isprimary)[column];
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
}

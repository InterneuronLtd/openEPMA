//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

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
import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { v4 as uuid } from 'uuid';
import { ComplianceAid, Prescription, PrescriptionMedicaitonSupply } from '../../models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { SubjectsService } from 'src/app/services/subjects.service';
import { DataRequest } from 'src/app/services/datarequest';
import moment from 'moment';
@Component({
  selector: 'app-record-patientdrug',
  templateUrl: './record-patientdrug.component.html',
  styleUrls: ['./record-patientdrug.component.css']
})
export class RecordPatientdrugComponent implements OnInit {
  subscriptions: Subscription = new Subscription();
  validationMessage: string = '';
  informationMessage: string = '';
  isSaving: boolean = false;
  typeOfMedicine: string;
  totalDose = 0;
  doseUnit = '';
  numberOfDays = 1;
  productType = '';
  complianceAidList: Array<ComplianceAid> = [];
  patientDrugs: PrescriptionMedicaitonSupply = new PrescriptionMedicaitonSupply();
  doseType: string;
  isInfusion: boolean = false;
  frequency: string;
  prescriptionId: string;
  medicationCode: string;
  therapyType: string;
  medicationFullName: string;
  startime: string = moment().format('HH:mm');
  startdate: string = moment().format('DD-MM-YYYY HH:mm');
  @Input('event') event: any;
  prescription: any;

  constructor(
    private apiRequest: ApirequestService,
    public appService: AppService,
    public subjects: SubjectsService,
    public dr: DataRequest
  ) { }

  ngOnInit(): void {
    this.init(this.event);
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  closePopup() {
    this.isSaving = false;
    this.subjects.closeAppComponentPopover.next(undefined);
  }

  init(preEvent: any) {
    this.appService.logToConsole(preEvent);
    this.isInfusion = false;
    this.startdate = moment().format('DD-MM-YYYY HH:mm');
   
    this.patientDrugs = new PrescriptionMedicaitonSupply();
    this.appService.checkMedicineTypeForMoa(preEvent.prescription) ? this.typeOfMedicine = 'Continued Medicine' : this.typeOfMedicine = 'New Medicine';
    this.doseType = this.appService.GetCurrentPosology(preEvent.prescription).dosetype;
    this.prescriptionId = preEvent.prescription.prescription_id;
    this.prescription = preEvent.prescription;
    this.medicationCode = preEvent.prescription.__medications[0].__codes.find(x => x.terminology == "formulary").code;
    if (preEvent.prescription.isinfusion || preEvent.prescription.ismedicinalgas) {
      this.isInfusion = true;
    }
    this.frequency = this.appService.GetCurrentPosology(preEvent.prescription).frequency;
 
    let medicationId = preEvent.prescription.__medications[0].medication_id;
    this.medicationFullName = [].concat(...this.appService.Prescription.map(p => p.__medications)).find(med => med.prescription_id == this.prescriptionId
      && med.medication_id == medicationId).name;

    this.productType = [].concat(...this.appService.Prescription.map(p => p.__medications)).find(med => med.prescription_id == this.prescriptionId
      && med.medication_id == medicationId).producttype;
    let medicationForm = [].concat(...this.appService.Prescription.map(p => p.__medications)).find(med => med.prescription_id == this.prescriptionId
      && med.medication_id == medicationId).form;

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
    this.getLatestDrugRecord();
  }

  onSave(): void {
    this.validationMessage = '';
    this.isSaving = false;
    this.informationMessage = '';
    if (!this.prescription.titration && !this.isInfusion && this.productType != 'VTM' && this.frequency != 'protocol' && this.doseType != 'descriptive') {
      if (this.patientDrugs.noofdays==null || this.patientDrugs.noofdays<0) {
        this.validationMessage = 'Invalid days.';
        return;
      }
    }
    if (this.patientDrugs.availablequantity == null || +this.patientDrugs.availablequantity < 0) {
      this.validationMessage = 'Invalid available quantity.';
      return;
    }
    if (this.patientDrugs.availablequantity.toString().indexOf('.') > -1) {
      if (this.patientDrugs.availablequantity.toString().split('.')[1].length > 2) {
        this.validationMessage = 'Quantity should be of format nn.nn.';
        return;
      }
    }
    // if (typeof this.patientDrugs.resupplyfrom === 'undefined' || this.patientDrugs.resupplyfrom == null) {
    //   this.validationMessage = 'Please select the resupply from.';
    // }
    if (this.validationMessage == '') {
      this.isSaving = true;
      if (this.patientDrugs.epma_prescriptionmedicaitonsupply_id == "") {
        this.patientDrugs.epma_prescriptionmedicaitonsupply_id = uuid();
        this.patientDrugs.lastmodifiedby = this.appService.loggedInUserName;
        this.patientDrugs.createdby = this.appService.loggedInUserName;
        this.patientDrugs.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
        this.patientDrugs.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      } else {
        this.patientDrugs.lastmodifiedby = this.appService.loggedInUserName;
        this.patientDrugs.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      }      
      let entrydate =  moment(this.startdate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
      this.patientDrugs.quantityentrydate = this.appService.getDateTimeinISOFormat(moment(entrydate,'YYYY-MM-DD HH:mm').toDate());
      this.patientDrugs.prescriptionid = this.prescriptionId;
      this.patientDrugs.prescribedmedicationid = this.medicationCode;
      this.patientDrugs.selectedproductcode = '';
      this.patientDrugs.selectproductcodetype = '';
      this.patientDrugs.updatesouce = 'Form';
      this.patientDrugs.person_id = this.appService.personId;
      this.patientDrugs.encounter_id = this.appService.encounter.encounter_id;
      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
        "/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply", JSON.stringify(this.patientDrugs), false)
        .subscribe((saveResponse) => {
          this.appService.UpdateDataVersionNumber(saveResponse);
          this.informationMessage = 'Patient drugs updated.';
          this.isSaving = false;
          this.dr.GetMedicationSupply(() => {
            this.dr.GetMedicationSupplyHistory(this.patientDrugs.prescriptionid ,(data)=>{});
            this.subjects.refreshTemplate.next(undefined);
            setTimeout(() => {
              this.subjects.closeAppComponentPopover.next(undefined);
            }, 1500);
          });
        },(error) => {
          this.isSaving = false;
          this.subjects.closeAppComponentPopover.next(undefined);
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
      )
    }
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  /* Calculate the available quantity for the days */
  daysChange(event): void {
    let doseArray = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(dos => dos.prescription_id == this.prescriptionId);
    if (this.isInfusion || this.productType == 'VTM' || this.frequency == 'protocol' || this.doseType == 'descriptive') {
      this.patientDrugs.quantityunits = "Product packs";
    }
    this.totalDose = 0;
    for (let dose of doseArray) {
      if (dose.dosesize && dose.doseunit) {
        this.totalDose += +dose.dosesize;
        this.patientDrugs.quantityunits = dose.doseunit;
      } else if (dose.strengthdenominator) {
        this.totalDose += +dose.strengthdenominator;
        this.patientDrugs.quantityunits = dose.strengthdenominatorunit;
      } else {
        this.patientDrugs.quantityunits = "Product packs";
      }
    }
    this.patientDrugs.availablequantity = (this.totalDose * event.target.value).toFixed(2).replace(/\.00$/, '');
  }

  /* Calculate the days for which the drug is available */
  quantityChange(event): void {
    let doseArray = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(dos => dos.prescription_id == this.prescriptionId);
    if (this.isInfusion || this.productType == 'VTM' || this.frequency == 'protocol' || this.doseType == 'descriptive') {
      this.patientDrugs.quantityunits = "Product packs";
    }
    this.totalDose = 0;
    for (let dose of doseArray) {
      if (dose.dosesize && dose.doseunit) {
        this.totalDose += +dose.dosesize;
        this.patientDrugs.quantityunits = dose.doseunit;
      } else if (dose.strengthdenominator) {
        this.totalDose += +dose.strengthdenominator;
        this.patientDrugs.quantityunits = dose.strengthdenominatorunit;
      } else {
        this.patientDrugs.quantityunits = "Product packs";
      }
    }
    this.patientDrugs.noofdays = +(event.target.value / this.totalDose).toFixed(1);
  }
  
  /* To get the drug details for the prescription and medication id */
  private getLatestDrugRecord(): void {
    this.totalDose = 0;
    this.validationMessage = '';
    this.informationMessage = '';
    this.patientDrugs = new PrescriptionMedicaitonSupply();
    this.patientDrugs.quantityentrydate = moment().format('DD-MM-YYYY HH:mm');
    let doseArray = [].concat(...this.appService.Prescription.map(p => this.appService.GetCurrentPosology(p).__dose)).filter(dos => dos.prescription_id == this.prescriptionId);
    for (let dose of doseArray) {
      if (dose.dosesize && dose.doseunit) {
        this.totalDose += +dose.dosesize;
        this.patientDrugs.quantityunits = dose.doseunit;
      } else if (dose.strengthdenominator) {
        this.totalDose += +dose.strengthdenominator;
        this.patientDrugs.quantityunits = dose.strengthdenominatorunit;
      } else {
        this.patientDrugs.quantityunits = "Product packs";
      }
    }
    this.totalDose = this.totalDose ? +this.totalDose.toFixed(2).replace(/\.00$/, '') : null;
    this.patientDrugs.epma_prescriptionmedicaitonsupply_id = "";
    this.patientDrugs.noofdays = null;
    this.patientDrugs.complianceaid = null;
    let patientdrug = this.appService.PrescriptionMedicaitonSupply.slice().find(x => x.prescriptionid == this.prescriptionId);
    if (patientdrug) {
      this.patientDrugs = patientdrug;
      this.startdate = moment(this.patientDrugs.quantityentrydate).format('DD-MM-YYYY HH:mm');
      if (this.productType != 'VTM') {
        this.patientDrugs.noofdays = +(+this.patientDrugs.availablequantity / this.totalDose).toFixed(1);
      } else {
        this.patientDrugs.noofdays = patientdrug.noofdays;
      }
    }
  }
}

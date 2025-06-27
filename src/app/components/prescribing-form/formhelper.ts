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
import { Detail, FormularyIngredient, Product } from 'src/app/models/productdetail';
import * as moment from 'moment'
import { Dose, Epma_Dischargesummarry, Epma_Medsonadmission, Epma_Medsondischarge, Epma_Moaprescriptions, Epma_Modprescriptions, Medication, Medicationcodes, Medicationingredients, MetaPrescriptioncontext, MetaReviewstatus, NursingInstruction, Opprescriptiontherapies, Posology, Prescription, PrescriptionIndication, Prescriptionreminders, Prescriptionreviewstatus, Prescriptionroutes, PrescriptionSource, Outpatientprescriptions } from 'src/app/models/EPMA';
import { v4 as uuid } from 'uuid';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { Observable, Subject, Subscription } from 'rxjs';
import { PrescribingFormComponent } from './prescribing-form.component';
import { Injectable, OnDestroy } from '@angular/core';
import { DoseType, InfusionType, FrequencyType, IntervalType, DoseForm, DaysOfWeek, FormContext, ReconciliationListActions, PrescriptionContext, Common } from 'src/app/services/enum';
import { FormGroup } from '@angular/forms';
import { SubjectsService } from 'src/app/services/subjects.service';

// TODO: Add Angular decorator.
@Injectable()
export class FormSettings implements OnDestroy {


  dose_units: string;
  dose_strength_neumerator_units: string;
  dose_strength_denominator_units: string;
  dose_strength_neumerator: number;
  dose_strength_denominator: number;
  dose_type: DoseType;
  isInfusion: boolean
  infusionType: InfusionType;
  frequency_type: FrequencyType;
  interval_type: IntervalType = IntervalType.standard;
  dosing_pattern: Array<Timeslot> = [];
  protocol_dosing_pattern: Array<ProtocolInterval> = [];
  infusion_rate_pattern: Array<InfusionRate> = [];
  routes: Array<Route> = [];
  oxygenprescriptionadditionalinfo = [];
  daysofweek: Array<CheckboxControl> = [];
  additionalconditions: Array<CheckboxControl> = [];
  indications: Array<Indication> = [];
  sources: Array<Source> = [];
  baseuri: string;
  diluents: Array<Diluent> = []
  subscriptions = new Subscription();
  isAntibiotic = false;
  isAntiviral = false;
  BNFCode: any;
  ATCGroup: any;
  titrationType: any;
  linkedinfusionid: string;
  isOxygen = false;
  infusionrateunits = "ml/h"
  isNeumeratorOnlyStrength = false;
  singleIngredientStrength = "";
  roundingfactor: number;
  precision = 2;
  currentreviewstatus: MetaReviewstatus = new MetaReviewstatus();
  uom: string;
  vtm_dose_units = [];
  notforprn = false;
  moatoip = false;
  titrationUnits: string;
  titrateMinAllowed: number;
  titrateMaxAllowed: number;
  vtmstyle: boolean = false;
  isPrimaryRouteIV: boolean = false;
  isPrimaryMedicationUOMLiquid: boolean;
  nursinginstructions: any[];
  vtmstyleVolumeUnits: string;
  vtmstyleDoseToVolumeRatio = 1;
  originalcreatedon: any;
  prnMaxDose_TimeSlot: Timeslot;
  formContext: FormContext;

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


  resetDoseType() {
    this.dose_units = undefined;
    this.dose_strength_neumerator_units = undefined;
    this.dose_strength_denominator_units = undefined;;
    this.dose_strength_neumerator = undefined;
    this.dose_strength_denominator = undefined;
    this.dose_type = undefined;
    this.infusionrateunits = "ml/h";
    this.isOxygen = false;
    this.vtm_dose_units = [];
    this.isNeumeratorOnlyStrength = false;
    this.singleIngredientStrength = "";

  }
  SetDoseType(route = null) {
    this.resetDoseType();
    var m = this.medication;
    this.uom = m.detail.unitDoseUnitOfMeasureDesc;
    var doseFormType = m.detail.doseFormCd;

    this.notforprn = m.detail.notForPrn ? +m.detail.notForPrn != 0 : false;

    if (!this.medication.detail.prescribable) {
      return "This medication is not prescribable";
    }
    else if (route && route.toLowerCase() == "inhalation" && m.formularyIngredients.length == 1 && (m.formularyIngredients[0].ingredientName ?? "").toLowerCase() == "oxygen" && (doseFormType == DoseForm.Continuous || doseFormType == DoseForm.NA)) {
      this.dose_type = DoseType.units;
      this.dose_units = "L/min";
      this.infusionrateunits = "L/min";
      this.isOxygen = true;
    }
    else if (!this.medication.formularyIngredients || (this.medication.formularyIngredients && this.medication.formularyIngredients.length == 0)) {
      this.dose_type = DoseType.descriptive;
    }
    else
      if (this.medication.productType.toLowerCase() == "vtm" || this.vtmstyle) {

        var ing = this.medication.formularyIngredients;
        if (ing.length > 0) {

          //new logic - create an arry to bind to a dropdownlist of dose units

          this.vtm_dose_units = [...new Set(ing.map(ig => ig.strengthValueNumeratorUnitDesc))]; //get distinct values using Set 

          this.vtm_dose_units.sort();
          let emptyneumerators = this.vtm_dose_units.filter(x => FormSettings.IsNullOrEmpty(x) == true);
          if (this.vtm_dose_units.length != 0 && emptyneumerators.length == 0) {
            this.dose_type = DoseType.units;
          }
          else // there is at least one ingredient with value for no strength neumerator  - use unit dose form units if available 
            if (!FormSettings.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //units available
            {
              this.dose_type = DoseType.units;
              this.vtm_dose_units = [];
              this.vtm_dose_units.push(m.detail.unitDoseFormUnitsDesc);
            }
            else
              this.dose_type = DoseType.descriptive;

        }
        if (this.medication.productType.toLowerCase() != "vtm" && FormSettings.IsNullOrEmpty(this.vtmstyleVolumeUnits)) {
          this.SetVTMStyleVolumeUnits();
        }
      }
      else
        if (doseFormType == DoseForm.NA) {
          this.dose_type = DoseType.descriptive;
        }
        else
          if (doseFormType == DoseForm.Continuous) {
            this.dose_type = DoseType.descriptive;
          }
          else
            if (doseFormType == DoseForm.Discrete) {
              //whenever there is strength denomninator unit - and there is one ingredient -  use dose/volume - if not  - use quantity/units
              var ingredients = this.medication.formularyIngredients;
              if (ingredients && ingredients.length == 1) // one ingredient 
              {
                var strength_value_denominatorunits = ingredients[0].strengthValueDenominatorUnitDesc;
                var strength_value_neumeratorunits = ingredients[0].strengthValueNumeratorUnitDesc;

                var strength_value_denominator = ingredients[0].strengthValueDenominator;
                var strength_value_neumerator = ingredients[0].strengthValueNumerator;

                if (!FormSettings.IsNullOrEmpty(strength_value_denominatorunits) && strength_value_denominatorunits.toLowerCase() == "ml" && !this.IsBasicFluid() && !((this.medication.detail.formDesc ?? "").toLowerCase().includes("oral solution")))//one ingredient and strength denominator units available
                {
                  this.dose_type = DoseType.strength;
                  this.dose_strength_neumerator_units = strength_value_neumeratorunits;
                  this.dose_strength_denominator_units = strength_value_denominatorunits;

                  this.dose_strength_neumerator = +strength_value_neumerator;
                  this.dose_strength_denominator = +strength_value_denominator;
                }
                else
                  if (!FormSettings.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //one ingredient and units available
                  {
                    this.dose_type = DoseType.units;
                    this.dose_units = m.detail.unitDoseFormUnitsDesc;
                    if (m.productType.toLowerCase() != "custom" && !this.IsBasicFluid()) {
                      let skipNeumeratorOnlyStrength = false
                      const config = this.appService.appConfig.AppSettings.PrescribingForm.SkipQtyToDoseConversionForCodes;
                      if (config && Array.isArray(config)) {
                        if (config.filter(x => x == this.medication.code).length != 0)
                          skipNeumeratorOnlyStrength = true;
                      }
                      if (!ingredients[0].strengthValueNumeratorUnitDesc || !ingredients[0].strengthValueNumerator) {
                        skipNeumeratorOnlyStrength = true;
                      }
                      if (!skipNeumeratorOnlyStrength) {
                        this.isNeumeratorOnlyStrength = true;
                        this.singleIngredientStrength = ingredients[0].strengthValueNumeratorUnitDesc;
                      }
                    }
                  }
                  else  //discrete and one ingredient and strength and units not available
                    this.dose_type = DoseType.descriptive;

              }
              else // more than one ingredient
                if (!FormSettings.IsNullOrEmpty(m.detail.unitDoseFormUnitsDesc))  //multiple ingredients and units available
                {
                  this.dose_type = DoseType.units;
                  this.dose_units = m.detail.unitDoseFormUnitsDesc;
                }
                else  //discrete and multiple ingredienst and strength and units not available
                  this.dose_type = DoseType.descriptive;
            }

    this.SetRoundingFactor();

    if (this.medication.productType.toLowerCase() != "vtm" && !this.vtmstyle) {
      this.SetIsPrimaryMedicationUOMLiquid();
    }
  }

  SetVTMStyleVolumeUnits() {
    if (this.medication.detail.doseFormCd == DoseForm.Discrete) {
      var ingredients = this.medication.formularyIngredients;
      if (ingredients && ingredients.length == 1) // one ingredient 
      {
        var strength_value_denominatorunits = ingredients[0].strengthValueDenominatorUnitDesc;
        if (!FormSettings.IsNullOrEmpty(strength_value_denominatorunits) && strength_value_denominatorunits.toLowerCase() == "ml") {
          this.vtmstyleVolumeUnits = strength_value_denominatorunits;
          this.vtmstyleDoseToVolumeRatio = (+ingredients[0].strengthValueDenominator) / (+ingredients[0].strengthValueNumerator);
        }
        else
          if (!FormSettings.IsNullOrEmpty(this.medication.detail.unitDoseFormUnitsDesc))  //one ingredient and units available
          {
            this.vtmstyleVolumeUnits = this.medication.detail.unitDoseFormUnitsDesc;
            this.vtmstyleDoseToVolumeRatio = 1;

          }
          else {
            this.vtmstyleVolumeUnits = "na"
          }
      }
      else // more than one ingredient
        if (!FormSettings.IsNullOrEmpty(this.medication.detail.unitDoseFormUnitsDesc))  //multiple ingredients and units available
        {
          this.vtmstyleVolumeUnits = "na" //this.medication.detail.unitDoseFormUnitsDesc;
          this.vtmstyleDoseToVolumeRatio = 1;

        }
    }
  }

  IsBasicFluid() {
    return this.medication.formularyAdditionalCodes && (this.medication.formularyAdditionalCodes.filter(x => x.additionalCodeSystem == "Custom" && x.additionalCode == "BASIC_FLUID").length != 0);
  }

  SetIsPrimaryMedicationUOMLiquid() {
    var isliquid = false;
    if (this.dose_type == DoseType.strength) {
      if (this.dose_strength_denominator_units.toLowerCase() == "ml" || this.dose_strength_neumerator_units.toLowerCase() == "ml"
        || this.dose_strength_denominator_units.toLowerCase() == "litre" || this.dose_strength_neumerator_units.toLowerCase() == "litre")
        isliquid = true;
    }
    else if (this.dose_type == DoseType.units)
      if (this.dose_units.toLowerCase() == "ml" || this.dose_units.toLowerCase() == "litre")
        isliquid = true;

    this.isPrimaryMedicationUOMLiquid = isliquid;
  }

  public GetMostFrequentVTMUnit(code, form: FormGroup, cb: () => any) {
    if (this.vtmstyle) {
      if (this.vtm_dose_units.length == 1) {
        this.dose_units = this.vtm_dose_units[0];
      }
      else {
        var ing = this.medication.formularyIngredients;
        this.dose_units = this.GetMostFrequentElementInArray(ing.map(ig => ig.strengthValueNumeratorUnitDesc));
      }
      if (form) form.get('posology.strength.dose_units').setValue(this.dose_units);
      this.SetIsPrimaryMedicationUOMLiquid();
      cb();
    }
    else {
      this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetBaseViewListObjectByAttribute/epma_frequentvtmunit?&synapseattributename=code&attributevalue=" + code).subscribe(
        (response) => {
          let responseArray = JSON.parse(response);
          if (responseArray && responseArray.doseunit) {
            this.dose_units = responseArray.doseunit.toString().trim();
            if (form) form.get('posology.strength.dose_units').setValue(this.dose_units);
            this.SetIsPrimaryMedicationUOMLiquid();
            cb();
          }
          else {
            var ing = this.medication.formularyIngredients;
            this.dose_units = this.GetMostFrequentElementInArray(ing.map(ig => ig.strengthValueNumeratorUnitDesc));
            if (form) form.get('posology.strength.dose_units').setValue(this.dose_units);
            this.SetIsPrimaryMedicationUOMLiquid();
            cb();
          }
        }
      ));
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
    console.log("Most Frequent Item is:", mostFreq);
    return mostFreq;
  }

  SetRoundingFactor() {
    var rf = +this.medication.detail.roundingFactorDesc;
    if (isNaN(rf) || rf <= 0) {
      var code = +this.medication.detail.roundingFactorCd;
      if (code == 1) {
        rf = 0.5;
      }
      else if (code == 2) {
        rf = 1;
      }
      if (!isNaN(rf) && rf > 0)
        this.roundingfactor = rf;
    }
  }

  SetOtherProperties() {
    this.ATCGroup = "Others";
    if (this.medication.formularyAdditionalCodes) {
      this.isAntibiotic = this.medication.formularyAdditionalCodes.filter(x =>
        (x.additionalCodeDesc ?? "").toString().toLowerCase().indexOf("antibacterial") != -1
        && x.additionalCodeSystem.toString().toLowerCase() == 'fdb').length != 0;

      this.isAntiviral = this.medication.formularyAdditionalCodes.filter(x =>
        (x.additionalCodeDesc ?? "").toString().toLowerCase().indexOf("antiviral") != -1
        && x.additionalCodeSystem.toString().toLowerCase() == 'fdb').length != 0;

      var bnf = this.medication.formularyAdditionalCodes.find(x =>
        (x.additionalCodeSystem ?? "").toString().toLowerCase() == 'bnf');
      if (bnf)
        this.BNFCode = bnf.additionalCode;

      var atc = this.medication.formularyAdditionalCodes.find(x =>
        (x.additionalCodeSystem ?? "").toString().toLowerCase() == 'atc');
      if (atc && atc.additionalCode.length >= 3)
        this.ATCGroup = atc.additionalCode.toString().substring(0, 3);
    }
    //titration 

    this.titrationType = this.medication.detail.titrationTypes;
    if (this.titrationType && this.titrationType.length > 0) {
      let additionalProperties = this.titrationType[0].additionalProperties;
      if (additionalProperties) {
        let additionalProperties_parsed = JSON.parse(additionalProperties);
        if (additionalProperties_parsed && additionalProperties_parsed.units && Array.isArray(additionalProperties_parsed.units))
          this.titrationUnits = additionalProperties_parsed.units[0];
        if (additionalProperties_parsed && additionalProperties_parsed.tmin && +additionalProperties_parsed.tmin >= 0)
          this.titrateMinAllowed = +additionalProperties_parsed.tmin;
        if (additionalProperties_parsed && additionalProperties_parsed.tmax && +additionalProperties_parsed.tmax >= 0)
          this.titrateMaxAllowed = +additionalProperties_parsed.tmax;
      }
    }
  }

  SetReviewStatus(editingprescription?: Prescription) {
    if (editingprescription) {

      let ct = this.appService.MetaPrescriptioncontext.find(x => x.prescriptioncontext_id == editingprescription.prescriptioncontext_id);
      let contexttype = "inpatient"
      if (ct)
        contexttype = ct.context;
      if (contexttype.toLowerCase() == PrescriptionContext.Inpatient.toLowerCase() || contexttype.toLowerCase() == PrescriptionContext.Discharge.toLowerCase()) {
        let response = this.appService.Prescriptionreviewstatus.filter(x => x.prescription_id == editingprescription.prescription_id);
        let responseArray = response.sort((a, b) => new Date((<Prescriptionreviewstatus>b).modifiedon).getTime() - new Date((<Prescriptionreviewstatus>a).modifiedon).getTime());

        if (responseArray && responseArray.length > 0) {
          let currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.reviewstatus_id == (<Prescriptionreviewstatus>responseArray[0]).status);

          if (currentreviewstatus.status.toLowerCase() != "grey") {
            this.currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "amber");
          }
          else
            this.currentreviewstatus = currentreviewstatus;
        }
        else {
          if (editingprescription.hasbeenmodified)
            this.currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "amber");
          else
            this.currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "grey");
        }
      }
      else {
        this.currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "grey");
      }

    }
    else {
      this.currentreviewstatus = this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "grey");
    }

    console.log(this.currentreviewstatus);


  }





  MedicationHasFlag(flag, m?: Product) {
    if (!m)
      m = this.medication;

    return this.appService.MedicationHasFlag(flag, m);
  }

  SetOxygenAdditionalInfo() {
    Object.assign(this.oxygenprescriptionadditionalinfo, this.appService.oxygenprescriptionadditionalinfo)
    for (const info of this.oxygenprescriptionadditionalinfo) {
      info.isChecked = false;
    }
  }

  SetRoutes(editingCustomMedicationPrescription: Prescription, formc: PrescribingFormComponent) {
    this.routes = []

    if (this.medication.productType.toLowerCase() == "custom") {
      var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Terminology/getdmdroutelookup"
      this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}`)
        .subscribe((response) => {
          if (response && response.length != 0) {
            for (const rt of response) {
              const prt = new Route();
              prt.route = rt.desc;
              prt.routecode = rt.cd
              prt.isChecked = false;
              prt.isPrimary = false;
              this.routes.push(prt);
            }
          }
          else { this.appService.logToConsole("no forms") }
          if (editingCustomMedicationPrescription) {
            editingCustomMedicationPrescription.__routes.forEach(pr => {
              //set route checked, primary 
              var r = this.routes.find(x => x.routecode == pr.routecode);
              if (r) {
                r.isChecked = true;
                r.isPrimary = pr.isdefault;
              }
            });
            formc.prescription.get('routes').updateValueAndValidity();
            formc.prescription.get('routes').markAsTouched({ onlySelf: true });
          }
        }));

    } else {
      if (this.medication.formularyRouteDetails) {
        const mroutes = this.medication.formularyRouteDetails;
        for (const rt of mroutes) {
          const prt = new Route();
          if (rt.routeDesc.toLowerCase().trim() == "route of administration not applicable") {
            prt.route = "N/A";
          }
          else {
            prt.route = rt.routeDesc;
          }
          prt.routecode = rt.routeCd
          prt.isChecked = false;
          prt.isPrimary = false;
          prt.isunlicensed = +rt.routeFieldTypeCd == 2;
          this.routes.push(prt);
        }
        // //Test route 1
        // const prt = new Route();
        // prt.route = "Buccal";
        // prt.routecode = "buccal";
        // prt.isChecked = false;
        // prt.isPrimary = false;
        // this.routes.push(prt);

        // //Test route 2
        // const prt1 = new Route();
        // prt1.route = "Occular";
        // prt1.routecode = "Occular";
        // prt1.isChecked = false;
        // prt1.isPrimary = false;
        // this.routes.push(prt1);
      }
    }
  }

  SetIndications() {
    if (this.medication.detail.licensedUses)
      this.medication.detail.licensedUses.forEach(el => {
        let pi = new Indication();
        pi.code = el.cd;
        pi.indication = el.desc;
        pi.islicensed = true;
        pi.selected = false;
        this.indications.push(pi);
      });
    if (this.medication.detail.unLicensedUses)
      this.medication.detail.unLicensedUses.forEach(el => {
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

  SetPrescriptionSources() {
    Object.assign(this.sources, this.appService.MetaPrescriptionSource)
    for (const src of this.sources) {
      src.selected = false;
    }
  }



  SetDaysOfWeek() {
    this.daysofweek = [];
    var days = Object.keys(DaysOfWeek);
    days.forEach(d => {
      const c = new CheckboxControl();
      c.isChecked = false;
      c.name = DaysOfWeek[d];
      c.value = d;
      this.daysofweek.push(c);
    });
  }

  SetAdditionalConditions() {
    this.additionalconditions = [];
    this.appService.MetaPrescriptionadditionalcondition.forEach(d => {
      const c = new CheckboxControl();
      c.isChecked = false;
      c.name = d.additionalcondition
      c.value = d.prescriptionadditionalconditions_id
      this.additionalconditions.push(c);
    });
  }


  static GenerateCustomProduct(m: Medication): Product {
    var p = new Product;
    p.detail = new Detail();
    p.detail.prescribable = true;
    p.productType = "custom";
    p.formularyIngredients = [];
    p.code = m.name;
    p.detail.formularyVersionId = "custom";
    p.name = m.name;
    p.detail.formDesc = m.form;
    p.detail.roundingFactorDesc = 1;
    p.detail.atcCode = "";
    if (m.__ingredients[0].strengthneumerator)
      p.detail.unitDoseFormUnitsDesc = m.__ingredients[0].strengthneumeratorunit.toString();
    p.detail.unitDoseUnitOfMeasureDesc = "";

    if (m.__ingredients[0].strengthneumerator || m.__ingredients[0].strengthdenominator)
      p.detail.doseFormCd = "1";
    else
      p.detail.doseFormCd = "3";

    //push ingredient
    var f = new FormularyIngredient();
    f.strengthValueNumerator = m.__ingredients[0].strengthneumerator.toString();
    f.strengthValueDenominator = m.__ingredients[0].strengthdenominator.toString();
    f.strengthValueNumeratorUnitDesc = m.__ingredients[0].strengthneumeratorunit.toString();
    f.strengthValueDenominatorUnitDesc = m.__ingredients[0].strengthdenominatorunit.toString();
    f.formularyVersionId = "custom";
    f.ingredientName = m.name;
    f.ingredientCd = m.name;
    p.formularyIngredients.push(f);

    return p;
  }

  SetPrimaryDiscretionaryRoute(e, rt: Route) {
    const checkedcount = this.routes.filter(x => x.isChecked == true).length;
    var checked = false;
    if (this.medication.productType.toLowerCase() == "custom")
      checked = e;
    else
      checked = e.target.checked;

    if (checked) {
      rt.isChecked = true;
      if (checkedcount == 0) {
        rt.isPrimary = true;
      }
      else if (checkedcount >= 1) {//fix: EPMA-3103
        //if a primary route is added again, it should not change it to non primary in case of array based route lookup and add. 
        if (this.medication.productType.toLowerCase() == "custom") {
          if (!rt.isPrimary) {
            rt.isPrimary = false;
          }
        }
        else {
          rt.isPrimary = false;
        }
      }
    }
    else {
      if (rt.isPrimary) {
        this.routes.forEach((r) => {
          r.isChecked = false; r.isPrimary = false;
        });
      }
      else {
        rt.isChecked = false;
        rt.isPrimary = false;
      }
    }
  }

  constructor()
  constructor(public medication?: Product, public apiRequest?: ApirequestService, public appService?: AppService, public subjects?: SubjectsService) {
    medication = medication;
  }

  static IsNullOrEmpty(o: string) {
    if (o === undefined || o == null)
      return true;
    else if (o.trim() === "")
      return true;

    return false;
  }

  GenerateIntervalPattern(frequency, frequencysize, starttime?: Timeslot) {
    if (frequency) {
      this.appService.logToConsole("inside pattern function")
      var numberofslots = 0;
      let config = this.appService.appConfig.AppSettings.PrescribingForm.IntervalPresets;

      if (frequency.toLowerCase() == FrequencyType.stat) {
        if (!starttime) {
          starttime = new Timeslot();
          starttime.hour = moment().get('hour');
          starttime.minute = moment().get('minute');
        }
        this.dosing_pattern.push(starttime);
      }
      else if (frequency.toLowerCase() == FrequencyType.mor) {
        if (!starttime) {
          starttime = new Timeslot();
          if (config["mor"] && FormSettings.IsValidTimeSlotString(config["mor"])) {
            starttime.hour = +config["mor"].split(':')[0].trim();
            starttime.minute = +config["mor"].split(':')[1].trim()
          }
          else {
            starttime.hour = 8
            starttime.minute = 0
          }
        }
        this.dosing_pattern.push(starttime);
      }
      else if (frequency.toLowerCase() == FrequencyType.mid) {
        if (!starttime) {
          starttime = new Timeslot();
          if (config["mid"] && FormSettings.IsValidTimeSlotString(config["mid"])) {
            starttime.hour = +config["mid"].split(':')[0].trim();
            starttime.minute = +config["mid"].split(':')[1].trim()
          }
          else {
            starttime.hour = 12;
            starttime.minute = 0;
          }
        }
        this.dosing_pattern.push(starttime);
      }
      else if (frequency.toLowerCase() == FrequencyType.eve) {
        if (!starttime) {
          starttime = new Timeslot();
          if (config["eve"] && FormSettings.IsValidTimeSlotString(config["eve"])) {
            starttime.hour = +config["eve"].split(':')[0].trim();
            starttime.minute = +config["eve"].split(':')[1].trim()
          }
          else {
            starttime.hour = 21;
            starttime.minute = 0;
          }
        }
        this.dosing_pattern.push(starttime);
      }
      else if (frequency.toLowerCase() == FrequencyType.night) {
        if (!starttime) {
          starttime = new Timeslot();
          if (config["night"] && FormSettings.IsValidTimeSlotString(config["night"])) {
            starttime.hour = +config["night"].split(':')[0].trim();
            starttime.minute = +config["night"].split(':')[1].trim()
          }
          else {
            starttime.hour = 21;
            starttime.minute = 0;
          }
        }
        this.dosing_pattern.push(starttime);
      }
      else {
        if (frequency == "x" && !isNaN(+frequencysize) && +frequencysize > 0) {
          numberofslots = <unknown>frequencysize as number;
        }
        else if (frequency == "h" && !isNaN(+frequencysize) && +frequencysize > 0) {
          numberofslots = 24 / +frequencysize;
        }

        if (numberofslots > 0) {
          if (!starttime && numberofslots < 5) {

            if (config[frequencysize + frequency] && Array.isArray(config[frequencysize + frequency])) {
              config[frequencysize + frequency].forEach(i => {
                if (FormSettings.IsValidTimeSlotString(i)) {
                  var hour = +i.split(':')[0].trim();
                  var minute = +i.split(':')[1].trim();
                  this.dosing_pattern.push(new Timeslot(hour, minute));
                }
              });
            }

            // if (numberofslots == 1) {
            //   var hour = 8;
            //   var minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            // }
            // else if (numberofslots == 2) {

            //   var hour = 8;
            //   var minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 20;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            // }
            // else if (numberofslots == 3) {
            //   var hour = 8;
            //   var minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 13;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 20;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            // }

            // else if (numberofslots == 4) {
            //   var hour = 8;
            //   var minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 13;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 17;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));

            //   hour = 21;
            //   minute = 0;
            //   this.dosing_pattern.push(new Timeslot(hour, minute));
            // }
          }
          else {
            if (!starttime) {
              starttime = new Timeslot();
              starttime.hour = 0;
              starttime.minute = 0;
            }
            const step = Math.round(24 / numberofslots);
            var t = moment().set("hour", starttime.hour).set("minute", starttime.minute);
            if (numberofslots == 1) {

            }
            for (var i = 0; i < numberofslots; i++) {
              if (i > 0)
                t = t.add(step, "hour");
              this.dosing_pattern.push(new Timeslot(t.get("hour"), t.get("minute")));
            }
          }
        }
      }
    }
  }

  GeneratePrescriptionObject(formkeyvalues: Array<{ "key": string, "value": string }>, editingprescription?: Prescription) {
    var correlationid = uuid();
    var p = new Prescription();
    p.correlationid = correlationid;
    if (editingprescription) {
      p.__editingprescription = editingprescription;
      p.hasbeenmodified = true;
      p.createdon = p.__editingprescription.createdon;
      p.createdby = p.__editingprescription.createdby;
      p.createdbyrole = p.__editingprescription.createdbyrole;
    }
    else {
      if (this.originalcreatedon)
        p.createdon = this.originalcreatedon
      else
        p.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());

      p.createdby = this.appService.loggedInUserName;
      p.hasbeenmodified = false;
      p.createdbyrole = JSON.stringify(this.appService.loggedInUserRoles.filter(x => x.toLowerCase().startsWith("epma")));

    }
    p.allowsubstitution = false;
    p.comments = this.GetFormKeyValuesItem(formkeyvalues, "comments") ?? null;
    if (this.formContext == FormContext.op)
      p.encounter_id = Common.op_encounter_placeholder;
    else
      p.encounter_id = this.appService.encounter.encounter_id;
    p.epma_prescriptionevent_id = "";
    p.otherindications = this.GetFormKeyValuesItem(formkeyvalues, "otherindications") ?? null;
    p.infusiontype_id = this.GetFormKeyValuesItem(formkeyvalues, "infusiontype") ?? null;
    p.lastmodifiedby = this.appService.loggedInUserName; //"dev";
    p.lastmodifiedbyrole = JSON.stringify(this.appService.loggedInUserRoles.filter(x => x.toLowerCase().startsWith("epma")));
    p.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    p.orderformtype = "";
    p.person_id = this.appService.personId;
    let selectedindication = this.indications.find(x => x.selected == true);
    if (selectedindication) {
      p.indication = JSON.stringify(selectedindication);
    }
    else {
      p.indication = null;
    }

    if (editingprescription)
      p.prescription_id = editingprescription.prescription_id
    else
      p.prescription_id = uuid();
    p.orderformtype = this.vtmstyle ? "vtmstyle" : null;


    p.isinfusion = this.isInfusion;
    // p.reminderdays = +this.GetFormKeyValuesItem(formkeyvalues, "reminderdays") ?? null;
    // p.remindernotes = this.GetFormKeyValuesItem(formkeyvalues, "remindernotes") ?? null;
    p.prescriptionadditionalconditions_id = this.GetFormKeyValuesItem(formkeyvalues, "additionalconditions") ?? null;
    p.prescriptionsource_id = this.GetFormKeyValuesItem(formkeyvalues, "prescriptionsource") ?? "";

    let selectedsources = this.sources.filter(x => x.selected == true).map(x => x.prescriptionsource_id);
    if (selectedsources.length != 0)
      p.prescriptionsources = JSON.stringify(selectedsources);
    else
      p.prescriptionsources = null;

    if (this.sources.find(x => x.source.toLowerCase() == "other")?.selected)
      p.otherprescriptionsource = this.GetFormKeyValuesItem(formkeyvalues, "otherprescriptionsource") ?? "";
    else
      p.otherprescriptionsource = "";

    p.titration = this.GetFormKeyValuesItem(formkeyvalues, "titration") ?? null;
    // if (editingprescription) {
    //   p.prescriptionstatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase().trim() == "modified").prescriptionstatus_id;
    // }
    // else {
    //   p.prescriptionstatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase().trim() == "active").prescriptionstatus_id;
    // }
    if (p.titration) {
      p.titrationtype = this.medication.detail.titrationTypes[0].desc ?? null;
      p.titrationtargetmin = this.GetFormKeyValuesItem(formkeyvalues, "titrationtargetmin") ? +this.GetFormKeyValuesItem(formkeyvalues, "titrationtargetmin") : null;
      let istitrationrange = this.GetFormKeyValuesItem(formkeyvalues, "istitrationrange");
      if (istitrationrange === true)
        p.titrationtargetmax = this.GetFormKeyValuesItem(formkeyvalues, "titrationtargetmax") ? +this.GetFormKeyValuesItem(formkeyvalues, "titrationtargetmax") : null;
      else
        p.titrationtargetmax = null;
      p.titrationtargetunits = this.titrationUnits;
      p.titrationtypecode = this.medication.detail.titrationTypes[0].cd ?? null;
    }
    else {
      p.titrationtype = null;
      p.titrationtargetmin = null;
      p.titrationtargetmax = null;
      p.titrationtargetunits = this.titrationUnits;
      p.titrationtypecode = null;

    }

    if (this.isOxygen) {
      p.ismedicinalgas = true;
      p.oxygendevices_id = this.GetFormKeyValuesItem(formkeyvalues, "oxygendevice");
      p.oxygenadditionalinfo = JSON.stringify(this.oxygenprescriptionadditionalinfo.filter(x => x.isChecked).map(x => x.oxygenprescriptionadditionalinfo_id));
    }
    else {
      p.ismedicinalgas = false;
      p.oxygendevices_id = null;
      p.oxygenadditionalinfo = null;
    }

    p.dispensingfrom = this.GetFormKeyValuesItem(formkeyvalues, "dispensingfrom") ?? null;
    p.ismodifiedrelease = this.GetFormKeyValuesItem(formkeyvalues, "ismodifiedrelease") ?? null;
    p.isgastroresistant = this.GetFormKeyValuesItem(formkeyvalues, "isgastroresistant") ?? null;
    p.moatoip = this.moatoip;
    p.printingrequired = this.medication.detail.isPrescriptionPrintingRequired;

    p.__medications = [];

    p.__drugcodes = this.medication.formularyAdditionalCodes;
    p.__ignoreDuplicateWarnings = this.medication.detail.ignoreDuplicateWarnings;
    var m = new Medication();
    p.__medications.push(m);
    m.person_id = p.person_id
    m.encounter_id = p.encounter_id;
    m.medication_id = uuid();
    m.prescription_id = p.prescription_id;
    m.name = this.medication.name;
    m.producttype = this.medication.productType;
    m.roundingfactor = this.medication.detail.roundingFactorDesc;
    m.actgroupcode = this.ATCGroup;

    m.__ingredients = [];
    m.__codes = [];
    m.correlationid = p.correlationid;
    //additionalCodeDesc: "Musculoskeletal and joint diseases - [10.00.00.00] | Rheumatic diseases and gout - [10.01.00.00] | NSAIDs - [10.01.01.00]"

    var fdbc = this.medication.formularyAdditionalCodes ? this.medication.formularyAdditionalCodes.find(x => x.additionalCodeSystem.toString().toLowerCase() == "fdb") : null;
    var cgc = this.medication.formularyAdditionalCodes ? this.medication.formularyAdditionalCodes.find(x => x.additionalCodeSystem.toString().toLowerCase() == "customgroup") : null;

    if (fdbc && fdbc.additionalCodeDesc) {
      m.classification = fdbc.additionalCodeDesc;
      m.bnf = fdbc.additionalCode;
    }
    else {
      m.classification = "Others";
    }
    // if (fdbc) {
    //   var additionalCodeDesc = fdbc.additionalCodeDesc;
    //   if (additionalCodeDesc) {
    //     var acs = additionalCodeDesc.split("|");
    //     var index = 0;
    //     if (acs.length > 1)
    //       index = 1;
    //     var lastacs = acs[index];
    //     var group = lastacs.split("-")
    //     group.splice(group.length - 1, 1);
    //     group = group.join('');
    //     this.appService.logToConsole(group);
    //     if (group) {
    //       m.classification = group.trim();
    //       m.bnf = group[0];
    //     }
    //   }
    //   else {
    //     m.classification = "Others";
    //   }
    // }
    // else
    //   m.classification = "Others";

    m.isantimicrobial = this.isAntiviral || this.isAntibiotic;

    if (cgc) {
      m.customgroup = cgc.additionalCode;
    }
    else {
      m.customgroup = "Others";
    }
    this.appService.logToConsole(m.classification);
    this.appService.logToConsole(m.customgroup);

    m.isprimary = true;
    m.form = this.medication.detail.formDesc;
    if (!m.form)
      m.form = "NA"
    m.doseformunitofmeasure = this.medication.detail.unitDoseUnitOfMeasureDesc;
    if (this.medication.formularyIngredients) {
      this.medication.formularyIngredients.forEach((fi) => {
        var mig = new Medicationingredients();

        mig.name = fi.ingredientName;
        mig.strengthneumerator = +fi.strengthValueNumerator;
        mig.strengthneumeratorunit = fi.strengthValueNumeratorUnitDesc;
        mig.strengthdenominator = fi.strengthValueDenominator;
        mig.strengthdenominatorunit = fi.strengthValueDenominatorUnitDesc;
        mig.medicationingredients_id = uuid();
        mig.medication_id = m.medication_id;
        mig.correlationid = p.correlationid;
        m.__ingredients.push(mig);

        m.strengthneumerator = +fi.strengthValueNumerator;
        m.strengthneumeratorunit = fi.strengthValueNumeratorUnitDesc;
        m.strengthdenominator = +fi.strengthValueDenominator;
        m.strengthdenominatorunit = fi.strengthValueDenominatorUnitDesc;
      });
    }

    m.isblacktriangle = this.MedicationHasFlag("blacktriangle");
    m.isclinicaltrial = this.MedicationHasFlag("clinicaltrial");
    m.iscontrolled = this.MedicationHasFlag("controlled");
    m.isexpensive = this.MedicationHasFlag("expensive");
    m.isformulary = !this.MedicationHasFlag("nonformulary");
    m.ishighalert = this.MedicationHasFlag("highalert");
    m.isunlicenced = this.MedicationHasFlag("unlicenced");
    m.iscritical = this.MedicationHasFlag("critical");
    m.isbloodproduct = this.MedicationHasFlag("bloodproduct");

    //add diluents if any

    this.diluents.forEach(dil => {

      var md = new Medication();
      p.__medications.push(md);
      md.person_id = p.person_id
      md.encounter_id = p.encounter_id;
      md.medication_id = uuid();
      md.prescription_id = p.prescription_id;
      md.name = dil.fs.medication.name;
      md.producttype = dil.fs.medication.productType;
      md.roundingfactor = dil.fs.medication.detail.roundingFactorDesc;
      md.actgroupcode = dil.fs.ATCGroup;
      md.__ingredients = [];
      md.__codes = [];
      md.classification = "Others";
      md.isprimary = false;
      md.form = dil.fs.medication.detail.formDesc;
      if (!md.form)
        md.form = "NA"
      md.doseformunitofmeasure = dil.fs.medication.detail.unitDoseUnitOfMeasureDesc;
      md.isblacktriangle = dil.fs.MedicationHasFlag("blacktriangle");
      md.isclinicaltrial = dil.fs.MedicationHasFlag("clinicaltrial");
      md.iscontrolled = dil.fs.MedicationHasFlag("controlled");
      md.isexpensive = dil.fs.MedicationHasFlag("expensive");
      md.isformulary = !dil.fs.MedicationHasFlag("nonformulary");
      md.ishighalert = dil.fs.MedicationHasFlag("highalert");
      md.isunlicenced = dil.fs.MedicationHasFlag("unlicenced");
      md.iscritical = dil.fs.MedicationHasFlag("critical");
      md.correlationid = p.correlationid;

      //for diluents medication strenth attributes will hold the prescribed dose/quantity
      md.doseformsize = +dil.ts.dose_size;
      md.doseformunits = dil.fs.dose_units;
      md.strengthneumerator = +dil.ts.dose_strength_neumerator;
      md.strengthneumeratorunit = dil.fs.dose_strength_neumerator_units;
      md.strengthdenominator = +dil.ts.dose_strength_denominator;
      md.strengthdenominatorunit = dil.fs.dose_strength_denominator_units;

      if (dil.fs.medication.formularyIngredients) {
        dil.fs.medication.formularyIngredients.forEach((d_fi) => {
          var d_mig = new Medicationingredients();

          d_mig.name = d_fi.ingredientName;
          d_mig.strengthneumerator = +d_fi.strengthValueNumerator;
          d_mig.strengthneumeratorunit = d_fi.strengthValueNumeratorUnitDesc;
          d_mig.strengthdenominator = d_fi.strengthValueDenominator;
          d_mig.strengthdenominatorunit = d_fi.strengthValueDenominatorUnitDesc;
          d_mig.medicationingredients_id = uuid();
          d_mig.medication_id = md.medication_id;
          d_mig.correlationid = p.correlationid;
          md.__ingredients.push(d_mig);


        });
      }

      var d_code = new Medicationcodes();
      d_code.code = dil.fs.medication.code;
      d_code.terminology = "formulary";
      d_code.medicationcodes_id = uuid();
      d_code.medication_id = md.medication_id;
      d_code.correlationid = p.correlationid;
      md.__codes.push(d_code);
    });

    p.__routes = [];
    this.routes.filter(x => x.isChecked).forEach((r) => {
      var prt = new Prescriptionroutes();
      prt.isdefault = r.isPrimary;
      prt.route = r.route;
      prt.routecode = r.routecode;
      prt.prescriptionroutes_id = uuid();
      prt.prescription_id = p.prescription_id;
      prt.medication_id = m.medication_id;
      prt.correlationid = p.correlationid;
      prt.isunlicensed = r.isunlicensed;
      p.__routes.push(prt)
    });

    var fid = new Medicationcodes();
    fid.code = this.medication.code;
    fid.terminology = "formulary";
    fid.medicationcodes_id = uuid();
    fid.medication_id = m.medication_id;
    fid.correlationid = p.correlationid;
    m.__codes.push(fid);

    p.__posology = [];
    let pos = new Posology();
    p.__posology.push(pos);
    p.__posology[0].iscurrent = true;

    //as part of the change to enable multiple posology on a prescription  
    let inpatientcontextid = this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Inpatient).prescriptioncontext_id;

    if (editingprescription && (this.infusionType == InfusionType.ci || this.infusionType == InfusionType.pca || editingprescription.prescriptioncontext_id != inpatientcontextid))
      p.__posology[0].posology_id = editingprescription.__posology[0].posology_id;
    else
      p.__posology[0].posology_id = uuid();
    p.__posology[0].person_id = p.person_id;
    p.__posology[0].encounter_id = p.encounter_id;
    p.__posology[0].repeatprotocoltimes = +this.GetFormKeyValuesItem(formkeyvalues, "protocolrepeattimes") ?? null;
    p.__posology[0].repeatlastday = this.GetFormKeyValuesItem(formkeyvalues, "repeatprotocol") == "lastday" ?? null;
    p.__posology[0].repeatlastdayuntil = this.GetFormKeyValuesItem(formkeyvalues, "enddate") ?? null;
    p.__posology[0].prn = this.GetFormKeyValuesItem(formkeyvalues, "prn") == true ?? null;
    p.__posology[0].doctorsorder = this.GetFormKeyValuesItem(formkeyvalues, "do") == true ?? null;
    p.__posology[0].totalinfusionvolume = +this.GetFormKeyValuesItem(formkeyvalues, "totalinfusionvolume") ?? null;
    p.__posology[0].titration = p.titration;
    p.__posology[0].titrationtargetmax = p.titrationtargetmax;
    p.__posology[0].titrationtargetmin = p.titrationtargetmin;
    p.__posology[0].titrationtargetunits = p.titrationtargetunits;
    p.__posology[0].titrationtype = p.titrationtype;
    p.__posology[0].titrationtypecode = p.titrationtypecode;

    var amStartDate = this.GetFormKeyValuesItem(formkeyvalues, "antimicrobialstartdate") ?? null;
    var amStartTime = this.GetFormKeyValuesItem(formkeyvalues, "antimicrobialstarttime") ?? null;

    if (amStartDate) {
      if (!amStartTime) {
        amStartTime = "00:00";
      }
      var amsdt = FormSettings.GetMomentForDateAndTimeslotString(moment(amStartDate), amStartTime);
      if (amsdt)
        p.__posology[0].antimicrobialstartdate = this.appService.getDateTimeinISOFormat(amsdt.toDate());

    }

    p.__posology[0].daysofweek = JSON.stringify(this.daysofweek.filter(x => x.isChecked).map(x => x.name));
    p.__posology[0].dosingdaysfrequency = this.GetFormKeyValuesItem(formkeyvalues, "dosingdaysfrequency") ?? null;
    p.__posology[0].dosingdaysfrequencysize = +this.GetFormKeyValuesItem(formkeyvalues, "dosingdaysfrequencysize") ?? null;



    if (this.interval_type == IntervalType.protocol) {
      let protocolrepat = this.GetFormKeyValuesItem(formkeyvalues, "repeatprotocol") ?? null;
      if (protocolrepat == "protocol") {
        p.__posology[0].repeatlastday = false;
        p.__posology[0].repeatlastdayuntil = null;
      }
      else if (protocolrepat == "lastday") {
        p.__posology[0].repeatprotocoltimes = 0;
        if (this.GetFormKeyValuesItem(formkeyvalues, "repeatprotocolsub") != "enddate")
          p.__posology[0].repeatlastdayuntil = null;
      }
      else {
        p.__posology[0].repeatlastday = false;
        p.__posology[0].repeatprotocoltimes = 0;
        p.__posology[0].repeatlastdayuntil = null;
      }
    }
    else {
      p.__posology[0].repeatlastday = false;
      p.__posology[0].repeatprotocoltimes = 0;
      p.__posology[0].repeatlastdayuntil = null;
    }


    if (this.interval_type == IntervalType.protocol || this.interval_type == IntervalType.variable) {
      p.__posology[0].frequency = this.interval_type;
    }
    else {
      var cf = +this.GetFormKeyValuesItem(formkeyvalues, "customfrequency");
      if (!isNaN(cf) && cf > 0)
        p.__posology[0].frequency = this.GetFormKeyValuesItem(formkeyvalues, "customfrequency");
      else
        p.__posology[0].frequency = this.GetFormKeyValuesItem(formkeyvalues, "frequency") ?? null;
    }

    p.__posology[0].frequencysize = +this.GetFormKeyValuesItem(formkeyvalues, "frequencysize") ?? null;

    if (!isNaN(+p.__posology[0].frequency) && +p.__posology[0].frequency > 0) {
      p.__posology[0].frequencysize = +p.__posology[0].frequency;
      p.__posology[0].frequency = this.GetFormKeyValuesItem(formkeyvalues, "times_hours") ?? null;
    }
    p.__posology[0].prescriptiodurationsize = +this.GetFormKeyValuesItem(formkeyvalues, "prescriptiondurationsize") ?? null;
    p.__posology[0].prescription_id = p.prescription_id;
    p.__posology[0].prescriptionduration = this.GetFormKeyValuesItem(formkeyvalues, "prescriptionduration") ?? null;
    p.__posology[0].infusionduration = +this.GetFormKeyValuesItem(formkeyvalues, "infusionduration") ?? null;
    p.__posology[0].infusionrate = +this.GetFormKeyValuesItem(formkeyvalues, "infusionrate") ?? null;
    p.__posology[0].infusionrateunits = this.infusionrateunits;
    p.__posology[0].infusiontypeid = this.infusionType;
    p.__posology[0].infusiondoserate = +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate") == 0 ? null : +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate");
    p.__posology[0].infusiondoserateunits = +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate") == 0 ? null : this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserateunits");
    p.__posology[0].concentration = this.GetFormKeyValuesItem(formkeyvalues, "concentration") ?? null;

    let doseperkgrange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" || this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatorinput") : null;
    doseperkgrange = this.GetDoseSizeRange(doseperkgrange);
    p.__posology[0].doseperkg = +doseperkgrange[0] ? +doseperkgrange[0] : null;
    p.__posology[0].doseperkgrangemax = +doseperkgrange[1] ? +doseperkgrange[1] : null;

    p.__posology[0].referenceweighttype = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" ||
      this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") : null;

    let dosepersarange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "m2") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatorinput") : null;
    dosepersarange = this.GetDoseSizeRange(dosepersarange);
    p.__posology[0].dosepersa = +dosepersarange[0] ? +dosepersarange[0] : null;
    p.__posology[0].dosepersarangemax = +dosepersarange[1] ? +dosepersarange[1] : null;



    if (this.dose_type != DoseType.descriptive && this.medication.productType.toLowerCase() != "vtm") {
      p.__posology[0].totalquantity = +this.GetFormKeyValuesItem(formkeyvalues, "totalquantity") ?? null;
      p.__posology[0].totalquantitytext = "";
    }
    else {
      p.__posology[0].totalquantity = null;
      p.__posology[0].totalquantitytext = this.GetFormKeyValuesItem(formkeyvalues, "totalquantitytext") ?? null;
    }
    if (p.__posology[0].prn) {
      p.__posology[0].prnmaxdose = JSON.stringify(new PRNMaxDose().GetObject(this));
    }
    else {
      p.__posology[0].prnmaxdose = null;
    }
    var enddate = this.GetFormKeyValuesItem(formkeyvalues, "enddate");
    var endtime = this.GetFormKeyValuesItem(formkeyvalues, "endtime");
    if (p.__posology[0].frequency.toLowerCase() == "stat") {
      enddate = this.GetFormKeyValuesItem(formkeyvalues, "startdate");
      endtime = this.GetFormKeyValuesItem(formkeyvalues, "starttime");
    }
    if (enddate && endtime) {
      var t = FormSettings.GetMomentForDateAndTimeslotString(moment(enddate), endtime);
      if (t)
        p.__posology[0].prescriptionenddate = this.appService.getDateTimeinISOFormat(t.toDate());
    }
    else
      p.__posology[0].prescriptionenddate = null;

    var startdate = this.GetFormKeyValuesItem(formkeyvalues, "startdate");
    var starttime = this.GetFormKeyValuesItem(formkeyvalues, "starttime");

    if (startdate && starttime) {
      var st = FormSettings.GetMomentForDateAndTimeslotString(moment(startdate), starttime);
      if (st)
        p.__posology[0].prescriptionstartdate = this.appService.getDateTimeinISOFormat(st.toDate());
    }
    else
      p.__posology[0].prescriptionstartdate = null;

    p.lastmodifiedfrom = p.__posology[0].prescriptionstartdate;
    if (!editingprescription) {
      p.startdatetime = p.__posology[0].prescriptionstartdate;
    }
    else {
      p.startdatetime = editingprescription.startdatetime;
    }

    // p.__posology.prescriptionstartdate = this.appService.getDateTimeinISOFormat(FormSettings.
    //   GetMomentForDateAndTimeslotString(
    //     moment(this.GetFormKeyValuesItem(formkeyvalues, "startdate")),
    //     this.GetFormKeyValuesItem(formkeyvalues, "starttime")).toDate());

    p.__posology[0].__dose = [];
    p.__posology[0].dosetype = this.dose_type;
    p.__posology[0].correlationid = p.correlationid;

    if (!this.isInfusion) {
      // if this is not a protocol interval, add the standard/variable interval into the protocol dosing pattern object and iterate over it to generate dose objects
      if (this.interval_type != IntervalType.protocol) {
        this.protocol_dosing_pattern = [];
        var pi = new ProtocolInterval();
        pi.date = moment(this.GetFormKeyValuesItem(formkeyvalues, "startdate"));
        pi.intervalpattern = this.dosing_pattern;
        this.protocol_dosing_pattern.push(pi)
      }
      //iterate over protocol pattern object and create dose objects.  [standard, variable and protocol will be covered]
      this.protocol_dosing_pattern.forEach((pt) => {
        pt.intervalpattern.forEach((i) => {
          var d = new Dose();
          d.posology_id = p.__posology[0].posology_id;
          d.prescription_id = p.prescription_id;
          d.dose_id = uuid();
          d.dosestartdatetime = this.appService.getDateTimeinISOFormat(FormSettings.GetMomentForDateAndTimeslot(moment(pt.date), i).toDate());
          d.doseenddatatime = this.appService.getDateTimeinISOFormat(FormSettings.GetMomentForDateAndTimeslot(moment(pt.date), i).toDate());
          d.dosestrengthunits = this.singleIngredientStrength;

          if (this.interval_type == IntervalType.standard) {
            let doserange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "dose_size"));
            let dosestrengthrange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "totalstrength"));
            d.dosesize = doserange[0] //this.GetFormKeyValuesItem(formkeyvalues, "dose_size") ?? null;
            d.dosesizerangemax = doserange[1] ? +doserange[1] : null;

            d.dosestrength = dosestrengthrange[0] ? +dosestrengthrange[0] : null;
            d.dosestrengthrangemax = dosestrengthrange[1] ? +dosestrengthrange[1] : null;
            var sd = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_denominator");
            var sn = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_neumerator");
            if (isNaN(sd) || sd > 0)
              d.strengthdenominator = sd;
            else
              d.strengthdenominator = null;
            if (isNaN(sn) || sn > 0)
              d.strengthneumerator = sn;
            d.descriptivedose = this.GetFormKeyValuesItem(formkeyvalues, "dose_description") ?? null;

            let doseperkgrange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" ||
              this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatorinput") : null;
            doseperkgrange = this.GetDoseSizeRange(doseperkgrange);
            d.doseperkg = +doseperkgrange[0] ? +doseperkgrange[0] : null;
            d.doseperkgrangemax = +doseperkgrange[1] ? +doseperkgrange[1] : null;

            d.referenceweighttype = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" ||
              this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") : null;

            let dosepersarange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "m2") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatorinput") : null;
            dosepersarange = this.GetDoseSizeRange(dosepersarange);
            d.dosepersa = +dosepersarange[0] ? +dosepersarange[0] : null;
            d.dosepersarangemax = +dosepersarange[1] ? +dosepersarange[1] : null;

          }
          else {
            let doserange = this.GetDoseSizeRange(i.dose_size);
            let dosestrengthrange = this.GetDoseSizeRange(i.dose_totalstrength);

            d.dosesize = doserange[0]; // <string>(<unknown>i.dose_size) ?? null;
            d.dosesizerangemax = doserange[1] ? +doserange[1] : null;

            d.dosestrength = dosestrengthrange[0] ? +dosestrengthrange[0] : null;
            d.dosestrengthrangemax = dosestrengthrange[1] ? +dosestrengthrange[1] : null;

            d.strengthdenominator = +i.dose_strength_denominator ?? null;
            d.strengthneumerator = +i.dose_strength_neumerator ?? null;
            d.descriptivedose = i.dose_description ?? null;

            let doseperkgrange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" ||
              this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? i.calculatorinput : null;
            doseperkgrange = this.GetDoseSizeRange(doseperkgrange);
            d.doseperkg = +doseperkgrange[0] ? +doseperkgrange[0] : null;
            d.doseperkgrangemax = +doseperkgrange[1] ? +doseperkgrange[1] : null;

            d.referenceweighttype = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "kg" ||
              this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "ikg") ? this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") : null;

            let dosepersarange = (this.GetFormKeyValuesItem(formkeyvalues, "calculatortype") == "m2") ? i.calculatorinput : null;
            dosepersarange = this.GetDoseSizeRange(dosepersarange);
            d.dosepersa = +dosepersarange[0] ? +dosepersarange[0] : null;
            d.dosepersarangemax = +dosepersarange[1] ? +dosepersarange[1] : null;
          }
          d.doseunit = this.dose_units;
          d.strengthdenominatorunit = this.dose_strength_denominator_units
          d.strengthneumeratorunit = this.dose_strength_neumerator_units;

          d.encounter_id = p.encounter_id;
          d.person_id = p.person_id;
          d.correlationid = p.correlationid;

          p.__posology[0].__dose.push(d);

        });
      });
    }
    else {//infusion

      //set linkedinfusion id if present else reset to null
      if ((this.infusionType == InfusionType.ci || this.infusionType == InfusionType.pca) && this.linkedinfusionid) {
        p.linkedinfusionid = this.linkedinfusionid;
      }
      else {
        p.linkedinfusionid = null;
      }

      //ci and variable ci/rate  has no dosing pattern, create a new dosing pattern for these
      if (this.infusionType == InfusionType.ci || this.infusionType == InfusionType.pca || this.interval_type == IntervalType.variable) {
        this.dosing_pattern = [];
        var ts = new Timeslot();
        var starttimestring = this.GetFormKeyValuesItem(formkeyvalues, "starttime");
        ts.hour = +(starttimestring ?? "").split(':')[0];
        ts.minute = +(starttimestring ?? "").split(':')[1];
        this.dosing_pattern.push(ts);
      }
      this.dosing_pattern.forEach(pt => {
        if (this.interval_type == IntervalType.standard) {
          var d = new Dose();
          d.posology_id = p.__posology[0].posology_id;
          d.prescription_id = p.prescription_id;
          d.dose_id = uuid();

          let doserange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "dose_size"));
          let dosestrengthrange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "totalstrength"));

          d.dosesize = doserange[0] //this.GetFormKeyValuesItem(formkeyvalues, "dose_size") ?? null;
          d.dosesizerangemax = doserange[1] ? +doserange[1] : null;

          d.dosestrength = dosestrengthrange[0] ? +dosestrengthrange[0] : null;
          d.dosestrengthrangemax = dosestrengthrange[1] ? +dosestrengthrange[1] : null;
          d.dosestrengthunits = this.singleIngredientStrength;

          var sd = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_denominator");
          var sn = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_neumerator");
          if (isNaN(sd) || sd > 0)
            d.strengthdenominator = sd;
          else
            d.strengthdenominator = null;
          if (isNaN(sn) || sn > 0)
            d.strengthneumerator = sn;
          d.descriptivedose = this.GetFormKeyValuesItem(formkeyvalues, "dose_description") ?? null;
          d.doseunit = this.dose_units;
          d.strengthdenominatorunit = this.dose_strength_denominator_units
          d.strengthneumeratorunit = this.dose_strength_neumerator_units;
          d.encounter_id = p.encounter_id;
          d.person_id = p.person_id;
          d.infusionduration = +this.GetFormKeyValuesItem(formkeyvalues, "infusionduration") ?? null;
          d.infusionrate = +this.GetFormKeyValuesItem(formkeyvalues, "infusionrate") ?? null;
          d.infusiondoserate = +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate") == 0 ? null : +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate");
          d.infusiondoserateunits = +this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserate") == 0 ? null : this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserateunits");

          var startdate = this.GetFormKeyValuesItem(formkeyvalues, "startdate");
          d.dosestartdatetime = this.appService.getDateTimeinISOFormat(FormSettings.GetMomentForDateAndTimeslot(moment(startdate), pt).toDate());
          d.doseenddatatime = this.appService.getDateTimeinISOFormat(FormSettings.GetMomentForDateAndTimeslot(moment(startdate), pt).toDate());

          //calculate end datetime based on infustion duration for rate, prescription end date time for CI
          if (this.infusionType == InfusionType.ci || this.infusionType == InfusionType.pca) {
            var enddate = this.GetFormKeyValuesItem(formkeyvalues, "enddate") ?? null;
            var endtime = this.GetFormKeyValuesItem(formkeyvalues, "endtime") ?? null;

            if (enddate && endtime)
              d.doseenddatatime = this.appService.getDateTimeinISOFormat(FormSettings.GetMomentForDateAndTimeslotString(moment(enddate), endtime).toDate());
            else
              d.doseenddatatime = null;
          }
          else if (this.infusionType == InfusionType.rate) {
            var duration = +this.GetFormKeyValuesItem(formkeyvalues, "infusionduration");
            var doseenddatatime = FormSettings.GetMomentForDateAndTimeslot(moment(startdate), pt).add(duration, "hour");
            d.doseenddatatime = this.appService.getDateTimeinISOFormat(doseenddatatime.toDate());
          }
          d.correlationid = p.correlationid;
          p.__posology[0].__dose.push(d);
        }
        else {
          //variable infusion rate
          var ir = this.infusion_rate_pattern;
          for (var i = 0; i < ir.length; i++) {
            var d = new Dose();
            d.posology_id = p.__posology[0].posology_id;
            d.prescription_id = p.prescription_id;
            d.dose_id = uuid();
            //d.dosesize = this.GetFormKeyValuesItem(formkeyvalues, "dose_size") ?? null;
            // d.dosestrength = this.GetFormKeyValuesItem(formkeyvalues, "totalstrength") ?? null;
            //d.dosestrengthunits = this.singleIngredientStrength;

            let doserange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "dose_size"));
            let dosestrengthrange = this.GetDoseSizeRange(this.GetFormKeyValuesItem(formkeyvalues, "totalstrength"));

            d.dosesize = doserange[0] //this.GetFormKeyValuesItem(formkeyvalues, "dose_size") ?? null;
            d.dosesizerangemax = doserange[1] ? +doserange[1] : null;

            d.dosestrength = dosestrengthrange[0] ? +dosestrengthrange[0] : null;
            d.dosestrengthrangemax = dosestrengthrange[1] ? +dosestrengthrange[1] : null;
            d.dosestrengthunits = this.singleIngredientStrength;

            var sd = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_denominator");
            var sn = +this.GetFormKeyValuesItem(formkeyvalues, "dose_strength_neumerator");
            if (isNaN(sd) || sd > 0)
              d.strengthdenominator = sd;
            else
              d.strengthdenominator = null;
            if (isNaN(sn) || sn > 0)
              d.strengthneumerator = sn;
            d.descriptivedose = this.GetFormKeyValuesItem(formkeyvalues, "dose_description") ?? null;
            d.doseunit = this.dose_units;
            d.strengthdenominatorunit = this.dose_strength_denominator_units
            d.strengthneumeratorunit = this.dose_strength_neumerator_units;
            d.encounter_id = p.encounter_id;
            d.person_id = p.person_id;
            d.infusionrate = +ir[i].starttime.infusionrate;
            d.dosestartdatetime = this.appService.getDateTimeinISOFormat(ir[i].starttime.date.toDate());
            if (ir[i].endtime.date)
              d.doseenddatatime = this.appService.getDateTimeinISOFormat(ir[i].endtime.date.toDate());
            if (i > 0)
              d.continuityid = p.__posology[0].__dose[0].dose_id;

            d.infusiondoserate = +ir[i].starttime.infusiondoserate == 0 ? null : +ir[i].starttime.infusiondoserate;
            d.infusiondoserateunits = +ir[i].starttime.infusiondoserate == 0 ? null : this.GetFormKeyValuesItem(formkeyvalues, "infusiondoserateunits");

            d.correlationid = p.correlationid;
            p.__posology[0].__dose.push(d);
          }
        }
      });
    }

    //review status object
    p.__editingreviewstatus = new Prescriptionreviewstatus();
    p.__editingreviewstatus.epma_prescriptionreviewstatus_id = uuid();
    p.__editingreviewstatus.modifiedby = this.appService.loggedInUserName;
    p.__editingreviewstatus.status = this.currentreviewstatus.reviewstatus_id
    if (p.__editingreviewstatus.status == "") {
      p.__editingreviewstatus.status =
        this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "amber").reviewstatus_id;
    }
    p.__editingreviewstatus.reviewcomments = this.GetFormKeyValuesItem(formkeyvalues, "reviewcomments");
    // if (!FormSettings.IsNullOrEmpty(p.__editingreviewstatus.reviewcomments)) {
    //   p.__editingreviewstatus.status =
    //     this.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "amber").reviewstatus_id;
    // }
    p.__editingreviewstatus.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    p.__editingreviewstatus.modifieddatetime = this.appService.getDateTimeinISOFormat(moment().toDate());
    p.__editingreviewstatus.newcorrelationid = correlationid;
    p.__editingreviewstatus.person_id = p.person_id;
    p.__editingreviewstatus.prescription_id = p.prescription_id;
    if (editingprescription) {
      const existingPrescription = this.appService.Prescription.find(p => p.prescription_id == editingprescription.prescription_id)
      if (existingPrescription) {
        //p.__editingreviewstatus.oldcorrelationid = editingprescription.correlationid; 
        p.__editingreviewstatus.oldcorrelationid = existingPrescription.correlationid;
        p.__editingreviewstatus.precriptionedited = true;
      }
    }

    //reminder object
    if (!editingprescription) {
      var rhrs = this.GetFormKeyValuesItem(formkeyvalues, "reminderhours");
      var rnotes = this.GetFormKeyValuesItem(formkeyvalues, "remindernotes");
      var ack = this.GetFormKeyValuesItem(formkeyvalues, "reminderackrequired");
      p.__initialreminder = [];

      if (rhrs != "") {
        let irm = new Prescriptionreminders();
        irm.message = rnotes
        irm.activationinhours = rhrs;
        irm.epma_prescriptionreminders_id = uuid();
        irm.isackmandatory = false;
        irm.issystem = false;
        irm.lastmodifiedby = this.appService.loggedInUserName;
        irm.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        irm.prescription_id = p.prescription_id;
        irm.personid = p.person_id;
        irm.encounterid = p.encounter_id
        if (ack != "")
          irm.isackmandatory = ack === true;

        p.__initialreminder.push(irm);
      }

      //system reminder
      if (this.medication.detail.reminders) {
        this.medication.detail.reminders.forEach(r => {
          let srm = new Prescriptionreminders();
          srm.message = r.reminder
          srm.activationinhours = r.duration.toString();
          srm.epma_prescriptionreminders_id = uuid();
          srm.isackmandatory = r.active === true;
          srm.issystem = true;
          srm.lastmodifiedby = this.appService.loggedInUserName;
          srm.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
          srm.prescription_id = p.prescription_id;
          srm.personid = p.person_id;
          srm.encounterid = p.encounter_id

          p.__initialreminder.push(srm);
        });
      }
      if (+this.medication.detail.ivToOral == 1 && this.isPrimaryRouteIV == true) {
        let activationinhours = this.appService.appConfig.AppSettings.ivToOralActivationinhours;
        if (isNaN(activationinhours) || +activationinhours <= 0) {
          activationinhours = 48;
        }
        let srm = new Prescriptionreminders();
        srm.message = "Consider switching from IV to Oral."
        srm.activationinhours = activationinhours;
        srm.epma_prescriptionreminders_id = uuid();
        srm.isivtooral = true;
        srm.isackmandatory = true;
        srm.issystem = true;
        srm.lastmodifiedby = this.appService.loggedInUserName;
        srm.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        srm.prescription_id = p.prescription_id;
        srm.personid = p.person_id;
        srm.encounterid = p.encounter_id

        p.__initialreminder.push(srm);
      }

    }

    //add nursing instructions and custom warnings
    let primarymedication = p.__medications.find(x => x.isprimary);
    let dmd = primarymedication.__codes.find(x => x.terminology == "formulary");
    if (dmd && primarymedication.producttype != 'custom') {
      p.__nursinginstructions = [];
      p.__customWarning = this.medication.detail.customWarnings;
      this.medication.detail.endorsements.forEach(e => {
        p.__nursinginstructions.push(new NursingInstruction(null, "Endorsement", e));
      });
      this.medication.detail.medusaPreparationInstructions.forEach(e => {
        p.__nursinginstructions.push(new NursingInstruction(null, "Medusa Instructions", e));
      });
    }

    //if editing prescription, and editing posology start date time is in the future, this posolgy will be deleted and additionally scheduled adminstrations 
    //that are before the current date time will be deleted too. these need to be retaied as missed doses in the new posology. 
    //add additionally scheduled doses that are scheduled before the end date of editing posology (current timestamp) to current posology 
    if (editingprescription) {
      const editing_posology = this.appService.GetCurrentPosology(editingprescription);
      if (moment(editing_posology.prescriptionstartdate).isAfter(moment())) {
        const additionalDoses = editing_posology.__dose.filter(d => d.isadditionaladministration && moment(d.dosestartdatetime).isBefore(moment()));
        additionalDoses.forEach(d => {
          d.posology_id = p.__posology[0].posology_id;
          p.__posology[0].__dose.push(d);
        });
      }
    }

    FormSettings.CleanAndCloneObject(p);
    //console.log(p);
    return p;
  }


  SetMedicationNursingInstuctions() {
    let dmd = this.medication.code
    if (dmd && this.medication.productType != 'custom') {
      this.nursinginstructions = [];
      this.medication.detail.endorsements.forEach(e => {
        this.nursinginstructions.push(new NursingInstruction(null, "Endorsement", e));
      });
      this.medication.detail.medusaPreparationInstructions.forEach(e => {
        this.nursinginstructions.push(new NursingInstruction(null, "Medusa Instructions", e));
      });
    }
  }


  GetFormKeyValuesItem(formkeyvalues: Array<{ "key": string, "value": any }>, key: string) {
    if (formkeyvalues.find(x => x.key == key)) {
      return formkeyvalues.find(x => x.key == key).value;
    }
    else return null;
  }


  VolumeFordose(dose) {
    // IF dose entered is 10mg, then 
    // Ratio r = concentration dose/entered dose = 10/10 = 1
    // Volume = concentration volume/r = 100/1 = 100 ml
    // Calculated dose = 10mg/100ml. 

    if (!isNaN(+dose) && +dose > 0) {
      if (this.dose_strength_neumerator > 0 && this.dose_strength_denominator > 0) {
        const ratio = this.dose_strength_neumerator / dose;
        const volume = this.dose_strength_denominator / ratio;
        return volume; //return volume.toFixed(this.precision).replace(/\.0+$/g, '');
      }
    }
    return null;
  }

  DoseForVolume(volume) {
    // IF volume entered is 10ml, then 
    // Ratio r= concentration volume/entered volume = 100/10 = 10
    // Dose = concentration dose/r = 10/10 = 1 mg
    // Calculated dose = 1mg/10ml
    if (!isNaN(+volume) && +volume > 0) {
      if (this.dose_strength_neumerator > 0 && this.dose_strength_denominator > 0) {
        const ratio = this.dose_strength_denominator / volume;
        const dose = this.dose_strength_neumerator / ratio;
        return dose;// return dose.toFixed(this.precision).replace(/\.0+$/g, '');
      }
    }
    return null;
  }

  GetDoseSizeRange(dosesize: string): string[] {
    let sizearray = []
    sizearray.push(null);
    sizearray.push(null);

    if (dosesize) {
      let components = dosesize.toString().split('-');
      sizearray[0] = components[0]
      if (components.length == 2) {
        sizearray[1] = components[1]
      }
    }
    return sizearray;
  }

  DeleteReconciliationPrescriptionArray(parray: Array<Prescription>, prescriptionscontexttype: FormContext = FormContext.ip, prescriptionscontext?: Epma_Medsonadmission | Epma_Medsondischarge) {
    const sub = new Subject();

    if (prescriptionscontexttype && parray.length > 0) {
      var upsertManager = new UpsertTransactionManager();
      upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
      parray.forEach(p => {

        upsertManager.addEntity('core', 'prescription', p.prescription_id, "del");
        p.__medications.forEach(m => {
          upsertManager.addEntity('core', 'medication', { "prescription_id": p.prescription_id }, "del");
          m.__ingredients.forEach(mig => {
            upsertManager.addEntity('core', 'medicationingredients', mig.medicationingredients_id, "del");
          });
          m.__codes.forEach(mcd => {
            upsertManager.addEntity('core', 'medicationcodes', mcd.medicationcodes_id, "del");
          });
        });
        upsertManager.addEntity('core', 'posology', { "prescription_id": p.prescription_id }, "del");
        upsertManager.addEntity('core', 'dose', { "prescription_id": p.prescription_id }, "del");
        upsertManager.addEntity('core', "prescriptionroutes", { "prescription_id": p.prescription_id }, "del");

        //delte from moaprescriptions and modprescriptions mapping tables
        if (prescriptionscontexttype == FormContext.moa) {
          upsertManager.addEntity('local', "epma_moaprescriptions", { "prescription_id": p.prescription_id }, "del");
        }
        else if (prescriptionscontexttype == FormContext.mod) {
          upsertManager.addEntity('local', "epma_modprescriptions", { "prescription_id": p.prescription_id }, "del");
        }
        else if (prescriptionscontexttype == FormContext.op) {
          upsertManager.addEntity('local', "epma_opprescriptiontherapies", { "prescription_id": p.prescription_id }, "del");
        }
      });

      // update the context table to set complete = false
      if (prescriptionscontexttype && prescriptionscontexttype == FormContext.moa) {
        (<Epma_Medsonadmission>prescriptionscontext).action = ReconciliationListActions.edit;
        (<Epma_Medsonadmission>prescriptionscontext).iscomplete = false;
        (<Epma_Medsonadmission>prescriptionscontext).modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        (<Epma_Medsonadmission>prescriptionscontext).modifiedby = this.appService.loggedInUserName;

        upsertManager.addEntity('local', "epma_medsonadmission", JSON.parse(JSON.stringify(prescriptionscontext)));
      }
      else
        if (prescriptionscontexttype && prescriptionscontexttype == FormContext.mod) {
          (<Epma_Medsondischarge>prescriptionscontext).action = ReconciliationListActions.edit;
          (<Epma_Medsondischarge>prescriptionscontext).iscomplete = false;
          (<Epma_Medsondischarge>prescriptionscontext).modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
          (<Epma_Medsondischarge>prescriptionscontext).modifiedby = this.appService.loggedInUserName;

          upsertManager.addEntity('local', "epma_medsondischarge", JSON.parse(JSON.stringify(prescriptionscontext)));
        }


      upsertManager.save((resp) => {
        this.appService.UpdateDataVersionNumber(resp);

        this.appService.logToConsole(resp);
        upsertManager.destroy();
        sub.next({ "status": true, "response": resp.data });
        sub.complete();

      },
        (error) => {
          this.appService.logToConsole(error);
          upsertManager.destroy();
          sub.next({ "status": false, "response": error });
          sub.complete();

          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }

        }
      );
    }
    else {
      setTimeout(() => {
        sub.next({ "status": true, "response": null });
        sub.complete();
      }, 2000);
    }

    return sub.asObservable();

  }

  SaveprescriptionArray(parray: Array<Prescription>, prescriptionscontexttype: FormContext = FormContext.ip, prescriptionscontext?: Epma_Medsonadmission | Epma_Medsondischarge | Outpatientprescriptions, dischargesummaryContext = null): Observable<any> {
    const sub = new Subject();
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    let currentdatetime = moment();

    //if editing, delete old objects
    parray.forEach(p => {
      if (p.__editingprescription) {

        upsertManager.addEntity('core', 'medication', { "prescription_id": p.__editingprescription.prescription_id }, "del");

        p.__editingprescription.__medications.forEach(med => {
          upsertManager.addEntity('core', 'medicationingredients', { "medication_id": med.medication_id }, "del");
          upsertManager.addEntity('core', 'medicationcodes', { "medication_id": med.medication_id }, "del");
        });

        //for change : preserve administration record
        // upsertManager.addEntity('core', 'dose', { "posology_id": p.__editingprescription.__posology.posology_id }, "del");
        //for change : preserve administration record
        //upsertManager.addEntity('core', 'doseevents', { "posology_id": p.__editingprescription.__posology.posology_id }, "del");

        upsertManager.addEntity('core', 'prescriptionroutes', { "prescription_id": p.__editingprescription.prescription_id }, "del");

        //for change : preserve administration record
        //If editprescription && source!=basket && context ==ip

        // 1. Copy all previous posology and dose from editingprescription to current prescription marking them iscurrent-false
        // 2. Delete all posology and dose where start date time is same or after current date time
        // 3. Update posology end date time of previous posology to current date time


        if (prescriptionscontexttype == FormContext.ip && p.infusiontype_id != InfusionType.ci && p.infusiontype_id != InfusionType.pca) {
          p.__editingprescription.__posology.sort(function compare(a, b) {
            return moment(a.prescriptionstartdate).toDate().getTime() - moment(b.prescriptionstartdate).toDate().getTime();
          });
          // let currentposology = p.__posology[0];
          p.__editingprescription.__posology.forEach(epos => {
            //copy all posology and dose from previous state where posology start date time is before (and not same) current date time
            if (moment(epos.prescriptionstartdate).isBefore(currentdatetime)) {
              let tp = <Posology>(FormSettings.CloneObject(epos));
              tp.iscurrent = false;
              p.__posology.push(tp);
            }
            else {
              //Delete all posology and dose where start date time is same or after current posology start date time
              upsertManager.addEntity('core', 'dose', { "posology_id": epos.posology_id }, "del");
              upsertManager.addEntity('core', 'posology', { "posology_id": epos.posology_id }, "del");
              upsertManager.addEntity('core', 'doseevents', { "posology_id": epos.posology_id }, "del");
            }
          });
          p.__posology.sort(function compare(a, b) {
            return moment(a.prescriptionstartdate).toDate().getTime() - moment(b.prescriptionstartdate).toDate().getTime();
          });
          let poslen = p.__posology.length;
          if (poslen > 1) {
            //Update posology end date time of previous posology to current date time // only if the current end date time is less than current time 
            if (!p.__posology[poslen - 2].prescriptionenddate || moment(p.__posology[poslen - 2].prescriptionenddate).isSameOrAfter(currentdatetime)) {
              p.__posology[poslen - 2].prescriptionenddate = this.appService.getDateTimeinISOFormat(currentdatetime.clone().subtract(1, "minute").toDate());// moment(currentposology.prescriptionstartdate).subtract(1, "minute");
            }
          }
        }
        else {
          upsertManager.addEntity('core', 'dose', { "posology_id": p.__editingprescription.__posology[0].posology_id }, "del");
          upsertManager.addEntity('core', 'doseevents', { "posology_id": p.__editingprescription.__posology[0].posology_id }, "del");
        }
      }
    });
    parray.forEach(p => {
      let presc = FormSettings.CleanAndCloneObject(p);

      upsertManager.addEntity('core', 'prescription', JSON.parse(JSON.stringify(presc)));
      p.__medications.forEach(m => {
        var med = FormSettings.CleanAndCloneObject(m);
        upsertManager.addEntity('core', 'medication', JSON.parse(JSON.stringify(med)));
        m.__ingredients.forEach(mig => {
          upsertManager.addEntity('core', 'medicationingredients', JSON.parse(JSON.stringify(mig)));
        });
        m.__codes.forEach(mcd => {
          upsertManager.addEntity('core', 'medicationcodes', JSON.parse(JSON.stringify(mcd)));
        });
      });
      p.__posology.forEach(pos => {
        pos.__dose.forEach(d => {
          Object.keys(d).map((e) => { if (e.startsWith("_")) delete d[e]; })
        });
        upsertManager.addEntity('core', 'posology', JSON.parse(JSON.stringify(FormSettings.CleanAndCloneObject(pos))));
        if (pos.iscurrent == true)
          upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(pos.__dose)));
      });
      upsertManager.addEntity('core', "prescriptionroutes", JSON.parse(JSON.stringify(p.__routes)));
      if (p.__editingreviewstatus)
        upsertManager.addEntity('local', "epma_prescriptionreviewstatus", JSON.parse(JSON.stringify(p.__editingreviewstatus)));
      if (!p.__editingprescription && p.__initialreminder) {
        upsertManager.addEntity('local', "epma_prescriptionreminders", JSON.parse(JSON.stringify(p.__initialreminder)));
      }

      //if there is a supply request object add it too
      if (!p.__editingprescription && p.__SupplyRequests) {
        p.__SupplyRequests.forEach(sp => {
          upsertManager.addEntity('local', "epma_supplyrequest", JSON.parse(JSON.stringify(sp)));
        });
      }

      //for new addtions to MOA or MOD or OP insert into moaprescriptions and modprescriptions mapping tables
      if (prescriptionscontexttype && !p.__editingprescription) {
        if (prescriptionscontexttype == FormContext.moa) {
          let moa = new Epma_Moaprescriptions();
          moa.epma_medsonadmission_id = (<Epma_Medsonadmission>prescriptionscontext).epma_medsonadmission_id;
          moa.epma_moaprescriptions_id = uuid();
          moa.prescription_id = p.prescription_id;
          moa.person_id = p.person_id;
          moa.encounter_id = p.encounter_id;
          upsertManager.addEntity('local', "epma_moaprescriptions", JSON.parse(JSON.stringify(moa)));
        }
        else if (prescriptionscontexttype == FormContext.mod) {
          let mod = new Epma_Modprescriptions();
          mod.epma_medsondischarge_id = (<Epma_Medsondischarge>prescriptionscontext).epma_medsondischarge_id;
          mod.epma_modprescriptions_id = uuid();
          mod.prescription_id = p.prescription_id;
          mod.person_id = p.person_id;
          mod.encounter_id = p.encounter_id;
          upsertManager.addEntity('local', "epma_modprescriptions", JSON.parse(JSON.stringify(mod)));
        }
        else if (prescriptionscontexttype == FormContext.op) {
          let op = new Opprescriptiontherapies();
          op.epma_outpatientprescriptions_id = (<Outpatientprescriptions>prescriptionscontext).epma_outpatientprescriptions_id;
          op.epma_opprescriptiontherapies_id = uuid();
          op.prescription_id = p.prescription_id;
          op.person_id = p.person_id;
          op.encounter_id = p.encounter_id;
          upsertManager.addEntity('local', "epma_opprescriptiontherapies", JSON.parse(JSON.stringify(op)));
        }
      }
    });

    // if moa/mod context - update the context table to set complete = false
    if (prescriptionscontexttype && prescriptionscontexttype == FormContext.moa) {
      (<Epma_Medsonadmission>prescriptionscontext).action = ReconciliationListActions.edit;
      (<Epma_Medsonadmission>prescriptionscontext).iscomplete = false;
      (<Epma_Medsonadmission>prescriptionscontext).modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      (<Epma_Medsonadmission>prescriptionscontext).modifiedby = this.appService.loggedInUserName;

      upsertManager.addEntity('local', "epma_medsonadmission", JSON.parse(JSON.stringify(prescriptionscontext)));
    }
    else
      if (prescriptionscontexttype && prescriptionscontexttype == FormContext.mod) {
        (<Epma_Medsondischarge>prescriptionscontext).action = ReconciliationListActions.edit;
        (<Epma_Medsondischarge>prescriptionscontext).iscomplete = false;
        (<Epma_Medsondischarge>prescriptionscontext).modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        (<Epma_Medsondischarge>prescriptionscontext).modifiedby = this.appService.loggedInUserName;

        upsertManager.addEntity('local', "epma_medsondischarge", JSON.parse(JSON.stringify(prescriptionscontext)));
      }

    if ((prescriptionscontexttype == FormContext.moa || prescriptionscontexttype == FormContext.mod) && dischargesummaryContext) {
      if ((<Epma_Dischargesummarry>dischargesummaryContext).action == ReconciliationListActions.complete) {
        (<Epma_Dischargesummarry>dischargesummaryContext).action = ReconciliationListActions.resetcompletestatus;
        (<Epma_Dischargesummarry>dischargesummaryContext).iscomplete = false;
        (<Epma_Dischargesummarry>dischargesummaryContext).modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        (<Epma_Dischargesummarry>dischargesummaryContext).modifiedby = this.appService.loggedInUserName;

        upsertManager.addEntity('local', "epma_dischargesummarry", JSON.parse(JSON.stringify(dischargesummaryContext)));
      }
    }

    let synchronousPost = true;
    if (prescriptionscontexttype == FormContext.moa) {
      synchronousPost = false;
    }

    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();
      sub.next({ "status": true, "response": resp.data });
      sub.complete();

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        sub.next({ "status": false, "response": error });
        sub.complete();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }

      }, synchronousPost
    );
    //console.warn(upsertManager.entities)
    return sub.asObservable();
  }

  ComparePrescriptions(p: Prescription, p1: Prescription) {

    //compare interval
    if (p.__posology[0].frequency != p1.__posology[0].frequency) {
      return false;
    }
    if (p.__posology[0].frequencysize != p1.__posology[0].frequencysize) {
      return false;
    }

    if (p.__posology[0].dosetype != p1.__posology[0].dosetype) {
      return false;
    }
    if (p.__posology[0].__dose.length != p1.__posology[0].__dose.length) {
      return false
    }

    //compare dose
    for (var i = 0; i < p.__posology[0].__dose.length; i++) {
      const d = p.__posology[0].__dose[i];
      const d1 = p1.__posology[0].__dose[i];

      if (p.__posology[0].dosetype == DoseType.descriptive && d.descriptivedose != d1.descriptivedose) {
        return false;
      }
      else
        if (p.__posology[0].dosetype == DoseType.strength
          && (d.strengthneumerator != d1.strengthneumerator
            ||
            d.strengthdenominator != d1.strengthdenominator)) {
          return false;
        } else
          if (p.__posology[0].dosetype == DoseType.units &&
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
    if (p.__posology[0].prn != p1.__posology[0].prn)
      return false;

    //do
    if (p.__posology[0].doctorsorder != p1.__posology[0].doctorsorder)
      return false;

    //chosendays
    if (p.__posology[0].daysofweek != p1.__posology[0].daysofweek)
      return false;

    //everyndays
    if (p.__posology[0].dosingdaysfrequency != p1.__posology[0].dosingdaysfrequency)
      return false;
    //everyndays
    if (p.__posology[0].dosingdaysfrequencysize != p1.__posology[0].dosingdaysfrequencysize)
      return false;

    //comments
    if ((p.comments ?? "").toLowerCase().trim() != (p1.comments ?? "").toLowerCase().trim())
      return false;

    // //additional conditions
    // if (p.prescriptionadditionalconditions_id != p.prescriptionadditionalconditions_id)
    //   return false;

    //indications

    if (p.indication != p1.indication || p.otherindications != p1.otherindications) {
      return false
    }


    //compare start and end date times 
    if (!moment(p.lastmodifiedfrom).isSame(moment(p.startdatetime)))
      return false;

    return null;

  }

  RoundtoFactor(input: number) {
    if (!isNaN(input) && input > 0) {
      var roundingfactor = this.roundingfactor;
      if (!isNaN(roundingfactor) && +roundingfactor > 0) {
        var fractions = input / roundingfactor;
        var roundedfractions = Math.round(fractions);
        var roundedtofactor = roundedfractions * roundingfactor;
        return roundedtofactor;
      }
    }
    return input;
  }

  // Saveprescription(p: Prescription): Observable<any> {
  //   const sub = new Subject();
  //   var upsertManager = new UpsertTransactionManager();
  //   upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

  //   var presc = FormSettings.CleanAndCloneObject(p);
  //   var pos = FormSettings.CleanAndCloneObject(p.__posology);
  //   upsertManager.addEntity('core', 'prescription', JSON.parse(JSON.stringify(presc)));
  //   p.__medications.forEach(m => {
  //     var med = FormSettings.CleanAndCloneObject(m);
  //     upsertManager.addEntity('core', 'medication', JSON.parse(JSON.stringify(med)));
  //     m.__ingredients.forEach(mig => {
  //       upsertManager.addEntity('core', 'medicationingredients', JSON.parse(JSON.stringify(mig)));
  //     });
  //     m.__codes.forEach(mcd => {
  //       upsertManager.addEntity('core', 'medicationcodes', JSON.parse(JSON.stringify(mcd)));
  //     });
  //   });
  //   upsertManager.addEntity('core', 'posology', JSON.parse(JSON.stringify(pos)));
  //   upsertManager.addEntity('core', 'dose', JSON.parse(JSON.stringify(p.__posology.__dose)));
  //   upsertManager.addEntity('core', "prescriptionroutes", JSON.parse(JSON.stringify(p.__routes)));

  //   upsertManager.save((resp) => {
  //this.appService.UpdateDataVersionNumber(resp);

  //     this.appService.logToConsole(resp);
  //     upsertManager.destroy();
  //     sub.next({ "status": true, "response": resp });
  //     sub.complete();
  //   },
  //     (error) => {
  //       this.appService.logToConsole(error);
  //       upsertManager.destroy();
  //       sub.next({ "status": false, "response": error });
  //       sub.complete();
  //     }
  //   );
  //   return sub.asObservable();
  // }


  static CleanAndCloneObject(obj: any) {
    var clone = {};

    Object.keys(obj).map((e) => {
      if (!e.startsWith("__")) {
        clone[e] = obj[e];
      }
    });
    return clone;
  }

  static CleanAndCloneObjectProperties(obj: any) {
    var clone = {};

    Object.keys(obj).map((e) => {

      if (!e.startsWith("__")) {
        if (typeof e != "object")
          clone[e] = obj[e];
      }
    });
    return clone;
  }

  static CloneObject(obj: any) {
    var clone = {};

    Object.keys(obj).map((e) => {
      if (moment.isMoment(obj[e])) {
        clone[e] = moment(obj[e]).clone();
      }
      else if (typeof obj[e]?.getMonth === 'function') {
        clone[e] = moment(obj[e]).clone().toDate();
      }
      else if (typeof e == "object") {
        clone[e] = Object.assign(clone[e], this.CloneObject(obj[e]));
      }
      else
        clone[e] = obj[e];

    });
    return clone;
  }


  public CloneDosingPattern(dp: Array<Timeslot>) {
    let n: Array<Timeslot> = [];
    dp.forEach((p) => {
      n.push(Object.assign(new Timeslot(), p));
    })
    return n;
  }
  static GetMomentForDateAndTimeslot(d: moment.Moment, ts: Timeslot) {
    var dc = d.clone();
    dc.set("hour", ts.hour);
    dc.set("minute", ts.minute);
    dc.set("millisecond", 0);
    dc.set("second", 0);

    return dc;
  }

  static GetMomentForDateAndTimeslotString(d: moment.Moment, ts: string): moment.Moment {
    if (FormSettings.IsValidTimeSlotString(ts) && moment.isMoment(d)) {
      return FormSettings.GetMomentForDateAndTimeslot(d, new Timeslot(+ts.split(":")[0], +ts.split(":")[1]));
    }
    else return null;
  }

  static IsValidTimeSlotString(e: string) {
    if (FormSettings.IsNullOrEmpty(e))
      return false;

    var th = e.split(':');
    if (th.length == 2) {
      if (isNaN(+th[0]) || isNaN(+th[1]))
        return false;
      else {
        if (+th[0] < 0 || +th[0] > 23 || +th[1] < 0 || +th[0] > 59)
          return false;
        else
          return true;
      }
    }
    return false;
  }
}

export class Indication extends PrescriptionIndication {
  selected: boolean
}

export class Source extends PrescriptionSource {
  selected: boolean
}
export class Diluent {
  fs: FormSettings
  ts: Timeslot
  showmedicationflag: boolean
  constructor() {

  }
}
export class CheckboxControl {
  name: string;
  value: string;
  isChecked;
}

export class Route extends Prescriptionroutes {
  isChecked;
  isPrimary;

}

export class Timeslot {

  public dose_size: any
  public dose_units: string
  public dose_unitsofmeasure: string

  public dose_strength_neumerator: number
  public dose_strength_neumerator_units: string
  public dose_strength_denominator: number
  public dose_strength_denominator_units: string

  public dose_description: string

  public infusionrate: number
  public infusiondoserate: number

  public date: moment.Moment
  public dose_totalstrength: any;
  public calculatorinput: any;
  public calculatorinput_doserate: any;

  GetFormatString(): string {
    var formatstring = (this.hour < 10 ? "0" + this.hour : this.hour) + ':' + (this.minute < 10 ? "0" + this.minute : this.minute);
    if (!FormSettings.IsValidTimeSlotString(formatstring))
      return "--:--"
    else
      return formatstring;
  }

  GetDoseFormatString(f: FormSettings): string {
    var ret = [];
    if (f.dose_type == DoseType.units) {
      ret.push(this.dose_size);
      ret.push(" ");
      ret.push(f.dose_units);
    }
    if (f.dose_type == DoseType.strength) {
      ret.push(this.dose_strength_neumerator);
      ret.push(" ");
      ret.push(f.dose_strength_neumerator_units);
      ret.push("/");
      ret.push(this.dose_strength_denominator);
      ret.push(" ");
      ret.push(f.dose_strength_denominator_units);
    }
    if (f.dose_type == DoseType.descriptive) {
      ret.push(this.dose_description);
    }
    return ret.join("");
  }

  constructor(public hour?: number, public minute?: number) {
  }

}
export class InfusionRate {
  constructor(public starttime?: Timeslot, public endtime?: Timeslot) {
  }
}
export class ProtocolInterval {
  constructor(public date?: moment.Moment, public intervalpattern: Array<Timeslot> = []) {
  }
}

export class PRNMaxDose {
  constructor(public maxnumerator?, public maxdenominator?, public maxtimes?,
    public n_units?, public d_units?, public type?) {
  }

  GetObject(fs: FormSettings) {
    if (fs.dose_type == DoseType.units) {
      if (fs.isNeumeratorOnlyStrength) {
        this.maxnumerator = fs.prnMaxDose_TimeSlot.dose_totalstrength;
        this.maxdenominator = fs.prnMaxDose_TimeSlot.dose_size;
        this.d_units = fs.dose_units;
        this.n_units = fs.singleIngredientStrength;
        this.type = "numeratoronlystrength";
      }
      else {
        this.maxdenominator = fs.prnMaxDose_TimeSlot.dose_size;
        this.d_units = fs.dose_units;
        this.type = "units";
      }
    }
    if (fs.dose_type == DoseType.strength) {
      this.maxnumerator = fs.prnMaxDose_TimeSlot.dose_strength_neumerator;
      this.maxdenominator = fs.prnMaxDose_TimeSlot.dose_strength_denominator;
      this.d_units = fs.dose_strength_denominator_units;
      this.n_units = fs.dose_strength_neumerator_units;
      this.type = "strength";
    }
    if (fs.dose_type == DoseType.descriptive) {
      this.maxtimes = fs.prnMaxDose_TimeSlot.dose_description;
      this.type = "na";
    }

    if (this.type)
      return this;
    else
      return null;
  }

  SetFSObject(prnmaxdose: string, fs: FormSettings) {
    if (prnmaxdose) {
      const obj = <PRNMaxDose>JSON.parse(prnmaxdose);
      fs.prnMaxDose_TimeSlot = new Timeslot();
      if (fs.dose_type == DoseType.units) {
        if (fs.isNeumeratorOnlyStrength) {
          fs.prnMaxDose_TimeSlot.dose_totalstrength = obj.maxnumerator;
          fs.prnMaxDose_TimeSlot.dose_size = obj.maxdenominator;
        }
        else {
          fs.prnMaxDose_TimeSlot.dose_size = obj.maxdenominator;
        }
      }
      if (fs.dose_type == DoseType.strength) {
        fs.prnMaxDose_TimeSlot.dose_strength_neumerator = obj.maxnumerator;
        fs.prnMaxDose_TimeSlot.dose_strength_denominator = obj.maxdenominator;
      }
      if (fs.dose_type == DoseType.descriptive) {
        fs.prnMaxDose_TimeSlot.dose_description = obj.maxtimes;
      }
    }
  }
}

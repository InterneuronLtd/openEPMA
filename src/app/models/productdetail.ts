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


export interface ContraIndication {
    cd?: string;
    desc?: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source?: string;
    additionalProperties?: any;
}


export interface LicensedUs {
    cd?: string;
    desc?: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source?: string;
    additionalProperties?: any;
}
export interface UnLicensedUs {
    cd?: string;
    desc?: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source?: string;
    additionalProperties?: any;
}

export interface ChildFormulation {
    cd?: string;
    desc?: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source?: any;
    additionalProperties?: any;
}


export class Detail {
    rowId: string;
    createddate: Date;
    createdby: string;
    updateddate: Date;
    updatedby: string;
    formularyVersionId: string;
    medicationTypeCode?: any;
    medicationTypeDesc?: any;
    codeSystem: string;
    atcCode?: any;
    rnohFormularyStatuscd: string;
    rnohFormularyStatusDesc?: any;
    orderableCd?: any;
    orderableDesc?: any;
    inpatientMedicationCd?: any;
    outpatientMedicationCd?: any;
    isBloodProduct: boolean;
    isDiluent: boolean;
    isModifiedRelease: boolean;
    isPrescriptionPrintingRequired:boolean;
    isGastroResistant: boolean;
    prescribable: boolean;
    prescribableSource: string;
    prescribingStatusCd: string;
    prescribingStatusDesc?: any;
    rulesCd?: any;
    unlicensedMedicationCd?: any;
    definedDailyDose?: any;
    notForPrn?: any;
    highAlertMedication?: any;
    ignoreDuplicateWarnings?: any;
    medusaPreparationInstructions?: string[];
    criticalDrug?: any;
    controlledDrugCategories?: any;
    cytotoxic?: any;
    clinicalTrialMedication?: any;
    fluid?: any;
    antibiotic?: any;
    anticoagulant?: any;
    antipsychotic?: any;
    antimicrobial?: any;
    addReviewReminder?: any;
    ivToOral?: any;
    titrationTypes: any;
    roundingFactorCd?: any;
    roundingFactorDesc?: any;
    maxDoseNumerator?: any;
    maximumDoseUnitCd?: any;
    maximumDoseUnitDesc?: any;
    witnessingRequired?: any;
    niceTa?: any;
    markedModifierCd?: any;
    markedModifierDesc?: any;
    insulins?: any;
    mentalHealthDrug?: any;
    basisOfPreferredNameCd: string;
    basisOfPreferredNameDesc?: any;
    sugarFree: string;
    glutenFree?: any;
    preservativeFree?: any;
    cfcFree?: any;
    doseFormCd: string;
    doseFormDesc: string;
    unitDoseFormSize: number;
    unitDoseFormUnits: string;
    unitDoseFormUnitsDesc: string;
    unitDoseUnitOfMeasureCd: string;
    unitDoseUnitOfMeasureDesc: string;
    formCd: string;
    formDesc: string;
    tradeFamilyCd?: any;
    tradeFamilyName?: any;
    expensiveMedication?: any;
    modifiedReleaseCd?: any;
    modifiedReleaseDesc?: any;
    blackTriangle: string;
    supplierCd?: any;
    supplierDesc?: any;
    currentLicensingAuthorityCd?: any;
    currentLicensingAuthorityDesc?: any;
    emaAdditionalMonitoring?: any;
    parallelImport?: any;
    restrictionsOnAvailabilityCd?: any;
    restrictionsOnAvailabilityDesc?: any;
    drugClass?: any;
    restrictionNote?: any;
    restrictedPrescribing?: any;
    sideEffects: SideEffect[];
    cautions: Caution[];
    contraIndications: ContraIndication[];
    safetyMessages: any[];
    customWarnings: any[];
    endorsements: string[];
    licensedUses: LicensedUs[];
    unLicensedUses: UnLicensedUs[];
    orderableFormtypeCd?: any;
    orderableFormtypeDesc?: any;
    childFormulations: ChildFormulation[];
    modifiedReleases: any[];
    diluents: any[];
    isCustomControlledDrug: boolean;
    isIndicationMandatory: boolean;
    reminders: Reminder[];
}
export interface Caution {
    cd: string;
    desc: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source: string;
    additionalProperties?: any;
}
export interface Reminder {
    active: boolean;
    duration: number;
    reminder: string;
    source: string;
}

export interface SideEffect {
    cd: string;
    desc: string;
    type?: any;
    isDefault?: any;
    recordstatus?: any;
    source: string;
    additionalProperties?: any;
}

export class FormularyIngredient {
    rowId: string;
    createddate: Date;
    createdby: string;
    updateddate: Date;
    updatedby: string;
    formularyVersionId: string;
    ingredientCd: string;
    ingredientName: string;
    basisOfPharmaceuticalStrengthCd: string;
    basisOfPharmaceuticalStrengthDesc: string;
    strengthValueNumerator: string;
    strengthValueNumeratorUnitCd: string;
    strengthValueNumeratorUnitDesc: string;
    strengthValueDenominator?: any;
    strengthValueDenominatorUnitCd: string;
    strengthValueDenominatorUnitDesc?: any;
}

export class FormularyRouteDetail {
    rowId: string;
    createddate: Date;
    createdby: string;
    updateddate: Date;
    updatedby: string;
    formularyVersionId: string;
    routeCd: string;
    routeDesc: string;
    routeFieldTypeCd: string;
    routeFieldTypeDesc: string;
}

export class Product {
    rowId: string;
    createddate: Date;
    createdby: string;
    updateddate: Date;
    updatedby: string;
    formularyId: string;
    versionId: number;
    formularyVersionId: string;
    code: string;
    name: string;
    productType: string;
    parentCode: string;
    parentName?: any;
    parentProductType: string;
    recStatusCode: string;
    recStatuschangeTs?: any;
    recStatuschangeDate: Date;
    recStatuschangeTzname?: any;
    recStatuschangeTzoffset?: any;
    isDuplicate: boolean;
    recStatuschangeMsg?: any;
    duplicateOfFormularyId?: any;
    isLatest: boolean;
    recSource: string;
    vtmId: string;
    vmpId?: any;
    formularyAdditionalCodes?: any;
    detail: Detail;
    formularyIndications?: any;
    formularyIngredients: FormularyIngredient[];
    formularyRouteDetails: FormularyRouteDetail[];
    formularyOntologyForms?: any;
}


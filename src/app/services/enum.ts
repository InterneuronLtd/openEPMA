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
export enum title {
  Administer_PRN = "PRN",
  Administration_Completed_early = "Completed early",
  Administration_Completed_late = "Completed late",
  Administration_Defered = "Defered",
  Administration_Deferedinfusion = "Defered",
  Administration_Failed = "Failed",
  EnterInError="Enter In Error",
  AdministrationInfution_Failed = "Failed",
  Due_Administration = "Due",
  Late_Administration = "Missed",
  Planned_Administration = "Planned",
  Administration_withheld_by_doctor = "Withheld by doctor",
  Administration_withheld_by_doctor_Infution ="Withheld by doctor",
  Completed_Administration = "Completed",
  Dose_Administered_Is_A_Different_Product_From_Prescribed="Dose Administered Is A Different Product",
  Dose_Administered_Late_Is_A_Different_Product_From_Prescribed="Dose Administered Late Is A Different Product From Prescribed",
  Dose_Administered_Early_Is_A_Different_Product_From_Prescribed="Dose Administered Early Is A Different Product From Prescribed",
  Dose_administered_is_differnt_from_prescribed = "Dose administered is differnt from prescribed",
  Dose_administered_early_is_differnt_from_prescribed = "Dose administered early is differnt from prescribed",
  Dose_administered_late_is_differnt_from_prescribed = "Dose administered late is differnt from prescribed",
  Administration_requires_doctors_confirmation_Planned = "Planned: requires prescriber to confirm",
  Administration_requires_doctors_confirmation_Late = "Administration requires doctors confirmation Missed",
  Administration_requires_doctors_confirmation_Due = "Administration requires doctors confirmation Due",
  Infusionplanned = "Infusion planned",
  Infusiondue = "Infusion due",
  InfusionLate = "Infusion Missed",
  Infusioncompletionplanned = "Infusion completion planned",
  InfusionCompletiondue = "Infusion completion due",
  InfusionCompleteoverdue = "Infusion Complete overdue",
  durationline = "",
  PRNRange = "PRN",
  IncreaseInfusionRatePlanned = "Increase Infusion Rate Planned",
  IncreaseInfusionRateDue = "Increase Infusion Rate Due",
  IncreaseInfusionRateLate = "Increase Infusion Rate Missed",

  DecreaseInfusionRateLate = "Decrease Infusion Rate Missed",
  DecreaseInfusionRateDue = "Decrease Infusion Rate Due",
  DecreaseInfusionRatePlanned = "Decrease Infusion Rate Planned",
  BolusAdministrationCompleted = "Bolus Administration Completed",

  additionaladministration = "Additional Administration",

  Infusiondone = "Infusion done",

  InfusionCompletedEarly = "Infusion Completed Early",
  InfusionCompletedLate = "Infusion Completed Late",
  IncreaseInfusionRatedone = "Increase Infusion Rate done",
  IncreaseInfusionRatedonelate = "Increase Infusion Rate done late",
  IncreaseInfusionRatedoneearly = "Increase Infusion Rate done early",
  DecreaseInfusionRatedone = "Decrease Infusion Rate done",
  DecreaseInfusionRatedonelate = "Decrease Infusion Rate done late",
  DecreaseInfusionRatedoneearly = "Decrease Infusion Rate done early",
  InfusionCompleteddone = "Infusion Completed done",
  InfusionCompletedEarly2 = "Infusion Completed Early",
  InfusionCompletedLate2 = "Infusion Completed Late",

  AdjustedIncreaseInfusionRatedonelate = "Adjusted Increase Infusion Rate done late",
  AdjustedIncreaseInfusionRatedoneearly = "Adjusted Increase Infusion Rate done early",
  AdjustedDecreaseInfusionRatedone = "Adjusted Decrease Infusion Rate done",
  AdjustedDecreaseInfusionRatedonelate = "Adjusted Decrease Infusion Rate done late",
  AdjustedDecreaseInfusionRatedoneearly = "Adjusted Decrease Infusion Rate done early",

  AdjustedIncreaseInfusionRatedone = "Adjusted Increase Infusion Rate done",
  MaintainInfusionRatedoneearly = "Adjusted Increase Infusion Rate done",
  MaintainInfusionRatedonelate = "Maintain Infusion Rate done late",

  AdjustedsameInfusionRatedone = "Adjusted same Infusion Rate done",

  FaliedtoAdjustInfusionRatedonelate = "Falied to Adjust Infusion Rate done late",
  FaliedtoAdjustInfusionRatedoneearly = "Falied to Adjust Infusion Rate done early'></div>",

  InfusionRatePaused = "Paused",

  ContinuousInfusionSetChanged = "Set Changed",

  Continuousinfusionsyringeorbagchange = "syringe or bag change",

  Maintain_Infusion_Rate_done = "Maintain Infusion Rate done",
  Adjusted_Decrease_Infusion_Rate_Done_Kit_Change = "Decrease Infusion Rate and Kit Change",
  Adjusted_Increase_Infusion_Rate_Done_Kit_Change = "Increase Infusion Rate and Kit Change",
  Adjusted_Maintain_Infusion_Rate_Done_Kit_Change = "Maintain Infusion Rate and Kit Change",
  Maintain_Infusion_Rate_Late = "Maintain Infusion Rate Missed",
  Maintain_Infusion_Rate_Planned = "Maintain Infusion Rate Planned",
  Maintain_Infusion_Rate_Due = "Maintain Infusion Rate Due",
  Cancelled = "Cancelled",

  Recordadditionaladministration = "Record Additional Administration",
  resupply="Resupply",
  ComplianceAid="Compliance Aid",
  Highalertmedication="High alert medication",
  NursingInstruction="Nursing Instruction",
  pharmacyreview="Pharmacy Review",
  critialdrug="Critial Drug",
  nonformularymedication="NoN Formulary Medication",
  clinicaltrialmedicine="Clinical Trial Medicine",
  expensivemedication="Expensive Medication",
  highalertmedication="Highalert Medication",
  unlicencedmedicine="Unlicenced Medicine"

  
}

export enum contents {
  Administer_PRN = "<div  class='Administer_PRN'></div>",
  Administration_Completed_early = "<div class='Administration_Completed_early'></div>",
  Administration_Completed_late = "<div class='Administration_Completed_late'></div>",
  Administration_Defered = "<div class='Administration_Defered'></div>",
  Administration_Deferedinfusion = "<div class='Administration_Deferedinfusion'></div>",
  Administration_Failed = "<div class='Administration_Failed'></div>",
  AdministrationInfution_Failed = "<div class='AdministrationInfution_Failed'></div>",
  Due_Administration = "<div class='Due_Administration'></div>",
  Late_Administration = "<div class='Late_Administration'></div>",
  Planned_Administration = "<div class='Planned_Administration'></div>",
  Administration_withheld_by_doctor = "<div class='Administration_withheld_by_doctor'></div>",
  Administration_withheld_by_doctor_Infution = "<div class='Administration_withheld_by_doctor_Infution'></div>",
  Dose_Administered_Early_Is_A_Different_Product_From_Prescribed = "<div class='Dose_Administered_Early_Is_A_Different_Product_From_Prescribed'></div>",
  Dose_Administered_Is_A_Different_Product_From_Prescribed = "<div class='Dose_Administered_Is_A_Different_Product_From_Prescribed'></div>",
  Dose_Administered_Late_Is_A_Different_Product_From_Prescribed = "<div class='Dose_Administered_Late_Is_A_Different_Product_From_Prescribed'></div>",
  Completed_Administration = "<div class='Completed_Administration'></div>",
  Dose_administered_is_differnt_from_prescribed = "<div class='Dose_administered_is_differnt_from_prescribed'></div>",
  Dose_administered_early_is_differnt_from_prescribed = "<div class='Dose_administered_early_is_differnt_from_prescribed'></div>",
  Dose_administered_late_is_differnt_from_prescribed = "<div class='Dose_administered_late_is_differnt_from_prescribed'></div>",
  Administration_requires_doctors_confirmation_Planned = "<div class='Administration_requires_doctors_confirmation_Planned'></div>",
  Administration_requires_doctors_confirmation_Late = "<div class='Administration_requires_doctors_confirmation_Late'></div>",
  Administration_requires_doctors_confirmation_Due = "<div class='Administration_requires_doctors_confirmation_Due'></div>",
  Infusionplanned = "<div class='Infusionplanned'></div>",
  Infusiondue = "<div class='Infusiondue'></div>",
  InfusionLate = "<div class='InfusionLate'></div>",
  Infusioncompletionplanned = "<div class='Infusioncompletionplanned'></div>",
  InfusionCompletiondue = "<div class='InfusionCompletiondue'></div>",
  InfusionCompleteoverdue = "<div class='InfusionCompleteoverdue'></div>",
  durationline = "<div></div>",
  PRNRange = "<div class='PRNRange'></div>",
  ReminderAcknowledged = "<div class='ReminderAcknowledged'></div>",
  Reminder = "<div class='Reminder'></div>",
  Reminderdue = "<div class='Reminderdue'></div>",
  Reminderoverdue = "<div class='Reminderoverdue'></div>",
  Multiple_Reminders = "<div class='Multiple_Reminders'></div>",
  IncreaseInfusionRatePlanned = "<div class='IncreaseInfusionRatePlanned'></div>",
  IncreaseInfusionRateDue = "<div class='IncreaseInfusionRateDue'></div>",
  IncreaseInfusionRateLate = "<div class='IncreaseInfusionRateLate'></div>",

  DecreaseInfusionRateLate = "<div class='DecreaseInfusionRateLate'></div>",
  DecreaseInfusionRateDue = "<div class='DecreaseInfusionRateDue'></div>",
  DecreaseInfusionRatePlanned = "<div class='DecreaseInfusionRatePlanned'></div>",
  BolusAdministrationCompleted = "<div class='BolusAdministrationCompleted'></div>",

  additionaladministration = "<div class='additionaladministration'></div>",
  Multiple_Reminders_With_The_Date = "<div class='Multiple_Reminders_With_The_Date'></div>",
  Multiple_Reminders_One_Day_Has_Passed = "<div class='Multiple_Reminders_One_Day_Has_Passed'></div>",
  Multiple_Reminders_Has_Been_Acknowledged = "<div class='Multiple_Reminders_Has_Been_Acknowledged'></div>",
  Infusiondone = "<div class='Infusiondone'></div>",
  EnterInError="<div class='EnterInError'></div>",
  EnterInErrorbolus="<div class='EnterInErrorbolus'></div>",
  InfusionCompletedEarly = "<div class='InfusionCompletedEarly'></div>",
  InfusionCompletedLate = "<div class='InfusionCompletedLate'></div>",
  IncreaseInfusionRatedone = "<div class='IncreaseInfusionRatedone'></div>",
  IncreaseInfusionRatedonelate = "<div class='IncreaseInfusionRatedonelate'></div>",
  IncreaseInfusionRatedoneearly = "<div class='IncreaseInfusionRatedoneearly'></div>",
  DecreaseInfusionRatedone = "<div class='DecreaseInfusionRatedone'></div>",
  DecreaseInfusionRatedonelate = "<div class='DecreaseInfusionRatedonelate'></div>",
  DecreaseInfusionRatedoneearly = "<div class='DecreaseInfusionRatedoneearly'></div>",
  InfusionCompleteddone = "<div class='InfusionCompleteddone'></div>",
  InfusionCompletedEarly2 = "<div class='InfusionCompletedEarly2'></div>",
  InfusionCompletedLate2 = "<div class='InfusionCompletedLate2'></div>",

  AdjustedIncreaseInfusionRatedonelate = "<div class='AdjustedIncreaseInfusionRatedonelate'></div>",
  AdjustedIncreaseInfusionRatedoneearly = "<div class='AdjustedIncreaseInfusionRatedoneearly'></div>",
  AdjustedDecreaseInfusionRatedone = "<div class='AdjustedDecreaseInfusionRatedone'></div>",
  AdjustedDecreaseInfusionRatedonelate = "<div class='AdjustedDecreaseInfusionRatedonelate'></div>",
  AdjustedDecreaseInfusionRatedoneearly = "<div class='AdjustedDecreaseInfusionRatedoneearly'></div>",

  AdjustedIncreaseInfusionRatedone = "<div class='AdjustedIncreaseInfusionRatedone'></div>",
  MaintainInfusionRatedoneearly = "<div class='AdjustedIncreaseInfusionRatedone'></div>",
  MaintainInfusionRatedonelate = "<div class='MaintainInfusionRatedonelate'></div>",

  AdjustedsameInfusionRatedone = "<div class='AdjustedsameInfusionRatedone'></div>",

  FaliedtoAdjustInfusionRatedonelate = "<div class='FaliedtoAdjustInfusionRatedonelate'></div>",
  FaliedtoAdjustInfusionRatedoneearly = "<div class='FaliedtoAdjustInfusionRatedoneearly'></div>",

  InfusionRatePaused = "<div class='InfusionRatePaused'></div>",

  ContinuousInfusionSetChanged = "<div class='ContinuousInfusionSetChanged'></div>",

  Continuousinfusionsyringeorbagchange = "<div class='Continuousinfusionsyringeorbagchange'></div>",

  Maintain_Infusion_Rate_done = "<div class='Maintain_Infusion_Rate_done'></div>",
  Maintain_Infusion_Rate_Late = "<div class='Maintain_Infusion_Rate_Late'></div>",
  Maintain_Infusion_Rate_Planned = "<div class='Maintain_Infusion_Rate_Planned'></div>",
  Maintain_Infusion_Rate_Due = "<div class='Maintain_Infusion_Rate_Due'></div>",
  Cancelled = "<div title='Cancelled' class='Cancelled'></div>",

  Recordadditionaladministration = "<div  class='Recordadditionaladministration'></div>",

  Adjusted_Maintain_Infusion_Rate_Done_Kit_Change = "<div class='Adjusted_Maintain_Infusion_Rate_Done_Kit_Change'></div>",
  Adjusted_Increase_Infusion_Rate_Done_Kit_Change = "<div class='Adjusted_Increase_Infusion_Rate_Done_Kit_Change'></div>",
  Adjusted_Decrease_Infusion_Rate_Done_Kit_Change = "<div class='Adjusted_Decrease_Infusion_Rate_Done_Kit_Change'></div>"
}

export enum OpPrescriptionType {
  ["NHS"] = "NHS",
  ["Private"] = "Private"
}

export enum OpPrescriptionCategory {
  ["Outpatient"] = "Outpatient",
  ["Homecare"] = "Homecare",
  ["Clinicaltrial"] = "Clinical trial"
}

export enum OpDispensing {
  ["Radiology"] = "Radiology",
  ["OutpatientStanmore"] = "Outpatient Stanmore",
  ["Outpatient Bolsover"] = "Outpatient Bolsover",
  ["OPAT"] = "OPAT",
  ["POA"] = "POA",
  ["Orthotics"] = "Orthotics",
  ["PhilipNewmanWard"] = "Philip Newman Ward",
  ["Patient/Relative/StaffCollecting"] = "Patient/Relative/Staff Collecting"
}


export enum DoseType {
  ["units"] = "units",
  ["strength"] = "strength",
  ["descriptive"] = "descriptive",
}

export enum FrequencyType {
  ["stat"] = "stat",
  ["mor"] = "mor",
  ["mid"] = "mid",
  ["eve"] = "eve",
  ["night"] = "night",
  ["x"] = "x",
  ["h"] = "h"
}

export enum IntervalType {
  ["standard"] = "standard",
  ["variable"] = "variable",
  ["protocol"] = "protocol"
}

export enum InfusionType {
  ["ci"] = "ci",
  ["bolus"] = "bolus",
  ["rate"] = "rate",
  ["pca"] = "pca"
}

export enum DoseForm {
  ["Discrete"] = "1",
  ["Continuous"] = "2",
  ["NA"] = "3",
}

export enum PrescriptionDuration {
  ["hours"] = "hours",
  ["days"] = "days",
  ["weeks"] = "weeks",
  ["months"] = "months",
  ["untilcancelled"] = "until cancelled",
  ["enddate"] = "end date"
}
export enum DaysOfWeek {
  ["mon"] = "Monday",
  ["tue"] = "Tuesday",
  ["wed"] = "Wednesday",
  ["thu"] = "Thursday",
  ["fri"] = "Friday",
  ["sat"] = "Saturday",
  ["sun"] = "Sunday"
}

export enum ChosenDays {
  ["all"] = "all",
  ["chosen"] = "chosen",
  ["skip"] = "skip",
}

export enum FormContext {
  ["moa"] = "moa",
  ["mod"] = "mod",
  ["ip"] = "ip",
  ["op"] = "op"

}

export enum PrescriptionContext {
  ["Inpatient"] = "Inpatient",
  ["Outpatient"] = "Outpatient",
  ["Orderset"] = "Orderset",
  ["Admission"] = "Admission",
  ["Discharge"] = "Discharge"
}




export enum ReconciliationListActions {
  ["start"] = "start",
  ["edit"] = "edit",
  ["complete"] = "complete",
  ["notes"] = "notes",
  ["resetcompletestatus"] = "resetcompletestatus"
}

export enum modules {
  ["app-drug-chart"] = "app-drug-chart",
  ["app-therapy-overview"] = "app-therapy-overview",
  ["app-inpatient-prescribing"] = "app-inpatient-prescribing",
  ["app-reconciliation-lists"] = "app-reconciliation-lists",
  ["app-inpatient-prescribing-edit"] = "app-inpatient-prescribing-edit",
  ["app-oplist"]="app-oplist"
}


export enum popovers {
  ["app-additional-administration"] = 'app-additional-administration',
  ["app-add-bolus"] = 'app-add-bolus',
  ["app-adjust-infusion"] = 'app-adjust-infusion',
  ["app-change-infusion"] = 'app-change-infusion',
  ["app-pause-infusion"] = 'app-pause-infusion',
  ["app-restart-infusion"] = 'app-restart-infusion',
  ["app-comments"] = 'app-comments',
  ["app-nursing-instruction"] = 'app-nursing-instruction',
  ["app-view-reminder"] = 'app-view-reminder',
  ["app-record-patientdrug"] = 'app-record-patientdrug',
  ["app-pharmacy-review"] = 'app-pharmacy-review',
  ["app-supply-request"] = 'app-supply-request',
  ["app-titration-chart"] = 'app-titration-chart',
  ["app-end-infusion"] = 'app-end-infusion',
  ["app-away-period"] = 'app-away-period',
  ["app-prescription-history"] = 'app-prescription-history',
  ["none"] = ''
}


export enum AdministrationStatus {
  ["given"] = "given",
  ["defer"] = "defer",
  ["selfadminister"] = "self-administer",
  ["notgiven"] = "notgiven",
}

export enum AdministrationStatusReason {
  ["Patientunavailable"] = "Patient unavailable",
  ["Nilbymouth"] = "Nil by mouth",
  ["Patientrefused"] = "Patient refused",
  ["Drugunavailable"] = "Drug unavailable",
  ["Clinicalreason"] = "Clinical reason",
  ["Other"] = "Other",
}
export enum LevelOfSelfAdmin {
  ["notwitnessedbynurse"] = "Not witnessed by nurse",
  ["witnessedbynurse"] = "Witnessed by nurse",

}

export enum AdministrationType {
  ["record"] = "record",
  ["schedule"] = "schedule",
}

export enum ChangeInfusion {
  ["changeinfusion"] = "changeinfusionset",
  ["changeinfusionkit"] = "changeinfusionkit",

}

export enum PrescriptionStatus {
  ["active"] = "active",
  ["modified"] = "modified",
  ["suspended"] = "suspended",
  ["restarted"] = "restarted",
  ["stopped"] = "stopped",
  ["cancelled"] = "cancelled",
}

export enum SupplyRequestStatus {
  ["Incomplete"] = "Incomplete",
  ["Pending"] = "Pending",
  ["Approved"] = "Approved",
  ["Rejected"] = "Rejected",
  ["Fulfilled"] = "Dispensed",
  ["OutpatientApproved"] = "Screened",
  ["OutpatientChecked"] = "Checked",

}
export enum RoleAction {
  ["epma_access_inpatientprescribing"] = "epma_access_inpatientprescribing",
  ["epma_prescribe_new_ip"] = "epma_prescribe_new_ip",
  ["epma_access_amendprescription"] = "epma_access_amendprescription",
  ["epma_copy_ip"] = "epma_copy_ip",
  ["epma_edit_ip"] = "epma_edit_ip",
  ["epma_start_mod/epma_edit_mod"] = "epma_start_mod/epma_edit_mod",
  ["epma_schedule_additionaladministration"] = "epma_schedule_additionaladministration",
  ["epma_transfer_administrationevent"] = "epma_transfer_administrationevent",
  ["epma_view_ordersetlists"] = "epma_view_ordersetlists",
  ["epma_cancel_plannedevent"] = "epma_cancel_plannedevent",
  ["epma_add_pharmacyreviewcomments_ip"] = "epma_add_pharmacyreviewcomments_ip",
  ["epma_change_pharmacyreviewstatus"] = "epma_change_pharmacyreviewstatus",
  ["epma_access_patientdrugs_moa"] = "epma_access_patientdrugs_moa",
  ["epma_access_patientdrugs_ip"] = "epma_access_patientdrugs_ip",
  ["epma_access_supplyrequest_ip"] = "epma_access_supplyrequest_ip",
  ["epma_access_supplyrequest_mod"] = "epma_access_supplyrequest_mod",
  ["epma_create_supplyrequest_fromadministration"] = "epma_create_supplyrequest_fromadministration",
  ["epma_approve_formulary_supplyequest"] = "epma_approve_formulary_supplyequest",
  ["epma_reject_formulary_supplyequest"] = "epma_reject_formulary_supplyequest",
  ["epma_fulfil_formulary_supplyrequest"] = "epma_fulfil_formulary_supplyrequest",
  ["epma_approve_nonformulary_supplyequest"] = "epma_approve_nonformulary_supplyequest",
  ["epma_reject_nonformulary_supplyequest"] = "epma_reject_nonformulary_supplyequest",
  ["epma_fulfil_nonformulary_supplyrequest"] = "epma_fulfil_nonformulary_supplyrequest",
  ["epma_edit_moa/epma_start_moa"] = "epma_edit_moa/epma_start_moa",
  ["epma_complete_moa"] = "epma_complete_moa",
  ["epma_complete_mod"] = "epma_complete_mod",
  ["epma_edit_modnotes"] = "epma_edit_modnotes",
  ["epma_record_additionaladministration"] = "epma_record_additionaladministration",
  ["epma_add_doctorscomments"] = "epma_add_doctorscomments",
  ["epma_skip_witnessauthentication"] = "epma_skip_witnessauthentication",
  ["epma_mandate_witnessauthentication"] = "epma_mandate_witnessauthentication",
  ["epma_confirm_doctorsorder"] = "epma_confirm_doctorsorder",
  ["epma_create_org_orderset"] = "epma_create_org_orderset",
  ["epma_edit_org_orderset"] = "epma_edit_org_orderset",
  ["epma_delete_org_orderset"] = "epma_delete_org_orderset",
  ["epma_override_warning"] = "epma_override_warning",
  ["epma_canwitnessauth"] = "epma_canwitnessauth",
  ["epma_administer_administrationevent"] = "epma_administer_administrationevent",
  ["epma_reconciliation_pharmacist"] = "epma_reconciliation_pharmacist",
  ["epma_reconciliation_pharmacytech"] = "epma_reconciliation_pharmacytech",
  ["epma_display_dose_as_quantity"] = "epma_display_dose_as_quantity"

}

export enum RefWeightType {
  ["estimated"] = "estimated",
  ["actual"] = "actual"
}

export enum Common{
  ["op_encounter_placeholder"] = "op_encounter_placeholder"
}
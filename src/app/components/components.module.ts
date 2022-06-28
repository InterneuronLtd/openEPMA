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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SearchMedicationComponent } from './search-medication/search-medication.component';
import { PrescribingFormComponent } from './prescribing-form/prescribing-form.component';
import { DrugChartComponent } from './drug-chart/drug-chart.component';
import { PrescriptionTemplateComponent } from './prescription-template/prescription-template.component'
import { PopoverModule } from 'ngx-bootstrap/popover';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { MedicationAdministrationComponent } from './medication-administration/medication-administration.component';
import { PrescriptionHistoryComponent } from './prescription-history/prescription-history.component';
import { TimelineinfoComponent } from './timelineinfo/timelineinfo.component';
import { AdditionalAdministrationComponent } from './additional-administration/additional-administration.component';
import { TimePickerComponent } from './time-picker/time-picker.component';
import { TimepickerDirective } from '../directives/timepicker.directive';
import { DrugInformationComponent } from './drug-information/drug-information.component';
import { AddtoOrdersetComponent } from './addto-orderset/addto-orderset.component';
//import { OrdersetListComponent } from './orderset-list/orderset-list.component';
import { PrescriptionInfusionTemplateComponent } from './prescription-infusion-template/prescription-infusion-template.component';
import { PrescriptionNonInfusionTemplateComponent } from './prescription-non-infusion-template/prescription-non-infusion-template.component';
import { NumberOnlyDirective } from '../directives/number-only.directive'
import { NonNegativeNumbersDirective, NonNegativeNumbersRangeDirective } from '../directives/non-negative-numbers.directive'
import { InputKeyPressDirective } from '../directives/input-key-press.directive';
import { AddBolusComponent } from './add-bolus/add-bolus.component';
import { ChangeInfusionComponent } from './change-infusion/change-infusion.component';
import { AdjustInfusionComponent } from './adjust-infusion/adjust-infusion.component';
import { PauseInfusionComponent } from './pause-infusion/pause-infusion.component';
import { RestartInfusionComponent } from './restart-infusion/restart-infusion.component';
import { DoctorConfirmationComponent } from './doctor-confirmation/doctor-confirmation.component';
import { EndInfusionComponent } from './end-infusion/end-infusion.component';
import { TitrationChartComponent } from './titration-chart/titration-chart.component';
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
import { SelectEncounterComponent } from './select-encounter/select-encounter.component';
import { WarningsLoaderDirective } from '../directives/warnings-loader.directive';



import { RefWeightHeightComponent } from './ref-weight-height/ref-weight-height.component';
import { RecRefHeightComponent } from './rec-ref-height/rec-ref-height.component';
import { DemoChartComponent } from './demo-chart/demo-chart.component';
import { TherapyOverviewComponent } from './therapy-overview/therapy-overview.component';
import { RecordPatientdrugComponent } from './record-patientdrug/record-patientdrug.component';
import { SupplyRequestComponent } from './supply-request/supply-request.component';
import { CommentsComponent } from './comments/comments.component';
import { PharmacyReviewComponent } from './pharmacy-review/pharmacy-review.component';
import { ViewReminderComponent } from './view-reminder/view-reminder.component';
import { AutoGrowDirective, AutoGrowLengthDirective } from '../directives/auto-grow.directive';
import { ParseUrlPipe } from '../directives/parse-url.pipe';
import { NumberToWordsPipe } from '../directives/number-to-words.pipe';
import { NumberMaxLimitDirective } from '../directives/number-max-limit';
import { OrdersetListComponent } from './orderset-list/orderset-list.component';
import { CompleteReconciliationComponent } from './complete-reconciliation/complete-reconciliation.component';
import { NursingInstructionComponent } from './nursing-instruction/nursing-instruction.component';
import { AdmissionRecordsTemplate } from './admission-records-templates/admission-records-template.component';
import { PrintDischargeComponent } from './print-discharge/print-discharge.component';
import { DatePickerComponent } from './date-picker/date-picker.component';
import { TemplateNumberComponent } from './template-number/template-number.component';
import { WarningsComponent } from './warnings/warnings.component';
import { WarningsModComponent } from './warnings-mod/warnings-mod.component';
import { BannerWarningsComponent } from './banner-warnings/banner-warnings.component';
import { DemoAdmissionRecordComponent } from './demo-admission-record/demo-admission-record.component';
import { WarningsOpComponent } from './warnings-op/warnings-op.component';
import { ManageListsComponent } from './manage-therapy-lists/manage-lists.component';

@NgModule({
  declarations: [
    SearchMedicationComponent,
    PrescribingFormComponent,
    DrugChartComponent,
    PrescriptionTemplateComponent,
    MedicationAdministrationComponent,
    PrescriptionHistoryComponent,
    TimelineinfoComponent,
    AdditionalAdministrationComponent,
    TimePickerComponent,
    TimepickerDirective,
    DrugInformationComponent,
    AdmissionRecordsTemplate,
    AddtoOrdersetComponent,
    OrdersetListComponent,
    PrescriptionInfusionTemplateComponent,
    PrescriptionNonInfusionTemplateComponent,
    NumberOnlyDirective,
    NonNegativeNumbersDirective,
    NonNegativeNumbersRangeDirective,
    InputKeyPressDirective,
    AddBolusComponent,
    ChangeInfusionComponent,
    AdjustInfusionComponent,
    PauseInfusionComponent,
    RestartInfusionComponent,
    DoctorConfirmationComponent,
    EndInfusionComponent,
    TitrationChartComponent,
    RefWeightHeightComponent,
    RecRefHeightComponent,
    SelectEncounterComponent,
    DemoChartComponent,
    TherapyOverviewComponent,
    RecordPatientdrugComponent,
    SupplyRequestComponent,
    CommentsComponent,
    PharmacyReviewComponent,
    ViewReminderComponent,
    AutoGrowDirective,
    NumberMaxLimitDirective,
    AutoGrowLengthDirective,
    NumberToWordsPipe,
    CompleteReconciliationComponent,
    ParseUrlPipe,
    NursingInstructionComponent,
    PrintDischargeComponent,
    DatePickerComponent,
    TemplateNumberComponent,
    WarningsComponent,
    WarningsLoaderDirective,
    WarningsModComponent,
    BannerWarningsComponent,
    DemoAdmissionRecordComponent,
    WarningsOpComponent,
    ManageListsComponent
  ],
  imports: [
    PopoverModule.forRoot(),
    BsDropdownModule.forRoot(),
    BrowserAnimationsModule,
    BsDatepickerModule.forRoot(),
    CommonModule, FormsModule, ModalModule.forRoot(), ReactiveFormsModule,
    TypeaheadModule.forRoot(),
  ],
  exports: [
    CompleteReconciliationComponent,
    DrugInformationComponent,
    MedicationAdministrationComponent,
    AdditionalAdministrationComponent,
    AddBolusComponent,
    ChangeInfusionComponent,
    AdjustInfusionComponent,
    PauseInfusionComponent,
    RestartInfusionComponent,
    WarningsComponent,
    CommentsComponent,
    SearchMedicationComponent,
    PrescribingFormComponent,
    PrescriptionTemplateComponent,
    DrugChartComponent,
    TherapyOverviewComponent,
    TimePickerComponent,
    TimepickerDirective,
    NumberOnlyDirective,
    NonNegativeNumbersDirective,
    NonNegativeNumbersRangeDirective,
    InputKeyPressDirective,
    SelectEncounterComponent,
    RecordPatientdrugComponent,
    PharmacyReviewComponent,
    SupplyRequestComponent,
    ViewReminderComponent,
    AddtoOrdersetComponent,
    OrdersetListComponent,
    AutoGrowDirective,
    NumberMaxLimitDirective,
    AutoGrowLengthDirective,
    NursingInstructionComponent,
    AdmissionRecordsTemplate,
    PrintDischargeComponent,
    DatePickerComponent,
    WarningsLoaderDirective,
    WarningsModComponent,
    BannerWarningsComponent,
    TitrationChartComponent,
    EndInfusionComponent,
    DemoAdmissionRecordComponent,
    ManageListsComponent
  ]
})
export class ComponentsModule { }

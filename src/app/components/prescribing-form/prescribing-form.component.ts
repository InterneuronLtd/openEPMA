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
import { Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup, AbstractControl, FormControl } from '@angular/forms';
import { CheckboxControl, Diluent, FormSettings, Indication, InfusionRate, PRNMaxDose, ProtocolInterval, Route, Source, Timeslot } from './formhelper';
import { Dose, MetaPrescriptionduration, MetaReviewstatus, Prescription } from 'src/app/models/EPMA';
import { Detail, Product } from 'src/app/models/productdetail';
import { Subscription } from 'rxjs';
import * as moment from 'moment';
import { AppService } from 'src/app/services/app.service';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { SubjectsService } from 'src/app/services/subjects.service';
import { isArray } from 'ngx-bootstrap/chronos';
import { FormContext, PrescriptionDuration, DoseType, IntervalType, InfusionType, ChosenDays, PrescriptionContext, PrescriptionStatus, FrequencyType, DoseForm } from 'src/app/services/enum';
import { DataRequest } from 'src/app/services/datarequest';

@Component({
  selector: 'app-prescribing-form',
  animations: [
    trigger('showhide', [
      // ...
      state('shown', style({
        opacity: 1
      })),
      state('closed', style({
        opacity: 0
      })),
      transition('shown => closed',
        animate('600ms ease-out')
      ),
      transition('closed => shown',
        animate('600ms ease-in')
      ),
    ]),
  ],
  templateUrl: './prescribing-form.component.html',
  styleUrls: ['./prescribing-form.component.css']
})


export class PrescribingFormComponent implements OnInit, OnDestroy, AfterViewInit {
  formsettings: FormSettings
  iseditingvariable = false;
  iseditingprotocol = false;
  iseditinginfusionvariable = false;
  iseditingchosendays = false;
  iseditingadditionalconditions = false;
  iseditinglinkedinfusion = false;
  showmedicationflag = false;
  showdiluentmedicationflag: Array<{ string: boolean }>;
  showSearchMedication = false;
  vtmerrormsg = "";
  editingPrescriptionStartdateError = "";
  temp_standard_dosing_pattern: Array<Timeslot> = [];
  temp_dosing_pattern: Array<Timeslot> = [];
  temp_protocol_dosing_pattern: Array<ProtocolInterval> = [];
  temp_protocolenddate = "";
  temp_repeatprotocol = "none";
  temp_repeatprotocolsub = "enddate";
  temp_protocolrepeattimes = "";
  temp_infusion_rate_pattern: Array<InfusionRate> = [];
  temp_weekdays: Array<CheckboxControl> = [];
  temp_dosingdaysfrequencysize: number;
  temp_dosingdaysfrequency: string;
  temp_chosendaysoption: string;
  temp_additionalconditions = "";
  temp_reminderhours = "";
  temp_remindernotes = "";
  customRouteSelectedModel: any;
  //flags
  blacktriangle = false;
  controlled = false;
  critical = false;
  highalert = false;
  expensive = false;
  nonformulary = false;
  unlicenced = false;
  clinicaltrial = false;
  medicationgflagmessage = "";
  durations: Array<MetaPrescriptionduration> = [];
  protocolHTMLBinder: Array<moment.Moment> = [];
  protocolstartdate: Date = new Date();
  isFormSaving = false;
  isStandardDosingPatternValid = true;
  dosecalculationsdisplaytext = "";
  allDiluents = []
  lblerrordiluent = "";
  maxLimitDose = 999999999999;
  hasAdministrations = false;
  minStartDate: Date;
  infusionroutes: Array<string> = [];
  totalvolumedisplay = 0;
  totalvolume = 0;
  prescription = this.fb.group({
    name: [''],
    routes: ['', this.RouteValidator(this)],
    posology: this.fb.group({
      strength: this.fb.group({
        dose_size: ['', this.doseSizeValidator(this)],
        dose_units: [''],
        dose_unitsofmeasure: [''],

        dose_strength_neumerator: ['', this.doseStrengthNeumeratorValidator(this)],
        dose_strength_neumerator_units: [''],
        dose_strength_denominator: ['', this.doseStrengthDenomivatorValidator(this)],
        dose_strength_denominator_units: [''],

        dose_description: ['', this.doseDescriptionValidator(this)],

        totalstrength: [''],
        calculatortype: ['null'],
        calculatorinput: [''],
        calculatortype_doserate: ['null'],
        calculatorinput_doserate: ['']
      }),
      interval: this.fb.group({
        frequency: [''],
        frequencysize: [''],
        times_hours: ['x'],
        customfrequency: ['', this.DoseIntervalCustomFrequencyValidator(this)],
        prn: [false],
        do: [false]
      }),
      repeatprotocol: ['none'],
      repeatprotocolsub: ['enddate'],
      protocolenddate: [''],
      protocolrepeattimes: ['']

    }),
    startdate: [new Date(), [Validators.required, this.PrescriptionStartDateTimeValidator(this)]],
    starttime: ['', [Validators.required, this.PrescriptionStartDateTimeValidator(this)]],
    prescriptionduration: ['5a43b7fa-f947-4bfa-a593-1a0b5cbab907'],
    prescriptiondurationsize: ['', this.PrescriptionDurationSizeValidator(this)],
    enddate: [null, this.PrescriptionEndDateValidator(this)],
    endtime: ['', this.PrescriptionEndTimeValidator(this)],
    daysofweek: [''],
    dosingdaysfrequency: [{ value: 'days', disabled: true }],
    dosingdaysfrequencysize: [{ value: '', disabled: true }],
    additionalconditions: [''],
    reminderhours: [''],
    remindernotes: [''],
    reminderackrequired: [''],
    antimicrobialstartdate: [null, this.AntimicrobialStartDateTimeValidator(this)],
    antimicrobialstarttime: [''],
    comments: ['', this.PrescriptionCommentsValidator(this)],
    indication: ['', this.IndicationsValidator(this)],
    otherindications: ['', this.OtherIndicationsValidator(this)],
    heparin: [''],
    infusiontype: ['', this.infusionTypeValidator(this)],
    infusionrate: ['', this.infusionRateValidator(this)],
    infusiondoserate: ['',],
    infusionduration: ['', this.infusionDurationValidator(this)],
    civariableuntilcancelled: [false],
    chosendays: ['all'],
    prescriptionsource: [''],
    otherprescriptionsource: ['', this.OtherSourceValidator(this)],
    titration: [false],
    istitrationrange: [false],
    titrationtargetmin: ['', this.TitrationTargetMinValidator(this)],
    titrationtargetmax: ['', this.TitrationTargetMaxValidator(this)],
    titrationtargetunits: [''],
    oxygendevice: ['null'],
    reviewstatus: [''],
    reviewcomments: ['', this.ReviewCommentsValidator(this)],
    totalquantity: [],
    totalquantitytext: [''],
    dispensingfrom: [''],
    ismodifiedrelease: [false],
    isgastroresistant: [false]
  });

  subscriptions: Subscription = new Subscription();

  @Input() medication: Product
  @Input() editingPrescription: Prescription
  @Input() clonePrescription: boolean;
  @Input() therapyList: Array<Prescription>;
  @Input() formContext: FormContext;
  @Input() editingFromIpBasket = false;
  @Output('PrescriptionCreated') PrescriptionCreated: EventEmitter<Prescription> = new EventEmitter();
  @Output('Cancel') Cancel: EventEmitter<string> = new EventEmitter();

  @ViewChild('starttime') starttimecontrol: ElementRef;
  @ViewChild('routecheckbox') routecheckbox: ElementRef;

  @ViewChild('openvariablemodal') openvariablemodal: ElementRef;
  @ViewChild('closevariablemodal') closevariablemodal: ElementRef;
  @ViewChild('copydose') copydose: ElementRef;
  @ViewChild('variabledoseerror') variabledoseerror: ElementRef;
  @ViewChild('protocoldoseerror') protocoldoseerror: ElementRef;
  @ViewChild('variableinfusionerror') variableinfusionerror: ElementRef;
  @ViewChild('chosendayserror') chosendayserror: ElementRef;
  @ViewChild('acerror') acerror: ElementRef;
  @ViewChild('totalVolume') totalVolume: ElementRef;
  @ViewChild('remainingVolume') remainingVolume: ElementRef;
  @ViewChild('prescribedVolume') prescribedVolume: ElementRef;
  @ViewChild('firstadmsg') firstadmsg: ElementRef;
  @ViewChild('daysofweekcheckbox') daysofweekcheckbox: ElementRef;
  @ViewChild('vtmdoseerror') vtmdoseerror: ElementRef;
  @ViewChild('totalstrengthprotocol') totalstrengthprotocol: ElementRef;
  @ViewChild('ddldiluents') ddldiluents: ElementRef;

  linkedinfusionmedicationname: string;
  prescriptionillustration: Prescription
  doseperkg: number;
  doseperikg: number;
  doseperkgperday: number;
  doseperikgperday: number;
  doseunitsdisplaytext: string;
  doseperm2: number;
  doseperm2perday: number;
  validationjsonconfig: any;

  showStartDate = true;
  showStartTime = true;
  showDuration = true;
  showTotalQuantity = true;
  showPrescriptionSource = true;
  showAntiMicrobialStartDate = true;
  showDoctorsOrder = true;
  showInitialReminder = true;
  showDispensingFrom = true;
  showReviewStatus = true;
  showCompatibleDiluents = true;
  checkedDaysOfWeekCount = [];

  @ViewChild('open_pform') open_pform: ElementRef;
  @ViewChild('close_pform') close_pform: ElementRef;
  ptitle: string = "";
  prescriptionCommentsMaxLength = 256;
  reviewCommentsMaxLength = 256;
  titrationvalues: string[];
  titrationmandatory: boolean = true;
  tempfrequency: any;
  temptimes_hours: any;
  isdiluentdosevalid: boolean = true;
  isDoseSizeRange: boolean;
  prescribedConcentration: any;
  infusionDoseRateUnits: any;
  isPrnMaxDoseValid: boolean;
  indValContrByMMC: boolean;
  editModeMinStartCompareDateTime: any;
  showPca = false;
  constructor(private fb: FormBuilder, public appService: AppService, public apiRequest: ApirequestService, public subjects: SubjectsService, public cd: ChangeDetectorRef, public dr: DataRequest) {
  }
  ngAfterViewInit(): void {
    if (this.formContext == FormContext.ip) {
      this.dr.RefreshIfDataVersionChanged(() => { });
    }
    if (this.editingPrescription) {
      var primaryMedication = this.editingPrescription.__medications.find(m => m.isprimary == true);
      if (primaryMedication.producttype.toLowerCase() == "custom") {
        this.medication = FormSettings.GenerateCustomProduct(primaryMedication);
        this.InitForm();
        this.onChanges();
      }
      else {
        var primaryMedicationFormularyCode = primaryMedication.__codes.find(x => x.terminology == "formulary");
        if (primaryMedication && primaryMedicationFormularyCode) {

          var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
          this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${primaryMedicationFormularyCode.code}?api-version=1.0`)
            .subscribe((response) => {
              if (response && response.length != 0) {
                this.medication = response as Product;
                this.InitForm();
                this.onChanges();
                if (this.formsettings.routes.length == 0) {
                  this.formsettings.medication.detail.prescribable = false;
                }
              }
              else {  //  primary medicaiton not found in system
                this.ShowMedicationAsNotPrescribable();
              }
            }, (error) => {
              this.ShowMedicationAsNotPrescribable();
              this.appService.logToConsole(error);
              console.log("no response for medication:" + primaryMedicationFormularyCode.code)
            }));
          // set this.medication to product
        }
        else {
          this.ShowMedicationAsNotPrescribable();
          // no primary medicaiton found in prescription
        }
      }
    }
    else {
      this.InitForm();
      this.onChanges();

      //if there is  only one route select it by default
      this.SelectDefaultSingleRoute();

      if (this.formsettings.routes.length == 0 && this.medication.productType.toLowerCase() != "custom") {
        this.formsettings.medication.detail.prescribable = false;
      }
    }
    this.open_pform.nativeElement.click();

  }
  ShowMedicationAsNotPrescribable() {
    this.formsettings = new FormSettings();
    this.formsettings.medication = new Product();
    this.formsettings.medication.detail = new Detail();
    this.formsettings.medication.detail.prescribable = false;
    if (this.editingPrescription) {
      let name = this.editingPrescription.__medications.find(x => x.isprimary);
      if (name) {
        this.formsettings.medication.name = name.name ?? "";
      }
    }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.medication = null;
    this.prescription.reset();
    this.formsettings = null;
  }

  ngOnInit(): void {


  }

  SetModDurations() {

    if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {

      //remove untilcancelled, enddate, hours from duration dropdown
      for (let i = this.durations.length - 1; i >= 0; i--) {
        if (this.durations[i].duration.toLowerCase() == PrescriptionDuration.hours || this.durations[i].duration.toLowerCase() == PrescriptionDuration.untilcancelled) {
          this.durations.splice(i, 1);
        }
        else if (this.formsettings.interval_type != IntervalType.protocol && this.durations[i].duration.toLowerCase() == PrescriptionDuration.enddate) {
          this.durations.splice(i, 1);
        }
      }
      //set duration to days by default

      setTimeout(() => {
        this.SetObjectiveFormValue("prescriptionduration",
          this.appService.MetaPrescriptionDuration.
            find(x => x.duration.toLowerCase() == PrescriptionDuration.days).prescriptionduration_id);
      }, 500);

    }
  }


  SetControlVisibilities() {

    if (this.formContext == FormContext.moa) {
      this.showStartDate = false;
      this.showStartTime = false;
      this.showDuration = false;
      this.showTotalQuantity = false;
      this.showDispensingFrom = false
      this.showAntiMicrobialStartDate = false;
      this.showReviewStatus = false;
      this.showInitialReminder = false;
      this.showDoctorsOrder = false;

    }
    else if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {

      //set starttime to "00:00"
      this.SetObjectiveFormValue("starttime", "00:00");

      //remove untilcancelled, enddate, hours from duration dropdown
      for (let i = this.durations.length - 1; i >= 0; i--) {
        if (this.durations[i].duration.toLowerCase() == PrescriptionDuration.hours || this.durations[i].duration.toLowerCase() == PrescriptionDuration.enddate || this.durations[i].duration.toLowerCase() == PrescriptionDuration.untilcancelled) {
          this.durations.splice(i, 1);
        }
      }
      //set duration to days by default
      this.SetObjectiveFormValue("prescriptionduration",
        this.appService.MetaPrescriptionDuration.
          find(x => x.duration.toLowerCase() == PrescriptionDuration.days).prescriptionduration_id);
      // setTimeout(() => {

      // }, 1000);

      //hide prescription source, starttime,
      this.showPrescriptionSource = false;
      this.showStartTime = false;
      this.showAntiMicrobialStartDate = false;
      this.showDoctorsOrder = false;
      this.showInitialReminder = false;
      this.showDispensingFrom = true;
      this.showAntiMicrobialStartDate = false;
      this.showReviewStatus = true;
      this.showTotalQuantity = true;
    }
    else {
      this.showTotalQuantity = false;
      this.showDispensingFrom = false;
    }

    //authorizations
    this.showReviewStatus = this.appService.AuthoriseAction('epma_change_pharmacyreviewstatus');
  }

  SetValidators() {
    let config = this.appService.appConfig;
    if (this.formContext == FormContext.ip) {
      this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.IPForm;
    }
    else if (this.formContext == FormContext.moa) {
      if (this.appService.AuthoriseAction("epma_create_org_orderset")) {
        this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.MOAForm_OrderSetCreator;
      }
      else
        this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.MOAForm;
    }
    else if (this.formContext == FormContext.mod) {
      this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.MODForm;
      this.SetObjectiveFormValue("starttime", "00:00");
    }
    else if (this.formContext == FormContext.op) {
      this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.OPForm;
      this.SetObjectiveFormValue("starttime", "00:00");
    }
    else {
      this.validationjsonconfig = config.AppSettings.PrescribingForm.MandatorySections.IPForm;
    }

    if (this.validationjsonconfig) {
      if (this.validationjsonconfig.Dose != undefined && this.validationjsonconfig.Dose == false) {
        for (const field in (<FormGroup>this.prescription.get('posology.strength')).controls) {
          const control = this.prescription.get('posology.strength.' + field);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity();
          }
        }
      }

      if (this.validationjsonconfig.Route != undefined && this.validationjsonconfig.Route == false) {
        const control = this.prescription.get('routes');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (this.validationjsonconfig.Interval != undefined && this.validationjsonconfig.Interval == false) {
        for (const field in (<FormGroup>this.prescription.get('posology.interval')).controls) {
          const control = this.prescription.get('posology.interval.' + field);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity();
          }
        }
      }

      if (this.validationjsonconfig.InfusionType != undefined && this.validationjsonconfig.InfusionType == false) {
        const control = this.prescription.get('infusiontype');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (this.validationjsonconfig.InfusionRate != undefined && this.validationjsonconfig.InfusionRate == false) {
        const control = this.prescription.get('infusionrate');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (this.validationjsonconfig.InfusionDuration != undefined && this.validationjsonconfig.InfusionDuration == false) {
        const control = this.prescription.get('infusionduration');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (this.validationjsonconfig.DispensingFrom != undefined) {
        const control = this.prescription.get('dispensingfrom');
        if (control) {
          if (this.validationjsonconfig.DispensingFrom == true) {
            control.setValidators(Validators.required);
            control.updateValueAndValidity();
          }
          else {
            control.clearValidators();
            control.updateValueAndValidity();
          }
        }
      }

      if (this.validationjsonconfig.AMTherapyStartDate != undefined && (this.formsettings.isAntibiotic || this.formsettings.isAntiviral)) {
        const control = this.prescription.get('antimicrobialstartdate');
        if (control) {
          if (this.validationjsonconfig.AMTherapyStartDate == true) {
            control.setValidators([Validators.required]);
            control.updateValueAndValidity();
          }
        }
      }

      if (!this.validationjsonconfig.Indications != undefined && this.validationjsonconfig.Indications == false) {
        let control = this.prescription.get('indication');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }

        control = this.prescription.get('otherindications');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }
      else {
        if (!this.validationjsonconfig.Indications_mmc_controlled != undefined && this.validationjsonconfig.Indications_mmc_controlled == false) {
          this.indValContrByMMC = false;
        }
        else {
          this.indValContrByMMC = true;
        }
      }

      if (!this.validationjsonconfig.StartDate != undefined && this.validationjsonconfig.StartDate == false) {
        let control = this.prescription.get('startdate');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('starttime');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('enddate');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('endtime');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('prescriptiondurationsize');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (!this.validationjsonconfig.StartTime != undefined && this.validationjsonconfig.StartTime == false) {
        let control = this.prescription.get('starttime');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }

      if (!this.validationjsonconfig.EndDateTime != undefined && this.validationjsonconfig.EndDateTime == false) {
        let control = this.prescription.get('enddate');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('endtime');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
        control = this.prescription.get('prescriptiondurationsize');
        if (control) {
          control.clearValidators();
          control.updateValueAndValidity();
        }
      }


      if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {
        let dose_type = this.formsettings.dose_type.toString();
        if (this.formsettings.medication.productType.toLowerCase() == "custom" && this.editingPrescription) {
          //use editing prescription dosetype instead of form settings dose type because dose type is set in prepopulate form for custom drugs when editing. 
          dose_type = this.appService.GetCurrentPosology(this.editingPrescription).dosetype;
        }
        if (dose_type != 'descriptive' && this.formsettings.medication.productType.toLowerCase() != 'vtm' && !this.validationjsonconfig.TotalQuantity != undefined && this.validationjsonconfig.TotalQuantity == true) {
          this.prescription.get('totalquantity').setValidators([Validators.required, this.TotalQuantityValidator(this)]);
        }
        else
          if ((dose_type == 'descriptive' || this.formsettings.medication.productType.toLowerCase() == 'vtm') && !this.validationjsonconfig.TotalQuantityText != undefined && this.validationjsonconfig.TotalQuantityText == true) {
            this.prescription.get('totalquantitytext').setValidators([Validators.required]);
          }
      }

      if (this.editingPrescription)
        this.hasAdministrations = this.appService.Medicationadministration.filter(x => x.prescription_id === this.editingPrescription.prescription_id).length > 0;
    }

    //set max length comments
    let maxlencomments = config.AppSettings.prescriptionCommentsMaxLenth;
    if (isNaN(maxlencomments) || +maxlencomments <= 0) {
      this.prescriptionCommentsMaxLength = 256;
    }
    else {
      this.prescriptionCommentsMaxLength = +maxlencomments;
    }

    let maxlenreviewcomments = config.AppSettings.reviewCommentsMaxLenth;
    if (isNaN(maxlenreviewcomments) || +maxlenreviewcomments <= 0) {
      this.reviewCommentsMaxLength = 256;
    }
    else {
      this.reviewCommentsMaxLength = +maxlenreviewcomments;
    }


    //set iv routes list
    let routes = config.AppSettings.PrescribingForm.InfusionRoutes;
    if (routes && isArray(routes)) {
      routes.forEach(rt => {
        if (typeof rt == "string") {
          this.infusionroutes.push(rt);
        }
      });
    }

  }

  InitForm() {
    this.formsettings = new FormSettings();
    this.formsettings.medication = this.medication;
    this.formsettings.appService = this.appService;
    this.formsettings.apiRequest = this.apiRequest;
    this.formsettings.subjects = this.subjects;
    this.formsettings.formContext = this.formContext;
    if (this.medication) {
      this.vtmerrormsg = this.formsettings.SetDoseType();
      this.formsettings.SetRoutes(this.editingPrescription, this);
      this.formsettings.SetDaysOfWeek();
      this.formsettings.SetAdditionalConditions();
      this.formsettings.SetOtherProperties();
      this.formsettings.SetOxygenAdditionalInfo();
      this.formsettings.SetMedicationNursingInstuctions();
      this.prescription.get('name').setValue(this.medication.name);
      this.prescription.get('posology.strength.dose_units').setValue(this.formsettings.dose_units);
      this.formsettings.SetIndications();
      this.formsettings.SetPrescriptionSources();
      this.formsettings.SetReviewStatus((this.clonePrescription == true) ? null : this.editingPrescription);
      this.SetTitrationMetaValues();
      this.SetValidators();
      this.setMinStartDate();
      this.InitOtherValues();
      this.SetIsPcaNcaDrug();
    }
    Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
    this.DoseCalculations();
    this.SetControlVisibilities();

    if (this.editingPrescription) {
      //if editing prescription and prescription context is admission and formcontext is ip
      //set moa to ip true and prescription status to modified if any change in dose route posology
      if (((this.editingPrescription.prescriptioncontext_id ==
        this.appService.MetaPrescriptioncontext.find(pc => pc.context.toLowerCase() ==
          PrescriptionContext.Admission.toLowerCase()).prescriptioncontext_id)
        &&
        this.formContext.toLowerCase() == FormContext.ip.toLowerCase())
        ||
        this.editingPrescription.moatoip) {
        this.formsettings.moatoip = true;
      }
      this.PrepopulateForm();
    }
    else {
      //this needs to run only if new prescription and not an edit,
      // if the product is vtm, get the most frequently prescribed units and preset the unit
      // in edit mode, prepopulateform will preset the originally set unit before edit

      if (this.formsettings.medication.productType.toLowerCase() == "vtm" || this.formsettings.vtmstyle)
        this.formsettings.GetMostFrequentVTMUnit(this.medication.code, this.prescription, () => { });
    }

    //set title of the page

    if (this.formContext == FormContext.moa) {
      this.ptitle = "Medicines on admission"
    }
    else if (this.formContext == FormContext.mod) {
      this.ptitle = "Discharge Prescription"
    }
    else if (this.editingPrescription && this.clonePrescription) {
      this.ptitle = "Prescription"
    }
    else {
      this.ptitle = "Prescription"
    }
    if (this.editingFromIpBasket) {
      this.formsettings.originalcreatedon = this.editingPrescription.createdon;

    }

    this.FlagFormErrors();

  }

  SelectDefaultSingleRoute() {
    if (this.formsettings.routes.length == 1) {
      this.formsettings.routes.forEach(r => {
        if (r) {
          this.RouteChanged({ target: { checked: true } }, r);
        }
      });
    }
  }

  InitOtherValues() {
    this.formsettings.prnMaxDose_TimeSlot = new Timeslot();
  }

  setMinStartDate() {
    if ((this.appService.isCurrentEncouner && this.editingPrescription && this.clonePrescription != true && this.formContext == FormContext.ip) || !this.appService.encounter.sortdate) {
      this.minStartDate = moment().toDate();
    }
    else
      this.minStartDate = moment(this.appService.encounter.sortdate).toDate();

    if (!this.appService.isCurrentEncouner) {
      setTimeout(() => {
        this.SetObjectiveFormValue("startdate", this.minStartDate);
      }, 500);
    }
    if (this.editingPrescription) {
      let adm = this.appService.Medicationadministration.filter(x => x.prescription_id === this.editingPrescription.prescription_id);
      adm.sort(function compare(a, b) {
        var dateA = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), a.administrationstartime).toDate());
        var dateB = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), b.administrationstartime).toDate());
        return dateA.getTime() - dateB.getTime();
      });

      if (adm && adm.length > 0) {
        this.editModeMinStartCompareDateTime = adm[0].planneddatetime;
      }
    }
  }


  PrepopulateForm() {
    //set route
    //iterate route object
    let routeSet = false; // gp connect prescriptions do not have a route 
    this.editingPrescription.__routes.forEach(pr => {
      //set route checked, primary
      var r = this.formsettings.routes.find(x => x.routecode == pr.routecode);
      if (r) {
        r.isChecked = true;
        r.isPrimary = pr.isdefault;
        routeSet = true;
        if (r.isPrimary) {
          if (r.route.toLowerCase() == "inhalation")  //if there are more than one routes, this is required to set doseunits to l/min if dosetype is na or continuous
          {
            this.formsettings.SetDoseType("inhalation");
          }
        }
      }
    });

    if (!routeSet && this.editingPrescription.__GpConnect) {
      this.SelectDefaultSingleRoute();
    }


    if ((this.editingPrescription.orderformtype ?? "").toLocaleLowerCase() == "vtmstyle")
      this.ToggleInfusion();

    //set startdate

    this.SetObjectiveFormValue("oxygendevice", this.editingPrescription.oxygendevices_id);
    this.SetObjectiveFormValue("startdate", new Date());

    if (this.appService.GetCurrentPosology(this.editingPrescription).prescriptionenddate) {

      if (this.clonePrescription == true) // if copying set duration
      {
        this.SetObjectiveFormValue("prescriptionduration", this.appService.GetCurrentPosology(this.editingPrescription).prescriptionduration);
        this.SetObjectiveFormValue('prescriptiondurationsize', this.appService.GetCurrentPosology(this.editingPrescription).prescriptiodurationsize);
        this.SetPrescriptionEndDateTime();
      }
      else {//if editing set enddate and time 
        this.SetObjectiveFormValue("prescriptionduration", this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
        // this.SetObjectiveFormValue("enddate", moment(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionenddate).toDate());
        // this.SetObjectiveFormValue("endtime", moment(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionenddate).format("HH:mm"));
      }

      // if (this.editingPrescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Orderset).prescriptioncontext_id) {
      //   this.SetObjectiveFormValue("prescriptionduration", this.appService.GetCurrentPosology(this.editingPrescription).prescriptionduration);
      //   this.SetObjectiveFormValue('prescriptiondurationsize', this.appService.GetCurrentPosology(this.editingPrescription).prescriptiodurationsize);
      //   this.SetPrescriptionEndDateTime();
      // }
      // else {
      //   this.SetObjectiveFormValue("prescriptionduration", this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
      //   this.SetObjectiveFormValue("enddate", moment(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionenddate).toDate());
      //   this.SetObjectiveFormValue("endtime", moment(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionenddate).format("HH:mm"));
      // }


    }
    else {
      this.SetObjectiveFormValue("prescriptionduration", this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
    }



    if (!this.editingPrescription.__GpConnect) {
      this.formsettings.dose_type = DoseType[this.appService.GetCurrentPosology(this.editingPrescription).dosetype];
    }
    var freq = this.appService.GetCurrentPosology(this.editingPrescription).frequency;

    let editingPrescriptionDose = this.appService.GetCurrentPosology(this.editingPrescription).__dose.filter(d => !d.isadditionaladministration);

    //set diluents
    var diluents = this.editingPrescription.__medications.filter(x => x.isprimary != true);
    diluents.forEach(d => {
      if (d.producttype.toLowerCase() == "custom") {
        var response = FormSettings.GenerateCustomProduct(d);
        var dil = new Diluent();
        dil.fs = new FormSettings();
        dil.fs.medication = response;
        dil.fs.appService = this.appService;
        dil.fs.SetDoseType();
        dil.ts = new Timeslot();
        dil.ts.dose_size = d.doseformsize;
        dil.ts.dose_strength_denominator = d.strengthdenominator;
        dil.ts.dose_strength_neumerator = d.strengthneumerator;
        dil.ts.dose_strength_denominator_units = d.strengthdenominatorunit;
        dil.ts.dose_strength_neumerator_units = d.strengthneumeratorunit;
        this.formsettings.diluents.push(dil);
      }
      else {
        var dfcode = d.__codes.find(x => x.terminology == "formulary");
        if (dfcode) {
          var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
          this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${dfcode.code}?api-version=1.0`)
            .subscribe((response) => {
              if (response && response.length != 0) {

                var dil = new Diluent();
                dil.fs = new FormSettings();
                dil.fs.medication = response as Product;
                dil.fs.appService = this.appService;
                dil.fs.SetDoseType();
                dil.ts = new Timeslot();
                dil.ts.dose_size = d.doseformsize;
                dil.ts.dose_strength_denominator = d.strengthdenominator;
                dil.ts.dose_strength_neumerator = d.strengthneumerator;
                dil.ts.dose_strength_denominator_units = d.strengthdenominatorunit;
                dil.ts.dose_strength_neumerator_units = d.strengthneumeratorunit;
                this.formsettings.diluents.push(dil);
              }
              else {  //  diluent not found in system
              }
            }));
        }
      }
    });

    //if op prescription set isinfusion false 
    //if editing an orderset this needs to be set to false
    if (this.formContext == FormContext.op) {
      this.editingPrescription.isinfusion = false;
    }
    //set dose
    //if not infusion
    if (!this.editingPrescription.isinfusion) {
      let skipSetDose = false;
      let curPosology = this.appService.GetCurrentPosology(this.editingPrescription);
      if ((curPosology.doseperkg && curPosology.referenceweighttype == "ikg" && this.appService.idealWeightValue == -1) ||
        (curPosology.doseperkg && curPosology.referenceweighttype == "kg" && !this.appService.refWeightValue) ||
        (curPosology.dosepersa && curPosology.referenceweighttype == "kg" && !this.appService.bodySurfaceArea)) {
        skipSetDose = true;
      }
      //check freq type 
      if (!skipSetDose) {
        if (freq.toLowerCase() == IntervalType.variable) {


          this.OpenVariableForm();
          //if variable create dosing_pattern array
          this.formsettings.interval_type = IntervalType.variable;
          this.formsettings.dosing_pattern = [];
          editingPrescriptionDose.forEach((pd, index) => {
            if (index == 0) {
              if (pd.doseperkg) {
                this.SetObjectiveFormValue("posology.strength.calculatortype", pd.referenceweighttype);
              }
              else if (pd.dosepersa) {
                this.SetObjectiveFormValue("posology.strength.calculatortype", "m2");
              }
            }
            var ts = this.CreateTimeSlotFromDoseObject(pd);
            this.formsettings.dosing_pattern.push(ts);
          });
          this.formsettings.dosing_pattern.forEach((ts) => {
            this.StrengthToUnitDose(ts, true, this.formsettings);
            if (this.prescription.get("posology.strength.calculatortype").value && this.prescription.get("posology.strength.calculatortype").value != "null") {
              this.PrepopulateCalculatorValuetoDose(ts);//for osp
            }
          });
          this.SaveVariableEdit();
        }
        else if (freq.toLowerCase() == IntervalType.protocol) {
          this.OpenProtocolForm();
          //if protocol create dosing_pattern_protocol array
          this.formsettings.interval_type = IntervalType.protocol;
          this.formsettings.dosing_pattern = [];
          this.formsettings.protocol_dosing_pattern = [];

          //get unique dates of protocol
          var protocoldates = editingPrescriptionDose.map(e =>
            moment({
              year: moment(e.dosestartdatetime).year(),
              month: moment(e.dosestartdatetime).month(),
              day: moment(e.dosestartdatetime).date()
            }));

          var uniquedates = [];
          protocoldates.forEach(rd => {
            if (!uniquedates.find(x => moment(x).isSame(rd)))
              uniquedates.push(rd);
          });

          //foreach protocol date generate interval pattern
          uniquedates.forEach(pdate => {
            var pi = new ProtocolInterval();
            pi.date = pdate;
            pi.intervalpattern = [];
            //get all doses for this protocol date
            var darray = editingPrescriptionDose.filter(epd =>
              moment({
                year: moment(epd.dosestartdatetime).year(),
                month: moment(epd.dosestartdatetime).month(),
                day: moment(epd.dosestartdatetime).date()
              }).isSame(pdate)
            );
            //create interval array and push into the protocol
            darray.forEach(dd => {
              var ts = this.CreateTimeSlotFromDoseObject(dd);
              pi.intervalpattern.push(ts);
              this.StrengthToUnitDose(ts, true, this.formsettings);
            });

            this.formsettings.protocol_dosing_pattern.push(pi);
          });
          //set repeat protocol variable
          //set repeat protocol end date
          //set repeat protocol times
          if (this.appService.GetCurrentPosology(this.editingPrescription).repeatlastday) {
            this.SetObjectiveFormValue("posology.repeatprotocol", "lastday");
            if (this.appService.GetCurrentPosology(this.editingPrescription).repeatlastdayuntil) {
              this.SetObjectiveFormValue("posology.repeatprotocolsub", "enddate");
              this.SetObjectiveFormValue("posology.protocolenddate", moment(this.appService.GetCurrentPosology(this.editingPrescription).repeatlastdayuntil).toDate());
            }
            else
              this.SetObjectiveFormValue("posology.repeatprotocolsub", "untilcancelled");
          }
          else if (+this.appService.GetCurrentPosology(this.editingPrescription).repeatprotocoltimes > 0) {
            this.SetObjectiveFormValue("posology.repeatprotocol", "protocol");
            this.SetObjectiveFormValue("posology.protocolrepeattimes", this.appService.GetCurrentPosology(this.editingPrescription).repeatprotocoltimes);
          }
          else
            this.SetObjectiveFormValue("posology.repeatprotocol", "none");


          //set start date to protocol start date for protocol prescriptions
          this.SetObjectiveFormValue("startdate", this.appService.GetCurrentPosology(this.editingPrescription).prescriptionstartdate);

          this.SaveProtocolEdit();
        }
        else {
          this.formsettings.dosing_pattern = [];
          this.formsettings.protocol_dosing_pattern = [];
          this.formsettings.interval_type = IntervalType.standard;
          editingPrescriptionDose.forEach(d => {
            this.SetObjectiveFormValue("posology.strength.dose_strength_neumerator", d.strengthneumerator);
            this.SetObjectiveFormValue("posology.strength.dose_strength_denominator", d.strengthdenominator);
            let ds = []
            ds.push(d.dosesize);
            if (d.dosesizerangemax && +d.dosesizerangemax > 0 && !isNaN(+d.dosesizerangemax))
              ds.push(d.dosesizerangemax);
            this.SetObjectiveFormValue("posology.strength.dose_size", ds.join('-'));
            this.SetObjectiveFormValue("posology.strength.dose_description", d.descriptivedose);

            if (d.doseperkg) {
              this.SetObjectiveFormValue("posology.strength.calculatortype", d.referenceweighttype);
              let doseperkg = d.doseperkg;
              if (d.doseperkgrangemax && +d.doseperkgrangemax > 0 && !isNaN(+d.doseperkgrangemax)) {
                doseperkg = d.doseperkg + "-" + d.doseperkgrangemax;
              }
              this.SetObjectiveFormValue("posology.strength.calculatorinput", doseperkg);
            }
            else
              if (d.dosepersa) {
                this.SetObjectiveFormValue("posology.strength.calculatortype", "m2");
                let dosepersa = d.dosepersa;
                if (d.dosepersarangemax && +d.dosepersarangemax > 0 && !isNaN(+d.dosepersarangemax)) {
                  dosepersa = d.dosepersa + "-" + d.dosepersarangemax;
                }
                this.SetObjectiveFormValue("posology.strength.calculatorinput", d.dosepersa);
              }


            var ts = this.CreateTimeSlotFromDoseObject(d);
            if (this.prescription.get("posology.strength.calculatortype").value && this.prescription.get("posology.strength.calculatortype").value != "null") {
              this.PrepopulateCalculatorValuetoDose(null);
            }
            this.formsettings.dosing_pattern.push(ts);
          });

        }

        //set frequency
        if (+this.appService.GetCurrentPosology(this.editingPrescription).frequencysize > 0) {
          this.SetObjectiveFormValue('posology.interval.customfrequency', this.appService.GetCurrentPosology(this.editingPrescription).frequencysize);
          this.SetObjectiveFormValue('posology.interval.times_hours', this.appService.GetCurrentPosology(this.editingPrescription).frequency);
        }
        else
          this.SetObjectiveFormValue('posology.interval.frequency', this.appService.GetCurrentPosology(this.editingPrescription).frequency);
      }
    }
    else        //if infusion
      if (this.editingPrescription.isinfusion) {

        this.formsettings.isInfusion = true;
        this.formsettings.isPrimaryRouteIV = true;
        this.formsettings.interval_type = IntervalType.variable;
        //set infusion type
        this.formsettings.infusionType = InfusionType[this.editingPrescription.infusiontype_id];
        this.SetObjectiveFormValue("infusiontype", this.formsettings.infusionType);


        var d = editingPrescriptionDose[0]
        if (d.strengthdenominator && d.strengthneumerator) {
          this.SetObjectiveFormValue("posology.strength.dose_strength_neumerator", d.strengthneumerator);
          this.SetObjectiveFormValue("posology.strength.dose_strength_denominator", d.strengthdenominator)
        }
        if (d.dosesize) {
          let ds = []
          ds.push(d.dosesize);
          if (d.dosesizerangemax && +d.dosesizerangemax > 0 && !isNaN(+d.dosesizerangemax))
            ds.push(d.dosesizerangemax);
          this.SetObjectiveFormValue("posology.strength.dose_size", ds.join('-'));
        }

        if (freq.toLowerCase() == IntervalType.variable) {
          this.formsettings.infusion_rate_pattern = []
          editingPrescriptionDose.forEach(d => {
            var st = new Timeslot();
            var et = new Timeslot();
            st.hour = moment(d.dosestartdatetime).get("hour");
            st.minute = moment(d.dosestartdatetime).get("minutes");

            st.infusionrate = d.infusionrate;
            if (d.infusiondoserate)
              st.infusiondoserate = d.infusiondoserate
            if (!d.doseenddatatime) {
              this.SetObjectiveFormValue("civariableuntilcancelled", true);
            }
            else {
              et.hour = moment(d.doseenddatatime).get("hour");
              et.minute = moment(d.doseenddatatime).get("minutes");
            }
            var ir = new InfusionRate();

            ir.starttime = st;
            ir.endtime = et;
            this.formsettings.infusion_rate_pattern.push(ir);
          });

          this.SaveVariableInfusionEdit();
        }
        else {

          this.formsettings.interval_type = IntervalType.standard;
          this.SetObjectiveFormValue("infusionrate", this.appService.GetCurrentPosology(this.editingPrescription).infusionrate);
          this.SetObjectiveFormValue("infusionduration", this.appService.GetCurrentPosology(this.editingPrescription).infusionduration);
          if (this.appService.GetCurrentPosology(this.editingPrescription).infusiondoserate)
            this.SetObjectiveFormValue("infusiondoserate", this.appService.GetCurrentPosology(this.editingPrescription).infusiondoserate);

          this.formsettings.dosing_pattern = [];
          this.formsettings.protocol_dosing_pattern = [];
          editingPrescriptionDose.forEach(d => {
            var ts = this.CreateTimeSlotFromDoseObject(d);
            this.formsettings.dosing_pattern.push(ts);
          });


          //set frequency
          if (+this.appService.GetCurrentPosology(this.editingPrescription).frequencysize > 0) {
            this.SetObjectiveFormValue('posology.interval.customfrequency', this.appService.GetCurrentPosology(this.editingPrescription).frequencysize);
            this.SetObjectiveFormValue('posology.interval.times_hours', this.appService.GetCurrentPosology(this.editingPrescription).frequency);
          }
          else
            this.SetObjectiveFormValue('posology.interval.frequency', this.appService.GetCurrentPosology(this.editingPrescription).frequency);
        }

        //set linkedinfusion id if present
        if (this.editingPrescription.linkedinfusionid) {
          var p = this.appService.Prescription.find(x => x.prescription_id == this.editingPrescription.linkedinfusionid);
          if (p) {
            this.SelectLinkedInfusion(p, true);

            this.durations = [];
            Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
            var i = this.durations.findIndex(x => x.duration.toLowerCase() == PrescriptionDuration.enddate);
            this.durations.splice(i, 1);
            this.prescription.get('prescriptionduration').setValue(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionduration);
            this.SetObjectiveFormValue('prescriptiondurationsize', this.appService.GetCurrentPosology(this.editingPrescription).prescriptiodurationsize);
          }
        }
        else
          this.formsettings.linkedinfusionid = null;
      }

    //if frequency is stat disable duration selection
    if (this.formContext != FormContext.moa) {
      this.HideDurationForStatDose(freq, false);
    }
    else {
      if (freq == "stat") {
        this.ResetChosenDaysToSkip();
        this.ResetChosenDaysOfWeek();
        this.SetObjectiveFormValue("chosendays", ChosenDays.all);
        this.FirstAdministrationMessage();
      }
    }

    //set antimicrobial start date
    if (this.appService.GetCurrentPosology(this.editingPrescription).antimicrobialstartdate) {
      this.SetObjectiveFormValue("antimicrobialstartdate", moment(this.appService.GetCurrentPosology(this.editingPrescription).antimicrobialstartdate).toDate());
      this.SetObjectiveFormValue("antimicrobialstarttime", moment(this.appService.GetCurrentPosology(this.editingPrescription).antimicrobialstartdate).format("HH:mm"));
    }
    //set source
    // this.SetObjectiveFormValue("prescriptionsource", this.editingPrescription.prescriptionsource_id);
    //set comments
    this.SetObjectiveFormValue("comments", this.editingPrescription.comments);
    if (this.editingPrescription.__GpConnect) {
      this.SetObjectiveFormValue("comments", this.editingPrescription.__GpConnect.comments);
      this.prescription.get("prescriptionsource").disable();
    }

    //set indications
    this.SetObjectiveFormValue("otherindications", this.editingPrescription.otherindications)

    if (this.editingPrescription.indication) {
      if (this.editingPrescription.indication.indexOf("indication") != -1 && this.editingPrescription.indication.indexOf("code") != -1) {
        let ind = <Indication>JSON.parse(this.editingPrescription.indication);
        if (ind) {
          this.SetObjectiveFormValue("indication", ind.code);
          this.IndicationChanged(ind.code)
        }
      }
      else if (!FormSettings.IsNullOrEmpty(this.editingPrescription.indication)) {
        this.SetObjectiveFormValue("indication", "other");
        this.SetObjectiveFormValue("otherindications", this.editingPrescription.indication);
      }


    }

    //set dose unit if VTM
    if (editingPrescriptionDose.length != 0)//&& this.editingPrescription.__medications[0].producttype.toLowerCase() == "vtm")
    {
      this.prescription.get("posology.strength.dose_units").setValue(editingPrescriptionDose[0].doseunit);
      this.formsettings.dose_units = editingPrescriptionDose[0].doseunit;
    }


    //set sources
    if (this.editingPrescription.prescriptionsources) {
      let srcs = <Array<string>>JSON.parse(this.editingPrescription.prescriptionsources);
      srcs.forEach(src => {
        let s = this.formsettings.sources.find(s => s.prescriptionsource_id == src);
        if (s)
          s.selected = true;
      });

      if (this.ShowOtherSourceControl())
        this.SetObjectiveFormValue("otherprescriptionsource", this.editingPrescription.otherprescriptionsource)
    }



    //titration
    this.SetObjectiveFormValue("titration", this.editingPrescription.titration);
    this.SetObjectiveFormValue("titrationtargetmin", this.editingPrescription.titrationtargetmin);
    this.SetObjectiveFormValue("titrationtargetmax", this.editingPrescription.titrationtargetmax);
    this.SetObjectiveFormValue("titrationtargetunits", this.editingPrescription.titrationtargetunits);
    if (this.editingPrescription.titrationtargetmax)
      this.SetObjectiveFormValue("istitrationrange", true)

    //reset DO if titration
    if (this.prescription.get("titration").value) {
      this.prescription.get("posology.interval.prn").reset();
      this.prescription.get("posology.interval.do").reset();
      this.prescription.get("posology.interval.do").disable();
    }
    else {
      this.prescription.get("posology.interval.prn").reset();
      this.prescription.get("posology.interval.do").reset();
      this.prescription.get("posology.interval.do").enable();
    }

    //set prn
    this.SetObjectiveFormValue("posology.interval.prn", this.appService.GetCurrentPosology(this.editingPrescription).prn)

    //set do
    this.SetObjectiveFormValue("posology.interval.do", this.appService.GetCurrentPosology(this.editingPrescription).doctorsorder)

    //reset time to current time if prn 
    if (this.prescription.get('posology.interval.prn').value) {
      var now = moment();
      var currenttime = new Timeslot(now.get("hour"), now.get("minute")).GetFormatString()
      this.prescription.get('starttime').setValue(currenttime);
    }

    //set maxnoofdosesperday
    new PRNMaxDose().SetFSObject(this.appService.GetCurrentPosology(this.editingPrescription).prnmaxdose, this.formsettings);
    this.ValidatePrnMaxDose();
    //additional conditions
    this.SetObjectiveFormValue("additionalconditions", this.editingPrescription.prescriptionadditionalconditions_id);

    // //reminder
    // this.SetObjectiveFormValue("reminderdays", this.editingPrescription.reminderdays);
    // this.SetObjectiveFormValue("remindernotes", this.editingPrescription.remindernotes);

    //set ismodifiedrelease
    this.SetObjectiveFormValue("ismodifiedrelease", this.editingPrescription.ismodifiedrelease)
    //set isgastroresistant
    this.SetObjectiveFormValue("isgastroresistant", this.editingPrescription.isgastroresistant)


    var chosendays: string = ChosenDays.all;
    //chosen days
    if (this.appService.GetCurrentPosology(this.editingPrescription).daysofweek && isArray(JSON.parse(this.appService.GetCurrentPosology(this.editingPrescription).daysofweek))) {
      this.formsettings.daysofweek.forEach(dow => {
        if ((JSON.parse(this.appService.GetCurrentPosology(this.editingPrescription).daysofweek) as Array<string>).find(x => x == dow.name)) {
          dow.isChecked = true;
          chosendays = ChosenDays.chosen;
        }
      });
    }
    this.checkedDaysOfWeekCount = this.formsettings.daysofweek.filter(d => d.isChecked);
    //every n days
    if (!isNaN(this.appService.GetCurrentPosology(this.editingPrescription).dosingdaysfrequencysize) && +this.appService.GetCurrentPosology(this.editingPrescription).dosingdaysfrequencysize > 0) {
      this.SetObjectiveFormValue("dosingdaysfrequency", this.appService.GetCurrentPosology(this.editingPrescription).dosingdaysfrequency);
      this.SetObjectiveFormValue("dosingdaysfrequencysize", this.appService.GetCurrentPosology(this.editingPrescription).dosingdaysfrequencysize);
      chosendays = ChosenDays.skip;
    }

    //set oxygenprescriptionadditionalinfo
    this.formsettings.oxygenprescriptionadditionalinfo.forEach(oinfo => {
      if ((JSON.parse(this.editingPrescription.oxygenadditionalinfo ?? "[]") as Array<string>).find(x => x == oinfo.oxygenprescriptionadditionalinfo_id)) {
        oinfo.isChecked = true;
      }
    });




    this.SetObjectiveFormValue("chosendays", chosendays);

    if (chosendays == ChosenDays.all) {
      this.ResetChosenDaysToSkip();
      this.ResetChosenDaysOfWeek();

      this.prescription.get("dosingdaysfrequency").disable();
      this.prescription.get("dosingdaysfrequencysize").disable();
    }
    else
      if (chosendays == ChosenDays.chosen) {
        this.ResetChosenDaysToSkip();

        this.prescription.get("dosingdaysfrequency").disable();
        this.prescription.get("dosingdaysfrequencysize").disable();
      }
      else
        if (chosendays == ChosenDays.skip) {
          this.ResetChosenDaysOfWeek();

          this.prescription.get("dosingdaysfrequency").enable();
          this.prescription.get("dosingdaysfrequencysize").enable();
        }


    this.DoseCalculations();

    if (this.formsettings.interval_type == IntervalType.standard)
      this.StrengthToUnitDose(null, true, this.formsettings);


    //if mod set prescriptionduratoion and size
    if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {
      let d = this.appService.GetCurrentPosology(this.editingPrescription).prescriptionduration;
      let edcontext = this.appService.MetaPrescriptioncontext.find(x => x.prescriptioncontext_id == this.editingPrescription.prescriptioncontext_id)
      if (d && edcontext && (edcontext.context.toLowerCase() == PrescriptionContext.Discharge.toLowerCase() || edcontext.context.toLowerCase() == PrescriptionContext.Outpatient.toLowerCase())) {
        this.prescription.get('prescriptionduration').setValue(this.appService.GetCurrentPosology(this.editingPrescription).prescriptionduration);
        this.SetObjectiveFormValue('prescriptiondurationsize', this.appService.GetCurrentPosology(this.editingPrescription).prescriptiodurationsize);
        if (this.formsettings.dose_type != DoseType.descriptive && this.formsettings.medication.productType.toLowerCase() != "vtm") {
          this.SetObjectiveFormValue("totalquantity", this.appService.GetCurrentPosology(this.editingPrescription).totalquantity);
        }
        else {
          this.SetObjectiveFormValue("totalquantitytext", this.appService.GetCurrentPosology(this.editingPrescription).totalquantitytext);
        }
      }
      else {
        this.SetModDurations();
      }

      this.SetObjectiveFormValue("dispensingfrom", this.editingPrescription.dispensingfrom)
    }

    //set duration to until cancelled for prn prescription
    if (this.prescription.get('posology.interval.prn').value && this.formContext == FormContext.ip) {
      this.durations = [];
      Object.assign(this.durations, this.appService.MetaPrescriptionDuration.filter(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled));
      this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
    }

    // if (!this.formsettings.isInfusion && this.formsettings.infusionType != InfusionType.ci)
    this.ResetStartTime();
    this.SetPrescriptionIllustration();

    if (this.clonePrescription != true) {
      this.prescription.get("infusiontype").disable();
    }

    if (this.prescription.get("posology.interval.prn").value == true) {
      let times_hours = this.prescription.get("posology.interval.times_hours");

      if (times_hours.value == 'x') {
        this.prescription.get('posology.interval.frequency').setValue("");
        this.prescription.get('posology.interval.customfrequency').setValue("");

        this.SetObjectiveFormValue("posology.interval.times_hours", "h");
      }
      // this.prescription.get("posology.interval.times_hours").disable();
    }

    // setTimeout(() => {
    //   this.SetObjectiveFormValue("startdate", new Date());
    //   this.FirstAdministrationMessage();
    // }, 0);


    setTimeout(() => {
      if (this.appService.isTCI) {
        let lastmodifiedfrom = this.appService.GetCurrentPosology(this.editingPrescription).prescriptionstartdate;
        if (this.editingPrescription.startdatetime == lastmodifiedfrom)
          this.SetObjectiveFormValue("startdate", moment(this.editingPrescription.startdatetime).toDate());
        else
          this.SetObjectiveFormValue("startdate", moment(lastmodifiedfrom).toDate());

        if (moment(this.prescription.get("startdate").value).isBefore(moment(this.minStartDate))) {
          this.prescription.get('startdate').setValue(this.minStartDate);
        }
      }
      else {
        if (this.formContext != FormContext.op)
          this.SetObjectiveFormValue("startdate", new Date());
        if (!this.formsettings.isInfusion) {
          this.ResetStartTime();
        }
      }
    }, 1000);
  }

  CreateTimeSlotFromDoseObject(pd: Dose) {
    var ds = new Timeslot();
    ds.date = pd.dosestartdatetime ? moment(pd.dosestartdatetime) : null;
    ds.dose_description = pd.descriptivedose;
    let dsa = []
    dsa.push(pd.dosesize);
    if (pd.dosesizerangemax && +pd.dosesizerangemax > 0 && !isNaN(+pd.dosesizerangemax))
      dsa.push(pd.dosesizerangemax);

    ds.dose_size = dsa.join('-');// +pd.dosesize;
    ds.dose_strength_denominator = pd.strengthdenominator;
    ds.dose_strength_denominator_units = pd.strengthdenominatorunit;
    ds.dose_strength_neumerator = pd.strengthneumerator;
    ds.dose_strength_neumerator_units = pd.strengthneumeratorunit;
    ds.dose_units = pd.doseunit;
    ds.dose_unitsofmeasure = pd.dosemeasure;
    ds.hour = moment(pd.dosestartdatetime).get("hour");
    ds.minute = moment(pd.dosestartdatetime).get("minutes");
    ds.infusionrate = pd.infusionrate;

    ds.calculatorinput = (pd.referenceweighttype == "kg" || pd.referenceweighttype == "ikg") ? pd.doseperkg : +pd.dosepersa != 0 ? pd.dosepersa : null;
    if ((pd.referenceweighttype == "kg" || pd.referenceweighttype == "ikg") && pd.doseperkgrangemax && +pd.doseperkgrangemax > 0 && !isNaN(+pd.doseperkgrangemax))
      ds.calculatorinput = ds.calculatorinput + "-" + pd.doseperkgrangemax;
    else if (pd.referenceweighttype == "sa" && pd.dosepersarangemax && +pd.dosepersarangemax > 0 && !isNaN(+pd.dosepersarangemax))
      ds.calculatorinput = ds.calculatorinput + "-" + pd.dosepersarangemax;

    return ds;
  }

  SetObjectiveFormValue(key, value, silent = false) {
    if (silent) {
      this.prescription.get(key).setValue(value, { emitEvent: false });
    }
    else {
      this.prescription.get(key).setValue(value);
    }
  }

  PrepopulateCalculatorValuetoDose(ts: Timeslot) {
    if (this.formsettings.dose_type == DoseType.strength) {
      this.Calculator_DosePerKgM2('2', ts, this.formsettings);
      if (ts) {
        this.CalculateTSVolumeFordose(ts, this.formsettings);
        //this.CalculateTSDoseForVolume(ts, this.formsettings);
        this.FixDecimalPlaces(['dose_strength_neumerator', 'dose_strength_denominator'], ts);
      }
      else {
        this.CalculateVolumeFordose();
        // this.CalculateDoseForVolume();
        this.FixDecimalPlaces(['posology.strength.dose_strength_neumerator', 'posology.strength.dose_strength_denominator']);
      }
      //this.Calculator_DosePerKgM2('1', ts, this.formsettings);

    } else if (this.formsettings.dose_type == DoseType.units) {
      this.Calculator_DosePerKgM2('2', ts, this.formsettings);
      this.StrengthToUnitDose(ts, true, this.formsettings);
      // this.Calculator_DosePerKgM2('1', ts, this.formsettings);
      if (ts)
        this.FixDecimalPlaces(['dose_size', 'dose_totalstrength'], ts);
      else
        this.FixDecimalPlaces(['posology.strength.dose_size', 'posology.strength.totalstrength']);

    }
    this.DoseCalculations();

  }

  OnDiluentSelected(e) {
    if (e && e != '') {
      var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
      this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${e}?api-version=1.0`)
        .subscribe((response) => {
          if (response && response.length != 0 && this.formsettings.diluents.length == 0) {
            var d = new Diluent();
            d.fs = new FormSettings();
            d.fs.medication = response as Product;
            d.fs.appService = this.appService;
            d.fs.SetDoseType();
            d.ts = new Timeslot();
            if (this.formsettings.diluents.length == 0) {
              this.formsettings.diluents.push(d);
              this.showSearchMedication = false;
              this.ToggleInfusion(false);
              this.lblerrordiluent = ""
            }
          }
          else {
            this.showSearchMedication = false;
            this.ToggleInfusion(false);//  diluent not found in system
            this.lblerrordiluent = ""
          }
        }));
    }
    else
      this.lblerrordiluent = "Please select a diluent."
  }
  SetTitrationMetaValues() {
    if (this.formsettings.titrationType && Array.isArray(this.formsettings.titrationType) && this.formsettings.titrationType.length != 0) {
      let config = this.appService.appConfig.AppSettings.PrescribingForm.Titration;
      if (config[this.formsettings.titrationType[0].desc]) {
        let titrationconfig = config[this.formsettings.titrationType[0].desc];
        if (titrationconfig["values"] && Array.isArray(titrationconfig["values"])) {
          this.titrationvalues = titrationconfig["values"];
        }
        if (titrationconfig["mandatory"] != undefined && titrationconfig["mandatory"] === false) {
          this.titrationmandatory = false;
        }
      }
    }
  }
  SetTitrationValue(v: string) {

    let range = v.toString().split('-');

    if (range && range.length == 1) {
      //single 
      this.prescription.get("istitrationrange").setValue(false);
      this.prescription.get("titrationtargetmin").setValue(range[0].trim());
    }
    else if (range && range.length == 2) {
      //range
      this.prescription.get("istitrationrange").setValue(true);
      this.prescription.get("titrationtargetmin").setValue(range[0].trim());
      this.prescription.get("titrationtargetmax").setValue(range[1].trim());
    }


  }
  SetDiluentList() {
    this.allDiluents = [];
    this.lblerrordiluent = "";

    if (this.showCompatibleDiluents) {
      //populate compatible diluents
      //push prompt select option
      // this.allDiluents.push({ "code": "", "name": "Select Diluent" });
      this.formsettings.medication.detail.diluents?.forEach(dl => {
        if (dl.cd && dl.desc) {
          this.allDiluents.push({ "code": dl.cd, "name": dl.desc.replace(dl.cd, '').replace('()-', '') });
        }
      });
      //add toggle to all diluents
      //this.allDiluents.push({ "code": "toggle", "name": "Show All Diluents" });

    }
    else {      //populate all diluents
      //push prompt select option
      // this.allDiluents.push({ "code": "", "name": "Select Diluent" });

      this.subscriptions.add(this.apiRequest.getRequest(this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformulariesasdiluents?api-version=1.0")
        .subscribe((response) => {
          if (response && response.length != 0) {
            response.forEach(dl => {
              if (dl.code && dl.name) {
                this.allDiluents.push({ "code": dl.code, "name": dl.name });
              }
            });
            //add toggle to compatible diluents
            // this.allDiluents.push({ "code": "toggle", "name": "Show Compatible Diluents" });

          }
          else {
            this.appService.logToConsole("no diluents");
            this.lblerrordiluent = "No Diluents";
            //add toggle to all diluents
            // this.allDiluents.push({ "code": "toggle", "name": "Show All Diluents" });
          }
        }));
    }
    this.showCompatibleDiluents = !this.showCompatibleDiluents;
  }

  ToggleDiluentList() {
    // const e = this.ddldiluents.nativeElement.value;
    // if (e == "toggle") {
    //   this.SetDiluentList();
    // }
    // else {
    //   this.OnDiluentSelected();
    // }
    this.SetDiluentList();
  }

  AddDiluent() {
    this.showSearchMedication = true;
    //poplate diluents list
    this.SetDiluentList();
  }

  CloseDiluentSearch() {
    this.showSearchMedication = false;
  }
  RemoveDiluent(d) {
    var index = this.formsettings.diluents.findIndex((dfs) => { return dfs === d });
    if (index != -1)
      this.formsettings.diluents.splice(index, 1);

    this.ResetInfusionRateDuration();
    this.ToggleInfusion(false);

  }

  ShowHideMedicationFlagMessage(e, d?: Diluent) {
    if (d)
      d.showmedicationflag = true;
    else
      this.showmedicationflag = true;

    if (e == "blacktriangle")
      this.medicationgflagmessage = "Black Triangle Medication";
    else if (e == "clinicaltrial")
      this.medicationgflagmessage = "Clinical Trial Medication";
    else if (e == "controlled")
      this.medicationgflagmessage = "Controlled Medication";
    else if (e == "expensive")
      this.medicationgflagmessage = "Expensive Medication";
    else if (e == "nonformulary")
      this.medicationgflagmessage = "Non Formulary Medication";
    else if (e == "highalert")
      this.medicationgflagmessage = "High Alert Medication";
    else if (e == "unlicenced")
      this.medicationgflagmessage = "Unlicenced Medication";
    else if (e == "critical")
      this.medicationgflagmessage = "Critical Medication";
    else if (e == "bloodproduct")
      this.medicationgflagmessage = "Blood Product";
    setTimeout(() => {
      if (d)
        d.showmedicationflag = false;
      else
        this.showmedicationflag = false;
    }, 3000);
  }



  showDrugInfo(d?: Diluent) {
    var formkeyvalues = [];
    this.getAllJsonKeys(this.prescription.getRawValue(), formkeyvalues);

    if (d) {

      var p = d.fs.GeneratePrescriptionObject(formkeyvalues);
      this.subjects.drugInformation.next(p.__medications[0]);
    }
    else {
      var p = this.formsettings.GeneratePrescriptionObject(formkeyvalues);
      this.subjects.drugInformation.next(p.__medications[0]);
    }
  }
  OpenProtocolForm() {
    this.iseditingprotocol = true;
    this.iseditingvariable = false;
    this.formsettings.interval_type = IntervalType.protocol;

    this.formsettings.protocol_dosing_pattern = []
    this.formsettings.dosing_pattern = [];
    var numberofdays = 5;
    let prescriptionstartdate = this.prescription.get("startdate").value;

    var startdate = prescriptionstartdate ? moment(prescriptionstartdate) : moment();
    var enddate = moment(startdate).add(numberofdays, "day");

    for (var i = startdate.clone(); i < enddate; i.add(1, "day")) {
      var p = new ProtocolInterval(i.clone());
      this.formsettings.protocol_dosing_pattern.push(p);
    }

    //create dosing interval of 4 hours
    //creates a dosig interval pattern of 4 hours for each day in the protocol
    //calls "GenerateProtocolIntervalPattern" for each date in the protocol
    this.prescription.get('posology.interval.times_hours').setValue("x");
    // this.prescription.get('posology.interval.times_hours').updateValueAndValidity();
    this.prescription.get('posology.interval.frequency').setValue("4");
    // this.prescription.get('posology.interval.frequency').updateValueAndValidity();

    // this.prescription.get('posology.strength.dose_size').reset();
    // this.prescription.get('posology.strength.dose_strength_neumerator').reset();
    // this.prescription.get('posology.strength.dose_strength_denominator').reset();
    // this.prescription.get('posology.strength.dose_description').reset();

    // this.prescription.get('posology.strength.dose_size').updateValueAndValidity();
    // this.prescription.get('posology.strength.dose_strength_neumerator').updateValueAndValidity();
    // this.prescription.get('posology.strength.dose_strength_denominator').updateValueAndValidity();
    // this.prescription.get('posology.strength.dose_description').updateValueAndValidity();

    if (this.formContext == FormContext.mod || this.formContext == FormContext.op) {
      this.durations = [];
      Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
      this.SetModDurations();
    }
  }


  GenerateProtocolHTMLBinder() {
    var rows = [];
    var columns = [];
    //none d1 d2  d3
    //i1  d   d   d
    //i2  d   d   d
    //in  d   d   d

    //add header row of dates
    // empty column
    columns.push({ "value": "", "type": "" });

    for (var p = 0; p < this.formsettings.protocol_dosing_pattern.length; p++) {
      if (p == 0) {
        columns.push({ "value": this.formsettings.protocol_dosing_pattern[p].date, "type": "dateselectcell" });
        this.protocolstartdate = this.formsettings.protocol_dosing_pattern[p].date.toDate();
      }
      else
        columns.push({ "value": this.formsettings.protocol_dosing_pattern[p].date, "type": "datecell" });

    }
    columns.push({ "value": "", "type": "adddaycell" });
    columns.push({ "value": "", "type": "removedaycell" });

    rows.push(columns);
    columns = [];
    //get dosing interval from 1st day
    var intervalpattern = this.formsettings.protocol_dosing_pattern[0].intervalpattern;

    //add dose rows
    for (var i = 0; i < intervalpattern.length; i++) {
      //push left-side timeheader
      columns.push({ "value": intervalpattern[i], "type": "timecell" });

      //add dose columns
      for (var j = 0; j < this.formsettings.protocol_dosing_pattern.length; j++) {
        columns.push({ "value": this.formsettings.protocol_dosing_pattern[j].intervalpattern[i], "type": "dosecell" });
      }
      rows.push(columns);
      columns = [];
    }
    columns.push({ "value": "", "type": "addintervalcell" });
    columns.push({ "value": "", "type": "removeintervalcell" });
    rows.push(columns);
    columns = [];

    this.protocolHTMLBinder = rows;
  }

  SetVariableInfusionVolumeLabels(calculateendtimeforlastslot = true) {
    let len = this.formsettings.infusion_rate_pattern.length;
    if (this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca)
      calculateendtimeforlastslot = false;

    if (calculateendtimeforlastslot) {
      if (len >= 2) {
        let lastslot = this.formsettings.infusion_rate_pattern[len - 1];
        lastslot.starttime.infusionrate = +this.FixToDecimalPlaces(lastslot.starttime.infusionrate, this.formsettings.precision);
        lastslot.endtime = new Timeslot();
      }
    }

    var totalVolume = this.GetDoseSolutionQuantity();
    var prescribedVolume = this.GetVariableInfusionTotalPrescribedVolume();
    var remainingVolume = totalVolume - +prescribedVolume;
    if (remainingVolume < 0) {
      remainingVolume = 0;
      prescribedVolume = totalVolume
    }
    (this.totalVolume.nativeElement as HTMLSpanElement).innerHTML = this.FixToDecimalPlaces(totalVolume, this.formsettings.precision) + " ml";
    (this.remainingVolume.nativeElement as HTMLSpanElement).innerHTML = this.FixToDecimalPlaces(remainingVolume, this.formsettings.precision).toString() + " ml";
    (this.prescribedVolume.nativeElement as HTMLSpanElement).innerHTML = this.FixToDecimalPlaces(+prescribedVolume, this.formsettings.precision).toString() + " ml";

    if (calculateendtimeforlastslot) {
      if (len >= 2) {
        let lastslot = this.formsettings.infusion_rate_pattern[len - 1];

        if (lastslot.starttime.infusionrate) {
          let emptyslots = this.formsettings.infusion_rate_pattern.
            find(x => isNaN(x.starttime.infusionrate) || x.starttime.infusionrate <= 0);
          if (!emptyslots && FormSettings.IsValidTimeSlotString(lastslot.starttime.GetFormatString())
            && !isNaN(lastslot.starttime.infusionrate) && lastslot.starttime.infusionrate > 0
            && !isNaN(remainingVolume) && remainingVolume > 0) {
            let hoursrequiredtofinish = remainingVolume / lastslot.starttime.infusionrate;

            if (hoursrequiredtofinish > 0) {
              let calculatedendtime;
              let starttime = moment().set("hours", lastslot.starttime.hour).set("minute", lastslot.starttime.minute).set("second", 0);

              if (hoursrequiredtofinish > 24) {
                calculatedendtime = starttime;
              }
              else if (hoursrequiredtofinish < 0.0166667) {
                calculatedendtime = starttime.add(1, 'minute');
              }
              else {
                calculatedendtime = starttime.add(hoursrequiredtofinish, "hours");
              }

              if (moment.isMoment(calculatedendtime)) {
                if (calculatedendtime.second() != 0) {
                  calculatedendtime.add(1, "minute");
                }
                let timeslot = [calculatedendtime.get("hours"), calculatedendtime.get("minute")];
                this.timechange(timeslot.join(":"), lastslot.endtime, false);
              }
            }

          }
        }

      }
    }
  }

  GetVariableInfusionTotalPrescribedVolume(alsoValidate = false) {
    var totalVolume = this.GetDoseSolutionQuantity();
    var startdt = this.prescription.get("startdate").value;
    var totalPlannedVolume = 0;
    var endsBeforeLastInterval = false;
    if (!(FormSettings.IsValidTimeSlotString(this.formsettings.infusion_rate_pattern[0].starttime.GetFormatString()) && FormSettings.IsValidTimeSlotString(this.formsettings.infusion_rate_pattern[0].endtime.GetFormatString()))) {
      return totalPlannedVolume;
    }

    this.VariableInfusionSequenceGeneratorValidator(moment(startdt), this.formsettings.infusion_rate_pattern, true);

    this.formsettings.infusion_rate_pattern.forEach(ir => {
      if (ir.starttime.date && ir.endtime.date) {
        var timeinhours = ir.endtime.date.diff(ir.starttime.date, "hours", true);
        if (ir.starttime.infusionrate)
          totalPlannedVolume += timeinhours * ir.starttime.infusionrate;

        if (alsoValidate) {
          var index = this.formsettings.infusion_rate_pattern.findIndex((fts) => { return fts === ir });
          var remainingVolume = totalVolume - totalPlannedVolume;
          if (remainingVolume <= 0 && index < this.formsettings.infusion_rate_pattern.length - 1) {
            endsBeforeLastInterval = true;
          }
        }
      }
    });

    if (endsBeforeLastInterval)
      return "invalid_infusionrate";
    else
      if (totalVolume - totalPlannedVolume > 0 && alsoValidate)
        return "invalid_prescribedvolume"
      else
        return totalPlannedVolume;
  }

  GenerateProtocolIntervalPattern(frequency) {
    this.formsettings.protocol_dosing_pattern.forEach((p) => {
      this.GenerateIntervalPattern(frequency, null);
      p.intervalpattern = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
    })

    this.GenerateProtocolHTMLBinder();
  }

  AddDayToProtocol() {
    var newday = moment.max(this.formsettings.protocol_dosing_pattern.map((p) => p.date)).clone().add(1, "day");
    var p = new ProtocolInterval(newday)
    var frequency = this.prescription.get('posology.interval.frequency').value;
    // this.GenerateIntervalPattern(frequency, null);

    if (this.formsettings.protocol_dosing_pattern.length > 0) {
      var ip = this.formsettings.protocol_dosing_pattern[0].intervalpattern
      ip.forEach(e => {
        var ts = new Timeslot(e.hour, e.minute);
        p.intervalpattern.push(ts);
      });
    }
    this.formsettings.protocol_dosing_pattern.push(p);
    this.GenerateProtocolHTMLBinder();

  }

  RemoveDayFromProtocol() {
    if (this.formsettings.protocol_dosing_pattern.length > 1) {
      this.formsettings.protocol_dosing_pattern.pop();
      this.GenerateProtocolHTMLBinder();
    }
  }

  RemoveIntervalFromProtocol() {
    this.formsettings.protocol_dosing_pattern.forEach((p) => {
      if (p.intervalpattern.length > 1) {
        p.intervalpattern.pop();
      }
    });
    this.GenerateProtocolHTMLBinder();
  }

  AddIntervalToProtocol() {
    this.formsettings.protocol_dosing_pattern.forEach((p) => {
      p.intervalpattern.push(new Timeslot());
    });
    this.GenerateProtocolHTMLBinder();
  }

  AddIntervalToInfusionRate() {
    var lastindex = this.formsettings.infusion_rate_pattern.length - 1;
    var lstts = this.formsettings.infusion_rate_pattern[lastindex].endtime;
    if (FormSettings.IsValidTimeSlotString(lstts.GetFormatString())) {
      this.formsettings.infusion_rate_pattern.push(new InfusionRate(new Timeslot(lstts.hour, lstts.minute), new Timeslot()));
    }
  }

  DisableStartDateSelection(ir: InfusionRate) {

    var changeindex = this.formsettings.infusion_rate_pattern.findIndex((fts) => { return fts === ir });
    var linkedFirst = false;
    if (this.formsettings.linkedinfusionid && (this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca))
      linkedFirst = true;
    return changeindex != 0 || linkedFirst;
  }

  DisableAddInfusionInterval() {
    if (this.formsettings.infusion_rate_pattern.length != 0) {
      var lastindex = this.formsettings.infusion_rate_pattern.length - 1;
      var lstts = this.formsettings.infusion_rate_pattern[lastindex].endtime;
      if (!FormSettings.IsValidTimeSlotString(lstts.GetFormatString())) {
        return true;
      }
    }
    return false;
  }

  RemoveIntervalFromInfusionRate() {
    if (this.formsettings.infusion_rate_pattern.length > 2) {
      this.formsettings.infusion_rate_pattern.pop();
      this.SetVariableInfusionVolumeLabels(true);
    }
  }
  CopyDoseToProtocol() {
    var dose = ((this.copydose.nativeElement as HTMLInputElement).value as string);
    if (!isNaN(+dose) && +dose > 0) {
      this.formsettings.protocol_dosing_pattern.forEach(p => {
        p.intervalpattern.forEach(i => {
          if (this.formsettings.dose_type == DoseType.units) {
            i.dose_size = +dose;
            this.StrengthToUnitDose(i, true, this.formsettings);
          }
          else if (this.formsettings.dose_type == DoseType.strength) {
            i.dose_strength_neumerator = +dose;
            this.CalculateTSVolumeFordose(i);
          }
        });
      });
    }
    this.clearVariableErrorMessages();
  }
  GenerateIntervalPattern(frequency, starttime?: moment.Moment) {
    this.formsettings.dosing_pattern = [];
    this.appService.logToConsole(frequency);
    var frequencysize: number;
    if (!isNaN(+frequency) && +frequency > 0) {
      frequencysize = <unknown>frequency as number;
      frequency = this.prescription.get('posology.interval.times_hours').value;
    }
    if (frequency == 'm')
      frequency = 'stat'
    if (starttime)
      this.formsettings.GenerateIntervalPattern(frequency, frequencysize, new Timeslot(starttime.get("hour"), starttime.get("minute")));
    else
      this.formsettings.GenerateIntervalPattern(frequency, frequencysize);

    this.DoseCalculations();
    if (this.formContext == FormContext.mod || this.formContext == FormContext.op)
      this.SetTotalQuantity();
  }

  ResetStartTime() {
    if (!this.prescription.get('posology.interval.prn').value)
      this.prescription.get('starttime').setValue("");
    if (this.starttimecontrol) {
      if ((this.starttimecontrol.nativeElement as HTMLSelectElement).options.length == 0 ||
        (this.starttimecontrol.nativeElement as HTMLSelectElement).options[0].value != "") {
        var t = document.createElement("option");
        t.value = "";
        t.text = "";
        (this.starttimecontrol.nativeElement as HTMLSelectElement).options.add(t, 0);
        this.appService.logToConsole("starttime reset");
      }
    }

    let freq = this.prescription.get('posology.interval.frequency');
    if (this.formsettings &&
      this.formsettings.dosing_pattern &&
      this.formsettings.dosing_pattern.length != 0 &&
      this.formsettings.dosing_pattern[0].GetFormatString() != "--:--") {
      if (freq && freq.value == FrequencyType.stat) {
        this.prescription.get("startdate").setValue(moment().toDate());
        this.prescription.get("starttime").setValue(this.formsettings.dosing_pattern[0].GetFormatString())
      }
      else if (!this.prescription.get('posology.interval.prn').value) {
        let now = moment().seconds(0).milliseconds(0);
        var dpclone = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
        dpclone.sort(function compare(a, b) {
          var dateA = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), a).toDate());
          var dateB = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), b).toDate());
          return dateA.getTime() - dateB.getTime();
        });

        if (this.appService.isCurrentEncouner && this.formsettings.interval_type != IntervalType.protocol) {
          let next;
          if (this.editModeMinStartCompareDateTime) {
            let comparedate = moment(this.editModeMinStartCompareDateTime)
            if (comparedate.isSameOrBefore(moment())) {
              comparedate = moment();
            }

            next = dpclone.map(e => { e.date = moment(comparedate); return e }).find(e => FormSettings.GetMomentForDateAndTimeslot(moment(comparedate), e).isAfter(comparedate));
            if (!next)
              next = dpclone.map(e => { e.date = moment(comparedate).add(1, "d"); return e }).find(e => FormSettings.GetMomentForDateAndTimeslot(moment(comparedate).add(1, "d"), e).isAfter(comparedate));
          }
          else {
            next = dpclone.map(e => { e.date = moment(); return e }).find(e => FormSettings.GetMomentForDateAndTimeslot(moment(), e).isSameOrAfter(now));
            if (!next)
              next = dpclone.map(e => { e.date = moment().add(1, "d"); return e }).find(e => FormSettings.GetMomentForDateAndTimeslot(moment().add(1, "d"), e).isSameOrAfter(now));
          }
          if (next) {
            this.prescription.get("startdate").setValue(next.date.toDate())

            this.prescription.get("starttime").setValue(next.GetFormatString())

          }
        }
        else if ((this.formsettings.interval_type == IntervalType.protocol || this.appService.isTCI) && dpclone && dpclone.length > 0) {
          this.prescription.get("starttime").setValue(dpclone[0].GetFormatString())

        }
        dpclone = null;
      }
    }
  }

  UpdateInfusionDurationValueAndValidity() {
    var duration = this.prescription.get("infusionduration");
    duration.updateValueAndValidity();
  }

  FixToDecimalPlaces(input: number, n: number = this.formsettings.precision) {
    if (!isNaN(input)) {
      if (input % 1 != 0)
        return +(+input).toFixed(n).replace(/\.0+$/g, '');
      else
        return input;
    }
    else if (input && input.toString().indexOf('-') != -1) {
      let components = input.toString().split('-');
      let comp1 = components[0];
      let comp2 = components[1];
      if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
        comp1 = (+comp1).toFixed(n).replace(/\.0+$/g, '');
        comp2 = (+comp2).toFixed(n).replace(/\.0+$/g, '');
        return comp1 + "-" + comp2;
      }
      else {
        return input
      }
    }
    else
      return input;
  }

  HideDurationForStatDose(frequency, resetDurationAndEndDate = true) {
    if (frequency == "stat") {
      this.ResetChosenDaysToSkip();
      this.ResetChosenDaysOfWeek();
      this.SetObjectiveFormValue("chosendays", ChosenDays.all);

      this.showDuration = false;
      this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
      this.prescription.get('prescriptionduration').updateValueAndValidity();
      this.prescription.get('enddate').disable();
      this.prescription.get('endtime').disable();
    }
    else {
      this.showDuration = true;
      if (resetDurationAndEndDate) {
        const dur = (this.formContext == FormContext.mod || this.formContext == FormContext.op) ?
          this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.days) :
          this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled);

        this.prescription.get('prescriptionduration').setValue(dur.prescriptionduration_id);
        this.prescription.get('prescriptionduration').updateValueAndValidity();
        this.prescription.get('enddate').reset();
        this.prescription.get('enddate').enable();
        this.prescription.get('endtime').reset();
        this.prescription.get('endtime').enable();
      }
    }
    this.FirstAdministrationMessage();
  }

  onChanges(): void {
    this.subscriptions.add(this.prescription.get('posology.interval.frequency').valueChanges.subscribe((frequency: string) => {
      this.formsettings.dosing_pattern = [];
      this.appService.logToConsole("frequency change");
      this.prescription.get('posology.interval.customfrequency').setValue("");
      // this.prescription.get('posology.interval.customfrequency').updateValueAndValidity(); // this will trigger customfrequency change event
      if (this.formsettings.interval_type == IntervalType.protocol)
        this.GenerateProtocolIntervalPattern(frequency);
      else
        this.GenerateIntervalPattern(frequency);

      this.UpdateInfusionDurationValueAndValidity();
      this.ResetStartTime();

      //if frequency is stat disable duration selection
      if (this.formContext != FormContext.moa) {
        this.HideDurationForStatDose(frequency);
      }
      else {
        if (frequency == "stat") {
          this.ResetChosenDaysToSkip();
          this.ResetChosenDaysOfWeek();
          this.SetObjectiveFormValue("chosendays", ChosenDays.all);
          this.FirstAdministrationMessage();
        }
      }
    }));
    this.subscriptions.add(this.prescription.get('posology.interval.times_hours').valueChanges.subscribe((times_hours: string) => {
      this.formsettings.dosing_pattern = [];
      this.appService.logToConsole("times hour change");
      this.ClearFrequency();
      this.ResetStartTime();

    }));
    this.subscriptions.add(this.prescription.get('posology.interval.customfrequency').valueChanges.subscribe((customfrequency: string) => {
      this.formsettings.dosing_pattern = [];
      this.appService.logToConsole("customfreq change");
      if (!isNaN(+customfrequency) && +customfrequency > 0 && +customfrequency <= 24) {
        if (this.formsettings.interval_type == IntervalType.protocol)
          this.GenerateProtocolIntervalPattern(customfrequency);
        else
          this.GenerateIntervalPattern(customfrequency);
      }
      else {
        if (this.formsettings.interval_type == IntervalType.protocol)
          this.GenerateProtocolIntervalPattern("");
        else
          this.GenerateIntervalPattern("");
      }
      this.UpdateInfusionDurationValueAndValidity();
      this.ResetStartTime();

      //clear variable error message
      this.clearVariableErrorMessages();
    }));

    this.subscriptions.add(this.prescription.get('prescriptionduration').valueChanges.subscribe((duration: string) => {
      this.appService.logToConsole("duration change");
      this.prescription.get('prescriptiondurationsize').reset();
      // this.SetPrescriptionEndDateTime();


    }));

    this.subscriptions.add(this.prescription.get('prescriptiondurationsize').valueChanges.subscribe((durationsize: string) => {
      this.appService.logToConsole("durationsize change");
      this.SetPrescriptionEndDateTime();
      if (this.formContext == FormContext.mod || this.formContext == FormContext.op)
        this.SetTotalQuantity();
    }));

    this.subscriptions.add(this.prescription.get('startdate').valueChanges.subscribe((startdate: string) => {
      this.appService.logToConsole("startdate change");
      if (this.formsettings.interval_type == IntervalType.protocol && startdate) {
        this.UpdateProtocolDates(moment(startdate));
        this.prescription.get('endtime').updateValueAndValidity({ emitEvent: false, onlySelf: true });

      }

      if (this.formsettings.interval_type != IntervalType.protocol)
        this.SetPrescriptionEndDateTime();
      if (this.formsettings.isInfusion && this.formsettings.interval_type == IntervalType.variable && !this.iseditinginfusionvariable)
        this.SaveVariableInfusionEdit();
      //this.VariableInfusionSequenceGeneratorValidator(moment(startdate), this.formsettings.infusion_rate_pattern);
      this.FirstAdministrationMessage();

      this.prescription.get('starttime').updateValueAndValidity({ emitEvent: false, onlySelf: true });
      this.prescription.get('antimicrobialstartdate').updateValueAndValidity({ emitEvent: false, onlySelf: true });

    }));

    this.subscriptions.add(this.prescription.get('starttime').valueChanges.subscribe((starttime: string) => {
      this.appService.logToConsole("starttime change");
      if (this.formsettings.interval_type != IntervalType.protocol)
        this.SetPrescriptionEndDateTime();
      this.FirstAdministrationMessage();
      this.prescription.get('startdate').updateValueAndValidity({ emitEvent: false, onlySelf: true });
      this.prescription.get('antimicrobialstartdate').updateValueAndValidity({ emitEvent: false, onlySelf: true });

    }));

    this.subscriptions.add(this.prescription.get('infusiontype').valueChanges.subscribe((infusiontype: string) => {
      this.appService.logToConsole("infusiontype change");
      this.formsettings.infusionType = <InfusionType>infusiontype;
      if (this.formsettings.infusionType == InfusionType.ci ||
        this.formsettings.infusionType == InfusionType.bolus ||
        this.formsettings.infusionType == InfusionType.rate ||
        this.formsettings.infusionType == InfusionType.pca) {
        this.formsettings.isInfusion = true;
      }
      else {
        this.formsettings.isInfusion = false;
      }
      this.SetVTMStylePrescribing();

      this.ClearFrequency();
      this.ResetInfusionRateDuration();
      this.ValidateDose();
      this.formsettings.dosing_pattern = [];
      this.formsettings.protocol_dosing_pattern = [];
      this.formsettings.infusion_rate_pattern = [];
      this.formsettings.interval_type = IntervalType.standard;
      this.RemoveLinkedInfusion();

      this.SetZeroInfusionRate();

      this.prescription.get("posology.interval.prn").reset();
      this.prescription.get("posology.interval.do").reset();

    }));

    this.subscriptions.add(this.prescription.get('posology.interval.prn').valueChanges.subscribe((prn: string) => {
      // this.formsettings.dosing_pattern = [];
      this.appService.logToConsole("prn change");
      this.prescription.get('posology.interval.customfrequency').updateValueAndValidity({ emitEvent: false, onlySelf: true });

      this.ResetStartTime();

      if (prn) {
        var now = moment();
        var currenttime = new Timeslot(now.get("hour"), now.get("minute")).GetFormatString()
        this.prescription.get('starttime').setValue(currenttime);
        //this.prescription.get('starttime').disable();
        this.prescription.get('posology.interval.do').setValue(false);

        //disable time_hours X - PRN will only allow selecting interval in hours 
        this.SetObjectiveFormValue("posology.interval.times_hours", "h");
        // this.prescription.get("posology.interval.times_hours").disable();
        this.SetObjectiveFormValue("chosendays", ChosenDays.all);
        //reset min-start-date-time to now if edit prescription 
        if (this.editingPrescription && !this.clonePrescription && this.appService.isCurrentEncouner && this.formContext == FormContext.ip) {
          this.minStartDate = moment().toDate();
        }

        if (this.formContext == FormContext.ip) {
          this.durations = [];
          Object.assign(this.durations, this.appService.MetaPrescriptionDuration.filter(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled));
          this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
        }
      }
      else {
        if (this.prescription.get("posology.interval.times_hours").value == "m")
          this.SetObjectiveFormValue("posology.interval.times_hours", "h");

        this.prescription.get('starttime').setValue("");
        this.prescription.get('starttime').enable();
        //this.prescription.get("posology.interval.times_hours").enable({ emitEvent: false, onlySelf: true });

        if (this.formContext == FormContext.ip) {
          this.durations = [];
          Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
          this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
        }
      }
      this.prescription.get("indication").updateValueAndValidity();
    }));
    this.subscriptions.add(this.prescription.get('posology.interval.do').valueChanges.subscribe((dorder: string) => {
      // this.formsettings.dosing_pattern = [];
      this.appService.logToConsole("do change");

      if (dorder) {
        this.prescription.get('posology.interval.prn').setValue(false);
      }
      this.ResetStartTime();
    }));

    this.subscriptions.add(this.prescription.get('chosendays').valueChanges.subscribe((chosendays: string) => {
      // this.formsettings.dosing_pattern = [];

      if (chosendays == ChosenDays.all) {
        this.ResetChosenDaysToSkip();
        this.ResetChosenDaysOfWeek();
        // // this.prescription.get("daysofweek").disable();
        // (this.daysofweekcheckbox.nativeElement as HTMLInputElement).disabled = true;
        this.prescription.get("dosingdaysfrequency").disable();
        this.prescription.get("dosingdaysfrequencysize").disable();
      }
      else
        if (chosendays == ChosenDays.chosen) {
          this.ResetChosenDaysToSkip();
          // // this.prescription.get("daysofweek").enable();
          // (this.daysofweekcheckbox.nativeElement as HTMLInputElement).disabled = false;

          this.prescription.get("dosingdaysfrequency").disable();
          this.prescription.get("dosingdaysfrequencysize").disable();
        }
        else
          if (chosendays == ChosenDays.skip) {
            this.ResetChosenDaysOfWeek();
            // // this.prescription.get("daysofweek").disable();
            // (this.daysofweekcheckbox.nativeElement as HTMLInputElement).disabled = true;
            this.prescription.get("dosingdaysfrequency").enable();
            this.prescription.get("dosingdaysfrequencysize").enable();
          }
    }));

    this.subscriptions.add(this.prescription.get('indication').valueChanges.subscribe((indication: string) => {
      this.appService.logToConsole("indication change");
      this.IndicationChanged(indication);
      var otherindicationscontrol = this.prescription.get('otherindications');
      otherindicationscontrol.updateValueAndValidity();
    }));

    this.subscriptions.add(this.prescription.get('prescriptionsource').valueChanges.subscribe((srouceid: string) => {
      this.appService.logToConsole("prescriptionsource change");
      let src = this.formsettings.sources.find(x => x.prescriptionsource_id == srouceid)
      if (src) {
        this.SourceChanged(true, src);
        this.prescription.get("prescriptionsource").setValue("", { emitEvent: false })
      }
    }));

    this.subscriptions.add(this.prescription.get('posology.strength.dose_units').valueChanges.subscribe((units: string) => {
      this.appService.logToConsole("doseunits change");
      this.formsettings.dose_units = units;
      this.DoseCalculations();
    }));

    this.subscriptions.add(this.prescription.get('istitrationrange').valueChanges.subscribe(() => {
      this.prescription.get('titrationtargetmax').updateValueAndValidity();
    }));

    this.subscriptions.add(this.prescription.get('titration').valueChanges.subscribe(() => {
      this.prescription.get('titrationtargetmin').updateValueAndValidity();
      this.prescription.get('titrationtargetmax').updateValueAndValidity();
    }));


    this.subscriptions.add(this.prescription.get('enddate').valueChanges.subscribe(() => {
      this.SetPrescriptionIllustration();
    }));


    this.subscriptions.add(this.prescription.get('endtime').valueChanges.subscribe(() => {
      this.SetPrescriptionIllustration();
    }));
    this.subscriptions.add(this.prescription.get('antimicrobialstarttime').valueChanges.subscribe(() => {
      var am_sd = this.prescription.get("antimicrobialstartdate");
      am_sd.updateValueAndValidity({ emitEvent: false, onlySelf: true });
    }));



  }

  SourceChanged(selected: boolean, src: Source) {
    src.selected = selected;
    this.prescription.get("otherprescriptionsource").updateValueAndValidity();
  }

  UpdateProtocolDates(startdate: moment.Moment) {
    console.log("updating protocol dates")
    var repeatprotocol = this.prescription.get('posology.repeatprotocol').value;

    //if no repeat is chosen, show the end date in a non editable format
    let initdate = startdate.clone();
    for (let i = 0; i < this.formsettings.protocol_dosing_pattern.length; i++) {
      console.log(initdate);
      console.log(i);

      if (i == 0)
        this.formsettings.protocol_dosing_pattern[i].date = initdate.clone();
      else
        this.formsettings.protocol_dosing_pattern[i].date = initdate.add(1, "day").clone();
    }
    if (repeatprotocol == "none" || repeatprotocol == "protocol") {
      this.SetProtocolEndDate(repeatprotocol);
    }

  }
  //sets total quantity of medication based on selected dose and selected interval
  SetTotalQuantity() {
    var chosenoption = this.prescription.get("chosendays").value
    if (chosenoption != ChosenDays.all) {
      this.SetObjectiveFormValue("totalquantity", "");
      return;
    }

    if (this.formsettings.dose_type != DoseType.descriptive && this.formsettings.medication.productType.toLowerCase() != "vtm") {


      let quantity;
      let totalQuantity;
      this.SetObjectiveFormValue("totalquantity", "");

      if (this.formsettings.interval_type == IntervalType.standard) {
        if (this.formsettings.dose_type == DoseType.strength) {
          if (this.prescription.get('posology.interval.prn').value == true) {
            quantity = this.formsettings.prnMaxDose_TimeSlot.dose_strength_denominator;
          }
          else
            quantity = this.prescription.get("posology.strength.dose_strength_denominator").value;
        }
        else if (this.formsettings.dose_type == DoseType.units) {
          if (this.prescription.get('posology.interval.prn').value == true) {
            quantity = this.formsettings.prnMaxDose_TimeSlot.dose_size;
          }
          else
            quantity = this.prescription.get("posology.strength.dose_size").value;
        }

        if (quantity && !this.prescription.get('posology.interval.prn').value == true) {
          quantity = this.FixToDecimalPlaces(quantity * this.formsettings.dosing_pattern.length);
        }
      }
      else if (this.formsettings.interval_type == IntervalType.variable) {
        if (this.formsettings.dose_type == DoseType.strength) {
          quantity = this.formsettings.dosing_pattern.reduce(function (sum, arr) { return sum + +arr.dose_strength_denominator; }, 0);
        } else if (this.formsettings.dose_type == DoseType.units) {
          quantity = this.formsettings.dosing_pattern.reduce(function (sum, arr) { return sum + +arr.dose_size; }, 0);
        }
      } else if (this.formsettings.interval_type == IntervalType.protocol) {

        if (this.formsettings.dose_type == DoseType.strength) {
          quantity = [].concat(...this.formsettings.protocol_dosing_pattern.map(p => p.intervalpattern)).reduce(function (sum, arr: Timeslot) { return sum + +arr.dose_strength_denominator; }, 0);
        } else if (this.formsettings.dose_type == DoseType.units) {
          quantity = [].concat(...this.formsettings.protocol_dosing_pattern.map(p => p.intervalpattern)).reduce(function (sum, arr: Timeslot) { return sum + +arr.dose_size; }, 0);
        }
      }

      //"quantity" has quantity for a single day / protocol , multiple by duration or protocol repeat to get total quantity required for the prescriptoion
      if (quantity &&
        (this.formsettings.interval_type == IntervalType.standard
          || this.formsettings.interval_type == IntervalType.variable)) {
        let duration = this.prescription.get("prescriptionduration").value;
        if (duration) {
          duration = this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == duration).duration.toLocaleLowerCase();

          let durationsize = this.prescription.get("prescriptiondurationsize").value;
          if (duration == PrescriptionDuration.months) {
            durationsize = durationsize * 28;
          } else if (duration == PrescriptionDuration.weeks) {
            durationsize = durationsize * 7;
          }
          if (durationsize) {
            totalQuantity = quantity * durationsize;
          }
        }
      }
      else
        if (quantity && this.formsettings.interval_type == IntervalType.protocol) {

          let protocolenddate = this.prescription.get('posology.protocolenddate').value;
          let repeatprotocol = this.prescription.get('posology.repeatprotocol').value;
          let repeatprotocolsub = this.prescription.get('posology.repeatprotocolsub').value;
          let protocolrepeattimes = this.prescription.get('posology.protocolrepeattimes').value;

          //if repeat type is full protocol, multiply the quantity by number of protocolrepeattimes
          //if repeat type is last date, get number of days between protocol last date and protocolenddate and multiple with quantity

          if (repeatprotocol === "protocol") {
            if (protocolrepeattimes) {
              totalQuantity = quantity * (+protocolrepeattimes)
            }
          }
          else if (repeatprotocol === "lastday" && protocolenddate) {

            let lastdateofprotocol = moment.max(this.formsettings.protocol_dosing_pattern.map((p) => p.date)).clone();

            let numberofdays = moment(protocolenddate).startOf('day').diff(moment(lastdateofprotocol).startOf('day'), "day");

            if (numberofdays) {
              let lastdayquantity = 0;
              if (this.formsettings.dose_type == DoseType.strength) {
                lastdayquantity = [].concat(...this.formsettings.protocol_dosing_pattern.filter(x => x.date.isSame(lastdateofprotocol)).map(p => p.intervalpattern)).reduce(function (sum, arr: Timeslot) { return sum + +arr.dose_strength_denominator; }, 0);
              } else if (this.formsettings.dose_type == DoseType.units) {
                lastdayquantity = [].concat(...this.formsettings.protocol_dosing_pattern.filter(x => x.date.isSame(lastdateofprotocol)).map(p => p.intervalpattern)).reduce(function (sum, arr: Timeslot) { return sum + +arr.dose_size; }, 0);
              }
              totalQuantity = quantity + (lastdayquantity * numberofdays);
            }
          }
          else {
            totalQuantity = quantity;
          }
        }

      this.SetObjectiveFormValue("totalquantity", Math.ceil(totalQuantity));
      this.prescription.get("totalquantity").updateValueAndValidity();

    }
  }

  ResetInfusionRateDuration() {
    this.prescription.get('infusionrate').reset();
    this.prescription.get('infusiondoserate').reset();
    this.prescription.get('infusionduration').reset();
    this.ValidateInfusionRateDuration();
  }

  ValidateInfusionRateDuration() {
    this.prescription.get('infusionrate').updateValueAndValidity();
    this.prescription.get('infusionduration').updateValueAndValidity();
  }

  ValidateDose() {
    this.prescription.get('posology.strength.dose_size').updateValueAndValidity();
    this.prescription.get('posology.strength.dose_strength_neumerator').updateValueAndValidity();
    this.prescription.get('posology.strength.dose_strength_denominator').updateValueAndValidity();
    this.prescription.get('posology.strength.dose_description').updateValueAndValidity();
  }

  TitrationToggled() {
    if (!this.formsettings.isInfusion)
      this.ClearDose();
    //set infusion type to ci by default if its titrated infusion
    if (this.prescription.get("titration").value && this.formsettings.isInfusion) {
      this.SetObjectiveFormValue("infusiontype", InfusionType.ci);
    }
    this.SetZeroInfusionRate();

    if (this.prescription.get("titration").value) {
      this.prescription.get("posology.interval.prn").reset();
      this.prescription.get("posology.interval.do").reset();
      this.prescription.get("posology.interval.do").disable();
    }
    else {
      this.prescription.get("posology.interval.prn").reset();
      this.prescription.get("posology.interval.do").reset();
      this.prescription.get("posology.interval.do").enable();
    }
  }
  ClearDose() {
    this.ResetStandardDose();
    this.ClearVariable();
  }

  SetZeroInfusionRate() {
    if (this.prescription.get("titration").value && this.formsettings.isInfusion && !this.prescription.get('infusionrate').value) {
      this.SetObjectiveFormValue('infusionrate', 0);
      this.SetObjectiveFormValue('infusiondoserate', 0);
    }
  }


  ProtocolStartDateChange(d) {
    //update the protocol dates sequence
    var protocolstartdate = moment(d).add(-1, "day");
    if (!moment(this.protocolstartdate).isSame(moment(d))) {

      this.formsettings.protocol_dosing_pattern.forEach(p => {
        p.date = protocolstartdate.add(1, "day").clone();
      });

      this.GenerateProtocolHTMLBinder();
    }
  }

  SetPrescriptionEndDateTime() {
    const startdate = this.prescription.get("startdate").value;
    const starttime = this.prescription.get("starttime").value;
    var duration = this.prescription.get("prescriptionduration").value;
    const durationsize = this.prescription.get("prescriptiondurationsize").value;
    var enddate = this.prescription.get("enddate");
    var endtime = this.prescription.get("endtime");

    if (moment.isDate(startdate) && FormSettings.IsValidTimeSlotString(starttime) && duration && durationsize) {
      if (!isNaN(+durationsize) && +durationsize > 0 && +durationsize <= 99999) {
        var enddatetime = FormSettings.GetMomentForDateAndTimeslotString(moment(startdate), starttime);
        duration = this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == duration).duration.toLocaleLowerCase();
        if (duration == PrescriptionDuration.hours ||
          duration == PrescriptionDuration.days ||
          duration == PrescriptionDuration.weeks ||
          duration == PrescriptionDuration.months) {
          enddate.reset();
          endtime.reset();

          // if (duration != PrescriptionDuration.hours) {
          //   enddatetime = FormSettings.GetMomentForDateAndTimeslotString(moment(startdate), "00:00");
          // }

          enddatetime.add(duration, durationsize);
          if (this.formsettings.dosing_pattern.length > 0) {
            var clone = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
            clone.sort(function compare(a, b) {
              var dateA = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), a).toDate());
              var dateB = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), b).toDate());
              return dateA.getTime() - dateB.getTime();
            });
            //var maxtime = clone[clone.length - 1].GetFormatString();
            if (this.formsettings.infusionType != InfusionType.ci && this.formsettings.infusionType != InfusionType.pca) {
              // enddatetime.add(1, "minutes");
              while (enddatetime.subtract(1, "minutes")) {
                if (clone.filter(x => x.GetFormatString() == enddatetime.format("HH:mm")).length != 0)
                  break;
              }
            }
          }
          enddate.setValue(enddatetime.toDate());
          endtime.setValue(
            new Timeslot(enddatetime.hours(), enddatetime.minute()).GetFormatString());
        }
        else if (duration == PrescriptionDuration.untilcancelled) {
          enddatetime = null;
          enddate.reset();
          endtime.reset();
        }
      }
    }
    else {
      this.prescription.get("endtime").reset();
      if (duration && this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == duration).duration.toLocaleLowerCase() == PrescriptionDuration.untilcancelled) {
        enddate.reset();
      }
    }
    this.prescription.get("endtime").updateValueAndValidity({ emitEvent: false, onlySelf: true });

    //this.SetPrescriptionIllustration();

  }

  SetPrescriptionIllustration() {
    // const startdate = this.prescription.get("startdate").value;
    // const starttime = this.prescription.get("starttime").value;
    // var duration = this.prescription.get("prescriptionduration").value;
    // var enddate = this.prescription.get("enddate");
    // var endtime = this.prescription.get("endtime");

    // if (this.prescription.get('posology.interval.prn').value === true) {

    //   setTimeout(() => {
    //     this.prescriptionillustration = null;
    //     this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   }, 1000);

    //   // console.log("prn illustration")
    //   // this.prescriptionillustration = null;
    //   // this.cd.detectChanges();
    //   // this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   // this.cd.detectChanges();
    // }
    // else if (startdate && starttime && duration && this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == duration).duration.toLocaleLowerCase() == PrescriptionDuration.untilcancelled) {
    //   console.log("until cancelled illustration")
    //   setTimeout(() => {
    //     this.prescriptionillustration = null;
    //     this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   }, 1000);
    //   // this.prescriptionillustration = null;
    //   // this.cd.detectChanges();
    //   // this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   // this.cd.detectChanges();
    // }
    // else if (startdate && starttime) {
    //   console.log("start date and time illustration")
    //   setTimeout(() => {
    //     this.prescriptionillustration = null;
    //     this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   }, 1000);
    //   // this.prescriptionillustration = null;
    //   // this.cd.detectChanges();
    //   // this.prescriptionillustration = this.formsettings.GeneratePrescriptionObject(this.GenerateFormKeyValues(), null);
    //   // this.cd.detectChanges();
    // }
    // else {
    //   console.log("no illustration")

    //   this.prescriptionillustration = null;
    // }
  }

  CalculateDoseForVolume() {
    if (this.formsettings.dose_type == DoseType.strength) {
      var sn = this.prescription.get("posology.strength.dose_strength_neumerator");
      var sd = this.prescription.get("posology.strength.dose_strength_denominator");
      sn.reset();
      var dose = this.formsettings.DoseForVolume(sd.value)
      if (dose) {
        if (+dose < this.maxLimitDose) {
          sn.setValue(dose);
        }
        else {
          sn.setValue("");
          sd.setValue("");
        }
      }
    }
    this.DoseStrengthDMChagned();
  }

  CalculateVolumeFordose() {
    if (this.formsettings.dose_type == DoseType.strength) {
      var sn = this.prescription.get("posology.strength.dose_strength_neumerator");
      var sd = this.prescription.get("posology.strength.dose_strength_denominator");
      sd.reset();
      console.log("tocalculatevolumefordose");
      //sn.setValue(this.FixToDecimalPlaces(sn.value), { emitEvent: false });
      var volume = this.formsettings.VolumeFordose(sn.value)
      if (volume) {
        if (+volume < this.maxLimitDose) {
          sd.setValue(volume);
        }
        else {
          sn.setValue("");
          sd.setValue("");
        }
      }
    }
    this.DoseStrengthNMChagned();
    this.DoseCalculations();

  }

  CalculateTSDoseForVolume(ts: Timeslot, fs?: FormSettings) {
    //fix ts neumerator decimal places
    // ts.dose_strength_denominator = +this.FixToDecimalPlaces(ts.dose_strength_denominator);
    ts.dose_strength_neumerator = null;
    var dose;
    if (fs)
      dose = fs.DoseForVolume(ts.dose_strength_denominator)
    else
      dose = this.formsettings.DoseForVolume(ts.dose_strength_denominator)
    if (dose) {
      if (+dose < this.maxLimitDose) {
        ts.dose_strength_neumerator = +dose;
      }
      else {
        ts.dose_strength_denominator = null;
        ts.dose_strength_neumerator = null;
      }
    }
  }

  CalculateTSVolumeFordose(ts: Timeslot, fs?: FormSettings) {
    //fix ts neumerator decimal places
    //ts.dose_strength_neumerator = +this.FixToDecimalPlaces(ts.dose_strength_neumerator);
    ts.dose_strength_denominator = null;
    var volume;
    if (fs)
      volume = fs.VolumeFordose(ts.dose_strength_neumerator)
    else
      volume = this.formsettings.VolumeFordose(ts.dose_strength_neumerator)
    if (volume) {
      if (+volume < this.maxLimitDose)
        ts.dose_strength_denominator = +volume;
      else {
        ts.dose_strength_neumerator = null;
        ts.dose_strength_denominator = null;
      }
    }

  }

  SetDosingPatternFromNow() {
    var frequency = this.prescription.get('posology.interval.frequency').value;
    const customfrequency = this.prescription.get('posology.interval.customfrequency').value;

    if (customfrequency) {
      frequency = customfrequency;
    }
    this.GenerateIntervalPattern(frequency, moment());
    if (this.formsettings &&
      this.formsettings.dosing_pattern &&
      this.formsettings.dosing_pattern.length != 0 &&
      this.formsettings.dosing_pattern[0].GetFormatString() != "--:--")
      this.prescription.get("starttime").setValue(this.formsettings.dosing_pattern[0].GetFormatString())
  }

  ValidateDiluentDose() {
    this.isdiluentdosevalid = true;
    if (this.formsettings.diluents && this.formsettings.diluents.length != 0) {
      this.formsettings.diluents.forEach(d => {
        if ((isNaN(+d.ts.dose_size) || +d.ts.dose_size <= 0) &&
          (isNaN(+d.ts.dose_strength_denominator) || +d.ts.dose_strength_denominator <= 0)) {
          this.isdiluentdosevalid = false;
        }
      });
    }
  }

  AddToTherapyList() {

    if (this.formContext == FormContext.ip && this.formsettings.interval_type == IntervalType.protocol && this.EndDateTimeValidator(this) != null) {
      this.prescription.get('endtime').setErrors({ "invalid_endtime": true });
      this.prescription.get('enddate').setErrors({ "invalid_enddate": true });

      return;

    }
    this.appService.logToConsole(this.prescription.valid);

    let skipvalidatedosageinterval = (this.validationjsonconfig && this.validationjsonconfig.Interval != undefined && this.validationjsonconfig.Interval == false);
    //validate tsarray
    var tsvalidation
    if (this.formsettings.interval_type == IntervalType.standard && this.formsettings.infusionType != InfusionType.ci && this.formsettings.infusionType != InfusionType.pca && this.prescription.get('posology.interval.prn').value != true) {
      tsvalidation = this.TSArrayValidator(this.formsettings.dosing_pattern, null, true);
      if (tsvalidation != null) {
        this.isStandardDosingPatternValid = false;
        this.appService.logToConsole(tsvalidation);
      }
    }
    //validate non reactive form elements
    //1.for variable rate,  toatal quantity should be prescribed
    var rateresult;
    if (this.formsettings.isInfusion && this.formsettings.infusionType == InfusionType.rate && this.formsettings.interval_type == IntervalType.variable) {
      rateresult = this.GetVariableInfusionTotalPrescribedVolume(true);
    }
    if (!rateresult)
      rateresult = "";

    //mod prescription set start time to first dose time
    if ((this.formContext == FormContext.mod || this.formContext == FormContext.op) && this.formsettings.dosing_pattern && this.formsettings.dosing_pattern.length != 0) {
      if (this.formsettings.interval_type == IntervalType.standard || this.formsettings.interval_type == IntervalType.variable) {
        this.SetObjectiveFormValue("starttime", this.formsettings.dosing_pattern[0].GetFormatString());
      } else if (this.formsettings.interval_type == IntervalType.protocol) {
        this.SetObjectiveFormValue("starttime", this.formsettings.protocol_dosing_pattern[0].intervalpattern[0].GetFormatString());
      }
    }

    if (this.formContext == FormContext.moa) {
      if (this.formsettings.interval_type == IntervalType.standard && this.formsettings.dosing_pattern.length == 0) {
        let t = new Timeslot();
        this.formsettings.dosing_pattern.push(t);
      }
    }

    //validate diluents
    this.ValidateDiluentDose();
    this.ValidatePrnMaxDose();
    if (this.prescription.valid
      && (!rateresult.toString().toLowerCase().startsWith("invalid"))
      && (tsvalidation == null || skipvalidatedosageinterval)
      && this.isdiluentdosevalid
      && this.isPrnMaxDoseValid) {
      this.SubmitPrescription()
    }
    else {
      this.FlagFormErrors();
    }
  }

  FlagFormErrors() {
    for (const field in (<FormGroup>this.prescription.get('posology.interval')).controls) {
      const control = this.prescription.get('posology.interval.' + field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    }
    for (const field in (<FormGroup>this.prescription.get('posology.strength')).controls) {
      const control = this.prescription.get('posology.strength.' + field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    }
    for (const field in this.prescription.controls) {
      const control = this.prescription.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    }
  }

  timechange(e: string, ts: Timeslot, calculateendtimeforlastslot = true) {
    var th = e.split(':');
    ts.hour = +th[0];
    ts.minute = +th[1];
    this.isStandardDosingPatternValid = true;
    if (this.formsettings.isInfusion) {
      var changeindex = this.formsettings.infusion_rate_pattern.findIndex((fts) => { return fts.endtime === ts });
      if (changeindex != -1) {
        var nextindex = ++changeindex;
        if (nextindex != this.formsettings.infusion_rate_pattern.length) {
          var nextts = this.formsettings.infusion_rate_pattern[nextindex].starttime;
          nextts.hour = +th[0];
          nextts.minute = +th[1];
        }
      }
      //bind volumes
      if (this.formsettings.interval_type == IntervalType.variable)
        this.SetVariableInfusionVolumeLabels(calculateendtimeforlastslot);
      else {
        this.prescription.get('infusionduration').updateValueAndValidity({ emitEvent: false, onlySelf: true });
      }
    }
    //clear variable error message
    this.clearVariableErrorMessages();

    this.ResetStartTime();
  }
  timechangeprotocol(e: string, ts: Timeslot) {
    var th = e.split(':');
    ts.hour = +th[0];
    ts.minute = +th[1];
    var changeindex = this.formsettings.protocol_dosing_pattern[0].intervalpattern.findIndex((fts) => { return fts === ts });
    this.formsettings.protocol_dosing_pattern.forEach((p) => {
      p.intervalpattern[changeindex].hour = +th[0];
      p.intervalpattern[changeindex].minute = +th[1];
    });
    this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.formsettings.protocol_dosing_pattern[0].intervalpattern);

    this.ResetStartTime();

    //clear variable error message
    this.clearVariableErrorMessages();
  }

  clearVariableErrorMessages() {
    //clear variable error message
    if (this.variabledoseerror)
      (this.variabledoseerror.nativeElement as HTMLLabelElement).innerHTML = "";

    if (this.protocoldoseerror)
      (this.protocoldoseerror.nativeElement as HTMLLabelElement).innerHTML = "";

    if (this.variableinfusionerror)
      (this.variableinfusionerror.nativeElement as HTMLLabelElement).innerHTML = "";
  }

  ShowInfusionAdjustmentDate(ir?: InfusionRate, isStarttime?: boolean) {
    // var changeindex = this.formsettings.infusion_rate_pattern.findIndex((fts) => { return fts === ir });

    // if (isStarttime && changeindex == 0) {
    //   return true;
    // }
    // else if (isStarttime && changeindex > 0) {
    //   changeindex--;
    //   if (ir.starttime.date && this.formsettings.infusion_rate_pattern[changeindex].endtime)
    //     return ir.starttime.date.dayOfYear() != this.formsettings.infusion_rate_pattern[changeindex].endtime.date.dayOfYear();
    //   else return true;
    // }
    // else if (!isStarttime) {
    //   if (ir.starttime.date && ir.endtime.date)
    //     return ir.starttime.date.dayOfYear() != ir.endtime.date.dayOfYear()
    //   else
    //     return true;
    // }
    var notready = false;
    // this.formsettings.infusion_rate_pattern.forEach(el => {
    //   if (!(el.starttime.date && el.endtime.date))
    //     notready = true;
    // });

    for (var i = 0; i < this.formsettings.infusion_rate_pattern.length; i++) {
      var el = this.formsettings.infusion_rate_pattern[i];
      if (i != this.formsettings.infusion_rate_pattern.length - 1) {
        if (!(el.starttime.date && el.endtime.date))
          notready = true;
      }
    }

    // if (!notready)
    //   return this.GetTotalInfusionDurationHrs();

    if (!notready) {
      if (this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 1].endtime.date)
        return this.formsettings.infusion_rate_pattern[0].starttime.date.dayOfYear() !=
          this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 1].endtime.date.dayOfYear();
      else
        return this.formsettings.infusion_rate_pattern[0].starttime.date.dayOfYear() !=
          this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 2].endtime.date.dayOfYear();
    }
  }

  GetVariableDoseSizeInputText(ts: Timeslot) {
    return ts.dose_size ?? "";
  }
  GetVariableDoseSNInputText(ts: Timeslot) {
    return ts.dose_strength_neumerator ?? "";
  }
  GetVariableDoseSDInputText(ts: Timeslot) {
    return ts.dose_strength_denominator ?? "";
  }
  GetVariableDoseDescInputText(ts: Timeslot) {
    return ts.dose_description ?? "";
  }
  GetVariableInfusionRateInputText(ts: Timeslot) {
    return ts.infusionrate ?? "";
  }
  GetVariableInfusionDoseRateInputText(ts: Timeslot) {
    return ts.infusiondoserate ?? "";
  }
  ShowDurationSizeInputControl() {
    var durationcontrol = this.prescription.get('prescriptionduration');
    if (durationcontrol) {
      const durationid = durationcontrol.value;
      return (!FormSettings.IsNullOrEmpty(durationid)
        &&
        this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
          && x.duration.toLowerCase() != PrescriptionDuration.untilcancelled
          && x.duration.toLowerCase() != PrescriptionDuration.enddate));
    }
  }
  ShowEndDateTimeInputControl() {
    var durationcontrol = this.prescription.get('prescriptionduration');
    if (durationcontrol) {
      const durationid = durationcontrol.value;
      return (!FormSettings.IsNullOrEmpty(durationid)
        &&
        this.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
          && x.duration.toLowerCase() == PrescriptionDuration.enddate))
        && this.formContext != FormContext.moa;
    }
  }

  ShowEndDateTimeLabel() {
    return this.ShowDurationSizeInputControl() && this.prescription.get("enddate").value && this.prescription.get("endtime").value;
  }

  ShowOtherSourceControl() {
    return this.formsettings.sources.find(x => x.source.toLowerCase() == "other")?.selected;
  }

  GenerateFormKeyValues() {
    var formkeyvalues = [];
    this.getAllJsonKeys(this.prescription.getRawValue(), formkeyvalues);
    formkeyvalues.push({ "key": "startdate", "value": this.prescription.get("startdate").value });
    formkeyvalues.push({ "key": "enddate", "value": this.prescription.get("enddate").value });
    formkeyvalues.push({ "key": "protocolenddate", "value": this.prescription.get("posology.protocolenddate").value });
    formkeyvalues.push({ "key": "antimicrobialstartdate", "value": this.prescription.get("antimicrobialstartdate").value });
    formkeyvalues.push({ "key": "totalinfusionvolume", "value": this.GetDoseSolutionQuantity() });
    formkeyvalues.push({ "key": "concentration", "value": this.prescribedConcentration });
    formkeyvalues.push({ "key": "infusiondoserateunits", "value": this.infusionDoseRateUnits });

    this.appService.logToConsole(formkeyvalues);
    if (this.prescription.get('posology.interval.prn').value && this.formsettings.dosing_pattern.length == 0)
      this.GenerateIntervalPattern(1);

    return formkeyvalues;
  }

  SubmitPrescription() {
    this.isFormSaving = true;
    var formkeyvalues = this.GenerateFormKeyValues();
    // // CI, and dose is not entered, use the strength of formulary ingredien of the medicaiton if ther is a single ingredient
    // if (this.formsettings.isInfusion && this.formsettings.infusionType == InfusionType.ci) {
    //   if (this.formsettings.medication.formularyIngredients.length == 1) {
    //     var sn = this.prescription.get("posology.strength.dose_strength_neumerator");
    //     var sd = this.prescription.get("posology.strength.dose_strength_denominator");
    //     var ds = this.prescription.get("posology.strength.dose_size");

    //     if (this.formsettings.dose_type == DoseType.units && (isNaN(+ds) || +ds <= 0)) {
    //       ds.setValue(+this.formsettings.medication.formularyIngredients[0].strengthValueNumerator, { emitEvent: false, onlySelf: true });
    //     }
    //     else
    //       if (this.formsettings.dose_type == DoseType.strength && (isNaN(+sn) || +sn <= 0 || isNaN(+sd) || +sd <= 0)) {
    //         sn.setValue(+this.formsettings.medication.formularyIngredients[0].strengthValueNumerator, { emitEvent: false, onlySelf: true });
    //         sd.setValue(+this.formsettings.medication.formularyIngredients[0].strengthValueDenominator, { emitEvent: false, onlySelf: true });
    //       }
    //   }
    // }


    var p = this.formsettings.GeneratePrescriptionObject(formkeyvalues, (this.clonePrescription == true) ? null : this.editingPrescription);
    this.appService.logToConsole(p);

    //if moa to ip check if there are any changes to dose/route/posology, set modified flag if true
    // if (this.formsettings.moatoip && p.prescriptionstatus_id != modifiedstatusid) {
    // const changed = this.ComparePrescriptions(p, this.editingPrescription);

    // if (changed == false) {
    //   console.log("moa to ip modified");
    //   p.prescriptionstatus_id = modifiedstatusid;
    // }
    // }

    p.prescriptionstatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase().trim() == "active").prescriptionstatus_id;

    if (this.editingPrescription && !this.clonePrescription) {
      const isSame = this.formsettings.ComparePrescriptions(p, this.editingPrescription);
      if (isSame != null)
        p.prescriptionstatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status.toLowerCase().trim() == "modified").prescriptionstatus_id;
    }


    this.subjects.closePform.subscribe(() => {
      this.close_pform.nativeElement.click();
    })
    this.PrescriptionCreated.emit(p);

  }

  CancelPrescription() {
    this.close_pform.nativeElement.click();
    this.Cancel.emit("cancelled");
  }

  public getAllJsonKeys(json: any, result: Array<{}>) {
    for (var key in json) {
      if (json.hasOwnProperty(key)) {
        if (typeof json[key] != "object") {
          this.appService.logToConsole({ "key": key, "value": json[key] });
          result.push({ "key": key, "value": json[key] });
        } else
          this.getAllJsonKeys(json[key], result);
      }
    }
  }

  OxygenAdditionalInfoChanged(e, info) {
    var checked = e.target.checked;
    if (checked)
      info.isChecked = true;
    else
      info.isChecked = false;
  }

  RouteChanged(e, rt: Route) {
    if (rt.route.toLowerCase() == "inhalation")  //if there are more than one routes, this is required to set doseunits to l/min if dosetype is na or continuous
    {
      this.formsettings.SetDoseType("inhalation");
    }

    this.formsettings.SetPrimaryDiscretionaryRoute(e, rt);
    this.prescription.get('routes').updateValueAndValidity();
    this.prescription.get('routes').markAsTouched({ onlySelf: true });
    this.ToggleInfusion(); //show infustion related controls
    this.customRouteSelectedModel = "";
    this.RemoveLinkedInfusion();

    //set infusion type to ci by default if its titrated infusion
    //or if any inhaltion route with l/min  (for oxygen or any inhaled gas)
    if ((this.prescription.get("titration").value && this.formsettings.isInfusion) || this.IsInhalationRouteAsCI()) {
      this.SetObjectiveFormValue("infusiontype", InfusionType.ci);
    }
  }

  IndicationChanged(i: string) {
    this.formsettings.indications.forEach(element => {
      element.selected = i == element.code ? true : false;
    });
  }

  ResetChosenDaysOfWeek() {
    this.formsettings.daysofweek.forEach(d => {
      d.isChecked = false;
    });
    this.checkedDaysOfWeekCount = [];
  }

  ResetChosenDaysToSkip() {
    this.prescription.get("dosingdaysfrequency").setValue("days");
    this.prescription.get("dosingdaysfrequencysize").setValue("");
  }

  DaysOfWeekChanged(e, d: CheckboxControl) {
    if (e.target.checked) {
      d.isChecked = true;
    }
    else d.isChecked = false;

    this.checkedDaysOfWeekCount = this.formsettings.daysofweek.filter(d => d.isChecked);
  }

  IsLiquid() {
    var isliquid = false;
    if (this.formsettings.dose_type == DoseType.strength) {
      if (this.formsettings.dose_strength_denominator_units.toLowerCase() == "ml" || this.formsettings.dose_strength_neumerator_units.toLowerCase() == "ml"
        || this.formsettings.dose_strength_denominator_units.toLowerCase() == "litre" || this.formsettings.dose_strength_neumerator_units.toLowerCase() == "litre")
        isliquid = true;
    }
    else if (this.formsettings.dose_type == DoseType.units)
      if (this.formsettings.dose_units.toLowerCase() == "ml" || this.formsettings.dose_units.toLowerCase() == "litre")
        isliquid = true;

    this.formsettings.diluents.forEach(d => {
      if (d.fs.dose_type == DoseType.strength) {
        if (d.fs.dose_strength_denominator_units.toLowerCase() == "ml" || d.fs.dose_strength_neumerator_units.toLowerCase() == "ml" ||
          d.fs.dose_strength_denominator_units.toLowerCase() == "litre" || d.fs.dose_strength_neumerator_units.toLowerCase() == "litre")
          isliquid = true;
      }
      else if (d.fs.dose_type == DoseType.units)
        if (d.fs.dose_units.toLowerCase() == "ml" || d.fs.dose_units.toLowerCase() == "litre")
          isliquid = true;
    });

    return isliquid;
  }

  IsIVRoute() {
    var primaryroute = this.formsettings.routes.find(x => x.isPrimary == true);
    if (primaryroute) {
      var rtlowercase = primaryroute.route.toLowerCase()
      return this.infusionroutes.filter(x => x.toLowerCase() == rtlowercase).length != 0;
    }
    return false;
  }

  AreAllIVRoutes() {
    let result = true;
    this.formsettings.routes.forEach(r => {
      var rtlowercase = r.route.toLowerCase()
      if (result != false && r.isChecked && this.infusionroutes.filter(x => x.toLowerCase() == rtlowercase).length == 0) {
        result = false;
      }
    });
    return result;
  }

  IsOnlyIVRoute() {
    return (this.IsIVRoute() && !(this.formsettings.routes.filter(x => x.isChecked == true).length > 1))
  }
  IsInhalationRouteAsCI() {
    var primaryroute = this.formsettings.routes.find(x => x.isPrimary == true);
    if (primaryroute && this.formsettings.dose_units) {
      var rtlowercase = primaryroute.route.toLowerCase()
      return rtlowercase.includes("inhalation") && this.formsettings.dose_units.toLowerCase() == "l/min"
    }
    return false;
  }

  SetVTMStylePrescribing() {
    let tempvtmstyle = this.formsettings.vtmstyle;
    let doseform = this.formsettings.medication.detail.doseFormCd;
    if (this.formsettings.isPrimaryRouteIV
      && !this.formsettings.isInfusion
      && this.AreAllIVRoutes() && doseform == DoseForm.Discrete
      && !this.formsettings.IsBasicFluid()
      && this.formsettings.dose_type != DoseType.descriptive)
    // && this.medication.productType.toLocaleLowerCase() != 'vtm') 
    {
      this.formsettings.vtmstyle = true;
    }
    else {
      this.formsettings.vtmstyle = false;
    }

    if (tempvtmstyle != this.formsettings.vtmstyle) {
      this.formsettings.SetDoseType();
      if (this.formsettings.vtmstyle || this.medication.productType.toLocaleLowerCase() == 'vtm') {
        this.formsettings.GetMostFrequentVTMUnit(this.medication.code, this.prescription, () => { });
      }
      this.ResetStandardDose();
      this.ClearVariable();
      this.ClearFrequency();
    }
  }

  ToggleInfusion(resetdose = false) {
    var primaryroute = this.formsettings.routes.find(x => x.isPrimary == true);
    if (primaryroute) {
      this.formsettings.isPrimaryRouteIV = this.IsIVRoute();
      if (this.formsettings.infusionType == InfusionType.ci ||
        this.formsettings.infusionType == InfusionType.bolus ||
        this.formsettings.infusionType == InfusionType.rate ||
        this.formsettings.infusionType == InfusionType.pca) {
        this.formsettings.isInfusion = true;
      }
      else {
        this.formsettings.isInfusion = false;
      }
      this.SetVTMStylePrescribing();
    }
    else {
      this.formsettings.isPrimaryRouteIV = false;
      if (this.formsettings.isInfusion) {
        this.formsettings.isInfusion = false;
        this.ClearInfusionType();
      }
      else
        this.SetVTMStylePrescribing();
    }
  }

  ClearInfusionType(infusiontype = null) {
    if (!infusiontype || (infusiontype && this.formsettings.infusionType == infusiontype)) {
      this.formsettings.infusionType = null;
      this.prescription.get('infusiontype').reset();
      this.formsettings.isInfusion = false;
    }
  }

  ClearFrequency() {
    this.prescription.get('posology.interval.frequency').setValue("");
    // this.prescription.get('posology.interval.frequency').updateValueAndValidity();
  }

  OpenChosenDaysForm() {
    if (this.prescription.get('posology.interval.frequency').value === FrequencyType.stat) {
      return;
    }
    this.temp_weekdays = []
    this.formsettings.daysofweek.forEach(d => {
      var tc = new CheckboxControl();
      tc.isChecked = d.isChecked;
      tc.name = d.name;
      tc.value = d.value;
      this.temp_weekdays.push(tc);
    });

    this.temp_dosingdaysfrequency = this.prescription.get("dosingdaysfrequency").value;
    this.temp_dosingdaysfrequencysize = this.prescription.get("dosingdaysfrequencysize").value;
    this.temp_chosendaysoption = this.prescription.get("chosendays").value;
    //backup current chosen days
    this.iseditingchosendays = true;
  }

  OpenAdditionalConditionsForm() {
    // if (this.prescription.get('posology.interval.frequency').value === FrequencyType.stat) {
    //   return;
    // }
    this.temp_additionalconditions = this.prescription.get("additionalconditions").value;
    this.temp_reminderhours = this.prescription.get("reminderhours").value;
    this.temp_remindernotes = this.prescription.get("remindernotes").value;
    this.iseditingadditionalconditions = true;
  }

  OpenVariableForm() {
    //backup current dosage pattern incase cancelled
    this.SetObjectiveFormValue("posology.strength.calculatorinput", "");
    this.SetObjectiveFormValue("posology.strength.totalstrength", "")
    if (this.formsettings.interval_type == IntervalType.variable) {
      //open form
      //this.openvariablemodal.nativeElement.click();
      this.temp_dosing_pattern = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
      this.tempfrequency = this.prescription.get('posology.interval.times_hours').value;
      this.temptimes_hours = this.prescription.get('posology.interval.frequency').value;
      this.iseditingvariable = true;
      this.iseditingprotocol = false;

    }
    else if (this.formsettings.interval_type == IntervalType.protocol) {

      this.temp_protocol_dosing_pattern = [];
      this.formsettings.protocol_dosing_pattern.forEach((p) => {
        var pi = new ProtocolInterval();
        pi.date = p.date.clone();
        pi.intervalpattern = this.formsettings.CloneDosingPattern(p.intervalpattern);
        this.temp_protocol_dosing_pattern.push(pi);
      })
      this.tempfrequency = this.prescription.get('posology.interval.times_hours').value;
      this.temptimes_hours = this.prescription.get('posology.interval.frequency').value;
      this.temp_protocolenddate = this.prescription.get('posology.protocolenddate').value;
      this.temp_protocolrepeattimes = this.prescription.get('posology.protocolrepeattimes').value;
      this.temp_repeatprotocol = this.prescription.get('posology.repeatprotocol').value;
      this.temp_repeatprotocolsub = this.prescription.get('posology.repeatprotocolsub').value;


      this.GenerateProtocolHTMLBinder();

      this.iseditingprotocol = true;
      this.iseditingvariable = false;
    }
    else {
      this.prescription.get('posology.interval.prn').setValue(false);
      this.temp_standard_dosing_pattern = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
      this.tempfrequency = this.prescription.get('posology.interval.times_hours').value;
      this.temptimes_hours = this.prescription.get('posology.interval.frequency').value;
      this.formsettings.dosing_pattern = [];
      this.formsettings.protocol_dosing_pattern = [];

      this.formsettings.interval_type = IntervalType.variable;
      //open form
      //this.openvariablemodal.nativeElement.click()
      this.iseditingvariable = true;
      this.prescription.get('posology.interval.times_hours').setValue("x");
      // this.prescription.get('posology.interval.times_hours').updateValueAndValidity();
      this.prescription.get('posology.interval.frequency').setValue("4");
      // this.prescription.get('posology.interval.frequency').updateValueAndValidity();
    }

    // this.ResetStandardDose();
  }

  OpenVariableInfusionForm() {
    this.temp_infusion_rate_pattern = [];
    this.temp_dosing_pattern = [];
    if (this.formsettings.interval_type == IntervalType.variable) {
      this.formsettings.infusion_rate_pattern.forEach((p) => {
        var ir = new InfusionRate(new Timeslot(), new Timeslot());
        ir.starttime = this.formsettings.CloneDosingPattern([p.starttime])[0];
        ir.endtime = this.formsettings.CloneDosingPattern([p.endtime])[0];
        this.temp_infusion_rate_pattern.push(ir);
      });
      this.temp_dosing_pattern = this.formsettings.CloneDosingPattern(this.formsettings.dosing_pattern);
    }
    else {
      //initiate
      this.formsettings.interval_type = IntervalType.variable;
      //this.ClearFrequency();

      this.prescription.get('posology.interval.customfrequency').updateValueAndValidity({ emitEvent: false });

      this.prescription.get("starttime").updateValueAndValidity({ emitEvent: false, onlySelf: true });


      this.formsettings.infusion_rate_pattern = [];
      for (var i = 0; i < 2; i++) {

        var ir = new InfusionRate(new Timeslot(), new Timeslot());
        var st = this.prescription.get("starttime").value;
        if (i == 0 && FormSettings.IsValidTimeSlotString(st) && this.formsettings.linkedinfusionid && (this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca)) {
          ir.starttime = new Timeslot(+st.split(':')[0], +st.split(':')[1]);
        }

        this.formsettings.infusion_rate_pattern.push(ir);
      }
    }

    this.prescription.get('posology.interval.prn').setValue(false, { emitEvent: false, onlySelf: true });
    this.iseditinginfusionvariable = true;
    this.ResetInfusionRateDuration();

    //bind volumes
    this.SetVariableInfusionVolumeLabels(false);
  }

  VtmUnitsChanged() {
    if (this.formsettings.interval_type == IntervalType.standard) {
      this.ResetStandardDose();
      this.ResetInfusionRateDuration();
    }
    else {
      this.formsettings.dosing_pattern.forEach(d => {
        d.dose_size = undefined;
        d.dose_description = undefined;
        d.dose_strength_denominator = undefined;
        d.dose_strength_neumerator = undefined;
      });
      this.formsettings.protocol_dosing_pattern.forEach(i => {
        i.intervalpattern.forEach(d => {
          d.dose_size = undefined;
          d.dose_description = undefined;
          d.dose_strength_denominator = undefined;
          d.dose_strength_neumerator = undefined;
        })
      })
      if (this.formsettings.isInfusion)
        this.ClearVariable();
    }
  }

  ResetStandardDose() {
    this.prescription.get('posology.strength.dose_size').reset();
    this.prescription.get('posology.strength.dose_strength_neumerator').reset();
    this.prescription.get('posology.strength.dose_strength_denominator').reset();
    this.prescription.get('posology.strength.dose_description').reset();

    //reset calculators
    this.prescription.get('posology.strength.calculatorinput').reset();
    this.prescription.get('posology.strength.totalstrength').reset();
    this.isDoseSizeRange = false;

    this.ValidateDose();
  }

  ClearVariable() {
    this.SetObjectiveFormValue("posology.strength.totalstrength", "")

    this.formsettings.dosing_pattern = [];
    this.formsettings.protocol_dosing_pattern = [];
    this.formsettings.interval_type = IntervalType.standard;

    this.formsettings.infusion_rate_pattern = []

    if (this.appService.isTCI)
      this.prescription.get('startdate').setValue(this.minStartDate);
    else
      this.prescription.get('startdate').setValue(new Date());
    this.prescription.get('startdate').enable();
    this.prescription.get('startdate').updateValueAndValidity();

    this.prescription.get('prescriptionduration').enable();
    this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
    this.prescription.get('prescriptionduration').updateValueAndValidity();

    this.prescription.get('enddate').reset();
    this.prescription.get('enddate').enable();
    this.prescription.get('enddate').updateValueAndValidity();

    this.prescription.get('endtime').reset();
    this.prescription.get('endtime').enable();
    this.prescription.get('endtime').updateValueAndValidity();

    this.ResetStartTime();
    this.prescription.get('starttime').enable();
    this.prescription.get('starttime').updateValueAndValidity();

    this.prescription.get('endtime').enable();
    this.prescription.get('endtime').updateValueAndValidity();

    this.durations = [];
    Object.assign(this.durations, this.appService.MetaPrescriptionDuration);

    this.SetModDurations();
    this.ResetInfusionRateDuration();

    this.prescription.get('posology.protocolenddate').reset();
    this.prescription.get('posology.protocolrepeattimes').reset();
    this.prescription.get('posology.repeatprotocol').reset();
    this.prescription.get('posology.repeatprotocolsub').reset();


    //if protocol form has disabled duration, turn back visibility if form context is not moa
    if (this.formContext != FormContext.moa)
      this.showDuration = true;
  }

  VariableInfusionSequenceGeneratorValidator(startdate: moment.Moment, ir: Array<InfusionRate>, ignoreSequennceValidation = false) {
    startdate.set("hour", 0);
    startdate.set("minute", 0);
    startdate.set("second", 0);
    if (ir.length != 0) {
      if (!ignoreSequennceValidation) {
        for (var i = 1; i < ir.length; i++) {
          if (ir[i].starttime.GetFormatString() != ir[i - 1].endtime.GetFormatString())
            return "invalid_sequence";
        }

        if (!FormSettings.IsValidTimeSlotString(ir[i - 1].endtime.GetFormatString()))
          if (this.formsettings.infusionType == InfusionType.rate ||
            ((this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca) && this.prescription.get('civariableuntilcancelled').value == false))
            return "invalid_sequence";
      }


      //generate sequence dates
      //first interval start date
      var startdt = FormSettings.GetMomentForDateAndTimeslot(startdate, ir[0].starttime);
      ir[0].starttime.date = startdt;
      //subsequent intervals except last interval end date
      for (i = 1; i < ir.length; i++) {
        var nextdt = FormSettings.GetMomentForDateAndTimeslot(ir[i - 1].starttime.date, ir[i].starttime);
        if (!nextdt.isAfter(ir[i - 1].starttime.date))
          nextdt = FormSettings.GetMomentForDateAndTimeslot(nextdt.add(1, "day"), ir[i].starttime);
        ir[i - 1].endtime.date = nextdt;
        ir[i].starttime.date = nextdt;
      }
      //last interval end date
      i--;

      if (FormSettings.IsValidTimeSlotString(ir[i].endtime.GetFormatString())) {
        var enddt = FormSettings.GetMomentForDateAndTimeslot(ir[i].starttime.date, ir[i].endtime);
        if (!enddt.isAfter(ir[i].starttime.date))
          enddt = FormSettings.GetMomentForDateAndTimeslot(enddt.add(1, "day"), ir[i].endtime);
        ir[i].endtime.date = enddt;
      }
      else {
        ir[i].endtime.date = null;

      }
    }
    return null;
  }

  ShowUntilCancelledCheckBox(ir: InfusionRate) {
    if ((this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca) && this.formsettings.interval_type == IntervalType.variable) {
      var index = this.formsettings.infusion_rate_pattern.findIndex((fir) => { return fir === ir });

      return (index == this.formsettings.infusion_rate_pattern.length - 1)
    }
    else
      return false;
  }
  ToggleCIVariableUntilCancelled(ts: Timeslot) {
    ts.hour = undefined;
    ts.minute = undefined;
  }

  SaveVariableInfusionEdit() {
    var message = "";
    var startdt = this.prescription.get("startdate").value;
    var sequenceresult = this.VariableInfusionSequenceGeneratorValidator(moment(startdt), this.formsettings.infusion_rate_pattern);

    if (sequenceresult === null) {
      var doseresult = this.VariableInfusionValidator();

      if (doseresult === null) {

        var rateresult;
        if (this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca)
          rateresult = "";
        else
          rateresult = this.GetVariableInfusionTotalPrescribedVolume(true);


        if (!rateresult.toString().toLowerCase().startsWith("invalid")) {


          this.temp_infusion_rate_pattern = [];
          this.iseditinginfusionvariable = false;


          var start = this.formsettings.infusion_rate_pattern[0];
          this.formsettings.dosing_pattern = [];
          this.formsettings.dosing_pattern.push(start.starttime)
          var fs = start.starttime.GetFormatString();
          this.prescription.get('starttime').setValue(fs);
          //this.prescription.get('starttime').disable();

          //if(ci and until cancelled)
          // Enddate = until cancelled
          if ((this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca) &&
            this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 1].endtime.date == null) {
            this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
            this.prescription.get('prescriptionduration').disable();

            this.prescription.get('endtime').reset();
            this.prescription.get('endtime').reset();
          }
          // if(duration >24 hours)
          // Enddate = enddate
          else if (this.formsettings.interval_type == IntervalType.variable && this.GetTotalInfusionDurationHrs() > 24) {
            this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
            this.prescription.get('prescriptionduration').disable();

            var last = this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 1];
            this.prescription.get('enddate').setValue(<Date>last.endtime.date.toDate());
            this.prescription.get('enddate').disable();

            var fs = last.endtime.GetFormatString();
            this.prescription.get('endtime').setValue(fs);
            this.prescription.get('endtime').disable();
          }
          // if(duration < 24 hours)
          // Enddate = select end date, until cancelled, no of days, weeks,
          else if (this.formsettings.interval_type == IntervalType.variable && this.GetTotalInfusionDurationHrs() <= 24) {

            // this.durations = [];
            // Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
            // var i = this.durations.findIndex(x => x.duration.toLowerCase().startsWith("hour"));
            // this.durations.splice(i, 1);

            // this.prescription.get('prescriptionduration').enable();
            // this.prescription.get('enddate').enable();
            // this.prescription.get('endtime').enable();

            this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
            this.prescription.get('prescriptionduration').disable();

            var last = this.formsettings.infusion_rate_pattern[this.formsettings.infusion_rate_pattern.length - 1];
            this.prescription.get('enddate').setValue(<Date>last.endtime.date.toDate());
            this.prescription.get('enddate').disable();

            var fs = last.endtime.GetFormatString();
            this.prescription.get('endtime').setValue(fs);
            this.prescription.get('endtime').disable();


          }

          else {
            this.ClearVariable();
          }
        }
        else {
          message = this.GetErrorMesageFromCode(rateresult.toString());
        }
      }
      else {
        message = this.GetErrorMesageFromCode(doseresult);
      }
    }
    else {
      message = this.GetErrorMesageFromCode(sequenceresult);
    }
    if (this.variableinfusionerror)
      (this.variableinfusionerror.nativeElement as HTMLLabelElement).innerHTML = message;
  }

  GetTotalInfusionDurationHrs() {
    var duration = 0;
    this.formsettings.infusion_rate_pattern.forEach(ir => {
      duration += ir.endtime.date.diff(ir.starttime.date, "hours");
    });
    return duration;
  }

  SaveChosenDaysEdit() {
    var validatiornesult = this.ChosenDaysValidator();
    var message = "";
    if (validatiornesult === null) {
      this.temp_weekdays = [];
      this.temp_dosingdaysfrequencysize = null;
      this.temp_dosingdaysfrequency = "days";
      this.iseditingchosendays = false;
      this.temp_chosendaysoption = "";
      this.FirstAdministrationMessage();
      if (this.formContext == FormContext.mod || this.formContext == FormContext.op)
        this.SetTotalQuantity();
    }
    else {
      message = this.GetErrorMesageFromCode(validatiornesult);
    }
    (this.chosendayserror.nativeElement as HTMLLabelElement).innerHTML = message;
  }

  SaveAdditionalConditionsEdit() {
    let reminderhours = this.prescription.get("reminderhours").value;
    let remindernotes = this.prescription.get("remindernotes").value;
    let maxlen = this.appService.appConfig.AppSettings.reminderTextMaxLenth;
    if (isNaN(maxlen) || +maxlen <= 0) {
      maxlen = 256;
    }
    (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "";

    if (!FormSettings.IsNullOrEmpty(reminderhours) && (isNaN(+reminderhours) || +reminderhours == 0)) {
      (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "Please enter a non zero value for \"hours after first administration\"";
    }
    else if (+reminderhours > 168) {
      (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "Please enter a value less than 168 for \"hours after first administration\"";

    }
    else if (!FormSettings.IsNullOrEmpty(reminderhours) && FormSettings.IsNullOrEmpty(remindernotes)) {
      (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "Please enter a reminder text";
    }
    else if (!FormSettings.IsNullOrEmpty(remindernotes) && FormSettings.IsNullOrEmpty(reminderhours)) {
      (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "Please enter a value for \"hours after first administration\"";
    }
    else if (remindernotes.length > maxlen) {
      (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "Please enter less than " + maxlen + " characters for reminder text";

    }
    else {
      this.temp_additionalconditions = "";
      this.temp_reminderhours = null;
      this.temp_remindernotes = "";
      this.iseditingadditionalconditions = false;
    }
  }

  SaveVariableEdit() {
    var validatiornesult = this.VariableValidator();
    var message = "";
    if (validatiornesult === null) {
      this.temp_dosing_pattern = [];
      this.iseditingvariable = false;
      this.ResetStandardDose();
    }
    else {
      message = this.GetErrorMesageFromCode(validatiornesult);
    }
    if (this.variabledoseerror)
      (this.variabledoseerror.nativeElement as HTMLLabelElement).innerHTML = message;

    this.DoseCalculations();

  }

  SaveProtocolEdit() {
    var validatiornesult = this.ProtocolValidator();
    var message = "";
    if (validatiornesult === null) {
      this.temp_protocol_dosing_pattern = [];
      this.iseditingprotocol = false;
      this.iseditingvariable = false;
      this.ResetStandardDose();
      //clone first day interval pattern to standard type dosing_pattern to drive prescription start time
      this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.formsettings.protocol_dosing_pattern[0].intervalpattern);
      this.prescription.get('startdate').setValue(this.formsettings.protocol_dosing_pattern[0].date.toDate());
      // this.prescription.get('startdate').disable();
      //if repeat protocol last day is set with an end date, set prescription end date to this day and disable control
      var protocolenddate = this.prescription.get('posology.protocolenddate').value;
      var repeatprotocol = this.prescription.get('posology.repeatprotocol').value;
      var repeatprotocolsub = this.prescription.get('posology.repeatprotocolsub').value;


      //reset chosen days
      this.SetObjectiveFormValue("chosendays", "all");
      this.prescription.get('starttime').disable();

      //if no repeat is chosen, show the end date in a non editable format
      if (repeatprotocol == "none") {
        //enable start date as it might have been disabled if lastday and enddate were ever chosen
        this.prescription.get('startdate').enable();
        this.SetProtocolEndDate();
      }
      //if repeat is last day until end date show the end date in a non editable format and start date disabled
      else
        if (repeatprotocol == "lastday" && repeatprotocolsub == "enddate") {
          this.showDuration = true;

          //this.prescription.get('startdate').disable();
          this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
          this.prescription.get('prescriptionduration').disable();

          this.prescription.get('enddate').setValue(<Date>protocolenddate);
          this.prescription.get('enddate').disable();


          var i = this.formsettings.protocol_dosing_pattern[0].intervalpattern;
          var fs = i[i.length - 1].GetFormatString();
          this.prescription.get('endtime').setValue(fs);
          this.prescription.get('endtime').disable();
        }
        // if repeat full protocol or last day until cancelled is chosen hide duration and end date controls
        else {
          // this.prescription.get('startdate').setValue(new Date());
          this.prescription.get('startdate').enable();
          // this.prescription.get('startdate').updateValueAndValidity();
          if (repeatprotocol == "lastday") {
            this.showDuration = false;

            this.prescription.get('prescriptionduration').enable();
            this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
            this.prescription.get('prescriptionduration').updateValueAndValidity();

            this.prescription.get('enddate').reset();
            this.prescription.get('enddate').enable();
            this.prescription.get('enddate').updateValueAndValidity();

            this.prescription.get('enddate').reset();
            this.prescription.get('endtime').enable();
            this.prescription.get('endtime').updateValueAndValidity();
          }
          else {
            this.SetProtocolEndDate(repeatprotocol);
          }
        }
    } else {
      message = this.GetErrorMesageFromCode(validatiornesult);
    }
    if (this.protocoldoseerror)
      (this.protocoldoseerror.nativeElement as HTMLLabelElement).innerHTML = message;
  }

  SetProtocolEndDate(repeatprotocol = null) {
    if (this.formContext != FormContext.moa)
      this.showDuration = true;

    this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id);
    this.prescription.get('prescriptionduration').disable();
    const len = this.formsettings.protocol_dosing_pattern.length;
    let enddate = this.formsettings.protocol_dosing_pattern[len - 1].date.clone();
    var ts = this.formsettings.protocol_dosing_pattern[len - 1].intervalpattern;
    var fs = ts[ts.length - 1].GetFormatString();

    if ((repeatprotocol == "protocol")) {
      let repeattimes = this.prescription.get("posology.protocolrepeattimes").value;
      repeattimes = repeattimes * this.formsettings.protocol_dosing_pattern.length;
      enddate.add(repeattimes, "d");
    }

    this.prescription.get('enddate').setValue(enddate.toDate());
    this.prescription.get('enddate').disable();

    this.prescription.get('endtime').setValue(fs);
    this.prescription.get('endtime').disable();
  }

  ShowInfusionForLinking(p: Prescription) {
    var editingprescriptionid = "";
    if (this.editingPrescription) {
      editingprescriptionid = this.editingPrescription.prescription_id;
    }
    return (
      p.isinfusion
      &&
      (p.__posology[0].infusiontypeid == InfusionType.ci || p.__posology[0].infusiontypeid == InfusionType.pca)
      &&
      p.__medications.find(x => x.isprimary).form
      &&
      p.__medications.find(x => x.isprimary).form.toLowerCase() != 'inhalation gas'
      &&
      p.__posology[0].prescriptionduration != this.appService.MetaPrescriptionDuration
        .find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled)
        .prescriptionduration_id
      &&
      this.appService.InfusionEvents
        .filter(x => x.posology_id == p.__posology[0].posology_id && (x.eventtype == "endinfusion")).length == 0
      &&
      p.prescription_id != editingprescriptionid
    )
  }

  StartLinkedInfusionSelection() {
    this.iseditinglinkedinfusion = true;
  }

  RemoveLinkedInfusion() {
    if (this.formsettings.linkedinfusionid) {
      this.formsettings.linkedinfusionid = null;
      this.linkedinfusionmedicationname = null;

      //reset start date and end dates
      this.prescription.get("startdate").reset();
      this.prescription.get("starttime").reset();
      this.prescription.get("startdate").setValue(new Date());

      this.prescription.get("startdate").enable();
      this.prescription.get("starttime").enable();

      this.prescription.get("enddate").reset();
      this.prescription.get("endtime").reset();

      this.durations = [];
      Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
      this.prescription.get('prescriptionduration').reset();
      this.prescription.get('prescriptiondurationsize').reset();
      this.SetModDurations();

      this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);

    }
  }

  ResetPrescriptionDuration() {

  }

  CancelLinkedInfusionSelection() {
    this.iseditinglinkedinfusion = false;
  }

  SelectLinkedInfusion(p: Prescription, isPrepopulating = false) {
    this.formsettings.linkedinfusionid = p.prescription_id;
    this.linkedinfusionmedicationname = p.__medications.find(x => x.isprimary).name + ", " + moment(p.__posology[0].prescriptionstartdate).format("DD-MMM-YYYY HH:mm");
    this.iseditinglinkedinfusion = false;

    //set start date to end date of selected prescription
    this.SetObjectiveFormValue("startdate", moment(p.__posology[0].prescriptionenddate).toDate());
    this.SetObjectiveFormValue("starttime", moment(p.__posology[0].prescriptionenddate).format("HH:mm"));

    this.prescription.get("startdate").disable();
    this.prescription.get("starttime").disable();

    if (!isPrepopulating) {
      this.prescription.get("enddate").reset();
      this.prescription.get("endtime").reset();


      this.durations = [];
      Object.assign(this.durations, this.appService.MetaPrescriptionDuration);
      var i = this.durations.findIndex(x => x.duration.toLowerCase() == PrescriptionDuration.enddate);
      this.durations.splice(i, 1);
      this.prescription.get('prescriptiondurationsize').reset();

      if (this.prescription.get('prescriptionduration').value == this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.enddate).prescriptionduration_id) {
        this.prescription.get('prescriptionduration').setValue(this.appService.MetaPrescriptionDuration.find(x => x.duration.toLowerCase() == PrescriptionDuration.untilcancelled).prescriptionduration_id);
      }
    }
  }

  CancelVariableInfusionEdit() {
    this.iseditinginfusionvariable = false;
    this.formsettings.infusion_rate_pattern = [];

    if (this.temp_infusion_rate_pattern.length == 0) {
      this.formsettings.interval_type = IntervalType.standard;
      this.formsettings.dosing_pattern = [];
      this.formsettings.infusion_rate_pattern = [];
    }
    else {
      this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.temp_dosing_pattern);
      this.temp_dosing_pattern = [];

      this.temp_infusion_rate_pattern.forEach((p) => {
        var ir = new InfusionRate(new Timeslot(), new Timeslot());
        ir.starttime = this.formsettings.CloneDosingPattern([p.starttime])[0];
        ir.endtime = this.formsettings.CloneDosingPattern([p.endtime])[0];
        this.formsettings.infusion_rate_pattern.push(ir);
      });
    }
    if (this.variableinfusionerror)
      (this.variableinfusionerror.nativeElement as HTMLLabelElement).innerHTML = "";
  }
  CancelVariableEdit() {
    this.SetObjectiveFormValue("posology.strength.calculatorinput", "");

    //this.closevariablemodal.nativeElement.click();
    //restore backed up dosing pattern
    this.iseditingvariable = false;

    if (this.temp_dosing_pattern.length == 0) {
      this.formsettings.interval_type = IntervalType.standard;
      // this.formsettings.dosing_pattern = [];
      this.prescription.get('posology.interval.times_hours').setValue(this.tempfrequency);
      this.prescription.get('posology.interval.frequency').setValue(this.temptimes_hours);
      this.tempfrequency = "";
      this.temptimes_hours = "";

      this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.temp_standard_dosing_pattern);
      this.temp_standard_dosing_pattern = [];

      this.StrengthToUnitDose(null, true, this.formsettings);
      this.Calculator_DosePerKgM2('1', null, this.formsettings);


    }
    else {
      this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.temp_dosing_pattern);
      this.temp_dosing_pattern = [];
    }


    this.DoseCalculations();

  }

  CancelProtocolEdit() {
    this.SetObjectiveFormValue("posology.strength.calculatorinput", "");

    //this.closevariablemodal.nativeElement.click();
    //restore backed up protocol dosing pattern
    this.formsettings.protocol_dosing_pattern = [];

    if (this.temp_protocol_dosing_pattern.length == 0) {
      if (this.temp_dosing_pattern.length == 0) {
        this.formsettings.interval_type = IntervalType.standard;
        // this.formsettings.dosing_pattern = [];

        this.prescription.get('posology.interval.times_hours').setValue(this.tempfrequency);
        this.prescription.get('posology.interval.frequency').setValue(this.temptimes_hours);
        this.tempfrequency = "";
        this.temptimes_hours = "";

        this.formsettings.dosing_pattern = this.formsettings.CloneDosingPattern(this.temp_standard_dosing_pattern);


        this.StrengthToUnitDose(null, true, this.formsettings);
        this.Calculator_DosePerKgM2('1', null, this.formsettings);
        this.FixDecimalPlaces(['posology.strength.dose_size', 'posology.strength.totalstrength', 'posology.strength.calculatorinput']);

        // this.prescription.get('posology.interval.times_hours').setValue("x");
        // this.prescription.get('posology.interval.frequency').setValue("4");
      }
      else {
        this.formsettings.interval_type = IntervalType.variable;
        this.CancelVariableEdit();
      }

      //no more a protocol prescription
      this.prescription.get('posology.protocolenddate').reset();
      this.prescription.get('posology.protocolrepeattimes').reset();
      this.prescription.get('posology.repeatprotocol').reset();
      this.prescription.get('posology.repeatprotocolsub').reset();

      this.prescription.get('prescriptionduration').enable();
      this.prescription.get('endtime').setValue("");

    }
    else {
      this.temp_protocol_dosing_pattern.forEach((p) => {
        var pi = new ProtocolInterval();
        pi.date = p.date.clone();
        pi.intervalpattern = this.formsettings.CloneDosingPattern(p.intervalpattern);
        this.formsettings.protocol_dosing_pattern.push(pi);
      })

      this.prescription.get('posology.protocolenddate').setValue(this.temp_protocolenddate);
      this.prescription.get('posology.protocolrepeattimes').setValue(this.temp_protocolrepeattimes);
      this.prescription.get('posology.repeatprotocol').setValue(this.temp_repeatprotocol);
      this.prescription.get('posology.repeatprotocolsub').setValue(this.temp_repeatprotocolsub);
    }


    this.temp_standard_dosing_pattern = [];
    this.temp_protocol_dosing_pattern = [];
    this.temp_protocolenddate = "";
    this.temp_protocolrepeattimes = "";
    this.temp_repeatprotocol = "none";
    this.temp_repeatprotocolsub = "enddate";
    this.iseditingprotocol = false;

  }

  CancelChosenDaysEdit() {
    this.formsettings.daysofweek = [];
    this.temp_weekdays.forEach(d => {
      var tc = new CheckboxControl();
      tc.isChecked = d.isChecked;
      tc.name = d.name;
      tc.value = d.value;
      this.formsettings.daysofweek.push(tc);
    });
    this.prescription.get("dosingdaysfrequency").setValue(this.temp_dosingdaysfrequency);
    this.prescription.get("dosingdaysfrequencysize").setValue(this.temp_dosingdaysfrequencysize);
    this.prescription.get("chosendays").setValue(this.temp_chosendaysoption);

    this.temp_dosingdaysfrequency = "days";
    this.temp_dosingdaysfrequencysize = null;
    this.temp_weekdays = [];
    this.temp_chosendaysoption = "";
    this.iseditingchosendays = false;


  }

  CancelAdditionalConditionsEdit() {

    this.prescription.get("additionalconditions").setValue(this.temp_additionalconditions);
    this.prescription.get("remindernotes").setValue(this.temp_remindernotes);
    this.prescription.get("reminderhours").setValue(this.temp_reminderhours);

    (this.acerror.nativeElement as HTMLLabelElement).innerHTML = "";
    this.temp_remindernotes = "";
    this.temp_reminderhours = null;
    this.temp_additionalconditions = "";
    this.iseditingadditionalconditions = false;
  }


  GetErrorMesageFromCode(errorcode: string) {
    var message = ""
    switch (errorcode) {
      case "invalid_dose": { message = "Please enter a valid dose for all the intervals" }
        break;
      case "invalid_timeslot": { message = "Please select a valid time for all the intervals. <i>(click on a timeslot to select time)</i>" }
        break;
      case "invalid_notimeslot": { message = "Please select a frequency or add at least one interval" }
        break;
      case "invalid_sequence": { message = "Please check the interval sequence, it appears that the interval times are not in sequence" }
        break;
      case "invalid_enddate": { message = "Please select an end date to repeat last day" }
        break;
      case "invalid_repeattimes": { message = "Please enter a valid number to repeat protocol" }
        break;
      case "invalid_infusionrate": { message = "Please check the interval lengths, it appears that total dose is administered before the last interval" }
        break;
      case "invalid_prescribedvolume": { message = "Total volume not prescribed" }
        break;
      case "invalid_chosendays_chosen": { message = "Please select chosen week days" }
        break;
      case "invalid_chosendays_skip": { message = "Please specify a valid interval" }
        break;
      case "invalid_enddate_beforestartdate": { message = "Please select an enddate which is after prescription startdate" }
        break;
      case "invalid_emptyprotocol": { message = "Protocol is empty" }
    }
    return message;
  }

  public isUnansweredValidator(control: FormControl) {
    const isUnanswered = control.value == null || (control.value || '').trim() === "null"
    return !isUnanswered ? null : { 'unanswered': true };
  }

  public noWhitespaceValidator(control: FormControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  public infusionTypeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if (f.formsettings.isInfusion) {
          var infusiontype = f.prescription.get("infusiontype").value;
          if (FormSettings.IsNullOrEmpty(infusiontype)) {
            return { "invalid_infusiontype": true };
          }
          else return null;
        }
      return null;
    };
  }

  public infusionRateValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if (f.prescription.get('titration').value != true && f.formsettings.isInfusion && (f.formsettings.infusionType == InfusionType.ci || f.formsettings.infusionType == InfusionType.pca || f.formsettings.infusionType == 'rate') &&
          f.formsettings.interval_type == IntervalType.standard) {
          var infusionrate = f.prescription.get("infusionrate").value;
          if (infusionrate == null || infusionrate == undefined || isNaN(+infusionrate) || +infusionrate < 0) {
            return { "invalid_infusionrate": true };
          }
          else return null;
        }
      return null;
    };
  }

  public infusionDurationValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if (f.formsettings.isInfusion && (f.formsettings.infusionType == 'rate') &&
          f.formsettings.interval_type == IntervalType.standard) {
          var infusionduration = f.prescription.get("infusionduration").value;
          if (isNaN(+infusionduration) || +infusionduration <= 0) {
            return { "invalid_infusionduration": true };
          }
          else {
            var tssizevalidator = this.TSArrayValidator(f.formsettings.dosing_pattern, (infusionduration * 3600) + (300), true);
            if (tssizevalidator != null)
              if (tssizevalidator == "invalid_tssize")
                return { "invalid_tssize": true }
              else
                return null;
            else
              return null;
          }
        }
      return null;
    };
  }

  public doseSizeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if ((f.formsettings.dose_type == DoseType.units && f.formsettings.medication.productType.toLowerCase() == "vtm" && !f.formsettings.dose_units) || !f.formsettings.medication.detail.prescribable)
          return { "invalid_dosesize": true };
        else
          if (f.prescription.get('titration').value != true && f.formsettings.interval_type == IntervalType.standard &&
            (!f.formsettings.isInfusion || (f.formsettings.infusionType != InfusionType.ci && f.formsettings.infusionType != InfusionType.pca) || ((f.formsettings.infusionType == InfusionType.ci || f.formsettings.infusionType == InfusionType.pca) && f.formsettings.diluents.length != 0)))
            if (f.formsettings.dose_type == DoseType.units) {
              var dosesize = f.prescription.get("posology.strength.dose_size").value;
              if (f.formsettings.isInfusion && f.formsettings.infusionType == InfusionType.rate) {
                if (isNaN(+dosesize) || +dosesize <= 0 || +dosesize == Infinity) {
                  return { "invalid_dosesize": true };
                }
              }
              else {
                if (!dosesize)
                  return { "invalid_dosesize": true };

                let components = dosesize.toString().split('-');
                if (components.length > 2) {
                  return { "invalid_dosesize": true };
                }
                for (let i = 0; i < components.length; i++) {
                  let comp = components[i];
                  if (isNaN(+comp) || +comp <= 0 || +comp == Infinity) {
                    return { "invalid_dosesize": true };
                  }
                  else if (i == 1 && +components[1] < +components[0]) {
                    return { "invalid_dosesize": true };
                  }

                }
              }

              return null;
            }
      return null;
    };
  }

  public ValidatePrnMaxDose() {
    if (this.prescription.get('posology.interval.prn').value == true) {
      let d = 0;
      if (this.formsettings.dose_type == DoseType.units) {
        d = +this.formsettings.prnMaxDose_TimeSlot.dose_size;
      } else
        if (this.formsettings.dose_type == DoseType.strength) {
          d = +this.formsettings.prnMaxDose_TimeSlot.dose_strength_neumerator;
        } else
          if (this.formsettings.dose_type == DoseType.descriptive) {
            d = +this.formsettings.prnMaxDose_TimeSlot.dose_description;
          }
      if (isNaN(+d) || +d <= 0 || +d == Infinity) {
        this.isPrnMaxDoseValid = false;
      } else
        this.isPrnMaxDoseValid = true;
    }
    else
      this.isPrnMaxDoseValid = true;
  }

  public doseStrengthNeumeratorValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      let isValid = false;

      if (f.formsettings)
        if (f.prescription.get('titration').value != true && f.formsettings.interval_type == IntervalType.standard &&
          (!f.formsettings.isInfusion || (f.formsettings.infusionType != InfusionType.ci && f.formsettings.infusionType != InfusionType.pca) || ((f.formsettings.infusionType == InfusionType.ci || f.formsettings.infusionType == InfusionType.pca) && f.formsettings.diluents.length != 0)))
          if (f.formsettings.dose_type == DoseType.strength) {
            var sn = f.prescription.get("posology.strength.dose_strength_neumerator");
            if (isNaN(+sn.value) || +sn.value <= 0.0 || +sn.value == Infinity) {
              return { "invalid_dosestrengthneumerator": true }
            }
            else return null;
          }
      return null;
    }
  }

  public doseStrengthDenomivatorValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      let isValid = false;

      if (f.formsettings)
        if (f.prescription.get('titration').value != true && f.formsettings.interval_type == IntervalType.standard &&
          (!f.formsettings.isInfusion || (f.formsettings.infusionType != InfusionType.ci && f.formsettings.infusionType != InfusionType.pca) || ((f.formsettings.infusionType == InfusionType.ci || f.formsettings.infusionType == InfusionType.pca) && f.formsettings.diluents.length != 0)))
          if (f.formsettings.dose_type == DoseType.strength) {
            var sd = f.prescription.get("posology.strength.dose_strength_denominator");
            if (isNaN(+sd.value) || +sd.value <= 0.0 || +sd.value == Infinity) {
              return { "invalid_dosestrengthdenominator": true }
            }
            else return null;
          }
      return null;
    }
  }
  public doseDescriptionValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if (f.prescription.get('titration').value != true && f.formsettings.interval_type == IntervalType.standard &&
          (!f.formsettings.isInfusion || (f.formsettings.infusionType != InfusionType.ci && f.formsettings.infusionType != InfusionType.pca)))
          if (f.formsettings.dose_type == DoseType.descriptive) {
            var dd = f.prescription.get("posology.strength.dose_description");
            if (FormSettings.IsNullOrEmpty(dd.value) || dd.value.length > 255) {
              return { "invalid_dosedescription": true }
            }
          }
      return null;
    }
  }

  public RouteValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings)
        if (f.formsettings.routes.filter(x => x.isChecked).length == 0)
          return { "invalid_routes": true }
      return null;
    }
  }

  DoseIntervalCustomFrequencyValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var prn = f.prescription.get('posology.interval.prn').value;
        if (f.formsettings.interval_type == IntervalType.standard &&
          (!f.formsettings.infusionType || (f.formsettings.infusionType != InfusionType.ci && f.formsettings.infusionType != InfusionType.pca))
          //&& (!prn || prn == false)
        ) {
          var cfr = f.prescription.get('posology.interval.customfrequency').value;
          var fr = f.prescription.get('posology.interval.frequency').value;
          let maxvalue = 24;
          if (f.prescription.get('posology.interval.times_hours').value == "m") {
            maxvalue = 1440;
          }
          if (!isNaN(+cfr) && +cfr > 0 && +cfr <= maxvalue)
            return null
          else if (FormSettings.IsNullOrEmpty(fr))
            return { "invalid_frequency": true }
          else return null;
        }
        return null;
      }
    }
  }

  PrescriptionDurationSizeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var durationcontrol = f.prescription.get('prescriptionduration');
        var ds = f.prescription.get('prescriptiondurationsize').value;

        if (durationcontrol) {
          const durationid = durationcontrol.value;
          if (!FormSettings.IsNullOrEmpty(durationid)) {
            if (f.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
              && x.duration.toLowerCase() != PrescriptionDuration.untilcancelled
              && x.duration.toLowerCase() != PrescriptionDuration.enddate) && (isNaN(+ds) || +ds <= 0 || +ds > 99999)) {
              return { "invalid_durationsize": true }
            }
            else return null;
          }
        }
        return null;
      }
    }
  }

  ReviewCommentsValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var rs = f.formsettings.currentreviewstatus;

        if (rs) {
          const status = rs.reviewstatus_id;
          let rc = f.prescription.get('reviewcomments');

          if (f.appService.MetaReviewstatus.find(x => x.status.toLowerCase() == "red").reviewstatus_id == status) {
            if (rc && (!rc.value || rc.value.toString().trim() == "")) {
              return { "invalid_reviewcomments": true }
            }
            else return null;
          }
          else {
            if (rc && rc.value && rc.value.length > f.reviewCommentsMaxLength) {
              return { "invalid_reviewcomments_size": true }
            }
          }
        }
        return null;
      }
    }
  }
  PrescriptionCommentsValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var rc = f.prescription.get('comments');

        if (rc && rc.value && rc.value.toString().length > f.prescriptionCommentsMaxLength) {
          return { "invalid_prescriptioncomments_size": true }
        }
        else return null;
      }
    }
  }
  PrescriptionStartDateTimeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings && f.formContext != FormContext.mod && f.formContext != FormContext.op) {
        var sd = f.prescription.get('startdate').value;
        var st = f.prescription.get('starttime').value;

        if (sd && st) {
          sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);

          if (moment(this.minStartDate).clone().set("second", 0).set("millisecond", 0).isAfter(sd)) {
            if (f.editingPrescription && !f.clonePrescription) {
              f.editingPrescriptionStartdateError = "Start date-time for the modified prescription cannot be in the past (earlier than " + moment(this.minStartDate).format("DD-MMM HH:mm") + ")";
            } else {
              f.editingPrescriptionStartdateError = "Start date-time for the prescription cannot before the admission date-time (" + moment(this.minStartDate).format("DD-MMM HH:mm") + ")";
            }
            return { "invalid_startdatetime": true }
          }
        }

        if (f.editingPrescription) {
          if (sd && st && !f.clonePrescription) {
            let adm = f.appService.Medicationadministration.filter(x => x.prescription_id === f.editingPrescription.prescription_id);
            adm.sort(function compare(a, b) {
              var dateA = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), a.administrationstartime).toDate());
              var dateB = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), b.administrationstartime).toDate());
              return dateA.getTime() - dateB.getTime();
            });

            if (adm && adm.length > 0) {
              let comparedate = adm[0].administrationstartime;
              if (moment(comparedate).isSameOrAfter(sd)) {
                f.editingPrescriptionStartdateError = "Start date-time cannot be before the most recent administration (" + moment(comparedate).format("DD-MMM HH:mm") + ")";
                return { "invalid_startdatetime": true }
              }
            }
          }
        }
      }
      f.editingPrescriptionStartdateError = "";
      return null;
    }
  }

  PrescriptionEndDateValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        if (f.formsettings.interval_type != IntervalType.protocol) {
          var durationcontrol = f.prescription.get('prescriptionduration');
          var ed = f.prescription.get('enddate').value;
          var sd = f.prescription.get('startdate').value;

          var et = f.prescription.get('endtime').value;
          var st = f.prescription.get('starttime').value;

          if (ed && sd && st && et) {
            ed = FormSettings.GetMomentForDateAndTimeslotString(moment(ed), et);
            sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);
          }

          if (durationcontrol) {
            const durationid = durationcontrol.value;
            if (!FormSettings.IsNullOrEmpty(durationid)) {
              if (f.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
                &&
                x.duration.toLowerCase() == PrescriptionDuration.enddate)
                &&
                (!ed
                  || (sd && moment(ed).isBefore(moment(sd))))) {
                return { "invalid_enddate": true }
              }
              else return null;
            }
          }
        }
        return null;
      }
    }
  }

  PrescriptionEndTimeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        f.prescription.get("enddate").updateValueAndValidity({ emitEvent: false, onlySelf: true });
        var durationcontrol = f.prescription.get('prescriptionduration');
        var st = f.prescription.get('endtime').value;
        if (durationcontrol) {
          const durationid = durationcontrol.value;
          if (!FormSettings.IsNullOrEmpty(durationid)) {
            if (f.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
              && x.duration.toLowerCase() == PrescriptionDuration.enddate) && FormSettings.IsNullOrEmpty(st)) {
              return { "invalid_endtime": true }
            }
            else {
              var ed = f.prescription.get('enddate').value;
              var sd = f.prescription.get('startdate').value;
              var et = f.prescription.get('endtime').value;
              var st = f.prescription.get('starttime').value;
              if (ed && sd && st && et) {
                ed = FormSettings.GetMomentForDateAndTimeslotString(moment(ed), et);
                sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);

                if (moment(ed).isBefore(moment(sd))) {
                  return { "invalid_endtime": true }
                }
                else {
                  return null;
                }
              }
              else
                return null;
            }
          }
        }
        return null;
      }
    }
  }

  EndDateTimeValidator(f: PrescribingFormComponent) {
    if (f.formsettings) {
      f.prescription.get("enddate").updateValueAndValidity({ emitEvent: false, onlySelf: true });
      var durationcontrol = f.prescription.get('prescriptionduration');
      var st = f.prescription.get('endtime').value;
      if (durationcontrol) {
        const durationid = durationcontrol.value;
        if (!FormSettings.IsNullOrEmpty(durationid)) {
          if (f.appService.MetaPrescriptionDuration.find(x => x.prescriptionduration_id == durationid
            && x.duration.toLowerCase() == PrescriptionDuration.enddate) && FormSettings.IsNullOrEmpty(st)) {
            return { "invalid_endtime": true }
          }
          else {
            var ed = f.prescription.get('enddate').value;
            var sd = f.prescription.get('startdate').value;
            var et = f.prescription.get('endtime').value;
            var st = f.prescription.get('starttime').value;
            if (ed && sd && st && et) {
              ed = FormSettings.GetMomentForDateAndTimeslotString(moment(ed), et);
              sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);

              if (moment(ed).isBefore(moment(sd))) {
                return { "invalid_endtime": true }
              }
              else {
                return null;
              }
            }
            else
              return null;
          }
        }
      }
      return null;
    }
  }

  IndicationsValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        const validate = f.indValContrByMMC ? f.formsettings.medication.detail.isIndicationMandatory : true;
        if (validate || f.prescription.get("posology.interval.prn").value) {
          var indicationcontrol = f.prescription.get('indication');
          if (!indicationcontrol.value) {
            return { "invalid_indication": true }
          }
          else
            return null;
        }
        return null;
      }
    }
  }

  OtherIndicationsValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        const validate = f.indValContrByMMC ? f.formsettings.medication.detail.isIndicationMandatory : true;
        if (validate || f.prescription.get("posology.interval.prn")) {
          var indicationcontrol = f.prescription.get('indication');
          var otherindicationscontrol = f.prescription.get('otherindications');
          if (indicationcontrol.value && indicationcontrol.value.toLowerCase() == "other" && !otherindicationscontrol.value) {
            return { "invalid_otherindications": true }
          }
          else
            return null;
        }
        return null;
      }
    }
  }

  OtherSourceValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var othersourcecontrol = f.prescription.get('otherprescriptionsource');
        if (f.ShowOtherSourceControl() && othersourcecontrol.value && othersourcecontrol.value.toString().length > 256) {
          return { "invalid_othersource_length": true }
        }
        else
          return null;

      }
    }
  }


  TitrationTargetMinValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var titration = f.prescription.get('titration');
        var tmin = f.prescription.get('titrationtargetmin');

        if (titration && titration.value && (isNaN(+tmin.value) || +tmin.value <= 0)) {
          return { "invalid_titrationmin": true }
        }
        else
          if (titration && titration.value && (+tmin.value < f.formsettings.titrateMinAllowed || +tmin.value > f.formsettings.titrateMaxAllowed)) {
            return { "invalid_titrationmin": true }
          }
        f.prescription.get("titrationtargetmax").updateValueAndValidity({ emitEvent: false, onlySelf: true });

        return null;

      }
    }
  }

  TitrationTargetMaxValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var titration = f.prescription.get('titration');
        var tmax = f.prescription.get('titrationtargetmax');
        var trange = f.prescription.get('istitrationrange');
        var tmin = f.prescription.get('titrationtargetmin');

        if (titration && titration.value && trange.value && (isNaN(+tmax.value) || +tmax.value <= 0 || +tmin.value >= +tmax.value)) {
          return { "invalid_titrationmax": true }
        } else
          if (titration && titration.value && (+tmax.value < f.formsettings.titrateMinAllowed || +tmax.value > f.formsettings.titrateMaxAllowed)) {
            return { "invalid_titrationmin": true }
          }
        return null;

      }
    }
  }

  public AntimicrobialStartDateTimeValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        var am_sd = f.prescription.get("antimicrobialstartdate").value;
        var am_st = f.prescription.get("antimicrobialstarttime").value;
        var sd = f.prescription.get('startdate').value;
        var st = f.prescription.get('starttime').value;
        if (am_sd && sd && st && !am_st) {
          am_sd = FormSettings.GetMomentForDateAndTimeslotString(moment(am_sd), "00:00");
          sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);
          if (moment(am_sd).isAfter(moment(sd))) {
            return { "invalid_AMTSD": true }
          }
        }
        else
          if (am_sd && sd && st && am_st) {
            am_sd = FormSettings.GetMomentForDateAndTimeslotString(moment(am_sd), am_st);
            sd = FormSettings.GetMomentForDateAndTimeslotString(moment(sd), st);
            if (moment(am_sd).isAfter(moment(sd))) {
              return { "invalid_AMTSDT": true }
            }
          }
        return null;
      };
    }
  }

  public TotalQuantityValidator(f: PrescribingFormComponent) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (f.formsettings) {
        const tq = f.prescription.get("totalquantity");
        if (isNaN(+tq.value) || +tq.value <= 0.0 || +tq.value == Infinity) {
          return { "invalid_totalquantity": true }
        }
      }
      return null;
    }
  }



  IsDoseValid() {
    var ds = this.prescription.get("posology.strength.dose_size");
    var sn = this.prescription.get("posology.strength.dose_strength_neumerator");
    var sd = this.prescription.get("posology.strength.dose_strength_denominator");
    var dd = this.prescription.get("posology.strength.dose_description");

    return (ds.invalid && (ds.dirty || ds.touched)) ||
      (sn.invalid && (sn.dirty || sn.touched)) ||
      (sd.invalid && (sd.dirty || sd.touched)) ||
      (dd.invalid && (dd.dirty || dd.touched))
  }
  IsInfusionRateValid() {
    var r = this.prescription.get("infusionrate");
    return (r.invalid && (r.dirty || r.touched))
  }
  IsInfusionDurationValid() {
    var d = this.prescription.get("infusionduration");
    return (d.invalid && (d.dirty || d.touched))
  }

  IsInfusionTypeValid() {
    var d = this.prescription.get("infusiontype");
    return (d.invalid && (d.dirty || d.touched))
  }

  IsRouteValid() {
    var rt = this.prescription.get("routes");
    return (rt.invalid && (rt.dirty || rt.touched));
  }

  IsIntervalValid() {
    var fr = this.prescription.get('posology.interval.frequency');
    var cfr = this.prescription.get('posology.interval.customfrequency');
    var th = this.prescription.get('posology.interval.times_hours');
    return (cfr.invalid && (fr.dirty || fr.touched || cfr.dirty || cfr.touched || th.dirty || th.touched))
  }

  IsStartDateValid() {
    let sd = this.prescription.get('startdate');
    return (sd.invalid && (sd.dirty || sd.touched))
  }

  IsStartTimeValid() {
    let st = this.prescription.get('starttime');
    return (st.invalid && (st.dirty || st.touched))
  }

  IsDurationSizeValid() {
    let dr = this.prescription.get('prescriptiondurationsize');
    return (dr.invalid && (dr.dirty || dr.touched))
  }

  IsEndDateValid() {
    let ed = this.prescription.get('enddate');
    return (ed.hasError("invalid_enddate") || (ed.invalid && (ed.dirty || ed.touched)))
  }

  IsEndTimeValid() {
    let et = this.prescription.get('endtime');
    return (et.hasError("invalid_endtime") || (et.invalid && (et.dirty || et.touched)))
  }
  IsReviewCommentsValid() {
    let rc = this.prescription.get('reviewcomments');
    return (rc.invalid && (rc.dirty || rc.touched))
  }

  IsIndicationValid() {
    let r = this.prescription.get("indication");
    return (r.invalid && (r.dirty || r.touched))
  }

  IsPrescriptionCommentsValid() {
    let rc = this.prescription.get('comments');
    return (rc.invalid && (rc.dirty || rc.touched))
  }

  IsOtherIndicationsValid() {
    let r = this.prescription.get("otherindications");
    return (r.invalid && (r.dirty || r.touched))
  }
  IsPrescriptionOtherSourceValid() {
    let r = this.prescription.get("otherprescriptionsource");
    return (r.invalid && (r.dirty || r.touched))
  }
  IsDispensingFromValid() {
    let df = this.prescription.get('dispensingfrom');
    return (df.invalid && (df.dirty || df.touched))
  }
  IsAMTDateValid() {
    let amtd = this.prescription.get('antimicrobialstartdate');
    return (amtd.invalid && (amtd.dirty || amtd.touched))
  }
  IsAMTimeValid() {
    let amt = this.prescription.get('antimicrobialstartdate');
    // return (amt.invalid && (amt.dirty || amt.touched))
    return amt.hasError("invalid_AMTSDT")

  }

  IsTitrationTargetMinValid() {
    let tt = this.prescription.get('titrationtargetmin');
    return (tt.invalid && (tt.dirty || tt.touched))
  }
  IsTitrationTargetMaxValid() {
    let tt = this.prescription.get('titrationtargetmax');
    return (tt.invalid && (tt.dirty || tt.touched))
  }

  IsTotalQuantityValid() {
    const t = this.prescription.get('totalquantity');
    return (t.hasError("invalid_totalquantity") || (t.invalid && (t.dirty || t.touched)))
  }
  IsTotalQuantityTextValid() {
    const t = this.prescription.get('totalquantitytext');
    return (t.hasError("invalid_totalquantitytext") || (t.invalid && (t.dirty || t.touched)))
  }

  TSArrayValidator(dp: Array<Timeslot>, timeslotSize: number = null, ignoreDose = false) {
    if (dp.length > 0) {
      var clone = this.formsettings.CloneDosingPattern(dp);
      clone.sort(function compare(a, b) {
        var dateA = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), a).toDate());
        var dateB = new Date(FormSettings.GetMomentForDateAndTimeslot(moment(), b).toDate());
        return dateA.getTime() - dateB.getTime();
      });
      for (var i = 0; i < clone.length; i++) {
        if (FormSettings.IsValidTimeSlotString(clone[i].GetFormatString())) {
          //check dose
          if (clone[i].dose_size && clone[i].dose_size.toString().indexOf('-') != -1) //range
          {
            let dosesize = clone[i].dose_size;
            if (!dosesize)
              return "invalid_dose";

            let components = dosesize.toString().split('-');
            if (components.length > 2) {
              return "invalid_dose";
            }
            for (let i = 0; i < components.length; i++) {
              let comp = components[i];
              if (isNaN(+comp) || +comp <= 0 || +comp == Infinity) {
                return "invalid_dose";
              }
              else if (i == 1 && +components[1] < +components[0]) {
                return "invalid_dose";
              }

            }

          }
          else
            if (!ignoreDose && (isNaN(+clone[i].dose_size) || +clone[i].dose_size <= 0) &&
              (isNaN(+clone[i].dose_strength_denominator) || +clone[i].dose_strength_denominator <= 0) &&
              (isNaN(+clone[i].dose_strength_neumerator) || +clone[i].dose_strength_neumerator <= 0) &&
              (isNaN(+clone[i].infusionrate) || +clone[i].infusionrate <= 0)) {
              return "invalid_dose";
            }
          if (clone.length == 1) {
            var a = FormSettings.GetMomentForDateAndTimeslot(moment(), clone[i]);
            //var b = FormSettings.GetMomentForDateAndTimeslot(moment().add(1, "day"), new Timeslot(0, 0));
            var b = a.clone().add(24, "hours");

            console.log(b.diff(a, "second"));
            console.log(timeslotSize);
            if (timeslotSize != null && +timeslotSize > 0)
              if (b.diff(a, "second") < timeslotSize)
                return "invalid_tssize"
          }
          else {
            let today = moment();
            let tomorrow = today.clone().add("1", 'day');
            let currentindex = i;
            let lastindex = clone.length - 1;
            //if last element, compare with first element to validate that the timeslot fits if the infusion spans across 2 days. 
            let compareindex = (currentindex == lastindex) ? 0 : i + 1;

            if (FormSettings.IsValidTimeSlotString(clone[compareindex].GetFormatString())) {
              //check sequence
              var a = FormSettings.GetMomentForDateAndTimeslot(today, clone[currentindex]);
              var b = FormSettings.GetMomentForDateAndTimeslot((currentindex == lastindex) ? tomorrow : today, clone[compareindex]);

              if (!a.isBefore(b))
                return "invalid_sequence"; // timeslots not in sequence
              else
                if (timeslotSize != null && +timeslotSize > 0)
                  if (b.diff(a, "second") < timeslotSize)
                    return "invalid_tssize"
            }
            else {
              return "invalid_timeslot" //invalid timeslot
            }
          }
        }
        else {
          return "invalid_timeslot"; // invalid timeslot
        }
      }
    }
    else {
      return "invalid_notimeslot"; // no timeslots
    }
    return null;
  }

  VariableInfusionValidator() {
    for (var i = 0; i < this.formsettings.infusion_rate_pattern.length; i++) {
      var ir = this.formsettings.infusion_rate_pattern[i];
      var validationresult = this.TSArrayValidator([ir.starttime]);
      if (validationresult != null)
        return validationresult;
    }
    return null;
  }

  VariableValidator() {
    var dp = this.formsettings.dosing_pattern;
    return this.TSArrayValidator(dp);
  }

  ProtocolValidator() {
    let hasAtLeaseOneDose = false; //for validating if atleast one interval has a prescribed dose value
    for (var i = 0; i < this.formsettings.protocol_dosing_pattern.length; i++) {
      var p = this.formsettings.protocol_dosing_pattern[i];
      var dp = p.intervalpattern
      var validationresult = this.TSArrayValidator(dp, null, true);
      if (validationresult != null) {
        return validationresult
      }
      else
        if (!hasAtLeaseOneDose) {
          p.intervalpattern.forEach(sip => {
            if (!((isNaN(+sip.dose_size) || +sip.dose_size <= 0) &&
              (isNaN(+sip.dose_strength_denominator) || +sip.dose_strength_denominator <= 0) &&
              (isNaN(+sip.dose_strength_neumerator) || +sip.dose_strength_neumerator <= 0) &&
              (isNaN(+sip.infusionrate) || +sip.infusionrate <= 0))) {
              hasAtLeaseOneDose = true;
            }
          });
        }
    }
    if (!hasAtLeaseOneDose) {
      return "invalid_emptyprotocol";
    }
    var startdate = this.prescription.get('startdate').value;
    var repeatprotocol = this.prescription.get('posology.repeatprotocol').value;
    var repeatprotocolsub = this.prescription.get('posology.repeatprotocolsub').value;
    var protocolenddate = this.prescription.get('posology.protocolenddate').value;
    var protocolrepeattimes = this.prescription.get('posology.protocolrepeattimes').value;
    if (repeatprotocol == "lastday" && repeatprotocolsub == "enddate") {
      if (!protocolenddate) {
        return "invalid_enddate";
      }
      else if (moment(startdate).isSameOrAfter(moment(protocolenddate))) {
        return "invalid_enddate_beforestartdate";
      }
    }
    if (repeatprotocol == "protocol") {
      if (isNaN(+protocolrepeattimes) || +protocolrepeattimes <= 0) {
        return "invalid_repeattimes";
      }
    }
    return null;
  }

  ChosenDaysValidator() {
    var chosenoption = this.prescription.get("chosendays").value
    if (chosenoption) {
      if (chosenoption == ChosenDays.chosen) {
        if (this.formsettings.daysofweek.filter(x => x.isChecked).length == 0)
          return "invalid_chosendays_chosen";
      }
      else if (chosenoption == ChosenDays.skip) {
        let frequency = this.prescription.get("dosingdaysfrequency").value
        let size = this.prescription.get("dosingdaysfrequencysize").value
        if (!frequency)
          return "invalid_chosendays_skip";

        if (isNaN(+size) || +size <= 0 ||
          (frequency == "days" && +size > 180) ||
          (frequency == "weeks" && +size > 21) ||
          (frequency == "months" && +size > 6))
          return "invalid_chosendays_skip";
      }
    }
    return null;
  }

  UpdateDurationForRateAndDose(rate: number, dose: number) {
    var duration = this.prescription.get('infusionduration');
    var r = this.prescription.get('infusionrate');

    if (!isNaN(+dose) && +dose > 0) {
      var v = dose / rate;
      if (!isNaN(+v) && +v > 0 && v != Infinity) {
        duration.setValue(v);// duration.setValue(v.toFixed(this.formsettings.precision).replace(/\.0+$/g, ''));
      } else {
        duration.setValue("");
        r.setValue("");
      }

    }
    else {
      duration.setValue("");
      r.setValue("");
    }

  }

  UpdateRateForDurationAndDose(duration: number, dose: number) {
    var rate = this.prescription.get('infusionrate');
    var d = this.prescription.get('infusionduration');

    if (!isNaN(+dose) && +dose > 0) {
      var v = dose / duration;
      if (!isNaN(+v) && +v > 0 && v != Infinity) {
        rate.setValue(v);//rate.setValue(v.toFixed(this.formsettings.precision).replace(/\.0+$/g, ''));
      }
      else {
        rate.setValue("");
        d.setValue("");
      }
    }
    else {
      rate.setValue("");
      d.setValue("");
    }
  }

  DoseSizeChanged(e) {
    if (this.formsettings.infusionType === InfusionType.rate || this.formsettings.infusionType === InfusionType.ci || this.formsettings.infusionType == InfusionType.pca) {
      // var dose = this.GetDoseSolutionQuantity();
      // var rate = this.prescription.get('infusionrate').value;
      // this.UpdateDurationForRateAndDose(rate, dose);
      this.ResetInfusionRateDuration();
    }
    //clear variable error message
    this.clearVariableErrorMessages();

    let dvalue = this.prescription.get('posology.strength.dose_size').value;
    if (dvalue.toString().indexOf('-') == -1) {
      this.isDoseSizeRange = false;
      this.DoseCalculations();
      //this.prescription.get('posology.strength.dose_size').setValue(this.FixToDecimalPlaces(+e.target.value), { emitEvent: false })
    }
    else // range
    {
      this.isDoseSizeRange = true;
      this.ClearInfusionType();
      let comps = dvalue.toString().split('-');
      if (comps.length >= 2) {
        let fixed_dose = []
        comps.every(comp => {
          let t = this.FixToDecimalPlaces(+comp);
          if (t && t != NaN && t != Infinity)
            fixed_dose.push(t.toString());
          else {
            fixed_dose = [];
            return false;//break every loop
          }
          return true;
        });
        this.prescription.get('posology.strength.dose_size').setValue(fixed_dose.join('-'), { emitEvent: false });

      }

    }
  }

  VariableDoseSizeChanged() {
    if (this.formsettings.infusionType === InfusionType.rate || this.formsettings.infusionType === InfusionType.ci || this.formsettings.infusionType === InfusionType.pca) {
      this.ResetInfusionRateDuration();
    }
    //clear variable error message
    this.clearVariableErrorMessages();
  }

  DoseStrengthNMChagned() {
    if (this.formsettings.infusionType === InfusionType.rate || this.formsettings.infusionType === InfusionType.ci || this.formsettings.infusionType === InfusionType.pca) {
      // var dose = this.GetDoseSolutionQuantity();
      // var rate = this.prescription.get('infusionrate').value;
      // this.UpdateDurationForRateAndDose(rate, dose);
      this.ResetInfusionRateDuration();
    }
    //clear variable error message
    this.clearVariableErrorMessages();
  }

  VariableDoseStrengthNMChagned() {
    //clear variable error message
    this.clearVariableErrorMessages();
  }

  DoseStrengthDMChagned() {
    if (this.formsettings.infusionType === InfusionType.rate || this.formsettings.infusionType === InfusionType.ci || this.formsettings.infusionType === InfusionType.pca) {
      // var dose = this.GetDoseSolutionQuantity();
      // var rate = this.prescription.get('infusionrate').value;
      // this.UpdateDurationForRateAndDose(rate, dose);
      this.ResetInfusionRateDuration();
    }
    //clear variable error message
    this.clearVariableErrorMessages();
  }

  VariableDoseStrengthDMChagned() {
    if (this.formsettings.infusionType === InfusionType.rate || this.formsettings.infusionType === InfusionType.ci || this.formsettings.infusionType === InfusionType.pca) {
      this.ResetInfusionRateDuration();
    }
    //clear variable error message
    this.clearVariableErrorMessages();
  }

  GetDoseSolutionQuantity() {
    var volume = 0;

    if (this.IsIVRoute()) {
      if (this.formsettings.vtmstyle && this.formsettings.medication.productType.toLowerCase() != 'vtm' &&
        ((this.formsettings.vtmstyleVolumeUnits ?? "").toLowerCase() == "ml" || (this.formsettings.vtmstyleVolumeUnits ?? "").toLowerCase() == "litre")) {

        let v = ((+this.prescription.get('posology.strength.dose_size').value) * this.formsettings.vtmstyleDoseToVolumeRatio);
        volume = v//this.FixToDecimalPlaces(v);

        if (this.formsettings.vtmstyleVolumeUnits.toLowerCase() == "litre") {
          volume *= 1000;
        }
      }
      else
        if (this.formsettings.dose_type == DoseType.units && (this.formsettings.dose_units.toLowerCase() == "ml" || this.formsettings.dose_units.toLowerCase() == "litre")) {

          if (this.formsettings.dose_units.toLowerCase() == "litre") {
            volume = (+this.prescription.get('posology.strength.dose_size').value * 1000);

          } else {
            volume = +this.prescription.get('posology.strength.dose_size').value;
          }
        }
        else if (this.formsettings.dose_type == DoseType.strength && (this.formsettings.dose_strength_denominator_units.toLowerCase() == "ml" || this.formsettings.dose_strength_denominator_units.toLowerCase() == "litre")) {
          if (this.formsettings.dose_strength_denominator_units.toLowerCase() == "litre") {
            volume = (+this.prescription.get('posology.strength.dose_strength_denominator').value * 1000);
          }
          else {
            volume = +this.prescription.get('posology.strength.dose_strength_denominator').value;
          }
        }

      if (this.formsettings.diluents.length > 0) {
        this.formsettings.diluents.forEach(d => {
          if (d.fs.dose_type == DoseType.units && (d.fs.dose_units.toLowerCase() == "ml" || d.fs.dose_units.toLowerCase() == "litre")
            && !isNaN(+d.ts.dose_size)) {
            if (d.fs.dose_units.toLowerCase() == "litre") {
              volume += (+d.ts.dose_size * 1000);

            }
            else {
              volume += +d.ts.dose_size;
            }
          }
          else if (d.fs.dose_type == DoseType.strength && (d.fs.dose_strength_denominator_units.toLowerCase() == "ml" || d.fs.dose_units.toLowerCase() == "litre")
            && !isNaN(+d.ts.dose_strength_denominator)) {
            if (d.fs.dose_strength_denominator_units.toLowerCase() == "litre") {
              volume += (+d.ts.dose_strength_denominator * 1000);

            }
            else {
              volume += +d.ts.dose_strength_denominator;
            }
          }
        });
      }
    }

    this.totalvolume = isNaN(volume) ? 0 : volume;
    this.totalvolumedisplay = +this.FixToDecimalPlaces(this.totalvolume);
    this.SetPrescribedConcentration();

    return isNaN(volume) ? 0 : volume;
  }

  SetPrescribedConcentration() {
    let dose = 0;
    let units = this.prescribedConcentration = "";

    if (this.formsettings.vtmstyle && this.formsettings.medication.productType.toLowerCase() != 'vtm') {
      dose = +this.prescription.get('posology.strength.dose_size').value;
      units = this.formsettings.dose_units;
    }
    else if (this.formsettings.dose_type == DoseType.units && this.formsettings.isNeumeratorOnlyStrength) {
      dose = +this.prescription.get("posology.strength.totalstrength").value;
      units = this.formsettings.singleIngredientStrength;
    }
    else if (this.formsettings.dose_type == DoseType.strength) {
      dose = +this.prescription.get("posology.strength.dose_strength_neumerator").value;
      units = this.formsettings.dose_strength_neumerator_units;
    }

    // this.prescribedConcentration = +dose > 0 && +this.totalvolumedisplay > 0 ?
    //   [this.FixToDecimalPlaces(dose / this.totalvolumedisplay), units, "/ml"].join("") : "";
    let concentration = this.FixToDecimalPlaces(dose / this.totalvolume, 2);
    if (concentration == 0 || this.formsettings.diluents.length != 0)
      concentration = this.FixToDecimalPlaces(dose / this.totalvolume, 7);
    this.prescribedConcentration = +dose > 0 && +this.totalvolume > 0 ?
      [concentration, units, "/ml"].join("") : "";

    this.infusionDoseRateUnits = [units, "/hr"].join("");

  }


  RateToDoseRate(setrate = false) {
    let dose = 0;
    let units = "";

    if (this.formsettings.vtmstyle && this.formsettings.medication.productType.toLowerCase() != 'vtm') {
      dose = +this.prescription.get('posology.strength.dose_size').value;
      units = this.formsettings.dose_units;
    }
    else if (this.formsettings.dose_type == DoseType.units && this.formsettings.isNeumeratorOnlyStrength) {
      dose = +this.prescription.get("posology.strength.totalstrength").value;
      units = this.formsettings.singleIngredientStrength;
    }
    else if (this.formsettings.dose_type == DoseType.strength) {
      dose = +this.prescription.get("posology.strength.dose_strength_neumerator").value;
      units = this.formsettings.dose_strength_neumerator_units;
    }


    if (!setrate) { // set doserate for rate
      let rate = this.prescription.get('infusionrate').value;
      let doserate;

      // IF volume entered is 10ml, then 
      // Ratio r= concentration volume/entered volume = 100/10 = 10
      // Dose = concentration dose/r = 10/10 = 1 mg
      // Calculated dose = 1mg/10ml
      if (!isNaN(+rate) && +rate > 0) {
        if (dose > 0 && this.totalvolume > 0) {
          const ratio = this.totalvolume / rate;
          doserate = dose / ratio;
          //doserate = doserate.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
        }
      }

      this.SetObjectiveFormValue("infusiondoserate", doserate)
    }
    else //set rate for doserate
    {
      let doserate = this.prescription.get('infusiondoserate').value;
      let rate;
      // IF dose entered is 10mg, then 
      // Ratio r = concentration dose/entered dose = 10/10 = 1
      // Volume = concentration volume/r = 100/1 = 100 ml
      // Calculated dose = 10mg/100ml. 

      if (!isNaN(+doserate) && +doserate > 0) {
        if (+dose > 0 && this.totalvolume > 0) {
          const ratio = dose / doserate;
          rate = this.totalvolume / ratio;
          //rate = rate.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
        }
      }
      this.SetObjectiveFormValue("infusionrate", rate)

    }

  }

  RateToDoseRateTS(setrate = false, ts: Timeslot) {
    let dose = 0;
    let units = "";

    if (this.formsettings.vtmstyle && this.formsettings.medication.productType.toLowerCase() != 'vtm') {
      dose = +this.prescription.get('posology.strength.dose_size').value;
      units = this.formsettings.dose_units;
    }
    else if (this.formsettings.dose_type == DoseType.units && this.formsettings.isNeumeratorOnlyStrength) {
      dose = +this.prescription.get("posology.strength.totalstrength").value;
      units = this.formsettings.singleIngredientStrength;
    }
    else if (this.formsettings.dose_type == DoseType.strength) {
      dose = +this.prescription.get("posology.strength.dose_strength_neumerator").value;
      units = this.formsettings.dose_strength_neumerator_units;
    }

    if (!setrate) { // set doserate for rate
      let rate = ts.infusionrate
      let doserate;

      // IF volume entered is 10ml, then 
      // Ratio r= concentration volume/entered volume = 100/10 = 10
      // Dose = concentration dose/r = 10/10 = 1 mg
      // Calculated dose = 1mg/10ml
      if (!isNaN(+rate) && +rate > 0) {
        if (dose > 0 && this.totalvolume > 0) {
          const ratio = this.totalvolume / rate;
          doserate = dose / ratio;
          // doserate = doserate.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
        }
      }

      ts.infusiondoserate = doserate;
    }
    else //set rate for doserate
    {
      let doserate = ts.infusiondoserate;
      let rate;
      // IF dose entered is 10mg, then 
      // Ratio r = concentration dose/entered dose = 10/10 = 1
      // Volume = concentration volume/r = 100/1 = 100 ml
      // Calculated dose = 10mg/100ml. 

      if (!isNaN(+doserate) && +doserate > 0) {
        if (+dose > 0 && this.totalvolume > 0) {
          const ratio = dose / doserate;
          rate = this.totalvolume / ratio;
          // rate = rate.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
        }
      }
      ts.infusionrate = rate;

    }

  }

  ShowInfusionControls() {
    if (this.formsettings.isOxygen) {
      return true;
    }
    if (this.formsettings.infusionType == InfusionType.ci ||
      this.formsettings.infusionType == InfusionType.rate ||
      this.formsettings.infusionType == InfusionType.pca) {
      var dose = this.totalvolume; //this.GetDoseSolutionQuantity();
      if (!isNaN(+dose) && +dose > 0)
        return true;
      else
        return false;
    }
    return false;
  }
  ShowEnterDoseMessage() {
    if (this.formsettings.isOxygen) {
      return false;
    }
    if (this.formsettings.infusionType == InfusionType.rate || this.formsettings.infusionType == InfusionType.ci || this.formsettings.infusionType == InfusionType.pca) {
      var dose = this.totalvolume; //this.GetDoseSolutionQuantity();

      if (!isNaN(+dose) && +dose > 0)
        return false;
      else
        return true;
    }
    return false;
  }

  DurationChanged() {
    var dose = this.GetDoseSolutionQuantity();
    var duration = this.prescription.get('infusionduration').value;
    this.UpdateRateForDurationAndDose(duration, dose);
  }

  InfusionRateChanged() {
    var dose = this.GetDoseSolutionQuantity();

    if (this.formsettings.infusionType === InfusionType.rate) {
      var rate = this.prescription.get('infusionrate').value;
      this.UpdateDurationForRateAndDose(rate, dose);
      // this.DoseStrengthDMChagned();  // changed to above logic because when strength denominator is changed, new requirement is to reset rate and duration. 
    }
    // this.RateToDoseRate();
  }

  InfusionDoseRateChanged() {
    // this.RateToDoseRate(true)

  }

  FirstAdministrationMessage() {
    var startDate = this.prescription.get("startdate").value ?? null;
    var startTime = this.prescription.get("starttime").value ?? null;
    var message = [];

    if (startDate && startTime) {
      var startDateMoment = moment(startDate);
      var chosenoption = this.prescription.get("chosendays").value
      if (chosenoption) {
        if (chosenoption == ChosenDays.chosen && this.formsettings.daysofweek.filter(x => x.isChecked).length != 0) {
          let maxtries = 8;
          while (maxtries && this.formsettings.daysofweek.filter(x => x.isChecked
            && x.name.toLowerCase() == startDateMoment.format('dddd').toString().toLowerCase()).length == 0) {
            startDateMoment.add(1, "day");
            maxtries--;
          }
        }
      }

      var sdt = FormSettings.GetMomentForDateAndTimeslotString(startDateMoment, startTime);
      var diff = sdt.diff(moment());
      var duration = moment.duration(diff);

      var calMsg = moment(sdt).calendar({
        lastDay: '[Yesterday at] HH:mm',
        sameDay: '[Today at] HH:mm',
        nextDay: '[Tomorrow at] HH:mm',
        lastWeek: '[last] dddd [at] HH:mm',
        nextWeek: 'dddd [at] HH:mm',
        sameElse: 'DD/MM/YYYY [at] HH:mm'
      });
      var durMsg = this.FormatDuration(duration);
      var red = false;
      if (diff < 0 || duration.asHours() > 5)
        red = true
      message.push("First Administration:");
      if (red) message.push("<span class='text-danger'>")
      else message.push("<span>");
      message.push(calMsg);
      message.push(" : ");
      message.push(durMsg);
      if (diff < 0) message.push("ago");
      else message.push("from now");
      message.push("</span>");
    }
    if (this.firstadmsg)
      (this.firstadmsg.nativeElement as HTMLLabelElement).innerHTML = message.join(" ");
  }

  FormatDuration(duration: moment.Duration) {

    const year = Math.abs(duration.get("year"));
    const yearString = year ? year + (year > 1 ? " Years " : " Year ") : "";

    const month = Math.abs(duration.get("month"));
    const monthString = month ? month + (month > 1 ? " Months " : " Month ") : "";

    const day = Math.abs(duration.get("day"));
    const dayString = day ? day + (day > 1 ? " Days " : " Day ") : "";

    const hour = Math.abs(duration.get("hour"));
    const hourString = hour ? hour + (hour > 1 ? " Hrs " : " Hr ") : "";

    const min = Math.abs(duration.get("minute"));
    const minString = min + (min > 1 ? " Mins " : " Min ");

    return yearString + monthString + dayString + hourString + minString
  }

  ClearForm() {

    this.clearVariableErrorMessages();
    this.ClearInfusionType();
    this.ClearVariable();

    //reset dose
    this.formsettings.dosing_pattern = [];
    this.formsettings.protocol_dosing_pattern = [];
    this.formsettings.infusion_rate_pattern = [];
    for (const field in (<FormGroup>this.prescription.get('posology.strength')).controls) {
      const control = this.prescription.get('posology.strength.' + field);
      if (control) {
        control.reset();
        control.markAsPristine({ onlySelf: true });
      }
    }

    //reset route
    this.formsettings.routes.forEach(r => {
      r.isChecked = false;
      r.isPrimary = false
    });
    this.prescription.get('routes').reset();

    //reset sources
    this.formsettings.sources.forEach(src => {
      src.selected = false;
    });
    this.prescription.get('prescriptionsource').reset();

    this.prescription.markAsPristine({ onlySelf: true });


    //reset frequency
    for (const field in (<FormGroup>this.prescription.get('posology.interval')).controls) {
      const control = this.prescription.get('posology.interval.' + field);
      if (control) {
        if (field != "times_hours")

          control.reset();
        control.markAsPristine({ onlySelf: true });
      }
    }

    //clear everything else
    for (const field in this.prescription.controls) {
      const control = this.prescription.get(field);
      if (control) {
        if (field != "name" && field != "posology" && field != "interval" && field != "strength")
          control.reset();
        control.markAsPristine({ onlySelf: true });
      }
    }

    // set prescription duration to "until cancelled"
    this.prescription.get("prescriptionduration").setValue("5a43b7fa-f947-4bfa-a593-1a0b5cbab907");

    //set start date to today
    this.prescription.get("startdate").setValue(new Date());

    //reset chosendays
    this.formsettings.daysofweek.forEach(r => {
      r.isChecked = false;
    });
    this.checkedDaysOfWeekCount = [];

    this.prescription.get('chosendays').setValue("all");
    this.prescription.get('dosingdaysfrequency').setValue("days");

    //set calculator type to null
    this.prescription.get('posology.strength.calculatortype').setValue('null');
  }

  DoseCalculations() {

    if (this.appService.refWeightValue && this.formsettings.medication.formularyIngredients) {
      var dose;
      this.doseperkg = 0;
      this.doseperikg = 0;
      this.doseperkgperday = 0;
      this.doseperikgperday = 0;
      this.doseperm2 = 0;
      this.doseperm2perday = 0;
      if (this.formsettings.interval_type == IntervalType.standard) {
        if (this.formsettings.dose_type == DoseType.strength) {
          dose = this.prescription.get("posology.strength.dose_strength_neumerator").value;
          this.doseunitsdisplaytext = this.formsettings.dose_strength_neumerator_units;
        }
        else if (this.formsettings.dose_type == DoseType.units) {

          if (this.formsettings.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(this.formsettings.medication.formularyIngredients[0].strengthValueDenominator)) {
            this.doseunitsdisplaytext = this.formsettings.medication.formularyIngredients[0].strengthValueNumeratorUnitDesc;
            dose = +this.prescription.get("posology.strength.dose_size").value * +this.formsettings.medication.formularyIngredients[0].strengthValueNumerator;
          }
          else {
            this.doseunitsdisplaytext = this.formsettings.dose_units;
            dose = this.prescription.get("posology.strength.dose_size").value;
          }
        }
        if (dose) {
          this.doseperkg = +this.FixToDecimalPlaces(+dose / this.appService.refWeightValue);
          this.doseperkgperday = +this.FixToDecimalPlaces(this.doseperkg * this.formsettings.dosing_pattern.length);

          this.doseperikg = +this.FixToDecimalPlaces(+dose / this.appService.idealWeightValue);
          this.doseperikgperday = +this.FixToDecimalPlaces(this.doseperikg * this.formsettings.dosing_pattern.length);

          this.doseperm2 = +this.FixToDecimalPlaces(+dose / this.appService.bodySurfaceArea);
          this.doseperm2perday = +this.FixToDecimalPlaces(this.doseperm2 * this.formsettings.dosing_pattern.length);
        }
      }
      else if (this.formsettings.interval_type == IntervalType.variable) {
        if (this.formsettings.dose_type == DoseType.strength) {
          dose = this.formsettings.dosing_pattern.reduce(function (sum, arr) { return sum + +arr.dose_strength_neumerator; }, 0);
          this.doseunitsdisplaytext = this.formsettings.dose_strength_neumerator_units;
        } else if (this.formsettings.dose_type == DoseType.units) {
          if (this.formsettings.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(this.formsettings.medication.formularyIngredients[0].strengthValueDenominator)) {
            this.doseunitsdisplaytext = this.formsettings.medication.formularyIngredients[0].strengthValueNumeratorUnitDesc;
            dose = this.formsettings.dosing_pattern.reduce(function (sum, arr) { return sum + +arr.dose_size; }, 0)
              * +this.formsettings.medication.formularyIngredients[0].strengthValueNumerator;
          }
          else {
            this.doseunitsdisplaytext = this.formsettings.dose_units;
            dose = this.formsettings.dosing_pattern.reduce(function (sum, arr) { return sum + +arr.dose_size; }, 0);
          }
        }
        if (dose) {
          this.doseperkgperday = +this.FixToDecimalPlaces(+dose / this.appService.refWeightValue);
          this.doseperikgperday = +this.FixToDecimalPlaces(+dose / this.appService.idealWeightValue);
          this.doseperm2perday = +this.FixToDecimalPlaces(+dose / this.appService.bodySurfaceArea);
        }
      }
      else {
        if (this.formsettings.dose_type == DoseType.strength) {
          this.doseunitsdisplaytext = this.formsettings.dose_strength_neumerator_units;
        } else if (this.formsettings.dose_type == DoseType.units) {
          if (this.formsettings.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(this.formsettings.medication.formularyIngredients[0].strengthValueDenominator)) {
            this.doseunitsdisplaytext = this.formsettings.medication.formularyIngredients[0].strengthValueNumeratorUnitDesc;
          }
          else {
            this.doseunitsdisplaytext = this.formsettings.dose_units;
          }
        }
      }
    }
    if (this.formContext == FormContext.mod || this.formContext == FormContext.op)
      this.SetTotalQuantity();
  }

  StrengthToUnitDose(ts: Timeslot, reverse = false, fs: FormSettings) {
    if (fs.isNeumeratorOnlyStrength) {
      var ingredientstrength = +fs.medication.formularyIngredients[0].strengthValueNumerator;
      var dose;
      var strength;
      let reset = false;

      if (ts) //variable based
      {
        dose = ts.dose_size;
        strength = ts.dose_totalstrength;
      }
      else //standard dose or protocol based
      {

        if (fs.interval_type == IntervalType.protocol) {
          dose = this.copydose.nativeElement.value;
          strength = this.totalstrengthprotocol.nativeElement.value;
        }
        else {
          dose = this.prescription.get("posology.strength.dose_size").value;
          strength = this.prescription.get("posology.strength.totalstrength").value;
        }
      }
      //convert
      if (reverse) //dose to SN
      {
        //if dose is a range - set read only strength range
        if (dose && dose.toString().indexOf('-') != -1) {
          let components = dose.toString().split('-');
          if (components.length == 2) {
            let comp1 = components[0];
            let comp2 = components[1];



            if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
              let strengthcomp1 = (comp1 * ingredientstrength);
              let strengthcomp2 = (comp2 * ingredientstrength);

              if (+strengthcomp1 >= this.maxLimitDose || +strengthcomp2 >= this.maxLimitDose) {
                reset = true;
              }
              let strength = strengthcomp1 + "-" + strengthcomp2
              //set values
              if (ts) //timeslot based
              {
                if (!reset)
                  ts.dose_totalstrength = strength;
                else {
                  ts.dose_size = null;
                  ts.dose_totalstrength = null;
                }
              }
              else //standard dose based
              {
                if (fs.interval_type == IntervalType.protocol) {
                  if (!reset)
                    this.totalstrengthprotocol.nativeElement.value = strength;
                  else {
                    this.copydose.nativeElement.value = "";
                    this.totalstrengthprotocol.nativeElement.value = "";
                  }

                }
                else {
                  if (!reset && strength)
                    this.prescription.get("posology.strength.totalstrength").setValue(strength);
                  else {
                    this.prescription.get("posology.strength.dose_size").setValue("");
                    this.prescription.get("posology.strength.totalstrength").setValue("");
                  }
                }
              }
            }
          }
        }
        else {
          //not a dose range
          //calculated strength is dose times ingredient strength
          dose = +dose;
          strength = dose * ingredientstrength;

          if (+strength >= this.maxLimitDose) {
            reset = true;
          }
          //set values
          if (ts) //timeslot based
          {
            if (!reset) {
              ts.dose_totalstrength = strength;//strength.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
            }
            else {
              ts.dose_size = null;
              ts.dose_totalstrength = null;
            }
          }
          else //standard dose based
          {
            if (fs.interval_type == IntervalType.protocol) {
              if (!reset)
                this.totalstrengthprotocol.nativeElement.value = strength;// strength.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
              else {
                this.copydose.nativeElement.value = "";
                this.totalstrengthprotocol.nativeElement.value = "";
              }
            }
            else {
              if (!reset && strength)
                this.prescription.get("posology.strength.totalstrength").setValue(strength);//this.prescription.get("posology.strength.totalstrength").setValue(strength.toFixed(this.formsettings.precision).replace(/\.0+$/g, ''));
              else {
                this.prescription.get("posology.strength.dose_size").setValue("");
                this.prescription.get("posology.strength.totalstrength").setValue("");
              }
            }
          }
        }
      }
      else //SN to dose
      {
        //if strength is a range - set  dose range
        if (strength && strength.toString().indexOf('-') != -1) {
          let components = strength.toString().split('-');
          if (components.length == 2) {
            let comp1 = components[0];
            let comp2 = components[1];
            if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity && ingredientstrength > 0) {
              let dosecomp1 = (comp1 / ingredientstrength);
              let dosecomp2 = (comp2 / ingredientstrength);

              if (+dosecomp1 >= this.maxLimitDose || +dosecomp2 >= this.maxLimitDose) {
                reset = true;
              }
              let dose = dosecomp1 + "-" + dosecomp2
              //set values
              if (ts) //timeslot based
              {
                if (!reset)
                  ts.dose_size = dose;
                else {
                  ts.dose_size = null;
                  ts.dose_totalstrength = null;
                }
              }
              else //standard dose based
              {
                if (fs.interval_type == IntervalType.protocol) {
                  if (!reset)
                    this.copydose.nativeElement.value = dose;
                  else {
                    this.copydose.nativeElement.value = "";
                    this.totalstrengthprotocol.nativeElement.value = "";
                  }

                }
                else {
                  if (!reset)
                    this.prescription.get("posology.strength.dose_size").setValue(dose);
                  else {
                    this.prescription.get("posology.strength.dose_size").setValue("");
                    this.prescription.get("posology.strength.totalstrength").setValue("");
                  }
                }
              }
            }
          }
        }
        else {
          dose = +dose;
          //dose is entered strength divided by ingredient stregnth
          if (ingredientstrength > 0 && strength > 0) {
            dose = strength / ingredientstrength;
          }
          else
            reset = true;

          if (+dose >= this.maxLimitDose) {
            reset = true;
          }

          //set values
          if (ts) //variable based
          {
            if (!reset) {
              ts.dose_size = dose;// dose.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
            }
            else {
              ts.dose_size = null;
              ts.dose_totalstrength = null;
            }
          }
          else //standard dose or protocol based
          {
            if (fs.interval_type == IntervalType.protocol) {
              if (!reset)
                this.copydose.nativeElement.value = dose;// dose.toFixed(this.formsettings.precision).replace(/\.0+$/g, '');
              else {
                this.copydose.nativeElement.value = "";
                this.totalstrengthprotocol.nativeElement.value = "";
              }
            }
            else {
              if (!reset)
                this.prescription.get("posology.strength.dose_size").setValue(dose, { emitEvent: false });//this.prescription.get("posology.strength.dose_size").setValue(dose.toFixed(this.formsettings.precision).replace(/\.0+$/g, ''), { emitEvent: false });
              else {
                this.prescription.get("posology.strength.dose_size").setValue("");
                this.prescription.get("posology.strength.totalstrength").setValue("");
              }
            }
          }
        }

      }
    }
  }

  Calculator_DosePerKgM2(operation = "1", ts: Timeslot, fs: FormSettings) {
    let calctypevalue;
    if (this.prescription.get('posology.strength.calculatortype').value == "kg")
      calctypevalue = this.appService.refWeightValue;
    else if (this.prescription.get('posology.strength.calculatortype').value == "ikg")
      calctypevalue = this.appService.idealWeightValue;
    else if (this.prescription.get('posology.strength.calculatortype').value == "m2")
      calctypevalue = this.appService.bodySurfaceArea;

    if (operation == "1") { //convert dose to dose/kg or dose /m2
      let dose;
      //get dose
      if (fs.dose_type == DoseType.strength) {
        if (ts)
          dose = ts.dose_strength_neumerator;
        else {
          if (fs.interval_type == IntervalType.protocol) {
            dose = +this.copydose.nativeElement.value;
          } else {
            dose = +this.prescription.get("posology.strength.dose_strength_neumerator").value;
          }
        }
      }
      else if (fs.dose_type == DoseType.units) {
        if (ts)
          dose = ts.dose_size;
        else {
          if (fs.interval_type == IntervalType.protocol) {
            dose = this.copydose.nativeElement.value;
          }
          else {
            dose = this.prescription.get("posology.strength.dose_size").value;
          }
        }
        //numerator only strength. 
        if (fs.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(fs.medication.formularyIngredients[0].strengthValueDenominator) && !this.formsettings.vtmstyle) {
          if (dose && dose.toString().indexOf('-') != -1) {
            let components = dose.toString().split('-');
            if (components.length == 2) {
              let comp1 = components[0];
              let comp2 = components[1];
              if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
                let calccomp1 = (+comp1 * +fs.medication.formularyIngredients[0].strengthValueNumerator);
                let calccomp2 = (+comp2 * +fs.medication.formularyIngredients[0].strengthValueNumerator);
                dose = calccomp1 + "-" + calccomp2
              }
            }
          }
          else {
            dose = dose * +fs.medication.formularyIngredients[0].strengthValueNumerator;
          }
        }
      }

      //reset value to calculator input box
      if (ts)
        ts.calculatorinput = null;
      else
        this.SetObjectiveFormValue("posology.strength.calculatorinput", "")


      if (dose) {
        let doseperkgorm2;
        if (dose && dose.toString().indexOf('-') != -1) {
          let components = dose.toString().split('-');
          if (components.length == 2) {
            let comp1 = components[0];
            let comp2 = components[1];

            if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
              let calccomp1 = (+comp1 / calctypevalue);
              let calccomp2 = (+comp2 / calctypevalue);
              doseperkgorm2 = calccomp1 + "-" + calccomp2
            }
          }
        }
        else {
          doseperkgorm2 = +dose / +calctypevalue;
        }

        //set value to calculator input box
        if (ts)
          ts.calculatorinput = doseperkgorm2;
        else
          this.SetObjectiveFormValue("posology.strength.calculatorinput", doseperkgorm2)
      }
    }
    else {//convert dose/kg or dose /m2 to  dose

      var calculatorinput
      if (ts)
        calculatorinput = ts.calculatorinput
      else
        calculatorinput = this.prescription.get("posology.strength.calculatorinput").value;

      let calculateddose;

      if (calculatorinput) {
        if (calculatorinput.toString().indexOf('-') != -1) {
          let components = calculatorinput.toString().split('-');
          if (components.length == 2) {
            let comp1 = components[0];
            let comp2 = components[1];
            if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
              let calccomp1 = (+comp1 * calctypevalue);
              let calccomp2 = (+comp2 * calctypevalue);
              calculateddose = calccomp1 + "-" + calccomp2
            }
            else
              calculateddose = "";
          }
        }
        else {
          calculateddose = +calculatorinput * calctypevalue; //this.FixToDecimalPlaces(+calculatorinput * this.appService.refWeightValue);
        }
      }

      if (!calculateddose)
        calculateddose = "";
      //set  value to respective dose fields
      if (fs.dose_type == DoseType.strength) {
        if (ts)
          ts.dose_strength_neumerator = calculateddose;
        else {
          if (fs.interval_type == IntervalType.protocol)
            this.copydose.nativeElement.value = calculateddose;
          else
            this.prescription.get("posology.strength.dose_strength_neumerator").setValue(calculateddose);
        }
      }
      else if (fs.dose_type == DoseType.units) {

        if (calculateddose.toString().indexOf('-') != -1) {
          let components = calculateddose.toString().split('-');
          if (components.length == 2) {
            let comp1 = components[0];
            let comp2 = components[1];
            if (!isNaN(+comp1) && +comp1 > 0 && +comp1 != Infinity && !isNaN(+comp2) && +comp2 > 0 && +comp2 != Infinity) {
              if (fs.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(fs.medication.formularyIngredients[0].strengthValueDenominator) && !this.formsettings.vtmstyle) {
                let calccomp1 = (+comp1 / +fs.medication.formularyIngredients[0].strengthValueNumerator);
                let calccomp2 = (+comp2 / +fs.medication.formularyIngredients[0].strengthValueNumerator);
                calculateddose = calccomp1 + "-" + calccomp2
              }
              else {
                calculateddose = comp1 + "-" + comp2;
              }

            }
            else
              calculateddose = "";
          }
        }
        else {
          if (fs.medication.formularyIngredients.length == 1 && FormSettings.IsNullOrEmpty(fs.medication.formularyIngredients[0].strengthValueDenominator) && !this.formsettings.vtmstyle) {
            calculateddose = calculateddose == "" ? calculateddose : calculateddose / +fs.medication.formularyIngredients[0].strengthValueNumerator;
          }
        }

        //set values 
        if (ts)
          ts.dose_size = calculateddose;
        else {
          if (fs.interval_type == IntervalType.protocol)
            this.copydose.nativeElement.value = calculateddose;
          else
            this.prescription.get("posology.strength.dose_size").setValue(calculateddose);
        }

      }
    }
  }
  Calculator_DoseRatePerKgM2(operation = "1", ts: Timeslot, fs: FormSettings) {

    if (operation == "1") { //convert doserate to doserate/kg or doserate /m2

      //get doserate
      let doserate;


      //reset value to calculator input box
      if (ts) {
        doserate = ts.infusiondoserate
        ts.calculatorinput_doserate = null;
      }
      else {
        doserate = +this.prescription.get("infusiondoserate").value;
        this.SetObjectiveFormValue("posology.strength.calculatorinput_doserate", "")
      }

      if (doserate) {
        var doseperkgorm2;
        if (this.prescription.get('posology.strength.calculatortype_doserate').value == "kg")
          doseperkgorm2 = +doserate / this.appService.refWeightValue;//this.FixToDecimalPlaces(+doserate / this.appService.refWeightValue);
        else if (this.prescription.get('posology.strength.calculatortype_doserate').value == "ikg")
          doseperkgorm2 = +doserate / this.appService.idealWeightValue;//this.FixToDecimalPlaces(+doserate / this.appService.idealWeightValue);
        else if (this.prescription.get('posology.strength.calculatortype_doserate').value == "m2")
          doseperkgorm2 = +doserate / this.appService.bodySurfaceArea;// this.FixToDecimalPlaces(+doserate / this.appService.bodySurfaceArea);

        //set value to calculator input box
        if (ts)
          ts.calculatorinput_doserate = doseperkgorm2;
        else
          this.SetObjectiveFormValue("posology.strength.calculatorinput_doserate", doseperkgorm2)
      }
    }
    else {//convert doserate/kg or doserate /m2 to  doserate

      var calculatorinput_doserate
      if (ts)
        calculatorinput_doserate = ts.calculatorinput_doserate
      else
        calculatorinput_doserate = +this.prescription.get("posology.strength.calculatorinput_doserate").value;

      var calculateddoserate;
      if (calculatorinput_doserate) {
        if (this.prescription.get('posology.strength.calculatortype_doserate').value == "kg")
          calculateddoserate = +calculatorinput_doserate * this.appService.refWeightValue;//this.FixToDecimalPlaces(+calculatorinput_doserate * this.appService.refWeightValue);
        else if (this.prescription.get('posology.strength.calculatortype_doserate').value == "ikg")
          calculateddoserate = +calculatorinput_doserate * this.appService.idealWeightValue;//this.FixToDecimalPlaces(+calculatorinput_doserate * this.appService.idealWeightValue);
        else if (this.prescription.get('posology.strength.calculatortype_doserate').value == "m2")
          calculateddoserate = +calculatorinput_doserate * this.appService.bodySurfaceArea;//this.FixToDecimalPlaces(+calculatorinput_doserate * this.appService.bodySurfaceArea);
      }

      if (!calculateddoserate)
        calculateddoserate = "";
      //set  value to respective dose fields

      if (ts)
        ts.infusiondoserate = calculateddoserate;
      else
        this.prescription.get("infusiondoserate").setValue(calculateddoserate);
    }
  }
  SetCalculatorType(e = null) {
    this.SetObjectiveFormValue("posology.strength.calculatortype", e)
  }
  SetCalculatorType_doserate(e = null) {
    this.SetObjectiveFormValue("posology.strength.calculatortype_doserate", e)
  }

  UpdateCalculatorInputForVariableDose(fs: FormSettings) {
    this.formsettings.dosing_pattern.forEach((ts) => {
      this.Calculator_DosePerKgM2("1", ts, fs);
      this.FixDecimalPlaces(["calculatorinput"], ts);
    })
  }

  UpdateCalculatorInputForVariableDose_doserate(fs: FormSettings) {
    this.formsettings.infusion_rate_pattern.forEach((ts) => {
      this.Calculator_DoseRatePerKgM2("1", ts.starttime, fs);
      this.FixDecimalPlaces(["calculatorinput_doserate"], ts.starttime);

    })
  }

  RoundPrescribingDose(ts: Timeslot, fs: FormSettings) {
    if (this.prescription.get("posology.strength.calculatortype").value == null || this.prescription.get("posology.strength.calculatortype").value == "null") {
      if (ts) {
        if (fs.dose_type == DoseType.strength) {
          var dose = fs.RoundtoFactor(+ts.dose_strength_denominator);
          ts.dose_strength_denominator = dose > 0 ? dose : null;
        }
        else
          if (fs.dose_type == DoseType.units) {
            let dvalue = ts.dose_size
            if (dvalue.toString().indexOf('-') == -1) {
              var dose = fs.RoundtoFactor(+ts.dose_size);
              ts.dose_size = dose > 0 ? dose : null;
            }
            else // range
            {
              let comps = dvalue.toString().split('-');
              if (comps.length >= 2) {
                let rounded_dose = []
                comps.every(comp => {
                  let t = fs.RoundtoFactor(+comp);
                  if (t && t != NaN && t != Infinity)
                    rounded_dose.push(t.toString());
                  else {
                    rounded_dose = [];
                    return false;//break every loop
                  }
                  return true;
                });
                ts.dose_size = rounded_dose.join('-');
              }
            }
          }
        //in case there is a diluent, validate 
        this.ValidateDiluentDose();
      }
      else {
        if (fs.interval_type == IntervalType.protocol) {
          var dose = fs.RoundtoFactor(+this.copydose.nativeElement.value);
          this.copydose.nativeElement.value = dose > 0 ? dose : "";
        }
        else {
          if (fs.dose_type == DoseType.strength) {
            var dose = fs.RoundtoFactor(+this.prescription.get('posology.strength.dose_strength_denominator').value);
            this.SetObjectiveFormValue('posology.strength.dose_strength_denominator', dose > 0 ? dose : "");
          }
          else
            if (fs.dose_type == DoseType.units) {

              let dvalue = this.prescription.get('posology.strength.dose_size').value;

              if (dvalue.toString().indexOf('-') == -1) {
                if (!this.formsettings.isNeumeratorOnlyStrength && +dvalue >= this.maxLimitDose) {
                  this.prescription.get('posology.strength.dose_size').setValue("");
                }
                else {
                  var dose = fs.RoundtoFactor(+this.prescription.get('posology.strength.dose_size').value);
                  this.SetObjectiveFormValue('posology.strength.dose_size', dose > 0 ? dose : "");
                }
              }
              else // range
              {
                let comps = dvalue.toString().split('-');
                if (comps.length >= 2) {
                  let rounded_dose = []
                  comps.every(comp => {
                    if (!this.formsettings.isNeumeratorOnlyStrength && +comp >= this.maxLimitDose) {
                      this.prescription.get('posology.strength.dose_size').setValue("");
                    }
                    else {
                      let t = fs.RoundtoFactor(+comp);
                      if (t && t != NaN && t != Infinity)
                        rounded_dose.push(t.toString());
                      else {
                        rounded_dose = [];
                        return false;//break every loop
                      }
                      return true;
                    }
                  });
                  this.SetObjectiveFormValue('posology.strength.dose_size', rounded_dose.join('-'));

                }
              }
            }
        }
      }
    }
  }

  SetChangedReviewStatus(reviewstatus: MetaReviewstatus) {
    this.formsettings.currentreviewstatus = reviewstatus;
    this.prescription.get("reviewcomments").updateValueAndValidity();

  }

  showNursingInstructions() {
    //open the popup to show nursing instrustions
    //this.subjects.nursingInstruction.next(this.formsettings.nursinginstructions);
    this.subjects.nursingInstruction.next({ "source": "prescriptionForm", "prescription_id": this.editingPrescription?.prescription_id, "data": this.formsettings.nursinginstructions });
  }

  SetIsPcaNcaDrug() {
    let returnvalue = false;
    let pcaconfig = this.appService.appConfig.AppSettings.PCANCADrugs;
    let drug_bnf = "";
    let drug_fdb = "";
    if (this.medication.formularyAdditionalCodes) {

      const bnfrow = this.medication.formularyAdditionalCodes.filter(x => x.additionalCodeSystem == "BNF");
      if (bnfrow.length > 0)
        drug_bnf = bnfrow[0].additionalCode;

      const fdbfow = this.medication.formularyAdditionalCodes.filter(x => x.additionalCodeSystem == "FDB");
      if (fdbfow.length > 0)
        drug_fdb = fdbfow[0].additionalCode;

      drug_bnf.padEnd(10, "0");
      drug_fdb.padEnd(10, "0");

      if (pcaconfig) {
        for (let arrcode of pcaconfig) {
          let drugMatchCode = "";
          let configMatchCode = (arrcode.Code ?? "").replace(/\./g, "");
          if (arrcode.CodeType.toLowerCase() == "bnf") {
            drugMatchCode = (drug_bnf ?? "").replace(/\./g, "").substring(0, configMatchCode.length)
          }
          else if (arrcode.CodeType.toLowerCase() == "fdb") {
            drugMatchCode = (drug_fdb ?? "").replace(/\./g, "").substring(0, configMatchCode.length)
          }
          if (drugMatchCode == configMatchCode) {
            returnvalue = true;
            break;
          }
        }
      }
    }
    this.showPca = returnvalue;
  }

  FixDecimalPlaces(controls = [], ts = null) {

    controls.forEach(ctrl => {
      if (this.formsettings.interval_type != IntervalType.protocol) {
        if (this.formsettings.interval_type == IntervalType.standard) {
          this.SetObjectiveFormValue(ctrl, this.FixToDecimalPlaces(this.prescription.get(ctrl).value));
        }
        else if (ts) {
          ts[ctrl] = this.FixToDecimalPlaces(ts[ctrl]);
        }
      }
      else {
        if (ctrl == "copydose" && this.copydose.nativeElement) {
          this.copydose.nativeElement.value = this.FixToDecimalPlaces(this.copydose.nativeElement.value);
        }
        else if (ctrl == "totalstrengthprotocol" && this.totalstrengthprotocol.nativeElement) {
          this.totalstrengthprotocol.nativeElement.value = this.FixToDecimalPlaces(this.totalstrengthprotocol.nativeElement.value);
        }
        else if (ctrl == "posology.strength.calculatorinput") {
          this.SetObjectiveFormValue(ctrl, this.FixToDecimalPlaces(this.prescription.get(ctrl).value));
        }
      }
    });


    // if (this.formsettings.interval_type == IntervalType.standard) {
    //   this.SetObjectiveFormValue("posology.strength.dose_size", this.FixToDecimalPlaces(this.prescription.get('posology.strength.dose_size').value));
    //   this.SetObjectiveFormValue("posology.strength.dose_strength_neumerator", this.FixToDecimalPlaces(this.prescription.get('posology.strength.dose_strength_neumerator').value));
    //   this.SetObjectiveFormValue("posology.strength.dose_strength_denominator", this.FixToDecimalPlaces(this.prescription.get('posology.strength.dose_strength_denominator').value));
    //   this.SetObjectiveFormValue("posology.strength.totalstrength", this.FixToDecimalPlaces(this.prescription.get('posology.strength.totalstrength').value));
    //   this.SetObjectiveFormValue("posology.strength.calculatorinput", this.FixToDecimalPlaces(this.prescription.get('posology.strength.calculatorinput').value));
    //   this.SetObjectiveFormValue("posology.strength.calculatorinput_doserate", this.FixToDecimalPlaces(this.prescription.get('posology.strength.calculatorinput_doserate').value));
    //   this.SetObjectiveFormValue("infusionduration", this.FixToDecimalPlaces(this.prescription.get('infusionduration').value));
    //   this.SetObjectiveFormValue("infusiondoserate", this.FixToDecimalPlaces(this.prescription.get('infusiondoserate').value));
    //   this.SetObjectiveFormValue("infusionrate", this.FixToDecimalPlaces(this.prescription.get('infusionrate').value));


    // }
    // else if (this.formsettings.interval_type == IntervalType.variable) {
    //   this.formsettings.dosing_pattern.forEach(ts => {

    //     ts.dose_size = this.FixToDecimalPlaces(ts.dose_size);
    //     ts.dose_strength_neumerator = this.FixToDecimalPlaces(ts.dose_strength_neumerator);
    //     ts.dose_strength_denominator = this.FixToDecimalPlaces(ts.dose_strength_denominator);
    //     ts.dose_totalstrength = this.FixToDecimalPlaces(ts.dose_totalstrength);
    //     ts.calculatorinput = this.FixToDecimalPlaces(ts.calculatorinput);
    //     ts.calculatorinput_doserate = this.FixToDecimalPlaces(ts.calculatorinput_doserate);
    //     ts.infusiondoserate = this.FixToDecimalPlaces(ts.infusiondoserate);
    //     ts.infusionrate = this.FixToDecimalPlaces(ts.infusionrate);
    //   });
    // }
    // else if (this.formsettings.interval_type == IntervalType.protocol) {
    //   this.formsettings.protocol_dosing_pattern.forEach(day => {
    //     day.intervalpattern.forEach(ts => {
    //       ts.dose_size = this.FixToDecimalPlaces(ts.dose_size);
    //       ts.dose_strength_neumerator = this.FixToDecimalPlaces(ts.dose_strength_neumerator);
    //       ts.dose_strength_denominator = this.FixToDecimalPlaces(ts.dose_strength_denominator);
    //       ts.dose_totalstrength = this.FixToDecimalPlaces(ts.dose_totalstrength);
    //       ts.calculatorinput = this.FixToDecimalPlaces(ts.calculatorinput);
    //       ts.calculatorinput_doserate = this.FixToDecimalPlaces(ts.calculatorinput_doserate);
    //       ts.infusiondoserate = this.FixToDecimalPlaces(ts.infusiondoserate);
    //       ts.infusionrate = this.FixToDecimalPlaces(ts.infusionrate);

    //     });
    //   });
    // }
  }
}


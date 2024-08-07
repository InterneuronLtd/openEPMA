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
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApirequestService } from './services/apirequest.service';
import { AppService } from './services/app.service';
import { SubjectsService } from './services/subjects.service';
import { Prescription, PrescriptionMedicaitonSupply } from "src/app/models/EPMA"
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement, action, DataContract } from './models/filter.model';
import moment from 'moment';
import { RefWeightHeightComponent } from './components/ref-weight-height/ref-weight-height.component';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Observation, PersonObservationScale } from './models/observations.model';
import { RecRefHeightComponent } from './components/rec-ref-height/rec-ref-height.component';
import { InpatientPrescribingComponent } from './inpatient-prescribing/inpatient-prescribing/inpatient-prescribing.component';
import { modules, popovers, PrescriptionContext } from './services/enum';
import { DataRequest } from './services/datarequest';
import { isArray } from 'ngx-bootstrap/chronos';
import { v4 as uuid } from 'uuid';
import { DatePickerComponent } from './components/date-picker/date-picker.component';
import { TemplateNumberComponent } from './components/template-number/template-number.component';
import { PatientInfo } from './models/WarningServiceModal';
import { RTNoificationUtilService, RTNotificationsHandlerParams, subscribeToReceivedNotification } from './notification/lib/notification.observable.util';
import { ToastrService } from 'ngx-toastr';
import { SessionStorageService } from 'angular-web-storage';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'terminus-module-epma';
  noEncountersAvailable = false;
  datePicker: boolean = false;
  startDate;
  endDate;
  numberOfEmptyTemplates: number;
  showPopOver: popovers = popovers.none;
  showTitrationChart: popovers = popovers.none;
  showChoosedate = false;

  browserName: string;
  browserVersion: any;
  browserVersionSupported: any;
  browserVersionError = false;
  conflictuserid = "";
  showPopOverPatientDrug: popovers;
  showAdustInfusion: popovers = popovers.none;



  @Input() set datacontract(value: DataContract) {
    this.appService.personId = value.personId;
    this.appService.apiService = value.apiService;
    this.subjects.unload = value.unload;
    this.initConfigAndGetMeta(this.appService.apiService);
    this.showPrintIcon = false;
    if (value.moduleAction)
      this.subscriptions.add(value.moduleAction.subscribe((e) => {
        this.ModuleAction(e);
      }));
    if (value.additionalInfo) {
      let terminusmodule = value.additionalInfo.find(x => x.key == "currentmodule");
      if (terminusmodule)
        this.appService.currentTerminusModle = terminusmodule.value;
    }
  }

  @Output() frameworkAction = new EventEmitter<string>();

  subscriptions: Subscription = new Subscription();
  loadDrugChart: number = 0;
  currentmodule: modules = modules["app-drug-chart"];
  editingPrescription: Prescription;
  clonePrescription: boolean = false;
  cloningExternally: boolean = false;;

  bsModalRef: BsModalRef;
  groupFilterType: string = "Basic";
  showdrugChart: boolean = false;
  showPrescribingForm = false;
  totalmetadatarequests = 15;
  Showtherapies = "Active";
  Sorttherapie = "DESCRIPTION-ASC";
  FilterRoutesby = "All routes";
  medicationAdministrationEmptyTemplate: any = false;
  popover_prescriptioncontext: any;
  AllRoutes: string[] = [];
  isCalledOnce: boolean = false;
  showPrintIcon = false;
  printing = false;

  basicgrouping = ['Stat', 'VTE', 'Antimicrobials', 'Diabetics', 'Variable/Continuous infusion', 'PRN', 'IV Fluid', 'Regular drugs']

  @ViewChild('open_refreshmessage') open_refreshmessage: ElementRef;
  @ViewChild('close_pform') close_pform: ElementRef;

  isLoading = false;

  ModuleAction(e) {
    console.log(e)
    if (e == "SECONDARY_MODULE_CLOSED") {
      this.subjects.showBannerWarnings.next(true);
      this.TriggerWarningUpdateCheck(() => {
        this.subjects.recheckBasketWarnings.next();
      });
    }
    if (e == "RECORD_WEIGHT") {
      this.openRecordWeightModal('D');
    }
  }

  LoadModule(module) {
    // this.dr.RefreshIfDataVersionChanged(() => { });

    switch (module) {
      case "app-inpatient-prescribing": this.currentmodule = modules["app-inpatient-prescribing"];
        break;
      case "app-reconciliation-lists": this.currentmodule = modules["app-reconciliation-lists"];
        break;
      case "app-oplist": this.currentmodule = modules["app-oplist"];
        break;
      case "app-drug-chart": {
        this.changeGroupType(this.groupFilterType);
        // this.filterDateAndRought("Active", this.FilterRoutesby);
        this.currentmodule = modules["app-drug-chart"]
      };
        break;
      case "app-therapy-overview": {
        this.filterDateAndRought("ALL", this.FilterRoutesby);
        this.currentmodule = modules["app-therapy-overview"];
      };
        break;
      case "app-inpatient-prescribing-edit": this.currentmodule = modules["app-inpatient-prescribing-edit"]
        break;
      case "none": this.currentmodule = undefined

    }
  }

  displayPrintIcon() {
    this.showPrintIcon = true;
  }

  createTherapyFilter() {
    let condition = "person_id = @person_id and encounter_id = @encounter_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY prescription_id desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }
  PrescribingCancelled() {
    this.LoadModule(modules["app-drug-chart"]);
    this.changeGroupType(this.groupFilterType);
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.cloningExternally = false;

  }

  PrescribingFinished() {
    this.appService.Prescription.forEach(p => this.appService.UpdatePrescriptionCompletedStatus(p));
    this.isCalledOnce = false;
    this.LoadModule(modules["app-drug-chart"]);
    this.changeGroupType(this.groupFilterType);
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.cloningExternally = false;
    this.TriggerWarningUpdateCheck();
  }

  EditPrescriptionSaved(p: Prescription) {
    var basket = new InpatientPrescribingComponent(this.appService, this.apiRequest, null, this.dr, this.subjects);
    p.prescriptioncontext_id = this.appService.MetaPrescriptioncontext.find(x => x.context === PrescriptionContext.Inpatient).prescriptioncontext_id;

    basket.PrescriptionBasket.push(p);
    basket.finishprescribing.subscribe(e => {
      this.editingPrescription = null;
      this.clonePrescription = false;
      this.cloningExternally = false;
      //this.close_pform.nativeElement.click();
      this.subjects.closePform.next();
      this.showPrescribingForm = false;
      this.subjects.refreshDrugChart.next();
      this.changeGroupType(this.groupFilterType);
      this.TriggerWarningUpdateCheck();
    });
    basket.SaveAllPrescriptions(true);
  }

  EditPrescriptionCancelled() {
    this.editingPrescription = null;
    this.clonePrescription = false;
    this.cloningExternally = false;

    // this.close_pform.nativeElement.click();
    this.showPrescribingForm = false;
  }

  EmitFrameworkEvent(e: string) {
    this.frameworkAction.emit(e);
  }

  detectBrowserName() {
    const agent = window.navigator.userAgent.toLowerCase()
    switch (true) {
      case agent.indexOf('edge') > -1:
        return 'edge';
      case agent.indexOf('opr') > -1 && !!(<any>window).opr:
        return 'opera';
      case agent.indexOf('chrome') > -1 && !!(<any>window).chrome:
        return 'chrome';
      case agent.indexOf('trident') > -1:
        return 'ie';
      case agent.indexOf('firefox') > -1:
        return 'firefox';
      case agent.indexOf('safari') > -1:
        return 'safari';
      default:
        return 'other';
    }
  }
  detectBrowserVersion() {
    var userAgent = navigator.userAgent, tem,
      matchTest = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

    if (/trident/i.test(matchTest[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(userAgent) || [];
      return 'IE ' + (tem[1] || '');
    }

    if (matchTest[1] === 'Chrome') {
      tem = userAgent.match(/\b(OPR|Edge)\/(\d+)/);
      if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }

    matchTest = matchTest[2] ? [matchTest[1], matchTest[2]] : [navigator.appName, navigator.appVersion, '-?'];

    if ((tem = userAgent.match(/version\/(\d+)/i)) != null) matchTest.splice(1, 1, tem[1]);
    return +matchTest[1]
  }

  constructor(private subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService, private modalService: BsModalService, private cd: ChangeDetectorRef, private dr: DataRequest, private toastrService: ToastrService, private sessionStorageService: SessionStorageService) {

    this.isCalledOnce = false;
    this.appService.Choosenfilterdate = new Date();

    if (!environment.production)
      this.initDevMode();

    this.subscriptions.add(this.subjects.editPrescription.subscribe((p: Prescription) => {
      this.editingPrescription = p;
      this.clonePrescription = false;
      this.cloningExternally = false;
      this.showPrescribingForm = true;
      this.cloningExternally = false;

      // this.open_pform.nativeElement.click();
    }));

    this.subscriptions.add(this.subjects.clonePrescription.subscribe((p: Prescription) => {
      this.editingPrescription = p;
      this.clonePrescription = true;
      this.cloningExternally = true;
      //this.showPrescribingForm = true;

      this.LoadModule(modules['app-inpatient-prescribing-edit']);
      //this.open_pform.nativeElement.click();
    }));

    this.subscriptions.add(this.subjects.encounterChange.subscribe(() => {
      this.appService.isAppDataReady = false;
      this.GetMetaData();
      if (this.currentmodule != modules['app-drug-chart'] && !this.appService.outpatientPrescribingMode)
        this.LoadModule(modules['app-drug-chart']);
    }));

    this.subscriptions.add(this.subjects.movePatientDrugs.subscribe((prescriptions: Array<Prescription>) => {
      this.MovePatientDrugs(prescriptions);
    }));

    this.subscriptions.add(
      this.subjects.pharmacyReview.subscribe((prescription: Prescription) => {
        this.popover_prescriptioncontext = prescription;
        this.showTitrationChart = this.showPopOver = popovers['app-pharmacy-review'];
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(
      this.subjects.prescriptionHistory.subscribe((prescription: Prescription) => {
        this.popover_prescriptioncontext = prescription;
        this.showTitrationChart = this.showPopOver = popovers['app-prescription-history'];
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.additionalAdministration.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-additional-administration']
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.supplyRequest.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-supply-request']
        this.appService.isTitrationPopOverOpen = false;

      }));
    this.subscriptions.add(this.subjects.addBolus.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-add-bolus']
        this.appService.isTitrationPopOverOpen = false;

      }));
    this.subscriptions.add(this.subjects.adjustInfusion.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showAdustInfusion = popovers['app-adjust-infusion'];
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.changeInfusion.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-change-infusion'];
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.pauseInfusion.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-pause-infusion'];
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.restartInfusion.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-restart-infusion']
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.comments.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-comments']
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.nursingInstruction.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-nursing-instruction'];
        this.appService.isTitrationPopOverOpen = false;

      }));
    this.subscriptions.add(this.subjects.viewReminder.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-view-reminder']
        this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.patientDrug.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        // this.showTitrationChart = 
        this.showPopOverPatientDrug = popovers['app-record-patientdrug']
        //this.appService.isTitrationPopOverOpen = false;

      }));

    this.subscriptions.add(this.subjects.titrationChart.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = popovers['app-titration-chart']
        this.appService.isTitrationPopOverOpen = true;
        this.cd.detectChanges();
      }));
    this.subscriptions.add(this.subjects.endInfusion.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showTitrationChart = this.showPopOver = popovers['app-end-infusion']
        this.appService.isTitrationPopOverOpen = false;
        this.cd.detectChanges();
      }));
    this.subscriptions.add(this.subjects.showAwayPeriod.subscribe
      ((event: any) => {
        this.popover_prescriptioncontext = event;
        this.showPopOver = popovers['app-away-period']
      }));


    this.subscriptions.add(this.subjects.closeAppComponentPopover.subscribe((source) => {
      if (source == popovers["app-adjust-infusion"]) {
        this.showAdustInfusion = popovers.none;
      } else {
        if (this.appService.isTitrationPopOverOpen) {
          this.showTitrationChart = this.showPopOver;
        }
        else if (this.showPopOverPatientDrug == popovers['app-record-patientdrug']) {
          this.showPopOverPatientDrug = popovers.none
        } else {
          this.showTitrationChart = this.showPopOver = popovers.none;
        }
        this.appService.isTitrationPopOverOpen = false;
      }
    }));

    this.subscriptions.add(this.subjects.captureWeight.subscribe(() => {
      this.openRecordWeightModal('D');
    }));

    this.subscriptions.add(this.subjects.frameworkEvent.subscribe((e: string) => {
      this.EmitFrameworkEvent(e);
    }));

    this.subscriptions.add(this.subjects.loadModule.subscribe((e: string) => {
      this.LoadModule(e);
    }));

    this.subscriptions.add(this.subjects.reloadCurrentModule.subscribe(() => {
      this.ReloadCurrentLoadModule();
    }));

    this.subscriptions.add(this.subjects.ShowRefreshPageMessage.subscribe((conflictuserid: string) => {
      this.conflictuserid = "Another user";

      if (this.open_refreshmessage.nativeElement) {
        this.showPopOver = popovers.none;
        this.conflictuserid = conflictuserid;
        this.open_refreshmessage.nativeElement.click();
      }
      else
        this.ShowRefreshPageMessage();
    }));

    this.EmitFrameworkEvent("COLLAPSE_PATIENT_LIST");

    this.subscribeForRTNotifications();


  }

  subscribeForRTNotifications() {

    const notificationTypes = [
      /*For reference only:
      1) No need to pass anything except name if registered in config
      {name: 'MED_ADM_STATUS_CHANGED', msgPropNameOrMsg: 'notif_med_admin_status_change_msg', currentModuleName: 'app-epma'},
      {name: 'MED_PRESCRIBE_DRAFT', msgPropNameOrMsg: 'notif_med_admin_draft_msg', currentModuleName: 'app-epma'},
      {name: 'MED_PRESCRIBED', msgPropNameOrMsg: 'notif_med_prescribed_msg',  currentModuleName: 'app-epma'},
      {name: 'MED_ADMINISTERED', msgPropNameOrMsg: 'notif_med_administered_msg', currentModuleName: 'app-epma'},
      {name: 'MED_ADMINISTRATION_UNDONE', msgPropNameOrMsg: 'notif_med_administered_undone_msg', currentModuleName: 'app-epma'}
      */
      { name: 'MED_ADM_STATUS_CHANGED', msgPropNameOrMsg: 'notif_med_admin_status_change_msg' },
      { name: 'MED_PRESCRIBE_DRAFT', msgPropNameOrMsg: 'notif_med_admin_draft_msg' },
      { name: 'MED_PRESCRIBED', msgPropNameOrMsg: 'notif_med_prescribed_msg' },
      { name: 'MED_ADMINISTERED', msgPropNameOrMsg: 'notif_med_administered_msg' },
      { name: 'MED_ADMINISTRATION_UNDONE', msgPropNameOrMsg: 'notif_med_administered_undone_msg' }
    ];

    subscribeToReceivedNotification('EPMA_NOTIFICATION_APP_COMP', (res) => {
      const paramData: RTNotificationsHandlerParams = {
        getAppSettings: () => {
          console.log('calling alert for appsettings session',
            this.sessionStorageService.get('epma:appSettings'));
          return this.sessionStorageService.get('epma:appSettings');
        },
        notificationTypes
      };
      new RTNoificationUtilService().rtNotificationsHandler(paramData, res);
    });
  }


  ShowRefreshPageMessage() {
    window.location.reload();
    // this.open_refreshmessage.nativeElement.click();

    // this.appService.isAppDataReady = false;
    // this.GetMetaData();
    // if (this.currentmodule != modules['app-drug-chart'])
    //   this.LoadModule(modules['app-drug-chart']);
  }

  ReloadCurrentLoadModule() {
    let tempmodule = this.currentmodule;
    this.LoadModule("none");
    this.LoadModule(tempmodule);
  }

  ShowWarnings() {
    this.subjects.showWarnings.next();
  }
  ShowAwayPeriod() {
    this.subjects.showAwayPeriod.next();
  }
  EncountersLoaded(e: boolean) {

    if (!e)
      this.noEncountersAvailable = true;
  }

  ngOnDestroy() {
    this.appService.logToConsole("app component being unloaded");
    if (this.appService.warningService) {
      this.appService.warningService.contexts.forEach(w => {
        w.resetWarningService();
      });
    }
    this.appService.encounter = null;
    this.appService.personId = null;
    this.appService.isCurrentEncouner = null;
    this.appService.reset();
    this.subscriptions.unsubscribe();
    this.dr.ngOnDestroy();
    // if (this.appService)
    //   this.appService.warningServiceIPContext.resetWarningService();
    this.appService.warningService = null;
    this.appService = null;

    this.subjects.unload.next("app-epma");
  }

  // initDevMode() {
  //   //commment out to push to framework - 3lines
  //   this.appService.personId = "d91ef1fa-e9c0-45ba-9e92-1e1c4fd468a2";// "0422d1d0-a9d2-426a-b0b2-d21441e2f045";//"429904ca-19c1-4a3a-b453-617c7db513a3";//"027c3400-24cd-45c1-9e3d-0f4475336394";//"429904ca-19c1-4a3a-b453-617c7db513a3";
  //   let value: any = {};
  //   value.authService = {};
  //   value.authService.user = {};
  //   this.appService.encounter = new Encounter();
  //   this.appService.encounter.person_id = this.appService.personId;
  //   this.appService.encounter.encounter_id = "58b305c9-3753-4c5e-ac4a-eba1d19dca48"

  //   let auth = this.apiRequest.authService;
  //   auth.getToken().then((token) => {
  //     value.authService.user.access_token = token;
  //     this.initConfigAndGetMeta(value);
  //   });
  // }

  initDevMode() {
    //commment out to push to framework - 3lines  
    this.appService.personId = "d315445f-08b1-43dd-a82b-6bbd187c1457"// "441b520a-56e8-4c32-9eed-8c0c2e4b6377"//"fdd3c592-51f1-4aca-8acc-16ee966bebb8" //"68dfe39d-4ee4-407f-824b-4b57a1f131ae"  //"862fc611-a0a4-43f2-8dc4-4134fb7129ad"//"5bd254ac-5eb9-4a58-9b75-b3312d779fcc"//"e7955e6f-3384-4065-a425-0717018a9d2b"//"bef282e7-f182-4ad7-a221-f5f3c61e7919"//"68dfe39d-4ee4-407f-824b-4b57a1f131ae"  //"41f23bf6-8c4d-4aab-b0bd-a0871b324b5f"// "b0d70586-3206-4bd2-93f8-86a9947a8659"  //"c8c654c5-9272-4324-b3f0-2cf8be9a9576" //"e71e474c-7740-45ed-be41-78705f4b16bb";//"bef282e7-f182-4ad7-a221-f5f3c61e7919"//"3abf8a1b-1f94-407e-a37b-9d7481a3bd2a"// "ef45c1b8-d4cd-4c2f-afbc-fd9dda1b83ab";// "925d2652-0250-4b34-954e-7c53c7ceb5c6" //"a5092198-0843-4336-89a1-c288fbca9528"// "b2ec9a03-885a-4125-8c4c-220c78c9234d" //"40a6ed41-349d-4225-8058-ec16c4d6af00"; // "c6e089d5-21b3-4bdb-ba39-80ed6173db4a"; // '774c605e-c2c6-478d-90e6-0c1230b3b223'// "40a6ed41-349d-4225-8058-ec16c4d6af00" // "c6e089d5-21b3-4bdb-ba39-80ed6173db4a"//  "774c605e-c2c6-478d-90e6-0c1230b3b223"//"96ebefbe-a2e0-4e76-8802-e577e28fcc23";// "fe8a22fa-203d-4563-abe3-8818f37945d9";// "96ebefbe-a2e0-4e76-8802-e577e28fcc23" // //"774c605e-c2c6-478d-90e6-0c1230b3b223";//"4d05aff8-123f-4ca9-be06-f9734905c02f"//"d91ef1fa-e9c0-45ba-9e92-1e1c4fd468a2"// "027c3400-24cd-45c1-9e3d-0f4475336394" ;//  "6b187a8b-1835-42c2-9cd5-91aa0e39f0f7";//"6b187a8b-1835-42c2-9cd5-91aa0e39f0f7"//"774c605e-c2c6-478d-90e6-0c1230b3b223";//"0422d1d0-a9d2-426a-b0b2-d21441e2f045";//"6b187a8b-1835-42c2-9cd5-91aa0e39f0f7"; //"17775da9-8e71-4a3f-9042-4cdcbf97efec";// "429904ca-19c1-4a3a-b453-617c7db513a3";//"027c3400-24cd-45c1-9e3d-0f4475336394";//"429904ca-19c1-4a3a-b453-617c7db513a3";
    let value: any = {};
    value.authService = {};
    value.authService.user = {};
    let auth = this.apiRequest.authService;
    auth.getToken().then((token) => {
      value.authService.user.access_token = token;
      this.initConfigAndGetMeta(value);
    });
    //this.appService.currentTerminusModle = "outpatient epma";

  }

  initConfigAndGetMeta(value: any) {
    this.appService.apiService = value;
    this.dr.subscriptions = new Subscription();
    this.subscriptions.add(this.apiRequest.getRequest("./assets/config/EPMAConfig.json?V" + Math.random()).subscribe(
      (response) => {
        this.appService.appConfig = response;
        this.appService.baseURI = this.appService.appConfig.uris.baseuri;
        this.appService.enableLogging = this.appService.appConfig.enablelogging;
        this.browserVersionSupported = this.appService.appConfig.AppSettings.minSafariVersionSupported;
        this.appService.buffertimeAmber = this.appService.appConfig.bufferTime.buffertimeAmber;
        this.appService.criticalDrugbuffertimeAmber = this.appService.appConfig.bufferTime.buffertime_criticalDrug;
        this.appService.EnableDischargeSummaryComplete = this.appService.appConfig.EnableDischargeSummaryComplete;
        this.appService.bufferAdministered = this.appService.appConfig.bufferTime.bufferAdministered;
        this.appService.pleaseResupplyStockValidation = this.appService.appConfig.pleaseResupplyStockValidation;
        this.appService.isReasonForChangeReuired = this.appService.appConfig.isReasonForChangeReuired;
        this.appService.platfromServiceURI = this.appService.appConfig.uris.platformserviceuri;
        this.appService.DCGroups = this.appService.appConfig.AppSettings.DCGroups;
        this.appService.administrationTimeDiffInMinute = this.appService.appConfig.AppSettings.administrationTimeDiffInMinute;
        this.browserName = this.detectBrowserName();
        this.browserVersion = this.detectBrowserVersion();
        if (this.browserName == "safari") {
          if (this.browserVersion < this.browserVersionSupported) {
            this.browserVersionError = true;
          }
          else {
            this.browserVersionError = false;
          }

        }

        this.appService.outpatientPrescribingMode = false;
        if (this.appService.currentTerminusModle.toLowerCase() == this.appService.appConfig.AppSettings.opModeAppName.toLowerCase()) {
          this.appService.outpatientPrescribingMode = true;
          this.currentmodule = modules['app-oplist'];
        }

        this.subscriptions.add(this.apiRequest.getRequest(`${this.appService.baseURI}/GetObject?synapsenamespace=core&synapseentityname=person&id=${this.appService.personId}`).subscribe(
          (person) => {
            person = JSON.parse(person);
            if (person && person.dateofbirth) {
              this.appService.personDOB = person.dateofbirth as Date;
            }
            if (person && person.gendercode) {
              this.appService.gender = person.gendercode;
            }

            //get all meta before emitting events
            //all components depending on meta should perform any action only after receiveing these events
            //use await on requets that are mandatory before the below events can be fired.

            //emit events after getting initial config. //this happens on first load only.
            this.appService.logToConsole("Service reference is being published from init config");
            this.subjects.apiServiceReferenceChange.next();
            this.appService.logToConsole("personid is being published from init config");
            this.subjects.personIdChange.next();

          }));

        //Adding AppSettings to the session
        const appConfigFromParam = this.appService?.appConfig;
        const appSettingsFromParam = { ...appConfigFromParam?.AppSettings };
        this.sessionStorageService.set('epma:appSettings', appSettingsFromParam);

      }));
  }
  completeReconcilliation() {
    this.subjects.CompleteReconciliation.next();
    // this.dr.RefreshIfDataVersionChanged((result) => {
    //   if (result == false)
    //     this.subjects.CompleteReconciliation.next();
    // })
  }

  GetMetaData() {
    let decodedToken: any;
    if (this.appService.apiService) {
      decodedToken = this.appService.decodeAccessToken(this.appService.apiService.authService.user.access_token);
      if (decodedToken != null) {
        this.getUserRoles(decodedToken);
        this.appService.loggedInUserName = decodedToken.name ? (Array.isArray(decodedToken.name) ? decodedToken.name[0] : decodedToken.name) : decodedToken.IPUId;
        this.appService.logToConsole(`User Name: ${decodedToken.name}`);
        this.appService.logToConsole(`User Role: ${decodedToken.client_SynapseRoles}`);

        if (!environment.production)
          this.appService.loggedInUserName = "Dev Team";


        this.appService.logToConsole(this.appService.loggedInUserName);

        // let dataRequest = new DataRequest(this.apiRequest, this.appService);
        this.dr.getAllPrescriptionMeta(() => {

          //get actions for rbac
          this.subscriptions.add(this.apiRequest.postRequest(`${this.appService.baseURI}/GetBaseViewListByPost/rbac_actions`, this.createRoleFilter(decodedToken))
            .subscribe((response: action[]) => {
              this.appService.roleActions = response;
              this.dr.getHeightWeight(() => {
                //get scale
                this.subscriptions.add(
                  this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=personobservationscale&synapseattributename=person_id&attributevalue=" + this.appService.personId)
                    .subscribe((personscale) => {

                      // initialize person scale
                      let personobservationscalelist = <PersonObservationScale[]>JSON.parse(personscale);
                      if (personobservationscalelist && isArray(personobservationscalelist) && personobservationscalelist.length > 0) {
                        this.appService.personscale = personobservationscalelist[0];
                      }
                      this.appService.setCurrentScale();

                      this.appService.patientInfo = new PatientInfo();
                      this.appService.patientInfo.age = this.appService.personAgeInDays;
                      this.appService.patientInfo.allergens = null;
                      this.appService.patientInfo.conditions = null;
                      this.appService.patientInfo.height = this.appService.refHeightValue;
                      this.appService.patientInfo.bsa = this.appService.bodySurfaceArea;
                      this.appService.patientInfo.gender = this.appService.gender == 'M' ? 1 : 2;
                      this.appService.patientInfo.weight = this.appService.refWeightValue;

                      //calculate ideal weight
                      this.appService.setIdealBodyWeight();

                      this.GetDataVersion(() => {
                        this.getPrescriptionsForCurrentEncounter();
                      });
                      this.dr.getSupplyRequest(() => { });
                      this.dr.GetMedicationSupply(() => { });
                      this.dr.GetWitnesAuthentication(() => { });
                      this.dr.GetPrescriptionEvent(() => { });
                      this.dr.GetNursingInstruction(() => { });
                    }));
              })

            }));

        });
      }
    }
  }

  public GetDataVersion(cb: () => any) {
    this.apiRequest.getRequest(`${this.appService.baseURI}/GetSynchronousPostVersionNumber/?personId=${this.appService.personId}&moduleName=${this.appService.modulename}`).subscribe(
      (response) => {
        this.appService.dataversion = response;
        console.log("DataVersion: " + response);
        cb();
      }
    )
  }

  createRoleFilter(decodedToken: any) {

    let condition = "";
    let pm = new filterParams();
    let synapseroles;
    if (environment.production)
      synapseroles = decodedToken.SynapseRoles
    else
      synapseroles = decodedToken.client_SynapseRoles
    if (!Array.isArray(synapseroles)) {
      condition = "rolename = @rolename";
      pm.filterparams.push(new filterparam("rolename", synapseroles));
    }
    else
      for (var i = 0; i < synapseroles.length; i++) {
        condition += "or rolename = @rolename" + i + " ";
        pm.filterparams.push(new filterparam("rolename" + i, synapseroles[i]));
      }
    condition = condition.replace(/^\or+|\or+$/g, '');
    let f = new filters();
    f.filters.push(new filter(condition));


    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }
  getUserRoles(decodedToken: any) {
    this.appService.loggedInUserRoles = [];
    let synapseroles;
    if (environment.production)
      synapseroles = decodedToken.SynapseRoles
    else
      synapseroles = decodedToken.client_SynapseRoles
    if (!Array.isArray(synapseroles)) {

      this.appService.loggedInUserRoles.push(synapseroles);
    }
    else
      for (var i = 0; i < synapseroles.length; i++) {
        this.appService.loggedInUserRoles.push(synapseroles[i]);
      }

  }
  getPrescriptionsForCurrentEncounter() {
    this.appService.Prescription = [];
    this.appService.FilteredPrescription = [];
    this.appService.TherapyPrescription = [];

    // let dataRequest = new DataRequest(this.apiRequest, this.appService);
    this.dr.getAllPrescription(() => {
      this.dr.getAdminstrations(() => {
        this.appService.Prescription.forEach(p => this.appService.UpdatePrescriptionCompletedStatus(p));
        this.dr.getReminders(() => {
          this.dr.getPharmacyReviewStatus(() => {
            this.appService.isAppDataReady = true;

            this.appService.Prescription.forEach(p => {
              var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
              if (!((p.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || p.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(p.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {
                this.appService.FilteredPrescription.push(p);
              }
            });



            // get vtm units
            this.appService.VtmUnits = [];
            this.subscriptions.add(this.apiRequest.getRequest("./assets/config/vtmunits.json?V" + Math.random())
              .subscribe(
                (response) => {
                  this.appService.VtmUnits = response;
                  this.changeGroupType(this.groupFilterType);

                }));
          });
        });
      });
    });
  }


  changeGroupType(option: any) {
    this.showdrugChart = false;
    this.groupFilterType = option;

    let prescriptionroutes = [].concat(...this.appService.Prescription.map(p => p.__routes));
    // let prescriptionroutes = this.appService.Prescriptionroutes.filter(x => x.isdefault == true);
    this.appService.Choosenfilterdate = new Date();
    this.AllRoutes = prescriptionroutes.map(item => item.route)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (option == "Basic") {

      this.appService.DrugeGroupsType = []
      this.appService.DrugeGroupsType = this.appService.appConfig.AppSettings.basicgrouping;

    }

    // else if (option == "custom group") {
    //   let primaryMedications = [].concat(...this.appService.Prescription.map(p => p.__medications)).filter(x => x.isprimary == true);
    //   this.appService.DrugeGroupsType = primaryMedications.map(item => item.customgroup)
    //     .filter((value, index, self) => self.indexOf(value) === index);

    // }
    else if (option == "Base") {
      if (this.appService.appConfig.AppSettings.UseStoredClassification) {
        let primaryMedications = [].concat(...this.appService.Prescription.map(p => p.__medications)).filter(x => x.isprimary == true);
        this.appService.DrugeGroupsType = primaryMedications.map(item => item.classification)
          .filter((value, index, self) => self.indexOf(value) === index);
      }
      else {
        let allprescriptionsfdbgroups = [].concat(...this.appService.Prescription.map(
          (p) => {
            if (!p.__drugcodes) {
              return [{ "additionalCodeSystem": "FDB", "additionalCodeDesc": null }]
            }
            else if (!p.__drugcodes.find(dc => dc.additionalCodeSystem == "FDB")) {
              return [{ "additionalCodeSystem": "FDB", "additionalCodeDesc": null }]
            }
            else {
              return p.__drugcodes;
            }
          })).filter(x => x.additionalCodeSystem == "FDB");
        this.appService.DrugeGroupsType = allprescriptionsfdbgroups.map(item => item.additionalCodeDesc)
          .filter((value, index, self) => self.indexOf(value) === index);
      }

      this.appService.DrugeGroupsType.sort();
    }
    else if (option == "Route") {

      this.appService.DrugeGroupsType = this.AllRoutes;
      this.appService.DrugeGroupsType.sort();
    }

    for (let i = 0; i < this.appService.DrugeGroupsType.length; i++) {
      if (this.appService.DrugeGroupsType[i] == null || this.appService.DrugeGroupsType[i].trim() == '') {
        this.appService.DrugeGroupsType[i] = "Others";
      }
      this.appService.DrugeGroupsType = this.appService.DrugeGroupsType.map(item => item)
        .filter((value, index, self) => self.indexOf(value) === index);

    }

    //this.sortPrescription(this.Sorttherapie);
    this.appService.drugGroupOption = option;
    this.cd.detectChanges();
    this.showdrugChart = true;
    this.filterDateAndRought(this.Showtherapies, this.FilterRoutesby);
    // setTimeout(x => this.showdrugChart = true);

  }

  chooseDateclick(parameter: boolean) {
    this.showdrugChart = false;
    this.appService.FilteredPrescription = [];
    this.showChoosedate = parameter;
    if (!this.showChoosedate) {
      this.appService.Choosenfilterdate = new Date();
      this.filterDateAndRought(this.Showtherapies, this.FilterRoutesby);
    }
    else if (this.showChoosedate) {
      let selectedDate = moment(this.appService.Choosenfilterdate);
      selectedDate.set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      
    

      this.appService.changechoosenFilterDate = moment(selectedDate);
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        //let preStart = moment(null ? prescription.startdatetime : this.appService.encounter.sortdate);
        let preStart = prescription.startdatetime == null ? moment(this.appService.encounter.sortdate) : moment(prescription.startdatetime)
        for( let poso of prescription.__posology ){

          if(moment(preStart).isSameOrAfter(moment(poso.prescriptionstartdate))){
            preStart=moment(poso.prescriptionstartdate)
          }
      
        }
        if (prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") // if prestion is stop
        {
          if (moment(prescription.lastmodifiedon, "YYYY-MM-DD").isSameOrAfter(moment(selectedDate)))// and stop date is selected or greate
          {
            enddate = moment(selectedDate);
          }
          else {
            enddate = moment(prescription.lastmodifiedon);
          }
        }
        if (!enddate.isValid()) { // if enddate is null and not spot so end date is selected
          enddate = selectedDate;
        }
        if (moment(preStart, "YYYY-MM-DD").isSameOrBefore(selectedDate, 'day') ||  moment(selectedDate, "YYYY-MM-DD").isSame(moment(), 'day')) {      
          if (this.Showtherapies == "Active") {
            var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
            if (!((prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(prescription.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {

              if (prescription.__completed != true) {
                this.appService.FilteredPrescription.push(<Prescription>prescription);
              }
              else if (moment(new Date(prescription.__completedOn)).format("YYYYMMDDHHmm") > curTime) {
                this.appService.FilteredPrescription.push(<Prescription>prescription);
              }
            }
          }
          else if (this.Showtherapies == "stoped") {

            let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
            if (!enddate.isValid()) {
              enddate = moment();
            }
            if (prescription.__completed == true) {
              this.appService.FilteredPrescription.push(<Prescription>prescription);
            }
            else if (prescription.prescriptionstatus_id != "5750c99f-75ec-4b33-b10c-782a000cc360" && prescription.prescriptionstatus_id != "fe406230-be68-4ad6-a979-ef15c42365cf" && prescription.prescriptionstatus_id != "fd8833de-213b-4570-8cc7-67babfa31393" && prescription.prescriptionstatus_id != "63e946cd-b4a4-4f60-9c18-a384c49486ea") {

              this.appService.FilteredPrescription.push(<Prescription>prescription);

            }

          }
          else if (this.Showtherapies == "ALL") {

            this.appService.FilteredPrescription.push(<Prescription>prescription);

          }

        }
      }

      this.sortPrescription(this.Sorttherapie);
      this.cd.detectChanges();
      this.showdrugChart = true;
    }
  }

  filterDateAndRought(therapietype: any, routerupe) {
    this.appService.changechoosenFilterDate = moment();
    this.Showtherapies = therapietype;
    this.FilterRoutesby = routerupe;
    this.showdrugChart = false;
    this.appService.FilteredPrescription = [];
    if (this.Showtherapies == "Active") {

      for (let prescription of this.appService.Prescription) {

        var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
        if (!((prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(prescription.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {
          if (prescription.__completed != true) {
            this.appService.FilteredPrescription.push(<Prescription>prescription);
          }
          else if (moment(new Date(prescription.__completedOn)).format("YYYYMMDDHHmm") > curTime) {
            this.appService.FilteredPrescription.push(<Prescription>prescription);
          }
        }
      }
    }
    else if (this.Showtherapies == "stoped") {

      // var lasttreeday = moment();
      // lasttreeday = moment().subtract(2, "days");
      // lasttreeday.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        if (!enddate.isValid()) {
          enddate = moment();
        }
        if (prescription.__completed == true) {
          this.appService.FilteredPrescription.push(<Prescription>prescription);
        }
        else if ((prescription.prescriptionstatus_id != "5750c99f-75ec-4b33-b10c-782a000cc360" && prescription.prescriptionstatus_id != "fe406230-be68-4ad6-a979-ef15c42365cf" && prescription.prescriptionstatus_id != "fd8833de-213b-4570-8cc7-67babfa31393" && prescription.prescriptionstatus_id != "63e946cd-b4a4-4f60-9c18-a384c49486ea")) {

          this.appService.FilteredPrescription.push(<Prescription>prescription);

        }
      }
    }
    else if (this.Showtherapies == "ALL") {
      for (let prescription of this.appService.Prescription) {

        this.appService.FilteredPrescription.push(<Prescription>prescription);

      }
    }

    else if (this.Showtherapies == "Choose date") {
      let selectedDate = moment(this.appService.Choosenfilterdate);
      selectedDate.set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      this.appService.changechoosenFilterDate = moment(selectedDate);
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        let preStart = moment(this.appService.GetCurrentPosology(prescription).prescriptionstartdate)

        if (prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") // if prestion is stop
        {
          if (moment(prescription.lastmodifiedon, "YYYY-MM-DD").isSameOrAfter(moment(selectedDate)))// and stop date is selected or greate
          {
            enddate = moment(selectedDate);
          }
          else {
            enddate = moment(prescription.lastmodifiedon);
          }
        }
        if (!enddate.isValid()) { // if enddate is null and not spot so end date is selected
          enddate = selectedDate;
        }

        if (moment(preStart, "YYYY-MM-DD").isSameOrBefore(selectedDate, 'day')) {

          this.appService.FilteredPrescription.push(<Prescription>prescription);

        }
      }
    }
    /// Rought filter
    if (this.FilterRoutesby != "All routes") {

      this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.__routes.length != 0);
      this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.__routes.find(d => d.isdefault == true).route == this.FilterRoutesby);

    }

    this.sortPrescription(this.Sorttherapie);
    this.cd.detectChanges();
    this.showdrugChart = true;

  }
  sortPrescription(sortby: any) {
    this.showdrugChart = false;
    this.Sorttherapie = sortby;
    if (this.Sorttherapie == "DESCRIPTION-ASC") {
      this.appService.FilteredPrescription.sort((a, b) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.Sorttherapie == "DESCRIPTION-DESC") {
      this.appService.FilteredPrescription.sort((b, a) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.Sorttherapie == "CREATED TIME-ASC") {
      this.appService.FilteredPrescription.sort((a, b) => (moment(this.appService.GetCurrentPosology(a).prescriptionstartdate) > moment(this.appService.GetCurrentPosology(b).prescriptionstartdate)) ? 1 : ((moment(this.appService.GetCurrentPosology(b).prescriptionstartdate) > moment(this.appService.GetCurrentPosology(a).prescriptionstartdate)) ? -1 : 0));
    }
    else if (this.Sorttherapie == "CREATED TIME-DESC") {

      this.appService.FilteredPrescription.sort((b, a) => (new Date(this.appService.GetCurrentPosology(a).prescriptionstartdate) > new Date(this.appService.GetCurrentPosology(b).prescriptionstartdate)) ? 1 : ((new Date(this.appService.GetCurrentPosology(b).prescriptionstartdate) > new Date(this.appService.GetCurrentPosology(a).prescriptionstartdate)) ? -1 : 0));
    }
    this.cd.detectChanges();
    this.showdrugChart = true;
    this.appService.drugRouteOption = this.FilterRoutesby;
    this.appService.drugSortOrder = this.Sorttherapie;
    this.subjects.therapyOverview.next();

  }

  changechoosendate(daynumber: any) {
    if (this.appService.Choosenfilterdate != null) {
      this.isCalledOnce = false;
      this.appService.Choosenfilterdate = new Date(Date.UTC(this.appService.Choosenfilterdate.getFullYear(), this.appService.Choosenfilterdate.getMonth(), this.appService.Choosenfilterdate.getDate() + daynumber));
      this.chooseDateclick(true)
    }



  }
  ChoosenfilterdateChange(value: Date): void {
    //  this.appService.Choosenfilterdate = moment(value,"DD/MM/YYYY");
    if (this.isCalledOnce && value != null) {
      this.isCalledOnce = true;
      !this.appService.chartScrolled && this.chooseDateclick(true)
      this.appService.chartScrolled = false;

    }
  }
  // Begin Therpay overview code
  setNoOfDaysTherapy(number) {
    this.appService.therapyCurrentDate = moment();
    this.appService.therapyNoOfDays = number;
    this.subjects.therapyOverview.next();
  }
  prevDaysTherapy() {
    if (this.appService.therapyNoOfDays == 3) {
      this.appService.therapyCurrentDate.add(-3, "days");
    } else {
      this.appService.therapyCurrentDate.add(-5, "days");
    }
    this.subjects.therapyOverview.next();
  }
  nextDaysTherapy() {
    if (this.appService.therapyNoOfDays == 3) {
      this.appService.therapyCurrentDate.add(3, "days");
    } else {
      this.appService.therapyCurrentDate.add(5, "days");
    }
    this.subjects.therapyOverview.next();
  }
  // End Therapy Overview

  onDatePickerClose(event) {
    this.isCalledOnce = true;
  }

  onDatePickerOpen(event) {
    this.isCalledOnce = true;
  }
  makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  CheckBannerWarnings(): boolean {
    if (!this.appService.bannerWarningStatus) {
      this.subjects.showBannerWarnings.next();
      return false;
    }
    // else
    //   if (!this.appService.isWeightCapturedForToday) {
    //     this.openRecordWeightModal('D');
    // } 
    // else if (!this.appService.isHeightCaptured) {
    //   this.openRecordHeightModal('D');
    // }
    else {
      if (this.appService.refWeightValue && this.appService.refHeightValue) {
        this.appService.bodySurfaceArea = +(Math.sqrt(+this.appService.refWeightValue * +this.appService.refHeightValue) / 60).toFixed(2);
      }
    }
    return true;
  }

  LoadInpatientPrescribingModule() {
    if (this.CheckBannerWarnings()) {
      this.LoadModule('app-inpatient-prescribing');
    }
  }

  openRecordWeightModal(context: string) {
    this.dr.RefreshIfDataVersionChanged((result: boolean) => {
      if (result == false) {
        const config = {
          backdrop: true,
          ignoreBackdropClick: true,
          class: 'modal-dialog-centered modal-sm',
          initialState: {
            errorMessage: ""
          }
        };

        this.bsModalRef = this.modalService.show(RefWeightHeightComponent, config);
        this.bsModalRef.content = {
          saveDone: (isDone) => {
            if (isDone) {
              if (context == 'D') {
                if (!this.appService.isHeightCaptured) {
                  //this.openRecordHeightModal('D');
                } else {
                  //this.LoadModule('app-inpatient-prescribing');
                }
              }
            }
          }
        };
      }
    });
  }


  openRecordHeightModal(context: string) {
    this.dr.RefreshIfDataVersionChanged((result: boolean) => {
      if (result == false) {
        const config = {
          backdrop: true,
          ignoreBackdropClick: true,
          class: 'modal-dialog-centered modal-sm',
          initialState: {
            errorMessage: ""
          }
        };

        this.bsModalRef = this.modalService.show(RecRefHeightComponent, config);
        this.bsModalRef.content = {
          saveDone: (isDone) => {
            // if (isDone && context == 'D' && this.appService.isWeightCapturedForToday) {
            //   //this.LoadModule('app-inpatient-prescribing');
            // }
          }
        };
      }
    });
  }



  MovePatientDrugs(prescriptionBasket: Array<Prescription>) {
    //copy patient drugs from moa to ip
    let moacontextid = this.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Admission.toLowerCase()).prescriptioncontext_id
    let ipcontextid = this.appService.MetaPrescriptioncontext.find(x => x.context.toLowerCase() == PrescriptionContext.Inpatient.toLowerCase()).prescriptioncontext_id

    let moas = this.appService.Prescription.filter(p => p.prescriptioncontext_id == moacontextid);
    let ips = this.appService.Prescription.filter(p => p.prescriptioncontext_id == ipcontextid);
    prescriptionBasket.forEach(p => {
      //if not editing
      if (!p.__editingprescription) {
        //and if there is only one moa for this dmd code
        let medcode = p.__medications.find(m => m.isprimary == true).__codes.find(c => c.terminology == "formulary").code;
        let p_moas = moas.filter(mp => mp.__medications.find(m => m.isprimary == true).__codes.find(c => c.terminology == "formulary").code == medcode);

        if (p_moas && p_moas.length == 1) {
          let p_ip = ips.filter(mp => mp.__medications.find(m => m.isprimary == true).__codes.find(c => c.terminology == "formulary").code == medcode);

          //and if this drug been prescribed only once
          if (p_ip && p_ip.length == 1) {
            //copy patient drugs over
            // get current patient drugs from moa for prescription
            this.subscriptions.add(
              this.apiRequest
                .getRequest(
                  this.appService.baseURI +
                  '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply&synapseattributename=prescriptionid' +
                  '&attributevalue=' + p_moas[0].prescription_id
                )
                .subscribe((response) => {
                  let responseArray = JSON.parse(response);
                  if (responseArray.length != 0) {
                    this.subscriptions.add(
                      this.apiRequest
                        .getRequest(
                          this.appService.baseURI +
                          '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply&synapseattributename=prescriptionid' +
                          '&attributevalue=' + p_ip[0].prescription_id
                        )
                        .subscribe((existing) => {
                          let existingarray = JSON.parse(existing);

                          if (existingarray.length == 0) {
                            let patientDrugs = new PrescriptionMedicaitonSupply();
                            patientDrugs.epma_prescriptionmedicaitonsupply_id = uuid();
                            patientDrugs.prescriptionid = p_ip[0].prescription_id;
                            patientDrugs.noofdays = responseArray[0].noofdays;;
                            patientDrugs.availablequantity = responseArray[0].availablequantity;
                            patientDrugs.quantityunits = responseArray[0].quantityunits;
                            patientDrugs.complianceaid = responseArray[0].complianceaid;
                            patientDrugs.selectedproductcode = responseArray[0].selectedproductcode;
                            patientDrugs.selectproductcodetype = responseArray[0].selectproductcodetype;
                            patientDrugs.ownsupplyathome = responseArray[0].ownsupplyathome;
                            patientDrugs.resupplyfrom = responseArray[0].resupplyfrom;
                            patientDrugs.lastmodifiedby = responseArray[0].lastmodifiedby;
                            patientDrugs.updatesouce = responseArray[0].updatesouce;
                            patientDrugs.prescribedmedicationid = responseArray[0].prescribedmedicationid;
                            patientDrugs.person_id = responseArray[0].person_id;
                            patientDrugs.encounter_id = responseArray[0].encounter_id;
                            patientDrugs.quantityentrydate = responseArray[0].quantityentrydate;
                            patientDrugs.createdby = responseArray[0].createdby;
                            patientDrugs.createdon = responseArray[0].createdon;
                            patientDrugs.modifiedon = responseArray[0].modifiedon;

                            //marked for syncpost
                            this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
                              "/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply", JSON.stringify(patientDrugs), false)
                              .subscribe((saveResponse) => {
                                this.dr.GetMedicationSupply(() => {
                                  this.subjects.refreshTemplate.next();
                                });
                              }
                              ))
                          }
                        }))
                  }
                }));
          }
        }
      }
    });
  }
  destroyRecordsTemplate() {
    this.isLoading = false
    this.medicationAdministrationEmptyTemplate = false;
    this.startDate = '';
    this.endDate = '';
    this.numberOfEmptyTemplates = null;
    this.printing = false;
  }

  updateDates(event) {
    console.log(event);
    this.datePicker = false;
  }

  openDatePicker() {

    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-dialog-centered modal-sm',
      initialState: {
        errorMessage: ""
      }
    };

    this.bsModalRef = this.modalService.show(DatePickerComponent, config);
    this.bsModalRef.content = {
      saveDone: (date) => {
        if (date) {
          const [startDate, endDate] = date.split("--");
          this.startDate = startDate;
          this.endDate = endDate;
          this.isLoading = true;
          this.dr.getHeightWeight(() => {
          setTimeout(() => {
            this.medicationAdministrationEmptyTemplate = 'report';
          }, 100);
        });
        }
      },
      cancel: () => {
        this.printing = false;
      }
    };
  }

  openActivePrintingTemplate() {
    this.isLoading = true;
    this.dr.getHeightWeight(() => {
    setTimeout(() => {
      this.medicationAdministrationEmptyTemplate = 'active'
    }, 100);
  });

  }

  openCurrentPrintingTemplate() {
    this.isLoading = true;
    this.dr.getHeightWeight(() => {
    setTimeout(() => {
      this.medicationAdministrationEmptyTemplate = 'current'
    }, 100);
  });
  }

  getPrescriptionNumber() {
    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-dialog-centered modal-sm',

    };

    this.bsModalRef = this.modalService.show(TemplateNumberComponent, config);
    this.bsModalRef.content = {
      saveDone: (templateNumber) => {
        if (templateNumber) {
          this.isLoading = true;
          this.numberOfEmptyTemplates = templateNumber;
          this.dr.getHeightWeight(() => {
          setTimeout(() => {
            this.medicationAdministrationEmptyTemplate = 'empty';
          }, 100);
        });

        }
      },
      cancel: () => {
        this.printing = false;
      }

    };

  }

  openActive() {
    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-dialog-centered modal-sm',
      initialState: {
        errorMessage: "",
        marType: "active"

      }
    };

    this.bsModalRef = this.modalService.show(TemplateNumberComponent, config);
    this.bsModalRef.content = {
      saveDone: (templateNumber) => {
        if (templateNumber) {
          this.numberOfEmptyTemplates = templateNumber;
          this.medicationAdministrationEmptyTemplate = 'active';
        }
      },
      cancel: () => {
        this.printing = false;
      }
    };

  }


  TriggerWarningUpdateCheck(cb: Function = null) {
    if (this.appService.warningService && this.appService.warningServiceIPContext.loader != true) {
      this.dr.TriggerWarningUpdateOnChanges(() => {
        if (this.appService.warningServiceIPContext.existingWarningsStatus == false) {
          this.subjects.showWarnings.next();
        }
        if (cb)
          cb();
      });
    }
  }

  BannerWarningsLoaded() {
    // if (this.appService.bannerWarningStatus == false) {
    //   this.subjects.showBannerWarnings.next();
    // }
  }

}



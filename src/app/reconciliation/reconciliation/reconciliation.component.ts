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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Epma_Dischargesummarry, Epma_Medsonadmission, Epma_Medsondischarge, Prescription } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { FormContext, PrescriptionContext, PrescriptionStatus } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';


@Component({
  selector: 'app-reconciliation',
  templateUrl: './reconciliation.component.html',
  styleUrls: ['./reconciliation.component.css']
})
export class ReconciliationComponent implements OnInit, OnDestroy {
  subscriptions: Subscription = new Subscription();
  @Input() Medsonadmission: Epma_Medsonadmission;
  @Input() Medsondischarge: Epma_Medsondischarge;
  @Input() Dischargesummarry: Epma_Dischargesummarry;
  @Input() isMedsondischargeOnce:any;
  @Output() EditType = new EventEmitter<FormContext>();
  isMOAComplete = false;
  isMODComplete = false;
  isSummeryComplete = false;
  isMOAStarted = false;
  isMODStarted = false;
  lastcompleteMOA: Array<Epma_Medsonadmission>;
  lastcompleteMOD: Array<Epma_Medsondischarge>;
  lastcompleteSUM: Array<Epma_Dischargesummarry>;
  showconform = false;
  AdditionalInfoNotesSelected = false;
  completionType = "";
  arrrPescriptionMOA: Array<Prescription>;
  arrrPescriptionMOAUnchange: Array<Prescription>;
  arrrPescriptionMOAChange: Array<Prescription>;
  arrrPescriptionMOAStoped: Array<Prescription>;
  arrrPescriptionMOASuspended: Array<Prescription>;
  arrrPescriptionMOD: Array<Prescription>;
  arrrPescriptionMODUnchange: Array<Prescription>;
  arrrPescriptionMODChange: Array<Prescription>;
  arrrPescriptionMODNew: Array<Prescription>;
  arrreconcilation: Array<any> = [];

  // print discharge variables
  printDischarge: boolean = false;
  dischargeComments: any;

  arrrPescriptionSummery: Array<Prescription>;
  constructor(public subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService) {
  
    this.CheckIfadditionalNoteSelected();
    this.generatePrescriptionobjects();

      let baseviewname = "";
      // if (resp == "MOA") {
        baseviewname = "epma_dischargesummarryhistory";
      // }
      // else {
      //   baseviewname = "epma_dischargesummarryhistory";
      // }

      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/" + baseviewname, this.CreateSessionFilter()).subscribe(
        (response) => {
          response.sort((a, b) => b._sequenceid - a._sequenceid);
          for (let notesModel of response) {
  
            this.arrreconcilation.push(<Epma_Medsonadmission>notesModel);
          }
          this.arrreconcilation = this.arrreconcilation.filter(x => x.action == "Notes")
  
        }));

  }

  setCompletiontype(type: any) {
    this.completionType = type;
    this.showconform = true;
  }
  closeComplete() {
    this.showconform = false;
  }
  submitComplete() {
    if (this.completionType == "MOA") {
      this.completeMOA();
    }
    if (this.completionType == "MOD") {
      this.completeMOD();
    }
    if (this.completionType == "SUM") {
      this.completesummery();
    }
    this.showconform = false;
  }

  completeMOA() {
    this.Medsonadmission.iscomplete = true;
    this.Medsonadmission.action = "complete";
    this.Medsonadmission.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsonadmission.modifiedby = this.appService.loggedInUserName;
    this.Medsonadmission.notes = "";
    Object.keys(this.Medsonadmission).map((e) => { if (e.startsWith("_")) delete this.Medsonadmission[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_medsonadmission", JSON.parse(JSON.stringify(this.Medsonadmission)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.isMOAStarted = true;
      this.isMOAComplete = true;
      this.getCompletedhistory();
    },
      (error) => {
        this.appService.logToConsole(error);
        this.getCompletedhistory();
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );
  }
  completeMOD() {
  
    this.Medsondischarge.iscomplete = true;
    this.Medsondischarge.action = "complete"
    this.Medsondischarge.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsondischarge.modifiedby = this.appService.loggedInUserName;
    this.Medsondischarge.notes = "";
    Object.keys(this.Medsondischarge).map((e) => { if (e.startsWith("_")) delete this.Medsondischarge[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_medsondischarge", JSON.parse(JSON.stringify(this.Medsondischarge)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.isMODStarted = true;
      this.isMODComplete = true;
      this.isMedsondischargeOnce=true;
      this.getCompletedhistory();

    },
      (error) => {
        this.appService.logToConsole(error);

        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );

  }
  completesummery() {
    this.Dischargesummarry.iscomplete = true;
    this.Dischargesummarry.action = "complete";
    this.Dischargesummarry.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Dischargesummarry.modifiedby = this.appService.loggedInUserName;
    this.Dischargesummarry.notes = "";
    Object.keys(this.Dischargesummarry).map((e) => { if (e.startsWith("_")) delete this.Dischargesummarry[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_dischargesummarry", JSON.parse(JSON.stringify(this.Dischargesummarry)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.isSummeryComplete = true;
      this.getCompletedhistory();

    },
      (error) => {
        this.appService.logToConsole(error);

        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );
  }
  ShowRecNotes(type: any) {
    if (type == "MOA") {
      this.subjects.reconcillationNotes.next({ type: "MOA", object: this.Medsonadmission });
    }
    else if (type == "SUM") {
      this.subjects.reconcillationNotes.next({ type: "SUM", object: this.Dischargesummarry });
    }
  }
  Getcomponenttype(prescription: any) {

    if (this.arrrPescriptionMODNew.find(x => x.prescription_id == prescription.prescription_id)) {
      return "MODNO";
    }
    else {
      return "MOD";
    }
  }
  generatePrescriptionobjects() {

    this.arrrPescriptionMOAChange = []
    this.arrrPescriptionMODChange = []
    this.arrrPescriptionMOAUnchange = []
    this.arrrPescriptionMODUnchange = []
    this.arrrPescriptionMOAStoped = []
    this.arrrPescriptionMOASuspended = []
    this.arrrPescriptionMODNew = [];
    let arrModAllReadyMatch = [];

    this.arrrPescriptionMOA = this.appService.Prescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Admission).prescriptioncontext_id);
    this.arrrPescriptionMOD = this.appService.Prescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Discharge).prescriptioncontext_id);
    this.arrrPescriptionMOA.sort((a, b) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    this.arrrPescriptionMOD.sort((a, b) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    for (let prescription of this.arrrPescriptionMOA) {
      //Match MOA MOD
      let formularycode = prescription.__medications.find(x => x.isprimary).__codes.find(y => y.terminology == "formulary").code;
      let MODmatched = this.arrrPescriptionMOD.filter(x => x.__medications.find(y => y.isprimary == true).__codes.find(z => z.terminology == "formulary" && z.code == formularycode))

      //Match MOA ANd Active Appservice Prescrip

      for (let match of arrModAllReadyMatch) {
        MODmatched = MODmatched.filter(x => x.prescription_id != match.prescription_id)
      }

      if (MODmatched.length == 1) {


        if (this.CheckPrescriptionChange(prescription, MODmatched[0])) {
          this.arrrPescriptionMOAChange.push(prescription);
          this.arrrPescriptionMODChange.push(MODmatched[0]);
          arrModAllReadyMatch.push(MODmatched[0])
        }
        else {
          this.arrrPescriptionMOAUnchange.push(prescription);
          this.arrrPescriptionMODUnchange.push(MODmatched[0]);
          arrModAllReadyMatch.push(MODmatched[0])
        }
      }
      else if (MODmatched.length > 1) {
        let foundModsame = false;
        for (let prescriptionobject of MODmatched) {
          if (!this.CheckPrescriptionChange(prescription, prescriptionobject)) {
            // mod it will be added to new at 211 line
            foundModsame = true;
            arrModAllReadyMatch.push(prescriptionobject)
            this.arrrPescriptionMOAUnchange.push(prescription);
            this.arrrPescriptionMODUnchange.push(prescriptionobject);
            break;
          }
        }

        ////

        if (foundModsame == false) {
          arrModAllReadyMatch.push(MODmatched[0])
          this.arrrPescriptionMOAChange.push(prescription);
          this.arrrPescriptionMODChange.push(MODmatched[0]);
        }

        ///
      }
      else {

        this.checkIfStoporsespend(prescription);
      }
    }

    for (let prescription of this.arrrPescriptionMOD) {
      if (!(this.arrrPescriptionMODChange.find(x => x.prescription_id == prescription.prescription_id) || this.arrrPescriptionMODUnchange.find(x => x.prescription_id == prescription.prescription_id)))
        this.arrrPescriptionMODNew.push(prescription);
    }

  }

  CheckIfadditionalNoteSelected() {
    let baseviewname = "epma_modonadmissionhistory";
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/" + baseviewname, this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((a, b) => b._sequenceid - a._sequenceid);
        let arrreconcilation: any[] = [];
        for (let notesModel of response) {

          arrreconcilation.push(<Epma_Medsonadmission>notesModel);
        }
        arrreconcilation = arrreconcilation.filter(x => x.action == "Notes")
        if (arrreconcilation.length > 0) {

          this.AdditionalInfoNotesSelected = arrreconcilation[0].noteshasaddinfo;
        }

      }));
  }

  checkIfStoporsespend(prescription: Prescription) {
    let formularycode = prescription.__medications.find(x => x.isprimary).__codes.find(y => y.terminology == "formulary").code;
    let Activematched = this.appService.Prescription.filter(x => x.prescription_id != prescription.prescription_id &&
      x.__medications.find(y => y.__codes.find(z => z.terminology == "formulary" && z.code == formularycode)));
    if (Activematched.length == 0) {
      if (prescription.prescriptionstatus_id == this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped).prescriptionstatus_id) {
        this.arrrPescriptionMOAStoped.push(prescription);
      }
      else {
        this.arrrPescriptionMOASuspended.push(prescription);
      }

    }
    else if (Activematched.length > 0) {
      let IsPrescriptionContinued = false
      for (let prescriptionobj of Activematched) {
        if (prescriptionobj.prescriptionstatus_id == this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.cancelled).prescriptionstatus_id) {
          continue;
        }
        if (prescriptionobj.prescriptionstatus_id != this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped).prescriptionstatus_id) {
          IsPrescriptionContinued = true;
        }
      }
      if (!IsPrescriptionContinued) {
        this.arrrPescriptionMOAStoped.push(prescription);
      }
      else {
        this.arrrPescriptionMOASuspended.push(prescription);
      }

    }

  }
  CheckPrescriptionChange(MOA: Prescription, MOD: Prescription) {

    if (MOA.__posology[0].prn != MOD.__posology[0].prn) {
      return true;
    }



    if (MOA.__routes.length != MOD.__routes.length) {
      return true;

    }
    else {
      if (MOA.__routes && MOA.__routes.length != 0 && MOA.__routes.find(x => x.isdefault == true).route != MOD.__routes.find(x => x.isdefault == true).route) {
        return true;
      }
    }

    for (let rout of MOA.__routes) {
      if (!MOD.__routes.find(x => x.route == rout.route)) {
        return true;
      }
    }

    if (MOA.__posology[0].frequency != MOD.__posology[0].frequency) {
      return true;
    }

    if (MOA.__posology[0].frequencysize != MOD.__posology[0].frequencysize) {
      return true;
    }
    if (MOA.__posology[0].__dose.length != MOD.__posology[0].__dose.length) {
      return true;
    }
    let i = 0;
    for (let dose of MOA.__posology[0].__dose) {

      if (dose.dosesize != MOD.__posology[0].__dose[i].dosesize) {
        return true;
      }
      if (dose.strengthneumerator != MOD.__posology[0].__dose[i].strengthneumerator) {
        return true;
      }
      if (dose.strengthdenominator != MOD.__posology[0].__dose[i].strengthdenominator) {
        return true;
      }

      i++;
    }

    if (MOA.__posology[0].daysofweek != MOD.__posology[0].daysofweek) {
      return true;
    }

    if (MOA.prescriptionadditionalconditions_id != MOD.prescriptionadditionalconditions_id) {
      return true;
    }

    return false;
  }


  startdischargesummery() {

    this.Dischargesummarry.epma_dischargesummarry_id = uuid();
    this.Dischargesummarry.action = "start";
    this.Dischargesummarry.createdby = this.appService.loggedInUserName;
    this.Dischargesummarry.createdon = this.appService.getDateTimeinISOFormat(new Date());
    this.Dischargesummarry.encounterid = this.appService.encounter.encounter_id;
    this.Dischargesummarry.person_id = this.appService.encounter.person_id;
    this.Dischargesummarry.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Dischargesummarry.notes = "";
    this.Dischargesummarry.iscomplete = false;
    this.Dischargesummarry.noteshasaddinfo = false;
    Object.keys(this.Dischargesummarry).map((e) => { if (e.startsWith("_")) delete this.Dischargesummarry[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_dischargesummarry", JSON.parse(JSON.stringify(this.Dischargesummarry)));
    upsertManager.save((resp: any) => {
      // this.appService.UpdateDataVersionNumber(resp);

      this.isSummeryComplete = false;

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy(); 

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      },false
    );

  }
  startMOA() {
    if (confirm("Are you sure you want to start?")) {

    }
    else {
      return
    }
    

    this.Medsonadmission.epma_medsonadmission_id = uuid();
    this.Medsonadmission.action = "start";
    this.Medsonadmission.createdby = this.appService.loggedInUserName;
    this.Medsonadmission.createdon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsonadmission.encounterid = this.appService.encounter.encounter_id;
    this.Medsonadmission.person_id = this.appService.encounter.person_id;
    this.Medsonadmission.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsonadmission.modifiedby = this.appService.loggedInUserName;
    this.Medsonadmission.notes = "";
    this.Medsonadmission.iscomplete = false;
    this.Medsonadmission.noteshasaddinfo = false;
    Object.keys(this.Medsonadmission).map((e) => { if (e.startsWith("_")) delete this.Medsonadmission[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_medsonadmission", JSON.parse(JSON.stringify(this.Medsonadmission)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);
      if (!this.Dischargesummarry.epma_dischargesummarry_id) {
        this.startdischargesummery();
      }
      this.isMOAStarted = true;
      this.isMOAComplete = false;
      this.EditType.emit(FormContext.moa);

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );

  }
  startMOD() {
    if (confirm("Are you sure you want to start?")) {

    }
    else {
      return
    }
    
    this.Medsondischarge.epma_medsondischarge_id = uuid();
    this.Medsondischarge.action = "start";
    this.Medsondischarge.createdby = this.appService.loggedInUserName;
    this.Medsondischarge.createdon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsondischarge.encounterid = this.appService.encounter.encounter_id;
    this.Medsondischarge.person_id = this.appService.encounter.person_id;
    this.Medsondischarge.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.Medsondischarge.notes = "";
    this.Medsondischarge.iscomplete = false;
    this.Medsondischarge.noteshasaddinfo = false;
    Object.keys(this.Medsondischarge).map((e) => { if (e.startsWith("_")) delete this.Medsondischarge[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity('local', "epma_medsondischarge", JSON.parse(JSON.stringify(this.Medsondischarge)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);
      if (!this.Dischargesummarry.epma_dischargesummarry_id) {
        this.startdischargesummery();
      }
      this.isMODStarted = true;
      this.isMODComplete = false;
      this.EditType.emit(FormContext.mod);
    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }
      }
    );
  }
  EditMOA() {

    this.EditType.emit(FormContext.moa);
  }
  EditMOD() {

    this.EditType.emit(FormContext.mod);
  }
  ngOnInit(): void {
    
    this.getCompletedhistory();
    if (this.Medsondischarge.epma_medsondischarge_id) {

      this.isMODComplete = this.Medsondischarge.iscomplete;
      this.isMODStarted = true;
    }
    else {
      this.isMOAStarted = false;
    }
    if (this.Dischargesummarry.epma_dischargesummarry_id) {
      this.isSummeryComplete = this.Dischargesummarry.iscomplete
    }
    else {
      this.isSummeryComplete = false;
    }
    if (this.Medsonadmission.epma_medsonadmission_id) {

      this.isMOAComplete = this.Medsonadmission.iscomplete;
      this.isMOAStarted = true;
    }
    else {
      this.isMOAStarted = false;
    }

    
    



  }


  getCompletedhistory() {
    this.lastcompleteMOA = []
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_modonadmissionhistory", this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((b, a) => b._sequenceid - a._sequenceid);

        this.lastcompleteMOA = response.filter(x => x.action == "complete");;




      }));
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_dischargesummarryhistory", this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((b, a) => b._sequenceid - a._sequenceid);


        this.lastcompleteSUM = response.filter(x => x.action == "complete");


      }));

    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_medsondischargehistory", this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((b, a) => b._sequenceid - a._sequenceid);


        this.lastcompleteMOD = response.filter(x => x.action == "complete");

      }));
  }


  CreateSessionFilter() {
    const condition = "encounterid=@encounterid";
    const f = new filters()
    f.filters.push(new filter(condition));

    const pm = new filterParams();
    pm.filterparams.push(new filterparam("encounterid", this.appService.encounter.encounter_id));


    const select = new selectstatement("SELECT *");

    const orderby = new orderbystatement("ORDER BY 2");

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  printDischargeRecPdf() {
    //this.appService.showDischargeSummaryNotes = false;
    this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_dischargesummarryhistory", this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((a, b) => b._sequenceid - a._sequenceid);
        this.dischargeComments = response;
        this.printDischarge = true;

      })

  }

  destroyPrintDischargeComponent(event) {
    this.printDischarge = false;
  }

  ngOnDestroy() {

    this.subscriptions.unsubscribe();

  }

  ShowWarnings() {
    this.appService.logToConsole("Show warning from rec.............");
    this.appService.logToConsole(this.appService.warningService);
    this.appService.logToConsole(this.appService.warningServiceMODContext);
    this.appService.logToConsole(this.appService.warningServiceMODContext.loader);
    this.subjects.showMODWarnings.next();
  }

}

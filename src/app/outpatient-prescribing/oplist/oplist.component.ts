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
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import moment from 'moment';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { Subscription } from 'rxjs';
import { Opnotes, Opprescriptiontherapies, Outpatientprescriptions, Prescription } from 'src/app/models/EPMA';

import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import * as ClassicEditor from 'src/assets/stylekit/ds-ckeditor.js';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import * as Canvg from 'canvg';
import * as DOMPurify from 'dompurify';
import * as html2canvas from 'html2canvas';
// import { PrintOpPrescribingComponent } from '../print-op-prescribing/print-op-prescribing.component';

import * as html2pdf from 'html2pdf.js'
import { Common } from 'src/app/services/enum';
import { Console } from 'console';




@Component({
  selector: 'app-oplist',
  templateUrl: './oplist.component.html',
  styleUrls: ['./oplist.component.css']
})
export class OplistComponent implements OnInit, OnDestroy {

  patientName: string;
  hospitalNumber: string;
  nhsNumber: string;
  gender: string;
  dob: string;
  age: number;
  address: string;


  opPrescriptionType = []
  opDispensing = ["Please Select", "Radiology", "Outpatient Stanmore", "Outpatient Bolsover", "OPAT", "POA", "Orthotics", "Philip Newman Ward", "Patient/Relative/Staff Collecting"]
  OpPrescriptionCategory = ["Please Select", "Inpatient", "Outpatient", "Homecare", "Clinical trial"]
  selectedopPrescriptionType = "";
  selectedispensing = "Please Select";
  selectedprescriptioncategory = "Please Select";
  historynotes = "";
  checkedcondetion = false;
  opnoteserror = false;
  showNotespopup = false;
  showDeletepopup = false;
  showDeletepopupConform = false;
  reasonofdelete = "Entered in error";
  othereReason = "";

  hidelocation = this.appService.appConfig.AppSettings.hideOPLocation;

  isLoading: boolean = false;
  printing: boolean = false;
  printOPTemplate: any = false;
  @ViewChild('historynotesmodel') private historynotesmodel: ElementRef;
  showNotespopupversion=false

  constructor(private subjects: SubjectsService,public appService: AppService, private apiRequest: ApirequestService, private cd: ChangeDetectorRef) {
    this.Editor.defaultConfig = {
      toolbar: {
        items: [
          'heading',
          '|',
          'bold',
          'italic',
          'underline',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'undo',
          'redo'
        ]
      },
      language: 'en'
    };
    
    this.opPrescriptionType.push("NHS")
    this.opPrescriptionType.push("Private")
    let location = new clinicLocation();
   
  
    if (this.appService.encounter.patienttypecode && +this.appService.encounter.patienttypecode == 1) {
      this.selectedopPrescriptionType = "NHS"
    }
    else if (this.appService.encounter.patienttypecode && +this.appService.encounter.patienttypecode == 2) {
      this.selectedopPrescriptionType = "Private"
    }
    else {
      this.selectedopPrescriptionType = "Please Select"
    }

    this.locationlst = [];
    // location.code="ADHOCFLU"
    // location.name="FLU JAB ADHOC CLINIC"
    // this.locationlst.push(location);
    // let location1=new clinicLocation();
    // location1.code="AH2019"
    // location1.name="ANDREW TEST CLINIC"
    // this.locationlst.push(location1);
    this.Choosenfilterdate = new Date()
    this.timeselected = moment().format("hh:mm")
    this.selectedobj = new Outpatientprescriptions();
    this.subjects.showopAdministration.subscribe((pres: any) => {

      this.PrescriptionAdmistration = pres.prescription;
      let logicalid;
      if (pres.prescription.isinfusion) {
        logicalid = "start_" + moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime).format('YYYYMMDDHHmm') + "_" + pres.prescription.__posology[0].__dose[0].dose_id;
      } else {
        logicalid = moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime).format('YYYYMMDDHHmm') + "_" + pres.prescription.__posology[0].__dose[0].dose_id;
      }
      this.dose = {
        prescription_id: pres.prescription.prescription_id,
        posology_id: pres.prescription.__posology[0].posology_id,
        dose_id: logicalid,
        eventStart: moment(pres.prescription.__posology[0].__dose[0].dosestartdatetime),
        eventEnd: null,
        prn: pres.prescription.__posology[0].prn,
        iscancel: false,
        doctorsorder: false,
        isinfusion: pres.prescription.isinfusion,
        content: "",
        title: "",
        admitdone: false
      }
      if (pres.type == "OpAdministration") {
        this.editpopuptypetype = "OpAdministration";
      } else {
        this.editpopuptypetype = "View Administration";
      }
      this.showopAdministration = true;

    });
  }
  public Editor = ClassicEditor;
  Outpatientprescriptionslist: Array<Outpatientprescriptions>
  Outpatientprescriptions: Outpatientprescriptions;
  Oppatienttheripy: Array<Opprescriptiontherapies>;
  showpopup = false;
  rContext: any;
  PrescriptionAdmistration: Prescription;
  showopAdministration = false;
  showmanagelist = false;
  showprescriptionlist = false;
  editpopuptypetype = "OpAdministration"
  Choosenfilterdate: any;
  timeselected = ""
  locationselected = "";
  prescriber: string;
  error = "";
  showOpnotes = false;
  prescriptions: Array<Prescription> = [];
  selectedItem = ""
  selectedobj: Outpatientprescriptions;
  subscriptions = new Subscription();

  OpnotesHistory: Array<Opnotes>;
  latestNotes = "";
  dose: any;
  locationlst: Array<clinicLocation> = [];
  selectedLocation: clinicLocation;
  filterlocationlst = [];
  showerrormessage=false;
  opSubscription = new Subscription();

  // @ViewChild('printOPPrescribing') printOPPrescribing: PrintOpPrescribingComponent;

  ngOnInit(): void {
    // this.selectedLocation= new clinicLocation();
    this.locationselected = this.appService.encounter.defaultopclinicname;
    // this.selectedLocation.code="Other"
    // this.selectedLocation.name=this.appService.encounter.defaultopclinicname
    this.prescriber = this.appService.loggedInUserName;
    this.getPASData();
    this.getoplist();
    Canvg;
    DOMPurify;
    html2canvas;
  }
  ngAfterViewInit() {

    // console.log('printOPPrescribing',this.printOPPrescribing.printBody.nativeElement);
  }

  getOPNotesHistory() {
    this.OpnotesHistory = [];
    this.latestNotes = '';
    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_outpatientnoteshistory", this.CreateSessionFilter(this.selectedItem)).subscribe(
      (response) => {
        response.sort((a, b) => b._sequenceid - a._sequenceid);
        for (let notesModel of response) {

          this.OpnotesHistory.push(<Opnotes>notesModel);
        }

        if (this.OpnotesHistory.length > 0) {
          this.latestNotes = this.OpnotesHistory[0].notes;

        }

      }));
  }

  sethistorynotes(notes: any) {
    this.historynotes = notes;

    
      this.showNotespopupversion=true   
  }
  closenotesversion(){
    this.showNotespopupversion=false   
  }
  SavePrescriptionNotes() {
   
    let opnots = new Opnotes();
    if (this.OpnotesHistory.length > 0) {
      opnots.epma_opnotes_id = this.OpnotesHistory[0].epma_opnotes_id;
    } else {
      opnots.epma_opnotes_id = uuid()
    }

    opnots.createdby = this.appService.loggedInUserName;
    opnots.modifiedby = this.appService.loggedInUserName;
    opnots.createdon = this.appService.getDateTimeinISOFormat(new Date());
    opnots.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    opnots.person_id = this.appService.personId;
    opnots.notes = this.latestNotes;
    opnots.epma_outpatientprescriptions_id = this.selectedItem;
    opnots.encounter_id = Common.op_encounter_placeholder;

    Object.keys(opnots).map((e) => { if (e.startsWith("_")) delete opnots[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    let entity = "";

    upsertManager.addEntity('local', 'epma_opnotes', JSON.parse(JSON.stringify(opnots)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.showNotespopup = false;
      this.getOPNotesHistory();

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
  closepopupNotes() {
    this.showNotespopup = false;
  }
  showOpNotespop() {
    this.showNotespopup = true;
  }
  CreateSessionFilter(selectid: any) {

    const condition = "epma_outpatientprescriptions_id=@epma_outpatientprescriptions_id";
    const f = new filters()
    f.filters.push(new filter(condition));

    const pm = new filterParams();
    pm.filterparams.push(new filterparam("epma_outpatientprescriptions_id", selectid));


    const select = new selectstatement("SELECT *");

    const orderby = new orderbystatement("ORDER BY 2");

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  getoppatienttherapy() {
    if (this.selectedItem != "") {
      this.opSubscription.unsubscribe();
      this.opSubscription = new Subscription();
      this.prescriptions = [];
      this.opSubscription.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_opprescriptiontherapies&synapseattributename=epma_outpatientprescriptions_id&attributevalue=" + this.selectedItem).subscribe(
        (response) => {
          this.Oppatienttheripy = JSON.parse(response);
          let arr = this.appService.optherapies.find(x => x.opid == this.selectedItem)
          if (arr) {
            arr.opprescriptions = this.Oppatienttheripy.map(x => x.prescription_id)
          }
          else {
            this.appService.optherapies.push({ opid: this.selectedItem, opprescriptions: this.Oppatienttheripy.map(x => x.prescription_id) })
          }
          for (let r of this.Oppatienttheripy) {

            this.prescriptions.push(this.appService.Prescription.find(x => x.prescription_id == r.prescription_id));

            this.showprescriptionlist = true;

          }
          let duration = moment.duration(moment().diff(this.selectedobj.prescriptiondate));
          if (duration && duration.asHours() < this.appService.appConfig.AppSettings.timeallowtoupdateOpprescription) {
            this.showOpnotes = true;
          }
          else {
            this.showOpnotes = false;
          }

        }
      ));
    }
  }
  getoplist() {
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_outpatientprescriptions&synapseattributename=person_id&attributevalue=" + this.appService.personId).subscribe(
      (response) => {
        this.Oppatienttheripy = JSON.parse(response);
        this.Outpatientprescriptionslist = JSON.parse(response);
        this.Outpatientprescriptionslist.sort((a, b) => b.createdon.localeCompare(a.createdon));
        if (this.Outpatientprescriptionslist && this.Outpatientprescriptionslist.length > 0) {
          if (this.selectedItem == "") {
            this.selectedItem = this.Outpatientprescriptionslist[0].epma_outpatientprescriptions_id;
            // sessionStorage.setItem('selectedItem',this.selectedItem)
            this.appService.outPatientPrescriptionSelected = this.selectedItem;
            this.getOPNotesHistory();
          }
          this.selectedobj = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
          this.getoppatienttherapy();
        }

      }
    ));
  }
  ChoosenfilterdateChange(value: Date): void {

  }

  prescriptionchange(item: string) {
    this.selectedItem = item;
    // sessionStorage.setItem('selectedItem',this.selectedItem)
    this.appService.outPatientPrescriptionSelected = this.selectedItem;
    this.getOPNotesHistory();
    this.selectedobj = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
    this.showmanagelist = false;
    this.showprescriptionlist = false;
    this.getoppatienttherapy();
  }

  onTimeSelected(startime) {
    this.timeselected = startime;
  }
  showAddPrescription() {
    this.timeselected = moment().format("HH:mm");
    this.showpopup = true;
    if (this.appService.encounter.patienttypecode && +this.appService.encounter.patienttypecode == 1) {
      this.selectedopPrescriptionType = "NHS"
    }
    else if (this.appService.encounter.patienttypecode && +this.appService.encounter.patienttypecode == 2) {
      this.selectedopPrescriptionType = "Private"
    }
    else {
      this.selectedopPrescriptionType = "Please Select"
    }
  }

  closepopup() {
    this.showpopup = false;
    this.reset();

  }
  addOutpatient() {
    this.rContext = this.Outpatientprescriptionslist.find(x => x.epma_outpatientprescriptions_id == this.selectedItem)
    this.showmanagelist = true;
    this.showprescriptionlist = false
  }
  cancelManageList() {
    this.rContext = null;
    this.showmanagelist = false;
    this.showprescriptionlist = true
  }

  finishManageList() {

    this.rContext = null;
    this.getoppatienttherapy();
    this.showmanagelist = false;
    this.showprescriptionlist = false;
  }

  reset(){
    this.locationselected="";
    this.selectedispensing = "Please Select";
  this.selectedprescriptioncategory = "Please Select";

  }

  SavePrescription() {
    this.error = "";
    if (!this.Choosenfilterdate) {
      this.error = "Please select date";
      return;
    }
    if (this.timeselected == "") {
      this.error = "Please select time"
      return;
    }
    if (this.selectedopPrescriptionType == "Please Select") {
      this.error = "Please select Prescription Type"
      return;
    }
    if (this.selectedprescriptioncategory == "Please Select") {
      this.error = "Please select Prescription Category"
      return;
    }
    if (this.selectedispensing == "Please Select") {
      this.error = "Please select Dispensing"
      return;
    }
    if (this.hidelocation && (!this.locationselected || this.locationselected.length < 2)) {
      this.error = "Location should be Min 3 Characters"
      return;
    }




    this.Outpatientprescriptions = new Outpatientprescriptions();
    this.Outpatientprescriptions.epma_outpatientprescriptions_id = uuid();
    this.Outpatientprescriptions.createdby = this.prescriber;
    this.Outpatientprescriptions.createdbyrole = JSON.stringify(this.appService.loggedInUserRoles.filter(x=>x.toLowerCase().startsWith("epma")));
    this.Outpatientprescriptions.modifiedby = this.prescriber;
    this.Outpatientprescriptions.modifiedbyrole = JSON.stringify(this.appService.loggedInUserRoles.filter(x=>x.toLowerCase().startsWith("epma")));
    this.Outpatientprescriptions.prescriber = this.prescriber;
    this.Outpatientprescriptions.prescriberrole = JSON.stringify(this.appService.loggedInUserRoles.filter(x=>x.toLowerCase().startsWith("epma")));
    if (this.selectedLocation) {
      this.Outpatientprescriptions.locationtext = this.selectedLocation.name;
      this.Outpatientprescriptions.locationcode = this.selectedLocation.code;
    }
    else {
      this.Outpatientprescriptions.locationcode = "Other";
      this.Outpatientprescriptions.locationtext = this.locationselected;
    }

    this.Outpatientprescriptions.prescriptiontype = this.selectedopPrescriptionType;
    this.Outpatientprescriptions.prescriptioncategory = this.selectedprescriptioncategory;
    this.Outpatientprescriptions.dispensingto = this.selectedispensing;

    this.Outpatientprescriptions.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.Outpatientprescriptions.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    let date = moment(this.Choosenfilterdate).format("DD-MM-YYYY") + " " + this.timeselected;
    this.Outpatientprescriptions.prescriptiondate = this.appService.getDateTimeinISOFormat(moment(date, "DD-MM-YYYY HH:mm").toDate());
    this.Outpatientprescriptions.encounter_id = Common.op_encounter_placeholder;
    this.Outpatientprescriptions.person_id = this.appService.personId;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('local', 'epma_outpatientprescriptions', JSON.parse(JSON.stringify(this.Outpatientprescriptions)));
    upsertManager.save((resp: Outpatientprescriptions[]) => {

      this.appService.UpdateDataVersionNumber(resp);


      upsertManager.destroy();
      this.getoplist()
      this.selectedItem = this.Outpatientprescriptions.epma_outpatientprescriptions_id;
      // sessionStorage.setItem('selectedItem',this.selectedItem)
      this.appService.outPatientPrescriptionSelected = this.selectedItem;
      this.getOPNotesHistory();
      this.selectedobj = this.Outpatientprescriptions;
      this.showmanagelist = false;
      this.Choosenfilterdate = new Date()
      this.timeselected = moment().format("hh:mm")
      this.locationselected = this.appService.encounter.defaultopclinicname;
      this.selectedLocation = null;

      this.Outpatientprescriptions = new Outpatientprescriptions();
      this.showpopup = false;
      this.reset();

    },
      (error) => {
        this.Choosenfilterdate = null;
        this.timeselected = "";
        this.locationselected = this.appService.encounter.defaultopclinicname;
        this.selectedLocation = null;

        this.showpopup = false;
        this.Outpatientprescriptions = new Outpatientprescriptions();
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }

      }
    );
  }


  valuechange(newValue) {

    this.filterlocationlst = [];

    if (newValue.length > 2)
      this.selectedLocation = null;
    this.filterlocationlst = this.locationlst.filter(x => x.code.toLowerCase().startsWith(newValue.toLowerCase()) || x.name.toLowerCase().includes(newValue.toLowerCase()));
    console.log(newValue)
  }
  locationSelected(locationcode: string) {
    this.locationselected = this.locationlst.find(x => x.code == locationcode).name;
    this.selectedLocation = this.locationlst.find(x => x.code == locationcode);
  }

  hideAdministrationForm(isrefresh = false) {
    this.showopAdministration = false;
  }

  getPASData() {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/GetBaseViewListByPost/dischargesummary_persondetails', this.createClinicalSummaryNotesFilter())
        .subscribe((response) => {
          if (response) {
            let dsPersonDetails: any;
            dsPersonDetails = response;
            dsPersonDetails.forEach(element => {
              this.patientName = element.name;
              this.hospitalNumber = element.hospitalnumber;
              this.nhsNumber = element.nhsnumber;
              this.gender = element.gender;
              this.dob = element.dob;
              this.age = moment(dsPersonDetails != null ? moment() : '', moment.ISO_8601).diff(moment(element.dateofbirth, moment.ISO_8601), "years");
              this.address = element.address;
            });
          }
        })
    );
  }

  // printOutpatient()
  // {
  //   var element = this.printOPPrescribing.printBody.nativeElement;
  //   var opt = {
  //     margin:       [40,0,40,0],
  //     filename:     'myfile.pdf',
  //     image:        { type: 'jpeg', quality: 0.98 },
  //     html2canvas:  { scale: 2 },
  //     jsPDF:        { unit: 'pt', format: [800,650], orientation: 'portrait' },
  //     pagebreak:    { avoid: ['tr'] }
  //   };

  //   html2pdf().from(element).set(opt).toPdf().get('pdf').then((pdf) => {
  //     var totalPages = pdf.internal.getNumberOfPages();
  //     let currTime = moment(moment()).format('HH:mm');
  //     for (let i = 1; i <= totalPages; i++) {

  //       pdf.setPage(i);
  //       // set header to every page
  //       if(i > 1)
  //       {
  //         pdf.setFont(undefined,'bold');
  //         pdf.text('Name: ' + this.patientName + ' DOB: ' + this.dob + ' Age: ' + this.age + ' Gender: ' + ((this.gender == 'Male')?'M':'F') + ' Hospital Number: ' + this.hospitalNumber + ' NHS Number: ' + this.nhsNumber,60,30,null,null);
  //       }

  //      // set footer to every page
  //       pdf.setFont(undefined,'normal');
  //       pdf.setFontSize(10);
  //       var today = new Date();
  //       var dd = String(today.getDate()).padStart(2, '0');
  //       var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  //       var yyyy = today.getFullYear();

  //       let date =dd + '/' + mm + '/' + yyyy;
  //       pdf.text('Prescriber to print name, sign & date:________________________',30,770,null,null);
  //       pdf.text('Page '+ String(i) + ' of ' + totalPages + ' Date/Time: ' + date+ ' ' + currTime,220,790,null,null);
  //     }

  //     window.open(<any>pdf.output('bloburl'), '_blank');

  //   })
  //     // let pdf = new jsPDF('p', 'pt', [800,650]);
  //     // pdf.html(this.printOPPrescribing.printBody.nativeElement, {
  //     //   margin: [40,0,30,0],
  //     //   callback: (pdf) => {
  //     //     const pageCount = pdf.getNumberOfPages();
  //     //     let currTime = moment(moment()).format('HH:mm');
  //     //     for(var i = 1; i <= pageCount; i++)
  //     //     {
  //     //       pdf.setPage(i);
  //     //       if(i > 1)
  //     //       {
  //     //         pdf.setFont(undefined,'bold');
  //     //         pdf.text('Name: ' + this.patientName + ' DOB: ' + this.dob + ' Age: ' + this.age + ' Gender: ' + ((this.gender == 'Male')?'M':'F') + ' Hospital Number: ' + this.hospitalNumber + ' NHS Number: ' + this.nhsNumber,60,30,null,null);
  //     //       }

  //     //       pdf.setFont(undefined,'normal');
  //     //       var today = new Date();
  //     //       var dd = String(today.getDate()).padStart(2, '0');
  //     //       var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  //     //       var yyyy = today.getFullYear();

  //     //       let date =dd + '/' + mm + '/' + yyyy;
  //     //       pdf.text('Page '+ String(i) + ' of ' + pageCount + ' Date: ' + date+ ' Time: ' + currTime,250,780,null,null);
  //     //     }
  //     //     window.open(<any>pdf.output('bloburl'), '_blank');
  //     //   },
  //     // });

  // }

  createClinicalSummaryNotesFilter() {
    let condition = "";
    let pm = new filterParams();
    condition = "person_id = @person_id";
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));

    let f = new filters();
    f.filters.push(new filter(condition));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  openAllPrescriptionPrintingTemplate() {
    this.isLoading = true;
    setTimeout(() => {
      this.printOPTemplate = 'allprescription'
    }, 100);
  }

  openCDPrintingTemplate() {
    this.isLoading = true;
    setTimeout(() => {
      this.printOPTemplate = 'controlleddrugs'
    }, 100);
  }

  openGPPrintingTemplate() {
    this.isLoading = true;
    setTimeout(() => {
      this.printOPTemplate = 'generalpractitioner'
    }, 100);
  }

  destroyRecordsTemplate() {
    this.isLoading = false
    this.printing = false;
    this.printOPTemplate = false;
    this.cd.detectChanges();
  }


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  deleteConformation(){
    this.showerrormessage=false;
    if (this.othereReason.trim() == "" && this.reasonofdelete == "Other") 
      {
        this.showerrormessage=true;
        return
      }
    console.log(this.reasonofdelete)
    console.log(this.othereReason)
    this.showDeletepopup = false;
    this.showDeletepopupConform = true;
  }
  CleanAndCloneObject(obj: any) {
    var clone = {};

    Object.keys(obj).map((e) => {
      if (!e.startsWith("__")) {
        clone[e] = obj[e];
      }
    });
    return clone;
  }
  deletePresClick(){
    this.showerrormessage=false;
    this.othereReason="";
    this.reasonofdelete="Entered in error"; // default value
    this.showDeletepopup = true;
    if(this.selectedobj.isdeleted == true){//disabled script 
      if(this.selectedobj.deletedcomments == "Entered in error" || this.selectedobj.deletedcomments =="Prescribed for the wrong patient"){
        this.reasonofdelete=this.selectedobj.deletedcomments;
      }
      else{
        this.reasonofdelete="Other"
        this.othereReason=this.selectedobj.deletedcomments;
      }
    }
  }
  deletePresc(){
    this.showerrormessage=false;
    this.showDeletepopupConform = false;
    this.showDeletepopup = false;
    this.selectedobj.isdeleted = true;
    if(this.reasonofdelete == "Other"){
     
      this.selectedobj.deletedcomments=this.othereReason;
    }
    else{
      this.selectedobj.deletedcomments=this.reasonofdelete;
    }
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    upsertManager.addEntity('local', 'epma_outpatientprescriptions', JSON.parse(JSON.stringify(this.selectedobj)));
    for (let r of this.prescriptions) {
      r.isdeleted=true;
      upsertManager.addEntity('core', 'prescription', JSON.parse(JSON.stringify(this.CleanAndCloneObject(r))));
      let presSupply = this.appService.SupplyRequest.filter(x=> x.prescription_id == r.prescription_id && (x.requeststatus == "Pending" || x.requeststatus == "Incomplete"));
      for (let s of presSupply) {
        s.requeststatus = "Rejected";
        s.lastmodifiedby = this.appService.loggedInUserName;
        s.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
        if(this.reasonofdelete == "Other"){
         s.comment = this.othereReason;
        }
        else{
         s.comment = this.reasonofdelete;
        }
        upsertManager.addEntity('local', "epma_supplyrequest", JSON.parse(JSON.stringify(this.CleanAndCloneObject(s))));
      }
    }
    
    upsertManager.save((resp: Outpatientprescriptions[]) => {

      this.appService.UpdateDataVersionNumber(resp);


      upsertManager.destroy();     
      this.appService.outPatientPrescriptionSelected = this.selectedItem;    
      this.showmanagelist = false;
      this.Choosenfilterdate = new Date()
      this.timeselected = moment().format("hh:mm")
      this.showpopup = false;
      this.reset();

    },
      (error) => {
        this.Choosenfilterdate = null;
        this.timeselected = "";
        this.locationselected = this.appService.encounter.defaultopclinicname;
        this.selectedLocation = null;

        this.showpopup = false;
        this.Outpatientprescriptions = new Outpatientprescriptions();
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.subjects.ShowRefreshPageMessage.next(error);
        }

      }
    );

  }
  
}

export class clinicLocation {
  code: string;
  name: string;
}






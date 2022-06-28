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
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { jsPDF } from 'jspdf';
import { Dose, Epma_Medsonadmission, Medication, Prescription } from 'src/app/models/EPMA';
import { DoseType, PrescriptionContext, PrescriptionStatus } from 'src/app/services/enum';
import * as Canvg  from 'canvg';
import * as DOMPurify  from 'dompurify';
import * as html2canvas from 'html2canvas';
import { HelperService } from 'src/app/services/helper.service';
import { AppService } from 'src/app/services/app.service';
import moment from 'moment';
import * as html2pdf from 'html2pdf.js';
import { Subscription } from 'rxjs';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';

@Component({
  selector: 'app-print-discharge',
  templateUrl: './print-discharge.component.html',
  styleUrls: ['./print-discharge.component.css'],
})
export class PrintDischargeComponent implements OnInit, AfterViewInit {

  @Input() customTemplate: TemplateRef<any>;
  @Input() unChangedPres: Array<Prescription>;
  @Input() changedPres: Array<Prescription>;
  @Input() stoppedPres: Array<Prescription>;
  @Input() suspendedPres: Array<Prescription>;
  @Input() newPres: Array<Prescription>;
  @Input() dischargeComments: any;
  @Input() view: any = 'p';
  @Input() dimensions: any = [800,650];
  @Input() title: string = 'Discharge Summary';
  @Input() saveTitle: string = 'Discharge Summary';
  @Input() measuringUnit: any = 'pt';
  @Input() notesDisplayData: Array<any>;

  @Output() destroyComponent: EventEmitter<any> = new EventEmitter();
  @Output() getRecordedNotes: EventEmitter<any> = new EventEmitter();

  @ViewChild('dischargeSummaryElement')
  dischargeSummaryElement: ElementRef;

  therapyType: string;
  primaryMedication: Medication;
  patientDetails = { fullname: '', born: '', hospitalnumber: '', nhsnumber: '', allergies: '', dob: '', age: '', gender: '' };
  subscriptions: Subscription = new Subscription();
  arrreconcilation: any[] = [];
  AdditionalInfo: boolean = false;
  latestNotes: string = "";
  NodesType = "";
  dischargeSummaryComment: string;
  dischargeSummarystatus: string;

  constructor(private hs: HelperService, public appService: AppService, private apiRequest: ApirequestService) { }

  ngOnInit() {
    console.log('this.customTemplate',this.customTemplate);
    console.log('notesDisplayData',this.notesDisplayData);
    if (!this.customTemplate) {
      this.dischargeComments = this.dischargeComments[0];   

    this.getRecordedNotes.emit('');
    this.hs.getDosesPrescriptions(this.unChangedPres);
    this.hs.getDosesPrescriptions(this.changedPres);
    this.hs.getDosesPrescriptions(this.stoppedPres);
    this.hs.getDosesPrescriptions(this.suspendedPres);
    this.hs.getDosesPrescriptions(this.newPres);
    // console.log("suspendedPres", this.suspendedPres);
    console.log("stoppedPres", this.stoppedPres);
    // this.stoppedPrescription(this.stoppedPres);
    this.unChangedPres.forEach(pres => {
      const typeOfMedicine = this.getTherapyType(pres);
      pres["type_of_medicine"] = typeOfMedicine;
    });
    this.changedPres.forEach(pres => {
      const typeOfMedicine = this.getTherapyType(pres);
      pres["type_of_medicine"] = typeOfMedicine;
    });
    this.stoppedPres.forEach(pres => {
      const typeOfMedicine = this.getTherapyType(pres);
      pres["type_of_medicine"] = typeOfMedicine;
    });
    this.suspendedPres.forEach(pres => {
      const typeOfMedicine = this.getTherapyType(pres);
      pres["type_of_medicine"] = typeOfMedicine;
    });
    this.newPres.forEach(pres => {
      const typeOfMedicine = this.getTherapyType(pres);
      pres["type_of_medicine"] = typeOfMedicine;
    });
  }

  

    Canvg;
    DOMPurify;
    html2canvas;

  }

  ngAfterViewInit() {
      this.createPdf();
  }




  // create pdf from html and display in new tab.
  createPdf() {
    // console.log('patientDetails',this.patientDetails);
    this.patientDetails = this.appService.patientDetails;
    const splitAge = this.patientDetails.born?.split(' ');
    this.patientDetails.dob = splitAge[0] + ' ' + splitAge[1] + ' ' + splitAge[2];
    this.patientDetails.age = splitAge[3];

    let title = this.title

    let pdf = new jsPDF(this.view, this.measuringUnit, this.dimensions);
    if (this.customTemplate) {
      pdf.html(this.dischargeSummaryElement.nativeElement, {
        margin: [40,0,30,0],
        callback: (pdf) => {
          pdf.setProperties({
            title: this.title,
          });
  
          const pageCount = pdf.getNumberOfPages();
          let currTime = moment(moment()).format('HH:mm');
          for(var i = 1; i <= pageCount; i++)
          {
            pdf.setPage(i);
            if(i > 1)
            {
              pdf.setFont(undefined,'bold');
              pdf.text('Name: ' + this.patientDetails.fullname.split(',')[0]+',  ' + this.patientDetails.fullname.split(',')[1] + ' DOB: ' + this.patientDetails.dob + ' Age: ' + this.patientDetails.age + ' Gender: ' + ((this.patientDetails.gender == 'Male')?'M':'F') + ' Hospital Number: ' + this.patientDetails.hospitalnumber + ' NHS Number: ' + this.patientDetails.nhsnumber,130,30,null,null);
            }
            
            pdf.setFont(undefined,'normal');
            pdf.text('Page '+ String(i) + ' of ' + pageCount + ' Time: ' + currTime,350,580,null,null);
          }
          window.open(<any>pdf.output('bloburl'), '_blank');
          this.destroyComponent.emit('destroy');
        },
      });
    }
    else{
      pdf.html(this.dischargeSummaryElement.nativeElement, {
        margin: [40,0,40,0],
        callback: (pdf) => {
          // pdf.save('doc.pdf');    // for saving the document directly.
          pdf.setProperties({
            title: this.title,
          });
          const pageCount = pdf.getNumberOfPages();
          let currTime = moment(moment()).format('HH:mm');
          for(var i = 1; i <= pageCount; i++)
          {
            pdf.setPage(i);
            if(i > 1)
            {
              pdf.setFont(undefined,'bold');
              pdf.text('Name: ' + this.patientDetails.fullname.split(',')[0]+',  ' + this.patientDetails.fullname.split(',')[1] + ' DOB: ' + this.patientDetails.dob + ' Age: ' + this.patientDetails.age + ' Gender: ' + ((this.patientDetails.gender == 'Male')?'M':'F') + ' Hospital Number: ' + this.patientDetails.hospitalnumber + ' NHS Number: ' + this.patientDetails.nhsnumber,50,30,null,null);
            }
            
            pdf.setFont(undefined,'normal');
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();

            let date =dd + '-' + mm + '-' + yyyy;
            pdf.text('Page '+ String(i) + ' of ' + pageCount + ' Date: ' + date+ ' Time: ' + currTime,250,780,null,null);
          }
          window.open(<any>pdf.output('bloburl'), '_blank');
          this.destroyComponent.emit('destroy');
        },
      });
    }

    // html2pdf(this.dischargeSummaryElement.nativeElement, {
    //   margin:  [40,0,30,0],
    //   filename: this.title,
    //   // image: {type: 'jpeg', quality: 1},
    //   html2canvas: {dpi: 72, letterRendering: true},
    //   jsPDF: {unit: 'pt', format: 'a4', orientation: 'landscape'},
    //   // pdfCallback: pdfCallback
    // })

    // var opt = {
    //   margin: [40,0,30,0],
    //   html2canvas: {dpi: 192, letterRendering: true},
    //   jsPDF: {unit: 'pt', format: [842, 595], orientation: 'landscape'},
    // };

    // html2pdf().set(opt).from(this.dischargeSummaryElement.nativeElement).toPdf().get('pdf').then(function (pdf) {
    //   pdf.setProperties({
    //     title: title,
    //   });
    //   pdf.setFontSize(15);
    //   var totalPages = pdf.internal.getNumberOfPages();
    
    //   let currTime = moment(moment()).format('HH:mm');
    //   for(var i = 1; i <= totalPages; i++)
    //   {
    //     pdf.setPage(i);
    //     pdf.setFontSize(10);
    //     if(i > 1)
    //     {
    //       pdf.setFont(undefined,'bold');
    //       pdf.text('Name: ' + patientDetails.fullname + ' DOB: ' + patientDetails.dob + ' Age: ' + patientDetails.age + ' Gender: ' + ((patientDetails.gender == 'Male')?'M':'F') + ' Hospital Number: ' + patientDetails.hospitalnumber + ' NHS Number: ' + patientDetails.nhsnumber,110,30,null,null);
    //     }
        
    //     pdf.setFont(undefined,'normal');
    //     pdf.text('Page '+ String(i) + ' of ' + totalPages + ' Time: ' + currTime,350,580,null,null);
    //   }
    //   window.open(<any>pdf.output('bloburl'), '_blank');
    // });
  
  }

  getTherapyType(pres: Prescription) {
    this.primaryMedication = pres.__medications.find(e => e.isprimary == true);
    if (!this.primaryMedication.form) {
      return "therapy";
    }
    else if (this.primaryMedication.form.toLowerCase().indexOf("tablet") != -1 || this.primaryMedication.form.toLowerCase().indexOf("capsule") != -1) {
      return "TabletorCapsule";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("injection") != -1) {
      return "Injection";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("infusion") != -1) {
      if (pres.infusiontype_id == "ci") {
        return "ContinuousInfusion";
      } else {
        return "Infusion";
      }

    } else if (this.primaryMedication.form.toLowerCase().indexOf("fluid") != -1) {
      return "BasicFluids";
    } else if (this.primaryMedication.form.toLowerCase().indexOf("inhalation") != -1) {
      return "Inhalation";
    } else {
      return "therapy";
    }
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

  GetDischargeSummaryMessage(pres, componenttype, sumstatus) {
    // discharge summary comment
    let dischargeSummaryComment = "";
    let dischargeSummarystatus = "";
    if (componenttype == 'SUMNO') {
      let prescription_stop_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped || x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
      let prescription_cancel_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
      let prescription_suspend_statusid = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.suspended).prescriptionstatus_id;
      let allPrescription = this.appService.Prescription.filter(x => x.__medications.find(x => x.isprimary).__codes[0].code == pres.__medications.find(x => x.isprimary).__codes[0].code && x.prescriptioncontext_id != this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Discharge).prescriptioncontext_id);
      if (sumstatus == PrescriptionStatus.stopped) {
        let allStop = allPrescription.filter(x => x.prescriptionstatus_id == prescription_stop_statusid || x.prescriptionstatus_id == prescription_cancel_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));
        if (allStop && allStop.length > 0) {
          let comment = this.appService.prescriptionEvent.find(e => e.prescriptionid == allStop[0].prescription_id);
          if (comment) {
            dischargeSummaryComment = comment.comments;
            this.dischargeSummarystatus = PrescriptionStatus.stopped;
          }
        }
      }
      if (sumstatus == PrescriptionStatus.suspended) {
        let addedToChart = allPrescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Inpatient).prescriptioncontext_id).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
        if (addedToChart && addedToChart.length == 0)// this drug was not added to drug chart as inpatient medication 
        {
          dischargeSummaryComment = "Medicine suspended on admission";
          dischargeSummarystatus = PrescriptionStatus.suspended;
        }
        else {
          let allActive = allPrescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Inpatient).prescriptioncontext_id &&  x.prescriptionstatus_id != prescription_suspend_statusid && x.prescriptionstatus_id != prescription_stop_statusid && x.prescriptionstatus_id != prescription_cancel_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
          if (allActive && allActive.length > 0) // added to drug chart as inpatient medicaiton but, not to discharge prescription 
          {
            dischargeSummaryComment = "Medicine suspended on discharge";
            dischargeSummarystatus = PrescriptionStatus.suspended;
          } else {
            let allSuspend = allPrescription.filter(x => x.prescriptionstatus_id == prescription_suspend_statusid).slice().sort((b, a) => (moment(a.lastmodifiedon) > moment(b.lastmodifiedon)) ? 1 : ((moment(b.lastmodifiedon) > moment(a.lastmodifiedon)) ? -1 : 0));;
            if (allSuspend && allSuspend.length > 0) // added to drug chart and manually suspended 
            {
              let comment = this.appService.prescriptionEvent.find(e => e.prescriptionid == allSuspend[0].prescription_id);
              if (comment) {
                dischargeSummaryComment = comment.comments;
                dischargeSummarystatus = PrescriptionStatus.suspended;
              }
            }
          }
        }
      }
      return dischargeSummaryComment;
    }
  }
}

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
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import * as html2pdf from 'html2pdf.js'
import moment from 'moment';
import { AppService } from 'src/app/services/app.service';

@Component({
  selector: 'app-generate-op-prescribing-pdf',
  templateUrl: './generate-op-prescribing-pdf.component.html',
  styleUrls: ['./generate-op-prescribing-pdf.component.css']
})
export class GenerateOpPrescribingPdfComponent implements OnInit {

  // patientDetails = { fullname: '', born: '', hospitalnumber: '', nhsnumber: '', allergies: '', dob: '', age: '', gender: '', address: '' };
  allergies: any;
  allergiesString: string;

  @Input() customTemplate: TemplateRef<any>;
  @Input() allergyIntoleranceList: any;
  @Input() patientDetails: any;

  @Output() destroyComponent: EventEmitter<any> = new EventEmitter();
  @ViewChild('opPrescribingElement')
  opPrescribingElement: ElementRef;

  constructor(public appService: AppService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.printOutpatient();
    }, 500);
    
  }

  printOutpatient()
  {
    // this.patientDetails = this.appService.patientDetails;
    // const splitAge = this.patientDetails.born?.split(' ');
    // this.patientDetails.dob = splitAge[0] + ' ' + splitAge[1] + ' ' + splitAge[2];
    // this.patientDetails.age = splitAge[3];

    this.allergies = this.allergyIntoleranceList.filter(x => x.clinicalstatusvalue == 'Active');
    let string = '';
    this.allergies.forEach(function(element, idx, array) {
      if (idx === array.length - 1){ 
        string += element.causativeagentdescription;
      }
      else{
        string += element.causativeagentdescription + ', ';
      }
    });
    this.allergiesString = string;

    var element = this.opPrescribingElement.nativeElement;
    var opt = {
      margin:       [70,0,40,0],
      filename:     'myfile.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'pt', format: [800,650], orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all'] }
    };

    html2pdf().from(element).set(opt).toPdf().get('pdf').then((pdf) => {
      var totalPages = pdf.internal.getNumberOfPages();
      let currTime = moment(moment()).format('HH:mm');
      for (let i = 1; i <= totalPages; i++) {
        
        pdf.setPage(i);
        // set header to every page
        if(i > 1)
        {
          pdf.setFont(undefined,'bold');
          let splitDOB = this.patientDetails[0].dob.split('/');
          let patientDOB = splitDOB[1] + '/' + splitDOB[0] + '/' + splitDOB[2];

          pdf.text(' ' + this.patientDetails[0].name + ', ' +  moment(patientDOB).format("DD MMM YYYY") + ', ' + this.patientDetails[0].age + ', ' + this.patientDetails[0].gender + ', ' + this.patientDetails[0].hospitalnumber + ', ' + this.patientDetails[0].nhsnumber + ', ' + this.patientDetails[0].address,30,20,null,null);
          pdf.text(' ' + this.allergiesString, 30,30,{ maxWidth: 500 },null,null);
        }

       // set footer to every page
        pdf.setFont(undefined,'normal');
        pdf.setFontSize(10);
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        let date =dd + '/' + mm + '/' + yyyy;
        pdf.text('Prescriber to print name, sign & date:________________________',30,765,null,null);
        pdf.text('Royal National Orthopaedic Hospital Trust, Brockley Hill, Stanmore, Middlesex HA7 4LP. Tel: 020 8954 2300', 60,780,null,null);
        pdf.text('Page '+ String(i) + ' of ' + totalPages + ' Date/Time: ' + date+ ' ' + currTime,220,790,null,null);
      }

      window.open(<any>pdf.output('bloburl'), '_blank');
      this.destroyComponent.emit('destroy');
    })
      // let pdf = new jsPDF('p', 'pt', [800,650]);
      // pdf.html(this.printOPPrescribing.printBody.nativeElement, {
      //   margin: [40,0,30,0],
      //   callback: (pdf) => {
      //     const pageCount = pdf.getNumberOfPages();
      //     let currTime = moment(moment()).format('HH:mm');
      //     for(var i = 1; i <= pageCount; i++)
      //     {
      //       pdf.setPage(i);
      //       if(i > 1)
      //       {
      //         pdf.setFont(undefined,'bold');
      //         pdf.text('Name: ' + this.patientName + ' DOB: ' + this.dob + ' Age: ' + this.age + ' Gender: ' + ((this.gender == 'Male')?'M':'F') + ' Hospital Number: ' + this.hospitalNumber + ' NHS Number: ' + this.nhsNumber,60,30,null,null);
      //       }
            
      //       pdf.setFont(undefined,'normal');
      //       var today = new Date();
      //       var dd = String(today.getDate()).padStart(2, '0');
      //       var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      //       var yyyy = today.getFullYear();

      //       let date =dd + '/' + mm + '/' + yyyy;
      //       pdf.text('Page '+ String(i) + ' of ' + pageCount + ' Date: ' + date+ ' Time: ' + currTime,250,780,null,null);
      //     }
      //     window.open(<any>pdf.output('bloburl'), '_blank');
      //   },
      // });
    
  }

}

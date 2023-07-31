//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

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
import { Component, Input, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-template-number',
  templateUrl: './template-number.component.html',
  styleUrls: ['./template-number.component.css']
})
export class TemplateNumberComponent implements OnInit {
  @Input() marType = 'empty';
  headerLabelText = 'Enter Number of templates';
  colFieldName = 'Number of Templates';
  noOfTemplates = 1;
  isTemplateNumber = true;

  constructor(public bsModalRef: BsModalRef) { }

  ngOnInit(): void {
    if (this.marType === 'active') {
      this.headerLabelText = 'Enter number of days - Past Recorded Administration';
      this.colFieldName = 'Days';
    }
  }

  getTemplates() {
    this.bsModalRef.content.saveDone(this.noOfTemplates);
    this.bsModalRef.hide();
  }

  checkTemplateNumber(event) {
    if (event.target.value > 50) {
      this.isTemplateNumber = false;
    } else {
      this.isTemplateNumber = true;
    }
  }

  checkDecimal(event: any) {

    return event.charCode >= 48 && event.charCode <= 57;
  }

  cancel() {
    this.bsModalRef.content.cancel();
    this.bsModalRef.hide();
  }

}

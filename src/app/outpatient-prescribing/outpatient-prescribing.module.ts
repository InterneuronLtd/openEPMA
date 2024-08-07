//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Holdings Ltd

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
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OplistComponent } from './oplist/oplist.component';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
import { ComponentsModule } from '../components/components.module';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { PrintOpPrescribingComponent } from './print-op-prescribing/print-op-prescribing.component';
import { GenerateOpPrescribingPdfComponent } from './generate-op-prescribing-pdf/generate-op-prescribing-pdf.component';



@NgModule({
  declarations: [
    OplistComponent,
    PrintOpPrescribingComponent,
    GenerateOpPrescribingPdfComponent
  ],
  exports: [
    CKEditorModule,
    OplistComponent,
  ],
  imports: [
    PopoverModule.forRoot(),
    BsDropdownModule.forRoot(),
    BrowserAnimationsModule,
    CKEditorModule,
    ComponentsModule,
    BsDatepickerModule.forRoot(),
    CommonModule, FormsModule, ModalModule.forRoot(), ReactiveFormsModule,
    TypeaheadModule.forRoot(),
    
  ]
})
export class OutpatientPrescribingModule { }

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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReconciliationComponent } from './reconciliation/reconciliation.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { ComponentsModule } from '../components/components.module';
import { ReconciliationNotesComponent } from './reconciliation-notes/reconciliation-notes.component';
import { FormsModule } from '@angular/forms';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { ReconciliationListsComponent } from './reconciliation-lists/reconciliation-lists.component';



@NgModule({
  declarations: [ReconciliationComponent, ReconciliationNotesComponent,ReconciliationListsComponent],
  imports: [
    CommonModule,
    ComponentsModule,
    CKEditorModule,
    FormsModule,
    ModalModule.forRoot()
  ],
  exports: [
    CKEditorModule,
 
    ReconciliationListsComponent,
    ReconciliationComponent,
    ReconciliationNotesComponent]
})
export class ReconciliationModule { }

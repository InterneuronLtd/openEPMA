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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InpatientPrescribingComponent } from './inpatient-prescribing/inpatient-prescribing.component';
import { ComponentsModule } from '../components/components.module';
import { FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';


@NgModule({
  declarations: [
    InpatientPrescribingComponent
  ],
  imports: [
    CommonModule,
    ComponentsModule,
    FormsModule,
    ModalModule.forRoot()
  ],
  exports: [
    InpatientPrescribingComponent
  ]
})
export class InpatientPrescribingModule { }

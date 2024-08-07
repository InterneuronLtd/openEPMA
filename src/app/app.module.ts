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
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { ComponentsModule } from './components/components.module';
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { InpatientPrescribingModule } from './inpatient-prescribing/inpatient-prescribing.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OutpatientPrescribingModule } from './outpatient-prescribing/outpatient-prescribing.module';
import { ToastrModule } from "ngx-toastr";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ComponentsModule,
    FormsModule,
    BsDatepickerModule.forRoot(),
    InpatientPrescribingModule,
    ReconciliationModule,
    OutpatientPrescribingModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 10000,
      preventDuplicates: true,
  }),
  ],
  providers: [
    DatePipe
  ],
  bootstrap: [],
  entryComponents: [AppComponent]

})
export class AppModule {
  constructor(private injector: Injector) {
  }

  ngDoBootstrap() {
    const el = createCustomElement(AppComponent, { injector: this.injector });
    customElements.define('app-epma', el);
  }
}

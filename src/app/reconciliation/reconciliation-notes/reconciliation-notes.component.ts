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
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { Epma_Medsonadmission } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { PrescriptionContext } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { v4 as uuid } from 'uuid';
import * as ClassicEditor from 'src/assets/stylekit/ds-ckeditor.js';
import { CKEditor5, ChangeEvent, FocusEvent, BlurEvent } from '@ckeditor/ckeditor5-angular';
@Component({
  selector: 'app-reconciliation-notes',
  templateUrl: './reconciliation-notes.component.html',
  styleUrls: ['./reconciliation-notes.component.css']
})
export class ReconciliationNotesComponent implements OnInit, OnDestroy  {

  @Output() notesClose = new EventEmitter();


  ngOnDestroy() {

    this.subscriptions.unsubscribe();

  }
  constructor(public subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService) {
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

    this.subscriptions.add(this.subjects.reconcillationNotes.subscribe
      ((session: any) => {
        this.AdditionalInfo = false;
        this.latestNotes = "";
        console.log("Discharge note opening...........")
        console.log(session instanceof Epma_Medsonadmission)
        console.log(typeof session)
        this.arrreconcilation = [];
        this.reconcilationobject = session.object;
        if (session.type == "MOA") {
          let arrysources = []
          let prescriptionsourcesarray = this.appService.Prescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id)
          for (let pres of prescriptionsourcesarray) {

            let sources = JSON.parse(pres.prescriptionsources);
            if (sources != null) {
              for (let source of sources) {

                arrysources.push(this.appService.MetaPrescriptionSource.find(y => y.prescriptionsource_id == source).displayname)
              }
            }

          }

          arrysources = arrysources.filter(function (x, i, a) {
            return a.indexOf(x) == i;
          });
          this.Prescripsource = arrysources.join(', ');
          this.NodesType = "MOA";
          this.NoteHeader = "Medications on admission notes";
          this.NoteHeaderMessage = "Please specify if language barrier, visual needs, hearing difficulties, compliance issues, counselling requirements. How does the patients manage their medications?"


        }
        else {
          this.NodesType = "SUM"
          this.NoteHeader = "Pharmacy notes";
          this.NoteHeaderMessage = "";

        }
        this.getmodonadmissionhistory();
        this.showpopup = this.appService.showDischargeSummaryNotes;
      }));
  }

  public disableTextarea:boolean=true;
  public Editor = ClassicEditor;
  Prescripsource = "";
  reconcilationobject: any;
  arrreconcilation: any[] = [];
  subscriptions: Subscription = new Subscription();
  NoteHeader = "";
  NoteHeaderMessage = "";
  AdditionalInfo: boolean = false;
  latestNotes: string = "";
  historynotes: string = "";
  NodesType = "";
  showpopup = false;
  showerror = false;
  ngOnInit(): void {

  }

  getmodonadmissionhistory() {
    let baseviewname = "";
    if (this.NodesType == "MOA") {
      baseviewname = "epma_modonadmissionhistory";
    }
    else {
      baseviewname = "epma_dischargesummarryhistory";
    }

    this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/" + baseviewname, this.CreateSessionFilter()).subscribe(
      (response) => {
        response.sort((a, b) => b._sequenceid - a._sequenceid);
        for (let notesModel of response) {

          this.arrreconcilation.push(<Epma_Medsonadmission>notesModel);
        }
        this.arrreconcilation = this.arrreconcilation.filter(x => x.action == "Notes")
        if (this.arrreconcilation.length > 0) {
          this.latestNotes = this.arrreconcilation[0].notes;
          this.AdditionalInfo = this.arrreconcilation[0].noteshasaddinfo;
        }

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
  sethistorynotes(notes: any) {
    this.historynotes = notes;
  }
  saveNotes() {

    if (this.latestNotes.trim() == "") {
      this.showerror = true;
      return;
    }
    else {
      this.showerror = false;
    }
    this.reconcilationobject.action = "Notes";

    this.reconcilationobject.modifiedon = this.appService.getDateTimeinISOFormat(new Date());
    this.reconcilationobject.modifiedby = this.appService.loggedInUserName;
    this.reconcilationobject.notes = this.latestNotes;

    this.reconcilationobject.noteshasaddinfo = this.AdditionalInfo;
    Object.keys(this.reconcilationobject).map((e) => { if (e.startsWith("_")) delete this.reconcilationobject[e]; })
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    let entity = "";
    if (this.NodesType == "MOA") {
      entity = "epma_medsonadmission";
    }
    else {
      entity = "epma_dischargesummarry";
    }
    upsertManager.addEntity('local', entity, JSON.parse(JSON.stringify(this.reconcilationobject)));
    upsertManager.save((resp: any) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.showpopup = false;
      this.notesClose.emit();

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }, false
    );

  }

}

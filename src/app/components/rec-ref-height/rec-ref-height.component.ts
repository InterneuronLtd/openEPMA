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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { Observation, Observationevent } from '../../models/observations.model';
import { ApirequestService } from '../../services/apirequest.service';
import { AppService } from '../../services/app.service';
import { SubjectsService } from '../../services/subjects.service';

@Component({
  selector: 'app-rec-ref-height',
  templateUrl: './rec-ref-height.component.html',
  styleUrls: ['./rec-ref-height.component.css']
})
export class RecRefHeightComponent implements OnInit, OnDestroy {

  subscriptions: Subscription = new Subscription();

  observationevent_id: string = '';
  eventcorrelationid: string;
  height: any;
  errorMessage: string = "";
  unitOfMeasure: string;
  headerLabelText: string;
  isSaving: boolean = false;
  invalidHeight = false;

  constructor(public appService: AppService, private apiRequest: ApirequestService, private subjects: SubjectsService, public bsModalRef: BsModalRef) {
    this.headerLabelText = "Reference height";
    this.unitOfMeasure = "cm";
    this.init();
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  init() {
    this.errorMessage = "";
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getheightobservations", this.createHeightFilter())
        .subscribe((response) => {
          if (response.length > 0) {
            if (response[0].value != "" || response[0].value != null) {
              this.height = response[0].value;
            } else {
              this.height = 0;
            }
          } else {
            this.height = 0;
          }
        }
        )
    );
  }

  inputCheck(event) {
    let height = event.target.value.toString();
    let [leftDigits, rightDigits] = height.split('.');
    let newLeftDigit;
    let newRightDigit;
    if (leftDigits.length > 3) {
      newLeftDigit = leftDigits.slice(0, 3);
    } else {
      newLeftDigit = leftDigits;
    }
    if (rightDigits && rightDigits.length > 2) {
      newRightDigit = rightDigits.slice(0, 2);
    } else if (rightDigits) {
      newRightDigit = rightDigits
    }
    let updatedHeight: any = newLeftDigit + (newRightDigit ? ('.' + newRightDigit) : '');
    if (leftDigits.length === 2 && leftDigits[0] === '0' && leftDigits[1] === '0') {
      updatedHeight = '0';
    }


    setTimeout(() => {
      if (updatedHeight == 0) {
        updatedHeight = undefined;
      }
      this.height = updatedHeight;
      this.errorMessage = "";
    }, 0);

  }

  saveHeightObs() {
    let isAmend: boolean = false;
    let observation_id: string = uuidv4();
    let personId: string = this.appService.personId;
    let encounterId: string = this.appService.encounter.encounter_id;
    let scale: string = this.appService.obsScales.filter(x => x.scaletypename == this.appService.currentEWSScale)[0].observationscaletype_id;
    let loggedInUser: string = this.appService.loggedInUserName;

    if (this.errorMessage == "" && this.height && !(isNaN(this.height) || this.height <= 0)) {
      this.isSaving = true;
      this.observationevent_id = uuidv4();
      this.eventcorrelationid = uuidv4();

      let newObsEvent = new Observationevent(
        this.observationevent_id,
        personId,
        this.getDateTime(),
        this.getDateTime(),
        loggedInUser,
        encounterId,
        isAmend,
        168,
        scale,
        null,
        null,
        loggedInUser,
        null,
        null,
        this.eventcorrelationid,
        true);

      let heightObs = new Observation(
        observation_id,
        "",
        "",
        newObsEvent.datefinished,
        newObsEvent.observationevent_id,
        "83a4b253-5599-43d2-a377-9f8001e7dbac",
        "",
        this.height.toString(),
        false,
        loggedInUser,
        this.eventcorrelationid
      );

      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observationevent", JSON.stringify(newObsEvent))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);


          this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observation", JSON.stringify(heightObs))
            .subscribe((response) => {
              this.appService.UpdateDataVersionNumber(response);

              this.appService.isHeightCaptured = true;
              this.appService.refHeightValue = this.height;

              if (this.appService.isWeightCapturedForToday) {
                this.appService.bodySurfaceArea = +(Math.sqrt(+this.appService.refWeightValue * +this.height) / 60).toFixed(2);
              }
              this.appService.setIdealBodyWeight();

              this.appService.patientInfo.height = this.appService.refHeightValue;
              this.appService.patientInfo.bsa = this.appService.bodySurfaceArea;

              this.bsModalRef.content.saveDone(true);
              this.bsModalRef.hide();
              this.subjects.frameworkEvent.next("UPDATE_HEIGHT_WEIGHT");
            }, (error) => {
              this.bsModalRef.hide();
              if (this.appService.IsDataVersionStaleError(error)) {
                this.appService.RefreshPageWithStaleError(error);
              }
            })
          );
        }, (error) => {
          this.bsModalRef.hide();
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
      );
    } else {
      this.errorMessage = "Please enter correct value";
    }
  }

  createHeightFilter() {
    //let condition = "person_id = @person_id and encounter_id = @encounter_id";
    let condition = "person_id = @person_id";

    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    // pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY observationeventdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  getDateTime(): string {
    var date = new Date();

    let year = date.getFullYear();
    let month = (date.getMonth() + 1);
    let day = date.getDate();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();
    let msecs = date.getMilliseconds();

    let returndate = (year + "-" + (month < 10 ? "0" + month : month) + "-" + (day < 10 ? "0" + day : day) +
      "T" + (hrs < 10 ? "0" + hrs : hrs) + ":" + (mins < 10 ? "0" + mins : mins) + ":" + (secs < 10 ? "0" + secs : secs) + "." + (msecs < 10 ? "00" + msecs : (msecs < 100 ? "0" + msecs : msecs)));

    return returndate;
  }

}

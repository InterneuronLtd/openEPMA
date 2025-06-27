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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { RefWeightType } from 'src/app/services/enum';
import { v4 as uuidv4 } from 'uuid';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from '../../models/filter.model';
import { Observation, Observationevent } from '../../models/observations.model';
import { ApirequestService } from '../../services/apirequest.service';
import { AppService } from '../../services/app.service';
import { SubjectsService } from '../../services/subjects.service';

@Component({
  selector: 'app-ref-weight-height',
  templateUrl: './ref-weight-height.component.html',
  styleUrls: ['./ref-weight-height.component.css']
})
export class RefWeightHeightComponent implements OnInit, OnDestroy {

  subscriptions: Subscription = new Subscription();

  observationevent_id: string = '';
  eventcorrelationid: string;
  weight: number;
  errorMessage: string = "";
  unitOfMeasure: string;
  headerLabelText: string;

  isSaving: boolean = false;
  invalidWeight = false;
  estimated = false;
  constructor(public appService: AppService, private apiRequest: ApirequestService, private subjects: SubjectsService, public bsModalRef: BsModalRef) {
    this.headerLabelText = "Reference weight";
    this.unitOfMeasure = "kg";
    this.init();

    /*this.subscriptions.add(
      this.subjects.weightChanged
        .subscribe(() => {
          this.init();
        })
    )*/
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  init() {
    this.errorMessage = "";
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getweightobservations", this.createWeightFilter())
        .subscribe((response) => {

          if (response.length > 0) {
            if (response[0].value != "" || response[0].value != null) {
              this.weight = response[0].value;
              this.estimated = (response[0].method ?? "").indexOf("258083009") >= 0 ? true : false;

            } else {
              this.weight = 0;
            }
          } else {
            this.weight = 0;
          }
        }
        )
    );
  }

  saveWeightObs() {

    let isAmend: boolean = false;
    let observation_id: string = uuidv4();
    let personId: string = this.appService.personId;
    let encounterId: string = this.appService.encounter.encounter_id;
    let scale: string = this.appService.obsScales.filter(x => x.scaletypename == this.appService.currentEWSScale)[0].observationscaletype_id;
    let loggedInUser: string = this.appService.loggedInUserName;

    if (this.errorMessage == "" && this.weight && !(isNaN(this.weight) || this.weight <= 0)) {
      this.isSaving = true;
      this.observationevent_id = uuidv4();
      this.eventcorrelationid = uuidv4();
      let method = this.estimated == true ? "258083009 | Visual estimation (qualifier value)" : "115341008 | Total measurement (qualifier value)"
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

      let weightObs = new Observation(
        observation_id,
        "",
        "",
        newObsEvent.datefinished,
        newObsEvent.observationevent_id,
        "71d6a339-7d9e-4054-99d6-683da95331dc",
        "",
        this.weight.toString(),
        false,
        loggedInUser,
        this.eventcorrelationid,
        method
      );

      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observationevent", JSON.stringify(newObsEvent))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observation", JSON.stringify(weightObs))
            .subscribe((response) => {
              this.appService.UpdateDataVersionNumber(response);

              this.appService.isWeightCapturedForToday = true;
              this.appService.refWeightValue = this.weight;
              this.appService.refWeightRecordedOn = moment(new Date()).format('DD-MMM-yyyy');
              this.appService.refWeightType = this.estimated ? RefWeightType.estimated : RefWeightType.actual;
              if (this.appService.isHeightCaptured) {
                this.appService.bodySurfaceArea = +(Math.sqrt(+this.weight * +this.appService.refHeightValue) / 60).toFixed(2);
              }
              this.appService.setIdealBodyWeight();

              this.appService.patientInfo.bsa = this.appService.bodySurfaceArea;
              this.appService.patientInfo.weight = this.appService.refWeightValue;

              //this.subjects.weightChanged.next();
              this.bsModalRef.content.saveDone(true);
              this.bsModalRef.hide();
              this.subjects.showBannerWarnings.next(true);
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
      this.errorMessage = "Please enter valid weight";
    }
  }

  createWeightFilter() {
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

  inputCheck(event) {
    let weight = event.target.value.toString();

    let [leftDigits, rightDigits] = weight.split('.');
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
    let updatedWeight = Number(newLeftDigit + (newRightDigit ? ('.' + newRightDigit) : ''));
    if (updatedWeight == 0) {
      updatedWeight = undefined;
    }
    setTimeout(() => {
      this.weight = updatedWeight;
      this.errorMessage = "";
    }, 0);

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

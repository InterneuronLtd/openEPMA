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
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { CoreResult } from 'src/app/models/core-result.model';
import { Dose, DoseEvents, Medication, Medicationadministration, Prescription } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { DoseType, PrescriptionStatus } from 'src/app/services/enum';
import { SubjectsService } from 'src/app/services/subjects.service';
import { TimelineServiceService } from 'src/app/services/timeline-service.service';
import { v4 as uuid } from 'uuid';
import { Graph2d, Graph2dStyleType } from 'vis-timeline/standalone';

@Component({
  selector: 'app-titration-chart',
  templateUrl: './titration-chart.component.html',
  styleUrls: ['./titration-chart.component.css']
})

export class TitrationChartComponent implements OnInit, OnDestroy {
  graphStyle: Graph2dStyleType = 'points';
  showTitration: boolean = false;
  componenttype: string;
  isOnlyShowChart: boolean;
  prescription: Prescription;
  //@Input() administration: Medicationadministration;
  @Input() dose: any;
  @Input('event') event: any
  subscriptions = new Subscription();
  primaryMedication: Medication;
  selectedResult: CoreResult = new CoreResult();
  titationChart: TitrationChart[] = [];
  doseEvent: DoseEvents = new DoseEvents();
  titrateadministration: Medicationadministration = new Medicationadministration();
  medication: Medication = new Medication();
  minDate: Date;
  maxDate: Date;
  startime: string = moment(new Date()).format('HH:mm');
  stardate: string = moment(new Date()).format('DD-MM-YYYY');
  administeredtime: string = moment(new Date()).format('HH:mm');
  administereddate: string = moment(new Date()).format('DD-MM-YYYY');
  titratedtime: string = moment(new Date()).format('HH:mm');
  tititrateddate: string = moment(new Date()).format('DD-MM-YYYY');
  validatiommessage: string = "";
  comments: string = "";
  isAdministation: boolean = false;
  isUptoDate: boolean = false;
  uptoDateType: string = "";
  showSpinner: boolean = false;
  //@Output() hideTitrationForm = new EventEmitter();
  labResult: any[] = [];
  doseResult: any[] = [];
  graphMaxLabValue: number = 0;
  grpahMaxDoseValue: number = 0;
  graphMinDate: Date = new Date();
  graphMaxDate: Date = new Date();
  graphLoader: boolean = false;
  dose_id: string;
  titationDateArray = [];
  vtm_dose_units = [];
  docterDoseEvent: DoseEvents = new DoseEvents();
  titrationPrescription: any;
  constructor(private timelineService: TimelineServiceService, public subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService, private dr: DataRequest) {

  }
  ngAfterViewInit() {
    this.GetChartData(this.prescription.titrationtypecode)
  }

  GetChartData(type: string) {
    if (type) {
      type = type.toLowerCase();
      if (type == "o2" || type == "map" || type == "g")
        this.GetObservationsData(type);
      else
        this.GetResultsData(type);
    }
  }

  GetResultsData(type: string) {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetListByPost/core/result/", this.CreateResultsFilter(type))
        .subscribe((response) => {
          response.forEach((value, index) => {
            if (!isNaN(value.observationvalue) && +value.observationvalue > 0 && +value.observationvalue != Infinity)
              this.labResult.push({ x: moment(value.observationdatetime, "YYYY-MM-DD HH:mm"), y: value.observationvalue, group: 0, label: { content: [value.observationvalue, value.unitstext].join(" "), xOffset: 0, yOffset: -7 } });
          });

          this.appService.logToConsole(this.labResult);
          this.loadGraph();
        })
    );
  }

  CreateResultsFilter(type: string) {
    let mapping = this.appService.appConfig.AppSettings.titratesIdMapping[type];
    let codes = []
    if (mapping && Array.isArray(mapping)) {
      mapping.forEach(e => {
        codes.push(["'", e.toUpperCase(), "'"].join(""));
      });
    }
    else {
      codes.push(["'", type.toUpperCase(), "'"].join(""));
    }

    let condition = `upper(observationidentifiercode) in (${codes.join(",")}) and person_id = @person_id`;
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));

    let select = new selectstatement("SELECT observationvalue, observationdatetime, unitstext");

    let orderby = new orderbystatement("ORDER BY observationdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  GetObservationsData(type: string) {
    if (type.toLowerCase() == 'o2') {
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getoxygenobservations", this.createPersonEncounterFilter())
          .subscribe((response) => {
            if (response.length > 0) {
              response.forEach((value, index) => {
                if (!isNaN(value.value) && +value.value > 0 && +value.value != Infinity)
                  this.labResult.push({ x: moment(value.observationeventdatetime, "YYYY-MM-DD HH:mm"), y: value.value, group: 0, label: { content: value.value, xOffset: -5, yOffset: -7 } });
              });
              this.loadGraph();

            }
          }));
    }
    else if (type.toLowerCase() == 'map') {
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getbpobservations", this.createPersonEncounterFilter())
          .subscribe((response) => {
            if (response.length > 0) {
              response.forEach((value, index) => {
                if (!isNaN(value.systolic) && !isNaN(value.diastolic) && +(value.systolic) > 0 && +(value.systolic) > 0) {
                  let map = +(value.diastolic) + (1 / 3) * (+(value.systolic) - +(value.diastolic));
                  this.labResult.push({ x: moment(value.observationeventdatetime, "YYYY-MM-DD HH:mm"), y: map.toFixed(2), group: 0, label: { content: map.toFixed(2), xOffset: 0, yOffset: -7 } });
                }
              });
              this.loadGraph();
            }
          }));
    } else if (type.toLowerCase() == 'g') {
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getglucoseobservations", this.createPersonEncounterFilter())
          .subscribe((response) => {
            if (response.length > 0) {
              response.forEach((value, index) => {
                if (!isNaN(value.value) && +value.value > 0 && +value.value != Infinity)
                  this.labResult.push({ x: moment(value.observationeventdatetime, "YYYY-MM-DD HH:mm"), y: value.value, group: 0, label: { content: value.value, xOffset: -5, yOffset: -7 } });
              });
            }
            this.GetResultsData(type);
          }));
    }
  }

  createPersonEncounterFilter() {
    let condition = "person_id = @person_id and encounter_id = @encounter_id";
    //let condition = "person_id = @person_id";

    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY observationeventdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  loadGraph() {
    this.docterDoseEvent = null;
    if (this.labResult.length > 0) {
      this.graphMinDate = new Date(Math.min.apply(null, this.labResult.map(function (e) { return new Date(e.x); })));
      this.graphMaxDate = new Date(Math.max.apply(null, this.labResult.map(function (e) { return new Date(e.x); })));
      this.graphMaxLabValue = Math.max.apply(Math, this.labResult.map(function (o) { return o.y; }));
    }
    let hours: any = "hour";
    // lab result chart
    var container = document.getElementById("visualization");
    let tchart = new TitrationChart();
    tchart.graph = new Graph2d(container, this.labResult, null, this.GetChartOption(this.graphMaxLabValue, hours));
    this.titationChart.push(tchart);

    // administration chart
    let index = 0;
    this.titrationPrescription.forEach(element => {
      let doseResult = this.GetDoseResult(element);
      let count = Math.max.apply(Math, doseResult.map(function (o) { return o.y; }));
      var container1 = document.getElementById("visualization" + index);
      let tchart2 = new TitrationChart();
      tchart2.graph = new Graph2d(container1, doseResult, null, this.GetChartOption(count, hours));
      this.titationChart.push(tchart2);
      index++;
    });

    // current titration prescription chart
    let currDoseResult = this.GetDoseResult(this.prescription)
    let count = Math.max.apply(Math, currDoseResult.map(function (o) { return o.y; }));
    var container1 = document.getElementById("visualizationCurrent");
    var bottomChartOptionWithTimeline = {
      dataAxis: {
        left: {
          range: { min: 0, max: count + 5 }
        }
      },
      timeAxis: { scale: hours },
      drawPoints: true,
      legend: false,
      start: moment().add(-1, "days").format("YYYY-MM-DD HH:mm"),
      end: moment().format("YYYY-MM-DD HH:mm"),
      min: moment(this.appService.encounter.sortdate).format("YYYY-MM-DD HH:mm"),
      width: '100%',
      format: {
        minorLabels: {
          hour: 'HH',
        }
      },
      //zoomMin: 6000000*35,
      zoomMax: 6000000 * 15,
      graphHeight: '180px',
    };

    let currentPrescriptionChart = new TitrationChart();
    currentPrescriptionChart.graph = new Graph2d(container1, currDoseResult, null, bottomChartOptionWithTimeline);
    this.titationChart.push(currentPrescriptionChart);

    // zoom in and out all chart together
    for (let ch of this.titationChart) {
      ch.graph.on('rangechange', function (changes) {
        for (let chInner of this.titationChart) {
          chInner.graph.setWindow(changes.start, changes.end, { animation: false });
        }
      }.bind(this));
    }
  }
  GetChartOption(masxRange, scale) {
    var options = {
      orientation: "none",
      dataAxis: {
        left: {
          range: { min: 0, max: masxRange + 15 }
        }
      },
      //showMajorLabels : false,
      timeAxis: { scale: scale },
      legend: false,
      start: moment().add(-1, "days").format("YYYY-MM-DD HH:mm"),
      end: moment().format("YYYY-MM-DD HH:mm"),
      min: moment(this.appService.encounter.sortdate).format("YYYY-MM-DD HH:mm"),
      width: '100%',
      format: {
        minorLabels: {
          hour: 'HH',
        }
      },
      graphHeight: '180px',
      zoomMax: 6000000 * 15,
      style: this.graphStyle
    };
    return options;
  }
  GetDoseResult(p) {
    let result = [];
    let administeredDoses = this.appService.Medicationadministration.filter(e => e.prescription_id == p.prescription_id);
    if (p.isinfusion) {
      administeredDoses.forEach((value, index) => {
        result.push({ x: moment(value.administrationstartime, "YYYY-MM-DD HH:mm"), y: value.administredinfusionrate, group: 0, label: { content: [value.administredinfusionrate, value.administreddoseunit ? value.administreddoseunit : "ml/h"].join(" "), xOffset: 0, yOffset: -7 } });

      });
    } else {
      administeredDoses.forEach((value, index) => {
        if (value.administreddosesize)
          result.push({ x: moment(value.administrationstartime, "YYYY-MM-DD HH:mm"), y: parseFloat(value.administreddosesize).toFixed(0), group: 0, label: { content: [value.administreddosesize, value.administreddoseunit].join(" "), xOffset: 0, yOffset: -7 } });
        if (value.administeredstrengthdenominator)
          result.push({ x: moment(value.administrationstartime, "YYYY-MM-DD HH:mm"), y: parseFloat(value.administeredstrengthdenominator + "").toFixed(0), group: 0, label: { content: [value.administeredstrengthdenominator, value.administeredstrengthdenominatorunits].join(" "), xOffset: 0, yOffset: -7 } });

      });
    }
    return result;
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.titationChart.forEach(e => {
      e.graph.destroy();
      e.group = null;
      e.items = null;
      e.options = null;
    });
  }
  ngOnInit(): void {
    this.prescription = this.event.prescription;
    this.isOnlyShowChart = this.event.isOnlyShowChart;
    this.componenttype = this.event.componenttype;
    let pStopId = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.stopped).prescriptionstatus_id;
    let pCancelId = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.cancelled).prescriptionstatus_id;
    this.titrationPrescription = this.appService.Prescription.slice().filter(x => x.titrationtypecode == this.prescription.titrationtypecode && x.prescriptionstatus_id != pStopId && x.prescriptionstatus_id != pCancelId);

    //remove current prescription for now
    const i: number = this.titrationPrescription.indexOf(this.prescription);
    this.titrationPrescription.splice(i, 1);

    if (!this.isOnlyShowChart) {
      this.dose = this.event.dose;
      this.medication = this.prescription.__medications.find(e => e.isprimary == true);
      if (this.dose.dose_id.indexOf('_') != -1) {
        this.dose_id = this.dose.dose_id.split('_')[1];
      } else {
        this.dose_id = this.dose.dose_id;
      }
      this.docterDoseEvent = this.appService.DoseEvents.find(e => e.dose_id == this.dose.dose_id.split('_')[1]
        && e.posology_id == this.dose.posology_id
        && moment(e.startdatetime).format("YYYYMMDDHHmm") == moment(this.dose.eventStart).format("YYYYMMDDHHmm")
        && e.eventtype == 'Comment' && e.iscancelled == false);
      if (this.docterDoseEvent) {
        this.comments = this.docterDoseEvent.comments;
      }
      var timelineDose = this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).__dose.find(d => d.dose_id === this.dose_id);
      this.doseEvent.doseevents_id = uuid();
      this.doseEvent.eventtype = "titration";
      this.doseEvent.posology_id = this.dose.posology_id;
      //this.doseEvent.titrateddoseunit = timelineDose.doseunit;
      if (!this.medication.name.startsWith("Warfarin")) {
        this.dr.SetUnits(this.medication.__codes[0].code, (data) => {
          this.doseEvent.titrateddoseunit = data;
        });
      }
      if (this.medication.name.startsWith("Warfarin")) {
        this.doseEvent.titrateddoseunit = "mg";
      }
      this.doseEvent.prescription_id = this.prescription.prescription_id;
      this.doseEvent.titratedstrengthneumeratorunits = timelineDose.strengthneumeratorunit;
      this.doseEvent.titratedstrengthdenominatorunits = timelineDose.strengthdenominatorunit;
      this.doseEvent.startdatetime = moment(this.dose.eventStart).format('DD-MM-YYYY HH:mm');
      this.doseEvent.titrateduntildatetime = this.doseEvent.startdatetime;
      this.doseEvent.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
      this.doseEvent.modifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());;
      this.doseEvent.createdby = this.appService.loggedInUserName;
      this.doseEvent.modifiedby = this.appService.loggedInUserName;
      this.doseEvent.dose_id = this.dose_id;
      this.doseEvent.logicalid = this.dose.dose_id;
      this.doseEvent.grouptitration = false;
      this.stardate = moment(this.dose.eventStart).format('DD-MM-YYYY');
      this.startime = moment(this.dose.eventStart).format('HH:mm');
      this.titationDateArray = [];
      this.uptoDateType = "Please select";
      this.titationDateArray.push("Please select");
      this.titationDateArray.push(moment(this.dose.eventStart).format("DD-MM-YYYY HH:mm"));
      this.titationDateArray.push(moment(this.dose.eventStart).add(1, "days").format("DD-MM-YYYY HH:mm"));
      this.titationDateArray.push(moment(this.dose.eventStart).add(2, "days").format("DD-MM-YYYY HH:mm"));
      this.vtm_dose_units = [...new Set(this.medication.__ingredients.map(ig => ig.strengthneumeratorunit))];
      this.vtm_dose_units.sort();
    }
  }
  onTimeSelected(startime) {
    this.startime = startime;
  }
  onTitratedTimeSelected(titratedtime) {
    this.titratedtime = titratedtime;
  }

  onAdministredTimeSelected(admintime) {
    this.administeredtime = admintime;
  }
  saveTitratedDose() {
    this.doseEvent.startdatetime = this.appService.getDateTimeinISOFormat(moment(this.doseEvent.startdatetime, 'DD-MM-YYYY HH:mm').toDate());

    this.titrationValidation();
    if (this.validatiommessage != "") {
      return;
    }
    this.doseEvent.comments = this.comments;
    if (this.uptoDateType != "Please select") {
      this.doseEvent.grouptitration = true;
      this.doseEvent.dose_id = null;
      this.doseEvent.logicalid = null;
      this.doseEvent.titrateduntildatetime = moment(this.uptoDateType, "DD-MM-YYYY HH:mm");
      this.doseEvent.titrateduntildatetime = this.appService.getDateTimeinISOFormat(moment(this.doseEvent.titrateduntildatetime).toDate());
      // delete all previuos titrated dose if found and then insert titration
      let recrodToDelete = this.appService.DoseEvents.filter(x => x.eventtype == "titration" && x.posology_id == this.dose.posology_id && (moment(x.titrateduntildatetime, "YYYY-MM-DD HH:mm").format("YYYYMMDDHHmm") <= moment(moment(this.doseEvent.titrateduntildatetime, 'DD-MM-YYYY HH:mm').toDate()).format("YYYYMMDDHHmm") || x.grouptitration == true));
      this.appService.logToConsole(recrodToDelete);
      if (recrodToDelete.length > 0) {
        recrodToDelete.forEach((value, index) => {
          Object.keys(value).map((e) => { if (e.startsWith("_")) delete value[e]; });
          var upsertManager = new UpsertTransactionManager();
          upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
          upsertManager.addEntity('core', "doseevents", value.doseevents_id, "del");
          upsertManager.save((resp) => {
            this.appService.UpdateDataVersionNumber(resp);

            this.appService.logToConsole(resp);
            upsertManager.destroy();
            if (value) {
              this.appService.DoseEvents.forEach((item, index) => {
                if (item.doseevents_id === value.doseevents_id) this.appService.DoseEvents.splice(index, 1);
              });
            }
            if (recrodToDelete.length - 1 == index) {
              this.saveTransaction();
            }
          },
            (error) => {
              this.appService.logToConsole(error);
              upsertManager.destroy();
              this.subjects.closeAppComponentPopover.next();

              if (this.appService.IsDataVersionStaleError(error)) {
                this.appService.RefreshPageWithStaleError(error);
              }
            }
          );
        });
      } else {
        this.saveTransaction();
      }
    } else {
      this.doseEvent.titrateduntildatetime = this.appService.getDateTimeinISOFormat(moment(this.doseEvent.startdatetime).toDate());
      this.saveTransaction();
    }
  }
  saveTransaction() {
    this.showSpinner = true;
    //   if(this.isAdministation) {
    //     this.titrateadministration.medicationadministration_id = uuid();
    //     this.titrateadministration.prescription_id = this.prescription.prescription_id;
    //     this.titrateadministration.posology_id = this.prescription.__posology.posology_id;
    //     this.titrateadministration.person_id = this.appService.personId;
    //     this.titrateadministration.dose_id =  this.dose_id;
    //     this.titrateadministration.logicalid = this.dose.dose_id;
    //     this.titrateadministration.comments = this.comments;
    //     this.titrateadministration.planneddatetime= moment(this.administereddate, "DD-MM-YYYY").format("DD-MM-YYYY") + " " + this.administeredtime; 
    //     this.titrateadministration.planneddatetime = this.appService.getDateTimeinISOFormat(moment( this.titrateadministration.planneddatetime, 'DD-MM-YYYY HH:mm').toDate());
    //     this.titrateadministration.administrationstartime = this.titrateadministration.planneddatetime ;
    //     if(this.prescription.__posology.dosetype==DoseType.units) { 
    //      this.titrateadministration.planneddosesize = this.doseEvent.titrateddosesize;
    //      this.titrateadministration.planneddoseunit = this.doseEvent.titrateddoseunit;
    //      this.titrateadministration.administreddosesize = this.doseEvent.titrateddosesize;
    //      this.titrateadministration.administreddoseunit = this.doseEvent.titrateddoseunit;

    //     }
    //     if(this.prescription.__posology.dosetype==DoseType.strength) { 
    //      this.administration.plannedstrengthneumerator = this.doseEvent.titratedstrengthneumerator;
    //      this.administration.plannedstrengthneumeratorunits = this.doseEvent.titratedstrengthneumeratorunits;
    //      this.administration.plannedstrengthdenominator = this.doseEvent.titratedstrengthdenominator;
    //      this.administration.plannedstrengthdenominatorunits = this.doseEvent.titratedstrengthdenominatorunits;

    //      this.administration.administeredstrengthneumerator = this.doseEvent.titratedstrengthneumerator;
    //      this.administration.administeredstrengthneumeratorunits = this.doseEvent.titratedstrengthneumeratorunits;
    //      this.administration.administeredstrengthdenominator = this.doseEvent.titratedstrengthdenominator;
    //      this.administration.administeredstrengthdenominatorunits = this.doseEvent.titratedstrengthdenominatorunits;
    //     }      
    //  }
    let docterdoseEvents;
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    // add titration comment as docter's comments
    if (this.comments) {
      let newDoseEventId: string;
      if (this.docterDoseEvent) {
        newDoseEventId = this.docterDoseEvent.doseevents_id;
      } else {
        newDoseEventId = uuid();
      }
      docterdoseEvents = {
        doseevents_id: newDoseEventId,
        dose_id: this.dose.dose_id.split('_')[1],
        posology_id: this.dose.posology_id,
        startdatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
        eventtype: 'Comment',
        dosedatetime: this.appService.getDateTimeinISOFormat(moment(this.dose.eventStart).toDate()),
        comments: this.comments,
        logicalid: this.dose.dose_id,
        iscancelled: false,
        createdon: this.appService.getDateTimeinISOFormat(moment().toDate()),
        modifiedon: this.appService.getDateTimeinISOFormat(moment().toDate()),
        createdby: this.appService.loggedInUserName,
        modifiedby: this.appService.loggedInUserName,
      };
      Object.keys(docterdoseEvents).map((e) => { if (e.startsWith("_")) delete docterdoseEvents[e]; });
      upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(docterdoseEvents)));
    }
    Object.keys(this.doseEvent).map((e) => { if (e.startsWith("_")) delete this.doseEvent[e]; });
    Object.keys(this.titrateadministration).map((e) => { if (e.startsWith("_")) delete this.titrateadministration[e]; });

    this.appService.logToConsole(this.doseEvent);
    this.appService.logToConsole(this.titrateadministration);
    upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(this.doseEvent)));
    // if(this.isAdministation) {
    //   upsertManager.addEntity('core', "medicationadministration", JSON.parse(JSON.stringify(this.titrateadministration)));
    // }     
    upsertManager.save((resp) => {
      this.appService.UpdateDataVersionNumber(resp);

      this.appService.logToConsole(resp);
      upsertManager.destroy();
      // let dobj= <DoseEvents>resp[0];
      // this.doseEvent._sequenceid= dobj._sequenceid;    
      // this.appService.DoseEvents.push(this.doseEvent); 
      this.dr.getDoseEvents(() => {
        this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
        this.showSpinner = false;
        //this.hideTitrationForm.emit();
        this.subjects.closeAppComponentPopover.next();
        this.subjects.refreshTemplate.next(this.prescription.prescription_id);
        this.subjects.refreshDrugChart.next("Refresh");
      });
      // if(this.isAdministation) {
      //   this.appService.Medicationadministration.push(this.titrateadministration);
      // }              

    },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();
        this.subjects.closeAppComponentPopover.next();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }
    );
  }
  titrationValidation() {
    this.validatiommessage = "";
    if (this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).dosetype == DoseType.units) {
      if (!this.doseEvent.titrateddosesize) {
        this.validatiommessage = "Please enter dose";
        return;
      }
    }
    if (this.appService.GetCurrentPosology(this.prescription, this.dose.posology_id).dosetype == DoseType.strength) {
      if (!this.doseEvent.titratedstrengthneumerator || !this.doseEvent.titratedstrengthdenominator) {
        this.validatiommessage = "Please enter dose";
        return;
      }
    }
    // if(this.isUptoDate) {
    //   if(this.uptoDateType=="Please select") {
    //     this.validatiommessage = "Please select use dose,until";
    //     return;
    //   }
    // }
    // to do administration validation
    if (this.isAdministation) {

    }


    // to do up to date validation
    // if(this.uptoDateType=="SelectedDate" && this.prescription.__posology.prescriptionenddate) {
    // var untilDatetime = moment(moment(this.doseEvent.titrateduntildatetime,"DD-MM-YYYY HH:mm")).format("YYYYMMDDHHmm");
    // var prescriptionend = moment(this.prescription.__posology.prescriptionenddate,"YYYY-MM-DD HH:mm").format("YYYYMMDDHHmm");
    //  if(untilDatetime>prescriptionend)
    //   this.validatiommessage = "Selected date can not be greater than prescription end date";
    // } 
  }
  closePopup() {
    //this.hideTitrationForm.next();
    this.subjects.closeAppComponentPopover.next();
  }
  volumeFordose() {
    // IF dose entered is 10mg, then 
    // Ratio r = concentration dose/entered dose = 10/10 = 1
    // Volume = concentration volume/r = 100/1 = 100 ml
    // Calculated dose = 10mg/100ml. 
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthneumerator / this.doseEvent.titratedstrengthneumerator;
      const volume = this.medication.strengthdenominator / ratio;
      this.doseEvent.titratedstrengthdenominator = volume;
    }
  }
  doseForVolume() {
    // IF volume entered is 10ml, then 
    // Ratio r= concentration volume/entered volume = 100/10 = 10
    // Dose = concentration dose/r = 10/10 = 1 mg
    // Calculated dose = 1mg/10ml
    if (this.medication.strengthneumerator > 0 && this.medication.strengthdenominator > 0) {
      const ratio = this.medication.strengthdenominator / this.doseEvent.titratedstrengthdenominator;
      const volume = this.medication.strengthneumerator / ratio;
      this.doseEvent.titratedstrengthneumerator = volume;
    }
  }
}
export class TitrationChart {
  public graph: Graph2d
  public items: any
  public group: any
  public options: any

}
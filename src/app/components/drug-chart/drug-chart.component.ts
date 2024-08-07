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
import { Component, ElementRef, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation, EventEmitter } from '@angular/core';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import { TimelineServiceService } from '../../services/timeline-service.service'
import { AppService } from "src/app/services/app.service"
import { DrugChart, PersonAwayPeriod, Posology, Prescription, PrescriptionMedicaitonSupply } from 'src/app/models/EPMA';
import moment from 'moment';
import { TimeerHelper } from '../drug-chart/timer-helper'

import { SubjectsService } from 'src/app/services/subjects.service';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { HostListener } from "@angular/core";
import { RoleAction } from 'src/app/services/enum';
import { DataRequest } from 'src/app/services/datarequest';

@Component({
  selector: 'app-drug-chart',
  templateUrl: './drug-chart.component.html',
  styleUrls: ['./drug-chart.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DrugChartComponent implements OnInit, OnDestroy {
  screenHeight: number = window.innerHeight
  screenWidth: number = window.innerWidth;
  timediv: Timeline;
  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.screenHeight = window.innerHeight;

    this.screenWidth = window.innerWidth;
  }
  @HostListener('document:click', ['$event'])
  clickout(event) {
    if (this.isitemclickedboolean) {

      this.isitemclickedboolean = false;
    }
    else {
      this.showContextMenu = false;

    }
  }
  @Input() groupFilterType;

  isZoomCssApplied=false;

  isitemclickedboolean = false;
  showAdministrationForm: boolean = false;
  showEditpopup: boolean = false;

  showContextMenu: boolean = false;
  contextmenuX = 0;
  contextmenuY = 0;
  contextdistype = "none"
  editpopuptypetype = ""
  PrescriptionAdmistration: Prescription;
 
  displayeventtime: any;
  doctorConformationModel: boolean = false;
  selectedDose: any;
  timeerHelper: TimeerHelper;
  errorgeneratingevents = false;
 range:any;
  menuArray: any[];

  subscription: Subscription = new Subscription();
  @Output() emitPrintIcon = new EventEmitter<any>();



  @ViewChild('timecomponentid', { static: false }) timecomponentid: ElementRef;


  constructor(public dr: DataRequest, public subjects: SubjectsService, private timelineService: TimelineServiceService, public appService: AppService, private apiRequest: ApirequestService) {
    this.sampledata();


  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.timelineService.Reset();
    this.timeerHelper = null;
    for (var timelinearray of this.appService.TimelineArray) {
      timelinearray.timeline.destroy();
      timelinearray.group = null;
      timelinearray.items = null;
      timelinearray.options = null;
      timelinearray.PRNArray = null;
    }
    this.appService.TimelineArray = null;
    this.timediv.destroy();

  }

  sampledata() {
    // let AwayPeriod1 = new PersonAwayPeriod();
    // AwayPeriod1.PersonAwayPeriod_id="abc1";  
    // AwayPeriod1.awayFrom="2022-06-02 20:45"
    // AwayPeriod1.awayTo="2022-06-03 20:45"
    // let AwayPeriod2 = new PersonAwayPeriod();
    // AwayPeriod2.PersonAwayPeriod_id="abc12";  
    // AwayPeriod2.awayFrom="2022-06-04 20:45"
    // AwayPeriod2.awayTo="2022-06-05 20:45"
    // let AwayPeriod3 = new PersonAwayPeriod();
    // AwayPeriod3.PersonAwayPeriod_id="abc13";  
    // AwayPeriod3.awayFrom="2022-06-06 20:45"
    // AwayPeriod3.awayTo="2022-06-07 20:45"
    // this.appService.PersonAwayPeriod.push(AwayPeriod1)
    // this.appService.PersonAwayPeriod.push(AwayPeriod2)
    // this.appService.PersonAwayPeriod.push(AwayPeriod3)
  }

  ngOnInit(): void {

    this.subscription.add(this.subjects.refreshDrugChart.subscribe(
      (response: any) => {
        this.appService.Prescription.forEach(p=>this.appService.UpdatePrescriptionCompletedStatus(p));
        this.refreshTimeline();
      },

    ));
    const patientDetails$ = this.apiRequest.getRequest(this.appService.baseURI + `/GetBaseViewListByAttribute/patientbanner_mainbanner?synapseattributename=person_id&attributevalue=${this.appService.personId}`);
    const encounterDetails$ = this.apiRequest.getRequest(this.appService.baseURI + `/GetObject?synapsenamespace=core&synapseentityname=encounter&id=${this.appService.encounter.encounter_id}`);
    let prescriptionHistory$ = this.appService.Prescription.length ? this.apiRequest
      .postRequest(
        this.appService.baseURI + '/GetBaseViewListByPost/epma_reviewhistory',
        this.CreateSessionFilter()
      ) : of(null);
    forkJoin([patientDetails$, encounterDetails$, prescriptionHistory$]).subscribe(responseList => {
      this.appService.patientDetails = JSON.parse(responseList[0])[0];
      this.appService.encounterDetails = JSON.parse(responseList[1]);
       this.appService.disabledatechange=false;
      if (this.appService.Prescription.length) {
        for (let prescription of responseList[2]) {
          prescription.__posology = JSON.parse(prescription.__posology);
          prescription.__routes = JSON.parse(prescription.__routes);
          prescription.__medications = JSON.parse(prescription.__medications);
          this.appService.prescriptionHistory.push(<Prescription>prescription);
        }
        this.appService.prescriptionHistory.forEach(presHistory => {
          presHistory.history_status = this.getPrescriptionStatus(presHistory);
        });
      }
      this.emitPrintIcon.emit('show');
    });
    this.timeerHelper = new TimeerHelper(this.appService);
    let MaxEventDate = moment(this.appService.changechoosenFilterDate).add(8, 'days');
    let minEventDate = moment(this.appService.changechoosenFilterDate).add(-8, 'days');
    try {
      this.timeerHelper.createEvents(minEventDate, MaxEventDate);
      this.errorgeneratingevents = false

    }
    catch (error) {
      this.errorgeneratingevents = true
      console.log("Error generating events on drug chart")
      console.log(error);
    }
  }

  getPrescriptionStatus(pres: Prescription | { prescriptionstatus_id: string }) {
    var status = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id);
    if (status)
      return this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == pres.prescriptionstatus_id).status;
    else
      return "active";
  }

  CreateSessionFilter() {
    let condition = '';

    const pm = new filterParams();
    const pres_ids = []
    this.appService.Prescription.forEach(pres => {
      pres_ids.push(pres.prescription_id);
    });
    for (var i = 0; i < pres_ids.length; i++) {
      condition += "or prescription_id = @prescription_id" + i + " ";
      pm.filterparams.push(new filterparam("prescription_id" + i, pres_ids[i]));
    }
    condition = condition.replace(/^\or+|\or+$/g, '');
    let f = new filters();
    f.filters.push(new filter(condition));
    const select = new selectstatement('SELECT *');

    const orderby = new orderbystatement('ORDER BY 2');

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  private createLatestDrugRecordFilter() {
    let condition = "";


    let pm = new filterParams();
    const pres_ids = []
    this.appService.Prescription.forEach(pres => {
      pres_ids.push(pres.prescription_id);
    });
    for (var i = 0; i < pres_ids.length; i++) {
      condition += "prescriptionid = @prescriptionid" + i + (i !== pres_ids.length - 1 ? " or " : '');
      pm.filterparams.push(new filterparam("prescriptionid" + i, pres_ids[i]));
    }

    console.log('sameen condition', condition);
    let f = new filters()
    f.filters.push(new filter(condition));
    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }




  ngAfterViewInit() {
    if (!this.errorgeneratingevents) {
      this.loadTimeline();

      this.subscription.add(interval(300000).subscribe(x => {

        this.refreshTimeline();

      }));


      this.subscription.add(interval(7000).subscribe(x => {

        for (var TimelineArray of this.appService.TimelineArray) {
          for (let PRNid of this.timeerHelper.PRNids) {
            let getPRNitem = TimelineArray.items.get(PRNid);
            if (getPRNitem) {
              TimelineArray.items.update({
                id: getPRNitem.id, content: getPRNitem.content,
                className: getPRNitem.className, start: new Date(), group: getPRNitem.group
              })
            }
          }
        }
      }));
    }
  }

  loadTimeline() {
    this.appService.TimelineArray = [];
    let timedivitems: any = new DataSet();
    let currentDate = new Date();
    // let maxUsercanscroll = moment(currentDate).add(7, 'days');
    // let minUsercanscroll = moment(currentDate).add(-7, 'days');
    // maxUsercanscroll.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
    // minUsercanscroll.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    this.timelineService.configureOptions("top")
    this.timediv = new Timeline(this.timecomponentid.nativeElement, timedivitems, this.timelineService.options);
    this.timediv.setGroups(timedivitems);
    this.timediv.setItems(timedivitems);

    this.timediv.on('rangechange', function (changes) {
      if (changes.byUser) {
        // if (moment(changes.end) > maxUsercanscroll) {
        //   changes.end = maxUsercanscroll

        // }
        // if (moment(changes.start) < minUsercanscroll) {
        //   changes.start = minUsercanscroll

        // }
        this.timediv.setWindow(changes.start, changes.end, { animation: false });
        for (let timelineObject of this.appService.TimelineArray) {
          timelineObject.timeline.setWindow(changes.start, changes.end, { animation: false });
        }
      }
    }.bind(this));




    this.timelineService.groupingBasics()
    // if (this.groupFilterType) {
    //   this.timelineService.groupingBasics();
    // }
    for (let group of this.appService.DrugeGroupsType) {
      let DrugChartModel = new DrugChart();
      //Load item for current group timeline
      var container = document.getElementById(group);

      this.timelineService.mapGroupids(group, this.groupFilterType);
      this.timelineService.configureOptions("none")
      if (this.timelineService.groups.length == 0) {
        if(this.groupFilterType=="Basic"){
          container.parentElement.parentElement.innerHTML="<div class='p-2 pl-4'>No medicines prescribed </div>"
          
        }
        else{
          container.parentElement.parentElement.parentElement.remove();
        }
       
      }
      else {
        DrugChartModel.timeline = new Timeline(container, null, this.timelineService.options);
        DrugChartModel.timeline.setGroups(this.timelineService.groups);
        DrugChartModel.timeline.setItems(this.timelineService.items);
        DrugChartModel.group = this.timelineService.groups;
        DrugChartModel.items = this.timelineService.items;
        DrugChartModel.options = this.timelineService.options

        // DrugChartModel.PRNArray = this.timeerHelper.PRNids


        //Addind click and timechange events
        DrugChartModel.timeline.on('select', function (properties) {
          this.timelineItemClick(properties);
        }.bind(this));
       
        let currentDate = this.appService.changechoosenFilterDate.toDate();
        let maxUsercanscroll = moment(currentDate).add(7, 'days');
        let minUsercanscroll = moment(currentDate).add(-7, 'days');
     
        let  a0 = 10;
        let a100 = moment.duration(moment(maxUsercanscroll).diff(moment(minUsercanscroll))).asMilliseconds();
       let distance = (a100 - a0)/ 100 ;
       DrugChartModel.timeline.on('rangechange', function (changes) {
        if (changes.byUser) {
                
          this.timediv.setWindow(changes.start, changes.end, { animation: false });
          for (let timelineObject of this.appService.TimelineArray) {
            timelineObject.timeline.setWindow(changes.start, changes.end, { animation: false });
          }
        }
      }.bind(this));
      let currentwindow = this.timediv.getWindow();
        const starttime = moment(currentwindow.start);
        const endtime = moment(currentwindow.end);
        const duration = moment.duration(endtime.diff(starttime));
            const mins = duration.asMilliseconds();
             // Arithmatic progression variables
            
            if (mins !== 0) {
              const x = (mins - a0) / distance; // Arithmatic progression formula
                this.range = x;
            } else {
               this.range = 100;
            }
            this.updatestackCss(true);
        DrugChartModel.timeline.on('rangechanged', function (changes) {
          if (changes.byUser) {
           
           let start = moment(changes.start);
           let end = moment(changes.end);
           this.appService.chartScrolled=true;
           this.appService.Choosenfilterdate =new Date(changes.start)
            const duration = moment.duration(end.diff(start));
            const mins = duration.asMilliseconds();
             // Arithmatic progression variables
            
            if (mins !== 0) {
              const x = (mins - a0) / distance; // Arithmatic progression formula
                this.range = x;
            } else {
               this.range = 100;
            }
           
            if(this.range > 0.46){
             // if(!this.isZoomCssApplied){
                if(this.range > 6){
                  this.isZoomCssApplied=true;
                }
                else{
                  this.isZoomCssApplied=false;
                }
                this.updatestackCss(true);
            
              //}
            }
            else{
              //if(this.isZoomCssApplied){
                this.isZoomCssApplied=false;
              this.updatestackCss(false);
             // }
            }
         
           
          }
        }.bind(this));
        this.appService.TimelineArray.push(DrugChartModel);
      }
    }
  }

  timelineItemClick(properties: any) {
    this.dr.RefreshIfDataVersionChanged((result) => {
      if (result == false) {

       // check zoom click
      

        if (properties.items.length == 0) {
          return
        }
        let events: any;
        let containid = properties.items[0];
        let eventsiszoom;
        eventsiszoom = this.appService.stackButtons.find(x => x.dose_id==containid)
       if(eventsiszoom !== undefined){
       let windowstart =moment(eventsiszoom.eventStart).add(-30, 'minutes');
       let windowsEnd =moment(eventsiszoom.eventStart).add(30, 'minutes');
        this.timediv.setWindow(windowstart, windowsEnd);
        for(let d of  this.appService.TimelineArray){
       
          d.timeline.setWindow(windowstart, windowsEnd);
        }
        this.updatestackCss(false);
        return;
       }
        if (properties.items.length > 0 && properties.items[0].includes("flowrate")) {

          var components = properties.items[0].split('_');
          components.shift();
          containid = components.join('_');


        }

      
        
       
        // checking with item doctor order is there for dose and its conform
       
        if (containid.includes("dur_Reminder")) {
          events = this.appService.CurrentReminderevents.find(x => x.dose_id.includes(containid))
          if (events === undefined || events.dose_id == null || events.opacityclass.trim() != "") {
            return;
          }
          this.subjects.viewReminder.next({prescription: null, drugchart: events });
          return;
        }
        events = this.appService.events.find(x => x.dose_id.includes(containid) && !x.dose_id.includes("flowrate"))
        if (events.prn) {
          events = this.appService.events.find(x => x.dose_id == containid)
        }
        if (events === undefined || events.dose_id == null || events.opacityclass.trim() != "") {
          return;
        }
        if (events) {
          let posology = this.appService.Prescription.find(x => x.prescription_id == events.prescription_id).__posology.find(p => p.posology_id == events.posology_id)
          let prescription = this.appService.Prescription.find(x => x.prescription_id == events.prescription_id);
          let prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status;
          // if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled") {
          //   return;
          //  }
          
          if (events.dose_id.includes("dur")) {
            return;
          }          
          if (events.dose_id.includes("infusionevent")) {
            this.infusionmenu(posology);

          }
          else {
            this.clickEventType(prescription, posology, events.dose_id, events.eventStart);
            if (this.menuArray.length === 0) {
              return;
            }
          }

          this.selectedDose = events;

          if (posology && posology.doctorsorder && events.doctorsorder && !events.iscancel) {
            if (this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
              this.doctorConformationModel = true;
              this.PrescriptionAdmistration = new Prescription();
              this.PrescriptionAdmistration = this.appService.Prescription.find(x => x.prescription_id == events.prescription_id);
              this.showContextMenu = false;
            }
          }
          else {

            let hight = this.screenHeight - properties.event.center.y;
            let width = this.screenWidth - properties.event.center.x;
            if (width < 170) {
              width = this.screenWidth - 170;
            }
            else {
              width = properties.event.center.x;
            }
            if (hight < 150) {
              hight = this.screenHeight - 150;
            }
            else {
              hight = properties.event.center.y;
            }
            this.contextmenuX = width;
            this.contextmenuY = hight;
            this.PrescriptionAdmistration = new Prescription();
            this.PrescriptionAdmistration = this.appService.Prescription.find(x => x.prescription_id == events.prescription_id);
            this.showContextMenu = true;
            this.isitemclickedboolean = true;
          }
        }
      }
    })
  }

  hideAdministrationForm(isrefresh = false) {
    this.showAdministrationForm = false;
    this.appService.openAdditionalAdministration = false;
    this.showEditpopup = false;
    this.doctorConformationModel = false;
    if (isrefresh) {
      this.appService.Prescription.forEach(p=>this.appService.UpdatePrescriptionCompletedStatus(p));
      this.refreshTimeline();
    }
  }

  refreshTimeline() {
    this.appService.logToConsole("start refresh" + new Date())

    let MaxEventDate = moment(this.appService.changechoosenFilterDate).add(8, 'days');
    let minEventDate = moment(this.appService.changechoosenFilterDate).add(-8, 'days');
    this.timeerHelper.createEvents(minEventDate, MaxEventDate);

    this.subjects.refreshTemplate.next();
    for (var timelinearray of this.appService.TimelineArray) {
      let items: any
      items = new DataSet();
      timelinearray.items.clear()
      for (var arrp of this.appService.CurrentReminderevents) {
        items.add({
          id: arrp.dose_id, content: arrp.content,
          className: "transparant" + arrp.opacityclass, start: arrp.eventStart, end: arrp.eventEnd, group: arrp.prescription_id, title: arrp.title
        })
     }
      for (var arrp of this.appService.arrPrescriptionCurrentFlowRate) {
      
          items.add({ id: "status"+arrp.prescriptionid, content: arrp.content, start: moment(arrp.start).format("YYYY-MM-DD HH:mm"), end: moment(arrp.end).format("YYYY-MM-DD HH:mm"), type: 'background', className: 'transbackground', tooltip: '', group: arrp.prescriptionid, })
       
      }
      for (var arr of this.appService.PersonAwayPeriod) {
        if (arr.isenabled) {
          items.add({ id: arr.epma_personawayperiod_id, content: this.appService.appConfig.AppSettings.personAwayHeading, start: moment(arr.awayfrom).format("YYYY-MM-DD HH:mm"), end: moment(arr.awayto).format("YYYY-MM-DD HH:mm"), type: 'background', className: 'negative', tooltip: '' })
        }
      }
      for (var dose of this.appService.events) {
        let itemid = timelinearray.group.get(dose.prescription_id);
        if (itemid) {
          if (dose.content.indexOf("divPRN") >= 0) {
            items.add({
              id: dose.dose_id, content: dose.content,
              className: "PRNRange" + dose.opacityclass, start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id, title: dose.title
            })
          }
          else if (dose.content.indexOf("PauseDurline") >= 0) {
            items.add({
              id: dose.dose_id, content: dose.content,
              className: "PauseDurline" + dose.opacityclass, start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id, title: dose.title
            })
            
          } else {
            items.add({
              id: dose.dose_id, content: dose.content,
              className: "transparant" + dose.opacityclass, start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id, title: dose.title
            })
          }
        }
      }
      timelinearray.timeline.setItems(items);
      timelinearray.items = items;
    }
    // add zoom button and stacking
    if(this.range > 0.46){
      if(this.range > 6){
        this.isZoomCssApplied=true;
      }
      this.updatestackCss(true);
    
    }
    else{
     
        this.isZoomCssApplied=false;
      this.updatestackCss(false);
    
    }
    this.appService.logToConsole("end refresh" + new Date())
  }
  infusionmenu(posology: Posology) {
    // else if (this.primaryMedication.form.toLowerCase().indexOf("inhalation") != -1) {
    //   this.therapyType = "Inhalation";
    // }
    this.menuArray = [];
    let infusiontype = "";
    let eventType = this.appService.InfusionEvents.sort((b, a) => new Date(a.eventdatetime).getTime() - new Date(b.eventdatetime).getTime()).find(x => x.posology_id ==
      posology.posology_id).eventtype;

    // if (this.appService.Prescription.find(x => x.prescription_id == posology.prescription_id).__routes.find(y => y.isdefault == true).route.toLowerCase().indexOf("inhalation") != -1) {
    //   infusiontype = "oxygen"
    // }
    if (this.appService.Prescription.find(x => x.prescription_id == posology.prescription_id).ismedicinalgas) {
      infusiontype = "oxygen"
    }
    if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && eventType == "pause" && this.appService.isCurrentEncouner) {
      this.menuArray.push("Restart");
      // this.menuArray.push("Close");
    }

    else if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.isCurrentEncouner) {
      this.menuArray.push("Change Flow Rate/Syringe/Lines");
      this.menuArray.push("Pause");
      // this.menuArray.push("View History");
      if (infusiontype != "oxygen") {
        this.menuArray.push("Add Bolus");
      }
      // this.menuArray.push("Close");
    }
    this.showContextMenu = true;
  }
  clickEventType(prescription: Prescription, posology: Posology, logicalid: string, ploteDate: any) {
    this.displayeventtime = ploteDate;
    this.menuArray = [];

    let hideUndoAndEdit = true;
    let linkedinfusion = this.appService.Prescription.filter(x => x.linkedinfusionid == prescription.prescription_id)
    for (let pres of linkedinfusion) {
      if (this.appService.Medicationadministration.find(x => x.prescription_id == pres.prescription_id)) {
        hideUndoAndEdit = false;
      }
    }

    let prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status;
    let doseEventsCount = this.appService.DoseEvents.filter(x => x.logicalid == logicalid && x.eventtype !="Undo").length;
    let ShowUndoMenu=true;
    if(logicalid.includes("addadjust") || logicalid.includes("pause") || logicalid.includes("bolus") || logicalid.includes("restart")){
      ShowUndoMenu=false;
    }
    if (this.appService.Prescription.find(x => x.prescription_id == prescription.prescription_id).isinfusion) {
      // is event administered
     
      if (this.appService.InfusionEvents.find(x => x.logicalid == logicalid && x.eventtype != "endinfusion_planned" && x.eventtype !="Undo")) {
        this.menuArray.push("View Administration");
        if (hideUndoAndEdit && this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.isCurrentEncouner) {
          //show Edit Administration only if enter in error is not there and admister user and current user is same
          if(logicalid.includes("end") || (this.appService.Medicationadministration.find(x=>x.logicalid==logicalid) && !this.appService.Medicationadministration.find(x=>x.logicalid==logicalid).isenterinerror)){
          this.menuArray.push("Edit Administration");
          }
          
          if (this.appService.Medicationadministration.find(x=>x.logicalid==logicalid && x.administredby == this.appService.loggedInUserName) && this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && ShowUndoMenu && prescriptionStatus != "suspended" && prescriptionStatus != "stopped" && prescriptionStatus != "cancelled") {
            this.menuArray.push("Undo Administration");
          }
        }
        this.menuArray.push("View History");
        this.menuArray.push("Close");
      }
      else if (doseEventsCount > 0 && this.appService.DoseEvents.filter(x => x.logicalid == logicalid && x.eventtype !="Undo")[0].eventtype == "Cancel") {
        this.loadMenuforclick("eventCancel", logicalid,posology);
      }
      else {
        // check if infution is started
        let isstarted = this.checkInfutionStarted(posology, logicalid);
        if (isstarted) {
          this.loadMenuforclick("infutionNotAdministered", logicalid,posology);
        }
        else {
          this.loadMenuforclick("infutionNotstarted", logicalid,posology);
        }

      }

    }
    //// non infution menu
    else {
      // Administerd tablate
      // let doseEventsCount = this.appService.DoseEvents.filter(x => x.logicalid == logicalid).length;
      if (this.appService.Medicationadministration.find(x => x.logicalid == logicalid)) {
        this.menuArray.push("View Administration");
        if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.isCurrentEncouner) {
          //show Edit Administration only if enter in error is not there 
          if(!this.appService.Medicationadministration.find(x=>x.logicalid==logicalid).isenterinerror){
          this.menuArray.push("Edit Administration");
          }
          if (this.appService.Medicationadministration.find(x=>x.logicalid==logicalid && x.administredby == this.appService.loggedInUserName) && this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && prescriptionStatus != "suspended" && prescriptionStatus != "stopped" && prescriptionStatus != "cancelled") {
            this.menuArray.push("Undo Administration");
          }
        }
        this.menuArray.push("View History");
        this.menuArray.push("Close");
      }
      else if (doseEventsCount > 0 && this.appService.DoseEvents.filter(x => x.logicalid == logicalid && x.eventtype !="Undo")[0].eventtype == "Cancel") {
        this.loadMenuforclick("eventCancel", logicalid,posology);
      }
      else if (this.appService.Prescription.find(x => x.prescription_id == posology.prescription_id).titration) {
        let isTitrationDone = this.appService.DoseEvents.find(
          x => x.dose_id == null && x.eventtype == "titration" && x.posology_id == posology.posology_id &&
            (moment(x.titrateduntildatetime) >= moment(ploteDate) || x.titrateduntildatetime == null)) ? true : false;
        if (!isTitrationDone) {
          isTitrationDone = this.appService.DoseEvents.find(x => x.eventtype == "titration" && x.logicalid == logicalid && moment(x.titrateduntildatetime).format("YYYYMMDDHHmm") == moment(ploteDate).format("YYYYMMDDHHmm")) ? true : false;
        }
        if (!isTitrationDone) {
          this.loadMenuforclick("Titrate", logicalid,posology);
          return;
        }
        else {
          this.loadMenuforclick("tablateNotAdministered", logicalid,posology);
        }
      }


      else {



        if (posology.prn) {
          this.loadMenuforclick("prnClick", logicalid,posology);
        }

        else {
          this.loadMenuforclick("tablateNotAdministered", logicalid,posology);
        }
      }
    }
  }

  checkInfutionStarted(posology: Posology, logicalid: string) {
    if (logicalid.includes("start")) {
      return true;
    }
    var alldoseInfusion = this.appService.events.filter(p => p.posology_id === posology.posology_id && !p.dose_id.includes("dur") && !p.dose_id.includes("flowrate") && !p.dose_id.includes("bolus"));
    alldoseInfusion = alldoseInfusion.slice().sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime());

    var currectDoseInfusion = alldoseInfusion.find(x => x.dose_id === logicalid);

    var indexInfusion = alldoseInfusion.indexOf(currectDoseInfusion);
    let counter = 1;
    let startDoseInfusion: any;
    while (true) {
      startDoseInfusion = alldoseInfusion[indexInfusion - counter];
      if (startDoseInfusion.dose_id.includes("start")) {

        if (this.appService.Medicationadministration.find(x => x.logicalid == startDoseInfusion.dose_id)) {
          return true;
        }
        else {
          return false;
        }
      }
      counter++;
    }



  }



  loadMenuforclick(menutype: string, logicalid: string, posology: Posology) {
    this.menuArray = [];
    if (menutype == "infutionNotAdministered") {
      if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.warningService && this.appService.warningServiceIPContext.existingWarningsStatus && this.appService.isCurrentEncouner) {
        ///////////////////////// if start and previous is ended or not
        let isPreviousEndded = true;
        if (logicalid.includes("start")) {
          let dose = this.appService.events.find(x => x.dose_id == logicalid)
          if (!(this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology[0].infusiontypeid == "bolus")) {


            let doselist = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.prescription_id == dose.prescription_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
            var index = doselist.findIndex(x => x.dose_id == dose.dose_id);
            if (index > 0) {
              let lastenditem = doselist[index - 1];
              isPreviousEndded = lastenditem.admitdone
            }
          }
        }
        ////////////////////////////////////////////////
        // if (isPreviousEndded)
        this.menuArray.push("Administration");
      }


      if (this.appService.AuthoriseAction(RoleAction.epma_transfer_administrationevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        if (logicalid.includes("start")) {
          this.menuArray.push("Transfer");
          this.menuArray.push("Cancel Event");
        }
      }
      this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
    else if (menutype == "infutionNotstarted") {


      if (this.appService.AuthoriseAction(RoleAction.epma_transfer_administrationevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        if (logicalid.includes("start"))
          this.menuArray.push("Transfer");
      }
      this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
    else if (menutype == "eventCancel") {
      if (this.appService.AuthoriseAction(RoleAction.epma_cancel_plannedevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Undo Cancel");
      }
      this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
    else if (menutype == "prnClick") {
      if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.warningService && this.appService.warningServiceIPContext.existingWarningsStatus && this.appService.isCurrentEncouner) {
        this.menuArray.push("Administration");
      }
      // this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
    else if (menutype == "Titrate") {
      if (this.appService.warningService && this.appService.warningServiceIPContext.existingWarningsStatus && this.appService.isCurrentEncouner) {
        this.menuArray.push("Titrate");
      }
      if (this.appService.AuthoriseAction(RoleAction.epma_transfer_administrationevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Transfer");
      }
      if (this.appService.AuthoriseAction(RoleAction.epma_add_doctorscomments) && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Prescriber's comments");
      }
      if (this.appService.AuthoriseAction(RoleAction.epma_cancel_plannedevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Cancel Event");
      }
      this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
    else {
      if (this.appService.AuthoriseAction(RoleAction.epma_administer_administrationevent) && this.appService.warningService && this.appService.warningServiceIPContext.existingWarningsStatus && this.appService.isCurrentEncouner) {
        this.menuArray.push("Administration");
      }//posology.frequency != "stat" && 
      if (this.appService.AuthoriseAction(RoleAction.epma_transfer_administrationevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Transfer");
      }
      if (this.appService.AuthoriseAction(RoleAction.epma_add_doctorscomments) && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Prescriber's comments");
      }
      if (this.appService.AuthoriseAction(RoleAction.epma_cancel_plannedevent) && this.appService.isCurrentEncouner && this.appService.bannerWarningStatus && this.appService.warningServiceIPContext.existingWarningsStatus) {
        this.menuArray.push("Cancel Event");
      }
      this.menuArray.push("View History");
      this.menuArray.push("Close");
    }
  }

  menuclick(option: any) {

    if (option == "Change Flow Rate/Syringe/Lines") {
      this.subjects.adjustInfusion.next({ prescription: this.PrescriptionAdmistration });
    }
    else if (option == "Pause") {
      this.subjects.pauseInfusion.next({ prescription: this.PrescriptionAdmistration });
    }
    else if (option == "Add Bolus") {
      this.subjects.addBolus.next({ prescription: this.PrescriptionAdmistration });
    }
    else if (option == "Restart") {
      this.subjects.restartInfusion.next({ prescription: this.PrescriptionAdmistration });
    }
    else if (option == "View History" || option == "Administration" || option == "Titrate" || option == "View Administration" || option == "Edit Administration" || option == "Undo Administration") {
      this.editpopuptypetype = option;
      this.showAdministrationForm = true;
    }

    else if (option == "Transfer") {
      this.showEditpopup = true;
      this.editpopuptypetype = option;
    }
    else if (option == "Prescriber's comments") {
      this.showEditpopup = true;
      this.editpopuptypetype = option;
    }
    else if (option == "Cancel Event" || option == "Undo Cancel") {
      this.showEditpopup = true;
      this.editpopuptypetype = option;
    }
    else if (option == "Close") {
      this.showContextMenu = false;
    }
    this.showContextMenu = false;
  }



  updatestackCss(Addstackcss:boolean) {
  
   console.log('here')
   let currentwindow = this.timediv.getWindow();
   const starttime = moment(currentwindow.start);
   const endtime = moment(currentwindow.end);
  
    for (var timelinearray of this.appService.TimelineArray) {
      let items: any
      
      items = timelinearray.items;

      for (var dose of this.appService.stackButtons) {
        if( moment(dose.eventStart).isBetween(starttime,endtime,undefined,"[]"))
        {
          let itemid = timelinearray.group.get(dose.prescription_id);
          if (itemid) {
          if(Addstackcss){
           if(this.range > 30){
              if(dose.diffrence > 90){
                items.remove( dose.dose_id);
                continue;
              }
            }
            else if(this.range > 15){
              if(dose.diffrence > 60){
                items.remove( dose.dose_id);
                continue;
              }
            }
            else if(this.range > 5){
              if(dose.diffrence > 30){
                items.remove( dose.dose_id);
                continue;
              }
            }
            else if(this.range > 2.2){
              if(dose.diffrence > 10){
                items.remove( dose.dose_id);
                continue;
              }
            }
            else if(this.range > 1){
              if(dose.diffrence > 5){
                items.remove( dose.dose_id);
                continue;
              }
            }
            else if(this.range >= 0.46){
              if(dose.diffrence > 2){
                items.remove( dose.dose_id);
                continue;
              }
            }
           if(!items.get(dose.dose_id))
              items.add({
                id: dose.dose_id, content: dose.content,
                className: "transparant AddZindux" + dose.opacityclass, start: dose.eventStart, end: dose.eventEnd, group: dose.prescription_id, title: dose.title
              })
            
            }
            else{
              items.remove( dose.dose_id);
            }
          
          }
        }
       
      }
      
    // timelinearray.timeline.setItems(items);
      timelinearray.items = items;
    }

    this.appService.logToConsole("end refresh" + new Date())
  }



}

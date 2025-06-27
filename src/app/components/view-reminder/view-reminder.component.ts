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
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Prescription, Prescriptionreminders, Remindersack } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
import { TimeerHelper } from '../drug-chart/timer-helper';

import { v4 as uuid } from 'uuid';
@Component({
  selector: 'app-view-reminder',
  templateUrl: './view-reminder.component.html',
  styleUrls: ['./view-reminder.component.css']
})
export class ViewReminderComponent implements OnInit, OnDestroy {
  showAcknowledgeReminder: boolean = false;
  showNewReminder: boolean = false;
  showSpinner: boolean = false;
  minDate: Date;
  maxDate: Date;
  startime: string = "00:00";
  startdate: string;
  subscriptions = new Subscription();
  prescription: Prescription;
  reminder: Prescriptionreminders;
  reminderList: ReminderModel[] = [];
  activeReminderList : Prescriptionreminders[]=[];
  pendingReminderList : Prescriptionreminders[]=[];
  acknowledgedReminderList : Prescriptionreminders[]=[];
  inValidTime: boolean = false;
  isAcknowledgeNoteRequired: boolean = false;
  isManageReminder: boolean = false;
  isMainReminder: boolean = false;
  reminderHeader: string = "New Reminder";
  validationMesssage: string = "";
  interval_id: any;
  manageReminderList: Prescriptionreminders[] = [];
  manageReminderRepeatList: Prescriptionreminders[] = [];
  repeatAckReminder: any[] = [];
  isAckOpenFromDrugChart: boolean = false;
  ackstatus: boolean =false;
  sameAckReminderList: Prescriptionreminders[] = [];
  nearestAckReminderList: Prescriptionreminders[] = [];
  isSuperUser: boolean = false;

  @Input('event') event: any
  constructor(private timer: TimeerHelper, public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, private dr: DataRequest) {

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.interval_id);
  }
  ngOnInit(): void {
    this.isSuperUser= this.appService.loggedInUserRoles.some(x=>x.toLocaleLowerCase()=="epma super user");
    this.init(this.event);
  }
  ngAfterViewInit() {
    //this.myInputField.nativeElement.focus();
  }
  init(event: any) {
    this.reminder = new Prescriptionreminders();
    this.reminderList = [];
    if (event.drugchart) {
        this.prepareDrugChartAckReminder(event);
        this.openAcknowledgeReminderPopup(null, "drugchart")
    } else {
      this.isMainReminder = true;
      this.prescription = event.prescription;
      this.dr.getReminders(() => {
        this.prepareReminderList();
      });
      this.interval_id = setInterval(() => {
        this.dr.getReminders(() => {
          this.prepareReminderList();
        });
      }, 10000);

    }

  }
  openNewReminderPopup() {
    this.validationMesssage ="";
    this.reminder = new Prescriptionreminders();
    this.isManageReminder = false;
    this.isMainReminder = false;
    this.showAcknowledgeReminder = false;
    this.showNewReminder = true;
    this.showSpinner = false;
    this.inValidTime = false;
    this.reminder.prescription_id = this.prescription.prescription_id;
    this.reminder.personid = this.prescription.person_id;
    this.reminder.encounterid = this.prescription.encounter_id;
    this.reminder.createdby = this.appService.loggedInUserName;
    this.reminder.createdon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.reminder.lastmodifiedby = this.appService.loggedInUserName;
    this.reminder.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.reminder.issystem = false;
    this.reminder.isackmandatory = false;
    this.reminder.isacknowledged = false;
    this.reminder.epma_prescriptionreminders_id = uuid();
    this.reminder.issystem = false;
    this.reminder.remindertype = 0;
    this.reminder.repeattype = "m";
    this.startdate = "";
    this.startime = "00:00";
    this.reminderHeader = "New Reminder";
    this.minDate = moment().toDate();
  }
  openEditReminderPopup(remind) {
    this.isManageReminder = false;
    this.isMainReminder = false;
    this.showAcknowledgeReminder = false;
    this.showNewReminder = true;
    this.showSpinner = false;
    this.inValidTime = false;
    this.minDate = moment().toDate();
    this.reminder = new Prescriptionreminders();
    this.reminder = Object.assign({}, remind);
    this.startdate = moment(this.reminder.activationdatetime).format("DD-MM-YYYY");
    this.startime = moment(this.reminder.activationdatetime).format("HH:mm");
    this.reminderHeader = "Edit Reminder";
  }
  openManagerReminder() {
    this.isManageReminder = true;
    this.isMainReminder = false;
    this.showAcknowledgeReminder = false;
    this.showNewReminder = false;
  }
  closeManagerReminder() {
    this.isManageReminder = false;
    this.isMainReminder = true;
    this.showAcknowledgeReminder = false;
    this.showNewReminder = false;
  }
  stopReminder(d: Prescriptionreminders) {
    d.lastmodifiedby = this.appService.loggedInUserName;
    d.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    d.enddatetime = this.appService.getDateTimeinISOFormat(moment().toDate());
    //d.activationdatetime = this.appService.getDateTimeinISOFormat(moment(this.reminder.activationdatetime, 'YYYY-MM-DD HH:mm').toDate());
    Object.keys(d).map((e) => { if (e.startsWith("_")) delete d[e]; });
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionreminders', JSON.stringify(d), false)
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);
          this.dr.getReminders(() => {
            this.prepareReminderList();
            this.subjects.refreshTemplate.next(undefined);
            this.subjects.refreshDrugChart.next(undefined);
          });

        }, (error) => {
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
    )
  }
  saveNewReminder() {
    this.onTimeSelected(this.startime);
    if (this.inValidTime) {
      return;
    }
    this.validationMesssage = "";
    if (!this.reminder.message.trim()) {
      this.validationMesssage = "Remider text is required";
      return;
    }
    let reminderExist = this.appService.Prescriptionreminders.slice().filter(x => x.prescription_id == this.prescription.prescription_id && x.remindertype && x.remindertype != 0 && !x.enddatetime && x.epma_prescriptionreminders_id != this.reminder.epma_prescriptionreminders_id && !x.isacknowledged).length;
    if (reminderExist > 0 && this.reminder.remindertype != 0) {
      this.validationMesssage = "A repeat reminder already exists. Please stop the exisiting reminder to create a new one";
      return;
    }
    if (this.reminder.repeatsize) {
      this.reminder.repeatsize = parseInt(this.reminder.repeatsize.toString());
      if(this.reminder.repeattype=='m') {
        if(this.reminder.repeatsize<= this.appService.appConfig.AppSettings.RepeatReminderMinutesDuration) {
          this.validationMesssage = "Please enter a repeat size of greater than " + this.appService.appConfig.AppSettings.RepeatReminderMinutesDuration;
          return;
        }
      }
    }
    if (this.reminder.remindertype == 0) {
      this.reminder.repeattype = null;
    }
    this.reminder.ackstatus = null;
    this.reminder.lastmodifiedby = this.appService.loggedInUserName;
    this.reminder.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.reminder.activationdatetime = moment(this.startdate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.reminder.activationdatetime = this.appService.getDateTimeinISOFormat(moment(this.reminder.activationdatetime, 'YYYY-MM-DD HH:mm').toDate());
    this.showSpinner = true;
    Object.keys(this.reminder).map((e) => { if (e.startsWith("_")) delete this.reminder[e]; });
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionreminders', JSON.stringify(this.reminder), false)
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.isManageReminder = true;
          this.isMainReminder = false;
          this.showAcknowledgeReminder = false;
          this.showNewReminder = false;
          this.showSpinner = false;
          this.validationMesssage = "";
          this.dr.getReminders(() => {
            this.prepareReminderList();
            this.subjects.refreshTemplate.next(undefined);
            this.subjects.refreshDrugChart.next(undefined);
          });

        }, (error) => {
          this.showSpinner = false;
          this.showNewReminder = false;
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
    )
  }
  closeReminderPopup() {
    clearInterval(this.interval_id);
    this.subjects.refreshTemplate.next(this.prescription.prescription_id);
    this.subjects.refreshDrugChart.next(undefined);
    this.subjects.closeAppComponentPopover.next(undefined);
  }
  closeNewReminderPopup() {
    this.isManageReminder = true;
    this.isMainReminder = false;
    this.showAcknowledgeReminder = false;
    this.showNewReminder = false;
    this.subjects.refreshTemplate.next(this.prescription.prescription_id);
  }
  onTimeSelected(startime) {
    this.inValidTime = false;
    this.startime = startime;
    if (moment(this.startdate, "DD-MM-YYYY").format("YYYYMMDD") == moment().format("YYYYMMDD")) {
      if (moment(startime, "HH:mm").format("HHmm") <= moment().format("HHmm")) {
        this.inValidTime = true;
      } else {
        this.startime = startime;
      }
    } else {
      this.startime = startime;
    }

  }
  prepareReminderList() {
    this.reminderList = [];
    this.reminderList.push({ status: "Active", reminder: [] });
    this.reminderList.push({ status: "Pending", reminder: [] });
    this.reminderList.push({ status: "Acknowledged", reminder: [] });
    let allReminder = this.appService.Prescriptionreminders.slice().filter(x => x.prescription_id == this.prescription.prescription_id && (!x.remindertype || x.remindertype == 0));
    allReminder.forEach((item) => {
      item.__calculatedactivationdatetime = null;
      if (!item.activationdatetime) {
        let administration = this.appService.Medicationadministration.filter(x => x.prescription_id == this.prescription.prescription_id).sort((a, b) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime());
        if (administration.length > 0) {
          item.__calculatedactivationdatetime = moment(administration[0].administrationstartime, "YYYY-MM-DD HH:mm").add(+item.activationinhours, "hours")
        }
      } else {
        item.__calculatedactivationdatetime = moment(item.activationdatetime);
      }
      if (item.__calculatedactivationdatetime) {
        if (!item.isacknowledged) {
          item.ackstatus = "set";
          if (item.isivtooral) {
            item.ackstatus = "ivtooralset";
          }
        }
        let overduetime = moment(item.__calculatedactivationdatetime.toDate());
        overduetime.add(this.appService.appConfig.defaultReminderOverdueTimePeriod, "hours");
        let currDate = moment();
        if (item.isacknowledged) {
          currDate = moment(item.acknowledgedon);
        }
        if (item.__calculatedactivationdatetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
          item.ackstatus = "active";
          if (item.isivtooral) {
            item.ackstatus = "ivtooralactive";
          }
        }
        if (overduetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
          item.ackstatus = "overdue";
          if (item.isivtooral) {
            item.ackstatus = "ivtooraloverdue";
          }
        }

        if (item.isacknowledged) {
          this.reminderList.find(x => x.status == "Acknowledged").reminder.push(item);
        } else if (item.__calculatedactivationdatetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
          this.reminderList.find(x => x.status == "Active").reminder.push(item);
        } else {
          this.reminderList.find(x => x.status == "Pending").reminder.push(item);
        }
      } else {
        item.__noactivationdatetime = item.activationinhours + " hour(s) after first administration";
        if (item.isivtooral) {
          item.ackstatus = "ivtooralset";
        }
        this.reminderList.find(x => x.status == "Pending").reminder.push(item);
      }
    });
    this.manageReminderList = this.appService.Prescriptionreminders.filter(x => x.prescription_id == this.prescription.prescription_id && (!x.remindertype || x.remindertype == 0));
    this.manageReminderRepeatList = this.appService.Prescriptionreminders.filter(x => x.prescription_id == this.prescription.prescription_id && (x.remindertype == 1 || x.remindertype == 2));
    this.repeatAckReminder = this.appService.remindersack.filter(x => x.prescription_id == this.prescription.prescription_id);

   
    // prepare repeat reminder
    this.prepareRepeatReminder();

    this.reminderList.forEach((item) => {
      item.reminder.sort((b, a) => (moment(a.__calculatedactivationdatetime) > moment(b.__calculatedactivationdatetime)) ? 1 : ((moment(b.__calculatedactivationdatetime) > moment(a.__calculatedactivationdatetime)) ? -1 : 0));
    });
    this.activeReminderList = this.reminderList.find(x=>x.status=='Active').reminder;
    this.pendingReminderList = this.reminderList.find(x=>x.status=='Pending').reminder;
    this.acknowledgedReminderList = this.reminderList.find(x=>x.status=='Acknowledged').reminder;

   
  }
  prepareRepeatReminder() {
    let repeatReminder = this.appService.Prescriptionreminders.slice().filter(x => x.prescription_id == this.prescription.prescription_id && x.remindertype && x.remindertype != 0);
    let minActivationDateTime = new Date(Math.min.apply(null, repeatReminder.map(function (e) { return new Date(e.activationdatetime); })));
    if (repeatReminder.length > 0) {
      this.timer.createEvents(minActivationDateTime, moment().toDate(), true, this.prescription);
      let reminder = this.appService.AllReminderevents.filter(x => x.prescription_id == this.prescription.prescription_id && x.remindertype != 0 && x.type != 3);
      this.reminderList.find(x => x.status == "Active").reminder = this.reminderList.find(x => x.status == "Active").reminder.filter(x => x.remindertype != 1 && x.remindertype != 2);
      reminder.forEach(item => {
        let rem = repeatReminder.find(e => e.epma_prescriptionreminders_id == item.epma_prescriptionreminders_id);
        let r = new Prescriptionreminders();
        r.epma_prescriptionreminders_id = item.epma_prescriptionreminders_id;
        r.prescription_id = item.prescription_id
        r.personid = this.appService.personId;
        r.encounterid = this.appService.encounter.encounter_id;
        r.activationdatetime = item.eventStart;
        r.__logicalid = item.dose_id;
        r.__calculatedactivationdatetime = item.eventStart;
        r.message = rem.message;
        r.remindertype = rem.remindertype;
        r.lastmodifiedby = rem.lastmodifiedby;
        r.lastmodifiedon = rem.lastmodifiedon;
        r.issystem = rem.issystem;
        r.isivtooral = rem.isivtooral;
        r.isackmandatory = rem.isackmandatory;
        r.createdby = rem.createdby;
        r.createdon = rem.createdon;  
        r.ackmsg = rem.ackmsg; 
        r.ackstatus = "set";
        //type = 0 // blue
        //type=1 // yellow
        //type=2 // red
        //type =3 // ack
        let currDate = moment();
        if (r.__calculatedactivationdatetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
          r.ackstatus = "active";
        }
        let overduetime = moment(r.__calculatedactivationdatetime.toDate());
        overduetime.add(this.appService.appConfig.defaultReminderOverdueTimePeriod, "hours");
        if (overduetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
          r.ackstatus = "overdue";
        }
        if (item.type == 0 || item.type == 1) {
          this.reminderList.find(x => x.status == "Active").reminder.push(r);
        }
        if (item.pending == true) {
          this.reminderList.find(x => x.status == "Pending").reminder.push(r);
        }
      });

      console.log(reminder)
    }
  }
  prepareDrugChartAckReminder(event) {
    this.sameAckReminderList= [];
    this.nearestAckReminderList= [];
    this.prescription = this.appService.Prescription.find(x => x.prescription_id == event.drugchart.prescription_id);
    this.timer.createEvents(this.appService.encounter.admitdatetime, moment().add(7,"days").toDate(), true, this.prescription);
    let pReminder = this.appService.AllReminderevents.slice().filter(x => x.prescription_id == this.prescription.prescription_id);
    let eventDate = event.drugchart.eventStart;
    let start = moment(eventDate).add(-5, "minutes");
    let end = moment(eventDate).add(5, "minutes");
    let nearestReminder = pReminder.filter(x =>x.pending==false && moment(x.eventStart).isBetween(start, end));
    nearestReminder.forEach(item => {
      let isAck = this.appService.remindersack.find(x => x.logicalid == item.dose_id);
      let reminder = this.appService.Prescriptionreminders.find(x => x.epma_prescriptionreminders_id == item.epma_prescriptionreminders_id);
      let r = new Prescriptionreminders();
      r.epma_prescriptionreminders_id = item.epma_prescriptionreminders_id;
      r.prescription_id = item.prescription_id
      r.personid = this.appService.personId;
      r.encounterid = this.appService.encounter.encounter_id;
      r.activationdatetime = item.eventStart;
      r.__logicalid = item.dose_id;
      r.__calculatedactivationdatetime = item.eventStart;
      r.message = item.title;
      r.remindertype = item.remindertype;
      r.lastmodifiedby = reminder.lastmodifiedby;
      r.lastmodifiedon = reminder.lastmodifiedon;
      r.issystem = reminder.issystem;
      r.isivtooral = reminder.isivtooral;
      r.isackmandatory = reminder.isackmandatory;
      r.createdby = reminder.createdby;
      r.createdon = reminder.createdon;  
      r.ackstatus = reminder.ackstatus;  
      r.ackmsg = reminder.ackmsg; 
      r.isacknowledged = false;
      r.__showSpinner =false;
      r.__issamereminder = false;
      if(moment(item.eventStart).isSame(eventDate)) {
        r.__issamereminder =true;
        this.sameAckReminderList.push(r);
      } else {
        this.nearestAckReminderList.push(r);
      }
      if(isAck) {
        r.ackmsg = isAck.acknowledgecomments;
        r.ackstatus = isAck.ackstatus;
      }
      if (item.remindertype && item.remindertype == 0 && !r.ackstatus) {         
        r.ackstatus = this.setAckStatus(reminder).ackstatus;
      }
      if (item.type == 0) {
        r.ackstatus = "overdue";
      }     
      if (item.type == 1) {
        r.ackstatus = "active";
      }
      if (item.type == 2) {
        r.ackstatus = "set";
      }
      if (isAck || reminder.isacknowledged) {
        r.isacknowledged = true;
      }
    });
    this.sameAckReminderList.sort((a, b) => (moment(a.__calculatedactivationdatetime) > moment(b.__calculatedactivationdatetime)) ? 1 : ((moment(b.__calculatedactivationdatetime) > moment(a.__calculatedactivationdatetime)) ? -1 : 0));
    this.nearestAckReminderList.sort((a, b) => (moment(a.__calculatedactivationdatetime) > moment(b.__calculatedactivationdatetime)) ? 1 : ((moment(b.__calculatedactivationdatetime) > moment(a.__calculatedactivationdatetime)) ? -1 : 0));
  }
  openAcknowledgeReminderPopup(remind, type) {
    this.showAcknowledgeReminder = true;
    this.isManageReminder = false;
    this.isMainReminder = false;
    this.showNewReminder = false;
    this.showSpinner = false;
    this.isAcknowledgeNoteRequired = false;
    if (type != 'drugchart') {
      this.isAckOpenFromDrugChart = false;
      this.sameAckReminderList = [];
      remind.isacknowledged = false;
      remind.ackmsg ="";
      this.sameAckReminderList.push(remind)
    } else {
      this.isAckOpenFromDrugChart = true;
    }
  }
  saveAcknowledgeReminder(reminder) {
    if (reminder.isackmandatory && !reminder.ackmsg) {
      this.isAcknowledgeNoteRequired = true;
      return;
    }
    // var upsertManager = new UpsertTransactionManager();
    // upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
    // this.ackReminderList.forEach((item) => {
    //   if (!item.remindertype || item.remindertype == 0) {
    //     item.acknowledgedby = this.appService.loggedInUserName;
    //     item.isacknowledged = true;
    //     item.acknowledgedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    //     Object.keys(item).map((e) => { if (e.startsWith("_")) delete item[e]; });
    //     upsertManager.addEntity('local', 'epma_prescriptionreminders', JSON.parse(JSON.stringify(item)));
    //   } else {
    //     let ackReminder = new Remindersack();
    //     ackReminder.epma_remindersack_id = uuid();
    //     ackReminder.acknowledgedby = this.appService.loggedInUserName;
    //     ackReminder.acknowledgecomments = item.ackmsg;
    //     ackReminder.acknowledgedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    //     ackReminder.logicalid = item.__logicalid;
    //     ackReminder.epma_prescriptionreminders_id = item.epma_prescriptionreminders_id;
    //     ackReminder.person_id = this.appService.personId;
    //     ackReminder.encounter_id = this.appService.encounter.encounter_id;
    //     ackReminder.plandatetime = this.appService.getDateTimeinISOFormat(moment(item.__calculatedactivationdatetime).toDate());;
    //     ackReminder.ackstatus = item.ackstatus;
    //     ackReminder.prescription_id = this.prescription.prescription_id;
    //     Object.keys(ackReminder).map((e) => { if (e.startsWith("_")) delete ackReminder[e]; });
    //     upsertManager.addEntity('local', 'epma_remindersack', JSON.parse(JSON.stringify(ackReminder)));
    //   }
    // });
    // this.showSpinner = true;
    // upsertManager.save((response) => {
    //   this.appService.UpdateDataVersionNumber(response);
    //   this.showSpinner = false;
    //   this.dr.getReminders(() => {
    //     this.prepareReminderList();
    //     this.subjects.refreshDrugChart.next(undefined);
    //     if (this.isAckOpenFromDrugChart == true) {
    //       this.subjects.closeAppComponentPopover.next(undefined);
    //     } else {
    //       this.isManageReminder = false;
    //       this.isMainReminder = true;
    //       this.showAcknowledgeReminder = false;
    //       this.showNewReminder = false;
    //     }

    //   });
    // },
    //   (error) => {
    //     this.appService.logToConsole(error);
    //     upsertManager.destroy();
    //     if (this.appService.IsDataVersionStaleError(error)) {
    //       this.appService.RefreshPageWithStaleError(error);
    //     }
    //   }
    // );
   
    if(!reminder.remindertype || reminder.remindertype==0) {
    reminder.acknowledgedby = this.appService.loggedInUserName;
    reminder.isacknowledged = true;
    if(!reminder.activationdatetime){
      reminder.activationdatetime=reminder.__calculatedactivationdatetime;
    }
    reminder.acknowledgedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    reminder.activationdatetime = this.appService.getDateTimeinISOFormat(moment(reminder.activationdatetime).toDate());;
    reminder.__showSpinner = true;
    Object.keys(reminder).map((e) => { if (e.startsWith("_")) delete reminder[e]; });
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionreminders', JSON.stringify(reminder), false)
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);
          this.dr.getReminders(() => {
            this.prepareReminderList();
            reminder.__showSpinner = false;
            reminder.isacknowledged = true;
            this.subjects.refreshDrugChart.next(undefined);
            if(this.isAckOpenFromDrugChart ==false) {
              this.isManageReminder =false;
              this.isMainReminder = true;
              this.showAcknowledgeReminder =false;
              this.showNewReminder =false;
            } 
          });
        }, (error) => {
          this.showSpinner = false;
          if (this.appService.IsDataVersionStaleError(error)) {
            this.appService.RefreshPageWithStaleError(error);
          }
        })
    )
    } else {
      let ackReminder = new Remindersack();
      ackReminder.epma_remindersack_id = uuid();
      ackReminder.acknowledgedby = this.appService.loggedInUserName;
      ackReminder.acknowledgecomments = reminder.ackmsg;
      ackReminder.acknowledgedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      ackReminder.logicalid = reminder.__logicalid;
      ackReminder.epma_prescriptionreminders_id= reminder.epma_prescriptionreminders_id;
      ackReminder.person_id =this.appService.personId;
      ackReminder.encounter_id =this.appService.encounter.encounter_id;
      ackReminder.plandatetime = this.appService.getDateTimeinISOFormat(moment(reminder.__calculatedactivationdatetime).toDate());;
      ackReminder.ackstatus = reminder.ackstatus;
      ackReminder.prescription_id = this.prescription.prescription_id;
      reminder.__showSpinner = true;
      Object.keys(ackReminder).map((e) => { if (e.startsWith("_")) delete ackReminder[e]; });
      this.subscriptions.add(
        this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_remindersack', JSON.stringify(ackReminder), false)
          .subscribe((response) => {
            this.appService.UpdateDataVersionNumber(response);        
            this.dr.getReminders(() => {
              this.prepareReminderList();            
              reminder.__showSpinner = false;
              reminder.isacknowledged = true;
              this.subjects.refreshDrugChart.next(undefined);
              if(this.isAckOpenFromDrugChart ==false) {
                this.isManageReminder =false;
                this.isMainReminder = true;
                this.showAcknowledgeReminder =false;
                this.showNewReminder =false;
              }  

            });
          }, (error) => {
            this.showSpinner = false;
            if (this.appService.IsDataVersionStaleError(error)) {
              this.appService.RefreshPageWithStaleError(error);
            }
          })
      )
    }
  }
  setAckStatus(item:Prescriptionreminders) {
    if (!item.activationdatetime) {
      let administration = this.appService.Medicationadministration.filter(x => x.prescription_id == this.prescription.prescription_id).sort((a, b) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime());
      if (administration.length > 0) {
        item.__calculatedactivationdatetime = moment(administration[0].administrationstartime, "YYYY-MM-DD HH:mm").add(+item.activationinhours, "hours")
      }
    } else {
      item.__calculatedactivationdatetime = moment(item.activationdatetime);
    }
    if (item.__calculatedactivationdatetime) {
      if (!item.isacknowledged) {
        item.ackstatus = "set";
        if (item.isivtooral) {
          item.ackstatus = "ivtooralset";
        }
      }
      let overduetime = moment(item.__calculatedactivationdatetime.toDate());
      overduetime.add(this.appService.appConfig.defaultReminderOverdueTimePeriod, "hours");
      let currDate = moment();
      if (item.isacknowledged) {
        currDate = moment(item.acknowledgedon);
      }
      if (item.__calculatedactivationdatetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
        item.ackstatus = "active";
        if (item.isivtooral) {
          item.ackstatus = "ivtooralactive";
        }
      }
      if (overduetime.format("YYYYMMDDHHmm") <= currDate.format("YYYYMMDDHHmm")) {
        item.ackstatus = "overdue";
        if (item.isivtooral) {
          item.ackstatus = "ivtooraloverdue";
        }
      }
    } else {
      item.__noactivationdatetime = item.activationinhours + " hour(s) after first administration";
      if (item.isivtooral) {
        item.ackstatus = "ivtooralset";
      }
    }
    return item;
  }
  closeAcknowledgePopup() {
    if (this.isAckOpenFromDrugChart == true) {
      this.subjects.closeAppComponentPopover.next(undefined);
      this.subjects.refreshDrugChart.next(undefined);
    } else {
      this.showAcknowledgeReminder = false;
      this.isManageReminder = false;
      this.isMainReminder = true;
      this.showNewReminder = false;
    }
  }
}

class ReminderModel {
  public status: string
  public reminder: Prescriptionreminders[]
}


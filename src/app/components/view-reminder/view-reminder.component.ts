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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Prescription, Prescriptionreminders } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { DataRequest } from 'src/app/services/datarequest';
import { SubjectsService } from 'src/app/services/subjects.service';
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
  acknowledgeNote: string;
  inValidTime: boolean = false;
  isAcknowledgeNoteRequired: boolean = false;
  reminderHeader: string = "New Reminder";
  validationMesssage: string = "";
  interval_id: any;
  @Input('event') event: any

  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService, private dr: DataRequest) {

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.interval_id);
  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {
    this.prescription = event.prescription;
    this.reminder = new Prescriptionreminders();
    this.reminderList = [];
    this.dr.getReminders(() => {
      this.prepareReminderList();
    });
    this.interval_id = setInterval(() => {
      this.dr.getReminders(() => {
        this.prepareReminderList();
      });
    }, 10000);

  }
  openNewReminderPopup() {
    this.reminder = new Prescriptionreminders();
    this.showNewReminder = true;
    this.showSpinner = false;
    this.inValidTime = false;
    this.reminder.prescription_id = this.prescription.prescription_id;
    this.reminder.personid = this.prescription.person_id;
    this.reminder.encounterid = this.prescription.encounter_id;
    this.reminder.lastmodifiedby = this.appService.loggedInUserName;
    this.reminder.issystem = false;
    this.reminder.isackmandatory = false;
    this.reminder.isacknowledged = false;
    this.reminder.epma_prescriptionreminders_id = uuid();
    this.reminder.issystem = false;
    this.startdate = "";
    this.startime = "00:00";
    this.reminderHeader = "New Reminder";
    this.minDate = moment().toDate();
  }
  openEditReminderPopup(remind) {
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
    this.reminder.ackstatus = null;
    this.reminder.lastmodifiedby = this.appService.loggedInUserName;
    this.reminder.lastmodifiedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.reminder.activationdatetime = moment(this.startdate, "DD-MM-YYYY").format("YYYY-MM-DD") + " " + this.startime;
    this.reminder.activationdatetime = this.appService.getDateTimeinISOFormat(moment(this.reminder.activationdatetime, 'YYYY-MM-DD HH:mm').toDate());
    this.showSpinner = true;
    Object.keys(this.reminder).map((e) => { if (e.startsWith("_")) delete this.reminder[e]; });
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionreminders', JSON.stringify(this.reminder))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.showNewReminder = false;
          this.showSpinner = false;
          this.validationMesssage = "";
          this.dr.getReminders(() => {
            this.prepareReminderList();
            this.subjects.refreshTemplate.next();
          });

        }, (error) => {
          this.showSpinner = false;
          this.showNewReminder = false;
          if (this.appService.IsDataVersionStaleError(error)) {
            this.subjects.ShowRefreshPageMessage.next(error);
          }
        })
    )
  }
  closeReminderPopup() {
    clearInterval(this.interval_id);
    this.subjects.refreshTemplate.next(this.prescription.prescription_id);
    this.subjects.closeAppComponentPopover.next();
  }
  closeNewReminderPopup() {
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
    let allReminder = this.appService.Prescriptionreminders.slice().filter(x => x.prescription_id == this.prescription.prescription_id);
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
        overduetime.add(this.appService.appConfig.defaultOverdueTimePeriod, "hours");
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
    this.reminderList.forEach((item) => {
      item.reminder.sort((b, a) => (moment(a.__calculatedactivationdatetime) > moment(b.__calculatedactivationdatetime)) ? 1 : ((moment(b.__calculatedactivationdatetime) > moment(a.__calculatedactivationdatetime)) ? -1 : 0));
    });
  }

  openAcknowledgeReminderPopup(remind) {
    this.showAcknowledgeReminder = true;
    this.showSpinner = false;
    this.acknowledgeNote = "";
    this.isAcknowledgeNoteRequired = false;
    this.reminder = new Prescriptionreminders();
    this.reminder = Object.assign({}, remind);
  }
  saveAcknowledgeReminder() {
    if (this.reminder.isackmandatory && !this.acknowledgeNote) {
      this.isAcknowledgeNoteRequired = true;
      return;
    }
    this.reminder.ackmsg = this.acknowledgeNote;
    this.reminder.acknowledgedby = this.appService.loggedInUserName;
    this.reminder.isacknowledged = true;
    this.reminder.acknowledgedon = this.appService.getDateTimeinISOFormat(moment().toDate());
    this.showSpinner = true;
    Object.keys(this.reminder).map((e) => { if (e.startsWith("_")) delete this.reminder[e]; });
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/PostObject?synapsenamespace=local&synapseentityname=epma_prescriptionreminders', JSON.stringify(this.reminder))
        .subscribe((response) => {
          this.appService.UpdateDataVersionNumber(response);

          this.showAcknowledgeReminder = false;
          this.showSpinner = false;
          // this.appService.Prescriptionreminders = this.appService.Prescriptionreminders.filter(x => x.epma_prescriptionreminders_id != this.reminder.epma_prescriptionreminders_id);
          // this.appService.Prescriptionreminders.push(this.reminder);
          this.dr.getReminders(() => {
            this.prepareReminderList();
          });
        }, (error) => {
          this.showSpinner = false;
          if (this.appService.IsDataVersionStaleError(error)) {
            this.subjects.ShowRefreshPageMessage.next(error);
          }
        })
    )
  }
  closeAcknowledgePopup() {
    this.showAcknowledgeReminder = false;
  }
}

class ReminderModel {
  public status: string
  public reminder: Prescriptionreminders[]
}

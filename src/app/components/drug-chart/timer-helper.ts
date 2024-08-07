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

import { contents, InfusionType, PrescriptionContext, title } from "../../services/enum"
import { AppService } from "src/app/services/app.service"
import moment from 'moment';
import { Dose, Medicationadministration, Posology, Prescription, Prescriptionreminders } from '../../models/EPMA';

import { Subscription } from 'rxjs';
import { Injectable } from "@angular/core";




@Injectable({
    providedIn: 'root'
})

export class TimeerHelper {
    prescriptionStatus: string = "";
    timelinestart: any;
    timelineend: any;
    currentDate: any;
    minEventDate: any;
    MaxEventDate: any;
    subscriptions: Subscription = new Subscription();
    PRNids = new Array();
    PrescriptionFormEvent: any = [];
    isreportevents: boolean
    bufferambertime = 0;
    CreateWithheldEvents: boolean;
    constructor(public appService: AppService) {



    }

    // createPrescriptionFormEvent(prescription: Prescription) {
    //     this.isTempEvents = true;
    //     this.PrescriptionFormEvent = [];
    //     this.prescriptionStatus = "";
    //     // setting max and min event date
    //     this.MaxEventDate = moment(this.currentDate).add(8, 'days');
    //     this.minEventDate = moment(this.currentDate).add(-8, 'days');
    //     this.MaxEventDate.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
    //     this.minEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

    //     if (prescription.prescriptionstatus_id != null && prescription.prescriptionstatus_id != "") {
    //         this.prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status;
    //     }
    //     if (prescription.__posology[0].prn) {

    //         this.addevents(prescription.prescription_id, prescription.__posology[0].__dose[0].dose_id, new Date(), null, prescription.__posology[0].posology_id, prescription.__posology[0].prn,
    //             false, false, false, contents.Administer_PRN)
    //         this.PRNids.push(prescription.__posology[0].__dose[0].dose_id);

    //     }
    //     else if (prescription.isinfusion) {
    //         if (this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {
    //             this.addInfutionEvent(prescription);
    //         }
    //     }
    //     else {
    //         let temp = this.appService.TimelineArray;
    //         this.currentDate = new Date();
    //         if (prescription.__posology[0].frequency == "protocol") {
    //             this.addProtocolEvents(prescription)
    //         }
    //         else {
    //             this.addLogicalEvent(prescription);
    //         }
    //     }
    //     let temp = this.PrescriptionFormEvent;
    //     this.PrescriptionFormEvent = Array.from(new Set(temp.map(a => a.dose_id)))
    //         .map(id => {
    //             return temp.find(a => a.dose_id === id)
    //         })

    //     return this.PrescriptionFormEvent;

    // }
    addReminderevents(prescription_id: any, dose_id: any, eventStart: any, eventEnd: any, epma_prescriptionreminders_id: any, type: number, pending: boolean,
        remindertype: number, isinfusion: boolean, content: any, title: string, admitdone = false,issystem=false) {
        let opacityclass = "";
        if (eventEnd == null) {
            opacityclass = this.iseventinpatientaway(moment(eventStart));
        }
        if (this.isreportevents) {
            this.appService.AllReminderevents.push({
                prescription_id: prescription_id,
                epma_prescriptionreminders_id: epma_prescriptionreminders_id,
                dose_id: dose_id,
                eventStart: moment(eventStart),
                eventEnd: eventEnd,
                type: type,
                pending: pending,
                remindertype: remindertype,
                isinfusion: isinfusion,
                content: content,
                title: title,
                admitdone: admitdone,
                opacityclass: opacityclass,
                diffrence: 0,
                stackclass: false

            }

            )
        }
        else {
            this.appService.CurrentReminderevents.push({
                prescription_id: prescription_id,
                epma_prescriptionreminders_id: epma_prescriptionreminders_id,
                dose_id: dose_id,
                eventStart: moment(eventStart),
                eventEnd: eventEnd,
                type: type,
                pending: pending,
                remindertype: remindertype,
                isinfusion: isinfusion,
                content: content,
                title: title,
                admitdone: admitdone,
                opacityclass: opacityclass,
                diffrence: 0,
                stackclass: false,
                issystem:issystem
            }

            )

        }
    }
    createWithDoseReminder(reminder: Prescriptionreminders) {
      
        let Overdue = moment().add(-this.appService.appConfig.defaultReminderOverdueTimePeriod, 'h');
        let prescriptionEvents = [];
        if (this.isreportevents) {
            prescriptionEvents = this.appService.reportData.filter(e => e.prescription_id == reminder.prescription_id && moment(reminder.activationdatetime).isSameOrBefore(moment(e.eventStart)) && !e.dose_id.includes("bolus_") && !e.dose_id.includes("end") && !e.dose_id.includes("pause") && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.content.includes("Administer_PRN") && !e.dose_id.includes("infusionevent"))
        }
        else {
            prescriptionEvents = this.appService.events.filter(e => e.prescription_id == reminder.prescription_id && moment(reminder.activationdatetime).isSameOrBefore(moment(e.eventStart)) && !e.dose_id.includes("bolus_") && !e.dose_id.includes("end") && !e.dose_id.includes("pause") && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.content.includes("Administer_PRN") && !e.dose_id.includes("infusionevent"))
        }
        for (let event of prescriptionEvents) {
            if (!reminder.enddatetime || moment(reminder.enddatetime).isSameOrAfter(moment(event.eventStart))) {

                if (this.appService.remindersack.find(x => x.logicalid == "dur_Reminder" + event.dose_id)) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + event.dose_id, moment(event.eventStart),
                        null, reminder.epma_prescriptionreminders_id, 3, false, 2, false, contents.ReminderAcknowledged, reminder.message)
                }
                else if (moment(reminder.lastmodifiedon).isSameOrBefore(moment(event.eventStart)) && moment(event.eventStart).isSameOrAfter(moment())) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + event.dose_id, moment(event.eventStart),
                        null, reminder.epma_prescriptionreminders_id, 2, false, 2, false, contents.Reminder, reminder.message)
                }
                else if (moment(reminder.lastmodifiedon).isSameOrBefore(moment(event.eventStart)) && moment(event.eventStart).isBefore(moment()) && Overdue.isBefore(moment(reminder.activationdatetime))) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + event.dose_id, moment(event.eventStart),
                        null, reminder.epma_prescriptionreminders_id, 1, false, 2, false, contents.Reminderdue, reminder.message)
                }
                else if (moment(reminder.lastmodifiedon).isSameOrBefore(moment(event.eventStart)) && Overdue.isAfter(moment(event.eventStart))) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + event.dose_id, moment(event.eventStart),
                        null, reminder.epma_prescriptionreminders_id, 0, false, 2, false, contents.Reminderoverdue, reminder.message)
                }
            }

        }


    }
    createRepeatReminder(start: any, enddate: any, reminder: Prescriptionreminders) {
       
        if(moment(start).isSameOrBefore(moment(reminder.activationdatetime))){
            start=moment(reminder.activationdatetime)
        }
        let Overdue = moment().add(-this.appService.appConfig.defaultReminderOverdueTimePeriod, 'h');
        let prescriptions = this.appService.Prescription.find(x => x.prescription_id == reminder.prescription_id)
        let prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescriptions.prescriptionstatus_id).status;
        let prescriptionenddate = this.appService.GetCurrentPosology(prescriptions).prescriptionenddate
       
        if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled") {
            enddate = this.appService.GetCurrentPosology(prescriptions).prescriptionenddate
        }
        if (prescriptionenddate && moment(prescriptionenddate).isSameOrBefore(moment(enddate))) {
            enddate = moment(prescriptionenddate);
        }
        if(moment(reminder.enddatetime).isSameOrBefore(moment(enddate))){
            enddate=moment(reminder.enddatetime)
        }
        let remindersplotTime=moment(start).clone();
        while(moment(remindersplotTime).isSameOrBefore(moment(enddate))){

            if (this.appService.remindersack.find(x=>x.logicalid=="dur_Reminder" + this.createLogicalId(remindersplotTime, reminder.epma_prescriptionreminders_id))) {
                this.addReminderevents(reminder.prescription_id, "dur_Reminder" + this.createLogicalId(remindersplotTime, reminder.epma_prescriptionreminders_id), moment(remindersplotTime),
                    null, reminder.epma_prescriptionreminders_id, 3, false, 1, false, contents.ReminderAcknowledged, reminder.message)
            }
            else if (moment(remindersplotTime).isSameOrAfter(moment())) {
                this.addReminderevents(reminder.prescription_id, "dur_Reminder" + this.createLogicalId(remindersplotTime, reminder.epma_prescriptionreminders_id), moment(remindersplotTime),
                    null, reminder.epma_prescriptionreminders_id, 2, false, 1, false, contents.Reminder, reminder.message)
            }
            else if (moment(remindersplotTime).isBefore(moment()) && Overdue.isBefore(moment(remindersplotTime))) {
                this.addReminderevents(reminder.prescription_id, "dur_Reminder" + this.createLogicalId(remindersplotTime, reminder.epma_prescriptionreminders_id), moment(remindersplotTime),
                    null, reminder.epma_prescriptionreminders_id, 1, false, 1, false, contents.Reminderdue, reminder.message)
            }
            else if (Overdue.isAfter(moment(remindersplotTime))) {
                this.addReminderevents(reminder.prescription_id, "dur_Reminder" + this.createLogicalId(remindersplotTime, reminder.epma_prescriptionreminders_id), moment(remindersplotTime),
                    null, reminder.epma_prescriptionreminders_id, 0, false, 1, false, contents.Reminderoverdue, reminder.message)
            }

            if(reminder.repeattype=="h")
            remindersplotTime = moment(remindersplotTime).add(reminder.repeatsize,"h")
            if(reminder.repeattype=="m")
            remindersplotTime = moment(remindersplotTime).add(reminder.repeatsize,"m")
            if(reminder.repeattype=="d")
            remindersplotTime = moment(remindersplotTime).add(reminder.repeatsize,"d")
        }


    }
    AddReminders(eventStartDate: any, eventEndDate: any,Reminderprescription:Prescription) {
        //  let overduetimeOther =overduetimeOther.add(this.appService.appConfig.defaultReminderOverdueTimePeriod, "hours");
        let start = moment(eventStartDate).clone();
        let enddate = moment(eventEndDate).clone();moment
        if (Reminderprescription) {
          let  sortreminder = this.appService.CurrentReminderevents.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(x=>x.prescription_id==Reminderprescription.prescription_id)
            let pendingReminder = sortreminder.find(x=>moment(x.eventStart).isAfter(moment()));
            if(pendingReminder){
                pendingReminder.pending=true;
                this.appService.AllReminderevents.push(pendingReminder);
            }

        }
       
        for (let reminder of this.appService.Prescriptionreminders) {
            let Overdue = moment().add(-this.appService.appConfig.defaultReminderOverdueTimePeriod, 'h');

            if (!reminder.activationdatetime) {
                let administration = this.appService.Medicationadministration.filter(x => x.prescription_id == reminder.prescription_id).sort((a, b) => new Date(a.administrationstartime).getTime() - new Date(b.administrationstartime).getTime());
                if (administration.length > 0) {
                    reminder.__calculatedactivationdatetime = moment(administration[0].administrationstartime, "YYYY-MM-DD HH:mm").add(+reminder.activationinhours, "hours")
                }
                else{
                    continue;
                }
            } else {
                reminder.__calculatedactivationdatetime = moment(reminder.activationdatetime);
            }


            if (reminder.remindertype && reminder.remindertype == 1) {

                this.createRepeatReminder(start, enddate, reminder);

            }
            else if (reminder.remindertype && reminder.remindertype == 2) {
                this.createWithDoseReminder(reminder)
            }
            else {
                if (reminder.isacknowledged) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + reminder.epma_prescriptionreminders_id, moment(reminder.__calculatedactivationdatetime),
                        null, reminder.epma_prescriptionreminders_id, 3, false, 0, false, contents.ReminderAcknowledged, reminder.message,false,reminder.issystem)
                }
                else if (moment(reminder.__calculatedactivationdatetime).isSameOrAfter(moment())) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + reminder.epma_prescriptionreminders_id, moment(reminder.__calculatedactivationdatetime),
                        null, reminder.epma_prescriptionreminders_id, 2, false, 0, false, contents.Reminder, reminder.message,false,reminder.issystem)
                }
                else if (moment(reminder.__calculatedactivationdatetime).isBefore(moment()) && Overdue.isBefore(moment(reminder.__calculatedactivationdatetime))) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + reminder.epma_prescriptionreminders_id, moment(reminder.__calculatedactivationdatetime),
                        null, reminder.epma_prescriptionreminders_id, 1, false, 0, false, contents.Reminderdue, reminder.message,false,reminder.issystem)
                }
                else if (Overdue.isAfter(moment(reminder.__calculatedactivationdatetime))) {
                    this.addReminderevents(reminder.prescription_id, "dur_Reminder" + reminder.epma_prescriptionreminders_id, moment(reminder.__calculatedactivationdatetime),
                        null, reminder.epma_prescriptionreminders_id, 0, false, 0, false, contents.Reminderoverdue, reminder.message,false,reminder.issystem)
                }
            }
        }

       

        if (!this.isreportevents) {
            for (let reminder of this.appService.Prescriptionreminders.filter(x => !x.issystem && (x.remindertype !=1 && x.remindertype !=2))) {

                if(this.appService.CurrentReminderevents.find(x=> x.epma_prescriptionreminders_id != reminder.epma_prescriptionreminders_id && moment(x.eventStart).isSame(moment(reminder.activationdatetime) ) && x.prescription_id == reminder.prescription_id )){
                    let array = this.appService.CurrentReminderevents.filter(x=> moment(x.eventStart).isSame(moment(reminder.activationdatetime)) && x.prescription_id == reminder.prescription_id)
                    for(let obj of array){
                      
                       this.appService.CurrentReminderevents.splice(this.appService.CurrentReminderevents.indexOf(obj), 1);
                    }
                   // this.appService.CurrentReminderevents= this.appService.CurrentReminderevents.filter(x=>x.epma_prescriptionreminders_id == reminder.epma_prescriptionreminders_id && ! moment(x.eventStart).isSame(moment(reminder.activationdatetime)) && x.prescription_id == reminder.prescription_id)
                    
                    if(array.find(x=>x.type < 3)){
                        array=array.filter(x=>x.type < 3);
                        if(array[0].type== 2){
                            array[0].content= contents.Multiple_Reminders;
                            array[0].title="Multiple Reminders";

                        }
                        if(array[0].type== 1){
                            array[0].content= contents.Multiple_Reminders_With_The_Date;
                            array[0].title="Multiple Reminders";

                        }
                        if(array[0].type== 0){
                            array[0].content= contents.Multiple_Reminders_One_Day_Has_Passed;
                            array[0].title="Multiple Reminders";

                        }
                        this.appService.CurrentReminderevents.push(array[0]);

                    }
                    else{
                        array[0].content= contents.Multiple_Reminders_Has_Been_Acknowledged;
                        array[0].title="Multiple Reminders3";
                        this.appService.CurrentReminderevents.push(array[0]);
                    }

                }
                
            } 
        }
    }
    AddCIDurationLine(prescription: Prescription, sortedArray: any) {

        this.appService.events = this.appService.events.filter(x => !(x.dose_id.includes("dur") && x.prescription_id == prescription.prescription_id));




        let length = sortedArray.length;
        sortedArray.forEach((value, index) => {
            // console.log(index); // 0, 1, 2
            // console.log(value); // 9, 2, 5
            if (!value.dose_id.includes("pause") && !value.dose_id.includes("end_")) {
                let linestartDatetime = value.eventStart
                let LineEndline: any;
                if (index + 1 == length) {
                    LineEndline = moment(this.timelineend);
                }
                else {
                    LineEndline = sortedArray[index + 1].eventStart
                }
                if (this.appService.Medicationadministration.find(x => x.administredinfusionrate == 0 && x.logicalid == value.dose_id)) {
                    this.addevents(prescription.prescription_id, "durdoted" + index + prescription.prescription_id, linestartDatetime,
                        LineEndline, prescription.__posology[0].posology_id, false, false, false, true, "<div class='PauseDurline'></div>", "")
                }
                else {
                    this.addevents(prescription.prescription_id, "dur" + index + prescription.prescription_id, linestartDatetime,
                        LineEndline, prescription.__posology[0].posology_id, false, false, false, true, contents.durationline, "")
                }

            }
        });


    }
    CurrentPrescriptionFlowArray(prescription: Prescription) {

        let currentPresctionStatus
        let prescriptionEvents = this.appService.Medicationadministration.filter(e => e.prescription_id == prescription.prescription_id && !e.logicalid.includes("bolus_"))
        let latestevent = this.appService.events.filter(e => e.prescription_id == prescription.prescription_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"))
        latestevent = latestevent.sort((b, a) => moment(a.eventStart).valueOf() - moment(b.eventStart).valueOf())
        prescriptionEvents = prescriptionEvents.sort((a, b) => moment(a.administrationstartime).valueOf() - moment(b.administrationstartime).valueOf())
        if (prescription.__completed || this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status == "stopped" ||
            this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status == "cancelled") {
            currentPresctionStatus = {
                start: this.timelinestart,
                end: this.timelineend,
                prescriptionid: prescription.prescription_id,
                content: "<strong>Stopped</strong>"
            }
        }
        else if (!prescriptionEvents.find(x => x.logicalid.startsWith("start_"))) {
            currentPresctionStatus = {
                start: this.timelinestart,
                end: this.timelineend,
                prescriptionid: prescription.prescription_id,
                content: "<strong>Not started</strong>"
            }
        }
        else if (prescriptionEvents.find(x => x.logicalid.startsWith("start_"))) {
            let content = "<strong>Currently: " + prescriptionEvents[prescriptionEvents.length - 1].administredinfusionrate + " " + prescription.__posology[0].infusionrateunits + "</strong>"
            if (latestevent[0].dose_id.startsWith("pause")) {
                content = "<strong>PAUSED-previously: " + prescriptionEvents[prescriptionEvents.length - 1].administredinfusionrate + " " + prescription.__posology[0].infusionrateunits + "</strong>"
            }
            currentPresctionStatus = {
                start: this.timelinestart,
                end: this.timelineend,
                prescriptionid: prescription.prescription_id,
                content: content
            }
        }
        this.appService.arrPrescriptionCurrentFlowRate.push(currentPresctionStatus);




    }
    AddStackClassEvent(prescription: Prescription) {
        if (prescription.isinfusion && (prescription.__posology[0].infusiontypeid == 'ci' || prescription.__posology[0].infusiontypeid == InfusionType.pca)) {
            this.CurrentPrescriptionFlowArray(prescription);
        }

        let prescriptionEvents = this.appService.events.filter(e => e.prescription_id == prescription.prescription_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.content.includes("Administer_PRN") && !e.dose_id.includes("infusionevent"))
        /////////////////remove duplicate////////////////////////
        let temp = prescriptionEvents;
        prescriptionEvents = Array.from(new Set(temp.map(a => a.dose_id)))
            .map(id => {
                return temp.find(a => a.dose_id === id)
            })

        //////////////////////////////////////////////////

        const sortedArray = prescriptionEvents.sort((a, b) => a.eventStart - b.eventStart)
        if (prescription.isinfusion && (prescription.__posology[0].infusiontypeid == 'ci' || prescription.__posology[0].infusiontypeid == InfusionType.pca)) {
            this.AddCIDurationLine(prescription, sortedArray);
        }
        let EventIsStackTrue: any
        let zoombooton
        let priviousEvent: any
        for (let pNext of sortedArray) {
            if (EventIsStackTrue) {
                let lastevent = new Date(moment(EventIsStackTrue.eventStart, moment.ISO_8601).toString());
                let currentEvent = new Date(moment(pNext.eventStart, moment.ISO_8601).toString());
                let diffMs = (currentEvent.valueOf() - lastevent.valueOf());
                let diffrence = Math.round(diffMs / 60000);

                if (diffrence < 91) {
                    if (priviousEvent && priviousEvent.stackclass != true) {//if there is allready a stack class in net event no need to add
                        EventIsStackTrue.diffrence = diffrence;
                        EventIsStackTrue.stackclass = true;
                    }
                    //check to add zoom button every 90 min diffrence
                    if (zoombooton && Math.round((moment(EventIsStackTrue.eventStart).valueOf() - moment(zoombooton.eventStart).valueOf()) / 60000) < 40) {
                        priviousEvent = EventIsStackTrue;
                        EventIsStackTrue = pNext;
                        continue;
                    }
                    zoombooton = {
                        prescription_id: EventIsStackTrue.prescription_id,
                        posology_id: EventIsStackTrue.posology_id,
                        dose_id: "dur_Zoom" + EventIsStackTrue.dose_id,
                        eventStart: moment(EventIsStackTrue.eventStart),
                        eventEnd: null,
                        prn: false,
                        iscancel: false,
                        doctorsorder: false,
                        isinfusion: false,
                        content: "<div class ='Zoombutton'></div>",
                        title: "",
                        admitdone: false,
                        opacityclass: "",
                        diffrence: diffrence,
                        stackclass: false

                    }
                    this.appService.stackButtons.push(zoombooton);

                }
            }
            else {

                //first loop only when priviousEvent and EventIsStackTrue is undefind
                priviousEvent = pNext;
                EventIsStackTrue = pNext;
                continue;
            }
            priviousEvent = EventIsStackTrue;
            EventIsStackTrue = pNext;


        }
    }

    checkIFMOAisPrescrib(prescription: Prescription) {



        let formularycode = prescription.__medications.find(x => x.isprimary).__codes.find(y => y.terminology == "formulary").code;
        //  let codeobject = this.appService.Prescription.find(x => x.prescription_id != prescription.prescription_id).__medications.find(y => y.isprimary == true).__codes.find(z => z.terminology == "formulary" && z.code == formularycode)
        let codeobject = this.appService.Prescription.filter(x => x.prescription_id != prescription.prescription_id && x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Inpatient).prescriptioncontext_id &&
            (x.__medications.find(y => y.isprimary == true).__codes.filter(z => z.terminology == "formulary" && z.code == formularycode).length != 0))
        if (codeobject && codeobject.length != 0) {
            return true;// MOA match and no need to show
        }
        else {
            return false // Code not found and MOA prescription not prescribed
        }
    }

    AddPRNFutureLine(prescriptions: Prescription[]) {

        let prnPrescriptions = prescriptions.filter(x => x.__posology.find(z => z.iscurrent && z.prn))
        for (let p of prnPrescriptions) {

            if (this.appService.events.find(x => x.prescription_id == p.prescription_id && x.admitdone == true && x.content != contents.EnterInError)) {
                let pres = this.appService.events.filter(x => x.prescription_id == p.prescription_id && x.admitdone == true && x.content != contents.EnterInError)
                if (pres) {
                    const sortedArray = pres.sort((b, a) => a.eventStart - b.eventStart)
                    let lastadmited = sortedArray[0];
                    let enddate: any;
                    if (p.__posology.find(x => x.iscurrent).frequency == "h") {
                        enddate = moment(lastadmited.eventStart).add(p.__posology.find(x => x.iscurrent).frequencysize, 'hours');  // see the cloning?frequency
                    }
                    else {
                        enddate = moment(lastadmited.eventStart).add(p.__posology.find(x => x.iscurrent).frequencysize, 'minutes');
                    }

                    if (p.__posology.find(x => x.posology_id == lastadmited.posology_id && x.iscurrent)) {
                        this.addevents(lastadmited.prescription_id, "dur" + lastadmited.prescription_id, lastadmited.eventStart,
                            enddate, lastadmited.posology_id, false, false, false, true, "<div class='divPRN'></div>", "PRN")
                    }
                }
            }


        }

    }

    createEvents(eventStartDate: any, eventEndDate: any, isReportview = false,Reminderprescription:Prescription = null,CreateWithheldEvents=false) {
        this.CreateWithheldEvents=CreateWithheldEvents
        this.isreportevents = isReportview;
        if (!isReportview) {
            this.timelinestart = eventStartDate;
            this.timelineend = eventEndDate;
            this.appService.events = [];
            this.appService.CurrentReminderevents = []
            this.appService.arrPrescriptionCurrentFlowRate = [];
            this.appService.stackButtons = [];
        }
        else {
            this.appService.AllReminderevents = [];
            this.appService.reportData = [];
        }



        this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id
            || x.prescriptioncontext_id == null || x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Inpatient).prescriptioncontext_id)

        let posologyloopCount = 0;
        let loopPrescription=[]
        if(Reminderprescription){
            loopPrescription.push(this.appService.FilteredPrescription.find(x=>x.prescription_id==Reminderprescription.prescription_id))
        }
        else{
            loopPrescription= this.appService.FilteredPrescription
        }
        for (let prescription of loopPrescription) {

            this.bufferambertime = this.appService.buffertimeAmber;
            if (prescription.__medications.find(x => x.isprimary).iscritical) {
                this.bufferambertime = this.appService.criticalDrugbuffertimeAmber;
            }
            this.prescriptionStatus = "";

            if (prescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id) {

                if (this.checkIFMOAisPrescrib(prescription)) {
                    this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.prescription_id != prescription.prescription_id)
                    continue;
                }
                else {
                    continue;
                }
            }
            // setting max and min event date 

            // this.MaxEventDate=  moment(eventEndDate);
            // this.minEventDate = moment(eventStartDate);
            // this.MaxEventDate.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
            // this.minEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

            if (prescription.prescriptionstatus_id != null && prescription.prescriptionstatus_id != "") {
                this.prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status;
            }
            for (let pslg of prescription.__posology) {
                posologyloopCount = 0;
                if (this.appService.encounter.dischargedatetime && moment(eventEndDate).isAfter(moment(this.appService.encounter.dischargedatetime))) {
                    this.MaxEventDate = moment(this.appService.encounter.dischargedatetime);
                }
                else {
                    this.MaxEventDate = moment(eventEndDate);
                    this.MaxEventDate.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
                }

                this.minEventDate = moment(eventStartDate);

                this.minEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                if (pslg.prn) {
                    // create all administer events only onces
                    if (posologyloopCount == 0) {
                        posologyloopCount = 1;
                        this.addAdministeredEvent(prescription);
                    }
                    if (pslg.iscurrent && this.prescriptionStatus != "suspended" && this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {

                        this.addevents(prescription.prescription_id, pslg.__dose[0].dose_id, new Date(), null, pslg.posology_id, pslg.prn,
                            false, false, false, contents.Administer_PRN, title.Administer_PRN)
                        this.PRNids.push(pslg.__dose[0].dose_id);

                    }
                    // if (this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {

                    // }
                }
                else if (prescription.isinfusion) {
                    //  if ( this.prescriptionStatus != "cancelled") {
                    this.addInfutionEvent(prescription, pslg);
                    //  }
                }
                else {
                    let temp = this.appService.TimelineArray;
                    this.currentDate = new Date();

                    // if (this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {

                    if (posologyloopCount == 0) {
                        posologyloopCount = 1;
                        this.addAdministeredEvent(prescription);
                    }

                    if (pslg.frequency == "protocol") {
                        this.addProtocolEvents(prescription, pslg, this.prescriptionStatus);
                    }
                    else {
                        this.addLogicalEvent(prescription, pslg, this.prescriptionStatus);
                    }


                }
            }
            this.AddStackClassEvent(prescription);
        }

        let temp = this.appService.events;
        this.appService.events = Array.from(new Set(temp.map(a => a.dose_id)))
            .map(id => {
                return temp.find(a => a.dose_id === id)
            })
            if (isReportview) {
                let reportData = this.appService.reportData;
            this.appService.reportData = Array.from(new Set(reportData.map(a => a.dose_id)))
            .map(id => {
                return reportData.find(a => a.dose_id === id)
            })
        }
        this.AddReminders(eventStartDate, eventEndDate,Reminderprescription);
        this.AddPRNFutureLine(this.appService.FilteredPrescription);

    }


    addProtocolEvents(prescription: Prescription, pslg: Posology, prescriptionStatus: string) {

        let repitTimes = pslg.repeatprotocoltimes;
        let minemumDate = new Date(Math.min.apply(null, pslg.__dose.map(function (e) {
            return new Date(e.dosestartdatetime);
        })));
        let maximumDate = new Date(Math.max.apply(null, pslg.__dose.map(function (e) {
            return new Date(e.dosestartdatetime);
        })));
        let dateDiff = 0;





        do {// to repete whole protocall 1 ti
            for (let dose of pslg.__dose) {
                if (moment(this.minEventDate) < moment(dose.dosestartdatetime) &&
                    moment(dose.dosestartdatetime) <= moment(this.MaxEventDate)) {
                    let ploteDate = moment(dose.dosestartdatetime)
                    ploteDate = moment(ploteDate).add(dateDiff, 'd');
                    const logicalId = this.createLogicalId(ploteDate, dose.dose_id);
                    if (!this.appService.Medicationadministration.find(x => x.logicalid == logicalId)) {
                        if (!(!dose.dosesize && !dose.strengthdenominator && !dose.strengthneumerator && !dose.descriptivedose)) {
                            let enddate = moment(this.MaxEventDate)
                            if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled") {
                                enddate = moment(prescription.lastmodifiedon)
                            }
                            if (moment(enddate).isSameOrAfter(moment(ploteDate))) {
                                this.createLogicalevents(pslg, ploteDate, dose);
                            }
                        }
                    }

                }
            }
            dateDiff = dateDiff + moment(maximumDate).diff(moment(minemumDate), 'days') + 1;
            repitTimes = repitTimes - 1;
            if (repitTimes < 1) {
                break;
            }
        } while (!pslg.repeatlastday)
        ///////////////// loo end ////////////////////////
        // repeate only last day

        if (pslg.repeatlastday) {
            let lastdose = pslg.__dose[pslg.__dose.length - 1];

            let dose = [];
            for (let x of pslg.__dose) {
                if (moment(lastdose.dosestartdatetime).format('DD') == moment(x.dosestartdatetime).format('DD')) {
                    if (x.dosesize && x.dosesize != "0") {
                        dose.push(x);
                    }
                }
            }
            //  let dose = pslg.__dose.filter(x=> moment(x.dosestartdatetime, "MM/DD/YYYY").format('DD') == moment(tempdose.dosestartdatetime).format('DD'))
            for (let plotdose of dose) {
                let ploteDate = moment(plotdose.dosestartdatetime)
                let repeatlastdayuntil = moment(pslg.repeatlastdayuntil)
                if (moment(repeatlastdayuntil, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {
                    this.MaxEventDate = moment(pslg.repeatlastdayuntil);
                    this.MaxEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                }
                if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled") {
                    this.MaxEventDate = moment(prescription.lastmodifiedon)
                }
                ploteDate = moment(ploteDate).add(1, 'd');
                while (moment(ploteDate).isSameOrBefore(moment(this.MaxEventDate))) {


                    const logicalId = this.createLogicalId(ploteDate, plotdose.dose_id);
                    if (!this.appService.Medicationadministration.find(x => x.logicalid == logicalId)) {
                        if (pslg.iscurrent || moment(pslg.prescriptionenddate) >= ploteDate) {

                            this.createLogicalevents(pslg, ploteDate, plotdose);
                        }
                    }
                    ploteDate = moment(ploteDate).add(1, 'd');



                }
            }

        }



    }

    addLogicalEvent(prescription: Prescription, pslg: Posology, prescriptionStatus: string) {
        let daystoplot = JSON.parse(pslg.daysofweek);
        for (let dose of pslg.__dose) {
            let ploteDate = moment(dose.dosestartdatetime);
            let enddate = moment(pslg.prescriptionenddate)
            if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled") {
                if( pslg.prescriptionenddate && moment(pslg.prescriptionenddate).isBefore(moment(prescription.lastmodifiedon))){
                    enddate = moment(pslg.prescriptionenddate)
                }
                else{
                    enddate = moment(prescription.lastmodifiedon)
                }
                let dosetransfer = this.appService.DoseEvents.filter(x => x.posology_id == pslg.posology_id && x.eventtype == "Transfer");
                dosetransfer.sort((b,a) => new Date(a.startdatetime).getTime() - new Date(b.startdatetime).getTime())
                for(let transEvent of dosetransfer){//finding max event transferdate before stoping  
                   if(moment(transEvent.startdatetime).isAfter(moment(prescription.lastmodifiedon)) && moment(transEvent.dosedatetime).isBefore(moment(prescription.lastmodifiedon))){
                    enddate = moment(transEvent.startdatetime)
                    break;
                   }
                }
               
                
            }
           
            if (!this.CreateWithheldEvents && moment(enddate) <= moment(this.MaxEventDate)) {
                this.MaxEventDate = moment(enddate);

            }
            let futureTransferevent = this.appService.DoseEvents.filter(x => x.dose_id == dose.dose_id && x.posology_id == pslg.posology_id && (moment(x.startdatetime).isAfter(moment(pslg.prescriptionenddate)) &&
                (moment(x.dosedatetime).isSameOrBefore(moment(pslg.prescriptionenddate)))));
          
            for (let k of futureTransferevent) {
                if (prescription.__posology.find(x => x.posology_id == k.posology_id)) {

                    this.createLogicalevents(pslg, moment(k.startdatetime), dose);
                    // addfutureevent.push(k);
                }
            }

            if (dose.isadditionaladministration) {// if isadditional administration not need to loop till date   
                const logicalId = this.createLogicalId(ploteDate, dose.dose_id);
                if (!this.appService.Medicationadministration.find(x => x.logicalid == logicalId)) {
                    if (pslg.iscurrent || moment(pslg.prescriptionenddate) > ploteDate) {
                        this.createLogicalevents(pslg, ploteDate, dose);

                    }
                }
            }
            else {
                while (moment(ploteDate, "MM/DD/YYYY HH") <= moment(this.MaxEventDate, "MM/DD/YYYY HH")) {
                    const logicalId = this.createLogicalId(ploteDate, dose.dose_id);
                    if (!this.appService.Medicationadministration.find(x => x.logicalid == logicalId)) {

                        if (daystoplot.indexOf(moment(ploteDate).format('dddd')) > -1 || daystoplot.length == 0) {
                            if (moment(this.minEventDate, "MM/DD/YYYY") < moment(ploteDate, "MM/DD/YYYY")) {
                                if (pslg.iscurrent || moment(pslg.prescriptionenddate) >= ploteDate) {
                                    this.createLogicalevents(pslg, ploteDate, dose)
                                    if (pslg.frequency == "stat") {
                                        break;
                                    }
                                }
                            }
                        } else {
                            //Not in the array
                        }

                    }
                    if (pslg.frequency == "stat") {
                        break;
                    }
                    if (pslg.dosingdaysfrequencysize == 0) {
                        ploteDate = moment(ploteDate).add(1, 'd');
                    }
                    else {
                        if (pslg.dosingdaysfrequency == "days") {
                            ploteDate = moment(ploteDate).add(pslg.dosingdaysfrequencysize, 'd');
                        }
                        else if (pslg.dosingdaysfrequency == "weeks") {
                            ploteDate = moment(ploteDate).add(pslg.dosingdaysfrequencysize, 'w');
                        }
                        else if (pslg.dosingdaysfrequency == "months") {
                            ploteDate = moment(ploteDate).add(pslg.dosingdaysfrequencysize, 'M');
                        }

                    }
                }
            }
        }

    }



    createLogicalevents(pslg: Posology, ploteDate: any, dose: Dose) {
        let logical_ID = this.createLogicalId(ploteDate, dose.dose_id)
        let posology = pslg;

        if (moment(posology.prescriptionstartdate) > moment(ploteDate)) {
            if (!dose.isadditionaladministration) {
                return;
            }
        }
        let doseprescription = this.appService.Prescription.find(x => x.prescription_id == dose.prescription_id)
        // Checking if dose required doctors or and also if doctor has not yet conform isdoctorsorderconfirmed shoud be false
        let isdoseCancle = false;
        let canceldose;
        let doctorcomporm = this.appService.DoseEvents.find(x => x.logicalid == logical_ID && x.eventtype == "doconfirm") ? true : false;

        let isTitrationDone = this.appService.DoseEvents.find(
            x => x.dose_id == null && x.eventtype == "titration" && x.posology_id == pslg.posology_id &&
                (moment(x.titrateduntildatetime) >= moment(ploteDate) || x.titrateduntildatetime == null)) ? true : false;


        if (!isTitrationDone) {
            isTitrationDone = this.appService.DoseEvents.find(x => x.dose_id == dose.dose_id && x.eventtype == "titration" && x.logicalid == logical_ID && moment(x.titrateduntildatetime).format("YYYYMMDDHHmm") == moment(ploteDate).format("YYYYMMDDHHmm")) ? true : false;

        }

        if (this.appService.DoseEvents.filter(x => x.logicalid == logical_ID && x.eventtype != "Undo").length > 0) {
            isdoseCancle = this.appService.DoseEvents.filter(x => x.logicalid == logical_ID)[0].eventtype == "Cancel" ? true : false;
            canceldose=this.appService.DoseEvents.filter(x => x.logicalid == logical_ID)[0]
        }

        let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == logical_ID && x.eventtype == "Transfer");
        if (dosetransferDate) {
            ploteDate = moment(dosetransferDate.dosedatetime);
            if (moment(pslg.prescriptionenddate) <= ploteDate) {
                return;
            }
        }

        dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == logical_ID && x.eventtype == "AdminTransfer");
        if (dosetransferDate) {
            ploteDate = moment(dosetransferDate.dosedatetime);
        }

        /////////////////////////////////////
        let current = new Date(moment(new Date(), moment.ISO_8601).toString());
        let start = new Date(moment(ploteDate, moment.ISO_8601).toString());
        let diffMs = (start.valueOf() - current.valueOf());
        let diffMins = Math.round(diffMs / 60000); // minutes
        ///////////////////////////////

        if (isdoseCancle) {
            // if (posology.doctorsorder) {
                if(canceldose.comments == "Medication suspended"){
                    this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                        isdoseCancle, doctorcomporm, false, contents.Administration_withheld_by_doctor, "Withheld by prescriber")                    
                }
                else{
                    this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                        isdoseCancle, doctorcomporm, false, contents.Administration_withheld_by_doctor, title.Administration_withheld_by_doctor)                }
           
            // }
            // else {
            //     this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
            //         isdoseCancle, doctorcomporm, false, contents.Cancelled)
            // }
        }
        else if (doseprescription.titration && !isTitrationDone && !isdoseCancle) {
            if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Due, title.Administration_requires_doctors_confirmation_Due)
            }

            else if (diffMins <= -this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Late, title.Administration_requires_doctors_confirmation_Late)
            }
            else if (diffMins >= this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Planned, title.Administration_requires_doctors_confirmation_Planned)
            }
        }
        else if (posology.doctorsorder && !doctorcomporm && !isdoseCancle) {
            if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Due, title.Administration_requires_doctors_confirmation_Due)
            }

            else if (diffMins <= -this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Late, title.Administration_requires_doctors_confirmation_Late)
            }
            else if (diffMins >= this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Planned, title.Administration_requires_doctors_confirmation_Planned)
            }
        }
        // check if dose not cancel and even if doctor order is required in dose order is conformed
        else if (!isdoseCancle) {
            if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Due_Administration, title.Due_Administration)
            }
            else if (diffMins <= -this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Late_Administration, title.Late_Administration)
            }
            else if (diffMins >= this.bufferambertime) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Planned_Administration, title.Planned_Administration)
            }
        }


    }

    addAdministeredEvent(Prescription: Prescription) {
        for (let medicationadministration of this.appService.Medicationadministration.filter(x => x.prescription_id == Prescription.prescription_id)) {

            if (moment(this.minEventDate) < moment(medicationadministration.administrationstartime)) {
                // if (true) {
                let pslg = Prescription.__posology.find(x => x.posology_id == medicationadministration.posology_id)
                if (!pslg) {
                    this.addAdministeredEventForDeletedPSLG(medicationadministration);
                    continue;
                }
                if (medicationadministration.isenterinerror) {
                    this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        null, pslg.posology_id, pslg.prn, false, false, false, contents.EnterInError, title.EnterInError, true)
                    continue;
                }
                let plannedtime = new Date(moment(medicationadministration.planneddatetime, moment.ISO_8601).toString());
                let administeredtime = new Date(moment(medicationadministration.administrationstartime, moment.ISO_8601).toString());

                let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
                let diffMins = Math.round(diffMs / 60000); // minutes
                // Check the statuse is defer
                let plannedinfustionValue = + medicationadministration.planneddosesize;
                let administredinfusionValue = +medicationadministration.administreddosesize;
                let maxdose = +medicationadministration.planneddosesizerangemax
                if (pslg.dosetype == "units") {
                    plannedinfustionValue = +medicationadministration.planneddosesize;
                    administredinfusionValue = +medicationadministration.administreddosesize;
                }
                else if (pslg.dosetype == "strength") {
                    plannedinfustionValue = +medicationadministration.plannedstrengthneumerator;
                    administredinfusionValue = +medicationadministration.administeredstrengthneumerator;
                }
                else {// for descriptive no need to compare
                    plannedinfustionValue = 0;
                    administredinfusionValue = 0;
                }

                if (medicationadministration.adminstrationstatus == "defer") {
                    this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Defered, title.Administration_Defered, true)
                }
                //-- if statuse notgiven
                else if (medicationadministration.adminstrationstatus == "notgiven") {
                    this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Failed, title.Administration_Failed, true)
                }
                // for prn cannot be late or early
                else if (pslg.prn) {
                    if (plannedinfustionValue == administredinfusionValue) {
                        this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, pslg.posology_id, pslg.prn, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                    }
                    else {
                        this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                    }

                }
                //-- if administed and statuse given or self given
                else {
                    //On time administered ---------------------------------------------------------------------------
                    if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                        /// if diffrentproduct is administer
                        if (medicationadministration.isdifferentproductadministered) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_Administered_Is_A_Different_Product_From_Prescribed, title.Dose_Administered_Is_A_Different_Product_From_Prescribed, true)
                        }
                        // cheching Dose administered is differnt from prescribed
                        else if (maxdose && maxdose > 0) {
                            if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                            }
                            else {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                            }
                        }
                        else if (plannedinfustionValue == administredinfusionValue) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                        }
                        else {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                        }
                    }
                    // early dose Administered ---------------------------------------------------------------------------
                    else if (diffMins <= -this.appService.bufferAdministered) {
                        //   cheching Administered early  but Dose administered early is differnt from prescribed
                        if (medicationadministration.isdifferentproductadministered) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_Administered_Early_Is_A_Different_Product_From_Prescribed, title.Dose_Administered_Early_Is_A_Different_Product_From_Prescribed, true)
                        }

                        else if (maxdose && maxdose > 0) {
                            if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Completed_early, title.Administration_Completed_early, true)
                            }
                            else {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_early_is_differnt_from_prescribed, title.Dose_administered_early_is_differnt_from_prescribed, true)
                            }
                        }
                        else if (plannedinfustionValue == administredinfusionValue) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Completed_early, title.Administration_Completed_early, true)
                        }
                        else {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_early_is_differnt_from_prescribed, title.Dose_administered_early_is_differnt_from_prescribed, true)
                        }
                    }

                    // late dose Administered -----------------------------------------------------------------------------
                    else if (diffMins >= -this.appService.bufferAdministered) {
                        if (medicationadministration.isdifferentproductadministered) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_Administered_Late_Is_A_Different_Product_From_Prescribed, title.Dose_Administered_Late_Is_A_Different_Product_From_Prescribed, true)
                        }

                        //   cheching Administered early  but Dose administered early is differnt from prescribed
                        else if (maxdose && maxdose > 0) {
                            if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Completed_late, title.Administration_Completed_late, true)
                            }
                            else {
                                this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_late_is_differnt_from_prescribed, title.Dose_administered_late_is_differnt_from_prescribed, true)
                            }
                        }
                        else if (plannedinfustionValue == administredinfusionValue) {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Administration_Completed_late, title.Administration_Completed_late, true)
                        }
                        else {
                            this.addevents(pslg.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, pslg.posology_id, pslg.prn, false, false, false, contents.Dose_administered_late_is_differnt_from_prescribed, title.Dose_administered_late_is_differnt_from_prescribed, true)
                        }
                    }
                }
            }
        }
    }

    addAdministeredEventForDeletedPSLG(medicationadministration: Medicationadministration) {

        if (moment(this.minEventDate) < moment(medicationadministration.administrationstartime)) {
            // if (true) {
            let plannedtime = new Date(moment(medicationadministration.planneddatetime, moment.ISO_8601).toString());
            let administeredtime = new Date(moment(medicationadministration.administrationstartime, moment.ISO_8601).toString());

            let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
            let diffMins = Math.round(diffMs / 60000); // minutes
            // Check the statuse is defer
            let plannedinfustionValue = + medicationadministration.planneddosesize;
            let administredinfusionValue = +medicationadministration.administreddosesize;
            let maxdose = +medicationadministration.planneddosesizerangemax

            if (plannedinfustionValue == 0) {
                plannedinfustionValue = +medicationadministration.plannedstrengthneumerator;
                administredinfusionValue = +medicationadministration.administeredstrengthneumerator;
            }
            else {// for descriptive no need to compare
                plannedinfustionValue = 0;
                administredinfusionValue = 0;
            }

            if (medicationadministration.adminstrationstatus == "defer") {
                this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                    null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Defered, title.Administration_Defered, true)
            }
            //-- if statuse notgiven
            else if (medicationadministration.adminstrationstatus == "notgiven") {
                this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                    null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Failed, title.Administration_Failed, true)
            }
            // for prn cannot be late or early
            else if (false) {
                if (plannedinfustionValue == administredinfusionValue) {
                    this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        null, medicationadministration.posology_id, false, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                }
                else {
                    this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                }

            }
            //-- if administed and statuse given or self given
            else {
                //On time administered ---------------------------------------------------------------------------
                if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                    // cheching Dose administered is differnt from prescribed
                    if (maxdose && maxdose > 0) {
                        if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                        }
                        else {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                        }
                    }
                    else if (plannedinfustionValue == administredinfusionValue) {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Completed_Administration, title.Completed_Administration, true)
                    }
                    else {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_is_differnt_from_prescribed, title.Dose_administered_is_differnt_from_prescribed, true)
                    }
                }
                // early dose Administered ---------------------------------------------------------------------------
                else if (diffMins <= -this.appService.bufferAdministered) {
                    //   cheching Administered early  but Dose administered early is differnt from prescribed
                    if (maxdose && maxdose > 0) {
                        if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Completed_early, title.Administration_Completed_early, true)
                        }
                        else {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_early_is_differnt_from_prescribed, title.Dose_administered_early_is_differnt_from_prescribed, true)
                        }
                    }
                    else if (plannedinfustionValue == administredinfusionValue) {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Completed_early, title.Administration_Completed_early, true)
                    }
                    else {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_early_is_differnt_from_prescribed, title.Dose_administered_early_is_differnt_from_prescribed, true)
                    }
                }

                // late dose Administered -----------------------------------------------------------------------------
                else if (diffMins >= -this.appService.bufferAdministered) {
                    //   cheching Administered early  but Dose administered early is differnt from prescribed
                    if (maxdose && maxdose > 0) {
                        if (administredinfusionValue >= plannedinfustionValue && maxdose >= administredinfusionValue) {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Completed_late, title.Administration_Completed_late, true)
                        }
                        else {
                            this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_late_is_differnt_from_prescribed, title.Dose_administered_late_is_differnt_from_prescribed, true)
                        }
                    }
                    else if (plannedinfustionValue == administredinfusionValue) {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Administration_Completed_late, title.Administration_Completed_late, true)
                    }
                    else {
                        this.addevents(medicationadministration.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                            null, medicationadministration.posology_id, false, false, false, false, contents.Dose_administered_late_is_differnt_from_prescribed, title.Dose_administered_late_is_differnt_from_prescribed, true)
                    }
                }
            }
        }

    }

    addevents(prescription_id: any, dose_id: any, eventStart: any, eventEnd: any, posology_id: any, prn: boolean, iscancel: boolean,
        doctorsorder: boolean, isinfusion: boolean, content: any, title: string, admitdone = false) {
        let titration = this.appService.Prescription.find(x => x.prescription_id == prescription_id).titration;
        let opacityclass = "";
        if (eventEnd == null) {
            opacityclass = this.iseventinpatientaway(moment(eventStart));
        }
        if (this.isreportevents) {
            this.appService.reportData.push({
                prescription_id: prescription_id,
                posology_id: posology_id,
                dose_id: dose_id,
                eventStart: moment(eventStart),
                eventEnd: eventEnd,
                prn: prn,
                iscancel: iscancel,
                doctorsorder: doctorsorder,
                isinfusion: isinfusion,
                content: content,
                title: title,
                admitdone: admitdone,
                titration: titration
            }

            )
        }
        else {
            this.appService.events.push({
                prescription_id: prescription_id,
                posology_id: posology_id,
                dose_id: dose_id,
                eventStart: moment(eventStart),
                eventEnd: eventEnd,
                prn: prn,
                iscancel: iscancel,
                doctorsorder: doctorsorder,
                isinfusion: isinfusion,
                content: content,
                title: title,
                admitdone: admitdone,
                opacityclass: opacityclass,
                diffrence: 0,
                stackclass: false
            }

            )

        }
    }

    iseventinpatientaway(eventdate: any) {
        let iseventInaway = false;
        for (let x of this.appService.PersonAwayPeriod) {
            if (x.isenabled) {
                let sdate = moment(x.awayfrom);
                let edate = moment(x.awayto);
                if (moment(eventdate).isBetween(sdate, edate, undefined, '[]')) {
                    iseventInaway = true;
                    break;
                }
            }
        }
        if (iseventInaway) {
            return " addopacity";
        }
        else {
            return "";
        }
    }

    createLogicalId(dosedate: any, dose_id: any) {
        let logicalid = moment(dosedate).format('YYYYMMDDHHmm') + "_" + dose_id.toString();
        return logicalid;
    }



    makeId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }



    addInfutionEvent(prescription: Prescription, pslg: Posology) {


        // let infutionlist = this.appService.Dose.filter(x => x.prescription_id == prescription.prescription_id && x.continuityid == null);


        let infutionlist = pslg.__dose.filter(x => x.continuityid == null);

        this.PlotNonDoseAdminsterEvensForCI(prescription);

        for (let dose of infutionlist) {
            let allDoses = pslg.__dose.filter(x => x.continuityid == dose.dose_id);
            allDoses.sort((b, a) => new Date(b.dosestartdatetime).getTime() - new Date(a.dosestartdatetime).getTime());
            this.createAdmiseredInfusionEvents(prescription, dose, allDoses);


            this.createInfusioniEvents(prescription, pslg, dose, allDoses);



        }




    }


    createInfusioniEvents(prescription: Prescription, pslg: Posology, startDose: Dose, allDoses: any) {


        let daystoplot = JSON.parse(pslg.daysofweek);

        let EndDosetime: any;

        if (prescription.linkedinfusionid) {
            let linkedinfusion = this.appService.Prescription.find(x => x.prescription_id == prescription.linkedinfusionid)
            if (!this.appService.InfusionEvents.find(x => x.posology_id == linkedinfusion.__posology[0].posology_id && x.eventtype == "endinfusion")) {
                return;
            }
        }
        if (allDoses.length > 0) {
            EndDosetime = allDoses[allDoses.length - 1].doseenddatatime;
        }
        else {
            EndDosetime = startDose.doseenddatatime;
        }

        let startDosetime = moment(startDose.dosestartdatetime);



        let enddate = moment(pslg.prescriptionenddate)
        if (moment(enddate, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {
            this.MaxEventDate = moment(pslg.prescriptionenddate);

        }
        if (this.prescriptionStatus == "suspended" || this.prescriptionStatus == "stopped" || this.prescriptionStatus == "cancelled") {
            this.MaxEventDate = moment(prescription.lastmodifiedon)


            let futureTransferevent = this.appService.DoseEvents.filter(x => x.dose_id == startDose.dose_id && x.posology_id == pslg.posology_id && (moment(x.startdatetime).isSameOrAfter(moment(prescription.lastmodifiedon)) &&
                (moment(x.dosedatetime).isSameOrBefore(moment(prescription.lastmodifiedon)))));

            for (let k of futureTransferevent) {
                if (prescription.__posology.find(x => x.posology_id == k.posology_id)) {
                    if (moment(this.MaxEventDate).isBefore(moment(k.startdatetime))) {
                        this.MaxEventDate = moment(k.startdatetime);
                    }
                }
            }
        }
        else {

            let futureTransferevent = this.appService.DoseEvents.filter(x => x.dose_id == startDose.dose_id && x.posology_id == pslg.posology_id && (moment(x.startdatetime).isSameOrAfter(moment(pslg.prescriptionenddate)) &&
                (moment(x.dosedatetime).isSameOrBefore(moment(pslg.prescriptionenddate)))));

            for (let k of futureTransferevent) {
                if (prescription.__posology.find(x => x.posology_id == k.posology_id)) {
                    if (moment(this.MaxEventDate).isBefore(moment(k.startdatetime))) {
                        this.MaxEventDate = moment(k.startdatetime);
                    }
                }
            }
        }
        // if ( =="ci" ||
        // this.appService.Prescription.find(p=>p.prescription_id == prescription.prescription_id).__posology.find(po=>po.posology_id==pslg.posology_id).infusiontypeid =="rate" && 
        // this.appService.Prescription.find(p=>p.prescription_id == prescription.prescription_id).__posology.find(po=>po.posology_id==pslg.posology_id).infusiontypeid =="variable"
        // ) {
        //     this.MaxEventDate = moment().add(8, 'days');
        // }



        let repeatDays = 0;
        while (moment(startDosetime, "MM/DD/YYYY ") <= moment(this.MaxEventDate, "MM/DD/YYYY")) {

            if (daystoplot.indexOf(moment(startDosetime).format('dddd')) > -1 || daystoplot.length == 0) {
                //no need to add days in the choose array
            }
            else {
                startDosetime = moment(startDosetime).add(1, 'd');
                EndDosetime = moment(EndDosetime).add(1, 'd');
                continue;
            }

            if (startDosetime >= moment(pslg.prescriptionstartdate)) {
                if ((pslg.infusiontypeid == 'ci' || pslg.infusiontypeid == InfusionType.pca) || (moment(this.minEventDate, "MM/DD/YYYY") < moment(startDosetime, "MM/DD/YYYY"))) {



                    let startFlowrate = startDose.infusionrate;
                    const logicalId = this.createLogicalId(startDosetime, startDose.dose_id);
                    let administeredevent = this.appService.Medicationadministration.find(x => x.logicalid == "start_" + logicalId && x.dose_id == startDose.dose_id);

                    if (administeredevent && administeredevent.adminstrationstatus == "notgiven") {
                        repeatDays++;
                        if (pslg.prescriptionenddate == EndDosetime) {
                            // more then 24 hource so no repete and breck
                            break;
                        }
                        startDosetime = moment(startDosetime).add(1, 'd');
                        EndDosetime = moment(EndDosetime).add(1, 'd');
                        continue;
                    }


                    let plotstartDosetime = moment(startDosetime);
                    let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "start_" + logicalId && x.eventtype == "Transfer");
                    if (dosetransferDate) {
                        plotstartDosetime = moment(dosetransferDate.dosedatetime);
                        if (moment(pslg.prescriptionenddate) <= plotstartDosetime) {
                            break;
                        }
                    }
                    ///Infution trans or not if cancel 
                    let isdoseCancle = false;
                    const logicalId_1 = this.createLogicalId(startDosetime, startDose.dose_id);
                    if (this.appService.DoseEvents.filter(x => x.logicalid == "start_" + logicalId_1).length > 0) {
                        isdoseCancle = this.appService.DoseEvents.filter(x => x.logicalid == "start_" + logicalId_1)[0].eventtype == "Cancel" ? true : false;
                    }
                    if (isdoseCancle) {

                        this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime, null, pslg.posology_id, false,
                            isdoseCancle, false, true, contents.Administration_withheld_by_doctor_Infution, title.Administration_withheld_by_doctor_Infution)
                        if (pslg.prescriptionenddate == EndDosetime) {
                            // more then 24 hource so no repete and breck
                            break;
                        }
                        startDosetime = moment(startDosetime).add(1, 'd');
                        EndDosetime = moment(EndDosetime).add(1, 'd');
                        continue;
                    }

                    let diffMins = this.getTimeDiff(plotstartDosetime);
                    const logicalId_2 = this.createLogicalId(startDosetime, startDose.dose_id);
                    dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "start_" + logicalId_2 && x.eventtype == "AdminTransfer");
                    if (dosetransferDate) {
                        plotstartDosetime = moment(dosetransferDate.dosedatetime);
                    }
                    if (administeredevent && prescription.infusiontype_id == "bolus") {

                        startDosetime = moment(startDosetime).add(1, 'd');
                        EndDosetime = moment(EndDosetime).add(1, 'd');
                        continue;
                    }
                    //Flow rate for start node
                    if (!administeredevent && prescription.infusiontype_id != "bolus" && this.prescriptionStatus != "stopped") {
                        let doserate = startDose.infusiondoserate == null ? startDose.infusionrate + " " + pslg.infusionrateunits : startDose.infusiondoserate + " " + startDose.infusiondoserateunits;
                        this.addevents(startDose.prescription_id, "flowrate_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                            null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + doserate

                        + "</div>", "")
                    }
                    /////////////////////////
                    if (administeredevent && this.prescriptionStatus != "suspended" && this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {
                        let startcount = this.appService.InfusionEvents.filter(x => x.posology_id == pslg.posology_id && x.eventtype == "administered").length -
                            this.appService.InfusionEvents.filter(x => x.posology_id == pslg.posology_id && x.eventtype == "endinfusion").length
                        if (startcount >= 1) {
                            this.addevents(prescription.prescription_id, "infusionevent" + prescription.prescription_id, new Date(), null, pslg.posology_id, pslg.prn,
                                false, false, false, contents.Recordadditionaladministration, title.Recordadditionaladministration)
                            this.PRNids.push("infusionevent" + prescription.prescription_id);
                        }


                        this.addevents(startDose.prescription_id, "flowrate_" + this.createLogicalId(startDosetime, startDose.dose_id), moment(administeredevent.administrationstartime),
                            null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + administeredevent.administredinfusionrate + " " +
                            pslg.infusionrateunits
                        + "</div>", "")
                    }
                    else {
                        if (!administeredevent) {

                            if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                                this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                    null, startDose.posology_id, false, false, false, true, contents.Infusiondue, title.Infusiondue)
                            }
                            else if (diffMins <= -this.bufferambertime) {
                                this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                    null, startDose.posology_id, false, false, false, true, contents.InfusionLate, title.InfusionLate)
                            }
                            else if (diffMins >= this.bufferambertime) {
                                this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                    null, startDose.posology_id, false, false, false, true, contents.Infusionplanned, title.Infusionplanned)
                            }
                        }

                    }

                    let plotEndDosetime = moment(EndDosetime);
                    const logicalId_3 = this.createLogicalId(EndDosetime, startDose.dose_id);
                    let dosetransferDateend = this.appService.DoseEvents.find(x => x.logicalid == "end_" + logicalId_3 && x.eventtype == "Transfer");
                    if (dosetransferDateend) {
                        plotEndDosetime = moment(dosetransferDateend.dosedatetime);
                    }
                    // admin transfer override transfer
                    const logicalId_4 = this.createLogicalId(EndDosetime, startDose.dose_id);
                    dosetransferDateend = this.appService.DoseEvents.find(x => x.logicalid == "end_" + logicalId_4 && x.eventtype == "AdminTransfer");
                    if (dosetransferDateend) {
                        plotEndDosetime = moment(dosetransferDateend.dosedatetime);
                    }


                    diffMins = this.getTimeDiff(plotEndDosetime);
                    if (prescription.infusiontype_id != "bolus") {
                        const logicalId_5 = this.createLogicalId(EndDosetime, startDose.dose_id);
                        let infusionEndEvent = this.appService.InfusionEvents.find(x => x.logicalid == "end_" + logicalId_5 && x.eventtype == "endinfusion")
                        if (EndDosetime) {
                            ////////////////////////
                            // if infusion is comlete

                            if (pslg.infusiontypeid != 'ci' && pslg.infusiontypeid != InfusionType.pca && infusionEndEvent) {
                                let plannedtime = new Date(moment(infusionEndEvent.planneddatetime, moment.ISO_8601).toString());
                                let administeredtime = new Date(moment(infusionEndEvent.eventdatetime, moment.ISO_8601).toString());

                                let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
                                let diffMins = Math.round(diffMs / 60000); // minutes
                                if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                                    this.addevents(prescription.prescription_id, infusionEndEvent.logicalid, infusionEndEvent.eventdatetime,
                                        null, infusionEndEvent.posology_id, false, false, false, true, contents.InfusionCompleteddone, title.InfusionCompleteddone, true)
                                }
                                else if (diffMins >= this.appService.bufferAdministered) {
                                    this.addevents(prescription.prescription_id, infusionEndEvent.logicalid, infusionEndEvent.eventdatetime,
                                        null, infusionEndEvent.posology_id, false, false, false, true, contents.InfusionCompletedLate2, title.InfusionCompletedLate2, true)
                                }
                                else if (diffMins <= -this.appService.bufferAdministered) {
                                    this.addevents(prescription.prescription_id, infusionEndEvent.logicalid, infusionEndEvent.eventdatetime,
                                        null, infusionEndEvent.posology_id, false, false, false, true, contents.InfusionCompletedEarly2, title.InfusionCompletedEarly2, true)
                                }
                            }

                            // if infusion is not comlete
                            else if ((pslg.infusiontypeid != 'ci' && pslg.infusiontypeid != InfusionType.pca) || (this.prescriptionStatus != "suspended" && this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled")) {
                                if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.InfusionCompletiondue, title.InfusionCompletiondue)
                                }
                                else if (diffMins <= -this.bufferambertime) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.InfusionCompleteoverdue, title.InfusionCompleteoverdue)
                                }
                                else if (diffMins >= this.bufferambertime) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.Infusioncompletionplanned, title.Infusioncompletionplanned)
                                }
                            }
                        }

                        if (EndDosetime == null && pslg.prescriptionenddate == null && (pslg.infusiontypeid == 'ci' || pslg.infusiontypeid == InfusionType.pca)) {
                            let enddate = this.MaxEventDate;
                            if (infusionEndEvent) {
                                enddate = infusionEndEvent.eventdatetime;

                            }
                            if (this.prescriptionStatus == "suspended" || this.prescriptionStatus == "stopped" || this.prescriptionStatus == "cancelled") {

                                let infusionEndEvent = this.appService.InfusionEvents.find(x => x.posology_id == pslg.posology_id && x.eventtype == "endinfusion")
                                if (infusionEndEvent) {
                                    enddate = moment(infusionEndEvent.eventdatetime);
                                } else {
                                    enddate = moment(prescription.lastmodifiedon);
                                }
                            }
                            // else if () {
                            //     enddate = moment(prescription.lastmodifiedon);
                            //     // this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), enddate,
                            //     //     null, startDose.posology_id, false, false, false, true, contents.InfusionCompleteddone)

                            //     //     this.addevents(startDose.prescription_id, "dur" + startDose.prescription_id, plotstartDosetime,
                            //     //     enddate, startDose.posology_id, false, false, false, true, contents.durationline)

                            // }
                            if (administeredevent) {
                                this.addevents(startDose.prescription_id, "dur" + startDose.prescription_id, moment(administeredevent.administrationstartime),
                                    enddate, startDose.posology_id, false, false, false, true, contents.durationline, "")

                            }
                            else {
                                this.addevents(startDose.prescription_id, "dur" + startDose.prescription_id, plotstartDosetime,
                                    enddate, startDose.posology_id, false, false, false, true, contents.durationline, "")

                            }
                        }
                        else {
                            let durationEnd = plotEndDosetime
                            if (infusionEndEvent) {
                                durationEnd = infusionEndEvent.eventdatetime;
                            }
                            if ((pslg.infusiontypeid == 'ci' || pslg.infusiontypeid == InfusionType.pca) && (this.prescriptionStatus == "suspended" || this.prescriptionStatus == "stopped" || this.prescriptionStatus == "cancelled")) {
                                durationEnd = moment(prescription.lastmodifiedon);
                            }
                            if (infusionEndEvent && (pslg.infusiontypeid == 'ci' || pslg.infusiontypeid == InfusionType.pca) && (this.prescriptionStatus == "suspended" || this.prescriptionStatus == "stopped" || this.prescriptionStatus == "cancelled")) {
                                durationEnd = infusionEndEvent.eventdatetime;
                            }

                            if (administeredevent) {
                                this.addevents(startDose.prescription_id, "dur" + this.createLogicalId(startDosetime, startDose.dose_id), moment(administeredevent.administrationstartime),
                                    durationEnd, startDose.posology_id, false, false, false, true, contents.durationline, "")
                            }
                            else {
                                this.addevents(startDose.prescription_id, "dur" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                    durationEnd, startDose.posology_id, false, false, false, true, contents.durationline, "")
                            }
                        }

                    }
                }
            }
            if (startDosetime >= moment(pslg.prescriptionstartdate)) {
                this.PloteFutureFlowRateChange(pslg, startDose, allDoses, repeatDays);
            }
            repeatDays++;
            if (pslg.prescriptionenddate == EndDosetime) {
                // more then 24 hource so no repete and breck
                break;
            }
            if (pslg.infusiontypeid == "rate" && pslg.frequency == "stat") {
                break;
            }
            if (pslg.dosingdaysfrequencysize == 0) {
                startDosetime = moment(startDosetime).add(1, 'd');
                EndDosetime = moment(EndDosetime).add(1, 'd');
            }
            else {
                if (pslg.dosingdaysfrequency == "days") {

                    startDosetime = moment(startDosetime).add(pslg.dosingdaysfrequencysize, 'd');
                    EndDosetime = moment(EndDosetime).add(pslg.dosingdaysfrequencysize, 'd');
                }
                else if (pslg.dosingdaysfrequency == "weeks") {

                    startDosetime = moment(startDosetime).add(pslg.dosingdaysfrequencysize, 'w');
                    EndDosetime = moment(EndDosetime).add(pslg.dosingdaysfrequencysize, 'w');
                }
                else if (pslg.dosingdaysfrequency == "months") {

                    startDosetime = moment(startDosetime).add(pslg.dosingdaysfrequencysize, 'M');
                    EndDosetime = moment(EndDosetime).add(pslg.dosingdaysfrequencysize, 'M');
                }

            }

        }

        /////////////////////////////////////

        /////////////////////////////////


    }

    PloteFutureFlowRateChange(pslg: Posology, startDose: Dose, allDoses: any, repeatDays: any) {
        const logicalId = this.createLogicalId(moment(startDose.dosestartdatetime), startDose.dose_id);
        let administeredevent = this.appService.Medicationadministration.find(x => x.logicalid == "start_" + logicalId && x.dose_id == startDose.dose_id);

        if (administeredevent && administeredevent.adminstrationstatus == "defer") {
            return;
        }
        let firstDosetime = moment(startDose.dosestartdatetime).add(repeatDays, 'd');
        let currentFlowRate = startDose.infusionrate;
        const logicalId_1 = this.createLogicalId(firstDosetime, startDose.dose_id)
        let startFlowRateAdministered = this.appService.Medicationadministration.find(x => x.logicalid == "start_" + logicalId_1);
        if (startFlowRateAdministered) {
            currentFlowRate = startFlowRateAdministered.administredinfusionrate;
        }
        let allinfusion = this.appService.InfusionEvents.filter(x => x.posology_id == startDose.posology_id && (x.eventtype == "adjust" || x.eventtype == "restart" || x.eventtype == "administered"));
        allinfusion.sort((a, b) => b._sequenceid - a._sequenceid);
        if (allinfusion.length > 0 && (allinfusion[0].eventtype == "adjust" || allinfusion[0].eventtype == "restart")) {
            currentFlowRate = this.appService.Medicationadministration.find(x => x.logicalid == allinfusion[0].logicalid).administredinfusionrate;
        }
        // while (repeatDays > 0) {
        for (let dose of allDoses) {

            let startDosetime = moment(dose.dosestartdatetime);
            let originalStarttime = moment(startDosetime);
            const logicalId_2 = this.createLogicalId(originalStarttime, dose.dose_id);
            let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "adjust_" + logicalId_2 && x.eventtype == "Transfer");
            if (dosetransferDate) {
                startDosetime = moment(dosetransferDate.dosedatetime);
            }
            //if there is admin transfer there override transfer
            const logicalId_3 = this.createLogicalId(originalStarttime, dose.dose_id);
            dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "adjust_" + logicalId_3 && x.eventtype == "AdminTransfer");
            if (dosetransferDate) {
                startDosetime = moment(dosetransferDate.dosedatetime);
            }
            startDosetime = moment(startDosetime).add(repeatDays, 'd');

            let diffMins = this.getTimeDiff(startDosetime);
            const logicalId_4 = this.createLogicalId(originalStarttime, dose.dose_id);
            let administeredevent = this.appService.Medicationadministration.find(x => x.logicalid == "adjust_" + logicalId_4 && x.dose_id == dose.dose_id);
            //////////////////////////////
            if (administeredevent) {

                this.addevents(dose.prescription_id, "flowrate_" + this.createLogicalId(originalStarttime, dose.dose_id), moment(administeredevent.administrationstartime),
                    null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + administeredevent.administredinfusionrate + " " +
                    pslg.infusionrateunits
                + "</div>", "")
                currentFlowRate = administeredevent.administredinfusionrate;
                continue;
            }
            else {

                this.addevents(dose.prescription_id, "flowrate_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                    null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + dose.infusiondoserate + " " +
                    dose.infusiondoserateunits
                + "</div>", "")
            }
            ////////////////////////////
            if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Due, title.Maintain_Infusion_Rate_Due)
                } else if (currentFlowRate < dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRateDue, title.IncreaseInfusionRateDue)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRateDue, title.DecreaseInfusionRateDue)
                }
                currentFlowRate = dose.infusionrate;
            }
            else if (diffMins <= -this.bufferambertime) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Late, title.Maintain_Infusion_Rate_Late)
                } else if (currentFlowRate < dose.infusionrate) {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRateLate, title.IncreaseInfusionRateLate)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRateLate, title.DecreaseInfusionRateLate)
                }
                currentFlowRate = dose.infusionrate;
            }
            else if (diffMins >= this.bufferambertime) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Planned, title.Maintain_Infusion_Rate_Planned)
                } else if (currentFlowRate < dose.infusionrate) {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRatePlanned, title.IncreaseInfusionRatePlanned)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRatePlanned, title.DecreaseInfusionRatePlanned)
                }
                currentFlowRate = dose.infusionrate;
            }



            // }
            // repeatDays--;
        }
    }
    PlotNonDoseAdminsterEvensForCI(prescription: Prescription) {
        if ((prescription.__posology[0].infusiontypeid == 'ci' || prescription.__posology[0].infusiontypeid == InfusionType.pca) && (this.prescriptionStatus == "suspended" || this.prescriptionStatus == "stopped" || this.prescriptionStatus == "cancelled")) {
            let administeredevent = this.appService.Medicationadministration.find(x => x.prescription_id == prescription.prescription_id && x.logicalid.startsWith("start_"));

            if (administeredevent && administeredevent.adminstrationstatus == "notgiven") {
                return;
            }
        }

        let allNonAdministeredEvent = this.appService.InfusionEvents.filter(x => x.posology_id == this.appService.GetCurrentPosology(prescription).posology_id &&
            (x.eventtype == "pause" || x.eventtype == "bolus" || x.eventtype == "changeinfusionset" || x.eventtype == "changeinfusionkit" || x.eventtype == "endinfusion" || x.eventtype == "endinfusion_planned"))
        for (let infusionevent of allNonAdministeredEvent) {
            if (infusionevent.eventtype == "bolus") {
                this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                    null, infusionevent.posology_id, false, false, false, true, contents.BolusAdministrationCompleted, title.BolusAdministrationCompleted, true)
            }
            if (infusionevent.eventtype == "pause") {
                this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                    null, infusionevent.posology_id, false, false, false, true, contents.InfusionRatePaused, title.InfusionRatePaused, true)
            }
            else if (infusionevent.eventtype == "changeinfusionset") {
                this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                    null, infusionevent.posology_id, false, false, false, true, contents.ContinuousInfusionSetChanged, title.ContinuousInfusionSetChanged, true)
            }
            else if (infusionevent.eventtype == "changeinfusionkit") {
                this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                    null, infusionevent.posology_id, false, false, false, true, contents.Continuousinfusionsyringeorbagchange, title.Continuousinfusionsyringeorbagchange, true)
            }

            else if (infusionevent.eventtype == "endinfusion_planned") {

                let plannedtime = new Date(moment(infusionevent.planneddatetime, moment.ISO_8601).toString());
                let administeredtime = new Date(moment(infusionevent.eventdatetime, moment.ISO_8601).toString());

                let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
                let diffMins = this.getTimeDiff(infusionevent.eventdatetime); // minutes

                if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.InfusionCompletiondue, title.InfusionCompletiondue, false)
                }
                else if (diffMins >= this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.Infusioncompletionplanned, title.Infusioncompletionplanned, false)
                }
                else if (diffMins <= -this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.InfusionCompleteoverdue, title.InfusionCompleteoverdue, false)
                }
            }
            else if (infusionevent.eventtype == "endinfusion") {
                let plannedtime = new Date(moment(infusionevent.planneddatetime, moment.ISO_8601).toString());
                let administeredtime = new Date(moment(infusionevent.eventdatetime, moment.ISO_8601).toString());

                let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
                let diffMins = Math.round(diffMs / 60000); // minutes
                if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.InfusionCompleteddone, title.InfusionCompleteddone, true)
                }
                else if (diffMins >= this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.InfusionCompletedLate2, title.InfusionCompletedLate2, true)
                }
                else if (diffMins <= -this.appService.bufferAdministered) {
                    this.addevents(prescription.prescription_id, infusionevent.logicalid, infusionevent.eventdatetime,
                        null, infusionevent.posology_id, false, false, false, true, contents.InfusionCompletedEarly2, title.InfusionCompletedEarly2, true)
                }
            }

        }


    }
    // if (diffMins > -this.bufferambertime && diffMins < this.bufferambertime) {
    //     this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
    //         null, startDose.posology_id, false, false, false, true, contents.InfusionCompletiondue)
    // }
    // else if (diffMins <= -this.bufferambertime) {
    //     this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
    //         null, startDose.posology_id, false, false, false, true, contents.InfusionCompleteoverdue)
    // }
    // else if (diffMins >= this.bufferambertime) {
    //     this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
    //         null, startDose.posology_id, false, false, false, true, contents.Infusioncompletionplanned)
    // }
    createAdmiseredInfusionEvents(prescription: Prescription, startDose: Dose, allDoses: any) {
        let allAdministered = this.appService.Medicationadministration.filter(x => x.prescription_id == prescription.prescription_id);
        allAdministered.sort((b, a) => new Date(b.administrationstartime).getTime() - new Date(a.administrationstartime).getTime());
        let currentFlowRate = 0;
        // non adminster like pause change bag or cancled event

        for (let medicationadministration of allAdministered) {
            if (medicationadministration.isenterinerror) {
                this.addevents(prescription.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                    null, medicationadministration.posology_id, false, false, false, false, contents.EnterInErrorbolus, title.EnterInError, true)
                continue;
            }
            let plannedtime = new Date(moment(medicationadministration.planneddatetime, moment.ISO_8601).toString());
            let administeredtime = new Date(moment(medicationadministration.administrationstartime, moment.ISO_8601).toString());

            let plannedinfustionValue = + medicationadministration.plannedinfustionrate;
            let administredinfusionValue = +medicationadministration.administredinfusionrate;

            if (prescription.__posology.find(x => x.posology_id == medicationadministration.posology_id).infusiontypeid == "bolus") {
                if (prescription.__posology.find(x => x.posology_id == medicationadministration.posology_id).dosetype == "units") {
                    plannedinfustionValue = +medicationadministration.planneddosesize;
                    administredinfusionValue = +medicationadministration.administreddosesize;
                }
                else if (prescription.__posology.find(x => x.posology_id == medicationadministration.posology_id).dosetype == "strength") {
                    plannedinfustionValue = +medicationadministration.plannedstrengthneumerator;
                    administredinfusionValue = +medicationadministration.administeredstrengthneumerator;
                }
                else {// for descriptive no need to compare
                    plannedinfustionValue = 0;
                    administredinfusionValue = 0;
                }
            }
            let diffMs = (administeredtime.valueOf() - plannedtime.valueOf());
            let diffMins = Math.round(diffMs / 60000); // minutes



            if (medicationadministration.adminstrationstatus == "notgiven") {
                this.addevents(prescription.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                    null, medicationadministration.posology_id, false, false, false, true, contents.AdministrationInfution_Failed, title.AdministrationInfution_Failed, true)
            }
            else {
                let TempEventtype = this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype;
                if (TempEventtype == "adjust" || TempEventtype == "restart") {

                    this.addevents(startDose.prescription_id, "flowrate_" + this.createLogicalId(medicationadministration.administrationstartime, medicationadministration.dose_id), medicationadministration.administrationstartime,
                        null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + medicationadministration.administredinfusionrate + " " +
                        prescription.__posology.find(x => x.posology_id == medicationadministration.posology_id).infusionrateunits
                    + "</div>", "")

                }
                // this.addevents(startDose.prescription_id, "flowrate_" + medicationadministration.logicalid, medicationadministration.administrationstartime,
                //     null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + medicationadministration.administredinfusionrate + " ml/h</div>")
                // on time administration
                if (diffMins > -this.appService.bufferAdministered && diffMins < this.appService.bufferAdministered) {
                    // cheching Dose administered is differnt from prescribed flow
                    if (plannedinfustionValue == administredinfusionValue) {
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, startDose.posology_id, false, false, false, true, contents.Infusiondone, title.Infusiondone, true)
                            currentFlowRate = administredinfusionValue;

                        }

                        else {
                            if (currentFlowRate > administredinfusionValue) {
                                if (medicationadministration.isinfusionkitchange) {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.Adjusted_Decrease_Infusion_Rate_Done_Kit_Change, title.Adjusted_Decrease_Infusion_Rate_Done_Kit_Change, true)
                                }

                                else {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRatedone, title.DecreaseInfusionRatedone, true)
                                }
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                if (medicationadministration.isinfusionkitchange) {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.Adjusted_Increase_Infusion_Rate_Done_Kit_Change, title.Adjusted_Increase_Infusion_Rate_Done_Kit_Change, true)
                                }

                                else {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRatedone, title.IncreaseInfusionRatedone, true)
                                }
                            }
                            else if (currentFlowRate == administredinfusionValue) {

                                if (medicationadministration.isinfusionkitchange) {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.Adjusted_Maintain_Infusion_Rate_Done_Kit_Change, title.Adjusted_Maintain_Infusion_Rate_Done_Kit_Change, true)
                                }

                                else {
                                    this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_done, title.Maintain_Infusion_Rate_done, true)
                                }
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }
                    else {

                        // events Dulta sign
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            if (plannedinfustionValue < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedone, title.AdjustedIncreaseInfusionRatedone, true)
                            }
                            else {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedone, title.AdjustedDecreaseInfusionRatedone, true)
                            }
                            currentFlowRate = administredinfusionValue;
                        }

                        else {
                            //For Flow Changed event
                            if (currentFlowRate > administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedone, title.AdjustedDecreaseInfusionRatedone, true)
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedone, title.AdjustedIncreaseInfusionRatedone, true)
                            }
                            else if (currentFlowRate == administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedsameInfusionRatedone, title.AdjustedsameInfusionRatedone, true)//  Adjusted same Infusion Rate done this image need to change
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }

                }
                else if (diffMins >= this.appService.bufferAdministered) {

                    if (plannedinfustionValue == administredinfusionValue) {
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, startDose.posology_id, false, false, false, true, contents.InfusionCompletedLate, title.InfusionCompletedLate, true)
                            currentFlowRate = administredinfusionValue;
                        }
                        // else if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "bolus") {
                        //     this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        //         null, startDose.posology_id, false, false, false, true, contents.BolusAdministrationCompleted)
                        // }
                        else {
                            if (currentFlowRate > administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRatedonelate, title.DecreaseInfusionRatedonelate, true)
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRatedonelate, title.IncreaseInfusionRatedonelate, true)
                            }
                            else if (currentFlowRate == administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.MaintainInfusionRatedonelate, title.MaintainInfusionRatedonelate, true)// this image need to change
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }
                    else {

                        // events Dulta sign
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            if (plannedinfustionValue < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedonelate, title.AdjustedIncreaseInfusionRatedonelate, true)
                            }
                            else {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedonelate, title.AdjustedDecreaseInfusionRatedonelate, true)
                            }
                            currentFlowRate = administredinfusionValue;
                        }

                        else {// for flowchange delta
                            if (currentFlowRate > administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedonelate, title.AdjustedDecreaseInfusionRatedonelate, true)
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedonelate, title.AdjustedIncreaseInfusionRatedonelate, true)
                            }
                            else if (currentFlowRate == administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.FaliedtoAdjustInfusionRatedonelate, title.FaliedtoAdjustInfusionRatedonelate, true)// this image need to change
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }
                }


                else if (diffMins <= -this.appService.bufferAdministered) {
                    if (plannedinfustionValue == administredinfusionValue) {
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                null, startDose.posology_id, false, false, false, true, contents.InfusionCompletedEarly, title.InfusionCompletedEarly, true)
                            currentFlowRate = administredinfusionValue;
                        }
                        // else if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "bolus") {
                        //     this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                        //         null, startDose.posology_id, false, false, false, true, contents.BolusAdministrationCompleted)
                        // }
                        else {
                            if (currentFlowRate > administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRatedoneearly, title.DecreaseInfusionRatedoneearly, true)
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRatedoneearly, title.IncreaseInfusionRatedoneearly, true)
                            }
                            else if (currentFlowRate == administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.MaintainInfusionRatedoneearly, title.MaintainInfusionRatedoneearly, true)// this image need to change
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }
                    else {

                        // events Dulta sign
                        if (this.appService.InfusionEvents.find(x => x.logicalid == medicationadministration.logicalid).eventtype == "administered") {
                            if (plannedinfustionValue < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedoneearly, title.AdjustedIncreaseInfusionRatedoneearly, true)
                            }
                            else {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedoneearly, title.AdjustedDecreaseInfusionRatedoneearly, true)
                            }
                            currentFlowRate = administredinfusionValue;
                        }

                        else {// for flowchange delta
                            if (currentFlowRate > administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedDecreaseInfusionRatedoneearly, title.AdjustedDecreaseInfusionRatedoneearly, true)
                            }
                            else if (currentFlowRate < administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.AdjustedIncreaseInfusionRatedoneearly, title.AdjustedIncreaseInfusionRatedoneearly, true)
                            }
                            else if (currentFlowRate == administredinfusionValue) {
                                this.addevents(startDose.prescription_id, medicationadministration.logicalid, medicationadministration.administrationstartime,
                                    null, startDose.posology_id, false, false, false, true, contents.FaliedtoAdjustInfusionRatedoneearly, title.FaliedtoAdjustInfusionRatedoneearly, true)// this image need to change
                            }
                            currentFlowRate = administredinfusionValue;
                        }
                    }
                }

            }


        }
    }

    getTimeDiff(datetime: any) {
        let current = new Date(moment(new Date(), moment.ISO_8601).toString());
        let start = new Date(moment(datetime, moment.ISO_8601).toString());
        let diffMs = (start.valueOf() - current.valueOf());
        return Math.round(diffMs / 60000); // minutes
    }


}

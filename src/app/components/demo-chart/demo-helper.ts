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

import { contents, InfusionType } from "../../services/enum"
import { AppService } from "../../services/app.service"
import moment from 'moment';
import { Dose, Prescription } from '../../models/EPMA';

import { Subscription } from 'rxjs';





export class DemoHelper {
    prescriptionStatus: string = "";
    currentDate: any;
    minEventDate: any;
    MaxEventDate: any;
    subscriptions: Subscription = new Subscription();
    PRNids = new Array();
    PrescriptionFormEvent: any = [];
    isTempEvents: boolean
    currentprescription: Prescription;

    constructor(public appService: AppService) {



    }

    createPrescriptionFormEvent(prescription: Prescription) {
        this.PrescriptionFormEvent = [];

        if (prescription.__posology[0].prescriptionstartdate == null || prescription.__posology[0].prescriptionstartdate == "" || prescription.__posology[0].__dose.length == 0) {
            return this.PrescriptionFormEvent;
        }
        this.currentprescription = prescription
        this.isTempEvents = true;
        this.prescriptionStatus = "";
        // setting max and min event date 
        this.MaxEventDate = moment(this.currentDate).add(1, 'days');
        this.minEventDate = moment(this.currentDate).add(-1, 'days');
        this.MaxEventDate.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
        this.minEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

        if (prescription.prescriptionstatus_id != null && prescription.prescriptionstatus_id != "") {
            this.prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == prescription.prescriptionstatus_id).status;
        }
        if (prescription.__posology[0].prn) {

            this.addevents(prescription.prescription_id, prescription.__posology[0].__dose[0].dose_id, new Date(), null, prescription.__posology[0].posology_id, prescription.__posology[0].prn,
                false, false, false, contents.Administer_PRN)
            this.PRNids.push(prescription.__posology[0].__dose[0].dose_id);

        }
        else if (prescription.isinfusion) {
            if (this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {
                this.addInfutionEvent(prescription);
            }
        }
        else {
            let temp = this.appService.TimelineArray;
            this.currentDate = new Date();
            if (prescription.__posology[0].frequency == "protocol") {
                this.addProtocolEvents(prescription)
            }
            else {
                this.addLogicalEvent(prescription);
            }
        }
        let temp = this.PrescriptionFormEvent;
        this.PrescriptionFormEvent = Array.from(new Set(temp.map(a => a.dose_id)))
            .map(id => {
                return temp.find(a => a.dose_id === id)
            })

        return this.PrescriptionFormEvent;

    }


    addProtocolEvents(prescription: Prescription) {
        let repitTimes = prescription.__posology[0].repeatprotocoltimes;
        let minemumDate = new Date(Math.min.apply(null, prescription.__posology[0].__dose.map(function (e) {
            return new Date(e.dosestartdatetime);
        })));
        let maximumDate = new Date(Math.max.apply(null, prescription.__posology[0].__dose.map(function (e) {
            return new Date(e.dosestartdatetime);
        })));
        let dateDiff = 0;





        do {// to repete whole protocall 1 ti
            for (let dose of prescription.__posology[0].__dose) {
                if (moment(this.minEventDate) < moment(dose.dosestartdatetime) &&
                    moment(dose.dosestartdatetime) <= moment(this.MaxEventDate)) {
                    let ploteDate = moment(dose.dosestartdatetime)
                    ploteDate = moment(ploteDate).add(dateDiff, 'd');
                    if (!this.appService.Medicationadministration.find(x => x.logicalid == this.createLogicalId(ploteDate, dose.dose_id))) {
                        this.createLogicalevents(prescription, ploteDate, dose);
                    }

                }
            }
            dateDiff = dateDiff + moment(maximumDate).diff(moment(minemumDate), 'days') + 1;
            repitTimes = repitTimes - 1;
            if (repitTimes < 1) {
                break;
            }
        } while (!prescription.__posology[0].repeatlastday)
        ///////////////// loo end ////////////////////////
        // repeate only last day

        if (prescription.__posology[0].repeatlastday) {
            let dose = prescription.__posology[0].__dose[prescription.__posology[0].__dose.length - 1];
            let ploteDate = moment(dose.dosestartdatetime)
            let repeatlastdayuntil = moment(prescription.__posology[0].repeatlastdayuntil)
            if (moment(repeatlastdayuntil, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {
                this.MaxEventDate = moment(prescription.__posology[0].repeatlastdayuntil);
                this.MaxEventDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            }
            while (moment(ploteDate, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {


                ploteDate = moment(ploteDate).add(1, 'd');
                if (!this.appService.Medicationadministration.find(x => x.logicalid == this.createLogicalId(ploteDate, dose.dose_id))) {
                    this.createLogicalevents(prescription, ploteDate, dose);
                }



            }

        }



    }

    addLogicalEvent(prescription: Prescription) {
        let daystoplot = JSON.parse(prescription.__posology[0].daysofweek);
        for (let dose of prescription.__posology[0].__dose) {
            let ploteDate = moment(dose.dosestartdatetime);
            let enddate = moment(prescription.__posology[0].prescriptionenddate)
            if (moment(enddate, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {
                this.MaxEventDate = moment(prescription.__posology[0].prescriptionenddate);

            }
            if (dose.isadditionaladministration) {// if isadditional administration not need to loop till date
                if (!this.appService.Medicationadministration.find(x => x.logicalid == this.createLogicalId(ploteDate, dose.dose_id))) {
                    this.createLogicalevents(prescription, ploteDate, dose);
                }
            }
            else {
                while (moment(ploteDate, "MM/DD/YYYY HH") <= moment(this.MaxEventDate, "MM/DD/YYYY HH")) {
                    if (!this.appService.Medicationadministration.find(x => x.logicalid == this.createLogicalId(ploteDate, dose.dose_id))) {

                        if (daystoplot.indexOf(moment(ploteDate).format('dddd')) > -1 || daystoplot.length == 0) {
                            if (moment(this.minEventDate, "MM/DD/YYYY") < moment(ploteDate, "MM/DD/YYYY")) {
                                this.createLogicalevents(prescription, ploteDate, dose)
                            }
                        } else {
                            //Not in the array
                        }

                    }
                    if (prescription.__posology[0].dosingdaysfrequencysize == 0) {
                        ploteDate = moment(ploteDate).add(1, 'd');
                    }
                    else {
                        if (prescription.__posology[0].dosingdaysfrequency == "days") {
                            ploteDate = moment(ploteDate).add(prescription.__posology[0].dosingdaysfrequencysize + 1, 'd');
                        }
                        else if (prescription.__posology[0].dosingdaysfrequency == "weeks") {
                            ploteDate = moment(ploteDate).add(prescription.__posology[0].dosingdaysfrequencysize, 'w');
                        }
                        else if (prescription.__posology[0].dosingdaysfrequency == "months") {
                            ploteDate = moment(ploteDate).add(prescription.__posology[0].dosingdaysfrequencysize, 'M');
                        }

                    }
                }
            }
        }

    }
    createLogicalevents

        (prescription: Prescription, ploteDate: any, dose: Dose) {
        let logical_ID = this.createLogicalId(ploteDate, dose.dose_id)
        let posology = prescription.__posology[0];
        if (moment(posology.prescriptionstartdate) > moment(ploteDate)) {
            return;
        }
        let doseprescription = prescription;
        // Checking if dose required doctors or and also if doctor has not yet conform isdoctorsorderconfirmed shoud be false
        let isdoseCancle = false;
        let doctorcomporm = this.appService.DoseEvents.find(x => x.logicalid == logical_ID && x.eventtype == "doconfirm") ? true : false;
        let isTitrationDone = this.appService.DoseEvents.find(
            x => x.dose_id == null && x.eventtype == "titration" && x.posology_id == dose.posology_id &&
                (moment(x.titrateduntildatetime) >= moment(ploteDate) || x.titrateduntildatetime == null)) ? true : false;
        if (!isTitrationDone) {
            isTitrationDone = this.appService.DoseEvents.find(x => x.dose_id == dose.dose_id && x.eventtype == "titration" && x.logicalid == logical_ID && moment(x.titrateduntildatetime).format("YYYYMMDDHHmm") == moment(ploteDate).format("YYYYMMDDHHmm")) ? true : false;
        }
        if (this.appService.DoseEvents.filter(x => x.logicalid == logical_ID).length > 0) {
            isdoseCancle = this.appService.DoseEvents.filter(x => x.logicalid == logical_ID)[0].eventtype == "Cancel" ? true : false;
        }

        let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == logical_ID && x.eventtype == "Transfer");
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
            this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                isdoseCancle, doctorcomporm, false, contents.Administration_withheld_by_doctor)
            // }
            // else {
            //     this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
            //         isdoseCancle, doctorcomporm, false, contents.Cancelled)
            // }
        }
        else if (doseprescription.titration && !isTitrationDone && !isdoseCancle) {
            if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Due)
            }

            else if (diffMins <= -this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Late)
            }
            else if (diffMins >= this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Planned)
            }
        }
        else if (posology.doctorsorder && !doctorcomporm && !isdoseCancle) {
            if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Due)
            }

            else if (diffMins <= -this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Late)
            }
            else if (diffMins >= this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, true, false, contents.Administration_requires_doctors_confirmation_Planned)
            }
        }
        // check if dose not cancel and even if doctor order is required in dose order is conformed
        else if (!isdoseCancle) {
            if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Due_Administration)
            }
            else if (diffMins <= -this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Late_Administration)
            }
            else if (diffMins >= this.appService.buffertimeAmber) {
                this.addevents(dose.prescription_id, logical_ID, ploteDate, null, dose.posology_id, posology.prn,
                    isdoseCancle, false, false, contents.Planned_Administration)
            }
        }


    }


    addevents(prescription_id: any, dose_id: any, eventStart: any, eventEnd: any, posology_id: any, prn: boolean, iscancel: boolean,
        doctorsorder: boolean, isinfusion: boolean, content: any, admitdone = false) {


        this.PrescriptionFormEvent.push({
            prescription_id: prescription_id,
            posology_id: posology_id,
            dose_id: "flowrate_" + dose_id,
            eventStart: moment(eventStart),
            eventEnd: eventEnd,
            prn: prn,
            iscancel: iscancel,
            doctorsorder: doctorsorder,
            isinfusion: isinfusion,
            content: "<div class='durationFlorateprescriptionform'>" + moment(eventStart).format("HH:mm") + " ",
            admitdone: admitdone
        }

        )


        this.PrescriptionFormEvent.push({
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
            admitdone: admitdone
        }

        )

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



    addInfutionEvent(prescription: Prescription) {





        let infutionlist = prescription.__posology[0].__dose.filter(x => x.prescription_id == prescription.prescription_id && x.continuityid == null);



        for (let dose of infutionlist) {
            let allDoses = prescription.__posology[0].__dose.filter(x => x.prescription_id == prescription.prescription_id && x.continuityid == dose.dose_id);
            allDoses.sort((b, a) => new Date(b.dosestartdatetime).getTime() - new Date(a.dosestartdatetime).getTime());

            if (this.prescriptionStatus != "suspended" && this.prescriptionStatus != "stopped" && this.prescriptionStatus != "cancelled") {
                this.createInfusioniEvents(prescription, dose, allDoses);
            }


        }



    }


    createInfusioniEvents(prescription: Prescription, startDose: Dose, allDoses: any) {
        let EndDosetime: any;

        // if (prescription.linkedinfusionid) {
        //     let linkedinfusion = this.appService.Prescription.find(x => x.prescription_id == prescription.linkedinfusionid)
        //     if (!this.appService.InfusionEvents.find(x => x.posology_id == linkedinfusion.__posology[0].posology_id && x.eventtype == "endinfusion")) {
        //         return;
        //     }
        // }
        if (allDoses.length > 0) {
            EndDosetime = allDoses[allDoses.length - 1].doseenddatatime;
        }
        else {
            EndDosetime = startDose.doseenddatatime;
        }

        let startDosetime = moment(startDose.dosestartdatetime);

        let enddate = moment(prescription.__posology[0].prescriptionenddate)
        if (moment(enddate, "MM/DD/YYYY") < moment(this.MaxEventDate, "MM/DD/YYYY")) {
            this.MaxEventDate = moment(prescription.__posology[0].prescriptionenddate);
            this.MaxEventDate.set({ hour: 23, minute: 59, second: 0, millisecond: 0 })
        }

        let repeatDays = 0;
        while (moment(startDosetime, "MM/DD/YYYY") <= moment(this.MaxEventDate, "MM/DD/YYYY")) {
            // if (!this.appService.Medicationadministration.find(x => x.logicalid == this.createLogicalId(startDosetime, startDose.dose_id))) {
            if (true) {
                if (moment(this.minEventDate, "MM/DD/YYYY") < moment(startDosetime, "MM/DD/YYYY")) {


                    let diffMins = this.getTimeDiff(startDosetime);
                    let startFlowrate = startDose.infusionrate;
                    let administeredevent = this.appService.Medicationadministration.find(x => x.logicalid == "start_" + this.createLogicalId(startDosetime, startDose.dose_id) && x.dose_id == startDose.dose_id);

                    let plotstartDosetime = moment(startDosetime);
                    let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "start_" + this.createLogicalId(startDosetime, startDose.dose_id) && x.eventtype == "Transfer");
                    if (dosetransferDate) {
                        plotstartDosetime = moment(dosetransferDate.dosedatetime);
                    }
                    if (administeredevent && prescription.infusiontype_id == "bolus") {

                        startDosetime = moment(startDosetime).add(1, 'd');
                        EndDosetime = moment(EndDosetime).add(1, 'd');
                        continue;
                    }
                    //Flow rate for start node
                    if (!administeredevent && prescription.infusiontype_id != "bolus") {
                        let doseunit = "ml/h"
                        if (startDose.doseunit == null || startDose.doseunit.trim() == "") {
                            doseunit = "ml/h";
                        }
                        else {
                            doseunit = startDose.doseunit;
                        }
                        this.addevents(startDose.prescription_id, "flowrate_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                            null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + startFlowrate + " " +
                            doseunit
                        + "</div>")
                    }
                    ///////////////////////// 
                    if (administeredevent && (prescription.infusiontype_id == "ci" || prescription.infusiontype_id == InfusionType.pca)) {
                        if (!this.appService.InfusionEvents.find(x => x.posology_id == prescription.__posology[0].posology_id && x.eventtype == "endinfusion")) {
                            this.addevents(prescription.prescription_id, "infusionevent" + prescription.prescription_id, new Date(), null, prescription.__posology[0].posology_id, prescription.__posology[0].prn,
                                false, false, false, contents.Recordadditionaladministration)
                            this.PRNids.push("infusionevent" + prescription.prescription_id);
                        }

                        let doseunit = "ml/h"
                        if (startDose.doseunit == null || startDose.doseunit.trim() == "") {
                            doseunit = "ml/h";
                        }
                        else {
                            doseunit = startDose.doseunit;
                        }
                        this.addevents(startDose.prescription_id, "flowrate_" + this.createLogicalId(startDosetime, startDose.dose_id), moment(administeredevent.administrationstartime),
                            null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + administeredevent.administredinfusionrate + " " +
                            doseunit
                        + "</div>")
                    }
                    else {

                        if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                            this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                null, startDose.posology_id, false, false, false, true, contents.Infusiondue)
                        }
                        else if (diffMins <= -this.appService.buffertimeAmber) {
                            this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                null, startDose.posology_id, false, false, false, true, contents.InfusionLate)
                        }
                        else if (diffMins >= this.appService.buffertimeAmber) {
                            this.addevents(startDose.prescription_id, "start_" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                null, startDose.posology_id, false, false, false, true, contents.Infusionplanned)
                        }

                    }

                    let plotEndDosetime = moment(EndDosetime);
                    let dosetransferDateend = this.appService.DoseEvents.find(x => x.logicalid == "end_" + this.createLogicalId(EndDosetime, startDose.dose_id) && x.eventtype == "Transfer");
                    if (dosetransferDateend) {
                        plotEndDosetime = moment(dosetransferDateend.dosedatetime);
                    }

                    diffMins = this.getTimeDiff(plotEndDosetime);
                    if (prescription.infusiontype_id != "bolus") {

                        let infusionEndEvent = this.appService.InfusionEvents.find(x => x.logicalid == "end_" + this.createLogicalId(EndDosetime, startDose.dose_id))
                        if (EndDosetime) {
                            ////////////////////////
                            // if infusion is comlete

                            if (infusionEndEvent) {

                            }
                            // if infusion is not comlete
                            else {
                                if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.InfusionCompletiondue)
                                }
                                else if (diffMins <= -this.appService.buffertimeAmber) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.InfusionCompleteoverdue)
                                }
                                else if (diffMins >= this.appService.buffertimeAmber) {
                                    this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), plotEndDosetime,
                                        null, startDose.posology_id, false, false, false, true, contents.Infusioncompletionplanned)
                                }
                            }
                        }

                        if (EndDosetime == null && prescription.__posology[0].prescriptionenddate == null && (prescription.__posology[0].infusiontypeid == 'ci' || prescription.__posology[0].infusiontypeid == InfusionType.pca)) {
                            let enddate = this.MaxEventDate;
                            if (infusionEndEvent) {
                                enddate = infusionEndEvent.eventdatetime;

                            }
                            if (this.prescriptionStatus == "suspended") {
                                enddate = moment(prescription.lastmodifiedon);
                            }
                            else if (this.prescriptionStatus == "stopped") {
                                enddate = moment(prescription.lastmodifiedon);
                                this.addevents(startDose.prescription_id, "end_" + this.createLogicalId(EndDosetime, startDose.dose_id), enddate,
                                    null, startDose.posology_id, false, false, false, true, contents.InfusionCompleteddone)

                            }
                            if (administeredevent) {
                                this.addevents(startDose.prescription_id, "dur" + startDose.prescription_id, moment(administeredevent.administrationstartime),
                                    enddate, startDose.posology_id, false, false, false, true, contents.durationline)

                            }
                            else {
                                this.addevents(startDose.prescription_id, "dur" + startDose.prescription_id, plotstartDosetime,
                                    enddate, startDose.posology_id, false, false, false, true, contents.durationline)

                            }
                        }
                        else {
                            let durationEnd = plotEndDosetime
                            if (infusionEndEvent) {
                                durationEnd = infusionEndEvent.eventdatetime;
                            }

                            if (administeredevent) {
                                this.addevents(startDose.prescription_id, "dur" + this.createLogicalId(startDosetime, startDose.dose_id), moment(administeredevent.administrationstartime),
                                    durationEnd, startDose.posology_id, false, false, false, true, contents.durationline)
                            }
                            else {
                                this.addevents(startDose.prescription_id, "dur" + this.createLogicalId(startDosetime, startDose.dose_id), plotstartDosetime,
                                    durationEnd, startDose.posology_id, false, false, false, true, contents.durationline)
                            }
                        }

                    }
                }
            }

            this.PloteFutureFlowRateChange(startDose, allDoses, repeatDays);
            repeatDays++;
            if (prescription.__posology[0].prescriptionenddate == EndDosetime) {
                // more then 24 hource so no repete and breck
                break;
            }
            startDosetime = moment(startDosetime).add(1, 'd');
            EndDosetime = moment(EndDosetime).add(1, 'd');


        }

        /////////////////////////////////////

        /////////////////////////////////


    }

    PloteFutureFlowRateChange(startDose: Dose, allDoses: any, repeatDays: any) {

        let firstDosetime = moment(startDose.dosestartdatetime).add(repeatDays, 'd');
        let currentFlowRate = startDose.infusionrate;
        let startFlowRateAdministered = this.appService.Medicationadministration.find(x => x.logicalid == "start_" + this.createLogicalId(firstDosetime, startDose.dose_id));
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
            let dosetransferDate = this.appService.DoseEvents.find(x => x.logicalid == "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id) && x.eventtype == "Transfer");
            if (dosetransferDate) {
                startDosetime = moment(dosetransferDate.dosedatetime);
            }
            startDosetime = moment(startDosetime).add(repeatDays, 'd');

            let diffMins = this.getTimeDiff(startDosetime);

            let administeredevent = this.appService.Medicationadministration.find(x => x.logicalid == "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id) && x.dose_id == dose.dose_id);
            //////////////////////////////
            if (administeredevent) {
                let doseunit = "ml/h"
                if (startDose.doseunit == null || startDose.doseunit.trim() == "") {
                    doseunit = "ml/h";
                }
                else {
                    doseunit = startDose.doseunit;
                }
                this.addevents(dose.prescription_id, "flowrate_" + this.createLogicalId(originalStarttime, dose.dose_id), moment(administeredevent.administrationstartime),
                    null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + administeredevent.administredinfusionrate + " " +
                    doseunit
                + "</div>")
                currentFlowRate = administeredevent.administredinfusionrate;
                continue;
            }
            else {
                let doseunit = "ml/h"
                if (startDose.doseunit == null || startDose.doseunit.trim() == "") {
                    doseunit = "ml/h";
                }
                else {
                    doseunit = startDose.doseunit;
                }
                this.addevents(dose.prescription_id, "flowrate_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                    null, startDose.posology_id, false, false, false, true, "<div class='durationFlorate'>" + dose.infusionrate + " " +
                    doseunit
                + "</div>")
            }
            ////////////////////////////
            if (diffMins > -this.appService.buffertimeAmber && diffMins < this.appService.buffertimeAmber) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Due)
                } else if (currentFlowRate < dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRateDue)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRateDue)
                }
                currentFlowRate = dose.infusionrate;
            }
            else if (diffMins <= -this.appService.buffertimeAmber) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Late)
                } else if (currentFlowRate < dose.infusionrate) {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRateLate)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRateLate)
                }
                currentFlowRate = dose.infusionrate;
            }
            else if (diffMins >= this.appService.buffertimeAmber) {
                if (currentFlowRate == dose.infusionrate) {

                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.Maintain_Infusion_Rate_Planned)
                } else if (currentFlowRate < dose.infusionrate) {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.IncreaseInfusionRatePlanned)
                } else {
                    this.addevents(dose.prescription_id, "adjust_" + this.createLogicalId(originalStarttime, dose.dose_id), startDosetime,
                        null, startDose.posology_id, false, false, false, true, contents.DecreaseInfusionRatePlanned)
                }
                currentFlowRate = dose.infusionrate;
            }



            // }
            // repeatDays--;
        }
    }




    getTimeDiff(datetime: any) {
        let current = new Date(moment(new Date(), moment.ISO_8601).toString());
        let start = new Date(moment(datetime, moment.ISO_8601).toString());
        let diffMs = (start.valueOf() - current.valueOf());
        return Math.round(diffMs / 60000); // minutes
    }


}
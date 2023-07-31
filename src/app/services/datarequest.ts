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
import { Injectable, OnDestroy } from "@angular/core";
import { forkJoin, Subscription } from "rxjs";
import { AdministerMedication, AdministrationWitness, DoseEvents, DSMedSupplyRequiredStatus, InfusionEvents, Medicationadministration, Medreconciliation, NursingInstruction, Prescription, PrescriptionEvent, Prescriptionreminders, Prescriptionreviewstatus, Prescriptionroutes, SupplyRequest, SupplyRequestMedications } from "../models/EPMA";
import { ApirequestService } from "./apirequest.service";
import { AppService } from "./app.service";
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { Allergyintolerance, Personwarningupdate } from "../models/allergy.model";
import { Observation } from "../models/observations.model";
import moment from "moment";
import { Allergens, PatientInfo, WarningContext } from "../models/WarningServiceModal";
import { v4 as uuid } from 'uuid';
import { SubjectsService } from "./subjects.service";
import { PrescriptionContext, RefWeightType, SupplyRequestStatus } from "./enum";
import { UpsertTransactionManager } from "src/app/services/upsert-transaction-manager.service";
@Injectable({
    providedIn: 'root'
})

export class DataRequest implements OnDestroy {
    subscriptions = new Subscription();
    patientDetails;
    constructor(private apiRequest: ApirequestService, private appService: AppService, private subjects: SubjectsService) {

    }

    getSupplyRequest(cb: () => any) {
        this.appService.SupplyRequest = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_supplyrequest&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {
                let responseArray: SupplyRequest[] = JSON.parse(response);
                this.appService.SupplyRequest = responseArray.filter(s => s.requeststatus == SupplyRequestStatus.Incomplete || s.requeststatus == SupplyRequestStatus.Pending || s.requeststatus == SupplyRequestStatus.Approved);
                cb();
            }
        ));
    }
    getDSMedSupplyRequest(pId:string, cb: (data) => any) {
        this.appService.SupplyRequest = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_dsmedsupplyrequiredstatus&synapseattributename=prescription_id&attributevalue=" + pId).subscribe(
            (response) => {
                let responseArray: DSMedSupplyRequiredStatus[] = JSON.parse(response);
                cb(responseArray);
            }
        ));
    }
    getSupplyRequestMedication(srId:string, cb: (data) => any) {
        this.appService.SupplyRequest = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_supplyrequestmedications&synapseattributename=epma_supplyrequest_id&attributevalue=" + srId).subscribe(
            (response) => {
                let responseArray: SupplyRequestMedications[] = JSON.parse(response);
                cb(responseArray);
            }
        ));
    }
    getReminders(cb: () => any) {
        this.subscriptions.add(
            this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionreminders&synapseattributename=encounterid&attributevalue=" + this.appService.encounter.encounter_id)
                .subscribe(reminders => {
                    let responseArray = JSON.parse(reminders);
                    this.appService.Prescriptionreminders = [];
                    for (let r of responseArray) {
                        this.appService.Prescriptionreminders.push(<Prescriptionreminders>r);
                    }
                    cb();
                }));
    }


    getPharmacyReviewStatus(cb: () => any) {
        this.appService.Prescriptionreviewstatus = [];

        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionreviewstatus&synapseattributename=person_id&attributevalue=" + this.appService.personId).subscribe(
            response => {
                let responseArray = JSON.parse(response);

                for (let r of responseArray) {
                    this.appService.Prescriptionreviewstatus.push(<Prescriptionreviewstatus>r);
                }
                cb();
            }));
    }



    // initialize application data
    getAdminstrations(cb: () => any) {
        this.appService.Medicationadministration = [];
        this.appService.DoseEvents = [];
        this.appService.InfusionEvents = [];

        if (this.appService.Prescription && this.appService.Prescription.length != 0) {
            let medicationAdministration = this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=medicationadministration&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id);
            let doseEvent = this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_doseevents", this.createEventsFilter());
            let infusionEvent = this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_infusionevents", this.createEventsFilter());

            this.subscriptions.add(forkJoin([
                medicationAdministration,
                doseEvent,
                infusionEvent
            ]).subscribe(([medicationadministration, doseevent, infusionevent]) => {

                // initialize medication administration data
                let responseArrayMed = JSON.parse(medicationadministration);
                for (let r of responseArrayMed) {
                    this.appService.Medicationadministration.push(<Medicationadministration>r);
                }

                // initialize dose event data
                let responseArrayDose = doseevent;
                for (let r of responseArrayDose) {
                    this.appService.DoseEvents.push(<DoseEvents>r);
                }
                this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
                for (let dose of [].concat(...this.appService.Prescription.map(p => p.__posology.map(pos => pos.__dose)))) {
                    dose.__doseEvent = this.appService.DoseEvents.filter(x => x.dose_id == dose.dose_id);
                }

                // initialize infusion event data
                let responseArrayInfusion = infusionevent;
                for (let r of responseArrayInfusion) {
                    this.appService.InfusionEvents.push(<InfusionEvents>r);
                }
                this.appService.InfusionEvents.sort((a, b) => b._sequenceid - a._sequenceid);



                cb();
            }));
        }
        else {
            cb();
        }
    }
    PharmacyReviewReset(prescriptioncurrent: Prescription, event_id, cb: () => any) {

        let prescriptionreviewstatus = new Prescriptionreviewstatus();
        prescriptionreviewstatus.epma_prescriptionreviewstatus_id = uuid();
        prescriptionreviewstatus.person_id = prescriptioncurrent.person_id;
        prescriptionreviewstatus.prescription_id = prescriptioncurrent.prescription_id;
        prescriptionreviewstatus.precriptionedited = false;
        prescriptionreviewstatus.prescriptionstatuschange = true;
        prescriptionreviewstatus.epma_prescriptionevent_id = event_id;
        prescriptionreviewstatus.modifiedby = this.appService.loggedInUserName;
        prescriptionreviewstatus.modifiedon =
            this.appService.getDateTimeinISOFormat(moment().toDate());
        prescriptionreviewstatus.reviewcomments = "";

        prescriptionreviewstatus.status = 'd219dd6d-aafc-4aa3-bad0-5ffcc87d0134';

        prescriptionreviewstatus.oldcorrelationid = null;
        prescriptionreviewstatus.newcorrelationid = null;
        Object.keys(prescriptionreviewstatus).map((e) => {
            if (e.startsWith('_')) delete prescriptionreviewstatus[e];
        });
        var upsertManager = new UpsertTransactionManager();
        upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

        upsertManager.addEntity(
            'local',
            'epma_prescriptionreviewstatus',
            JSON.parse(JSON.stringify(prescriptionreviewstatus))
        );
        upsertManager.save(
            (resp: any) => {
                this.appService.UpdateDataVersionNumber(resp);


                this.appService.Prescriptionreviewstatus.push(prescriptionreviewstatus);
                this.subjects.refreshTemplate.next(
                    prescriptioncurrent.prescription_id
                );

                upsertManager.destroy();
                cb();
            },
            (error) => {
                this.appService.logToConsole(error);
                upsertManager.destroy();
                cb();

                if (this.appService.IsDataVersionStaleError(error)) {
                    this.subjects.ShowRefreshPageMessage.next(error);
                }
            }
        );

    }
    UndoTransfer(dose: any, cb: () => any) {
        let doselist = [];
        let existingDoseEvent: DoseEvents = new DoseEvents();

        if (this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).infusiontypeid == "ci" ||
            this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).infusiontypeid == "rate" &&
            this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).frequency == "variable"
        ) {
            doselist = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == dose.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
        }

        else {
            let alldoselist = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == dose.posology_id && !e.dose_id.includes("dur") &&
                !e.dose_id.includes("restart") && !e.dose_id.includes("pause") && !e.dose_id.includes("addadjust") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
            var index = alldoselist.findIndex(x => x.dose_id == dose.dose_id);
            doselist.push(dose)
            let currentend = alldoselist[index + 1];
            doselist.push(currentend)



        }



        var upsertManager = new UpsertTransactionManager();
        upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
        for (let admindose of doselist) {
            existingDoseEvent = this.appService.DoseEvents.find(e => e.logicalid == admindose.dose_id
                && e.posology_id == dose.posology_id
                && e.eventtype == "AdminTransfer" && e.iscancelled == false);
            if (existingDoseEvent) {
                upsertManager.addEntity('core', 'doseevents', existingDoseEvent.doseevents_id, 'del');
            }
        }
        if (upsertManager.entities.length > 0) {
            upsertManager.save((resp) => {
                this.appService.UpdateDataVersionNumber(resp);

                this.appService.logToConsole(resp);
                upsertManager.destroy();
                cb();
            },
                (error) => {
                    upsertManager.destroy();
                    cb();
                    // this.appService.logToConsole(error);
                    upsertManager.destroy();

                    if (this.appService.IsDataVersionStaleError(error)) {
                        this.subjects.ShowRefreshPageMessage.next(error);
                    }
                }
            );
        } else {
            cb();
        }

    }

    transferCIAndRatevariable(doses: any, startDate: Date, startTime: string, transferStart: boolean, cb: (message: string) => any) {
        let Transfertype = ""
        if (transferStart) {
            Transfertype = "AdminTransfer"
        }
        else {
            Transfertype = "Transfer"
        }




        var upsertManager = new UpsertTransactionManager();
        upsertManager.beginTran(this.appService.baseURI, this.apiRequest);
        let newDoseDateTime = moment(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), +startTime.split(':')[0], +startTime.split(':')[1]));
        let timediffback = moment(newDoseDateTime).diff(doses[0].eventStart, 'minutes');
        for (let dose of doses) {
            let newDoseEventId: string = '';
            let newDoseId: string = '';
            let existingDoseEvent: DoseEvents = new DoseEvents();


            existingDoseEvent = this.appService.DoseEvents.find(e => e.logicalid == dose.dose_id
                && e.posology_id == dose.posology_id
                && e.eventtype == Transfertype && e.iscancelled == false);


            if (existingDoseEvent) {
                newDoseEventId = existingDoseEvent.doseevents_id;
            } else {
                newDoseEventId = uuid();
            }
            newDoseId = dose.dose_id.split('_')[2];

            let startDateTime = dose.isinfusion == true ? dose.dose_id.split('_')[1] : dose.dose_id.split('_')[0];

            let dosedatetime = new Date(new Date(dose.eventStart).getTime() + timediffback * 60000);
            var d = new Date();
            var v = new Date();
            v.setMinutes(d.getMinutes() + 30);

            console.log(v)
            let doseEvents = {};
            doseEvents = {
                doseevents_id: newDoseEventId,
                dose_id: newDoseId,
                posology_id: dose.posology_id,
                startdatetime: startDateTime.slice(0, 4) + "-" + startDateTime.slice(4, 6) + "-" + startDateTime.slice(6, 8) + "T" + startDateTime.slice(8, 10) + ":" + startDateTime.slice(10, 12) + ":00.000Z",
                eventtype: Transfertype,
                dosedatetime: this.appService.getDateTimeinISOFormat(dosedatetime),
                iscancelled: false,
                logicalid: dose.dose_id,
            };
            upsertManager.addEntity('core', 'doseevents', JSON.parse(JSON.stringify(doseEvents)));

        }
        upsertManager.save((resp) => {
            this.appService.UpdateDataVersionNumber(resp);

            this.appService.logToConsole(resp);
            upsertManager.destroy();
            cb("success");


        },
            (error) => {
                upsertManager.destroy();

                // this.appService.logToConsole(error);
                upsertManager.destroy();
                cb("error");

                if (this.appService.IsDataVersionStaleError(error)) {
                    this.subjects.ShowRefreshPageMessage.next(error);
                }
            }
        );
    }

    transferRateInfution(dose: any, startDate: Date, startTime: string, transferStart: boolean, cb: (message: string) => any) {
        let doselist = [];

        doselist = this.appService.events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()).filter(e => e.posology_id == dose.posology_id && !e.dose_id.includes("dur") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent"));
        // if (this.appService.Prescription.find(p => p.__posology[0].posology_id == dose.posology_id && p.__posology[0].infusiontypeid == "ci")) {
        if (this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).infusiontypeid == "ci" ||
            (this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).infusiontypeid == "rate" &&
                this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).frequency == "variable")
        ) {
            this.transferCIAndRatevariable(doselist, startDate, startTime, transferStart, (message) => {
                cb(message);
            });
        }
        else {

            let newDoseDateTime = moment(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), +startTime.split(':')[0], +startTime.split(':')[1]));

            // for (let dose of doselist)
            //  var index = doselist.indexOf(dose);
            var index = doselist.findIndex(x => x.dose_id == dose.dose_id);
            let nextstartItem
            let lastenditem
            let currentend
            let nexttime
            let endtime
            let currentendtime
            if (index >= 0 && index < doselist.length - 1) {

                currentend = doselist[index + 1];
                nextstartItem = doselist[index + 2];

                lastenditem = doselist[index - 1];
                if (nextstartItem) {
                    nexttime = moment(nextstartItem.eventStart).clone();
                }
                else {
                    // if (this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).prescriptionenddate) {
                    //     nexttime = moment(this.appService.Prescription.find(p => p.prescription_id == dose.prescription_id).__posology.find(po => po.posology_id == dose.posology_id).prescriptionenddate).clone();
                    // }
                    // else {
                    nexttime = moment().add(8, 'days');
                    // }
                }
                if (index == 0) {
                    // endtime = moment(this.appService.Prescription.find(x => x.prescription_id == dose.prescription_id).startdatetime)
                    endtime = moment(this.appService.encounter.sortdate);
                }
                else {
                    endtime = moment(lastenditem.eventStart).clone();
                }
                currentendtime = moment(currentend.eventStart).add(moment(newDoseDateTime).diff(dose.eventStart, 'minutes'), 'minutes')
                nexttime.add(- this.appService.administrationTimeDiffInMinute, 'minutes')
                if (index != 0) {
                    endtime.add(this.appService.administrationTimeDiffInMinute, 'minutes')
                }
            }
            let timediffback = moment(newDoseDateTime).diff(dose.eventStart, 'minutes');
            let timediffForword = moment(newDoseDateTime).diff(nexttime, 'minutes');
            if (timediffback < 0) {
                //  let dif=moment(lastenditem.eventStart).diff(moment(newDoseDateTime),'minutes')
                if (moment(endtime).isSameOrAfter(moment(newDoseDateTime))) {
                    if (index == 0) {
                        cb("The time of transfer cannot be earlier than the admission date/time");
                    }
                    else {
                        if (transferStart)
                            cb("The administration event cannot be administered at a time before the previous administration event.");
                        else
                            cb("The administration event cannot be transferred to a time before the previous administration event.");
                    }

                }
                else {
                    let dosesrate = [];
                    dosesrate.push(dose);
                    dosesrate.push(currentend);
                    this.transferCIAndRatevariable(dosesrate, startDate, startTime, transferStart, (message) => {
                        cb(message);

                    });
                }
            }
            else if (timediffback > 0) {

                if (moment(currentendtime).isSameOrAfter(moment(nexttime))) {
                    if (transferStart)
                        cb("The administration event cannot be administered at a time after the next administration event.");
                    else
                        cb("The administration event cannot be transferred to a time after the next administration event.");
                }
                else {
                    let dosesrate = [];
                    dosesrate.push(dose);
                    dosesrate.push(currentend);
                    this.transferCIAndRatevariable(dosesrate, startDate, startTime, transferStart, (message) => {
                        cb(message);

                    });
                }
            }
            else {
                cb("success");
            }
        }

    }

    getmedreconciliaCompletedobject() {
        this.appService.medReconcelationCompleteStatus = "Pharmacy_To_Review";
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_medreconciliation&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {

                let medreconciliationobject = <Medreconciliation[]>JSON.parse(response);
                if (medreconciliationobject[0]) {
                    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetObjectHistory?synapsenamespace=local&synapseentityname=epma_medreconciliation&id=" + medreconciliationobject[0].epma_medreconciliation_id).subscribe(
                        (response) => {

                            let medreconciliationhistory = <Medreconciliation[]>JSON.parse(response);


                            let iscomplete = false;
                            if (medreconciliationhistory.find(x => x.status == "Medicines Reconciliation completed")) {
                                iscomplete = true;
                            }
                            let str = moment().format("YYYYMMDD");
                            let teckObject = medreconciliationhistory.find(x => x.role == "EPMA Pharmacy tech" && moment(x.modifiedon).format("YYYYMMDD") == moment().format("YYYYMMDD"))
                            let pharmacistObject = medreconciliationhistory.find(x => x.role == "EPMA Pharmacist" && moment(x.modifiedon).format("YYYYMMDD") == moment().format("YYYYMMDD"))

                            if (iscomplete) {
                                if (teckObject && pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacy_Reviewed_Medrec_Done"
                                }
                                else if (teckObject && !pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacy_Technician_Reviewed_Medrec_Done"
                                }
                                else if (!teckObject && pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacist_Reviewed_Medrec_Done"
                                }
                                else if (!teckObject && !pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacy_To_Review_Medrec_Done";
                                }
                            }
                            else {
                                if (teckObject && !pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacy_Technician_Reviewed"
                                }
                                // else if (!teckObject && pharmacistObject) {
                                //     this.appService.medReconcelationCompleteStatus = "reviewed by pharmacist only"
                                // }
                                else if (!teckObject && !pharmacistObject) {
                                    this.appService.medReconcelationCompleteStatus = "Pharmacy_To_Review";
                                }
                            }

                        }
                    ));
                }
            }
        ));


    }
    // get all prescription
    getAllPrescription(cb: () => any) {

        this.getmedreconciliaCompletedobject();
        this.subscriptions.add(
            this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_prescriptiondetail", this.createPrescriptionFilter())
                .subscribe((response) => {
                    this.appService.Prescription = [];
                    // this.appService.Medication = [];
                    for (let prescription of response) {
                        if (prescription.correlationid) {
                            prescription.__posology = JSON.parse(prescription.__posology);
                            prescription.__routes = JSON.parse(prescription.__routes).sort((x, y) => y.isdefault - x.isdefault);
                            prescription.__medications = JSON.parse(prescription.__medications);
                            this.appService.Prescription.push(<Prescription>prescription);
                        }
                    }
                    this.GetNursingInstructionsAndCustomWarnings(this.appService.Prescription, () => {
                        this.subjects.refreshTemplate.next();
                        cb();
                    });
                })
        )
    }
    // get all metadata
    getAllPrescriptionMeta(cb: () => any) {
        this.subscriptions.add(
            this.apiRequest.getRequest(this.appService.baseURI + "/GetBaseViewList/epma_prescriptionmeta")
                .subscribe((response) => {
                    this.appService.oxygenDevices = [];
                    this.appService.oxygenprescriptionadditionalinfo = [];
                    this.appService.obsScales = [];
                    this.appService.MetaReviewstatus = [];
                    this.appService.MetaPrescriptionstatus = [];
                    this.appService.MetaPrescriptionDuration = [];
                    this.appService.MetaPrescriptionadditionalcondition = [];
                    this.appService.MetaPrescriptionSource = [];
                    this.appService.MetaPrescriptioncontext = [];

                    for (let meta of JSON.parse(response)) {
                        switch (meta.field) {
                            case "oxygendevices": this.appService.oxygenDevices = JSON.parse(meta.data);
                                break;
                            case "oxygenprescriptionadditionalinfo": this.appService.oxygenprescriptionadditionalinfo = JSON.parse(meta.data);
                                break;
                            case "observationscaletype": this.appService.obsScales = JSON.parse(meta.data);
                                break;
                            case "reviewstatus": this.appService.MetaReviewstatus = JSON.parse(meta.data);
                                break;
                            case "prescriptionstatus": this.appService.MetaPrescriptionstatus = JSON.parse(meta.data);
                                break;
                            case "prescriptionduration": this.appService.MetaPrescriptionDuration = JSON.parse(meta.data);
                                break;
                            case "prescriptionadditionalconditions": this.appService.MetaPrescriptionadditionalcondition = JSON.parse(meta.data);
                                break;
                            case "prescriptionsource": this.appService.MetaPrescriptionSource = JSON.parse(meta.data);
                                break;
                            case "prescriptioncontext": this.appService.MetaPrescriptioncontext = JSON.parse(meta.data);

                        }
                    }
                    cb();
                })
        )
    }
    // get medication administration
    getMedicationAdministration(cb: () => any) {
        this.appService.Medicationadministration = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=medicationadministration&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {
                let responseArray = JSON.parse(response);
                for (let r of responseArray) {
                    this.appService.Medicationadministration.push(<Medicationadministration>r);
                }
                cb();
            }));
    }

    updateDoseForPrescription(pid: string, cb: () => any) {
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=dose&synapseattributename=prescription_id&attributevalue=" + pid).subscribe(
            (response) => {
                let responseArray = JSON.parse(response);

                let p = this.appService.Prescription.find(x => x.prescription_id == pid);
                if (p) {
                    p.__posology.forEach(pos => {
                        pos.__dose = responseArray.filter(d => d.posology_id == pos.posology_id);
                    });
                    // p.__posology.__dose = responseArray;
                }
                cb();
            }));
    }
    // get dose event
    getDoseEvents(cb: () => any) {
        this.appService.DoseEvents = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_doseevents", this.createEventsFilter()).subscribe(
            (response) => {
                let responseArray = (response);
                for (let r of responseArray) {
                    this.appService.DoseEvents.push(<DoseEvents>r);
                }
                this.appService.DoseEvents.sort((a, b) => b._sequenceid - a._sequenceid);
                cb();
            }));
    }
    // get infusion event
    getInfusionEvents(cb: () => any) {
        this.appService.InfusionEvents = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_infusionevents", this.createEventsFilter()).subscribe(
            (response) => {
                let responseArray = (response);
                for (let r of responseArray) {
                    this.appService.InfusionEvents.push(<InfusionEvents>r);
                }
                this.appService.InfusionEvents.sort((a, b) => b._sequenceid - a._sequenceid);
                cb();
            }));
    }
    // get medication administration history
    getMedicationAdministrationHistory(administrationId, id, cb: () => any) {
        this.appService.MedicationadministrationHistory = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_medicationadministrationhistory", this.createAdministrationHistoryFilter(id)).subscribe(
            (response) => {
                let responseArray = response.sort((a, b) => b._sequenceid - a._sequenceid);
                let i = 0;
                for (let r of responseArray) {
                    r._index = i++;
                    this.appService.MedicationadministrationHistory.push(<Medicationadministration>r);
                }
                this.getProductHistory(administrationId, () => {
                    cb();
                });

            }));
    }
    getProductHistory(id: string, cb: () => any) {
        this.appService.AdministermedicationHistory = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_administeredmedhistory", this.createProductHistoryFilter(id)).subscribe(
            (response) => {

                let responseArray = response.sort((a, b) => b._sequenceid - a._sequenceid);;
                if (responseArray.length > 0) {
                    let i = 0;
                    for (let r of responseArray) {
                        r._index = i++;
                        this.appService.AdministermedicationHistory.push(<AdministerMedication>r);
                    }
                    cb();
                }
            }));
    }
    createProductHistoryFilter(id) {
        let condition = "medicationadministrationid = @medicationadministrationid";
        let f = new filters()
        f.filters.push(new filter(condition));
        let pm = new filterParams();
        pm.filterparams.push(new filterparam("medicationadministrationid", id));
        let select = new selectstatement("SELECT *");
        let orderby = new orderbystatement("ORDER BY 2");
        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);
        return JSON.stringify(body);
    }

    createAdministrationHistoryFilter(id) {
        let condition = "logicalid = @logicalid";
        let f = new filters()
        f.filters.push(new filter(condition));
        let pm = new filterParams();
        pm.filterparams.push(new filterparam("logicalid", id));
        let select = new selectstatement("SELECT *");
        let orderby = new orderbystatement("ORDER BY 2");
        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);
        return JSON.stringify(body);
    }
    // get dose event history
    getDoseEventsHistory(id, cb: () => any) {
        this.appService.DoseEventsHistory = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_doseeventshistory", this.createAdministrationHistoryFilter(id)).subscribe(
            (response) => {
                let responseArray = response;
                for (let r of responseArray) {
                    this.appService.DoseEventsHistory.push(<DoseEvents>r);
                }
                this.appService.DoseEventsHistory.sort((a, b) => b._sequenceid - a._sequenceid);
                cb();
            }));
    }
    // get infusion event history
    getInfusionEventsHistory(id, cb: () => any) {
        this.appService.InfusionEventsHistory = [];
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_infusioneventshistory", this.createAdministrationHistoryFilter(id)).subscribe(
            (response) => {
                let i = 0;
                let responseArray = response.sort((a, b) => b._sequenceid - a._sequenceid);
                for (let r of responseArray) {
                    r._index = i++;
                    this.appService.InfusionEventsHistory.push(<InfusionEvents>r);
                }
                cb();
            }));
    }
    getAllergy(cb: () => any) {
        this.appService.allergyintolerance = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=allergyintolerance&synapseattributename=person_id&attributevalue=" + this.appService.personId).subscribe(
            (response) => {
                let responseArray: Allergyintolerance[] = JSON.parse(response);
                this.appService.allergyintolerance = responseArray;
                this.appService.patientInfo.allergens = this.appService.allergyintolerance.filter(x => x.causativeagentcodesystem.toLowerCase() == "SNOMED CT".toLowerCase() && x.clinicalstatusvalue.toLowerCase() == "Active".toLowerCase()).map<Allergens>((r: Allergyintolerance) => {
                    return { uname: r.causativeagentdescription, code: r.causativeagentcode, type: 1 };
                });
                cb();
            }
        ));
    }
    TriggerWarningUpdateOnChanges(cb: () => any, wc: string = WarningContext.ip) {

        //get new allergies from entity
        this.getAllergy(() => {
            this.appService.patientInfo.allergens.sort((a, b) => a.code.localeCompare(b.code));

            //get new height weight from entity
            this.getHeightWeight(() => {
                this.appService.patientInfo.age = this.appService.personAgeInDays;
                this.appService.patientInfo.bsa = this.appService.bodySurfaceArea;
                this.appService.patientInfo.gender = this.appService.gender.toLowerCase() == 'm' ? 1 : this.appService.gender.toLowerCase() == 'f' ? 2 : 3
                this.appService.patientInfo.weight = +this.appService.refWeightValue;
                this.appService.patientInfo.height = +this.appService.refHeightValue;
                let warningcontextid = this.appService.encounter.encounter_id + '_' + wc;
                let wservice = (wc == WarningContext.mod) ? this.appService.warningServiceMODContext : this.appService.warningServiceIPContext;
                if (wc.startsWith(WarningContext.op)) {
                    wservice = this.appService.warningService.GetWarningsInstance(wc);
                }
                //get current/lastrecorded allergies and height and weight from epma warningupdate entity
                this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_personwarningupdate&synapseattributename=warningcontextid&attributevalue=" + warningcontextid).subscribe(
                    (response) => {
                        let curr_warningupdate: Personwarningupdate[] = JSON.parse(response);
                        let curr_dbWarningUpdate = new Personwarningupdate();
                        let curr_patientInfo = new PatientInfo();

                        if (curr_warningupdate.length > 0) {
                            curr_dbWarningUpdate = curr_warningupdate[0];
                            curr_patientInfo.age = this.appService.personAgeInDays;
                            curr_patientInfo.allergens = JSON.parse(curr_dbWarningUpdate.allergens);
                            curr_patientInfo.bsa = curr_dbWarningUpdate.bsa
                            curr_patientInfo.gender = this.appService.gender.toLowerCase() == 'm' ? 1 : this.appService.gender.toLowerCase() == 'f' ? 2 : 3
                            curr_patientInfo.height = curr_dbWarningUpdate.height;
                            curr_patientInfo.weight = curr_dbWarningUpdate.weight;
                            curr_patientInfo.allergens.sort((a, b) => a.code.localeCompare(b.code));
                        } else {
                            curr_dbWarningUpdate.epma_personwarningupdate_id = uuid();
                        }
                        if (this.appService.warningService) {
                            let c1 = this.ComparePatientInfoObjects(curr_patientInfo, this.appService.patientInfo);
                            let c2 = JSON.stringify(curr_patientInfo.allergens) == JSON.stringify(this.appService.patientInfo.allergens);
                            if (!c1 || !c2) {
                                // call to refresh the warning from fdb
                                this.appService.RefreshWarningsFromApi(() => {
                                    cb();
                                }, wservice);
                                // insert/update epma_personwarningupdate if does not exist and anything chnage
                                curr_dbWarningUpdate.allergens = JSON.stringify(this.appService.patientInfo.allergens);
                                curr_dbWarningUpdate.height = +this.appService.patientInfo.height;
                                curr_dbWarningUpdate.weight = +this.appService.patientInfo.weight;
                                curr_dbWarningUpdate.bsa = +this.appService.patientInfo.bsa; //+(Math.sqrt(+this.appService.refWeightValue * + this.appService.patientInfo.weight) / 60).toFixed(2);
                                curr_dbWarningUpdate.person_id = this.appService.personId;
                                curr_dbWarningUpdate.encounter_id = this.appService.encounter.encounter_id;
                                curr_dbWarningUpdate.warningcontextid = warningcontextid;
                                this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
                                    "/PostObject?synapsenamespace=local&synapseentityname=epma_personwarningupdate", curr_dbWarningUpdate, false)
                                    .subscribe((saveResponse) => { })
                                )
                            }
                            else {
                                cb();
                            }
                        }
                    }
                ));
            });
        });
    }

    ComparePatientInfoObjects(obj_1, obj_2) {
        for (var key in obj_1) {
            if (obj_1.hasOwnProperty(key)) {
                if (typeof obj_1[key] != "object") {
                    if (obj_2.hasOwnProperty(key) && obj_1[key] == obj_2[key]) {
                    }
                    else {
                        return false;
                    }
                }
            }
        }
        return true;

    }
    getHeightWeight(cb: () => any) {
        this.appService.observation = [];
        this.subscriptions.add(
            this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getweightobservations", this.createWeightFilter())
                .subscribe((response) => {
                    if (response.length > 0) {

                        for (let r of response) {
                            this.appService.observation.push(<Observation>r);
                        }
                        if (response[0].value != "" || response[0].value != null) {
                            let today = new Date();
                            let lastObservedDate = new Date(response[0].observationeventdatetime);

                            this.appService.refWeightValue = response[0].value;
                            this.appService.refWeightType = (response[0].method ?? "").indexOf("258083009") >= 0 ? RefWeightType.estimated :
                                (response[0].method ?? "").indexOf("115341008") >= 0 ? RefWeightType.actual : null;

                            this.appService.refWeightRecordedOn = moment(new Date(response[0].observationeventdatetime)).format('DD-MMM-yyyy');
                            this.appService.logToConsole(`Weight: ${this.appService.refWeightValue} kg (${this.appService.refWeightRecordedOn})`);

                            let todayMoment = moment([today.getFullYear(), today.getMonth(), today.getDate()]);
                            let lastObservedMoment = moment([lastObservedDate.getFullYear(), lastObservedDate.getMonth(), lastObservedDate.getDate()]);
                            const diffDays = todayMoment.diff(lastObservedMoment, 'days');
                            this.appService.logToConsole(diffDays);

                            if (diffDays == 0) {
                                this.appService.isWeightCapturedForToday = true;
                            } else {
                                this.appService.isWeightCapturedForToday = false;
                            }
                        }
                        else {
                            this.appService.isWeightCapturedForToday = false;
                        }
                    }
                    else {
                        this.appService.isWeightCapturedForToday = false;
                        this.appService.refWeightValue = undefined;
                        this.appService.refWeightType = null;
                        this.appService.refWeightRecordedOn = "";
                    }
                    this.appService.logToConsole(this.appService.isWeightCapturedForToday);

                    this.subscriptions.add(
                        this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_getheightobservations", this.createHeightFilter())
                            .subscribe((response) => {
                                if (response.length > 0) {
                                    if (response[0].value != "" || response[0].value != null) {
                                        this.appService.isHeightCaptured = true;
                                        this.appService.refHeightValue = response[0].value;

                                        if (!isNaN(+this.appService.refWeightValue) && +this.appService.refWeightValue > 0) {
                                            this.appService.bodySurfaceArea = +(Math.sqrt(+this.appService.refWeightValue * +response[0].value) / 60).toFixed(2);
                                        }
                                    } else {
                                        this.appService.isHeightCaptured = false;
                                    }
                                } else {
                                    this.appService.isHeightCaptured = false;
                                    this.appService.refHeightValue = undefined;
                                    this.appService.bodySurfaceArea = undefined;
                                }

                                cb();

                            }));
                }));
    }
    createWeightFilter() {
        // let condition = "person_id = @person_id and encounter_id = @encounter_id";
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
    createHeightFilter() {
        // let condition = "person_id = @person_id and encounter_id = @encounter_id";
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
    // get prescription route
    // getPriscriptionRoutes() {
    //     this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_prescriptionroutes", this.createPrescriptionRoutesFilter()).subscribe(
    //         (response) => {
    //             let responseArray = (response);

    //             for (let r of responseArray) {
    //                 this.appService.Prescriptionroutes.push(<Prescriptionroutes>r);
    //             }
    //         }));
    // }
    private createEventsFilter() {

        if (this.appService.Prescription.length == 0) {
            return;
        }
        let index = 0
        const pm = new filterParams();
        const condition = []
        for (let pos of this.appService.Prescription.map(p => p.__posology)) {
            pos.forEach(pos1 => {
                let para = this.makeId(5);
                if (index === 0)
                    condition.push("posology_id =@" + para);
                else
                    condition.push(" or posology_id =@" + para);

                pm.filterparams.push(new filterparam("@" + para, pos1.posology_id));
                index = index + 1
            });

        }

        const f = new filters()
        f.filters.push(new filter(condition.join('')));

        const select = new selectstatement("SELECT * ");
        const orderby = new orderbystatement("ORDER BY 1");


        const body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);
        let jsonobj = JSON.stringify(body);
        return jsonobj;
    }
    private createPrescriptionRoutesFilter() {
        if (this.appService.Prescription.length == 0) {
            return;
        }
        let index = 0
        const pm = new filterParams();
        const condition = []
        for (let prescription of this.appService.Prescription) {
            let para = this.makeId(5);
            if (index === 0)
                condition.push("prescription_id =@" + para);
            else
                condition.push(" or prescription_id =@" + para);

            pm.filterparams.push(new filterparam("@" + para, prescription.prescription_id));
            index = index + 1
        }

        const f = new filters()
        f.filters.push(new filter(condition.join('')));

        const select = new selectstatement("SELECT * ");
        const orderby = new orderbystatement("ORDER BY 1");


        const body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);
        let jsonobj = JSON.stringify(body);
        return jsonobj;
    }
    private createPrescriptionFilter() {
        let condition = "person_id = @person_id and (encounter_id = @encounter_id or prescriptioncontext_id = @prescriptioncontext_id)";
        let f = new filters()
        f.filters.push(new filter(condition));

        let pm = new filterParams();
        pm.filterparams.push(new filterparam("person_id", this.appService.personId));
        pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));
        pm.filterparams.push(new filterparam("prescriptioncontext_id", this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Outpatient).prescriptioncontext_id));

        let select = new selectstatement("SELECT *");

        let orderby = new orderbystatement("ORDER BY prescription_id desc");

        let body = [];
        body.push(f);
        body.push(pm);
        body.push(select);
        body.push(orderby);

        return JSON.stringify(body);
    }

    private makeId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    GetNursingInstructionsAndCustomWarnings(parray: Array<Prescription>, cb: Function) {
        let i = 0;
        let inpatientid = this.appService.MetaPrescriptioncontext.find(pc => pc.context == PrescriptionContext.Inpatient).prescriptioncontext_id;
        let dischargeid = this.appService.MetaPrescriptioncontext.find(pc => pc.context == PrescriptionContext.Discharge).prescriptioncontext_id;
        let ordersetid = this.appService.MetaPrescriptioncontext.find(pc => pc.context == PrescriptionContext.Orderset).prescriptioncontext_id;

        let filtered = parray.filter(p => p.prescriptioncontext_id == inpatientid || p.prescriptioncontext_id == ordersetid || p.prescriptioncontext_id == dischargeid);
        if (filtered.length == 0) {
            cb();
        }
        else {
            filtered.forEach((p) => {
                p.__nursinginstructions = [];
                p.__customWarning = [];
                p.__drugcodes = [];
                p.__drugindications = [];

                let primarymedication = p.__medications.find(x => x.isprimary);
                if (primarymedication) {
                    let dmd = primarymedication.__codes.find(x => x.terminology == "formulary");
                    if (dmd && primarymedication.producttype != 'custom') {
                        let formularyid = dmd.code;
                        var endpoint = this.appService.appConfig.uris.terminologybaseuri + "/Formulary/getformularydetailruleboundbycode"
                        this.subscriptions.add(this.apiRequest.getRequest(`${endpoint}/${formularyid}?api-version=1.0`)
                            .subscribe((response) => {
                                i++;
                                if (response && response.length != 0) {
                                    p.__customWarning = response.detail.customWarnings;
                                    if (response.detail.titrationTypes && response.detail.titrationTypes.length > 0) {
                                        p.titrationtype = response.detail.titrationTypes[0].desc;
                                        p.titrationtypecode = response.detail.titrationTypes[0].cd;
                                    }

                                    response.detail.endorsements.forEach(e => {
                                        p.__nursinginstructions.push(new NursingInstruction(null, "Endorsement", e));
                                    });
                                    response.detail.medusaPreparationInstructions.forEach(e => {
                                        p.__nursinginstructions.push(new NursingInstruction(null, "Medusa Instructions", e));
                                    });
                                    p.__drugcodes = response.formularyAdditionalCodes;
                                    if (response.detail.licensedUses)
                                        response.detail.licensedUses.forEach(u => {
                                            p.__drugindications.push(u);
                                        });
                                    if (response.detail.unLicensedUses)
                                        response.detail.unLicensedUses.forEach(u => {
                                            p.__drugindications.push(u);
                                        });
                                }
                                if (i == filtered.length)
                                    cb();
                            }, (error) => {
                                i++;
                                this.appService.logToConsole(error);
                                console.log("no response for medication:" + formularyid)
                            }));
                    }
                    else {
                        i++;
                        if (i == filtered.length)
                            cb();
                    }
                }
            })
        }
    }
    GetWitnesAuthentication(cb: () => any) {
        this.appService.administrationWitness = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_administrationwitness&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {
                let responseArray: AdministrationWitness[] = JSON.parse(response);
                this.appService.administrationWitness = responseArray;
                cb();
            }
        ));
    }
    GetPrescriptionEvent(cb: () => any) {
        this.appService.prescriptionEvent = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionevent&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {
                let responseArray: PrescriptionEvent[] = JSON.parse(response);
                this.appService.prescriptionEvent = responseArray.sort((a, b) => (moment(a.datetime) > moment(b.datetime)) ? -1 : 0);
                cb();
            }
        ));
    }
    GetMedicationSupply(cb: () => any) {
        this.appService.PrescriptionMedicaitonSupply = [];
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionmedicaitonsupply&synapseattributename=encounter_id&attributevalue=" + this.appService.encounter.encounter_id).subscribe(
            (response) => {
                this.appService.PrescriptionMedicaitonSupply = JSON.parse(response);

                cb();
            }
        ));
    }

}


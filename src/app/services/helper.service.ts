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
import { Injectable } from "@angular/core";
import moment from "moment";
import { TimeerHelper } from "../components/drug-chart/timer-helper";
import { Dose, Prescription } from "../models/EPMA";
import { AppService } from "./app.service";
import { DoseType } from "./enum";



export interface MarRecord {
  endDate?: string;
  dose?: string;
  time?: string;
  doseType?: string;
  frequency?: string;
  descriptiveDose?: string;
  doseunit?: string;
  protocolCount?: number;
  protocolDays?: number;
  bolusDose?: string;
  rateDose?: string;
  ciDose?: string;
  ciDate?: string;
  doseId?: string;
  date?: string;
  logicalId?: string;
  administrationStatus?: string;
  content?: string;
  posologyId?: string;
  titration?: boolean;
  doctorsorder?: boolean;
  startDate?: string;
  prescription_id?: string;
}


@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor(private appService: AppService, public timeerHelper: TimeerHelper) {

  }
  marRecords: Array<MarRecord> = [];
  prescriptionDictionary = {};
  protocolCount: number;
  getDosesPrescriptions(prescriptions: Array<Prescription>) {
    prescriptions.forEach(pres => {
      this.marRecords = [];
      const doses = this.appService.GetCurrentPosology(pres).__dose;
      // this.addAdditionalDoses(doses);
      const frequency = this.appService.GetCurrentPosology(pres).frequency;
      let showDoses = this.createDosesForTemplate(pres);
      let protocolDays;
      if (frequency === 'protocol') {
        protocolDays = showDoses.length;
      }
      if (!(showDoses instanceof Object)) {
        if (pres.__routes.length > 0) {
          showDoses = showDoses + ' - ' + pres.__routes[0].route;
        }
      }
      this.marRecords.forEach(obj => {
        let endDate = this.appService.GetCurrentPosology(pres).prescriptionenddate ? this.appService.GetCurrentPosology(pres).prescriptionenddate.split('T')[0] : null;
        obj.endDate = endDate ? this.changeDateFormat(endDate) : null;
        if (obj.frequency === 'protocol' || obj.ciDose) {
          if(protocolDays == 2)
          {
            obj.protocolCount = this.protocolCount;
          }
          else {
            obj.protocolCount = this.protocolCount + 1;
          }
          
          obj.protocolDays = protocolDays;
        }
      })
      pres['showDoses'] = showDoses;
      this.addMarObjectToPrescriptionId(pres.prescription_id);
    });

  }

  addAdditionalDoses(doses: Array<Dose>) {
    doses.forEach((dose, i) => {
      let date = dose.dosestartdatetime.split('T')[0];
      let time = dose.dosestartdatetime.split('T')[1].slice(0, 5);
      const doseEvent = this.appService.DoseEvents.filter(doseEvent => {
        let [startDate, startTime] = doseEvent.startdatetime.split('T');
        startTime = startTime.slice(0, 5);
        return (doseEvent.dose_id === dose.dose_id) && (startDate === date) && (startTime === time);
      });
      if (doseEvent.length) {
        dose.dosestartdatetime = doseEvent[0].startdatetime;
      }
    })
  }

  addMarObjectToPrescriptionId(presId: string) {
    this.prescriptionDictionary[presId] = JSON.parse(JSON.stringify(this.marRecords));
  }

  changeDateFormat(s: string) {
    return s.split("").reverse().join("").replace('-', '/');
  }


  createDosesForTemplate(prescriptions) {
    let doseToShow = '';
    let posology = this.appService.GetCurrentPosology(prescriptions);
    if (posology.frequency == 'variable' && posology.infusiontypeid !== 'ci' && posology.infusiontypeid !== 'pca') {
      // check dose type for strength unit ......

      posology.__dose.forEach(dose => {
        let date = dose.dosestartdatetime.split('T')[0];
        let time = dose.dosestartdatetime.split('T')[1].slice(0, 5);
        let changeTimeFormat = time.split(':')
        if (dose.dosetype == DoseType.descriptive) {

          let x = time + ' - ' + dose.descriptivedose + ',';
          doseToShow = doseToShow + ' ' + x;


        } else if (dose.dosetype == DoseType.strength) {
          let x = dose.dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + dose.dosesize + ' ' + dose.strengthdenominatorunit + ',';
          doseToShow = doseToShow + ' ' + x;
        } else {
          let x = dose.dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + dose.dosesize + ' ' + dose.doseunit + ',';
          doseToShow = doseToShow + ' ' + x;
        }
        this.marRecords.push({
          time,
          descriptiveDose: dose.descriptivedose,
          doseType: dose.dosetype,
          frequency: posology.frequency,
          dose: dose.dosesize,
          doseunit: dose.strengthdenominatorunit || dose.doseunit,
          ciDose: dose.infusionrate + ' ' + dose.strengthdenominatorunit,
          doseId: dose.dose_id,
          logicalId: moment(new Date).format('YYYYMMDD') + changeTimeFormat[0] + changeTimeFormat[1] + "_" + dose.dose_id.toString()
        });
      });

    } else if (posology.frequency == 'protocol' || posology.infusiontypeid === 'ci' || posology.infusiontypeid === 'pca') {
      let currDoses = [];
      let currDose = '';
      let currDate = '';
      let count = 0;
      posology.__dose.forEach((dose, index) => {
        let dateTime = dose.dosestartdatetime.split('T');
        let date = dateTime[0];
        let time = dateTime[1].slice(0, 5);
        let changeTimeFormat = time.split(':')
        let doseDescription;
        if (dose.dosetype == DoseType.descriptive) {
          doseDescription = dose.descriptivedose;

        } else if (dose.dosetype == DoseType.strength) {
          doseDescription = dose.dosesize + ' ' + dose.strengthdenominatorunit;
        } else {
          doseDescription = dose.dosesize + ' ' + dose.doseunit;
        }
        if (currDate !== date && index) {
          currDoses.push(currDose);
          currDate = date
          currDose = ' ' + time + ' - ' + doseDescription + ',';
          this.protocolCount = count;
          count = 0;
        } else if (currDate !== date && !index) {
          currDate = date;
          currDose += ' ' + time + ' - ' + doseDescription + ',';
          count += 1
        } else {
          currDose += ' ' + time + ' - ' + doseDescription + ',';
          count += 1
        }
        this.marRecords.push({
          time,
          descriptiveDose: dose.descriptivedose,
          doseType: dose.dosetype,
          frequency: posology.frequency,
          dose: dose.dosesize,
          doseunit: dose.strengthdenominatorunit || dose.doseunit,
          ciDose: (posology.infusiontypeid === 'ci'|| posology.infusiontypeid === 'pca') ? dose.infusionrate + ' ' + posology.infusionrateunits : '',
          ciDate: date,
          doseId: dose.dose_id,
          logicalId: 'start_' + moment(new Date).format('YYYYMMDD') + changeTimeFormat[0] + changeTimeFormat[1] + "_" + dose.dose_id.toString()
        });

      });
      currDoses.push(currDose);
      let presAdditionalCondition = '';
      let additional_condition = this.appService.MetaPrescriptionadditionalcondition.find((x) =>
          x.prescriptionadditionalconditions_id ==
          prescriptions.prescriptionadditionalconditions_id
      );
      if(additional_condition)
      {
        presAdditionalCondition = additional_condition.additionalcondition
      }
      else{
        presAdditionalCondition = " ";
      }
      currDoses[currDoses.length - 1] = currDoses[currDoses.length - 1] + (presAdditionalCondition != ' '?' - ':' ') + presAdditionalCondition + ' - ' + ((prescriptions.__routes.length > 0) ? prescriptions.__routes[0].route : '');
      return currDoses;
    }
    else if(posology.infusiontypeid == "rate") {
      const activeStartDate = moment().add(-1, 'd');
      activeStartDate.set({'hour':23,'minute': 59,'second':59})
      const dateTo = moment().add(3, 'd');
      dateTo.set({'hour':23,'minute': 59,'second':59})
      this.timeerHelper.createEvents(activeStartDate,dateTo, true);
      this.appService.reportData = this.appService.reportData.filter(function( element ) {
        return element !== undefined;
      });
      var todayDate = moment();
      todayDate.set({'hour':0,'minute': 0,'second':0});
      const next5DayIntermittedData = this.appService.reportData.filter(e => {
        return !e.dose_id.includes("dur") && !e.dose_id.includes("pause") && !e.dose_id.includes("flowrate") && !e.dose_id.includes("infusionevent")
        && moment(e.eventStart).isBetween(moment(activeStartDate),dateTo) && prescriptions.prescription_id == e.prescription_id
      });
      next5DayIntermittedData.sort(function (left, right) {
        return moment.utc(left.eventStart).diff(moment.utc(right.eventStart))
      });

      

      next5DayIntermittedData.forEach(element => {
        let administeredIntermittedDose = this.appService.Medicationadministration.find(x => x.logicalid == element.dose_id);
        let splitDoseID = element.dose_id.split('_');
        let intermittedPosology = prescriptions.__posology.find(x => x.posology_id == element.posology_id);
        let intermittedDose;
        if(intermittedPosology)
        {
          intermittedDose = intermittedPosology.__dose.find(x => x.dose_id == splitDoseID[splitDoseID.length - 1])
        }
        
        let dose;
        let doseunit = posology.infusionrateunits;
        if(administeredIntermittedDose != undefined)
        {
          dose = administeredIntermittedDose.administredinfusionrate +" "+posology.infusionrateunits;
        }
        else {
          if(intermittedDose != undefined)
          {
            dose = intermittedDose.infusionrate+" "+posology.infusionrateunits;
          }
          
        }
        this.marRecords.push({
          time: moment(element.eventStart).format("HH:mm"),
          date: moment(element.eventStart).format("YYYYMMDD"),
          administrationStatus: (administeredIntermittedDose != undefined)?(administeredIntermittedDose.adminstrationstatus ? 'started':""):"",
          content: element.content,
          // descriptiveDose: dose.descriptivedose,
          // doseType: dose.dosetype,
          // frequency: posology.frequency,
          dose: dose,
          doseunit: doseunit,
          // bolusDose: (posology.dosetype == 'strength') ? dose.strengthdenominator + ' ' + dose.strengthdenominatorunit : (posology.dosetype == 'units') ? dose.dosesize + ' ' + dose.doseunit : '' ,
          // rateDose: dose.infusionrate + ' ' +  posology.infusionrateunits,
          // ciDose: dose.infusionrate + ' ' + posology.infusionrateunits,
          // ciDate: date,
          startDate: element.eventStart,
          prescription_id: element.prescription_id,
          posologyId: element.posology_id,
          doseId: splitDoseID[splitDoseID.length - 1],
          logicalId: element.dose_id
        });
      });
    }
    else {
      if (posology.dosetype == DoseType.units) {
          if(this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='' || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='x' || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='h' || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='stat' || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='mor'  || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='mid' || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='eve'  || this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).frequency=='night') {
            if(this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).__dose.length>0 && !this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).__dose[0].dosestrength) {
              let x = posology.__dose[0].dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + posology.__dose[0].dosesize + ' ' + posology.__dose[0].doseunit + ',';
              doseToShow = doseToShow + ' ' + x;
            }
            if(this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).__dose.length>0 && this.appService.GetCurrentPosology(prescriptions, prescriptions.posologyid).__dose[0].dosestrength){
              let x = posology.__dose[0].dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + posology.__dose[0].dosestrength + ' ' + posology.__dose[0].dosestrengthunits + ',';
              doseToShow = doseToShow + ' ' + x;             
            }
          }
      }

      if (posology.dosetype == DoseType.strength) {
        let x = posology.__dose[0].dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + posology.__dose[0].strengthneumerator + ' ' + posology.__dose[0].strengthdenominatorunit + ',';
        doseToShow = doseToShow + ' ' + x;
      }
      if (posology.dosetype == DoseType.descriptive) {

        let x = posology.__dose[0].dosestartdatetime.split('T')[1].slice(0, 5) + ' - ' + posology.__dose[0].descriptivedose + ',';
        doseToShow = doseToShow + ' ' + x;
      }

      posology.__dose.forEach(dose => {
        let date = dose.dosestartdatetime.split('T')[0];
        let time = dose.dosestartdatetime.split('T')[1].slice(0, 5);
        let changeTimeFormat = time.split(':');

        doseToShow = doseToShow + ' ' + time + ',';
        this.marRecords.push({
          time,
          descriptiveDose: dose.descriptivedose,
          doseType: dose.dosetype != null ? dose.dosetype : posology.dosetype,
          frequency: posology.frequency,
          posologyId: posology.posology_id,
          dose: (posology.dosetype == 'strength') ? dose.strengthdenominator + ' ' + dose.strengthdenominatorunit : posology.titration == true ? posology.titrationtargetmax + ' ' + posology.titrationtargetmin :dose.dosesize,
          doseunit: dose.strengthdenominatorunit || dose.doseunit,
          bolusDose: (posology.dosetype == 'strength') ? dose.strengthdenominator + ' ' + dose.strengthdenominatorunit : (posology.dosetype == 'units') ? dose.dosesize + ' ' + (dose.doseunit == 'suppository'? 'supp': dose.doseunit) : '' ,
          rateDose: dose.infusionrate + ' ' +  posology.infusionrateunits,
          ciDose: dose.infusionrate + ' ' + posology.infusionrateunits,
          ciDate: date,
          doseId: dose.dose_id,
          titration: posology.titration,
          doctorsorder: posology.doctorsorder,
          logicalId: (posology.infusiontypeid === 'bolus') ? 'start_' + moment(new Date).format('YYYYMMDD') + changeTimeFormat[0] + changeTimeFormat[1] + "_" + dose.dose_id.toString() : moment(new Date).format('YYYYMMDD') + changeTimeFormat[0] + changeTimeFormat[1] + "_" + dose.dose_id.toString()
        });

      });
      this.protocolCount = posology.__dose.length;
    }
    let presAdditionalCondition = '';
      let additional_condition = this.appService.MetaPrescriptionadditionalcondition.find((x) =>
          x.prescriptionadditionalconditions_id ==
          prescriptions.prescriptionadditionalconditions_id
      );
      if(additional_condition)
      {
        presAdditionalCondition = additional_condition.additionalcondition
      }
      else{
        presAdditionalCondition = " ";
      }
      
    return doseToShow + (presAdditionalCondition != ' '?' - ':' ') + presAdditionalCondition;
  }
}

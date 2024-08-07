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
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Posology, Prescription } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement, action, DataContract } from 'src/app/models/filter.model';
import { PrescriptionContext, PrescriptionStatus } from 'src/app/services/enum';
@Component({
  selector: 'app-therapy-overview',
  templateUrl: './therapy-overview.component.html',
  styleUrls: ['./therapy-overview.component.css']
})
export class TherapyOverviewComponent implements OnInit, OnDestroy {

  therapyoverview: TherapyOverview[] = [];
  therapy: TherapyOverview;
  subscriptions: Subscription = new Subscription();
  therapyOverviewPrescription: Prescription[] = [];
  groupCountData: any[] = [];
  isLoading: boolean = false;
  constructor(public subjects: SubjectsService, public appService: AppService, public apiRequest: ApirequestService) {
    this.subscriptions.add(this.subjects.therapyOverview.subscribe
      ((event: any) => {
        this.setData();
      }));
    this.subscriptions.add(this.subjects.refreshDrugChart.subscribe
      ((event) => {
        this.loadTherapyOverview();
      }));
  }

  ngOnInit(): void {
    this.appService.therapyCurrentDate = moment();
    this.appService.therapyNoOfDays = 3;
    this.loadTherapyOverview();
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  loadTherapyOverview() {
    this.isLoading = true;
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/epma_therapyoverview", this.createTherapyFilter())
        .subscribe((response) => {
          this.appService.TherapyPrescription = [];
          for (let prescription of response) {
            if (prescription.__posology && prescription.__routes.length > 0) {
              prescription.__posology = JSON.parse(prescription.__posology);
              prescription.__routes = JSON.parse(prescription.__routes);
              prescription.__medications = JSON.parse(prescription.__medications);
              this.appService.TherapyPrescription.push(<Prescription>prescription);
            }
          }
          this.appService.UpdatePrescriptionWarningSeverity(this.appService.TherapyPrescription, () => {
            this.setData();
            this.isLoading = false;
          });
        })
    )
  }
  createTherapyFilter() {
    let condition = "person_id = @person_id and encounter_id = @encounter_id";
    let f = new filters()
    f.filters.push(new filter(condition));
    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));
    let select = new selectstatement("SELECT *");
    let orderby = new orderbystatement("ORDER BY prescription_id desc");
    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);
    return JSON.stringify(body);
  }
  setData() {
    this.appService.logToConsole("Therapy..........................................");
    this.appService.logToConsole(this.appService.DrugeGroupsType);
    this.appService.logToConsole(this.appService.TherapyPrescription);
    
    this.appService.observation.sort((b, a) => (moment(a.timerecorded) > moment(b.timerecorded)) ? 1 : ((moment(b.timerecorded) > moment(a.timerecorded)) ? -1 : 0));
    this.appService.logToConsole(this.appService.observation);
    this.therapyoverview = [];
    var therapyData: any[] = [];
    // //prepare data
    let chartStartDate = moment(this.appService.therapyCurrentDate).subtract(this.appService.therapyNoOfDays - 1, "days");
    let chartEndDate = moment(this.appService.therapyCurrentDate);
    let corePrescription = this.appService.FilteredPrescription.slice().filter(x => x.correlationid && x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(y => y.context == PrescriptionContext.Inpatient).prescriptioncontext_id && (moment(x.startdatetime).format("YYYYMMDD") <= chartEndDate.format("YYYMMDD")) && (moment(this.appService.GetCurrentPosology(x).prescriptionenddate).format("YYYYMMDD") >= moment(chartStartDate).format("YYYYMMDD") || !this.appService.GetCurrentPosology(x).prescriptionenddate)).sort((a, b) => (moment(a.startdatetime) > moment(b.startdatetime)) ? 1 : ((moment(b.startdatetime) > moment(a.startdatetime)) ? -1 : 0));
    if (corePrescription.length > 0) {
      // find min prescription start date from all prescription
      let minStartDate = corePrescription[0].startdatetime;
      let noOfDaysData = moment(this.appService.therapyCurrentDate).diff(minStartDate, "days") + 4;
      var t0 = performance.now()
      for (var k = 0; k < corePrescription.length; k++) {
        var preHistory = null;
        let route: any[] = [];
        let medication: any[] = [];
        let basicGroup = "";
        let posology = new Posology();
        posology.prescriptionstartdate = null;
        this.appService.dcgroupadded = [];
        let grouping = this.appService.GroupingBasics(corePrescription[k]);
        this.appService.dcgroupadded.push(grouping);
        basicGroup = grouping.group;
        for (var i = 0; i < noOfDaysData; i++) {
          let chartDate = moment(minStartDate).add(i, "days");
          let history = this.appService.TherapyPrescription.slice().find(x => x.correlationid == corePrescription[k].correlationid && moment(x.lastmodifiedon).format("YYYYMMDD") == moment(chartDate).format("YYYYMMDD"));
          if (history) {
            history.__index = k;
            history.__therapydate = this.appService.getDateTimeinISOFormat(chartDate.toDate());
            therapyData.push(history);
            let status = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == history.prescriptionstatus_id);
            route = history.__routes;
            medication = history.__medications;
            posology = history.__posology.length > 0 ? this.appService.GetCurrentPosology(history) : null;
            
            // if status is stopped or modified
            if (status.status == PrescriptionStatus.stopped || status.status == PrescriptionStatus.cancelled || status.status == PrescriptionStatus.modified) {
              if (status.status == PrescriptionStatus.modified) {
                let activePrescriptionStatus_id = this.appService.MetaPrescriptionstatus.find(x => x.status == PrescriptionStatus.active).prescriptionstatus_id;
                preHistory = Object.assign({}, history);
                preHistory.prescriptionstatus_id = activePrescriptionStatus_id;
              } else {
                preHistory = Object.assign({}, null);
              }
            } else {
              preHistory = Object.assign({}, history);
            }


          } else {
            if (chartDate.format("YYYYMMDD") >= moment(corePrescription[k].startdatetime).format("YYYYMMDD") && chartDate.format("YYYYMMDD") <= moment(this.appService.GetCurrentPosology(corePrescription[k]).prescriptionenddate).format("YYYYMMDD")) {
              if (preHistory) {
                let p = Object.assign({}, preHistory);
                p.__therapydate = this.appService.getDateTimeinISOFormat(chartDate.toDate());
                p.__index = k;
                p.__posology = [posology];
                p.__routes = [];
                p.__routes.push(...route);
                p.__medications = [];
                p.__medications.push(...medication);
                p.__basicGroup = basicGroup;
                therapyData.push(p);
              } else {
                let p = new Prescription();
                p.__therapydate = this.appService.getDateTimeinISOFormat(chartDate.toDate());
                p.__posology = [posology];
                p.__routes = [];
                p.__routes.push(...route);
                p.__medications = [];
                p.__medications.push(...medication);
                p.__basicGroup = basicGroup;
                p.__index = k;
                therapyData.push(p);
              }

            } else {
              let p = new Prescription();
              p.__therapydate = this.appService.getDateTimeinISOFormat(chartDate.toDate());
              p.__posology = [posology];
              p.__routes = [];
              p.__routes.push(...route);
              p.__medications = [];
              p.__medications.push(...medication);
              p.__basicGroup = basicGroup;
              p.__index = k;
              therapyData.push(p);
            }

          }

        }
        therapyData.filter(x => x.__index == k && !x.__posology[0].dose).forEach(x => x.__posology = [posology]);
        therapyData.filter(x => x.__index == k && x.__routes.length == 0).forEach(x => x.__routes = route);
        therapyData.filter(x => x.__index == k && x.__medications.length == 0).forEach(x => x.__medications = medication);
        therapyData.filter(x => x.__index == k && (!x.__basicGroup || x.__basicGroup.length == 0)).forEach(x => x.__basicGroup = basicGroup);
      }
      var t1 = performance.now()
      this.appService.logToConsole("Call to doSomething took " + (t1 - t0) + " milliseconds.")
    }
    therapyData = therapyData.filter(x => x.__medications.length > 0 && x.__routes.length > 0);
   
    // do notworry
    this.groupCountData = [];
 
    for (var i = 0; i < this.appService.therapyNoOfDays; i++) {
      this.therapy = new TherapyOverview();
      this.therapy.width = (100 / this.appService.therapyNoOfDays) - 1;
      this.therapy.therapydate = moment(this.appService.therapyCurrentDate).subtract(i, "days");
      if (this.therapy.therapydate.format("YYYYMMDD") == moment(new Date()).format("YYYYMMDD")) {
        this.therapy.iscurrentdate = true;
        this.therapy.width = (100 / this.appService.therapyNoOfDays) + (this.appService.therapyNoOfDays * 1);
      }
      this.therapy.weight = this.getWeight(this.therapy.therapydate);

      let p = new Array<Prescription>();
      p = therapyData.slice().filter(x => moment(x.__therapydate).format("YYYYMMDD") == this.therapy.therapydate.format("YYYYMMDD"));
      this.appService.logToConsole("---------------------------");
      this.appService.logToConsole(this.therapy.therapydate);
      this.appService.logToConsole(p);
      this.therapy.group = [];
      // filter by group
      this.appService.DrugeGroupsType.forEach((item, index) => {
        var g = new Group();
        g.groupname = item;
        g.prescription = new Array<Prescription>();
        if (this.appService.drugGroupOption == "Drug Chart") {
          p= this.sortPrescription(p);
          g.prescription.push(...p);
        }
        if (this.appService.drugGroupOption == "Basic") {
          var data = p.filter(x => x.__basicGroup == item); 
          data= this.sortPrescription(data);           
          g.prescription.push(...data);
        }
        if (this.appService.drugGroupOption == "Base") {
          var data = p.filter(x => x.__medications.find(x => x.isprimary).classification == item);
          data= this.sortPrescription(data);     
          g.prescription.push(...data);
        }
        if (this.appService.drugGroupOption == "Route") {
          var data = p.filter(x => x.__routes.find(x => x.isdefault).route == item);
          data= this.sortPrescription(data);      
          g.prescription.push(...data);
        }
        if (this.appService.drugGroupOption == "custom group") {
          var data = p.filter(x => x.__medications.find(x => x.isprimary).customgroup == item);
          data= this.sortPrescription(data);
          g.prescription.push(...data);
        }
         
        this.therapy.group.push(g);
        // count for prescription in group
        let gCount = this.groupCountData.find(x => x.groupname == item);
        if (gCount) {
          if (gCount.count == 0)
            gCount.count = g.prescription.length;
        } else {
          this.groupCountData.push({ groupname: item, count: g.prescription.length });
        }
      });
      this.therapyoverview.push(this.therapy);
    }
    // sort for header date
    this.therapyoverview.sort((a, b) => new Date(a.therapydate).getTime() - new Date(b.therapydate).getTime());
  }

  sortTherapy(sortdata) {
    this.appService.logToConsole(sortdata);
    if (this.appService.drugSortOrder == "DESCRIPTION-ASC") {
      sortdata.sort((a, b) => { return a.__index - b.__index });
    }
    else if (this.appService.drugSortOrder == "DESCRIPTION-DESC") {
      sortdata.sort((b, a) => { return a.__index - b.__index });
    }
    else if (this.appService.drugSortOrder == "CREATED TIME-ASC") {
      sortdata.sort((a, b) => { return a.__index - b.__index });
    }
    else if (this.appService.drugSortOrder == "CREATED TIME-DESC") {
      sortdata.sort((b, a) => { return a.__index - b.__index });
    }
    return sortdata;
  }
  sortPrescription(sortdata) {
    this.appService.logToConsole(sortdata);
    if (this.appService.drugSortOrder == "DESCRIPTION-ASC") {
      sortdata.sort((a, b) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.appService.drugSortOrder == "DESCRIPTION-DESC") {
      sortdata.sort((b, a) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.appService.drugSortOrder == "CREATED TIME-ASC") {
      sortdata.sort((a, b) => (moment(a.startdatetime) > moment(b.startdatetime)) ? 1 : ((moment(b.startdatetime) > moment(a.startdatetime)) ? -1 : 0));
    }
    else if (this.appService.drugSortOrder == "CREATED TIME-DESC") {
      sortdata.sort((b, a) => (new Date(a.startdatetime) > new Date(b.startdatetime)) ? 1 : ((new Date(b.startdatetime) > new Date(a.startdatetime)) ? -1 : 0));
    }
    //this.sortTherapy(sortdata);
    return sortdata;
  }
  getWeight(date) {
    let obs = this.appService.observation.find(x => moment(x.timerecorded).format("YYYYMMDD") == date.format("YYYYMMDD"))
    if (obs) {
      return obs.value;
    } else {
      let prevobs = this.appService.observation.find(x => moment(x.timerecorded).format("YYYYMMDD") < date.format("YYYYMMDD"))
      if (prevobs)
        return prevobs.value;
      else
        return "N/A"
    }
  }
  groupingBasics(prescription) {
    if(prescription.prescription_id=='af72f397-b950-487f-9d67-9db687474dab') {
      console.log("ok")
    }
      let prescrptionGroup="Regular drugs";
      if (prescription.__drugcodes) {
        const customrows = prescription.__drugcodes.filter(x => x.additionalCodeSystem.toLowerCase() == "custom");
        // const ivfluids = customrows.filter(x => x.additionalCode.toLowerCase() == "BASIC_FLUID");
        // if (ivfluids.length > 0)
        //   prescrptionGroup = "IV Fluid"; 
      }
      if (prescription.__posology.find(x => x.iscurrent == true).frequency == "stat") {
        prescrptionGroup = "Stat";
      }
      else {
        let Presindecation = JSON.parse(prescription.indication)
        let drug_bnf = "";
        if (prescription.__drugcodes) {
          const bnfrow = prescription.__drugcodes.filter(x => x.additionalCodeSystem == "BNF");
          if (bnfrow.length > 0)
            drug_bnf = bnfrow[0].additionalCode;
        }
        drug_bnf.padEnd(10, "0");
        for (let group of this.appService.DCGroups) {
          let isbnfmatch = false
          for (let arrcode of group.MatchConditions.ClassificationCodes) {
            let bnf = (arrcode.Code ?? "").replace(".", "");
            if (bnf == drug_bnf.substring(0, bnf.length)) {
              isbnfmatch = true;
            }
          }

          let isindecationmatch = false;
          for (let arrindecation of group.MatchConditions.Indications) {
            if (Presindecation) {
              if (arrindecation.Code == Presindecation.code || arrindecation.Indication == Presindecation?.indication) {
                isindecationmatch = true
              }
            }
          }
          if (group.MatchType == "AND") {
            if (isindecationmatch && isbnfmatch) {
              prescrptionGroup = group.GroupName;
            }
          }
          else {
            if (isindecationmatch || isbnfmatch) {
              prescrptionGroup = group.GroupName;
            }
          }
        }
        if (prescription.__posology.find(x => x.iscurrent == true).infusiontypeid == 'ci' || prescription.__posology.find(x => x.iscurrent == true).infusiontypeid == 'pca') {
          prescrptionGroup = "Variable/Continuous infusion";     
        }
        else if (prescription.__posology.find(x => x.iscurrent == true).prn == true) {
          prescrptionGroup = "PRN";    
        }
      }
      return prescrptionGroup;
  }
  
}
class TherapyOverview {
  public weight: string;
  public width: number
  public therapydate: any
  public group: Group[]
  public iscurrentdate: boolean = false
}
class Group {
  public groupname: string
  public prescription: Prescription[]
}
